import React from 'react';
import { Menu, ShoppingCart, AlertCircle } from 'lucide-react';
import { ActiveTab } from './Sidebar.tsx';
import { DbStatus } from '../types/index.ts';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenSidebar: () => void;
  dbStatus?: DbStatus | null;
  lowStockCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenSidebar,
  lowStockCount = 0,
}) => {
  const getTabLabel = (tab: ActiveTab) => {
    switch (tab) {
      case 'pos':
        return 'Caisse & Point de Vente';
      case 'dashboard':
        return 'Tableau de bord & Statistiques';
      case 'products':
        return 'Catalogue des Produits & Stocks';
      case 'sales':
        return 'Historique des Ventes';
      case 'expenses':
        return 'Gestion des Dépenses';
      case 'settings':
        return 'Paramètres & Configuration';
      default:
        return 'FLASH-SHOP';
    }
  };

  return (
    <header className="sticky top-0 z-30 h-13 bg-white border-b border-slate-200 px-3 sm:px-4 flex items-center justify-between gap-3">
      {/* Zone 1: Mobile toggle + Breadcrumb Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          aria-label="Ouvrir le menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold text-slate-400 hidden sm:inline">FLASH-SHOP</span>
          <span className="text-slate-300 hidden sm:inline" aria-hidden="true">/</span>
          <h1 className="font-bold text-slate-900 text-base sm:text-lg">
            {getTabLabel(activeTab)}
          </h1>
        </div>
      </div>

      {/* Zone 2: Stock alerts indicator */}
      <div className="hidden md:flex items-center gap-3">
        {lowStockCount > 0 && (
          <button
            onClick={() => setActiveTab('products')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 transition-colors"
          >
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>{lowStockCount} alerte{lowStockCount > 1 ? 's' : ''} stock</span>
          </button>
        )}
      </div>

      {/* Zone 3: 1 Primary Action (Quick POS Button) */}
      <div className="flex items-center gap-2">
        {activeTab !== 'pos' && (
          <button
            onClick={() => setActiveTab('pos')}
            className="flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600 shadow-xs transition-colors whitespace-nowrap shrink-0"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Ouvrir la Caisse POS</span>
          </button>
        )}
      </div>
    </header>
  );
};
