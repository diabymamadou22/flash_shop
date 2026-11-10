import React from 'react';
import {
  ShoppingCart,
  LayoutDashboard,
  Package,
  Receipt,
  Wallet,
  Settings,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

export type ActiveTab =
  | 'pos'
  | 'dashboard'
  | 'products'
  | 'sales'
  | 'expenses'
  | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  lowStockCount?: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  lowStockCount = 0,
  isOpen,
  setIsOpen,
}) => {
  const { user } = useAuth();

  const navItems = [
    {
      id: 'pos' as ActiveTab,
      label: 'Caisse & Vente POS',
      icon: ShoppingCart,
      isPrimaryAction: true,
      badge: 'DIRECT',
    },
    {
      id: 'dashboard' as ActiveTab,
      label: 'Tableau de bord',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'products' as ActiveTab,
      label: 'Produits & Stocks',
      icon: Package,
      alertCount: lowStockCount,
    },
    {
      id: 'sales' as ActiveTab,
      label: 'Historique des Ventes',
      icon: Receipt,
      badge: null,
    },
    {
      id: 'expenses' as ActiveTab,
      label: 'Gestion des Dépenses',
      icon: Wallet,
      badge: null,
    },
    {
      id: 'settings' as ActiveTab,
      label: 'Paramètres Boutique',
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#0F2B59] text-white flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-3.5 border-b border-blue-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-white p-0.5 flex items-center justify-center shrink-0 shadow-sm">
              <img
                src="/src/assets/images/flash_shop_logo_1793651306443.jpg"
                alt="FLASH-SHOP Logo"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-white">FLASH-SHOP</span>
                <span className="text-[9px] font-bold px-1 py-0.5 rounded-xs bg-orange-500 text-white leading-none">
                  PRO
                </span>
              </div>
              <p className="text-[10px] text-blue-200/80 truncate max-w-[130px]">
                Matériels Électroniques
              </p>
            </div>
          </div>
        </div>

        {/* Navigation List Simplifiée */}
        <div className="flex-1 overflow-y-auto px-2.5 py-2.5 space-y-0.5">
          <div className="px-2.5 pb-1 text-[10px] font-bold text-blue-300 uppercase tracking-wider">
            Menu
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                  isActive
                    ? item.isPrimaryAction
                      ? 'bg-orange-500 text-white shadow-xs font-bold'
                      : 'bg-white/10 text-white font-semibold shadow-xs'
                    : item.isPrimaryAction
                    ? 'text-orange-300 hover:bg-orange-500/10 hover:text-orange-200 font-semibold'
                    : 'text-blue-100/80 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive
                        ? 'text-white'
                        : item.isPrimaryAction
                        ? 'text-orange-400'
                        : 'text-blue-300'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.alertCount !== undefined && item.alertCount > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs font-bold rounded-full bg-rose-500 text-white tabular-nums">
                    {item.alertCount}
                  </span>
                )}

                {item.badge && !isActive && (
                  <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-orange-500/20 text-orange-300 border border-orange-500/30">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* User Status Bar */}
        <div className="p-3 border-t border-blue-900/60 bg-blue-950/40">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-blue-600/60 border border-blue-400/30 flex items-center justify-center font-bold text-xs text-white shrink-0">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'M'}
            </div>
            <div className="truncate text-left">
              <p className="text-xs font-semibold text-white truncate">
                {user?.full_name || 'Mamadou Diaby'}
              </p>
              <div className="flex items-center gap-1 text-[11px] text-emerald-400">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>Connecté (Direct)</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
