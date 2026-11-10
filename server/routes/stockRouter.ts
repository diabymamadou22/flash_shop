import { Router } from 'express';
import { query, withTransaction } from '../db.ts';
import { authenticate } from '../auth.ts';

const router = Router();

// Historique complet des mouvements de stock
router.get('/movements', authenticate, async (req, res) => {
  try {
    const { product_id, type } = req.query;

    let sql = `
      SELECT sm.id, sm.product_id, sm.type, sm.quantity,
             sm.previous_stock, sm.new_stock, sm.reason, sm.created_at,
             p.name as product_name, p.reference as product_ref,
             u.full_name as user_name
      FROM stock_movements sm
      JOIN products p ON p.id = sm.product_id
      LEFT JOIN users u ON u.id = sm.created_by
      WHERE 1=1
    `;
    const params: any[] = [];

    if (product_id) {
      sql += ' AND sm.product_id = ?';
      params.push(product_id);
    }

    if (type && typeof type === 'string' && type !== 'TOUS') {
      sql += ' AND sm.type = ?';
      params.push(type);
    }

    sql += ' ORDER BY sm.id DESC LIMIT 200';

    const movements = await query<any>(sql, params);
    res.json(movements);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Alertes de stock faible
router.get('/alerts', authenticate, async (req, res) => {
  try {
    const alerts = await query<any>(`
      SELECT p.id, p.name, p.reference, p.quantity, p.alert_threshold,
             p.buy_price, p.sell_price, c.name as category_name,
             CASE
               WHEN p.quantity <= 0 THEN 'RUPTURE'
               ELSE 'FAIBLE'
             END as alert_severity
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.quantity <= p.alert_threshold
      ORDER BY p.quantity ASC
    `);
    res.json(alerts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Enregistrer un mouvement manuel (Entrée, Sortie ou Correction)
router.post('/movement', authenticate, async (req, res) => {
  try {
    const { product_id, type, quantity, new_stock_target, reason } = req.body;

    if (!product_id) {
      return res.status(400).json({ error: 'Veuillez sélectionner un produit.' });
    }
    if (!['ENTREE', 'SORTIE', 'CORRECTION'].includes(type)) {
      return res.status(400).json({ error: 'Type de mouvement invalide. Choix: ENTREE, SORTIE ou CORRECTION.' });
    }
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Le motif du mouvement est obligatoire pour la traçabilité.' });
    }

    await withTransaction(async (tx) => {
      const prods = await tx.query<any>('SELECT id, name, reference, quantity FROM products WHERE id = ?', [product_id]);
      if (prods.length === 0) {
        throw new Error('Produit introuvable.');
      }

      const prod = prods[0];
      const previousStock = prod.quantity;
      let calculatedNewStock = previousStock;
      let movQuantity = 0;

      if (type === 'ENTREE') {
        const qtyNum = parseInt(quantity, 10);
        if (isNaN(qtyNum) || qtyNum <= 0) {
          throw new Error('La quantité reçue doit être un nombre entier positif.');
        }
        movQuantity = qtyNum;
        calculatedNewStock = previousStock + qtyNum;
      } else if (type === 'SORTIE') {
        const qtyNum = parseInt(quantity, 10);
        if (isNaN(qtyNum) || qtyNum <= 0) {
          throw new Error('La quantité sortie doit être un nombre entier positif.');
        }
        // INTERDICTION STRICTE DES STOCKS NÉGATIFS
        if (qtyNum > previousStock) {
          throw new Error(`Opération refusée : Le stock disponible (${previousStock}) est inférieur à la quantité à sortir (${qtyNum}).`);
        }
        movQuantity = qtyNum;
        calculatedNewStock = previousStock - qtyNum;
      } else if (type === 'CORRECTION') {
        const targetNum = parseInt(new_stock_target, 10);
        if (isNaN(targetNum) || targetNum < 0) {
          throw new Error('Le nouveau stock corrigé ne peut pas être négatif.');
        }
        calculatedNewStock = targetNum;
        movQuantity = Math.abs(targetNum - previousStock);
      }

      // Mettre à jour le produit
      await tx.execute('UPDATE products SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
        calculatedNewStock,
        product_id
      ]);

      // Enregistrer le mouvement
      await tx.execute(`
        INSERT INTO stock_movements (
          product_id, type, quantity, previous_stock, new_stock, reason, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        product_id,
        type,
        movQuantity,
        previousStock,
        calculatedNewStock,
        reason.trim(),
        req.user?.id || 1
      ]);
    });

    res.json({ message: 'Mouvement de stock enregistré avec succès.' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
