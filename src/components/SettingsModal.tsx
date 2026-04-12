import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { supabaseService } from '../services/supabaseService';
import { SystemSettings, UserProfile } from '../types';
import { X, Upload, Palette, Sun, Moon, Monitor, Check, Loader2, Save, KeyRound } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile | null;
  recoveryMode?: boolean;
}

export default function SettingsModal({ isOpen, onClose, profile, recoveryMode }: Props) {
  const [settings, setSettings] = useState<SystemSettings>({
    theme: {
      mode: 'light',
      primaryColor: '#0071e3',
      surfaceColor: '#ffffff',
      backgroundColor: '#f8f9fa',
      chartPalette: ['#0071e3', '#34c759', '#ff9500', '#ff3b30', '#af52de']
    },
    companyName: 'OBRAX'
  });
  const [userName, setUserName] = useState(profile?.name || '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const passwordSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && recoveryMode && passwordSectionRef.current) {
      passwordSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, recoveryMode]);

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

  const fetchSettings = async () => {
    try {
      const data = await supabaseService.getSettings();
      if (data) {
        // Ensure theme object exists
        if (!data.theme) {
          data.theme = {
            mode: 'light',
            primaryColor: '#0071e3',
            surfaceColor: '#ffffff',
            backgroundColor: '#f8f9fa',
            chartPalette: ['#0071e3', '#34c759', '#ff9500', '#ff3b30', '#af52de']
          };
        }
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await supabaseService.updateProfile(profile.uid, {
        name: userName
      });
      alert('Perfil atualizado com sucesso!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Erro ao atualizar perfil.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await supabaseService.updateSettings(settings);
      // Apply theme immediately by updating CSS variables
      applyTheme(settings);
      alert('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Erro ao salvar configurações.');
    } finally {
      setSaving(false);
    }
  };

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

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings(prev => ({ ...prev, logo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: 'error', message: 'As senhas não coincidem.' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordFeedback({ type: 'error', message: 'A senha deve ter pelo menos 6 caracteres.' });
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordFeedback({ type: 'success', message: 'Senha alterada com sucesso!' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error updating password:', error);
      setPasswordFeedback({ type: 'error', message: 'Erro ao alterar senha: ' + error.message });
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Configurações do Perfil e Sistema</h2>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Personalize sua experiência</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
          {recoveryMode && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 mb-6">
              <KeyRound className="w-6 h-6 text-amber-600" />
              <div>
                <p className="text-xs font-black text-amber-900 uppercase tracking-tight">Modo de Recuperação</p>
                <p className="text-[10px] text-amber-700 font-bold">Por favor, defina sua nova senha abaixo para recuperar o acesso definitivo.</p>
              </div>
            </div>
          )}
          {/* User Profile Info */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-2">
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <Monitor className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              </div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Informações do Perfil</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome</label>
                <input 
                  type="text"
                  value={userName}
                  onChange={e => setUserName(e.target.value)}
                  className="input-field"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white">
                  {profile?.email || 'Acesso Temporário'}
                </div>
              </div>
            </div>
            <button 
              onClick={handleSaveProfile}
              disabled={saving}
              className="btn-primary w-fit flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Dados do Perfil
            </button>
          </section>

          {/* Password Reset */}
          <section ref={passwordSectionRef} className="space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-2">
              <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <KeyRound className="w-4 h-4 text-amber-600" />
              </div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Segurança</h3>
            </div>
            <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nova Senha</label>
                <input 
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="input-field"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirmar Nova Senha</label>
                <input 
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="input-field"
                  placeholder="Repita a nova senha"
                />
              </div>
              {passwordFeedback && (
                <div className={`p-3 rounded-xl text-xs font-bold ${passwordFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                  {passwordFeedback.message}
                </div>
              )}
              <button 
                type="submit"
                disabled={passwordLoading}
                className="btn-primary flex items-center gap-2"
              >
                {passwordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Atualizar Senha
              </button>
            </form>
          </section>

          {/* System Layout Customization (Admin Only) */}
          {(profile?.role === 'admin' || profile?.permissions?.canManageSettings) && (
            <section className="space-y-8">
              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-2">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Palette className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Personalização do Sistema</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Logo Upload */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome da Empresa</label>
                  <input 
                    type="text"
                    value={settings.companyName}
                    onChange={e => setSettings(prev => ({ ...prev, companyName: e.target.value }))}
                    className="input-field"
                    placeholder="Ex: Minha Empresa LTDA"
                  />
                  
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mt-4">Logomarca da Empresa</label>
                  <div className="flex flex-col items-center gap-4 p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl bg-slate-50 dark:bg-slate-800/50">
                    {settings.logo ? (
                      <div className="relative group">
                        <img src={settings.logo} alt="Logo" className="max-h-24 object-contain rounded-lg" />
                        <button 
                          onClick={() => setSettings(prev => ({ ...prev, logo: undefined }))}
                          className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-2xl flex items-center justify-center">
                        <Upload className="w-6 h-6 text-slate-400" />
                      </div>
                    )}
                    <label className="cursor-pointer px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95">
                      Selecionar Logo
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    </label>
                  </div>
                </div>

                {/* Theme Selection */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Modo do Sistema</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'light', label: 'Claro', icon: Sun },
                      { id: 'dark', label: 'Escuro', icon: Moon },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setSettings(prev => ({ 
                          ...prev, 
                          theme: { 
                            ...prev.theme, 
                            mode: t.id as 'light' | 'dark',
                            surfaceColor: t.id === 'light' ? '#ffffff' : '#161B22',
                            backgroundColor: t.id === 'light' ? '#F8F9FA' : '#0B0E14'
                          } 
                        }))}
                        className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all active:scale-95 ${
                          settings.theme.mode === t.id 
                            ? 'bg-slate-900 dark:bg-white border-slate-900 dark:border-white text-white dark:text-slate-900 shadow-lg' 
                            : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400 hover:border-slate-200'
                        }`}
                      >
                        <t.icon className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">{t.label}</span>
                        {settings.theme.mode === t.id && <Check className="w-3 h-3 ml-auto" />}
                      </button>
                    ))}
                  </div>

                  <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cor da Marca (Primária)</label>
                      <input 
                        type="color" 
                        value={settings.theme.primaryColor} 
                        onChange={e => setSettings(prev => ({ 
                          ...prev, 
                          theme: { ...prev.theme, primaryColor: e.target.value } 
                        }))}
                        className="w-10 h-10 rounded-lg cursor-pointer border-none bg-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-soft-border flex justify-end">
                <button 
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="btn-primary flex items-center gap-3"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Salvar Configurações do Sistema
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
