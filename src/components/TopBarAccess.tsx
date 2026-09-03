import React, { useState } from 'react';
import { Search, Key, ShieldCheck, ChevronDown, Lock, Unlock, AlertCircle, X, Settings, BarChart3, Users } from 'lucide-react';

interface TopBarAccessProps {
  onLookupSubmit: (firstName: string, congregation: string, age: number) => void;
  onAdminSubmit: (password: string) => Promise<boolean>;
  isAdminUnlocked: boolean;
  onLockAdmin: () => void;
  onNavigateTab?: (tab: 'home' | 'register' | 'lookup' | 'dashboard' | 'list' | 'settings') => void;
}

export const TopBarAccess: React.FC<TopBarAccessProps> = ({
  onLookupSubmit,
  onAdminSubmit,
  isAdminUnlocked,
  onLockAdmin,
  onNavigateTab
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'admin' | 'participant'>('admin');

  // Participant form
  const [firstName, setFirstName] = useState('');
  const [congregation, setCongregation] = useState('');
  const [age, setAge] = useState('');

  // Admin form
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleParticipantSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !congregation.trim() || !age) return;
    onLookupSubmit(firstName.trim(), congregation.trim(), Number(age));
    setIsOpen(false);
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword) return;
    setLoading(true);
    setAdminError(null);

    const success = await onAdminSubmit(adminPassword);
    setLoading(false);
    if (success) {
      setAdminPassword('');
      setIsOpen(false);
      if (onNavigateTab) {
        onNavigateTab('settings');
      }
    } else {
      setAdminError('Senha incorreta.');
    }
  };

  return (
    <div className="relative">
      {/* Upper Right Action Buttons */}
      <div className="flex items-center gap-2">
        {isAdminUnlocked ? (
          <div className="flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs p-1 sm:px-3 sm:py-1.5 rounded-xl font-bold shadow-sm">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-1.5 px-2 py-1 hover:bg-emerald-500/20 rounded-lg transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Painel Admin</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <button
              onClick={() => {
                onLockAdmin();
                setIsOpen(false);
              }}
              className="px-2 py-1 bg-rose-500/30 hover:bg-rose-500/50 rounded-lg text-rose-200 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
              title="Sair da Área Administrativa"
            >
              <Lock className="w-3 h-3" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setMode('admin');
              setIsOpen(!isOpen);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-600 text-slate-300 hover:text-white text-xs font-medium transition-all cursor-pointer active:scale-95 shadow-sm"
            title="Acesso exclusivo para administradores e organizadores"
          >
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Admin</span>
            <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {/* Floating Dropdown / Popover Modal */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-amber-500/40 rounded-3xl p-5 shadow-2xl z-50 animate-fade-in space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
              <ShieldCheck className="w-4 h-4" />
              <span>{isAdminUnlocked ? 'Painel de Controle Admin' : (mode === 'admin' ? 'Acesso Administrativo' : 'Consulta de Ficha')}</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* If already unlocked, show direct menu shortcuts */}
          {isAdminUnlocked ? (
            <div className="space-y-2">
              <p className="text-xs text-emerald-300 font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Administrador autenticado com sucesso!
              </p>
              
              <div className="pt-2 space-y-2">
                <button
                  onClick={() => {
                    if (onNavigateTab) onNavigateTab('settings');
                    setIsOpen(false);
                  }}
                  className="w-full text-left p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 flex items-center gap-3 text-amber-200 transition-all cursor-pointer group"
                >
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-extrabold text-sm text-white">Configurações do Evento</p>
                    <p className="text-[11px] text-slate-400">Igrejas, valor por participante, meta e senha</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    if (onNavigateTab) onNavigateTab('dashboard');
                    setIsOpen(false);
                  }}
                  className="w-full text-left p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 flex items-center gap-3 text-emerald-200 transition-all cursor-pointer group"
                >
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-extrabold text-sm text-white">Dashboard Financeiro</p>
                    <p className="text-[11px] text-slate-400">Acompanhar arrecadação e métricas do evento</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    if (onNavigateTab) onNavigateTab('list');
                    setIsOpen(false);
                  }}
                  className="w-full text-left p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 flex items-center gap-3 text-emerald-200 transition-all cursor-pointer group"
                >
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-extrabold text-sm text-white">Gerenciar Inscritos</p>
                    <p className="text-[11px] text-slate-400">Ver lista completa, filtrar e aprovar comprovantes</p>
                  </div>
                </button>
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => {
                    onLockAdmin();
                    setIsOpen(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold hover:bg-rose-500/30 flex items-center gap-1.5 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Sair do Modo Admin
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Header Switcher */}
              <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => { setMode('admin'); setAdminError(null); }}
                  className={`flex-1 py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
                    mode === 'admin' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Key className="w-3.5 h-3.5" />
                  Entrar como Admin
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('participant'); setAdminError(null); }}
                  className={`flex-1 py-2 rounded-xl font-bold transition-all ${
                    mode === 'participant' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Buscar Ficha
                </button>
              </div>

              {/* Admin Login Mode */}
              {mode === 'admin' && (
                <form onSubmit={handleAdminLogin} className="space-y-3">
                  <p className="text-[11px] text-slate-300">
                    Digite a senha de administrador para gerenciar o evento:
                  </p>

                  {adminError && (
                    <div className="p-2.5 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{adminError}</span>
                    </div>
                  )}

                  <div>
                    <label className="text-[11px] font-bold text-amber-300 block mb-1">
                      Senha de Administrador
                    </label>
                    <input
                      type="password"
                      placeholder="Digite a senha de admin"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                      autoFocus
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 rounded-xl bg-amber-500 text-slate-950 font-extrabold text-xs hover:bg-amber-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
                  >
                    <Unlock className="w-4 h-4" />
                    {loading ? 'Verificando...' : 'Acessar Área Restrita'}
                  </button>
                </form>
              )}

              {/* Participant Lookup Mode */}
              {mode === 'participant' && (
                <form onSubmit={handleParticipantSearch} className="space-y-3">
                  <p className="text-[11px] text-slate-300">
                    Acesse seu cadastro para consultar dados ou anexar seu comprovante de pagamento:
                  </p>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">Primeiro Nome</label>
                    <input
                      type="text"
                      placeholder="Ex: Mateus"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">Congregação</label>
                    <input
                      type="text"
                      placeholder="Ex: Central"
                      value={congregation}
                      onChange={(e) => setCongregation(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">Idade</label>
                    <input
                      type="number"
                      placeholder="Ex: 19"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                  >
                    <Search className="w-4 h-4" />
                    Localizar Minha Ficha
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
