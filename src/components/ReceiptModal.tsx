import React from 'react';
import { Printer, Download, X, CheckCircle, ShieldCheck } from 'lucide-react';
import { Sale, SaleItem, ShopSettings } from '../types/index.ts';
import { formatCurrency, formatDate } from '../lib/formatters.ts';
import { generateInvoicePDF } from '../lib/pdfGenerator.ts';

interface ReceiptModalProps {
  sale: Sale;
  items: SaleItem[];
  settings?: ShopSettings;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  sale,
  items,
  settings,
  onClose,
}) => {
  const shopName = settings?.shop_name || 'FLASH-SHOP';
  const shopPhone = settings?.phone || '+225 07 88 99 00 11';
  const shopAddress = settings?.address || "Boulevard Giscard d'Estaing, Zone 4";
  const shopCity = settings?.city || 'Abidjan';
  const currency = settings?.currency || 'FCFA';
  const receiptFooter = settings?.receipt_footer || 'Merci de votre visite ! Matériels électroniques garantis 12 mois.';

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    generateInvoicePDF(sale, items, settings);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-8">
        {/* Barre d'action supérieure */}
        <div className="no-print bg-[#0F2B59] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold">Vente Enregistrée & Validée</h3>
              <p className="text-[11px] text-blue-200">{sale.sale_number}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Aperçu du Ticket Thermique (Compatible Impression) */}
        <div className="p-6 overflow-y-auto max-h-[60vh] bg-slate-50 flex justify-center">
          <div
            id="printable-document"
            className="w-full max-w-[320px] bg-white p-6 shadow-sm border border-slate-200 rounded-sm font-mono text-xs leading-relaxed text-slate-800"
          >
            {/* Entête Ticket */}
            <div className="text-center pb-4 border-b border-dashed border-slate-300">
              <div className="w-10 h-10 mx-auto mb-1 rounded-lg overflow-hidden bg-slate-100 p-1 flex items-center justify-center">
                <img
                  src="/src/assets/images/flash_shop_logo_1793651306443.jpg"
                  alt="FLASH-SHOP"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <h4 className="font-extrabold text-base tracking-tight text-slate-950 font-sans">
                {shopName}
              </h4>
              <p className="text-[10px] text-slate-600">{shopAddress}</p>
              <p className="text-[10px] text-slate-600">{shopCity}</p>
              <p className="text-[10px] text-slate-600">Tél: {shopPhone}</p>
            </div>

            {/* Infos Vente */}
            <div className="py-3 border-b border-dashed border-slate-300 text-[11px] space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Ticket N° :</span>
                <span className="font-bold text-slate-900">{sale.sale_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date :</span>
                <span>{formatDate(sale.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Caissier :</span>
                <span>{sale.cashier_name || 'Comptoir'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Paiement :</span>
                <span className="font-semibold text-slate-800">Espèces ({currency})</span>
              </div>
            </div>

            {/* Lignes d'articles */}
            <div className="py-3 border-b border-dashed border-slate-300">
              <div className="flex justify-between font-bold text-[10px] text-slate-500 uppercase pb-1 mb-1 border-b border-slate-200">
                <span>Article</span>
                <span>Total</span>
              </div>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="text-[11px]">
                    <div className="font-semibold text-slate-900 truncate">
                      {item.product_name}
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>
                        {item.quantity} x {formatCurrency(item.unit_price, '')}
                      </span>
                      <span className="font-medium text-slate-900 tabular-nums">
                        {formatCurrency(item.total_price, currency)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totaux & Rendu */}
            <div className="py-3 border-b border-dashed border-slate-300 space-y-1.5 text-[11px]">
              <div className="flex justify-between text-sm font-extrabold text-slate-950 pt-1">
                <span>TOTAL NET :</span>
                <span className="tabular-nums">{formatCurrency(sale.total_amount, currency)}</span>
              </div>
              <div className="flex justify-between text-slate-600 pt-1">
                <span>Montant Reçu :</span>
                <span className="tabular-nums">{formatCurrency(sale.amount_received, currency)}</span>
              </div>
              <div className="flex justify-between font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-sm">
                <span>Monnaie Rendue :</span>
                <span className="tabular-nums">{formatCurrency(sale.change_returned, currency)}</span>
              </div>
            </div>

            {/* Pied de ticket */}
            <div className="pt-4 text-center text-[10px] text-slate-500 space-y-1">
              <p className="font-medium">{receiptFooter}</p>
              <div className="pt-2 flex items-center justify-center gap-1 text-[9px] text-slate-400">
                <ShieldCheck className="w-3 h-3 text-slate-400" />
                <span>Garantie 12 Mois Pièces & Main d'Œuvre</span>
              </div>
              <p className="text-[8px] text-slate-400 pt-1">FLASH-SHOP POS SYSTEM · {sale.sale_number}</p>
            </div>
          </div>
        </div>

        {/* Boutons d'action en bas */}
        <div className="no-print p-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={handlePrint}
            className="w-full sm:flex-1 py-2.5 px-4 bg-[#0F2B59] hover:bg-blue-900 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer le Reçu</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            className="w-full sm:flex-1 py-2.5 px-4 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Télécharger Facture PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};
