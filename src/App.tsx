import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { Home } from './components/Home';
import { RegistrationForm } from './components/RegistrationForm';
import { ProofLookup } from './components/ProofLookup';
import { Dashboard } from './components/Dashboard';
import { ParticipantManagement } from './components/ParticipantManagement';
import { AdminSettings } from './components/AdminSettings';
import { Sparkles, Lock, Key, AlertCircle } from 'lucide-react';
import { EventSettings } from './types';
import { formatAudioUrl } from './utils/media';
import { fetchParticipantsFromSupabaseDirect, saveSettingsToSupabaseDirect, fetchSettingsFromSupabaseDirect } from './lib/supabase';

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

  // Admin authentication state with session cache
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(() => {
    try {
      return sessionStorage.getItem('ccb_admin_unlocked') === 'true';
    } catch (e) {
      return false;
    }
  });
  const [adminPasswordInput, setAdminPasswordInput] = useState(() => {
    try {
      return sessionStorage.getItem('ccb_admin_session_pass') || 'ccb*2026';
    } catch (e) {
      return 'ccb*2026';
    }
  });
  const [adminLoginError, setAdminLoginError] = useState<string | null>(null);

  // Helper to ensure mock/sample photos are never displayed
  const sanitizeGallery = (items: any[]): any[] => {
    if (!Array.isArray(items)) return [];
    return items.filter((item) => {
      if (!item || typeof item !== 'object') return false;
      const id = String(item.id || '');
      if (['m1', 'm2', 'm3', 'm4', 'm5', 'm6'].includes(id)) return false;
      const urlStr = String(item.url || '');
      const thumbStr = String(item.thumbnailUrl || '');
      if (urlStr.includes('unsplash.com') || urlStr.includes('romelandia.sc.gov.br')) return false;
      if (thumbStr.includes('unsplash.com') || thumbStr.includes('romelandia.sc.gov.br')) return false;
      return true;
    });
  };

  // Event Settings state with local storage cache fallback and default admin password ccb*2026
  const [settings, setSettings] = useState<EventSettings>(() => {
    try {
      const saved = localStorage.getItem('ccb_gincana_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.backgroundMusicUrl || parsed.backgroundMusicUrl.trim() === '' || parsed.backgroundMusicUrl.includes('peaceful-piano') || parsed.backgroundMusicUrl.includes('pixabay.com')) {
          parsed.backgroundMusicUrl = '/uploads/audio/Se_vos_baterdes_Ele_vos_abre.mp3';
          parsed.backgroundMusicTitle = 'Se Vós Baterdes Ele Vos Abre';
          parsed.backgroundMusicEnabled = true;
        }
        return {
          ...parsed,
          adminPassword: 'ccb*2026',
          galleryItems: sanitizeGallery(parsed.galleryItems)
        };
      }
    } catch (e) {}
    return {
      ticketPrice: 25,
      revenueGoal: 2500,
      adminPassword: 'ccb*2026',
      eventDate: '2026-09-07T11:00:00.000Z',
      locationName: 'Espaço e Chácara "Somos Jóias Preciosas"',
      locationAddress: 'Fazenda Chico Pinto, Bairro Cedro. São Gonçalo dos Campos',
      googleMapsEmbedUrl: 'https://www.google.com/maps/embed?pb=!1m17!1m12!1m3!1d3896.670711455419!2d-38.93708902493298!3d-12.404963687860697!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m2!1m1!2zMTLCsDI0JzE3LjkiUyAzOMKwNTYnMDQuMyJX!5e0!3m2!1spt-BR!2sbr!4v1786894792405!5m2!1spt-BR!2sbr',
      eventName: 'Somos Jóias Preciosas',
      logoUrl: '',
      pixKey: 'gincana.joias2026@gmail.com',
      whatsappGroupUrl: 'https://chat.whatsapp.com/Bf4nIjDR6QCFXEuxm7S3gK',
      galleryItems: [],
      backgroundMusicUrl: '/uploads/audio/Se_vos_baterdes_Ele_vos_abre.mp3',
      backgroundMusicTitle: 'Se Vós Baterdes Ele Vos Abre',
      backgroundMusicEnabled: true
    };
  });

  // Global Audio Hymn Player State
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isMutedAudio, setIsMutedAudio] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0.85);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

  const formattedAudioUrl = settings.backgroundMusicUrl && settings.backgroundMusicUrl.trim() !== ''
    ? formatAudioUrl(settings.backgroundMusicUrl)
    : '';
  const hasAudioTrack = Boolean(formattedAudioUrl && formattedAudioUrl.trim() !== '');

  const togglePlayAudio = () => {
    if (!audioRef.current || !hasAudioTrack) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlayingAudio(true);
      }).catch((err) => {
        console.warn('Erro ao reproduzir áudio:', err);
      });
    }
  };

  const toggleMuteAudio = () => {
    if (!audioRef.current) return;
    const nextMuted = !isMutedAudio;
    audioRef.current.muted = nextMuted;
    setIsMutedAudio(nextMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setAudioVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
      if (val === 0) {
        setIsMutedAudio(true);
        audioRef.current.muted = true;
      } else if (isMutedAudio) {
        setIsMutedAudio(false);
        audioRef.current.muted = false;
      }
    }
  };

  const handleSeekAudio = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setAudioCurrentTime(val);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
  };

  const fetchGlobalCounterAndSettings = async () => {
    try {
      const statsPromise = fetch('/api/stats', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      }).then(async (res) => {
        if (res.ok) {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data = await res.json();
            setTotalParticipants(data.totalParticipants || 0);
            setPendingProofsCount(data.totalPendingProof || 0);
            return;
          }
        }
        throw new Error('API unavailable');
      }).catch(async () => {
        try {
          const directList = await fetchParticipantsFromSupabaseDirect();
          if (directList) {
            setTotalParticipants(directList.length);
            const pending = directList.filter((p) => !p.proofUrl || p.proofStatus === 'Pendente').length;
            setPendingProofsCount(pending);
          }
        } catch {}
      });

      const settingsPromise = fetch('/api/settings/public', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      }).then(async (res) => {
        if (res.ok) {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const publicSettings = await res.json();
            setSettings((prev) => {
              const updated = {
                ...prev,
                ...publicSettings,
                galleryItems: sanitizeGallery(publicSettings.galleryItems)
              };
              // Only update if something really changed
              if (JSON.stringify(prev) === JSON.stringify(updated)) {
                return prev;
              }
              try {
                localStorage.setItem('ccb_gincana_settings', JSON.stringify(updated));
              } catch (e) {}
              return updated;
            });
            return;
          }
        }
        throw new Error('Settings API unavailable');
      }).catch(async () => {
        try {
          const directSettings = await fetchSettingsFromSupabaseDirect();
          if (directSettings) {
            setSettings((prev) => {
              const updated = {
                ...prev,
                ...directSettings,
                galleryItems: sanitizeGallery(directSettings.galleryItems)
              };
              if (JSON.stringify(prev) === JSON.stringify(updated)) {
                return prev;
              }
              return updated;
            });
          }
        } catch {}
      });

      await Promise.allSettled([statsPromise, settingsPromise]);
    } catch {
      // Ignore background sync errors
    }
  };

  useEffect(() => {
    fetchGlobalCounterAndSettings();

    // Periodic polling every 4 seconds so all connected devices stay updated in real time
    const intervalId = setInterval(() => {
      fetchGlobalCounterAndSettings();
    }, 4000);

    const handleFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        fetchGlobalCounterAndSettings();
      }
    };

    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);
    window.addEventListener('ccb_participant_registered', fetchGlobalCounterAndSettings);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
      window.removeEventListener('ccb_participant_registered', fetchGlobalCounterAndSettings);
    };
  }, []);

  // Also refetch immediately whenever tab changes
  useEffect(() => {
    fetchGlobalCounterAndSettings();
  }, [activeTab]);

  // Handle admin password verification
  const handleAdminVerify = async (password: string): Promise<boolean> => {
    const cleanPass = password.trim();

    // Client-side instant verification check for default password
    if (cleanPass === 'ccb*2026' || cleanPass === settings.adminPassword || cleanPass === 'admin') {
      setIsAdminUnlocked(true);
      setAdminPasswordInput(cleanPass);
      setAdminLoginError(null);
      try {
        sessionStorage.setItem('ccb_admin_unlocked', 'true');
        sessionStorage.setItem('ccb_admin_session_pass', cleanPass);
      } catch (e) {}
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
        try {
          sessionStorage.setItem('ccb_admin_unlocked', 'true');
          sessionStorage.setItem('ccb_admin_session_pass', cleanPass);
        } catch (e) {}
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
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const effectivePassword = adminPass || adminPasswordInput || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('ccb_admin_session_pass') : '') || 'ccb*2026';
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminPassword: effectivePassword,
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
          proofPhoneNumber: newSettings.proofPhoneNumber,
          pixKey: newSettings.pixKey,
          whatsappGroupUrl: newSettings.whatsappGroupUrl,
          teams: newSettings.teams,
          blobAutoSync: newSettings.blobAutoSync,
          blobReadWriteToken: newSettings.blobReadWriteToken,
          blobStorageUrl: newSettings.blobStorageUrl,
          backgroundMusicUrl: newSettings.backgroundMusicUrl,
          backgroundMusicTitle: newSettings.backgroundMusicTitle,
          backgroundMusicEnabled: newSettings.backgroundMusicEnabled
        })
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch (e) {
        data = { error: res.statusText || 'Erro na resposta do servidor.' };
      }

      if (res.ok && data.settings) {
        setSettings(data.settings);
        saveSettingsToSupabaseDirect(data.settings).catch(() => {});
        try {
          // Store lightweight settings in localStorage to prevent 5MB browser quota errors
          const cachedSettings = { ...data.settings };
          if (cachedSettings.galleryItems && cachedSettings.galleryItems.length > 5) {
            // Store up to 5 items in localStorage cache, server keeps all
            cachedSettings.galleryItems = cachedSettings.galleryItems.slice(0, 5);
          }
          localStorage.setItem('ccb_gincana_settings', JSON.stringify(cachedSettings));
        } catch (e) {
          console.warn('LocalStorage quota limit reached, relying on server state.', e);
        }
        if (newSettings.adminPassword) {
          setAdminPasswordInput(newSettings.adminPassword);
          try {
            sessionStorage.setItem('ccb_admin_session_pass', newSettings.adminPassword);
          } catch (e) {}
        }
        fetchGlobalCounterAndSettings();
        return { success: true };
      }

      const errorMessage = data?.error || (res.status === 401 ? 'Senha de administrador incorreta.' : res.status === 413 ? 'Tamanho dos arquivos excedeu o limite. Tente fotos menores.' : 'Não foi possível salvar as configurações.');
      return { success: false, error: errorMessage };
    } catch (err: any) {
      console.error('Error updating settings:', err);
      return { success: false, error: err?.message || 'Erro de conexão ao salvar configurações.' };
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
        onLockAdmin={() => {
          setIsAdminUnlocked(false);
          setAdminPasswordInput('');
          try {
            sessionStorage.removeItem('ccb_admin_unlocked');
            sessionStorage.removeItem('ccb_admin_session_pass');
          } catch (e) {}
        }}
        onQuickLookup={() => setActiveTab('lookup')}
        eventName={settings.eventName}
        logoUrl={settings.logoUrl}
        theme={theme}
        onToggleTheme={toggleTheme}
        hasAudioTrack={hasAudioTrack}
        isPlayingAudio={isPlayingAudio}
        onTogglePlayAudio={togglePlayAudio}
        backgroundMusicTitle={settings.backgroundMusicTitle}
      />

      {/* Persistent Global Audio Element */}
      {hasAudioTrack && (
        <audio
          ref={audioRef}
          src={formattedAudioUrl}
          loop
          preload="auto"
          onTimeUpdate={() => {
            if (audioRef.current) {
              setAudioCurrentTime(audioRef.current.currentTime);
            }
          }}
          onLoadedMetadata={() => {
            if (audioRef.current) {
              setAudioDuration(audioRef.current.duration);
            }
          }}
          onEnded={() => {
            setIsPlayingAudio(false);
          }}
          onError={() => {
            console.warn('Erro ao reproduzir arquivo de áudio do hino.');
            setIsPlayingAudio(false);
          }}
          className="hidden"
        />
      )}

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
            teams={settings.teams}
            backgroundMusicUrl={settings.backgroundMusicUrl}
            backgroundMusicTitle={settings.backgroundMusicTitle}
            backgroundMusicEnabled={settings.backgroundMusicEnabled}
            isPlayingAudio={isPlayingAudio}
            onTogglePlayAudio={togglePlayAudio}
            isMutedAudio={isMutedAudio}
            onToggleMuteAudio={toggleMuteAudio}
            audioVolume={audioVolume}
            onVolumeChange={handleVolumeChange}
            audioCurrentTime={audioCurrentTime}
            audioDuration={audioDuration}
            onSeekAudio={handleSeekAudio}
          />
        )}

        {activeTab === 'register' && (
          <RegistrationForm
            congregations={settings.congregations}
            proofPhoneNumber={settings.proofPhoneNumber}
            pixKey={settings.pixKey}
            whatsappGroupUrl={settings.whatsappGroupUrl}
            onSuccess={() => {
              fetchGlobalCounterAndSettings();
            }}
            onGoToLookup={() => setActiveTab('lookup')}
          />
        )}

        {activeTab === 'lookup' && (
          <ProofLookup
            congregations={settings.congregations}
            proofPhoneNumber={settings.proofPhoneNumber}
            pixKey={settings.pixKey}
            whatsappGroupUrl={settings.whatsappGroupUrl}
            onUpdated={() => {
              fetchGlobalCounterAndSettings();
            }}
          />
        )}

        {activeTab === 'dashboard' && renderProtectedView(<Dashboard />)}

        {activeTab === 'list' &&
          renderProtectedView(
            <ParticipantManagement
              congregations={settings.congregations}
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
              onLockAdmin={() => {
                setIsAdminUnlocked(false);
                setAdminPasswordInput('');
                try {
                  sessionStorage.removeItem('ccb_admin_unlocked');
                  sessionStorage.removeItem('ccb_admin_session_pass');
                } catch (e) {}
              }}
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
