import React from 'react';
import { Home as HomeIcon, UserPlus, FileCheck, BarChart3, Users, Settings, Sparkles, ShieldCheck } from 'lucide-react';
import { TopBarAccess } from './TopBarAccess';

interface NavbarProps {
  activeTab: 'home' | 'register' | 'lookup' | 'dashboard' | 'list' | 'settings';
  setActiveTab: (tab: 'home' | 'register' | 'lookup' | 'dashboard' | 'list' | 'settings') => void;
  totalParticipants: number;
  pendingProofsCount: number;
  isAdminUnlocked: boolean;
  onAdminSubmit: (password: string) => Promise<boolean>;
  onLockAdmin: () => void;
  onQuickLookup: (firstName: string, congregation: string, age: number) => void;
  eventName?: string;
  logoUrl?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  totalParticipants,
  pendingProofsCount,
  isAdminUnlocked,
  onAdminSubmit,
  onLockAdmin,
  onQuickLookup,
  eventName,
  logoUrl
}) => {
  return (
    <header className="bg-slate-900 text-white border-b border-amber-500/20 sticky top-0 z-40 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between py-3.5 gap-3">
          {/* Logo & Event Title */}
          <div
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            {logoUrl ? (
              <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl overflow-hidden border border-amber-500/40 bg-slate-950 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform p-1">
                <img
                  src={logoUrl}
                  alt="Logo Gincana"
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="p-2.5 bg-gradient-to-tr from-amber-500 to-amber-300 rounded-2xl shadow-lg shadow-amber-500/20 text-slate-950 font-bold group-hover:scale-105 transition-transform shrink-0">
                <Sparkles className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-2xl font-extrabold tracking-tight bg-gradient-to-r from-amber-200 via-amber-100 to-white bg-clip-text text-transparent">
                  {eventName || 'Somos Jóias Preciosas'}
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  2026
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-amber-200/70 font-medium">
                Gincana & Tocata • Portal do Participante
              </p>
            </div>
          </div>

          {/* Right Header Section: TopBarAccess Widget */}
          <div className="flex items-center justify-end gap-3 w-full sm:w-auto border-t sm:border-0 border-slate-800/80 pt-2 sm:pt-0">
            {/* Header Right Admin Access Widget */}
            <TopBarAccess
              onLookupSubmit={(firstName, congregation, age) => {
                onQuickLookup(firstName, congregation, age);
                setActiveTab('lookup');
              }}
              onAdminSubmit={onAdminSubmit}
              isAdminUnlocked={isAdminUnlocked}
              onLockAdmin={onLockAdmin}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-3 pt-2 scrollbar-none border-t border-slate-800/80">
          {/* PARTICIPANT TABS (Always visible) */}
          <button
            onClick={() => setActiveTab('home')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'home'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <HomeIcon className="w-4 h-4" />
            Início (Sobre o Evento)
          </button>

          <button
            onClick={() => setActiveTab('register')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'register'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Inscrever-se
          </button>

          <button
            onClick={() => setActiveTab('lookup')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'lookup'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            Meu Cadastro / Comprovante
          </button>

          {/* ADMIN ONLY TABS (Hidden when not unlocked) */}
          {isAdminUnlocked && (
            <>
              <div className="h-5 w-px bg-slate-800 mx-1 hidden sm:block" />
              
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25'
                    : 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Dashboard</span>
                <span className="text-[9px] bg-slate-950 text-emerald-300 px-1.5 py-0.5 rounded font-black">Admin</span>
              </button>

              <button
                onClick={() => setActiveTab('list')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'list'
                    ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25'
                    : 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Inscritos</span>
                <span className="text-[9px] bg-slate-950 text-emerald-300 px-1.5 py-0.5 rounded font-black">Admin</span>
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'settings'
                    ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25'
                    : 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Configurações</span>
                <span className="text-[9px] bg-slate-950 text-emerald-300 px-1.5 py-0.5 rounded font-black">Admin</span>
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};
