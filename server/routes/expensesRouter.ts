import { Router } from 'express';
import { query, execute } from '../db.ts';
import { authenticate } from '../auth.ts';

const router = Router();

const VALID_CATEGORIES = [
  'LOYER',
  'ELECTRICITE',
  'EAU',
  'INTERNET',
  'TRANSPORT',
  'ENTRETIEN',
  'SALAIRES',
  'AUTRE'
];

// Obtenir la liste des dépenses avec total cumulé
router.get('/', authenticate, async (req, res) => {
  try {
    const { category, month, year } = req.query;

    let sql = `
      SELECT e.id, e.title, e.category, e.amount, e.description,
             e.expense_date, e.created_at, u.full_name as author_name
      FROM expenses e
      LEFT JOIN users u ON u.id = e.created_by
      WHERE 1=1
    `;
    const params: any[] = [];

    if (category && typeof category === 'string' && category !== 'TOUS') {
      sql += ' AND e.category = ?';
      params.push(category);
    }

    if (month && year) {
      const formattedMonth = String(month).padStart(2, '0');
      sql += ' AND strftime("%Y-%m", e.expense_date) = ?';
      params.push(`${year}-${formattedMonth}`);
    }

    sql += ' ORDER BY e.expense_date DESC, e.id DESC';

    const expenses = await query<any>(sql, params);

    // Calculer le total
    const totalAmount = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);

    // Ventilation par catégorie
    const categoryTotals: Record<string, number> = {};
    for (const exp of expenses) {
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + Number(exp.amount || 0);
    }

    res.json({
      expenses,
      totalAmount,
      categoryTotals
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Enregistrer une nouvelle dépense
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, category, amount, description, expense_date } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "L'intitulé de la dépense est obligatoire." });
    }
    if (!category || !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Catégorie de dépense invalide.' });
    }

    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ error: 'Le montant doit être un chiffre supérieur à zéro.' });
    }

    const dateVal = expense_date || new Date().toISOString().split('T')[0];

    const result = await execute(`
      INSERT INTO expenses (title, category, amount, description, expense_date, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      title.trim(),
      category,
      amountNum,
      description?.trim() || null,
      dateVal,
      req.user?.id || 1
    ]);

    res.status(201).json({
      message: 'Dépense enregistrée avec succès.',
      id: result.insertId
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Modifier une dépense
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, amount, description, expense_date } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "L'intitulé de la dépense est obligatoire." });
    }
    if (!category || !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Catégorie de dépense invalide.' });
    }

    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ error: 'Le montant doit être supérieur à zéro.' });
    }

    const dateVal = expense_date || new Date().toISOString().split('T')[0];

    const result = await execute(`
      UPDATE expenses SET
        title = ?,
        category = ?,
        amount = ?,
        description = ?,
        expense_date = ?
      WHERE id = ?
    `, [title.trim(), category, amountNum, description?.trim() || null, dateVal, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Dépense introuvable.' });
    }

    res.json({ message: 'Dépense mise à jour avec succès.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Supprimer une dépense
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await execute('DELETE FROM expenses WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Dépense introuvable.' });
    }
    res.json({ message: 'Dépense supprimée avec succès.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
