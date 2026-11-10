import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  AlertTriangle,
  FolderTree,
  History,
  CheckCircle2,
  X,
  TrendingUp,
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { Product, Category, StockMovement } from '../types/index.ts';
import { apiRequest } from '../lib/api.ts';
import { formatCurrency, formatDate } from '../lib/formatters.ts';

type ProductTab = 'catalog' | 'categories' | 'alerts' | 'history';

export const ProductsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ProductTab>('catalog');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filtres Catalogue
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Modal Produit
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    reference: '',
    category_id: '',
    image_url: '',
    buy_price: '',
    sell_price: '',
    quantity: '10',
    alert_threshold: '5',
    description: '',
  });

  // Modal Réapprovisionnement Rapide
  const [quickRestockProduct, setQuickRestockProduct] = useState<Product | null>(null);
  const [quickRestockAmount, setQuickRestockAmount] = useState('5');
  const [quickRestockReason, setQuickRestockReason] = useState('Arrivage fournisseur');

  // Modal Suppression Produit (Sans window.confirm)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);

  // Modal Suppression Catégorie (Sans window.confirm)
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [forceDeleteCategory, setForceDeleteCategory] = useState(true);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);

  // Modal Catégorie (Ajout/Edition)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const notifySuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const notifyError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 4000);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [prods, cats] = await Promise.all([
        apiRequest<Product[]>('/api/products', {
          params: { search, category_id: selectedCategory },
        }),
        apiRequest<Category[]>('/api/categories'),
      ]);
      setProducts(prods);
      setCategories(cats);

      if (activeTab === 'history') {
        const movs = await apiRequest<StockMovement[]>('/api/stock/movements');
        setMovements(movs);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, selectedCategory, activeTab]);

  // Ouvrir modal ajout produit
  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      reference: `REF-${Math.floor(100000 + Math.random() * 900000)}`,
      category_id: categories[0]?.id ? String(categories[0].id) : '',
      image_url: '',
      buy_price: '',
      sell_price: '',
      quantity: '10',
      alert_threshold: '5',
      description: '',
    });
    setErrorMessage(null);
    setIsProductModalOpen(true);
  };

  // Ouvrir modal modification produit
  const handleOpenEditProduct = (p: Product) => {
    setEditingProduct(p);
    setProductForm({
      name: p.name,
      reference: p.reference,
      category_id: String(p.category_id),
      image_url: p.image_url || '',
      buy_price: String(p.buy_price),
      sell_price: String(p.sell_price),
      quantity: String(p.quantity),
      alert_threshold: String(p.alert_threshold),
      description: p.description || '',
    });
    setErrorMessage(null);
    setIsProductModalOpen(true);
  };

  // Soumission formulaire produit
  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    try {
      if (editingProduct) {
        await apiRequest(`/api/products/${editingProduct.id}`, {
          method: 'PUT',
          body: JSON.stringify(productForm),
        });
        notifySuccess('Produit modifié avec succès !');
      } else {
        await apiRequest('/api/products', {
          method: 'POST',
          body: JSON.stringify(productForm),
        });
        notifySuccess('Produit créé avec succès !');
      }

      setIsProductModalOpen(false);
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Erreur lors de l'enregistrement du produit.");
    }
  };

  // Confirmation de suppression produit par Modal In-App
  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    setIsDeletingProduct(true);
    try {
      await apiRequest(`/api/products/${productToDelete.id}`, { method: 'DELETE' });
      notifySuccess(`Le produit "${productToDelete.name}" a été supprimé.`);
      setProductToDelete(null);
      loadData();
    } catch (err: any) {
      notifyError(err.message || 'Erreur lors de la suppression.');
    } finally {
      setIsDeletingProduct(false);
    }
  };

  // Réapprovisionnement rapide (+ stock)
  const handleExecuteQuickRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickRestockProduct) return;

    const amount = Number(quickRestockAmount);
    if (!amount || amount <= 0) {
      notifyError('Veuillez saisir une quantité positive.');
      return;
    }

    try {
      await apiRequest(`/api/products/${quickRestockProduct.id}/adjust-stock`, {
        method: 'POST',
        body: JSON.stringify({
          delta: amount,
          reason: quickRestockReason.trim() || `Réapprovisionnement (+${amount})`,
        }),
      });

      notifySuccess(`+${amount} unité(s) ajoutée(s) à "${quickRestockProduct.name}" !`);
      setQuickRestockProduct(null);
      loadData();
    } catch (err: any) {
      notifyError(err.message);
    }
  };

  // Catégories
  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCategoryForm({ name: '', description: '' });
    setErrorMessage(null);
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (c: Category) => {
    setEditingCategory(c);
    setCategoryForm({ name: c.name, description: c.description || '' });
    setErrorMessage(null);
    setIsCategoryModalOpen(true);
  };

  const handleSubmitCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    try {
      if (editingCategory) {
        await apiRequest(`/api/categories/${editingCategory.id}`, {
          method: 'PUT',
          body: JSON.stringify(categoryForm),
        });
        notifySuccess('Catégorie modifiée.');
      } else {
        await apiRequest('/api/categories', {
          method: 'POST',
          body: JSON.stringify(categoryForm),
        });
        notifySuccess('Catégorie créée.');
      }
      setIsCategoryModalOpen(false);
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Erreur lors de l'enregistrement.");
    }
  };

  // Confirmation de suppression catégorie par Modal In-App
  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    setIsDeletingCategory(true);
    try {
      await apiRequest(`/api/categories/${categoryToDelete.id}?force=${forceDeleteCategory}`, {
        method: 'DELETE',
      });
      notifySuccess(`La catégorie "${categoryToDelete.name}" a été supprimée.`);
      setCategoryToDelete(null);
      loadData();
    } catch (err: any) {
      notifyError(err.message);
    } finally {
      setIsDeletingCategory(false);
    }
  };

  // Calcul marge formulaire
  const buyNum = Number(productForm.buy_price) || 0;
  const sellNum = Number(productForm.sell_price) || 0;
  const unitMargin = sellNum - buyNum;
  const marginRate = sellNum > 0 ? ((unitMargin / sellNum) * 100).toFixed(1) : '0';

  // Produits en alerte
  const alertProducts = products.filter((p) => p.quantity <= p.alert_threshold);

  return (
    <div className="p-2.5 sm:p-3.5 lg:p-4 space-y-2.5 sm:space-y-3 max-w-full">
      {/* Toast Notification Succès */}
      {successMessage && (
        <div className="fixed top-16 right-4 z-50 bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-md flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Toast Notification Erreur */}
      {errorMessage && (
        <div className="fixed top-16 right-4 z-50 bg-rose-600 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-md flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* En-tête avec Boutons d'Action compacts */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-0.5">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
            Produits & Gestion des Stocks
          </h2>
          <p className="text-[11px] text-slate-500">
            Catalogue, réapprovisionnement direct et familles d'articles.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'categories' ? (
            <button
              onClick={handleOpenAddCategory}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nouvelle Catégorie</span>
            </button>
          ) : (
            <button
              onClick={handleOpenAddProduct}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nouveau Produit</span>
            </button>
          )}
        </div>
      </div>

      {/* Onglets Intégrés Ultra-Compacts */}
      <div className="flex items-center gap-1 p-1 bg-slate-200/80 rounded-lg overflow-x-auto">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'catalog'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Catalogue ({products.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'alerts'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
          <span>Alertes Stocks ({alertProducts.length})</span>
          {alertProducts.length > 0 && (
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'categories'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FolderTree className="w-3.5 h-3.5 text-blue-600" />
          <span>Catégories ({categories.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'history'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <History className="w-3.5 h-3.5 text-slate-500" />
          <span>Historique Mouvements</span>
        </button>
      </div>

      {/* VUE 1 : CATALOGUE PRINCIPAL */}
      {activeTab === 'catalog' && (
        <div className="space-y-2.5">
          {/* Recherche & Filtre Catégorie Compacts */}
          <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center gap-2">
            <div className="relative flex-1 w-full">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par désignation ou référence (ex: XPS, S24, ANC)..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 text-slate-700 w-full sm:w-auto"
            >
              <option value="">Toutes les catégories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tableau des Produits Compact */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="py-2 px-2.5 font-semibold">Produit & Réf</th>
                    <th className="py-2 px-2.5 font-semibold">Catégorie</th>
                    <th className="py-2 px-2.5 font-semibold text-right">Prix d'Achat</th>
                    <th className="py-2 px-2.5 font-semibold text-right">Prix de Vente</th>
                    <th className="py-2 px-2.5 font-semibold text-right">Marge</th>
                    <th className="py-2 px-2.5 font-semibold text-center">Stock</th>
                    <th className="py-2 px-2.5 font-semibold text-center">+ Stock</th>
                    <th className="py-2 px-2.5 font-semibold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        Chargement des articles...
                      </td>
                    </tr>
                  ) : products.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        Aucun produit dans le catalogue. Cliquez sur « Nouveau Produit » pour en ajouter un.
                      </td>
                    </tr>
                  ) : (
                    products.map((p) => {
                      const isOutOfStock = p.quantity <= 0;
                      const isLow = p.quantity <= p.alert_threshold && !isOutOfStock;

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2 px-2.5">
                            <div className="truncate max-w-[240px]">
                              <span className="font-mono text-[9px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-bold inline-block mb-0.5">
                                {p.reference}
                              </span>
                              <span className="font-bold text-slate-900 truncate block text-xs">
                                {p.name}
                              </span>
                            </div>
                          </td>

                          <td className="py-2 px-2.5 text-slate-600 font-medium text-xs">
                            {p.category_name || 'Général'}
                          </td>

                          <td className="py-2 px-2.5 text-right tabular-nums text-slate-500 font-medium text-xs">
                            {formatCurrency(p.buy_price)}
                          </td>

                          <td className="py-2 px-2.5 text-right tabular-nums font-bold text-slate-900 text-xs">
                            {formatCurrency(p.sell_price)}
                          </td>

                          <td className="py-2 px-2.5 text-right tabular-nums text-xs">
                            <span className="font-semibold text-emerald-700">
                              {formatCurrency(p.gross_margin)}
                            </span>
                          </td>

                          <td className="py-2 px-2.5 text-center">
                            <span
                              className={`inline-flex items-center px-1.5 py-0.5 rounded-sm font-bold text-[11px] tabular-nums ${
                                isOutOfStock
                                  ? 'bg-rose-100 text-rose-700'
                                  : isLow
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-50 text-emerald-800'
                              }`}
                            >
                              {p.quantity} en stock
                            </span>
                          </td>

                          {/* Bouton Réapprovisionnement Rapide 1-Clic */}
                          <td className="py-2 px-2.5 text-center">
                            <button
                              onClick={() => {
                                setQuickRestockProduct(p);
                                setQuickRestockAmount('5');
                              }}
                              className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold rounded transition-colors inline-flex items-center gap-1 border border-blue-200 cursor-pointer"
                              title="Ajouter du stock immédiatement"
                            >
                              <Plus className="w-3 h-3" />
                              <span>+ Stock</span>
                            </button>
                          </td>

                          {/* Actions Modifier & Supprimer Fonctionnelles */}
                          <td className="py-2 px-2.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleOpenEditProduct(p)}
                                className="p-1 rounded hover:bg-slate-100 text-slate-600 hover:text-blue-700 transition-colors cursor-pointer"
                                title="Modifier"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setProductToDelete(p)}
                                className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                title="Supprimer définitivement"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VUE 2 : ALERTES DE STOCK */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <p className="font-bold">
                  {alertProducts.length} article(s) sous le seuil d'alerte ou en rupture
                </p>
                <p className="text-amber-700">Cliquez sur « Réapprovisionner » pour ajuster le stock immédiatement.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {alertProducts.map((p) => (
              <div
                key={p.id}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <span className="text-[10px] font-mono text-slate-400 block truncate">
                    {p.reference}
                  </span>
                  <h4 className="font-bold text-slate-900 text-sm mt-0.5 truncate">{p.name}</h4>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Stock actuel :</span>
                    <span
                      className={`font-extrabold tabular-nums px-2 py-0.5 rounded-sm ${
                        p.quantity <= 0 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {p.quantity <= 0 ? 'RUPTURE (0)' : `${p.quantity} unités`}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
                    <span>Seuil d'alerte configuré :</span>
                    <span className="tabular-nums">{p.alert_threshold}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs tabular-nums">
                    {formatCurrency(p.sell_price)}
                  </span>
                  <button
                    onClick={() => {
                      setQuickRestockProduct(p);
                      setQuickRestockAmount('10');
                    }}
                    className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Réapprovisionner</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VUE 3 : GESTION DES CATÉGORIES */}
      {activeTab === 'categories' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px]">
              <tr>
                <th className="py-2 px-2.5 font-semibold">Nom de la Catégorie</th>
                <th className="py-2 px-2.5 font-semibold">Description</th>
                <th className="py-2 px-2.5 font-semibold text-center">Articles Associés</th>
                <th className="py-2 px-2.5 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2 px-2.5 font-bold text-slate-900 text-xs">
                    {cat.name}
                  </td>
                  <td className="py-2 px-2.5 text-slate-500 text-xs">{cat.description || '—'}</td>
                  <td className="py-2 px-2.5 text-center text-xs">
                    <span className="font-bold text-blue-900 tabular-nums">
                      {cat.product_count || 0} produit(s)
                    </span>
                  </td>
                  <td className="py-2 px-2.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleOpenEditCategory(cat)}
                        className="p-1 rounded hover:bg-slate-100 text-slate-600 hover:text-blue-700 cursor-pointer"
                        title="Modifier"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setCategoryToDelete(cat)}
                        className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer"
                        title="Supprimer la catégorie"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* VUE 4 : HISTORIQUE DES MOUVEMENTS */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px]">
              <tr>
                <th className="py-2 px-2.5 font-semibold">Date & Heure</th>
                <th className="py-2 px-2.5 font-semibold">Type</th>
                <th className="py-2 px-2.5 font-semibold">Produit</th>
                <th className="py-2 px-2.5 font-semibold text-center">Variation</th>
                <th className="py-2 px-2.5 font-semibold text-center">Nouveau Stock</th>
                <th className="py-2 px-2.5 font-semibold">Motif</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {movements.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2 px-2.5 text-slate-500 whitespace-nowrap text-xs">{formatDate(m.created_at)}</td>
                  <td className="py-2 px-2.5 font-bold text-xs">
                    {m.type === 'ENTREE' ? (
                      <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-sm">Entrée</span>
                    ) : m.type === 'SORTIE' ? (
                      <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-sm">Sortie</span>
                    ) : m.type === 'VENTE' ? (
                      <span className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-sm">Vente Caisse</span>
                    ) : (
                      <span className="text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded-sm">Correction</span>
                    )}
                  </td>
                  <td className="py-2 px-2.5 font-semibold text-slate-900 text-xs">{m.product_name}</td>
                  <td className="py-2 px-2.5 text-center tabular-nums font-bold text-xs">
                    {m.type === 'ENTREE' ? `+${m.quantity}` : m.type === 'SORTIE' || m.type === 'VENTE' ? `-${m.quantity}` : m.quantity}
                  </td>
                  <td className="py-2 px-2.5 text-center tabular-nums font-extrabold text-blue-900 text-xs">
                    {m.new_stock}
                  </td>
                  <td className="py-2 px-2.5 text-slate-600 text-xs">{m.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL IN-APP DE SUPPRESSION DE PRODUIT (REMPLACE WINDOW.CONFIRM) */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="font-extrabold text-base text-slate-900">
                Supprimer ce Produit ?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Êtes-vous sûr de vouloir supprimer définitivement l'article :
              </p>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-left text-xs">
                <p className="font-bold text-slate-900">{productToDelete.name}</p>
                <p className="text-slate-500 font-mono text-[11px] mt-0.5">
                  Réf : {productToDelete.reference} · Stock : {productToDelete.quantity} unité(s)
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmDeleteProduct}
                disabled={isDeletingProduct}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isDeletingProduct ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Oui, Supprimer</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL IN-APP DE SUPPRESSION DE CATÉGORIE (REMPLACE WINDOW.CONFIRM) */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="font-extrabold text-base text-slate-900">
                Supprimer la Catégorie ?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Confirmez-vous la suppression de la catégorie <strong className="text-slate-900">« {categoryToDelete.name} »</strong> ?
              </p>

              {(categoryToDelete.product_count || 0) > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-left text-xs space-y-2 text-amber-900">
                  <p className="font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Cette catégorie contient {categoryToDelete.product_count} produit(s).</span>
                  </p>
                  <label className="flex items-center gap-2 font-medium cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={forceDeleteCategory}
                      onChange={(e) => setForceDeleteCategory(e.target.checked)}
                      className="rounded text-rose-600 focus:ring-rose-500"
                    />
                    <span className="text-[11px] text-slate-800">
                      Supprimer également les produits rattachés
                    </span>
                  </label>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmDeleteCategory}
                disabled={isDeletingCategory}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isDeletingCategory ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Oui, Supprimer</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RÉAPPROVISIONNEMENT RAPIDE */}
      {quickRestockProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-[#0F2B59] text-white p-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Ajouter du Stock</h3>
                <p className="text-[11px] text-blue-200 truncate max-w-[240px]">
                  {quickRestockProduct.name}
                </p>
              </div>
              <button
                onClick={() => setQuickRestockProduct(null)}
                className="p-1 text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteQuickRestock} className="p-5 space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg text-xs flex justify-between">
                <span className="text-slate-600">Stock actuel :</span>
                <span className="font-extrabold text-blue-900 tabular-nums">
                  {quickRestockProduct.quantity} unité(s)
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Quantité à ajouter *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    required
                    min="1"
                    value={quickRestockAmount}
                    onChange={(e) => setQuickRestockAmount(e.target.value)}
                    className="w-full px-3 py-2 text-base font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none tabular-nums text-center"
                  />
                  {[5, 10, 20].map((quick) => (
                    <button
                      key={quick}
                      type="button"
                      onClick={() => setQuickRestockAmount(String(quick))}
                      className="px-2.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors shrink-0 cursor-pointer"
                    >
                      +{quick}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Motif
                </label>
                <input
                  type="text"
                  value={quickRestockReason}
                  onChange={(e) => setQuickRestockReason(e.target.value)}
                  placeholder="ex: Arrivage fournisseur"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setQuickRestockProduct(null)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-lg shadow-sm cursor-pointer"
                >
                  Confirmer l'ajout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CRÉATION / MODIFICATION PRODUIT */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-8">
            <div className="bg-[#0F2B59] text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">
                  {editingProduct ? 'Modifier le Produit' : 'Nouveau Produit'}
                </h3>
                <p className="text-xs text-blue-200">
                  Remplissez simplement les informations principales.
                </p>
              </div>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="p-1 text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitProduct} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {errorMessage && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                  {errorMessage}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nom / Désignation de l'Article *
                </label>
                <input
                  type="text"
                  required
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="ex: Clé USB SanDisk 64GB"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Catégorie *
                  </label>
                  <select
                    required
                    value={productForm.category_id}
                    onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    <option value="">Sélectionner</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Référence (Auto-générée)
                  </label>
                  <input
                    type="text"
                    value={productForm.reference}
                    onChange={(e) => setProductForm({ ...productForm, reference: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none uppercase"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Prix d'Achat (FCFA) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="500"
                      value={productForm.buy_price}
                      onChange={(e) => setProductForm({ ...productForm, buy_price: e.target.value })}
                      placeholder="ex: 15000"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Prix de Vente Client (FCFA) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="500"
                      value={productForm.sell_price}
                      onChange={(e) => setProductForm({ ...productForm, sell_price: e.target.value })}
                      placeholder="ex: 25000"
                      className="w-full px-3 py-2 text-sm font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none tabular-nums"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-600">Bénéfice estimé par vente :</span>
                  <span className="font-extrabold text-emerald-700 tabular-nums">
                    {formatCurrency(unitMargin)} ({marginRate}%)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {!editingProduct && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Quantité Initiale *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={productForm.quantity}
                      onChange={(e) => setProductForm({ ...productForm, quantity: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none tabular-nums"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Seuil d'Alerte Stock Faible *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={productForm.alert_threshold}
                    onChange={(e) => setProductForm({ ...productForm, alert_threshold: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none tabular-nums"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer"
                >
                  {editingProduct ? 'Enregistrer' : 'Créer le Produit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CRÉATION / MODIFICATION CATÉGORIE */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-[#0F2B59] text-white p-5 flex items-center justify-between">
              <h3 className="font-bold text-base">
                {editingCategory ? 'Modifier la Catégorie' : 'Nouvelle Catégorie'}
              </h3>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1 text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCategory} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nom de la Famille / Catégorie *
                </label>
                <input
                  type="text"
                  required
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  placeholder="ex: Téléviseurs & Écrans"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  placeholder="ex: Écrans Smart TV, 4K, accessoires de fixation..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
