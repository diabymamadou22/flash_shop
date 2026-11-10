import React, { useState, useEffect } from 'react';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CheckCircle,
  Coins,
  AlertTriangle,
  RotateCcw,
  Zap,
  Package,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Product, Category, Sale, SaleItem } from '../types/index.ts';
import { apiRequest } from '../lib/api.ts';
import { formatCurrency } from '../lib/formatters.ts';
import { ReceiptModal } from '../components/ReceiptModal.tsx';

interface CartItem {
  product: Product;
  quantity: number;
}

export const PosView: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [amountReceived, setAmountReceived] = useState<string>('');
  const [saleNotes, setSaleNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reçu de vente validée
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [completedItems, setCompletedItems] = useState<SaleItem[]>([]);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Chargement des produits et catégories
  const loadData = async () => {
    try {
      const [prods, cats] = await Promise.all([
        apiRequest<Product[]>('/api/products'),
        apiRequest<Category[]>('/api/categories'),
      ]);
      setProducts(prods);
      setCategories(cats);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtrage des produits avec insensibilité aux accents et à la casse
  const normalizeText = (text: string) =>
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  const filteredProducts = products.filter((p) => {
    const matchesCategory =
      selectedCategory === 'ALL' || p.category_id === selectedCategory;
    if (!searchQuery.trim()) return matchesCategory;

    const q = normalizeText(searchQuery);
    const nameNorm = normalizeText(p.name);
    const refNorm = normalizeText(p.reference);
    const descNorm = p.description ? normalizeText(p.description) : '';

    const matchesSearch =
      nameNorm.includes(q) || refNorm.includes(q) || descNorm.includes(q);

    return matchesCategory && matchesSearch;
  });

  // Calculs du panier
  const totalAmount = cart.reduce(
    (sum, item) => sum + item.product.sell_price * item.quantity,
    0
  );

  const amountReceivedNum = Number(amountReceived) || 0;
  const changeReturned = Math.max(0, amountReceivedNum - totalAmount);
  const remainingToPay = Math.max(0, totalAmount - amountReceivedNum);

  const showCartWarning = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 4000);
  };

  // Ajouter au panier
  const addToCart = (product: Product) => {
    if (product.quantity <= 0) return;

    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.quantity) {
          showCartWarning(`Stock maximum disponible atteint pour "${product.name}" (${product.quantity} unité(s)).`);
          return prevCart;
        }
        return prevCart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { product, quantity: 1 }];
    });
  };

  // Modifier la quantité
  const updateQuantity = (productId: number, delta: number) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > item.product.quantity) {
              showCartWarning(`Stock disponible insuffisant : seulement ${item.product.quantity} unité(s).`);
              return item;
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  // Supprimer un article
  const removeFromCart = (productId: number) => {
    setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId));
  };

  // Vider le panier
  const clearCart = () => {
    setCart([]);
    setAmountReceived('');
    setSaleNotes('');
    setErrorMessage(null);
  };

  // Raccourcis billets de banque (FCFA)
  const addCashShortcut = (value: number) => {
    const current = Number(amountReceived) || 0;
    setAmountReceived(String(current + value));
  };

  const setExactCash = () => {
    setAmountReceived(String(totalAmount));
  };

  // Validation de la vente
  const handleValidateSale = async () => {
    if (cart.length === 0) {
      setErrorMessage('Le panier est vide.');
      return;
    }
    if (amountReceivedNum < totalAmount) {
      setErrorMessage('Le montant reçu en espèces est insuffisant pour régler le total.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const payload = {
        items: cart.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
        })),
        amount_received: amountReceivedNum,
        notes: saleNotes,
      };

      const response = await apiRequest<{
        message: string;
        sale: {
          saleId: number;
          saleNumber: string;
          totalAmount: number;
          amountReceived: number;
          changeReturned: number;
          items: SaleItem[];
        };
      }>('/api/sales', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // Confetti de réussite
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });

      // Préparer les données pour le reçu imprimable
      const saleData: Sale = {
        id: response.sale.saleId,
        sale_number: response.sale.saleNumber,
        total_amount: response.sale.totalAmount,
        amount_received: response.sale.amountReceived,
        change_returned: response.sale.changeReturned,
        payment_method: 'ESPECES',
        status: 'VALIDEE',
        notes: saleNotes,
        created_at: new Date().toISOString(),
      };

      setCompletedSale(saleData);
      setCompletedItems(response.sale.items);
      setIsReceiptOpen(true);

      // Réinitialiser la caisse et recharger les stocks
      clearCart();
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erreur lors de la validation de la vente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-[calc(100vh-3.25rem)] flex flex-col lg:flex-row overflow-hidden bg-slate-100">
      {/* SECTION GAUCHE : Catalogue & Recherche de Produits */}
      <div className="flex-1 flex flex-col overflow-hidden p-2 sm:p-2.5 space-y-2">
        {/* Barre de recherche & Filtres ultra-compacts */}
        <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs space-y-1.5 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par nom d'article ou référence unique (ex: XPS, S24, ANC, CASQUE)..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white"
            />
          </div>

          {/* Catégories scrollables compactes */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap shrink-0 transition-colors ${
                selectedCategory === 'ALL'
                  ? 'bg-[#0F2B59] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tous ({products.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-[#0F2B59] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Grille des Produits Caisse (Sans images, ultra-professionnelle et dense) */}
        <div className="flex-1 overflow-y-auto pr-0.5">
          {filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-white rounded-lg border border-dashed border-slate-300">
              <Package className="w-10 h-10 text-slate-300 mb-1.5" />
              <p className="text-xs font-semibold text-slate-700">Aucun produit ne correspond</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Modifiez votre recherche ou ajoutez des articles au stock.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-1.5 sm:gap-2">
              {filteredProducts.map((product) => {
                const isOutOfStock = product.quantity <= 0;
                const isLowStock = product.quantity <= product.alert_threshold && !isOutOfStock;
                const inCartItem = cart.find((item) => item.product.id === product.id);

                return (
                  <button
                    key={product.id}
                    disabled={isOutOfStock}
                    onClick={() => addToCart(product)}
                    className={`bg-white rounded-lg border p-2 text-left flex flex-col justify-between transition-all relative overflow-hidden group min-h-[96px] cursor-pointer ${
                      isOutOfStock
                        ? 'opacity-60 cursor-not-allowed border-slate-200 bg-slate-50'
                        : inCartItem
                        ? 'border-orange-500 shadow-2xs ring-1 ring-orange-500/30'
                        : 'border-slate-200 hover:border-blue-400 hover:shadow-2xs'
                    }`}
                  >
                    {/* Ligne En-tête : Référence & Stock */}
                    <div className="flex items-center justify-between gap-1 w-full">
                      <span className="font-mono text-[9px] text-blue-700 bg-blue-50 px-1 py-0.5 rounded font-bold truncate">
                        {product.reference}
                      </span>
                      {inCartItem ? (
                        <span className="bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 tabular-nums">
                          {inCartItem.quantity}
                        </span>
                      ) : (
                        <span
                          className={`text-[9px] font-bold px-1 py-0.5 rounded shrink-0 tabular-nums ${
                            isOutOfStock
                              ? 'bg-rose-100 text-rose-700'
                              : isLowStock
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-50 text-emerald-800'
                          }`}
                        >
                          {isOutOfStock ? 'Épuisé' : `${product.quantity} rest.`}
                        </span>
                      )}
                    </div>

                    {/* Nom du Produit */}
                    <h4 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug my-1 flex-1">
                      {product.name}
                    </h4>

                    {/* Ligne Prix & Bouton */}
                    <div className="pt-1 border-t border-slate-100 flex items-center justify-between w-full">
                      <span className="text-xs font-extrabold text-[#0F2B59] tabular-nums">
                        {formatCurrency(product.sell_price)}
                      </span>
                      <span className="text-[10px] font-bold text-orange-600 group-hover:text-orange-700 transition-colors">
                        + Ajouter
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* SECTION DROITE : Panier & Caisse Enregistreuse */}
      <div className="w-full lg:w-80 xl:w-[360px] bg-white border-l border-slate-200 flex flex-col shadow-sm">
        {/* En-tête Panier */}
        <div className="p-2.5 px-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-1.5">
            <ShoppingCart className="w-3.5 h-3.5 text-orange-500" />
            <h3 className="font-bold text-slate-900 text-xs sm:text-sm">Panier Vente Comptoir</h3>
            <span className="text-[11px] font-semibold px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded-full tabular-nums">
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Vider</span>
            </button>
          )}
        </div>

        {/* Message d'erreur s'il y a lieu */}
        {errorMessage && (
          <div className="p-2 mx-3 mt-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Liste des articles du panier */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 space-y-1.5 py-8">
              <ShoppingCart className="w-10 h-10 text-slate-200 stroke-1" />
              <p className="text-xs font-medium text-slate-500">Le panier est vide.</p>
              <p className="text-[10px] text-slate-400 max-w-[190px]">
                Cliquez sur un article à gauche pour l'ajouter à la vente.
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.product.id}
                className="p-2 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-2 text-xs"
              >
                <div className="flex-1 min-w-0">
                  <span className="text-[9px] font-mono text-slate-400 block truncate">
                    {item.product.reference}
                  </span>
                  <p className="font-bold text-slate-800 truncate text-[11px]">{item.product.name}</p>
                  <span className="text-slate-500 text-[10px] tabular-nums">
                    {formatCurrency(item.product.sell_price)}/u
                  </span>
                </div>

                {/* Sélecteur de Quantité */}
                <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-md p-0.5 shrink-0">
                  <button
                    onClick={() => updateQuantity(item.product.id, -1)}
                    className="p-0.5 rounded text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-5 text-center font-bold text-slate-900 text-xs tabular-nums">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.product.id, 1)}
                    className="p-0.5 rounded text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Total Ligne & Poubelle */}
                <div className="text-right shrink-0 flex items-center gap-1.5">
                  <p className="font-extrabold text-slate-900 text-xs tabular-nums">
                    {formatCurrency(item.product.sell_price * item.quantity)}
                  </p>
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer p-0.5"
                    title="Retirer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Section Encaissement en Espèces */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 space-y-2">
          {/* Ligne Total Net */}
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
            <span className="text-xs font-bold text-slate-700">Total Net à Payer :</span>
            <span className="text-lg font-extrabold text-[#0F2B59] tabular-nums">
              {formatCurrency(totalAmount)}
            </span>
          </div>

          {/* Saisie Espèces reçues */}
          <div>
            <div className="text-[11px] font-bold text-slate-700 mb-0.5 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Coins className="w-3 h-3 text-amber-500" />
                <span>Espèces reçues (FCFA)</span>
              </span>
              {totalAmount > 0 && (
                <button
                  type="button"
                  onClick={setExactCash}
                  className="text-[10px] text-blue-600 hover:underline font-semibold cursor-pointer"
                >
                  Montant exact
                </button>
              )}
            </div>
            <input
              type="number"
              min="0"
              step="500"
              value={amountReceived}
              onChange={(e) => setAmountReceived(e.target.value)}
              placeholder="ex: 50 000"
              className="w-full px-2.5 py-1.5 text-sm font-bold bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500 tabular-nums"
            />
          </div>

          {/* Raccourcis billets de banque FCFA */}
          <div className="grid grid-cols-4 gap-1 text-center">
            {[5000, 10000, 20000, 50000].map((bill) => (
              <button
                key={bill}
                type="button"
                onClick={() => addCashShortcut(bill)}
                className="py-0.5 px-1 rounded bg-white border border-slate-200 hover:border-slate-300 text-[10px] font-semibold text-slate-700 hover:bg-slate-100 transition-colors tabular-nums cursor-pointer"
              >
                +{formatCurrency(bill, '')}
              </button>
            ))}
          </div>

          {/* Affichage Monnaie à rendre / Reste à payer */}
          {totalAmount > 0 && (
            <div>
              {amountReceivedNum >= totalAmount ? (
                <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-800">Monnaie à rendre :</span>
                  <span className="text-sm font-extrabold text-emerald-700 tabular-nums">
                    {formatCurrency(changeReturned)}
                  </span>
                </div>
              ) : (
                <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-800">Reste à percevoir :</span>
                  <span className="text-xs font-extrabold text-amber-700 tabular-nums">
                    {formatCurrency(remainingToPay)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Bouton Grand Format : Valider la Vente */}
          <button
            onClick={handleValidateSale}
            disabled={
              isSubmitting || cart.length === 0 || amountReceivedNum < totalAmount
            }
            className="w-full py-2.5 px-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-extrabold text-xs sm:text-sm rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Zap className="w-4 h-4 fill-white" />
            )}
            <span>Valider la Vente & Reçu</span>
          </button>
        </div>
      </div>

      {/* Modal Reçu de caisse à la fin d'une vente */}
      {isReceiptOpen && completedSale && (
        <ReceiptModal
          sale={completedSale}
          items={completedItems}
          onClose={() => setIsReceiptOpen(false)}
        />
      )}
    </div>
  );
};
