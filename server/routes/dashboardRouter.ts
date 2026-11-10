import { Router } from 'express';
import { query } from '../db.ts';
import { authenticate } from '../auth.ts';

const router = Router();

router.get('/stats', authenticate, async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonthStr = todayStr.substring(0, 7); // YYYY-MM

    // 1. Chiffre d'affaires journalier (Aujourd'hui)
    const todayRows = await query<any>(`
      SELECT COALESCE(SUM(total_amount), 0) as revenue, COUNT(id) as count
      FROM sales
      WHERE DATE(created_at) = ? AND status = 'VALIDEE'
    `, [todayStr]);
    const todayRevenue = Number(todayRows[0]?.revenue || 0);
    const todaySalesCount = Number(todayRows[0]?.count || 0);

    // 2. Chiffre d'affaires mensuel (Ce mois-ci)
    const monthRows = await query<any>(`
      SELECT COALESCE(SUM(total_amount), 0) as revenue, COUNT(id) as count
      FROM sales
      WHERE (DATE(created_at) LIKE ? OR strftime('%Y-%m', created_at) = ?) AND status = 'VALIDEE'
    `, [`${currentMonthStr}%`, currentMonthStr]);
    const monthRevenue = Number(monthRows[0]?.revenue || 0);
    const monthSalesCount = Number(monthRows[0]?.count || 0);

    // 3. Métriques globales des ventes
    const allSalesRows = await query<any>(`
      SELECT COALESCE(SUM(total_amount), 0) as total_revenue, COUNT(id) as total_count
      FROM sales
      WHERE status = 'VALIDEE'
    `);
    const totalRevenue = Number(allSalesRows[0]?.total_revenue || 0);
    const totalSalesCount = Number(allSalesRows[0]?.total_count || 0);

    // 4. Marge brute réalisée ce mois-ci
    const marginRows = await query<any>(`
      SELECT COALESCE(SUM(si.total_price - (si.unit_cost * si.quantity)), 0) as gross_margin
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      WHERE (DATE(s.created_at) LIKE ? OR strftime('%Y-%m', s.created_at) = ?) AND s.status = 'VALIDEE'
    `, [`${currentMonthStr}%`, currentMonthStr]);
    const monthGrossMargin = Number(marginRows[0]?.gross_margin || 0);

    // 5. Total des dépenses du mois
    const expenseRows = await query<any>(`
      SELECT COALESCE(SUM(amount), 0) as total_expenses
      FROM expenses
      WHERE (expense_date LIKE ? OR strftime('%Y-%m', expense_date) = ?)
    `, [`${currentMonthStr}%`, currentMonthStr]);
    const monthExpenses = Number(expenseRows[0]?.total_expenses || 0);

    // 6. Inventaire & Stocks
    const productStats = await query<any>(`
      SELECT 
        COUNT(id) as total_products,
        COALESCE(SUM(quantity), 0) as total_units,
        COALESCE(SUM(quantity * buy_price), 0) as stock_cost_value,
        COALESCE(SUM(quantity * sell_price), 0) as stock_sell_value,
        COALESCE(SUM(CASE WHEN quantity <= alert_threshold THEN 1 ELSE 0 END), 0) as low_stock_count,
        COALESCE(SUM(CASE WHEN quantity <= 0 THEN 1 ELSE 0 END), 0) as out_of_stock_count
      FROM products
    `);
    const inv = productStats[0] || {};

    // 7. Graphique des ventes des 7 derniers jours
    const chartDays = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
      chartDays.push({ date: dateStr, label: dayName, revenue: 0, count: 0 });
    }

    const recentSalesChart = await query<any>(`
      SELECT DATE(created_at) as sale_date,
             SUM(total_amount) as daily_revenue,
             COUNT(id) as daily_count
      FROM sales
      WHERE DATE(created_at) >= ? AND status = 'VALIDEE'
      GROUP BY DATE(created_at)
    `, [chartDays[0].date]);

    const chartMap = new Map<string, { revenue: number; count: number }>();
    for (const row of recentSalesChart) {
      chartMap.set(row.sale_date, {
        revenue: Number(row.daily_revenue || 0),
        count: Number(row.daily_count || 0)
      });
    }

    const salesChart = chartDays.map(cd => {
      const found = chartMap.get(cd.date);
      return {
        date: cd.date,
        label: cd.label,
        revenue: found ? found.revenue : 0,
        count: found ? found.count : 0
      };
    });

    // 8. Les 5 dernières ventes
    const recentSales = await query<any>(`
      SELECT s.id, s.sale_number, s.total_amount, s.amount_received,
             s.change_returned, s.created_at, u.full_name as cashier_name,
             COUNT(si.id) as items_count
      FROM sales s
      LEFT JOIN users u ON u.id = s.user_id
      LEFT JOIN sale_items si ON si.sale_id = s.id
      GROUP BY s.id
      ORDER BY s.id DESC
      LIMIT 5
    `);

    // 9. Top 5 des produits les plus vendus
    const topProducts = await query<any>(`
      SELECT si.product_id, si.product_name, si.product_ref,
             SUM(si.quantity) as total_sold,
             SUM(si.total_price) as total_revenue
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      WHERE s.status = 'VALIDEE'
      GROUP BY si.product_ref, si.product_name
      ORDER BY total_sold DESC
      LIMIT 5
    `);

    res.json({
      todayRevenue,
      todaySalesCount,
      monthRevenue,
      monthSalesCount,
      totalRevenue,
      totalSalesCount,
      monthGrossMargin,
      monthExpenses,
      netResult: monthGrossMargin - monthExpenses,
      totalProducts: Number(inv.total_products || 0),
      totalStockUnits: Number(inv.total_units || 0),
      stockCostValue: Number(inv.stock_cost_value || 0),
      stockSellValue: Number(inv.stock_sell_value || 0),
      lowStockCount: Number(inv.low_stock_count || 0),
      outOfStockCount: Number(inv.out_of_stock_count || 0),
      salesChart,
      recentSales,
      topProducts
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
