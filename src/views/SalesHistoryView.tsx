import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Search,
  Calendar,
  Printer,
  Download,
  Eye,
  Filter,
  DollarSign,
  User,
  ShieldCheck,
} from 'lucide-react';
import { Sale, SaleItem, ShopSettings } from '../types/index.ts';
import { apiRequest } from '../lib/api.ts';
import { formatCurrency, formatDate } from '../lib/formatters.ts';
import { ReceiptModal } from '../components/ReceiptModal.tsx';
import { generateInvoicePDF } from '../lib/pdfGenerator.ts';

export const SalesHistoryView: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Détail vente pour modal
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [settings, setSettings] = useState<ShopSettings | undefined>();
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const loadSales = async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest<Sale[]>('/api/sales', {
        params: { search, start_date: startDate, end_date: endDate },
      });
      setSales(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, [search, startDate, endDate]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenReceipt = async (sale: Sale) => {
    try {
      const data = await apiRequest<{ sale: Sale; items: SaleItem[]; settings: ShopSettings }>(
        `/api/sales/${sale.id}`
      );
      setSelectedSale(data.sale);
      setSaleItems(data.items);
      setSettings(data.settings);
      setIsReceiptOpen(true);
    } catch (err: any) {
      showToast(err.message || 'Impossible de charger le reçu.');
    }
  };

  const handleDirectPDF = async (sale: Sale) => {
    try {
      const data = await apiRequest<{ sale: Sale; items: SaleItem[]; settings: ShopSettings }>(
        `/api/sales/${sale.id}`
      );
      generateInvoicePDF(data.sale, data.items, data.settings);
    } catch (err: any) {
      showToast(err.message || 'Impossible de générer la facture PDF.');
    }
  };

  const totalFilteredRevenue = sales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
  const totalFilteredQuantity = sales.reduce((sum, s) => sum + Number(s.total_quantity || 0), 0);

  return (
    <div className="p-2.5 sm:p-3.5 lg:p-4 space-y-2.5 sm:space-y-3 max-w-full">
      {/* En-tête compact */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-0.5">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
            Historique des Ventes
          </h2>
          <p className="text-[11px] text-slate-500">
            Registre des transactions comptoir, réimpression des tickets et factures en FCFA.
          </p>
        </div>

        <div className="flex items-center gap-2.5 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg">
          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-blue-700 block">
              Cumul des Ventes Filtrées
            </span>
            <span className="text-sm font-extrabold text-[#0F2B59] tabular-nums">
              {formatCurrency(totalFilteredRevenue)}
            </span>
          </div>
          <span className="text-[11px] text-blue-600 font-semibold">({sales.length} ventes)</span>
        </div>
      </div>

      {/* Filtres de recherche et dates compacts */}
      <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center gap-2">
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par numéro de ticket (ex: VTE-202611-0001)..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-600">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span className="text-[11px]">Du</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-slate-700 focus:outline-none text-[11px]"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-600">
            <span className="text-[11px]">Au</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-slate-700 focus:outline-none text-[11px]"
            />
          </div>

          {(search || startDate || endDate) && (
            <button
              onClick={() => {
                setSearch('');
                setStartDate('');
                setEndDate('');
              }}
              className="text-xs text-rose-600 font-semibold px-2 py-1 hover:underline cursor-pointer"
            >
              Effacer
            </button>
          )}
        </div>
      </div>

      {/* Tableau des Ventes Compact */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px]">
              <tr>
                <th className="py-2 px-2.5 font-semibold">Numéro Vente</th>
                <th className="py-2 px-2.5 font-semibold">Date & Heure</th>
                <th className="py-2 px-2.5 font-semibold">Caissier</th>
                <th className="py-2 px-2.5 font-semibold text-center">Articles</th>
                <th className="py-2 px-2.5 font-semibold text-right">Montant Reçu</th>
                <th className="py-2 px-2.5 font-semibold text-right">Monnaie Rendue</th>
                <th className="py-2 px-2.5 font-semibold text-right">Total Net</th>
                <th className="py-2 px-2.5 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-400 text-xs">
                    Chargement de l'historique...
                  </td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-400 text-xs">
                    Aucune vente ne correspond aux critères de recherche.
                  </td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Numéro */}
                    <td className="py-2 px-2.5 font-mono font-bold text-blue-900 text-xs">
                      {sale.sale_number}
                    </td>

                    {/* Date */}
                    <td className="py-2 px-2.5 text-slate-600 text-xs">{formatDate(sale.created_at)}</td>

                    {/* Caissier */}
                    <td className="py-2 px-2.5 text-xs">
                      <span className="font-medium text-slate-800">
                        {sale.cashier_name || 'Comptoir'}
                      </span>
                    </td>

                    {/* Articles */}
                    <td className="py-2 px-2.5 text-center tabular-nums font-semibold text-xs">
                      {sale.total_quantity || 1} unité{(sale.total_quantity || 1) > 1 ? 's' : ''}
                    </td>

                    {/* Montant Reçu */}
                    <td className="py-2 px-2.5 text-right tabular-nums text-slate-600 text-xs">
                      {formatCurrency(sale.amount_received)}
                    </td>

                    {/* Monnaie Rendue */}
                    <td className="py-2 px-2.5 text-right tabular-nums text-emerald-700 font-semibold text-xs">
                      {formatCurrency(sale.change_returned)}
                    </td>

                    {/* Total Net */}
                    <td className="py-2 px-2.5 text-right tabular-nums font-extrabold text-slate-900 text-xs">
                      {formatCurrency(sale.total_amount)}
                    </td>

                    {/* Actions */}
                    <td className="py-2 px-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenReceipt(sale)}
                          className="p-1 rounded hover:bg-slate-100 text-slate-600 hover:text-blue-700 transition-colors cursor-pointer"
                          title="Voir Ticket et Imprimer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDirectPDF(sale)}
                          className="p-1 rounded hover:bg-orange-50 text-slate-600 hover:text-orange-600 transition-colors cursor-pointer"
                          title="Télécharger Facture PDF A4"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-slate-700">
          <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Modal Reçu de caisse & Facture */}
      {isReceiptOpen && selectedSale && (
        <ReceiptModal
          sale={selectedSale}
          items={saleItems}
          settings={settings}
          onClose={() => setIsReceiptOpen(false)}
        />
      )}
    </div>
  );
};
