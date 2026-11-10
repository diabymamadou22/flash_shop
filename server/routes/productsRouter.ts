import { Router } from 'express';
import { query, execute, withTransaction } from '../db.ts';
import { authenticate } from '../auth.ts';

const router = Router();

// Obtenir la liste de tous les produits avec filtres
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, category_id, stock_status } = req.query;

    let sql = `
      SELECT p.id, p.name, p.reference, p.category_id, p.image_url,
             p.buy_price, p.sell_price, p.quantity, p.alert_threshold,
             p.description, p.created_at, p.updated_at,
             c.name as category_name,
             (p.sell_price - p.buy_price) as gross_margin,
             CASE 
               WHEN p.sell_price > 0 THEN ROUND(((p.sell_price - p.buy_price) / p.sell_price) * 100, 2)
               ELSE 0
             END as margin_percentage,
             CASE
               WHEN p.quantity <= 0 THEN 'RUPTURE'
               WHEN p.quantity <= p.alert_threshold THEN 'FAIBLE'
               ELSE 'NORMAL'
             END as stock_status
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search && typeof search === 'string') {
      sql += ' AND (p.name LIKE ? OR p.reference LIKE ? OR p.description LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    if (category_id) {
      sql += ' AND p.category_id = ?';
      params.push(category_id);
    }

    if (stock_status === 'FAIBLE') {
      sql += ' AND p.quantity <= p.alert_threshold AND p.quantity > 0';
    } else if (stock_status === 'RUPTURE') {
      sql += ' AND p.quantity <= 0';
    } else if (stock_status === 'ALERTES') {
      sql += ' AND p.quantity <= p.alert_threshold';
    }

    sql += ' ORDER BY p.id DESC';

    const products = await query<any>(sql, params);
    res.json(products);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Consulter un produit par ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const products = await query<any>(`
      SELECT p.*, c.name as category_name,
             (p.sell_price - p.buy_price) as gross_margin,
             CASE 
               WHEN p.sell_price > 0 THEN ROUND(((p.sell_price - p.buy_price) / p.sell_price) * 100, 2)
               ELSE 0
             END as margin_percentage
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.id = ?
    `, [id]);

    if (products.length === 0) {
      return res.status(404).json({ error: 'Produit non trouvé.' });
    }

    res.json(products[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Ajouter un produit
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      name,
      reference,
      category_id,
      image_url,
      buy_price,
      sell_price,
      quantity,
      alert_threshold,
      description
    } = req.body;

    // Validation stricte des données
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Le nom du produit est obligatoire.' });
    }
    let finalReference = reference ? reference.trim().toUpperCase() : `REF-${Math.floor(100000 + Math.random() * 900000)}`;
    
    let finalCategoryId = category_id;
    if (!finalCategoryId) {
      const defaultCats = await query<any>('SELECT id FROM categories ORDER BY id ASC LIMIT 1');
      if (defaultCats.length > 0) {
        finalCategoryId = defaultCats[0].id;
      } else {
        return res.status(400).json({ error: 'Veuillez créer au moins une catégorie.' });
      }
    }

    const buyPriceNum = Number(buy_price) || 0;
    const sellPriceNum = Number(sell_price) || 0;
    const quantityNum = Math.max(0, parseInt(quantity, 10) || 0);
    const alertThresholdNum = Math.max(1, parseInt(alert_threshold, 10) || 5);

    if (sellPriceNum < buyPriceNum) {
      // Avertissement ou validation
      console.warn(`Attention : Prix de vente inférieur au prix d'achat pour ${name}`);
    }

    // Vérifier l'unicité de la référence
    const existingRef = await query<any>(
      'SELECT id FROM products WHERE LOWER(reference) = LOWER(?)',
      [finalReference.toLowerCase()]
    );
    if (existingRef.length > 0) {
      return res.status(400).json({ error: 'Cette référence produit existe déjà. Elle doit être unique.' });
    }

    // Transaction pour insérer le produit et logger l'entrée initiale de stock si quantité > 0
    const newProductId = await withTransaction(async (tx) => {
      const prodResult = await tx.execute(`
        INSERT INTO products (
          name, reference, category_id, image_url, buy_price, sell_price,
          quantity, alert_threshold, description
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        name.trim(),
        finalReference,
        finalCategoryId,
        image_url?.trim() || null,
        buyPriceNum,
        sellPriceNum,
        quantityNum,
        alertThresholdNum,
        description?.trim() || null
      ]);

      const insertedId = prodResult.insertId;

      if (quantityNum > 0) {
        await tx.execute(`
          INSERT INTO stock_movements (
            product_id, type, quantity, previous_stock, new_stock, reason, created_by
          ) VALUES (?, 'ENTREE', ?, 0, ?, 'Stock initial lors de la création du produit', ?)
        `, [insertedId, quantityNum, quantityNum, req.user?.id || 1]);
      }

      return insertedId;
    });

    res.status(201).json({
      message: 'Produit créé avec succès.',
      productId: newProductId
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Modifier un produit
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      reference,
      category_id,
      image_url,
      buy_price,
      sell_price,
      alert_threshold,
      description
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Le nom du produit est obligatoire.' });
    }
    if (!reference || !reference.trim()) {
      return res.status(400).json({ error: 'La référence unique est obligatoire.' });
    }

    // Vérifier doublon de référence
    const existingRef = await query<any>(
      'SELECT id FROM products WHERE LOWER(reference) = LOWER(?) AND id != ?',
      [reference.trim(), id]
    );
    if (existingRef.length > 0) {
      return res.status(400).json({ error: 'Une autre référence identique existe déjà.' });
    }

    const buyPriceNum = Number(buy_price) || 0;
    const sellPriceNum = Number(sell_price) || 0;
    const alertThresholdNum = Math.max(1, parseInt(alert_threshold, 10) || 5);

    const result = await execute(`
      UPDATE products SET
        name = ?,
        reference = ?,
        category_id = ?,
        image_url = ?,
        buy_price = ?,
        sell_price = ?,
        alert_threshold = ?,
        description = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      name.trim(),
      reference.trim().toUpperCase(),
      category_id,
      image_url?.trim() || null,
      buyPriceNum,
      sellPriceNum,
      alertThresholdNum,
      description?.trim() || null,
      id
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Produit introuvable.' });
    }

    res.json({ message: 'Produit mis à jour avec succès.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Supprimer un produit (détache proprement les lignes de vente historiques sans casser l'historique)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    await withTransaction(async (tx) => {
      // 1. Détacher les lignes de vente (le nom et le prix restent conservés dans sale_items)
      await tx.execute('UPDATE sale_items SET product_id = NULL WHERE product_id = ?', [id]);

      // 2. Supprimer les mouvements de stock associés
      await tx.execute('DELETE FROM stock_movements WHERE product_id = ?', [id]);

      // 3. Supprimer le produit
      await tx.execute('DELETE FROM products WHERE id = ?', [id]);
    });

    res.json({ message: 'Produit supprimé avec succès.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Réapprovisionnement ou ajustement rapide direct du stock
router.post('/:id/adjust-stock', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { delta, reason } = req.body;

    const deltaNum = parseInt(delta, 10);
    if (isNaN(deltaNum) || deltaNum === 0) {
      return res.status(400).json({ error: 'La variation de stock (delta) doit être différente de zéro.' });
    }

    await withTransaction(async (tx) => {
      const prods = await tx.query<any>('SELECT id, name, reference, quantity FROM products WHERE id = ?', [id]);
      if (prods.length === 0) {
        throw new Error('Produit introuvable.');
      }
      const prod = prods[0];
      const previousStock = prod.quantity;
      const newStock = previousStock + deltaNum;

      if (newStock < 0) {
        throw new Error(`Stock négatif interdit ! Stock actuel: ${previousStock}, déduction demandée: ${Math.abs(deltaNum)}.`);
      }

      await tx.execute('UPDATE products SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
        newStock,
        id
      ]);

      const movType = deltaNum > 0 ? 'ENTREE' : 'SORTIE';
      const defaultReason = reason || (deltaNum > 0 ? `Réapprovisionnement rapide (+${deltaNum})` : `Sortie rapide (${deltaNum})`);

      await tx.execute(`
        INSERT INTO stock_movements (
          product_id, type, quantity, previous_stock, new_stock, reason, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        id,
        movType,
        Math.abs(deltaNum),
        previousStock,
        newStock,
        defaultReason,
        req.user?.id || 1
      ]);
    });

    res.json({ message: 'Stock mis à jour avec succès.' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
