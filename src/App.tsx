/**
 * FLASH-SHOP - Système de Gestion Commerciale, Stocks & Caisse POS
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Sidebar, ActiveTab } from './components/Sidebar.tsx';
import { Header } from './components/Header.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { PosView } from './views/PosView.tsx';
import { DashboardView } from './views/DashboardView.tsx';
import { ProductsView } from './views/ProductsView.tsx';
import { SalesHistoryView } from './views/SalesHistoryView.tsx';
import { ExpensesView } from './views/ExpensesView.tsx';
import { SettingsView } from './views/SettingsView.tsx';
import { DbStatus } from './types/index.ts';
import { apiRequest } from './lib/api.ts';

function MainApp() {
  const { isAuthenticated, isLoading } = useAuth();
  // Par défaut, ouvrir directement la caisse POS pour un travail immédiat !
  const [activeTab, setActiveTab] = useState<ActiveTab>('pos');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [lowStockCount, setLowStockCount] = useState<number>(0);
  const [dbStatus, setDbStatus] = useState<DbStatus | null>(null);

  // Charger le statut de la base et le nombre d'alertes de stock
  const loadSystemInfo = async () => {
    if (!isAuthenticated) return;
    try {
      const [status, alerts] = await Promise.all([
        apiRequest<DbStatus>('/api/settings/db-status'),
        apiRequest<any[]>('/api/stock/alerts'),
      ]);
      setDbStatus(status);
      setLowStockCount(alerts.length);
    } catch {
      // Silencieux
    }
  };

  useEffect(() => {
    loadSystemInfo();
    const interval = setInterval(loadSystemInfo, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, activeTab]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-white tracking-wide">
            Ouverture de FLASH-SHOP...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthModal />;
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case 'pos':
        return <PosView />;
      case 'dashboard':
        return <DashboardView setActiveTab={setActiveTab} />;
      case 'products':
        return <ProductsView />;
      case 'sales':
        return <SalesHistoryView />;
      case 'expenses':
        return <ExpensesView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <PosView />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col antialiased">
      {/* Barre Latérale Gauche */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        lowStockCount={lowStockCount}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      {/* Conteneur Principal */}
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          dbStatus={dbStatus}
          lowStockCount={lowStockCount}
        />

        <main className="flex-1 overflow-y-auto">
          {renderActiveView()}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
