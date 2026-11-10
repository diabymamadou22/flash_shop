import React, { useState, useEffect } from 'react';
import { User as UserIcon, ShieldCheck, Zap, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { apiRequest } from '../lib/api.ts';

interface Account {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: string;
}

export const AuthModal: React.FC = () => {
  const { login } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedUsername, setSelectedUsername] = useState('admin');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    apiRequest<Account[]>('/api/auth/accounts')
      .then((data) => {
        setAccounts(data);
        if (data.length > 0) {
          setSelectedUsername(data[0].username);
        }
      })
      .catch(() => {});
  }, []);

  const handleDirectLogin = async (usernameToLogin?: string) => {
    setError(null);
    setIsLoading(true);

    try {
      await login(usernameToLogin || selectedUsername);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la connexion');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0F2B59]/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* En-tête bleu avec logo */}
        <div className="bg-[#0F2B59] p-6 text-center text-white relative">
          <div className="w-16 h-16 mx-auto mb-3 rounded-xl bg-white p-2 shadow-md flex items-center justify-center">
            <img
              src="/src/assets/images/flash_shop_logo_1793651306443.jpg"
              alt="FLASH-SHOP"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">FLASH-SHOP</h2>
          <p className="text-xs text-blue-200 mt-1">
            Gestion Commerciale & Caisse POS Électronique
          </p>
          <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-emerald-500/20 text-[11px] font-bold text-emerald-300 border border-emerald-500/30">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Accès Direct Sans Mot de Passe</span>
          </div>
        </div>

        {/* Corps d'accès 1-clic */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-700">
              Sélectionnez votre profil pour accéder à la boutique :
            </p>

            <div className="space-y-2">
              {accounts.length > 0 ? (
                accounts.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => handleDirectLogin(acc.username)}
                    disabled={isLoading}
                    className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between transition-all group ${
                      selectedUsername === acc.username
                        ? 'border-orange-500 bg-orange-50/50 shadow-xs'
                        : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#0F2B59] text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {acc.full_name ? acc.full_name.charAt(0).toUpperCase() : 'A'}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 group-hover:text-blue-900">
                          {acc.full_name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Rôle : <span className="font-semibold text-blue-700">{acc.role}</span>
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-orange-500 group-hover:translate-x-1 transition-transform" />
                  </button>
                ))
              ) : (
                <button
                  type="button"
                  onClick={() => handleDirectLogin('admin')}
                  disabled={isLoading}
                  className="w-full p-3.5 rounded-xl border border-orange-500 bg-orange-50/50 text-left flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#0F2B59] text-white flex items-center justify-center font-bold text-xs">
                      M
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Mamadou Diaby (Directeur)</p>
                      <p className="text-[11px] text-slate-500">Rôle : ADMIN</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-orange-500" />
                </button>
              )}
            </div>
          </div>

          {/* Bouton Principal d'Accès Direct */}
          <button
            type="button"
            onClick={() => handleDirectLogin()}
            disabled={isLoading}
            className="w-full py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Zap className="w-4 h-4 fill-white" />
            )}
            <span>Entrer dans FLASH-SHOP</span>
          </button>

          <p className="text-center text-[11px] text-slate-400">
            Connexion directe activée · Aucun mot de passe requis
          </p>
        </div>
      </div>
    </div>
  );
};
