import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Package,
  AlertTriangle,
  ArrowUpRight,
  Receipt,
  Boxes,
  Calendar,
  Sparkles,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { DashboardStats, Sale, SaleItem } from '../types/index.ts';
import { apiRequest } from '../lib/api.ts';
import { formatCurrency, formatDate } from '../lib/formatters.ts';
import { ReceiptModal } from '../components/ReceiptModal.tsx';
import { ActiveTab } from '../components/Sidebar.tsx';

interface DashboardViewProps {
  setActiveTab: (tab: ActiveTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ setActiveTab }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest<DashboardStats>('/api/dashboard/stats');
      setStats(data);
    } catch (error) {
      console.error('Erreur chargement dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleOpenSaleReceipt = async (sale: Sale) => {
    try {
      const data = await apiRequest<{ sale: Sale; items: SaleItem[] }>(`/api/sales/${sale.id}`);
      setSelectedSale(data.sale);
      setSaleItems(data.items);
      setIsReceiptOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading && !stats) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-500">Chargement du tableau de bord FLASH-SHOP...</p>
        </div>
      </div>
    );
  }

  const maxRevenue = Math.max(1, ...(stats?.salesChart.map((d) => d.revenue) || [1]));

  return (
    <div className="p-2.5 sm:p-3.5 lg:p-4 space-y-2.5 sm:space-y-3 max-w-full">
      {/* Top Banner with Quick Actions Compact */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-gradient-to-r from-[#0F2B59] to-[#1E40AF] p-3.5 sm:p-4 rounded-xl text-white shadow-2xs">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-xs bg-orange-500 text-white uppercase tracking-wider">
              Boutique Ouverte
            </span>
            <span className="text-[11px] text-blue-200">Devise : FCFA</span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold tracking-tight mt-0.5">
            Tableau de Bord Commercial
          </h2>
          <p className="text-xs text-blue-200/90">
            Suivi des ventes, niveau des stocks et rentabilité en direct.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadStats}
            title="Rafraîchir les données"
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setActiveTab('pos')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-lg shadow-2xs transition-colors whitespace-nowrap cursor-pointer"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Nouvelle Vente</span>
          </button>
        </div>
      </div>

      {/* 4 Cartes Statistiques Principales Compactes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* CA Journalier */}
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              CA Aujourd'hui
            </span>
            <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1">
            <h3 className="text-xl font-extrabold text-slate-900 tabular-nums">
              {formatCurrency(stats?.todayRevenue)}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
              <span className="font-semibold text-blue-600 tabular-nums">{stats?.todaySalesCount}</span>{' '}
              vente{stats?.todaySalesCount !== 1 ? 's' : ''} réalisée{stats?.todaySalesCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* CA Mensuel */}
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              CA du Mois
            </span>
            <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1">
            <h3 className="text-xl font-extrabold text-slate-900 tabular-nums">
              {formatCurrency(stats?.monthRevenue)}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
              <span className="font-semibold text-emerald-600 tabular-nums">{stats?.monthSalesCount}</span>{' '}
              vente{stats?.monthSalesCount !== 1 ? 's' : ''} sur le mois
            </p>
          </div>
        </div>

        {/* Produits en Stock & Valeur */}
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Catalogue & Stock
            </span>
            <div className="w-7 h-7 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Package className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1">
            <h3 className="text-xl font-extrabold text-slate-900 tabular-nums">
              {stats?.totalProducts} <span className="text-xs font-normal text-slate-500">articles</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Stock total : <span className="font-semibold text-slate-700 tabular-nums">{stats?.totalStockUnits} unités</span>
            </p>
          </div>
        </div>

        {/* Alertes Stock Faible */}
        <div
          onClick={() => setActiveTab('products')}
          className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs cursor-pointer hover:border-orange-300 transition-colors group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Alertes Stock
            </span>
            <div
              className={`w-7 h-7 rounded-md flex items-center justify-center ${
                (stats?.lowStockCount || 0) > 0
                  ? 'bg-rose-50 text-rose-600 group-hover:bg-rose-100'
                  : 'bg-slate-50 text-slate-400'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1">
            <h3 className="text-xl font-extrabold text-slate-900 tabular-nums">
              {stats?.lowStockCount}{' '}
              <span className="text-xs font-normal text-slate-500">produit{stats?.lowStockCount !== 1 ? 's' : ''}</span>
            </h3>
            <p className="text-[11px] text-rose-600 font-medium mt-0.5 flex items-center gap-1">
              <span>Réapprovisionnement</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </p>
          </div>
        </div>
      </div>

      {/* Métriques Financières & Marge Compactes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
        <div className="px-2">
          <p className="text-[11px] text-slate-500">Marge Brute Réalisée (Ce mois)</p>
          <p className="text-base font-bold text-slate-900 tabular-nums mt-0.5">
            {formatCurrency(stats?.monthGrossMargin)}
          </p>
          <p className="text-[10px] text-slate-400">Total ventes - coût d'achat</p>
        </div>

        <div className="px-2 border-t md:border-t-0 md:border-l border-slate-200 pt-2 md:pt-0">
          <p className="text-[11px] text-slate-500">Total Dépenses (Ce mois)</p>
          <p className="text-base font-bold text-amber-600 tabular-nums mt-0.5">
            {formatCurrency(stats?.monthExpenses)}
          </p>
          <p className="text-[10px] text-slate-400">Charges d'exploitation</p>
        </div>

        <div className="px-2 border-t md:border-t-0 md:border-l border-slate-200 pt-2 md:pt-0">
          <p className="text-[11px] text-slate-500">Résultat d'Exploitation Net</p>
          <p
            className={`text-base font-bold tabular-nums mt-0.5 ${
              (stats?.netResult || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {formatCurrency(stats?.netResult)}
          </p>
          <p className="text-[10px] text-slate-400">Marge brute moins charges</p>
        </div>
      </div>

      {/* Graphique des ventes (Derniers 7 Jours) + Top Ventes Compacts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Graphique des ventes */}
        <div className="lg:col-span-2 bg-white p-3.5 sm:p-4 rounded-lg border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Évolution des Ventes (7 Derniers Jours)
              </h3>
              <p className="text-[11px] text-slate-500">Chiffre d'affaires journalier en FCFA</p>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
              <Calendar className="w-3 h-3" />
              <span>Hebdo</span>
            </div>
          </div>

          {/* Bar Chart responsive compact */}
          <div className="mt-4 h-44 flex items-end gap-1.5 sm:gap-3 pt-4 pb-1">
            {stats?.salesChart.map((day, idx) => {
              const heightPercent = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
              const isToday = idx === stats.salesChart.length - 1;

              return (
                <div key={day.date} className="flex-1 flex flex-col items-center h-full justify-end group">
                  <div className="text-[9px] text-slate-500 font-mono tabular-nums opacity-0 group-hover:opacity-100 transition-opacity mb-0.5 whitespace-nowrap">
                    {formatCurrency(day.revenue, '')}
                  </div>
                  <div className="w-full max-w-[36px] bg-slate-100 rounded-t h-full flex items-end overflow-hidden">
                    <div
                      style={{ height: `${Math.max(6, heightPercent)}%` }}
                      className={`w-full rounded-t transition-all duration-500 ${
                        isToday
                          ? 'bg-orange-500 group-hover:bg-orange-600'
                          : 'bg-[#0F2B59] group-hover:bg-blue-800'
                      }`}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-slate-600 mt-1.5 truncate w-full text-center">
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top 5 des Ventes */}
        <div className="bg-white p-3.5 sm:p-4 rounded-lg border border-slate-200 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Top Articles Vendus</h3>
              <p className="text-[11px] text-slate-500">Par quantité écoulée</p>
            </div>
            <Sparkles className="w-3.5 h-3.5 text-orange-500" />
          </div>

          <div className="mt-2 divide-y divide-slate-100 flex-1">
            {stats?.topProducts && stats.topProducts.length > 0 ? (
              stats.topProducts.map((p, i) => (
                <div key={i} className="py-2 flex items-center justify-between text-xs">
                  <div className="truncate pr-2">
                    <p className="font-semibold text-slate-800 truncate text-[11px]">{p.product_name}</p>
                    <p className="text-slate-400 font-mono text-[9px]">{p.product_ref}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-blue-900 tabular-nums text-xs">
                      {p.total_sold} vendus
                    </span>
                    <p className="text-[9px] text-slate-500 tabular-nums">
                      {formatCurrency(p.total_revenue)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-xs text-slate-400">
                Aucune vente enregistrée pour le moment.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dernières Ventes Réalisées Compact */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-3 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Dernières Ventes Comptoir</h3>
            <p className="text-[11px] text-slate-500">Tickets et encaissements récents</p>
          </div>
          <button
            onClick={() => setActiveTab('sales')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
          >
            <span>Historique complet</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px]">
              <tr>
                <th className="py-2 px-2.5 font-semibold">N° Ticket</th>
                <th className="py-2 px-2.5 font-semibold">Date</th>
                <th className="py-2 px-2.5 font-semibold">Articles</th>
                <th className="py-2 px-2.5 font-semibold">Caissier</th>
                <th className="py-2 px-2.5 font-semibold text-right">Montant Total</th>
                <th className="py-2 px-2.5 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {stats?.recentSales && stats.recentSales.length > 0 ? (
                stats.recentSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2 px-2.5 font-mono font-bold text-blue-900 text-xs">
                      {sale.sale_number}
                    </td>
                    <td className="py-2 px-2.5 text-slate-500 text-xs">{formatDate(sale.created_at)}</td>
                    <td className="py-2 px-2.5 text-xs">{sale.items_count || 1} article(s)</td>
                    <td className="py-2 px-2.5 text-xs">{sale.cashier_name || 'Comptoir'}</td>
                    <td className="py-2 px-2.5 text-right font-bold text-slate-900 tabular-nums text-xs">
                      {formatCurrency(sale.total_amount)}
                    </td>
                    <td className="py-2 px-2.5 text-center">
                      <button
                        onClick={() => handleOpenSaleReceipt(sale)}
                        className="p-1 rounded hover:bg-slate-100 text-slate-600 hover:text-blue-700 transition-colors inline-flex items-center gap-1 cursor-pointer text-xs"
                        title="Consulter et Imprimer Reçu"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Ticket</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400 text-xs">
                    Aucune vente pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Reçu de caisse */}
      {isReceiptOpen && selectedSale && (
        <ReceiptModal
          sale={selectedSale}
          items={saleItems}
          onClose={() => setIsReceiptOpen(false)}
        />
      )}
    </div>
  );
};
