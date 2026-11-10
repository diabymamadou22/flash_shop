import React, { useState, useEffect } from 'react';
import { FolderTree, Plus, Edit2, Trash2, X, AlertTriangle, Package } from 'lucide-react';
import { Category } from '../types/index.ts';
import { apiRequest } from '../lib/api.ts';

export const CategoriesView: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal d'interdiction de suppression
  const [blockedDeleteCategory, setBlockedDeleteCategory] = useState<Category | null>(null);

  const loadCategories = async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest<Category[]>('/api/categories');
      setCategories(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [deleteForceCascade, setDeleteForceCascade] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setFormData({ name: '', description: '' });
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(cat);
    setFormData({ name: cat.name, description: cat.description || '' });
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    try {
      if (editingCategory) {
        await apiRequest(`/api/categories/${editingCategory.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
        showToast(`Catégorie « ${formData.name} » mise à jour avec succès.`);
      } else {
        await apiRequest('/api/categories', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
        showToast(`Catégorie « ${formData.name} » créée avec succès.`);
      }
      setIsModalOpen(false);
      loadCategories();
    } catch (err: any) {
      setErrorMessage(err.message || "Erreur lors de l'enregistrement.");
    }
  };

  const handleDeleteClick = (cat: Category) => {
    setCategoryToDelete(cat);
    setDeleteForceCascade(false);
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;
    setIsDeleting(true);

    try {
      const url = deleteForceCascade
        ? `/api/categories/${categoryToDelete.id}?force=true`
        : `/api/categories/${categoryToDelete.id}`;
      await apiRequest(url, { method: 'DELETE' });
      showToast(`Catégorie « ${categoryToDelete.name} » supprimée avec succès.`);
      setCategoryToDelete(null);
      loadCategories();
    } catch (err: any) {
      showToast(`Erreur : ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Gestion des Catégories de Matériels
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Organisez le catalogue électronique de FLASH-SHOP par familles de produits.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm rounded-lg shadow-sm transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvelle Catégorie</span>
        </button>
      </div>

      {/* Liste des catégories sous forme de grille et tableau */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
            <tr>
              <th className="py-3 px-4 font-semibold">Nom de la Catégorie</th>
              <th className="py-3 px-4 font-semibold">Description</th>
              <th className="py-3 px-4 font-semibold text-center">Produits Rattachés</th>
              <th className="py-3 px-4 font-semibold text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-400">
                  Chargement des catégories...
                </td>
              </tr>
            ) : categories.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-400">
                  Aucune catégorie configurée.
                </td>
              </tr>
            ) : (
              categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                        <FolderTree className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-slate-900 text-sm">{cat.name}</span>
                    </div>
                  </td>

                  <td className="py-3 px-4 text-slate-500 max-w-md truncate">
                    {cat.description || '—'}
                  </td>

                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold tabular-nums ${
                        (cat.product_count || 0) > 0
                          ? 'bg-blue-50 text-blue-800'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <Package className="w-3 h-3" />
                      <span>{cat.product_count || 0} produit{(cat.product_count || 0) !== 1 ? 's' : ''}</span>
                    </span>
                  </td>

                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(cat)}
                        className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-blue-700 transition-colors"
                        title="Modifier"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(cat)}
                        className="p-1.5 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Ajout / Modification */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-[#0F2B59] text-white p-5 flex items-center justify-between">
              <h3 className="font-bold text-base">
                {editingCategory ? 'Modifier la Catégorie' : 'Nouvelle Catégorie'}
              </h3>
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
                  Nom de la Catégorie *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="ex: Smartphones & Tablettes"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="ex: Appareils mobiles sous Android et iOS, tablettes tactiles professionnelles"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
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
                  Enregistrer
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

      {/* Modal In-App de Confirmation de Suppression de Catégorie (sans window.confirm) */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="font-extrabold text-base text-slate-900">
                Supprimer la Catégorie
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Êtes-vous sûr de vouloir supprimer la catégorie{' '}
                <strong className="text-slate-900">« {categoryToDelete.name} »</strong> ?
              </p>

              {(categoryToDelete.product_count || 0) > 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-left space-y-2.5">
                  <p className="text-xs text-amber-900 font-semibold">
                    ⚠️ Cette catégorie contient actuellement{' '}
                    <strong className="font-bold text-rose-700">{categoryToDelete.product_count} produit(s)</strong>.
                  </p>
                  <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={deleteForceCascade}
                      onChange={(e) => setDeleteForceCascade(e.target.checked)}
                      className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
                    />
                    <span>
                      Supprimer également tous les <strong className="font-bold">{categoryToDelete.product_count} produit(s)</strong> associés à cette famille.
                    </span>
                  </label>
                </div>
              ) : (
                <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  Cette catégorie est vide (0 produit). Sa suppression est immédiate.
                </p>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors flex-1"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isDeleting || ((categoryToDelete.product_count || 0) > 0 && !deleteForceCascade)}
                onClick={handleConfirmDelete}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition-colors shadow-sm flex-1 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Suppression...' : 'Supprimer'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
