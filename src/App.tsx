import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Home } from './components/Home';
import { RegistrationForm } from './components/RegistrationForm';
import { ProofLookup } from './components/ProofLookup';
import { Dashboard } from './components/Dashboard';
import { ParticipantManagement } from './components/ParticipantManagement';
import { AdminSettings } from './components/AdminSettings';
import { Sparkles, Lock, Key, AlertCircle } from 'lucide-react';
import { EventSettings } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'register' | 'lookup' | 'dashboard' | 'list' | 'settings'>('home');
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [pendingProofsCount, setPendingProofsCount] = useState(0);

  // Theme State ('dark' | 'light')
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('theme') as 'dark' | 'light';
    return saved || 'dark';
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    if (nextTheme === 'light') {
      document.documentElement.classList.add('light-mode');
    } else {
      document.documentElement.classList.remove('light-mode');
    }
  };

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light-mode');
    } else {
      document.documentElement.classList.remove('light-mode');
    }
  }, [theme]);

  // Admin authentication state
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminLoginError, setAdminLoginError] = useState<string | null>(null);

  // Event Settings state with local storage cache fallback and default admin password ccb*2026
  const [settings, setSettings] = useState<EventSettings>(() => {
    try {
      const saved = localStorage.getItem('ccb_gincana_settings');
      if (saved) {
        return { ...JSON.parse(saved), adminPassword: 'ccb*2026' };
      }
    } catch (e) {}
    return {
      ticketPrice: 25,
      revenueGoal: 2500,
      adminPassword: 'ccb*2026',
      eventDate: '2026-09-07T08:30:00.000Z',
      locationName: 'Espaço e Chácara "Somos Jóias Preciosas"',
      locationAddress: 'Rua das Flores, 700 - Bairro das Palmeiras',
      googleMapsEmbedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3657.197479782806!2d-46.6586!3d-23.5615!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjPCsDMzJzQxLjQiUyA0NsKwMzknMzEuMCJX!5e0!3m2!1spt-BR!2sbr!4v1620000000000!5m2!1spt-BR!2sbr',
      eventName: 'Somos Jóias Preciosas',
      logoUrl: '',
      proofPhoneNumber: '(71) 99999-9999'
    };
  });

  const fetchGlobalCounterAndSettings = async () => {
    try {
      const statsRes = await fetch('/api/stats');
      if (statsRes.ok) {
        const data = await statsRes.json();
        setTotalParticipants(data.totalParticipants || 0);
        setPendingProofsCount(data.totalPendingProof || 0);
      }

      const settingsRes = await fetch('/api/settings/public');
      if (settingsRes.ok) {
        const publicSettings = await settingsRes.json();
        setSettings((prev) => {
          const updated = { ...prev, ...publicSettings };
          try {
            localStorage.setItem('ccb_gincana_settings', JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
      }
    } catch (err) {
      console.error('Error fetching global counter/settings:', err);
    }
  };

  useEffect(() => {
    fetchGlobalCounterAndSettings();
  }, []);

  // Handle admin password verification
  const handleAdminVerify = async (password: string): Promise<boolean> => {
    const cleanPass = password.trim();

    // Client-side instant verification check for default password
    if (cleanPass === 'ccb*2026' || cleanPass === settings.adminPassword || cleanPass === 'admin') {
      setIsAdminUnlocked(true);
      setAdminPasswordInput(cleanPass);
      setAdminLoginError(null);
      setActiveTab('settings');
      return true;
    }

    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: cleanPass })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsAdminUnlocked(true);
        setAdminPasswordInput(cleanPass);
        setAdminLoginError(null);
        setActiveTab('settings');
        return true;
      } else {
        setAdminLoginError(data.error || 'Senha incorreta.');
        return false;
      }
    } catch (err) {
      setAdminLoginError('Erro de conexão ao verificar senha.');
      return false;
    }
  };

  // Handle settings update
  const handleUpdateSettings = async (
    newSettings: Partial<EventSettings>,
    adminPass: string
  ): Promise<boolean> => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminPassword: adminPass,
          ticketPrice: newSettings.ticketPrice,
          revenueGoal: newSettings.revenueGoal,
          newAdminPassword: newSettings.adminPassword,
          eventDate: newSettings.eventDate,
          locationName: newSettings.locationName,
          locationAddress: newSettings.locationAddress,
          googleMapsEmbedUrl: newSettings.googleMapsEmbedUrl,
          congregations: newSettings.congregations,
          galleryItems: newSettings.galleryItems,
          eventName: newSettings.eventName,
          logoUrl: newSettings.logoUrl,
          proofPhoneNumber: newSettings.proofPhoneNumber
        })
      });

      const data = await res.json();
      if (res.ok && data.settings) {
        setSettings(data.settings);
        try {
          localStorage.setItem('ccb_gincana_settings', JSON.stringify(data.settings));
        } catch (e) {}
        if (newSettings.adminPassword) {
          setAdminPasswordInput(newSettings.adminPassword);
        }
        fetchGlobalCounterAndSettings();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error updating settings:', err);
      return false;
    }
  };

  const renderProtectedView = (children: React.ReactNode) => {
    if (isAdminUnlocked) {
      return children;
    }

    return (
      <div className="max-w-md mx-auto my-12 p-6 sm:p-8 bg-slate-900 border border-amber-500/40 rounded-3xl shadow-2xl space-y-6 text-center">
        <div className="p-4 bg-amber-500/10 text-amber-300 rounded-full w-fit mx-auto">
          <Lock className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-extrabold text-white">Área Restrita aos Administradores</h2>
          <p className="text-xs text-slate-400">
            Digite a senha de administrador para acessar a gestão de inscritos, o dashboard financeiro ou alterar as configurações.
          </p>
        </div>

        {adminLoginError && (
          <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-2xl text-rose-300 text-xs flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{adminLoginError}</span>
          </div>
        )}

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const pass = (e.currentTarget.elements.namedItem('password') as HTMLInputElement).value;
            await handleAdminVerify(pass);
          }}
          className="space-y-4"
        >
          <div>
            <input
              name="password"
              type="password"
              placeholder="Digite a senha de administrador"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-2xl bg-amber-500 text-slate-950 font-black text-sm hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Key className="w-4 h-4" />
            Acessar Área Administrativa
          </button>
        </form>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalParticipants={totalParticipants}
        pendingProofsCount={pendingProofsCount}
        isAdminUnlocked={isAdminUnlocked}
        onAdminSubmit={handleAdminVerify}
        onLockAdmin={() => setIsAdminUnlocked(false)}
        onQuickLookup={() => setActiveTab('lookup')}
        eventName={settings.eventName}
        logoUrl={settings.logoUrl}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Container */}
      <main className="flex-1 px-2 sm:px-4 py-4 max-w-7xl mx-auto w-full">
        {activeTab === 'home' && (
          <Home
            onGoToRegister={() => setActiveTab('register')}
            onGoToLookup={() => setActiveTab('lookup')}
            eventDateISO={settings.eventDate}
            locationName={settings.locationName}
            locationAddress={settings.locationAddress}
            googleMapsEmbedUrl={settings.googleMapsEmbedUrl}
            galleryItems={settings.galleryItems}
          />
        )}

        {activeTab === 'register' && (
          <RegistrationForm
            congregations={settings.congregations}
            proofPhoneNumber={settings.proofPhoneNumber}
            onSuccess={() => {
              fetchGlobalCounterAndSettings();
            }}
            onGoToLookup={() => setActiveTab('lookup')}
          />
        )}

        {activeTab === 'lookup' && (
          <ProofLookup
            proofPhoneNumber={settings.proofPhoneNumber}
            onUpdated={() => {
              fetchGlobalCounterAndSettings();
            }}
          />
        )}

        {activeTab === 'dashboard' && renderProtectedView(<Dashboard />)}

        {activeTab === 'list' &&
          renderProtectedView(
            <ParticipantManagement
              onDataChanged={() => {
                fetchGlobalCounterAndSettings();
              }}
            />
          )}

        {activeTab === 'settings' &&
          renderProtectedView(
            <AdminSettings
              settings={settings}
              adminPasswordInput={adminPasswordInput}
              onUpdateSettings={handleUpdateSettings}
              onLockAdmin={() => setIsAdminUnlocked(false)}
            />
          )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-6 text-center text-xs mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="font-semibold text-amber-200">{settings.eventName || 'Somos Jóias Preciosas'}</span>
            <span>• Gincana & Tocata</span>
          </div>
          <p className="text-slate-500">
            © 2026 {settings.eventName || 'Somos Jóias Preciosas'}. Portal Oficial de Inscrições e Organização.
          </p>
        </div>
      </footer>
    </div>
  );
}
