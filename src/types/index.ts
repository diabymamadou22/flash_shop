export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: 'ADMIN' | 'CAISSIER';
}

export interface Category {
  id: number;
  name: string;
  description: string | null;
  product_count?: number;
  created_at?: string;
}

export interface Product {
  id: number;
  name: string;
  reference: string;
  category_id: number;
  category_name?: string;
  image_url: string | null;
  buy_price: number;
  sell_price: number;
  quantity: number;
  alert_threshold: number;
  description: string | null;
  gross_margin?: number;
  margin_percentage?: number;
  stock_status?: 'NORMAL' | 'FAIBLE' | 'RUPTURE';
  created_at?: string;
  updated_at?: string;
}

export interface SaleItem {
  id?: number;
  sale_id?: number;
  product_id: number | null;
  product_name: string;
  product_ref: string;
  unit_price: number;
  unit_cost: number;
  quantity: number;
  total_price: number;
}

export interface Sale {
  id: number;
  sale_number: string;
  total_amount: number;
  amount_received: number;
  change_returned: number;
  payment_method: string;
  status: 'VALIDEE' | 'ANNULEE';
  notes: string | null;
  cashier_name?: string;
  created_at: string;
  total_items?: number;
  items_count?: number;
  total_quantity?: number;
}

export interface StockMovement {
  id: number;
  product_id: number;
  product_name: string;
  product_ref: string;
  type: 'ENTREE' | 'SORTIE' | 'CORRECTION' | 'VENTE';
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reason: string;
  user_name?: string;
  created_at: string;
}

export interface Expense {
  id: number;
  title: string;
  category: 'LOYER' | 'ELECTRICITE' | 'EAU' | 'INTERNET' | 'TRANSPORT' | 'ENTRETIEN' | 'SALAIRES' | 'AUTRE';
  amount: number;
  description: string | null;
  expense_date: string;
  author_name?: string;
  created_at?: string;
}

export interface ShopSettings {
  id: number;
  shop_name: string;
  shop_tagline: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  currency: string;
  receipt_footer: string;
  tax_rate: number;
}

export interface DashboardStats {
  todayRevenue: number;
  todaySalesCount: number;
  monthRevenue: number;
  monthSalesCount: number;
  totalRevenue: number;
  totalSalesCount: number;
  monthGrossMargin: number;
  monthExpenses: number;
  netResult: number;
  totalProducts: number;
  totalStockUnits: number;
  stockCostValue: number;
  stockSellValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  salesChart: Array<{
    date: string;
    label: string;
    revenue: number;
    count: number;
  }>;
  recentSales: Sale[];
  topProducts: Array<{
    product_id: number;
    product_name: string;
    product_ref: string;
    total_sold: number;
    total_revenue: number;
  }>;
}

export interface DbStatus {
  driver: 'mysql' | 'sqlite_fallback';
  isConnected: boolean;
  host: string;
  database: string;
  port: number;
  totalProducts: number;
  totalSales: number;
  totalCategories: number;
  engineName: string;
  error?: string;
}
