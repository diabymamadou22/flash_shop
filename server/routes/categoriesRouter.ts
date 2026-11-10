import { Router } from 'express';
import { query, execute } from '../db.ts';
import { authenticate } from '../auth.ts';

const router = Router();

// Liste des catégories avec comptage de produits associés
router.get('/', authenticate, async (req, res) => {
  try {
    const categories = await query<any>(`
      SELECT c.id, c.name, c.description, c.created_at,
             COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id
      GROUP BY c.id
      ORDER BY c.name ASC
    `);
    res.json(categories);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Créer une catégorie
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Le nom de la catégorie est obligatoire.' });
    }

    // Vérifier unicité
    const existing = await query<any>('SELECT id FROM categories WHERE LOWER(name) = LOWER(?)', [name.trim()]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Une catégorie portant ce nom existe déjà.' });
    }

    const result = await execute(
      'INSERT INTO categories (name, description) VALUES (?, ?)',
      [name.trim(), description?.trim() || null]
    );

    res.status(201).json({
      id: result.insertId,
      name: name.trim(),
      description: description?.trim() || null,
      product_count: 0
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Modifier une catégorie
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Le nom de la catégorie est obligatoire.' });
    }

    // Vérifier doublon
    const existing = await query<any>(
      'SELECT id FROM categories WHERE LOWER(name) = LOWER(?) AND id != ?',
      [name.trim(), id]
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Une autre catégorie porte déjà ce nom.' });
    }

    const result = await execute(
      'UPDATE categories SET name = ?, description = ? WHERE id = ?',
      [name.trim(), description?.trim() || null, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Catégorie non trouvée.' });
    }

    res.json({ message: 'Catégorie modifiée avec succès.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Supprimer une catégorie (avec option force pour réassigner ou supprimer les produits)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const force = req.query.force === 'true';

    // Vérifier si des produits sont rattachés
    const countCheck = await query<any>(
      'SELECT COUNT(*) as count FROM products WHERE category_id = ?',
      [id]
    );
    const prodCount = countCheck[0]?.count || 0;

    if (prodCount > 0 && !force) {
      return res.status(400).json({
        error: `Action requise : Cette catégorie contient ${prodCount} produit(s). Cochez l'option pour forcer la suppression ou supprimez d'abord ses articles.`,
        prodCount
      });
    }

    if (prodCount > 0 && force) {
      // Supprimer les produits de cette catégorie
      const prods = await query<any>('SELECT id FROM products WHERE category_id = ?', [id]);
      for (const p of prods) {
        await execute('UPDATE sale_items SET product_id = NULL WHERE product_id = ?', [p.id]);
        await execute('DELETE FROM stock_movements WHERE product_id = ?', [p.id]);
        await execute('DELETE FROM products WHERE id = ?', [p.id]);
      }
    }

    const result = await execute('DELETE FROM categories WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Catégorie non trouvée.' });
    }

    res.json({ message: 'Catégorie supprimée avec succès.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
