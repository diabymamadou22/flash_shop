import React, { useState, useEffect } from 'react';
import {
  Save,
  CheckCircle,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Receipt,
  AlertCircle,
} from 'lucide-react';
import { ShopSettings } from '../types/index.ts';
import { apiRequest } from '../lib/api.ts';

type PurgeScope = 'all' | 'sales' | 'expenses' | 'products' | 'demo_seed';

export const SettingsView: React.FC = () => {
  const [settings, setSettings] = useState<ShopSettings>({
    id: 1,
    shop_name: 'FLASH-SHOP',
    shop_tagline: 'Vente de Matériels Électroniques & Accessoires High-Tech',
    phone: '+225 07 88 99 00 11',
    email: 'contact@flash-shop.ci',
    address: "Boulevard Giscard d'Estaing, Zone 4",
    city: 'Abidjan',
    currency: 'FCFA',
    receipt_footer: 'Merci de votre visite ! Matériels électroniques garantis 12 mois.',
    tax_rate: 0,
  });

  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Modal de confirmation de purge
  const [purgeScope, setPurgeScope] = useState<PurgeScope | null>(null);
  const [isPurging, setIsPurging] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const settData = await apiRequest<ShopSettings>('/api/settings');
      setSettings(settData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    try {
      await apiRequest('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      setIsSaved(true);
      showToast('Paramètres de la boutique enregistrés avec succès.');
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err: any) {
      setSaveError(err.message || 'Erreur lors de la sauvegarde.');
    }
  };

  const handleExecutePurge = async () => {
    if (!purgeScope) return;
    setIsPurging(true);

    try {
      const res = await apiRequest<{ message: string }>('/api/settings/purge-data', {
        method: 'POST',
        body: JSON.stringify({ scope: purgeScope }),
      });

      let successMsg = res.message || 'Opération effectuée avec succès.';
      if (purgeScope === 'all') successMsg = 'Toutes les données ont été effacées avec succès.';
      if (purgeScope === 'sales') successMsg = 'Historique des ventes et tickets supprimé.';
      if (purgeScope === 'products') successMsg = 'Articles et mouvements de stock supprimés.';
      if (purgeScope === 'expenses') successMsg = 'Toutes les charges et dépenses ont été supprimées.';
      if (purgeScope === 'demo_seed') successMsg = 'Données de démonstration chargées avec succès !';

      showToast(successMsg);
      setPurgeScope(null);
      await loadData();
    } catch (err: any) {
      showToast(`Erreur : ${err.message}`);
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <div className="p-2.5 sm:p-3.5 lg:p-4 space-y-2.5 sm:space-y-3 max-w-5xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 bg-slate-900 text-white px-3 py-2 rounded-lg shadow-xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></div>
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
            Paramètres de la Boutique
          </h2>
          <p className="text-xs text-slate-500">
            Coordonnées de l'entreprise, informations de contact et pied de ticket.
          </p>
        </div>
      </div>

      {/* INFORMATIONS DE LA BOUTIQUE */}
      <form onSubmit={handleSaveSettings} className="bg-white rounded-lg border border-slate-200 shadow-2xs p-4 sm:p-5 space-y-4">
          <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Identité Commerciale & Documents</h3>
              <p className="text-xs text-slate-500">Ces informations figurent sur les tickets de caisse et factures PDF.</p>
            </div>
            {isSaved && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-md">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Paramètres enregistrés</span>
              </span>
            )}
          </div>

          {saveError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nom de la Boutique *
              </label>
              <input
                type="text"
                required
                value={settings.shop_name}
                onChange={(e) => setSettings({ ...settings, shop_name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Slogan Commercial
              </label>
              <input
                type="text"
                value={settings.shop_tagline}
                onChange={(e) => setSettings({ ...settings, shop_tagline: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Numéro de Téléphone / WhatsApp
              </label>
              <input
                type="text"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Adresse Email Professionnelle
              </label>
              <input
                type="email"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Adresse Physique du Magasin
              </label>
              <input
                type="text"
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ville & Pays
              </label>
              <input
                type="text"
                value={settings.city}
                onChange={(e) => setSettings({ ...settings, city: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Devise Monétaire
              </label>
              <input
                type="text"
                value={settings.currency}
                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none font-bold text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mention Légale & Pied de Page du Ticket de Caisse
            </label>
            <textarea
              rows={2}
              value={settings.receipt_footer}
              onChange={(e) => setSettings({ ...settings, receipt_footer: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm rounded-lg shadow-sm transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Enregistrer les Paramètres</span>
            </button>
          </div>
        </form>

      {/* Zone Réinitialisation des Données (Accessible sans sous-onglets) */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Trash2 className="w-4 h-4 text-rose-600" />
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Gestion des Données de Test & Remise à Zéro</h3>
            <p className="text-[11px] text-slate-500">Effacer les enregistrements de test ou restaurer des articles types.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => setPurgeScope('all')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Remise à Zéro Totale (Tout Effacer)</span>
          </button>

          <button
            type="button"
            onClick={() => setPurgeScope('sales')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition-colors"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Vider Uniquement les Ventes</span>
          </button>

          <button
            type="button"
            onClick={() => setPurgeScope('demo_seed')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Restaurer Catalogue de Démo</span>
          </button>
        </div>
      </div>

      {/* MODAL IN-APP DE CONFIRMATION DE SUPPRESSION / PURGE (AUCUN window.confirm) */}
      {purgeScope && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${
                purgeScope === 'demo_seed'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-rose-100 text-rose-600'
              }`}
            >
              {purgeScope === 'demo_seed' ? (
                <RefreshCw className="w-6 h-6" />
              ) : (
                <AlertTriangle className="w-6 h-6" />
              )}
            </div>

            <div className="text-center space-y-2">
              <h3 className="font-extrabold text-base text-slate-900">
                {purgeScope === 'all' && 'Confirmation de Remise à Zéro Totale'}
                {purgeScope === 'sales' && 'Supprimer Toutes les Ventes'}
                {purgeScope === 'products' && 'Supprimer Tous les Produits & Stocks'}
                {purgeScope === 'expenses' && 'Supprimer Toutes les Dépenses'}
                {purgeScope === 'demo_seed' && 'Recharger les Données de Démonstration'}
              </h3>

              <div className="text-xs text-slate-600 leading-relaxed space-y-2">
                {purgeScope === 'all' && (
                  <p className="bg-rose-50 text-rose-800 p-3 rounded-lg border border-rose-200 font-semibold text-left">
                    ⚠️ Attention : Vous êtes sur le point de SUPPRIMER TOUT LE CONTENU du système : l'ensemble des ventes, tous les produits, mouvements de stock et dépenses enregistrées. Cette action est irréversible.
                  </p>
                )}

                {purgeScope === 'sales' && (
                  <p className="bg-amber-50 text-amber-900 p-3 rounded-lg border border-amber-200 text-left">
                    Tous les tickets et lignes de ventes seront effacés. Le catalogue de produits et les quantités en stock seront conservés.
                  </p>
                )}

                {purgeScope === 'products' && (
                  <p className="bg-indigo-50 text-indigo-900 p-3 rounded-lg border border-indigo-200 text-left">
                    Tous les articles du catalogue et l'historique des entrées/sorties de stock seront supprimés.
                  </p>
                )}

                {purgeScope === 'expenses' && (
                  <p className="bg-slate-100 text-slate-800 p-3 rounded-lg border border-slate-200 text-left">
                    Toutes les lignes de dépenses et justificatifs de charges seront définitivement purgés.
                  </p>
                )}

                {purgeScope === 'demo_seed' && (
                  <p className="bg-blue-50 text-blue-800 p-3 rounded-lg border border-blue-200 text-left">
                    Le catalogue sera réinitialisé avec des produits high-tech de démonstration complets (smartphones, ordinateurs, audio, chargeurs) et des charges types.
                  </p>
                )}

                <p className="text-[11px] text-slate-400">
                  Cliquez ci-dessous pour exécuter l'opération immédiatement.
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setPurgeScope(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors flex-1"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isPurging}
                onClick={handleExecutePurge}
                className={`px-4 py-2.5 text-white text-xs font-bold rounded-lg transition-colors shadow-sm flex-1 flex items-center justify-center gap-1.5 ${
                  purgeScope === 'demo_seed'
                    ? 'bg-blue-800 hover:bg-blue-900 disabled:opacity-50'
                    : 'bg-rose-600 hover:bg-rose-700 disabled:opacity-50'
                }`}
              >
                {purgeScope === 'demo_seed' ? (
                  <RefreshCw className={`w-3.5 h-3.5 ${isPurging ? 'animate-spin' : ''}`} />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{isPurging ? 'Exécution en cours...' : 'Confirmer Définitivement'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
