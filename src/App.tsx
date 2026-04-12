import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import { supabaseService } from './services/supabaseService';
import { UserProfile, SystemSettings } from './types';
import Auth from './components/Auth';
import AdminDashboard from './components/AdminDashboard';
import TechnicianDashboard from './components/TechnicianDashboard';
import SettingsModal from './components/SettingsModal';
import { LogOut, Loader2, Wrench, User as UserIcon, Settings, ChevronDown, KeyRound, Palette, AlertCircle } from 'lucide-react';
import { User } from '@supabase/supabase-js';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check initial session
        const { data: { session } } = await supabase.auth.getSession();
        const supabaseUser = session?.user ?? null;
        setUser(supabaseUser);

        if (supabaseUser) {
          await fetchUserData(supabaseUser);
        }
      } catch (err) {
        console.error('Initial session check failed:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for Supabase Auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const supabaseUser = session?.user ?? null;
      setUser(supabaseUser);

      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryMode(true);
        setShowSettingsModal(true);
      }

      if (supabaseUser) {
        await fetchUserData(supabaseUser);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    const fetchUserData = async (supabaseUser: User) => {
      // Request notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }

      // Fetch profile from Supabase
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', supabaseUser.id)
          .single();

        if (profileData) {
          setProfile({
            uid: profileData.id,
            email: profileData.email,
            name: profileData.name || 'Usuário',
            role: profileData.role,
            permissions: profileData.permissions,
            createdAt: profileData.created_at
          });
        } else if (profileError) {
          console.error('Error fetching profile:', profileError);
          if (profileError.code !== 'PGRST116') {
            setError('Erro ao carregar perfil de usuário.');
          }
        }
      } catch (err) {
        console.error('Profile fetch failed:', err);
        setError('Falha na conexão com o banco de dados.');
      }

      // Fetch system settings from Supabase
      try {
        const settings = await supabaseService.getSettings();
        if (settings) {
          setSystemSettings(settings);
          applyTheme(settings);
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      }
    };

    // Handle clicks outside of profile menu
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const applyTheme = (s: SystemSettings) => {
    const root = document.documentElement;
    if (s.theme.mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    if (s.theme.primaryColor) {
      root.style.setProperty('--primary-color', s.theme.primaryColor);
    } else {
      root.style.removeProperty('--primary-color');
    }
    
    if (s.theme.surfaceColor) {
      root.style.setProperty('--surface-color', s.theme.surfaceColor);
    } else {
      root.style.removeProperty('--surface-color');
    }

    if (s.theme.backgroundColor) {
      root.style.setProperty('--bg-color', s.theme.backgroundColor);
    } else {
      root.style.removeProperty('--bg-color');
    }
  };

  const handleLogout = () => supabase.auth.signOut();

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-soft-bg p-6">
        <div className="bg-soft-card p-8 rounded-[40px] shadow-2xl border border-soft-danger/20 flex flex-col items-center max-w-md text-center">
          <div className="w-16 h-16 bg-soft-danger/10 rounded-2xl flex items-center justify-center mb-6">
            <AlertCircle className="w-8 h-8 text-soft-danger" />
          </div>
          <h2 className="text-xl font-black text-soft-text uppercase tracking-tight mb-2">Erro de Carregamento</h2>
          <p className="text-sm font-medium text-soft-text/60 leading-relaxed mb-8">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="btn-primary w-full"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-soft-bg transition-colors duration-500">
        <div className="relative flex flex-col items-center">
          {/* Decorative background glow */}
          <div className="absolute -inset-24 bg-soft-accent/5 blur-[100px] rounded-full animate-pulse-soft" />
          
          <div className="relative bg-soft-card p-8 rounded-[40px] shadow-2xl shadow-soft-accent/10 border border-soft-border flex flex-col items-center animate-in fade-in zoom-in duration-1000">
            <div className="w-20 h-20 bg-soft-accent rounded-3xl flex items-center justify-center shadow-2xl shadow-soft-accent/30 mb-6 animate-pulse-soft">
              <Wrench className="w-10 h-10 text-soft-accent-contrast" />
            </div>
            
            <div className="text-center space-y-3">
              <h2 className="text-2xl font-black text-soft-text uppercase tracking-tighter">Assistência Técnica</h2>
              <div className="flex items-center justify-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-soft-accent animate-bounce [animation-delay:-0.3s]" />
                <div className="w-1.5 h-1.5 rounded-full bg-soft-accent animate-bounce [animation-delay:-0.15s]" />
                <div className="w-1.5 h-1.5 rounded-full bg-soft-accent animate-bounce" />
              </div>
              <p className="text-[10px] font-black text-soft-text/40 uppercase tracking-[0.4em] mt-6 animate-pulse">Sincronizando Dados...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user || (!profile && !recoveryMode)) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
      {profile.role !== 'admin' && profile.role !== 'user' && (
        <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-[60]">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-slate-900 dark:bg-white p-2 rounded-xl shadow-lg shadow-slate-200 dark:shadow-none">
                {systemSettings?.logo ? (
                  <img src={systemSettings.logo} alt="Logo" className="w-5 h-5 object-contain" />
                ) : (
                  <Wrench className="w-5 h-5 text-white dark:text-slate-900" />
                )}
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight leading-none dark:text-white">{systemSettings?.companyName || 'Assistência Técnica'}</h1>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Gestão de Serviços</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative" ref={menuRef}>
                <button 
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-3 p-1.5 pr-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all active:scale-95 group"
                >
                  <div className="w-8 h-8 bg-slate-900 dark:bg-slate-700 rounded-xl flex items-center justify-center text-white font-black text-xs">
                    {profile.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">{profile.name}</p>
                    <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest mt-1">Técnico</p>
                  </div>
                  <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${showProfileMenu ? 'rotate-180' : ''}`} />
                </button>

                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-right">
                    <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Logado como</p>
                      <p className="text-sm font-black text-slate-900 dark:text-white truncate">{profile.email}</p>
                    </div>
                    <div className="p-2">
                      <button 
                        onClick={() => { setShowSettingsModal(true); setShowProfileMenu(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white rounded-2xl transition-all"
                      >
                        <UserIcon className="w-4 h-4" />
                        Meu Perfil
                      </button>
                      <button 
                        onClick={() => { setShowSettingsModal(true); setShowProfileMenu(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white rounded-2xl transition-all"
                      >
                        <KeyRound className="w-4 h-4" />
                        Redefinir Senha
                      </button>
                      {profile.permissions?.canManageSettings && (
                        <button 
                          onClick={() => { setShowSettingsModal(true); setShowProfileMenu(false); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white rounded-2xl transition-all"
                        >
                          <Palette className="w-4 h-4" />
                          Layout do Sistema
                        </button>
                      )}
                    </div>
                    <div className="p-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-black text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-all uppercase tracking-widest"
                      >
                        <LogOut className="w-4 h-4" />
                        Sair do Sistema
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
      )}

      <main className={profile.role === 'admin' || profile.role === 'user' ? "" : "max-w-7xl mx-auto px-4 py-8"}>
        {profile.role === 'admin' || profile.role === 'user' ? (
          <AdminDashboard profile={profile} />
        ) : (
          <TechnicianDashboard profile={profile} />
        )}
      </main>

      <SettingsModal 
        isOpen={showSettingsModal} 
        onClose={() => {
          setShowSettingsModal(false);
          setRecoveryMode(false);
        }} 
        profile={profile} 
        recoveryMode={recoveryMode}
      />
    </div>
  );
}
