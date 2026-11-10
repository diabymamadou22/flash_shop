import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  AlertTriangle,
  X,
  Package,
  History,
  CheckCircle,
  ShieldAlert,
} from 'lucide-react';
import { StockMovement, Product } from '../types/index.ts';
import { apiRequest } from '../lib/api.ts';
import { formatDate } from '../lib/formatters.ts';

export const StockView: React.FC = () => {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [alerts, setAlerts] = useState<Product[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState('TOUS');

  // Modal de mouvement
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'ENTREE' | 'SORTIE' | 'CORRECTION'>('ENTREE');
  const [selectedProductId, setSelectedProductId] = useState<number | ''>('');
  const [movementQty, setMovementQty] = useState('');
  const [movementReason, setMovementReason] = useState('');
  const [correctionTarget, setCorrectionTarget] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [movs, altProds, allProds] = await Promise.all([
        apiRequest<StockMovement[]>('/api/stock/movements', { params: { type: filterType } }),
        apiRequest<Product[]>('/api/stock/alerts'),
        apiRequest<Product[]>('/api/products'),
      ]);
      setMovements(movs);
      setAlerts(altProds);
      setProducts(allProds);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterType]);

  const handleOpenMovementModal = (
    type: 'ENTREE' | 'SORTIE' | 'CORRECTION' = 'ENTREE',
    productId?: number
  ) => {
    setModalType(type);
    setSelectedProductId(productId || (products[0]?.id || ''));
    setMovementQty('');
    setCorrectionTarget('');
    setMovementReason('');
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const selectedProduct = products.find((p) => p.id === Number(selectedProductId));

  const handleSubmitMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedProductId) {
      setErrorMessage('Veuillez sélectionner un produit.');
      return;
    }
    if (!movementReason.trim()) {
      setErrorMessage('Le motif de justification est obligatoire pour la traçabilité.');
      return;
    }

    try {
      await apiRequest('/api/stock/movement', {
        method: 'POST',
        body: JSON.stringify({
          product_id: Number(selectedProductId),
          type: modalType,
          quantity: movementQty,
          new_stock_target: correctionTarget,
          reason: movementReason,
        }),
      });

      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Erreur lors de l'enregistrement du mouvement.");
    }
  };

  const getTypeBadge = (type: StockMovement['type']) => {
    switch (type) {
      case 'ENTREE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ArrowDownLeft className="w-3 h-3" />
            <span>Entrée Stock</span>
          </span>
        );
      case 'SORTIE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <ArrowUpRight className="w-3 h-3" />
            <span>Sortie Stock</span>
          </span>
        );
      case 'CORRECTION':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <RefreshCw className="w-3 h-3" />
            <span>Correction Inventaire</span>
          </span>
        );
      case 'VENTE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <span>Vente Caisse</span>
          </span>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Mouvements & Traçabilité des Stocks
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Entrées fournisseurs, sorties, corrections d'inventaire et journal d'audit immuable.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenMovementModal('ENTREE')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0F2B59] hover:bg-blue-900 text-white font-bold text-xs rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Entrée Marchandise</span>
          </button>
          <button
            onClick={() => handleOpenMovementModal('CORRECTION')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors border border-slate-200"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Correction</span>
          </button>
        </div>
      </div>

      {/* Bannière des Alertes de Stock Faible */}
      {alerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h3 className="font-bold text-xs sm:text-sm text-amber-900">
                {alerts.length} Produit{alerts.length > 1 ? 's' : ''} en Seuil Critique de Réapprovisionnement
              </h3>
            </div>
            <span className="text-xs text-amber-700 font-semibold">Action requise</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {alerts.map((prod) => (
              <div
                key={prod.id}
                className="bg-white p-3 rounded-lg border border-amber-200 shadow-2xs flex items-center justify-between"
              >
                <div className="truncate pr-2">
                  <span className="text-[10px] font-mono text-slate-400 block truncate">
                    {prod.reference}
                  </span>
                  <p className="font-bold text-xs text-slate-900 truncate">{prod.name}</p>
                  <p className="text-[11px] text-amber-700 font-semibold tabular-nums">
                    {prod.quantity <= 0 ? 'RUPTURE (0 unité)' : `${prod.quantity} restants (seuil: ${prod.alert_threshold})`}
                  </p>
                </div>
                <button
                  onClick={() => handleOpenMovementModal('ENTREE', prod.id)}
                  className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold rounded-md whitespace-nowrap shrink-0 transition-colors"
                >
                  + Réappro
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Barre de Filtrage des mouvements */}
      <div className="flex items-center justify-between gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2 overflow-x-auto">
          {['TOUS', 'ENTREE', 'SORTIE', 'CORRECTION', 'VENTE'].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                filterType === t
                  ? 'bg-[#0F2B59] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t === 'TOUS' ? 'Tous les mouvements' : t}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-400 tabular-nums hidden sm:inline">
          {movements.length} opérations enregistrées
        </span>
      </div>

      {/* Tableau d'Audit des Mouvements */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold">Date & Heure</th>
                <th className="py-3 px-4 font-semibold">Type de Mouvement</th>
                <th className="py-3 px-4 font-semibold">Produit & Référence</th>
                <th className="py-3 px-4 font-semibold text-center">Quantité Mvt</th>
                <th className="py-3 px-4 font-semibold text-center">Ancien Stock</th>
                <th className="py-3 px-4 font-semibold text-center">Nouveau Stock</th>
                <th className="py-3 px-4 font-semibold">Motif / Justification</th>
                <th className="py-3 px-4 font-semibold">Opérateur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Chargement des mouvements de stock...
                  </td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Aucun mouvement de stock enregistré.
                  </td>
                </tr>
              ) : (
                movements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {formatDate(m.created_at)}
                    </td>
                    <td className="py-3 px-4">{getTypeBadge(m.type)}</td>
                    <td className="py-3 px-4">
                      <div className="truncate max-w-[200px]">
                        <span className="font-mono text-[10px] text-slate-400 block truncate">
                          {m.product_ref}
                        </span>
                        <span className="font-bold text-slate-800 truncate block">
                          {m.product_name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center tabular-nums font-bold text-slate-900">
                      {m.type === 'ENTREE' ? `+${m.quantity}` : m.type === 'SORTIE' || m.type === 'VENTE' ? `-${m.quantity}` : m.quantity}
                    </td>
                    <td className="py-3 px-4 text-center tabular-nums text-slate-500">
                      {m.previous_stock}
                    </td>
                    <td className="py-3 px-4 text-center tabular-nums font-extrabold text-blue-900">
                      {m.new_stock}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                      {m.reason}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-medium">
                      {m.user_name || 'Système'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nouveau Mouvement de Stock */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-[#0F2B59] text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Enregistrer un Mouvement de Stock</h3>
                <p className="text-xs text-blue-200">
                  Mise à jour immédiate des niveaux d'inventaire avec motif d'audit.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitMovement} className="p-6 space-y-4">
              {errorMessage && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                  {errorMessage}
                </div>
              )}

              {/* Sélection du type de mouvement */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Type d'Opération
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setModalType('ENTREE')}
                    className={`py-2 px-2 text-xs font-bold rounded-lg border transition-colors ${
                      modalType === 'ENTREE'
                        ? 'bg-emerald-500 text-white border-emerald-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    + Entrée
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalType('SORTIE')}
                    className={`py-2 px-2 text-xs font-bold rounded-lg border transition-colors ${
                      modalType === 'SORTIE'
                        ? 'bg-amber-500 text-white border-amber-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    - Sortie
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalType('CORRECTION')}
                    className={`py-2 px-2 text-xs font-bold rounded-lg border transition-colors ${
                      modalType === 'CORRECTION'
                        ? 'bg-purple-600 text-white border-purple-700'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Correction
                  </button>
                </div>
              </div>

              {/* Sélection du Produit */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Produit Concerné *
                </label>
                <select
                  required
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  <option value="">Sélectionnez un article</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.reference}] {p.name} — (Stock actuel : {p.quantity})
                    </option>
                  ))}
                </select>
              </div>

              {/* Indicateur Stock Actuel */}
              {selectedProduct && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs flex items-center justify-between">
                  <span className="text-slate-600">Niveau de stock actuel :</span>
                  <span className="font-extrabold text-blue-900 tabular-nums">
                    {selectedProduct.quantity} unité(s)
                  </span>
                </div>
              )}

              {/* Quantité ou Nouvelle cible */}
              {modalType === 'CORRECTION' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nouveau Stock Réel Corrigé *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={correctionTarget}
                    onChange={(e) => setCorrectionTarget(e.target.value)}
                    placeholder="ex: 12"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none tabular-nums"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Le système ajustera automatiquement l'écart d'inventaire.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {modalType === 'ENTREE' ? 'Quantité Reçue *' : 'Quantité à Sortir *'}
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={movementQty}
                    onChange={(e) => setMovementQty(e.target.value)}
                    placeholder="ex: 10"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none tabular-nums"
                  />
                  {modalType === 'SORTIE' && selectedProduct && (
                    <p className="text-[11px] text-amber-600 mt-1 flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Règle : Les stocks négatifs sont strictement interdits.</span>
                    </p>
                  )}
                </div>
              )}

              {/* Motif / Justification */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Motif / Justification du Mouvement *
                </label>
                <input
                  type="text"
                  required
                  value={movementReason}
                  onChange={(e) => setMovementReason(e.target.value)}
                  placeholder={
                    modalType === 'ENTREE'
                      ? 'ex: Arrivage fournisseur TechDistro BL-2026-99'
                      : modalType === 'SORTIE'
                      ? 'ex: Appareil défectueux retourné au fabricant'
                      : "ex: Écart d'inventaire physique mensuel"
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              {/* Boutons */}
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
                  Valider le Mouvement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
