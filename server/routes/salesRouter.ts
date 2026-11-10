import { Router } from 'express';
import { query, withTransaction } from '../db.ts';
import { authenticate } from '../auth.ts';

const router = Router();

// Génération d'un numéro de vente unique chronologique
async function generateSaleNumber(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const prefix = `VTE-${year}${month}${day}-`;

  const rows = await query<any>(
    'SELECT sale_number FROM sales WHERE sale_number LIKE ? ORDER BY id DESC LIMIT 1',
    [`${prefix}%`]
  );

  let seq = 1;
  if (rows.length > 0) {
    const lastNum = rows[0].sale_number;
    const parts = lastNum.split('-');
    if (parts.length >= 3) {
      const lastSeq = parseInt(parts[2], 10);
      if (!isNaN(lastSeq)) {
        seq = lastSeq + 1;
      }
    }
  }

  return `${prefix}${String(seq).padStart(4, '0')}`;
}

// Obtenir l'historique complet des ventes
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, start_date, end_date } = req.query;

    let sql = `
      SELECT s.id, s.sale_number, s.total_amount, s.amount_received,
             s.change_returned, s.payment_method, s.status, s.notes,
             s.created_at, u.full_name as cashier_name,
             COUNT(si.id) as total_items,
             SUM(si.quantity) as total_quantity
      FROM sales s
      LEFT JOIN users u ON u.id = s.user_id
      LEFT JOIN sale_items si ON si.sale_id = s.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search && typeof search === 'string') {
      sql += ' AND (s.sale_number LIKE ? OR s.notes LIKE ?)';
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    if (start_date && typeof start_date === 'string') {
      sql += ' AND DATE(s.created_at) >= ?';
      params.push(start_date);
    }

    if (end_date && typeof end_date === 'string') {
      sql += ' AND DATE(s.created_at) <= ?';
      params.push(end_date);
    }

    sql += ' GROUP BY s.id ORDER BY s.id DESC';

    const sales = await query<any>(sql, params);
    res.json(sales);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Obtenir le détail complet d'une vente avec ses lignes (pour consultation et réimpression)
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const sales = await query<any>(`
      SELECT s.*, u.full_name as cashier_name
      FROM sales s
      LEFT JOIN users u ON u.id = s.user_id
      WHERE s.id = ? OR s.sale_number = ?
    `, [id, id]);

    if (sales.length === 0) {
      return res.status(404).json({ error: 'Vente introuvable.' });
    }

    const sale = sales[0];
    const items = await query<any>(`
      SELECT id, sale_id, product_id, product_name, product_ref,
             unit_price, unit_cost, quantity, total_price
      FROM sale_items
      WHERE sale_id = ?
      ORDER BY id ASC
    `, [sale.id]);

    const settingsRows = await query<any>('SELECT * FROM settings WHERE id = 1');
    const settings = settingsRows[0] || {};

    res.json({
      sale,
      items,
      settings
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Enregistrer et valider une vente POS (Transactionnel, Sécurisé)
router.post('/', authenticate, async (req, res) => {
  try {
    const { items, amount_received, notes } = req.body;

    // Validation des données d'entrée
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Le panier est vide. Veuillez ajouter au moins un produit.' });
    }

    const amountReceivedNum = Number(amount_received);
    if (isNaN(amountReceivedNum) || amountReceivedNum <= 0) {
      return res.status(400).json({ error: 'Veuillez renseigner le montant en espèces reçu du client.' });
    }

    // Exécution dans une Transaction SQL atomique
    const saleResult = await withTransaction(async (tx) => {
      let calculatedTotal = 0;
      const validatedItems: Array<{
        product_id: number;
        product_name: string;
        product_ref: string;
        unit_price: number;
        unit_cost: number;
        quantity: number;
        total_price: number;
        current_stock: number;
      }> = [];

      // 1. Contrôle strict de chaque produit dans la base (ne jamais faire confiance au frontend)
      for (const item of items) {
        const prodId = Number(item.product_id);
        const qty = parseInt(item.quantity, 10);

        if (!prodId || isNaN(qty) || qty <= 0) {
          throw new Error("Paramètres d'article invalides ou quantité inférieure ou égale à zéro.");
        }

        const prods = await tx.query<any>(
          'SELECT id, name, reference, buy_price, sell_price, quantity FROM products WHERE id = ?',
          [prodId]
        );

        if (prods.length === 0) {
          throw new Error(`Le produit référencé #${prodId} n'existe plus en stock.`);
        }

        const product = prods[0];

        // VÉRIFICATION DE STOCK STRICTE : Interdiction absolue des stocks négatifs
        if (product.quantity < qty) {
          throw new Error(
            `Stock insuffisant pour "${product.name}" (Réf: ${product.reference}). En stock : ${product.quantity}, Demandé : ${qty}.`
          );
        }

        const lineTotal = Number(product.sell_price) * qty;
        calculatedTotal += lineTotal;

        validatedItems.push({
          product_id: product.id,
          product_name: product.name,
          product_ref: product.reference,
          unit_price: Number(product.sell_price),
          unit_cost: Number(product.buy_price),
          quantity: qty,
          total_price: lineTotal,
          current_stock: product.quantity
        });
      }

      // 2. Vérification du paiement en espèces
      if (amountReceivedNum < calculatedTotal) {
        throw new Error(
          `Montant reçu insuffisant. Le total de la commande est de ${calculatedTotal.toLocaleString('fr-FR')} FCFA, mais le montant reçu est de ${amountReceivedNum.toLocaleString('fr-FR')} FCFA.`
        );
      }

      const changeReturned = amountReceivedNum - calculatedTotal;

      // 3. Génération du numéro de vente
      const saleNumber = await generateSaleNumber();

      // 4. Insertion dans la table `sales`
      const saleInsert = await tx.execute(`
        INSERT INTO sales (
          sale_number, total_amount, amount_received, change_returned,
          payment_method, status, user_id, notes
        ) VALUES (?, ?, ?, ?, 'ESPECES', 'VALIDEE', ?, ?)
      `, [
        saleNumber,
        calculatedTotal,
        amountReceivedNum,
        changeReturned,
        req.user?.id || 1,
        notes?.trim() || null
      ]);

      const saleId = saleInsert.insertId;

      // 5. Enregistrement des lignes et mise à jour du stock
      for (const item of validatedItems) {
        // Sauvegarde snapshot dans `sale_items`
        await tx.execute(`
          INSERT INTO sale_items (
            sale_id, product_id, product_name, product_ref,
            unit_price, unit_cost, quantity, total_price
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          saleId,
          item.product_id,
          item.product_name,
          item.product_ref,
          item.unit_price,
          item.unit_cost,
          item.quantity,
          item.total_price
        ]);

        const previousStock = item.current_stock;
        const newStock = previousStock - item.quantity;

        // Décrémentation du stock produit
        await tx.execute(
          'UPDATE products SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [item.quantity, item.product_id]
        );

        // Mouvement de stock pour traçabilité
        await tx.execute(`
          INSERT INTO stock_movements (
            product_id, type, quantity, previous_stock, new_stock, reason, created_by
          ) VALUES (?, 'VENTE', ?, ?, ?, ?, ?)
        `, [
          item.product_id,
          item.quantity,
          previousStock,
          newStock,
          `Vente ticket N° ${saleNumber}`,
          req.user?.id || 1
        ]);
      }

      return {
        saleId,
        saleNumber,
        totalAmount: calculatedTotal,
        amountReceived: amountReceivedNum,
        changeReturned,
        itemsCount: validatedItems.length,
        items: validatedItems
      };
    });

    res.status(201).json({
      message: 'Vente validée et stock décrémenté avec succès.',
      sale: saleResult
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
