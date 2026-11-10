import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Plus,
  Trash2,
  Calendar,
  X,
  PieChart,
  Home,
  Zap,
  Droplet,
  Wifi,
  Truck,
  Wrench,
  Users,
  MoreHorizontal,
} from 'lucide-react';
import { Expense } from '../types/index.ts';
import { apiRequest } from '../lib/api.ts';
import { formatCurrency, formatDateShort } from '../lib/formatters.ts';

const CATEGORY_CONFIG: Record<
  Expense['category'],
  { label: string; icon: any; color: string; bg: string }
> = {
  LOYER: { label: 'Loyer Commercial', icon: Home, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  ELECTRICITE: { label: 'Électricité & Énergie', icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  EAU: { label: 'Eau Courante', icon: Droplet, color: 'text-cyan-600', bg: 'bg-cyan-50 border-cyan-200' },
  INTERNET: { label: 'Internet Fibre & Télécom', icon: Wifi, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200' },
  TRANSPORT: { label: 'Transport & Logistique', icon: Truck, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  ENTRETIEN: { label: 'Entretien & Fournitures', icon: Wrench, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
  SALAIRES: { label: 'Salaires & Primes', icon: Users, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' },
  AUTRE: { label: 'Autres Charges', icon: MoreHorizontal, color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200' },
};

export const ExpensesView: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [categoryTotals, setCategoryTotals] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('TOUS');

  // Modal Ajout
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: 'LOYER' as Expense['category'],
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    description: '',
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadExpenses = async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest<{
        expenses: Expense[];
        totalAmount: number;
        categoryTotals: Record<string, number>;
      }>('/api/expenses', {
        params: { category: selectedCategory },
      });
      setExpenses(data.expenses);
      setTotalAmount(data.totalAmount);
      setCategoryTotals(data.categoryTotals || {});
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [selectedCategory]);

  const handleOpenAdd = () => {
    setFormData({
      title: '',
      category: 'LOYER',
      amount: '',
      expense_date: new Date().toISOString().split('T')[0],
      description: '',
    });
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    try {
      await apiRequest('/api/expenses', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setIsModalOpen(false);
      showToast(`Dépense « ${formData.title} » enregistrée avec succès.`);
      loadExpenses();
    } catch (err: any) {
      setErrorMessage(err.message || "Erreur lors de l'enregistrement.");
    }
  };

  const handleConfirmDelete = async () => {
    if (!expenseToDelete) return;
    setIsDeleting(true);

    try {
      await apiRequest(`/api/expenses/${expenseToDelete.id}`, { method: 'DELETE' });
      showToast(`Dépense « ${expenseToDelete.title} » supprimée.`);
      setExpenseToDelete(null);
      loadExpenses();
    } catch (err: any) {
      showToast(`Erreur : ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-2.5 sm:p-3.5 lg:p-4 space-y-2.5 sm:space-y-3 max-w-full mx-auto">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
            Gestion des Dépenses & Charges d'Exploitation
          </h2>
          <p className="text-xs text-slate-500">
            Suivi des coûts fixes et variables de FLASH-SHOP (Loyer, CIE, Fibre, Entretien...).
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-lg shadow-xs transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nouvelle Dépense</span>
        </button>
      </div>

      {/* Cartes Synthèse */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Dépenses Filtrées
          </span>
          <h3 className="text-xl font-extrabold text-slate-900 tabular-nums mt-0.5">
            {formatCurrency(totalAmount)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">{expenses.length} dépense(s) comptabilisée(s)</p>
        </div>

        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs sm:col-span-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
            Ventilation Principale des Postes
          </span>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(categoryTotals).map(([catKey, catAmt]) => {
              const cfg = CATEGORY_CONFIG[catKey as Expense['category']];
              if (!cfg || catAmt === 0) return null;
              const Icon = cfg.icon;

              return (
                <div
                  key={catKey}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-semibold ${cfg.bg}`}
                >
                  <Icon className={`w-3 h-3 ${cfg.color}`} />
                  <span className="text-slate-700">{cfg.label} :</span>
                  <span className="font-extrabold text-slate-900 tabular-nums">
                    {formatCurrency(catAmt)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filtres de catégorie */}
      <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs flex items-center gap-1.5 overflow-x-auto">
        <button
          onClick={() => setSelectedCategory('TOUS')}
          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-colors ${
            selectedCategory === 'TOUS'
              ? 'bg-[#0F2B59] text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Toutes les charges ({expenses.length})
        </button>
        {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setSelectedCategory(key)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === key
                ? 'bg-[#0F2B59] text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {cfg.label}
          </button>
        ))}
      </div>

      {/* Tableau des Dépenses */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-2 px-2.5 font-semibold text-[11px]">Date</th>
                <th className="py-2 px-2.5 font-semibold text-[11px]">Poste de Dépense</th>
                <th className="py-2 px-2.5 font-semibold text-[11px]">Description & Motif</th>
                <th className="py-2 px-2.5 font-semibold text-[11px] text-right">Montant Décaissé</th>
                <th className="py-2 px-2.5 font-semibold text-[11px]">Enregistré par</th>
                <th className="py-2 px-2.5 font-semibold text-[11px] text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400 text-xs">
                    Chargement des dépenses...
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400 text-xs">
                    Aucune dépense enregistrée dans cette catégorie.
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => {
                  const cfg = CATEGORY_CONFIG[exp.category];
                  const Icon = cfg?.icon || Wallet;

                  return (
                    <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2 px-2.5 text-slate-500 font-medium whitespace-nowrap text-[11px]">
                        {formatDateShort(exp.expense_date)}
                      </td>

                      <td className="py-2 px-2.5">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${cfg?.bg || 'bg-slate-100'}`}>
                            <Icon className={`w-3 h-3 ${cfg?.color || 'text-slate-600'}`} />
                          </div>
                          <span className="font-bold text-slate-900 text-xs">{exp.title}</span>
                        </div>
                      </td>

                      <td className="py-2 px-2.5 text-slate-600 max-w-sm truncate text-xs">
                        {exp.description || '—'}
                      </td>

                      <td className="py-2 px-2.5 text-right tabular-nums font-extrabold text-slate-900 text-xs">
                        {formatCurrency(exp.amount)}
                      </td>

                      <td className="py-2 px-2.5 text-slate-500 font-medium text-[11px]">
                        {exp.author_name || 'Admin'}
                      </td>

                      <td className="py-2 px-2.5 text-center">
                        <button
                          onClick={() => setExpenseToDelete(exp)}
                          className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Supprimer la dépense"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Ajout Dépense */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-[#0F2B59] text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Enregistrer une Dépense</h3>
                <p className="text-xs text-blue-200">
                  Déduction comptable des charges du magasin.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {errorMessage && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                  {errorMessage}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Intitulé de la Dépense *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="ex: Facture CIE Électricité Novembre"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Catégorie *
                  </label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                      <option key={key} value={key}>
                        {cfg.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Montant Décaissé (FCFA) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="500"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="ex: 50000"
                    className="w-full px-3 py-2 text-sm font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Date du Paiement *
                </label>
                <input
                  type="date"
                  required
                  value={formData.expense_date}
                  onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description & Justificatif
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="ex: Numéro de reçu, chèque ou nom du bénéficiaire..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
                >
                  Valider la Dépense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-slate-700">
          <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Modal In-App de Confirmation de Suppression de Dépense */}
      {expenseToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="font-extrabold text-base text-slate-900">
                Supprimer la Dépense
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Êtes-vous sûr de vouloir supprimer la charge{' '}
                <strong className="text-slate-900">« {expenseToDelete.title} »</strong> d'un montant de{' '}
                <strong className="text-rose-600 font-bold">{formatCurrency(expenseToDelete.amount)}</strong> ?
              </p>
              <p className="text-[11px] text-slate-400 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                Cette charge sera déduite du calcul des dépenses du magasin.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setExpenseToDelete(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors flex-1"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors shadow-sm flex-1 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Suppression...' : 'Supprimer Définitivement'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
