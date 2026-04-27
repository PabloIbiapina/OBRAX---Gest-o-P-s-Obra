import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabaseService } from '../services/supabaseService';
import { supabase } from '../supabase';
import { compressImage, uploadFile, dataURLtoBlob } from '../lib/image-utils';
import PhotoCarousel from './PhotoCarousel';
import { ServiceOrder, OSStatus, ServiceType, UserProfile, MaterialUsed, Material, UserPermissions, DocumentTemplate, OSDocument, AppNotification, ChecklistItem, PENGCrossing, RootCause, SystemSettings, ThemeConfig } from '../types';
import { Plus, Filter, FileText, Users, Package, Clock, CheckCircle, AlertCircle, MapPin, Phone, Calendar, Edit2, Trash2, X, UserPlus, Shield, HardHat, TrendingUp, Award, Timer, Search, ChevronDown, Download, FileSpreadsheet, File as FileIcon, FileCode, Save, Eye, Loader2, Mail, Maximize2, Bell, Wrench, FileCheck, BarChart3, Trophy, PieChart as PieChartIcon, Copy, ExternalLink, Camera, Edit3, Paperclip, User, ShieldCheck, Info, Layers, Settings, KeyRound, Zap, ShieldAlert, DollarSign, Target, BookOpen, Upload, LayoutDashboard, AlertTriangle, Book, TrendingDown, Menu, ClipboardCheck, Play, Printer, Scale, ChevronLeft, ChevronRight, Quote, Check, Percent } from 'lucide-react';
import { format, startOfDay, startOfWeek, startOfMonth, startOfYear, isAfter, isBefore, differenceInMinutes, differenceInHours, parseISO, endOfDay, differenceInYears, addYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { WARRANTY_PERIODS } from '../constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, LineChart, Line, AreaChart, Area, ComposedChart } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, HeadingLevel, AlignmentType, TextRun } from 'docx';
import PptxGenJS from 'pptxgenjs';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import SignatureCanvas from 'react-signature-canvas';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import * as mammoth from 'mammoth';

type Tab = 'dashboard' | 'os' | 'reports' | 'users' | 'materials' | 'documents' | 'management_impact' | 'pericial_report' | 'settings';

const DEFAULT_MATERIALS = [
  { name: 'Cimento Portland CP II', unit: 'Saco 50kg' },
  { name: 'Argamassa ACIII', unit: 'Saco 20kg' },
  { name: 'Silicone Incolor', unit: 'Tubo' },
  { name: 'Piso Cerâmico 54cm x 54cm', unit: 'm²' },
  { name: 'Rejunte Cinza Platina', unit: 'kg' },
  { name: 'Joelho 90º LR Azul', unit: 'Un' },
  { name: 'Tubo PVC 100mm', unit: 'Barra 6m' },
  { name: 'Fio Flexível 2.5mm', unit: 'Rolo 100m' },
  { name: 'Disjuntor 20A', unit: 'Un' },
  { name: 'Tinta Acrílica Branca', unit: 'Lata 18L' },
];

const SERVICE_TYPES: ServiceType[] = [
  'elétrica', 
  'hidráulica', 
  'pintura', 
  'manutenção geral',
  'estrutural',
  'pisos e revestimentos',
  'forro e cobertura',
  'louças e metais',
  'impermeabilização',
  'esquadrias'
];

interface Props {
  profile: UserProfile;
}

const COLORS = ['#0f172a', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const DEFAULT_PRE_INSPECTION = [
  { id: '1', label: 'Local seguro para trabalho', checked: false },
  { id: '2', label: 'Ferramentas necessárias disponíveis', checked: false },
  { id: '3', label: 'EPIs em uso', checked: false },
  { id: '4', label: 'Área isolada (se necessário)', checked: false }
];

const DEFAULT_COMPLETION_CHECKLIST = [
  { id: '1', label: 'Serviço testado e aprovado', checked: false },
  { id: '2', label: 'Local limpo e organizado', checked: false },
  { id: '3', label: 'Ferramentas recolhidas', checked: false },
  { id: '4', label: 'Cliente ciente da conclusão', checked: false }
];

interface SettingsTabProps {
  settings: SystemSettings;
  handleSaveSettings: (newSettings: SystemSettings) => Promise<void>;
  getContrastColor: (hexcolor: string) => string;
}

const SettingsTab = ({ settings, handleSaveSettings, getContrastColor }: SettingsTabProps) => {
  const [localSettings, setLocalSettings] = useState<SystemSettings>(settings);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const url = await uploadFile(file, `settings/logo_${Date.now()}`);
        setLocalSettings({
          ...localSettings,
          logo: url
        });
      } catch (error) {
        console.error('Erro ao fazer upload do logo:', error);
      }
    }
  };

  const handleColorChange = (color: string) => {
    setLocalSettings({
      ...localSettings,
      theme: {
        ...localSettings.theme,
        primaryColor: color
      }
    });
  };

  const handleModeChange = (mode: 'light' | 'dark') => {
    const isDark = mode === 'dark';
    setLocalSettings({
      ...localSettings,
      theme: {
        ...localSettings.theme,
        mode,
        backgroundColor: isDark ? '#0b0e14' : '#f8f9fa',
        surfaceColor: isDark ? '#161b22' : '#ffffff',
      }
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h2 className="text-4xl font-black text-soft-text tracking-tight uppercase">Configurações</h2>
          <p className="text-sm font-medium text-soft-text/50 uppercase tracking-widest flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-soft-success" />
            Personalização de Marca e Experiência do Usuário
          </p>
        </div>
        <button 
          onClick={() => handleSaveSettings(localSettings)}
          className="btn-primary flex items-center justify-center gap-3 px-8 py-4 text-sm shadow-xl shadow-soft-accent/20 hover:scale-105 active:scale-95 transition-all"
          title="Salvar todas as alterações de marca e tema."
        >
          <Save className="w-5 h-5" />
          Salvar Configurações
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Identidade Visual */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bento-card bg-white shadow-xl shadow-black/5">
            <div className="flex items-center gap-4 mb-10">
              <div className="p-3 bg-soft-accent/10 rounded-2xl">
                <LayoutDashboard className="w-6 h-6 text-soft-accent" />
              </div>
              <div>
                <h3 className="text-lg font-black text-soft-text uppercase tracking-widest">Identidade Visual</h3>
                <p className="text-[10px] font-bold text-soft-text/30 uppercase tracking-widest mt-1">Como sua marca aparece nos relatórios e dashboard</p>
              </div>
            </div>

            <div className="space-y-10">
              <div className="group">
                <label className="block text-[10px] font-black text-soft-text/60 uppercase tracking-widest mb-3 ml-1 group-focus-within:text-soft-accent transition-colors">Nome da Empresa / Organização</label>
                <input 
                  type="text"
                  value={localSettings.companyName}
                  onChange={e => setLocalSettings({...localSettings, companyName: e.target.value})}
                  placeholder="Ex: OBRAX Engenharia"
                  className="w-full px-6 py-4 bg-soft-bg border-2 border-soft-border rounded-2xl text-sm font-bold outline-none focus:border-soft-accent focus:bg-white focus:ring-8 focus:ring-soft-accent/5 transition-all placeholder:text-soft-text/20"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-soft-text/60 uppercase tracking-widest mb-3 ml-1">Logotipo da Empresa</label>
                <div className="flex flex-col md:flex-row items-center gap-8 p-8 bg-soft-bg/50 rounded-[32px] border-2 border-dashed border-soft-border hover:border-soft-accent/30 transition-colors">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="relative w-32 h-32 bg-white rounded-3xl border-2 border-soft-border flex items-center justify-center overflow-hidden cursor-pointer hover:border-soft-accent hover:shadow-2xl hover:shadow-soft-accent/10 transition-all group shrink-0"
                  >
                    {localSettings.logo ? (
                      <>
                        <img src={localSettings.logo} alt="Logo Preview" className="max-w-full max-h-full object-contain p-4" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity gap-2">
                          <Camera className="w-8 h-8 text-white" />
                          <span className="text-[8px] font-black text-white uppercase tracking-widest">Alterar</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-3 text-soft-text/20">
                        <Upload className="w-8 h-8" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Upload Logo</span>
                      </div>
                    )}
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleLogoUpload} 
                      accept="image/*" 
                      className="hidden" 
                    />
                  </div>
                  <div className="flex-1 space-y-4 text-center md:text-left">
                    <div className="space-y-1">
                      <h4 className="text-sm font-black text-soft-text uppercase tracking-widest">Upload de Logotipo</h4>
                      <p className="text-[11px] font-medium text-soft-text/40 leading-relaxed">
                        Arraste uma imagem ou clique no box para selecionar. Recomendamos arquivos <span className="font-black text-soft-text/60">SVG</span> ou <span className="font-black text-soft-text/60">PNG transparente</span> de alta resolução.
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-center md:justify-start gap-3">
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="px-6 py-3 bg-soft-accent text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-soft-accent/90 transition-all shadow-lg shadow-soft-accent/20 flex items-center gap-2"
                        title="Escolher um arquivo de imagem para o logotipo."
                      >
                        <Upload className="w-4 h-4" />
                        Selecionar Arquivo
                      </button>
                      {localSettings.logo && (
                        <button 
                          onClick={() => setLocalSettings({...localSettings, logo: ''})}
                          className="px-6 py-3 bg-white text-soft-danger border border-soft-danger/20 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-soft-danger/5 transition-all flex items-center gap-2"
                          title="Remover o logotipo atual."
                        >
                          <Trash2 className="w-4 h-4" />
                          Remover
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Motor de Temas */}
        <div className="space-y-8">
          <div className="bento-card bg-white shadow-xl shadow-black/5">
            <div className="flex items-center gap-4 mb-10">
              <div className="p-3 bg-soft-accent/10 rounded-2xl">
                <Zap className="w-6 h-6 text-soft-accent" />
              </div>
              <div>
                <h3 className="text-lg font-black text-soft-text uppercase tracking-widest">Interface</h3>
                <p className="text-[10px] font-bold text-soft-text/30 uppercase tracking-widest mt-1">Esquema de cores e modo visual</p>
              </div>
            </div>

            <div className="space-y-10">
              <div>
                <label className="block text-[10px] font-black text-soft-text/60 uppercase tracking-widest mb-4 ml-1">Modo de Exibição</label>
                <div className="grid grid-cols-1 gap-4">
                  <button 
                    onClick={() => handleModeChange('light')}
                    className={`p-5 rounded-3xl border-2 transition-all flex items-center gap-4 ${localSettings.theme.mode === 'light' ? 'border-soft-accent bg-soft-accent/5 ring-8 ring-soft-accent/5' : 'border-soft-border hover:bg-soft-bg'}`}
                    title="Ativar o modo claro (Light Mode)."
                  >
                    <div className="w-12 h-12 bg-white rounded-xl border-2 border-soft-border shadow-sm flex items-center justify-center">
                      <div className="w-6 h-6 rounded-full bg-soft-accent/20" />
                    </div>
                    <div className="text-left">
                      <span className="block text-[11px] font-black uppercase tracking-widest text-soft-text">Soft Light</span>
                      <span className="text-[9px] font-bold text-soft-text/30 uppercase tracking-widest">Claro e Minimalista</span>
                    </div>
                  </button>
                  <button 
                    onClick={() => handleModeChange('dark')}
                    className={`p-5 rounded-3xl border-2 transition-all flex items-center gap-4 ${localSettings.theme.mode === 'dark' ? 'border-soft-accent bg-soft-accent/5 ring-8 ring-soft-accent/5' : 'border-soft-border hover:bg-soft-bg'}`}
                    title="Ativar o modo escuro (Dark Mode)."
                  >
                    <div className="w-12 h-12 bg-[#0b0e14] rounded-xl border-2 border-white/10 shadow-sm flex items-center justify-center">
                      <div className="w-6 h-6 rounded-full bg-soft-accent" />
                    </div>
                    <div className="text-left">
                      <span className="block text-[11px] font-black uppercase tracking-widest text-soft-text">Deep Night</span>
                      <span className="text-[9px] font-bold text-soft-text/30 uppercase tracking-widest">Foco e Profundidade</span>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-soft-text/60 uppercase tracking-widest mb-4 ml-1">Cor da Marca</label>
                <div className="grid grid-cols-4 gap-3">
                  {['#0071e3', '#000000', '#1d1d1f', '#34c759', '#ff9500', '#ff3b30', '#af52de', '#5856d6'].map(color => (
                    <button 
                      key={color}
                      onClick={() => handleColorChange(color)}
                      className={`aspect-square rounded-2xl border-4 transition-all hover:scale-110 flex items-center justify-center ${localSettings.theme.primaryColor === color ? 'border-soft-text ring-8 ring-soft-text/5' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                      title={`Selecionar cor ${color}`}
                    >
                      {localSettings.theme.primaryColor === color && <CheckCircle className="w-4 h-4 text-white mix-blend-difference" />}
                    </button>
                  ))}
                  <div className="relative aspect-square rounded-2xl border-2 border-dashed border-soft-border flex items-center justify-center overflow-hidden hover:border-soft-accent transition-colors" title="Escolher uma cor personalizada.">
                    <input 
                      type="color"
                      value={localSettings.theme.primaryColor}
                      onChange={e => handleColorChange(e.target.value)}
                      className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                    />
                    <Plus className="w-5 h-5 text-soft-text/20" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Section */}
      <div className="bento-card bg-soft-bg/30 border-dashed border-2 border-soft-border overflow-hidden">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-soft-success/10 rounded-xl">
              <Eye className="w-5 h-5 text-soft-success" />
            </div>
            <h3 className="text-[10px] font-black text-soft-text uppercase tracking-widest">Preview em Tempo Real</h3>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-soft-success/10 rounded-full border border-soft-success/20">
            <div className="w-1.5 h-1.5 rounded-full bg-soft-success animate-pulse" />
            <span className="text-[8px] font-black text-soft-success uppercase tracking-widest">Acessibilidade Validada</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-soft-border shadow-sm">
              <div className="w-12 h-12 bg-soft-bg rounded-xl flex items-center justify-center overflow-hidden">
                {localSettings.logo ? <img src={localSettings.logo} alt="Logo" className="max-w-full max-h-full object-contain p-1" /> : <div className="w-6 h-6 bg-soft-accent/20 rounded-full" />}
              </div>
              <div>
                <h4 className="text-sm font-black text-soft-text uppercase tracking-tight">{localSettings.companyName || 'Sua Empresa'}</h4>
                <p className="text-[9px] font-bold text-soft-text/30 uppercase tracking-widest">Dashboard Administrativo</p>
              </div>
            </div>
            <div className="p-6 bg-white rounded-3xl border border-soft-border shadow-sm space-y-4">
              <div className="h-2 w-24 bg-soft-bg rounded-full" />
              <div className="space-y-2">
                <div className="h-2 w-full bg-soft-bg rounded-full" />
                <div className="h-2 w-2/3 bg-soft-bg rounded-full" />
              </div>
              <div className="pt-4">
                <button 
                  className="w-full py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                  style={{ backgroundColor: localSettings.theme.primaryColor, color: getContrastColor(localSettings.theme.primaryColor) }}
                >
                  Botão de Exemplo
                </button>
              </div>
            </div>
          </div>
          <div className="flex flex-col justify-center space-y-4">
            <div className="p-6 bg-white rounded-3xl border border-soft-border shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: localSettings.theme.primaryColor + '20' }}>
                  <TrendingUp className="w-4 h-4" style={{ color: localSettings.theme.primaryColor }} />
                </div>
                <span className="text-[10px] font-black text-soft-text uppercase tracking-widest">Métrica de Crescimento</span>
              </div>
              <div className="text-2xl font-black text-soft-text">+24.8%</div>
            </div>
            <p className="text-[10px] font-medium text-soft-text/40 leading-relaxed italic">
              * O preview acima reflete como as cores e o logotipo serão aplicados nos componentes principais do sistema.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};


export default function AdminDashboard({ profile }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [systemUsers, setSystemUsers] = useState<UserProfile[]>([]);
  const [materialsDB, setMaterialsDB] = useState<Material[]>([]);
  const [documentTemplates, setDocumentTemplates] = useState<DocumentTemplate[]>([]);
  const [showOSForm, setShowOSForm] = useState(false);
  const [editingOS, setEditingOS] = useState<ServiceOrder | null>(null);
  const [viewingOS, setViewingOS] = useState<ServiceOrder | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'cliente' | 'descricao' | 'materiais' | 'vistoria' | 'historico' | 'peng'>('cliente');
  const [activeReportTab, setActiveReportTab] = useState<'geral' | 'financeiro'>('geral');
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [showDocumentForm, setShowDocumentForm] = useState(false);
  const [showDocPreview, setShowDocPreview] = useState(false);
  const [editingDocument, setEditingDocument] = useState<DocumentTemplate | null>(null);
  const [isGeneratingPericialReport, setIsGeneratingPericialReport] = useState(false);
  const [pericialSearch, setPericialSearch] = useState('');
  const [pericialAuditor, setPericialAuditor] = useState('');
  const [pericialShowPhotos, setPericialShowPhotos] = useState(true);
  const [pericialShowFinancial, setPericialShowFinancial] = useState(true);
  const [reportPeriod, setReportPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [reportServiceType, setReportServiceType] = useState<ServiceType | 'Todos'>('Todos');
  const [reportTechId, setReportTechId] = useState<string | 'Todos'>('Todos');
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
  const [confirmation, setConfirmation] = useState<{ message: string, onConfirm: () => void } | null>(null);
  const [filter, setFilter] = useState<OSStatus | 'Todos'>('Todos');
  const [houseNumberFilter, setHouseNumberFilter] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const quillRef = useRef<any>(null);

  const quillImageHandler = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (file) {
        try {
          const url = await uploadFile(file, `documents/images/${Date.now()}_${file.name}`);
          const quill = quillRef.current?.getEditor();
          const range = quill?.getSelection();
          if (quill && range) {
            quill.insertEmbed(range.index, 'image', url);
          }
        } catch (error) {
          console.error('Error uploading image to Quill:', error);
          showError('Erro ao fazer upload da imagem para o editor.');
        }
      }
    };
  };

  const quillModules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'align': [] }],
        ['link', 'image'],
        ['clean']
      ],
      handlers: {
        image: quillImageHandler
      }
    }
  }), []);

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

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showSuccess = (message: string) => setNotification({ message, type: 'success' });
  const showError = (message: string) => setNotification({ message, type: 'error' });
  const showInfo = (message: string) => setNotification({ message, type: 'info' });

  const confirmAction = (message: string, onConfirm: () => void) => {
    setConfirmation({ message, onConfirm });
  };

  // Calculate contrast color (black or white) based on hex color
  const getContrastColor = (hexcolor: string) => {
    if (!hexcolor) return '#ffffff';
    const r = parseInt(hexcolor.substring(1, 3), 16);
    const g = parseInt(hexcolor.substring(3, 5), 16);
    const b = parseInt(hexcolor.substring(5, 7), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#1d1d1f' : '#ffffff';
  };

  useEffect(() => {
    const root = document.documentElement;
    const { theme } = settings;
    
    if (theme.mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    root.style.setProperty('--primary-color', theme.primaryColor);
    root.style.setProperty('--primary-contrast', getContrastColor(theme.primaryColor));
    root.style.setProperty('--bg-color', theme.backgroundColor);
    root.style.setProperty('--surface-color', theme.surfaceColor);
  }, [settings.theme]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await supabaseService.getSettings();
        if (data) {
          setSettings(data);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    };
    fetchSettings();

    // Real-time settings
    const subscription = supabase
      .channel('settings_changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'settings', filter: 'id=eq.system' }, (payload) => {
        setSettings(payload.new.data as SystemSettings);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedTechFilter, setSelectedTechFilter] = useState('Todos');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('Todos');
  const [timelinePeriod, setTimelinePeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');

  // OS Form state
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [address, setAddress] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [block, setBlock] = useState('');
  const [unit, setUnit] = useState('');
  const [tower, setTower] = useState('');
  const [floor, setFloor] = useState('');
  const [serviceType, setServiceType] = useState<ServiceType>('manutenção geral');
  const [description, setDescription] = useState('');
  const [osMaterials, setOsMaterials] = useState<MaterialUsed[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [newMaterialQty, setNewMaterialQty] = useState(1);
  const [assignedTechId, setAssignedTechId] = useState('');
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [preInspection, setPreInspection] = useState<ChecklistItem[]>([]);
  const [completionChecklist, setCompletionChecklist] = useState<ChecklistItem[]>([]);
  const [attachments, setAttachments] = useState<{ name: string; url: string }[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [userFormErrors, setUserFormErrors] = useState<Record<string, string>>({});
  const [materialFormErrors, setMaterialFormErrors] = useState<Record<string, string>>({});
  const [docFormErrors, setDocFormErrors] = useState<Record<string, string>>({});
  const [inviteFormErrors, setInviteFormErrors] = useState<Record<string, string>>({});
  const [osFormTab, setOsFormTab] = useState<'cliente' | 'serviço' | 'vistoria' | 'mídia' | 'documentos'>('cliente');
  const [habiteSeDate, setHabiteSeDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [fullscreenSignature, setFullscreenSignature] = useState<{
    type: 'pre_client' | 'pre_tech' | 'finish_client' | 'finish_tech' | 'doc_client' | 'doc_rep',
    title: string
  } | null>(null);

  const validateOSForm = () => {
    const errors: Record<string, string> = {};
    if (!clientName.trim()) errors.clientName = 'Nome do cliente é obrigatório';
    
    // Basic phone validation (Brazilian format)
    const phoneRegex = /^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/;
    if (!clientPhone.trim()) {
      errors.clientPhone = 'Telefone é obrigatório';
    } else if (!phoneRegex.test(clientPhone)) {
      errors.clientPhone = 'Formato inválido: (00) 00000-0000';
    }

    if (!address.trim()) errors.address = 'Endereço é obrigatório';
    if (!houseNumber.trim()) errors.houseNumber = 'Casa/Unidade é obrigatória';
    if (!habiteSeDate) errors.habiteSeDate = 'Data do Habite-se é obrigatória';
    if (!description.trim()) errors.description = 'Descrição é obrigatória';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateMaterialForm = () => {
    const errors: Record<string, string> = {};
    if (!matName.trim()) errors.name = 'Nome do material é obrigatório';
    if (!matUnit.trim()) errors.unit = 'Unidade é obrigatória';
    if (matPrice <= 0) errors.price = 'Preço de venda deve ser maior que zero';
    if (matCost <= 0) errors.cost = 'Custo deve ser maior que zero';
    setMaterialFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateDocumentForm = () => {
    const errors: Record<string, string> = {};
    if (!docName.trim()) errors.name = 'Nome do documento é obrigatório';
    if (!docContent.trim()) errors.content = 'Conteúdo do documento é obrigatório';
    setDocFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateUserForm = () => {
    const errors: Record<string, string> = {};
    if (!userName.trim()) errors.name = 'Nome é obrigatório';
    setUserFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateInviteForm = () => {
    const errors: Record<string, string> = {};
    if (!inviteName.trim()) errors.name = 'Nome é obrigatório';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!inviteEmail.trim()) {
      errors.email = 'E-mail é obrigatório';
    } else if (!emailRegex.test(inviteEmail)) {
      errors.email = 'E-mail inválido';
    }
    setInviteFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const getPENGAnalysis = (description: string, serviceType: ServiceType): { crossings: PENGCrossing[], rootCause: RootCause, criticalIndex: number, saving: number } => {
    const desc = description.toLowerCase();
    const crossings: PENGCrossing[] = [];
    let rootCause: RootCause = 'execution';
    let criticalIndex = 40;
    let saving = 1500; // Base saving per normalization

    // NBR 15575 - Desempenho
    if (desc.includes('infiltração') || desc.includes('vazamento') || desc.includes('umidade')) {
      crossings.push({
        nbr: 'NBR 15575-6',
        description: 'Sistemas hidrossanitários - Desempenho',
        normalizationAction: 'Revisar estanqueidade de conexões e caimento de ralos conforme projeto hidráulico.'
      });
      rootCause = 'execution';
      criticalIndex = 85;
      saving = 4500;
    }

    if (desc.includes('fissura') || desc.includes('trinca') || desc.includes('rachadura')) {
      crossings.push({
        nbr: 'NBR 6118',
        description: 'Projeto de estruturas de concreto - Procedimento',
        normalizationAction: 'Avaliar recalque diferencial ou tensões térmicas. Reforçar armadura de pele se necessário.'
      });
      rootCause = 'design';
      criticalIndex = 90;
      saving = 12000;
    }

    if (desc.includes('revestimento') || desc.includes('descolamento') || desc.includes('piso')) {
      crossings.push({
        nbr: 'NBR 13753',
        description: 'Revestimento de pisos internos ou externos com placas cerâmicas',
        normalizationAction: 'Verificar tempo em aberto da argamassa e técnica de dupla colagem.'
      });
      rootCause = 'execution';
      criticalIndex = 60;
      saving = 3200;
    }

    if (desc.includes('elétrica') || desc.includes('curto') || desc.includes('disjuntor')) {
      crossings.push({
        nbr: 'NBR 5410',
        description: 'Instalações elétricas de baixa tensão',
        normalizationAction: 'Dimensionar condutores e proteções conforme carga instalada e fator de agrupamento.'
      });
      rootCause = 'specification';
      criticalIndex = 95;
      saving = 5500;
    }

    return { crossings, rootCause, criticalIndex, saving };
  };

  const isUnderWarranty = useMemo(() => {
    if (!habiteSeDate) return true;
    try {
      const warrantyPeriod = WARRANTY_PERIODS[serviceType] || 0;
      const expirationDate = addYears(parseISO(habiteSeDate), warrantyPeriod);
      return isBefore(new Date(), expirationDate);
    } catch (e) {
      return true;
    }
  }, [habiteSeDate, serviceType]);

  // Automatic Deadline Calculation
  useEffect(() => {
    if (habiteSeDate && serviceType) {
      try {
        const warrantyPeriod = WARRANTY_PERIODS[serviceType] || 0;
        const habiteDate = parseISO(habiteSeDate);
        const calculatedDeadline = addYears(habiteDate, warrantyPeriod);
        setDeadline(format(calculatedDeadline, 'yyyy-MM-dd'));
      } catch (e) {
        console.error('Erro ao calcular prazo:', e);
      }
    }
  }, [habiteSeDate, serviceType]);

  const exportOSToPDF = (os: ServiceOrder, preview: boolean = false) => {
    const layoutTemplate = os.requiredDocuments?.find(d => d.type === 'os_layout');
    const doc = new jsPDF({
      format: layoutTemplate?.paperSize?.toLowerCase() || 'a4'
    });
    const tech = systemUsers.find(u => u.uid === os.assignedTechnicianId);

    let currentY = 20;

    if (layoutTemplate?.headerImage) {
      try {
        const config = layoutTemplate.headerImageConfig || { width: '100%', height: 'auto', top: '0', left: '0', isBackground: false, opacity: 1 };
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        
        // Convert mm to points (approx 1mm = 2.83pt)
        const w = config.width?.includes('%') ? (parseFloat(config.width) / 100) * pageWidth : parseFloat(config.width || '210');
        const h = config.height?.includes('%') ? (parseFloat(config.height) / 100) * pageHeight : parseFloat(config.height || '40');
        const t = parseFloat(config.top || '0');
        const l = parseFloat(config.left || '0');
        
        if (config.isBackground) {
          doc.addImage(layoutTemplate.headerImage, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST', 0);
        } else {
          doc.addImage(layoutTemplate.headerImage, 'PNG', l, t, w, h);
          currentY = Math.max(currentY, t + h + 10);
        }
      } catch (e) {
        console.error('Error adding header image to PDF:', e);
      }
    } else {
      // Default Header
      doc.setFillColor(29, 29, 31); // soft-text
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setFontSize(24);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('ORDEM DE SERVIÇO', 20, 25);
      
      doc.setFontSize(9);
      doc.setTextColor(200, 200, 200);
      doc.setFont('helvetica', 'normal');
      doc.text('RELATÓRIO TÉCNICO DE ATENDIMENTO', 20, 32);

      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text(`#${os.id.slice(-8).toUpperCase()}`, 190, 25, { align: 'right' });
      currentY = 55;
    }

    // Client Info
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('INFORMAÇÕES DO CLIENTE', 20, currentY);
    currentY += 5;
    doc.setDrawColor(226, 232, 240);
    doc.line(20, currentY, 190, currentY);
    currentY += 10;

    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(os.clientName.toUpperCase(), 20, currentY);
    currentY += 7;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Telefone: ${os.clientPhone}`, 20, currentY);
    currentY += 5;
    doc.text(`Endereço: ${os.address}, ${os.houseNumber}`, 20, currentY);
    currentY += 15;

    // Service Details
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('DETALHES DA SOLICITAÇÃO', 20, currentY);
    currentY += 5;
    doc.line(20, currentY, 190, currentY);
    currentY += 10;

    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(`Tipo: ${os.serviceType.toUpperCase()}`, 20, currentY);
    doc.text(`Status: ${os.status.toUpperCase()}`, 190, currentY, { align: 'right' });
    currentY += 8;

    if (os.habiteSeDate) {
      doc.setFontSize(9);
      if (os.isUnderWarranty) {
        doc.setTextColor(16, 185, 129); // emerald-500
      } else {
        doc.setTextColor(239, 68, 68); // red-500
      }
      doc.text(`VERIFICAÇÃO DE PROCEDÊNCIA: ${os.isUnderWarranty ? 'PROCEDENTE' : 'IMPROCEDENTE'} (${os.isUnderWarranty ? 'DENTRO DA GARANTIA' : 'GARANTIA EXPIRADA'})`, 20, currentY);
      currentY += 5;
      doc.setTextColor(100, 116, 139);
      doc.text(`Habite-se: ${format(parseISO(os.habiteSeDate), 'dd/MM/yyyy')} • Prazo Normativo: ${os.warrantyYears || 0} anos`, 20, currentY);
      currentY += 5;
    }

    if (os.deadline) {
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Prazo de Finalização: ${format(parseISO(os.deadline), 'dd/MM/yyyy')}`, 20, currentY);
      currentY += 5;
    }

    if (os.habiteSeDate || os.deadline) {
      currentY += 5;
    }

    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');
    const splitDesc = doc.splitTextToSize(os.description, 170);
    doc.text(splitDesc, 20, currentY);
    currentY += (splitDesc.length * 5) + 10;

    // Schedule
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('CRONOGRAMA', 20, currentY);
    currentY += 5;
    doc.line(20, currentY, 190, currentY);
    currentY += 10;

    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`Abertura: ${format(parseISO(os.createdAt), 'dd/MM/yyyy HH:mm')}`, 20, currentY);
    if (os.startedAt) {
      doc.text(`Início: ${format(parseISO(os.startedAt), 'dd/MM/yyyy HH:mm')}`, 85, currentY);
    }
    if (os.finishedAt) {
      doc.text(`Conclusão: ${format(parseISO(os.finishedAt), 'dd/MM/yyyy HH:mm')}`, 150, currentY);
    }
    currentY += 15;

    // Checklists
    const renderChecklist = (title: string, items: ChecklistItem[]) => {
      if (!items || items.length === 0) return;
      if (currentY > 240) { doc.addPage(); currentY = 20; }
      
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(title.toUpperCase(), 20, currentY);
      currentY += 5;
      doc.line(20, currentY, 190, currentY);
      currentY += 10;

      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      items.forEach(item => {
        if (currentY > 270) { doc.addPage(); currentY = 20; }
        doc.text(`[${item.checked ? 'X' : ' '}] ${item.label}`, 25, currentY);
        if (item.observation) {
          currentY += 5;
          doc.setTextColor(100, 116, 139);
          doc.setFontSize(8);
          doc.text(`   Obs: ${item.observation}`, 25, currentY);
          doc.setTextColor(15, 23, 42);
          doc.setFontSize(9);
        }
        currentY += 7;
      });
      currentY += 10;
    };

    renderChecklist('Vistoria Prévia', os.preInspection || []);
    renderChecklist('Checklist de Conclusão', os.completionChecklist || []);

    // Vistoria Details
    if (os.surveyCompleted) {
      if (currentY > 240) { doc.addPage(); currentY = 20; }
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text('DETALHES DA VISTORIA', 20, currentY);
      currentY += 5;
      doc.line(20, currentY, 190, currentY);
      currentY += 10;

      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(`Realizada em: ${format(parseISO(os.surveyAt!), 'dd/MM/yyyy HH:mm')}`, 20, currentY);
      currentY += 7;
      
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('Observações:', 20, currentY);
      currentY += 5;
      
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      const splitObs = doc.splitTextToSize(os.observations || 'Sem observações.', 170);
      doc.text(splitObs, 20, currentY);
      currentY += (splitObs.length * 5) + 10;
    }

    // Photos
    const renderPhotos = (title: string, photos: string[]) => {
      if (!photos || photos.length === 0) return;
      if (currentY > 220) { doc.addPage(); currentY = 20; }
      
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(title.toUpperCase(), 20, currentY);
      currentY += 5;
      doc.line(20, currentY, 190, currentY);
      currentY += 10;

      let xPos = 20;
      photos.forEach((photo, idx) => {
        if (xPos > 160) {
          xPos = 20;
          currentY += 45;
        }
        if (currentY > 240) {
          doc.addPage();
          currentY = 20;
          xPos = 20;
        }
        try {
          doc.addImage(photo, 'JPEG', xPos, currentY, 40, 40);
        } catch (e) {
          console.error('Error adding image to PDF:', e);
        }
        xPos += 45;
      });
      currentY += 55;
    };

    renderPhotos('Fotos do Local (Antes)', os.beforePhotos || []);
    renderPhotos('Fotos do Serviço (Depois)', os.afterPhotos || []);

    // Materials
    if (os.materials && os.materials.length > 0) {
      if (currentY > 240) { doc.addPage(); currentY = 20; }
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text('MATERIAIS UTILIZADOS', 20, currentY);
      currentY += 5;
      doc.line(20, currentY, 190, currentY);
      currentY += 5;
      
      const matData = os.materials.map(m => [m.name, `${m.quantity} ${m.unit}`]);
      autoTable(doc, {
        startY: currentY,
        head: [['Material', 'Quantidade']],
        body: matData,
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42] },
        margin: { left: 20, right: 20 }
      });
      currentY = (doc as any).lastAutoTable.finalY + 20;
    }

    // Documents
    if (os.requiredDocuments && os.requiredDocuments.length > 0) {
      if (currentY > 220) { doc.addPage(); currentY = 20; }
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text('DOCUMENTOS DE CIÊNCIA', 20, currentY);
      currentY += 5;
      doc.line(20, currentY, 190, currentY);
      currentY += 10;

      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      os.requiredDocuments.forEach(d => {
        const splitDoc = doc.splitTextToSize(`${d.name}:\n${d.content}`, 170);
        if (currentY + (splitDoc.length * 4) > 270) { doc.addPage(); currentY = 20; }
        doc.text(splitDoc, 20, currentY);
        currentY += (splitDoc.length * 4) + 5;
      });
    }

    // Pre-Inspection Signatures
    if (os.preInspectionSignatureClient || os.preInspectionSignatureTech) {
      if (currentY > 240) { doc.addPage(); currentY = 20; }
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text('ASSINATURAS DA VISTORIA PRÉVIA', 20, currentY);
      currentY += 5;
      doc.line(20, currentY, 190, currentY);
      currentY += 25;

      if (os.preInspectionSignatureTech) {
        try { doc.addImage(os.preInspectionSignatureTech, 'PNG', 25, currentY - 20, 40, 15); } catch (e) {}
      }
      if (os.preInspectionSignatureClient) {
        try { doc.addImage(os.preInspectionSignatureClient, 'PNG', 125, currentY - 20, 40, 15); } catch (e) {}
      }

      doc.setDrawColor(200, 200, 200);
      doc.line(20, currentY, 90, currentY);
      doc.line(120, currentY, 190, currentY);
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text('Técnico (Vistoria)', 55, currentY + 5, { align: 'center' });
      doc.text('Cliente (Vistoria)', 155, currentY + 5, { align: 'center' });
      currentY += 20;
    }

    // Signatures (Final)
    if (currentY > 240) { doc.addPage(); currentY = 20; }
    currentY += 30;
    
    if (os.signature) {
      try {
        doc.addImage(os.signature, 'PNG', 135, currentY - 25, 40, 20);
      } catch (e) {
        console.error('Error adding signature to PDF:', e);
      }
    }

    doc.setDrawColor(200, 200, 200);
    doc.line(20, currentY, 90, currentY);
    doc.line(120, currentY, 190, currentY);
    doc.setFontSize(8);
    doc.text('Assinatura do Técnico', 55, currentY + 5, { align: 'center' });
    doc.text(tech?.name || '____________________', 55, currentY + 10, { align: 'center' });
    doc.text('Assinatura do Cliente', 155, currentY + 5, { align: 'center' });
    doc.text(os.clientName || '____________________', 155, currentY + 10, { align: 'center' });
if (settings?.plan !== 'enterprise') {
  const pgH = doc.internal.pageSize.getHeight();
  doc.setFontSize(7);
  doc.setTextColor(180, 180, 180);
  doc.setFont('helvetica', 'normal');
  doc.text('Documento gerado por OBRAX — Gestão Pós-Obra · obrax.com.br', 105, pgH - 6, { align: 'center' });
}
    if (preview) {
      window.open(doc.output('bloburl'), '_blank');
    } else {
      doc.save(`OS_${os.clientName}_${os.id.slice(-6)}.pdf`);
    }
  };

  const exportOSToJPEG = async (id: string) => {
    const element = document.getElementById(`os-details-${id}`);
    if (element) {
      try {
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });
        const imgData = canvas.toDataURL('image/jpeg', 0.9);
        saveAs(imgData, `OS_${id.slice(-6).toUpperCase()}.jpg`);
      } catch (error) {
        console.error('Error exporting JPEG:', error);
      }
    }
  };

  const exportWarehouseGuide = async (os: ServiceOrder) => {
    const doc = new jsPDF();
    const tech = systemUsers.find(u => u.uid === os.assignedTechnicianId);

    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('GUIA DE SOLICITAÇÃO', 20, 20);
    doc.setFontSize(10);
    doc.text('ALMOXARIFADO / SUPRIMENTOS', 20, 30);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text(`OS: #${os.id.slice(-8).toUpperCase()}`, 150, 20);
    doc.text(`Data: ${format(new Date(), 'dd/MM/yyyy')}`, 150, 30);

    let currentY = 50;

    // Info
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('INFORMAÇÕES DO ATENDIMENTO', 20, currentY);
    currentY += 5;
    doc.line(20, currentY, 190, currentY);
    currentY += 10;

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(`Técnico: ${tech?.name || 'Não designado'}`, 20, currentY);
    doc.text(`Cliente: ${os.clientName}`, 120, currentY);
    currentY += 10;
    doc.text(`Local: ${os.address}, ${os.houseNumber || ''}`, 20, currentY);
    currentY += 20;

    // Materials Table
    doc.setTextColor(100, 116, 139);
    doc.text('MATERIAIS SOLICITADOS', 20, currentY);
    currentY += 5;
    doc.line(20, currentY, 190, currentY);
    currentY += 10;

    if (os.materials && os.materials.length > 0) {
      const matData = os.materials.map(m => [m.name, `${m.quantity} ${m.unit}`]);
      autoTable(doc, {
        startY: currentY,
        head: [['Material', 'Quantidade']],
        body: matData,
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42] },
        margin: { left: 20, right: 20 }
      });
      currentY = (doc as any).lastAutoTable.finalY + 20;
    } else {
      doc.setFont('helvetica', 'italic');
      doc.text('Nenhum material solicitado para esta OS.', 20, currentY);
      currentY += 20;
    }

    // Signatures Section
    if (currentY > 240) {
      doc.addPage();
      currentY = 20;
    }

    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.text('ASSINATURAS DE VALIDAÇÃO', 20, currentY);
    currentY += 5;
    doc.line(20, currentY, 190, currentY);
    currentY += 10;

    // Add Signatures if they exist
    if (os.preInspectionSignatureTech) {
      try {
        doc.addImage(os.preInspectionSignatureTech, 'PNG', 20, currentY, 60, 30);
      } catch (e) {
        console.error('Error adding tech signature to PDF', e);
      }
    }
    
    if (os.preInspectionSignatureClient) {
      try {
        doc.addImage(os.preInspectionSignatureClient, 'PNG', 120, currentY, 60, 30);
      } catch (e) {
        console.error('Error adding client signature to PDF', e);
      }
    }

    currentY += 35;
    doc.setDrawColor(200, 200, 200);
    doc.line(20, currentY, 90, currentY);
    doc.line(120, currentY, 190, currentY);
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');
    doc.text(`Técnico: ${tech?.name || 'Assinatura Digital'}`, 55, currentY + 5, { align: 'center' });
    doc.text('Responsável Almoxarifado', 155, currentY + 5, { align: 'center' });

    doc.save(`GUIA_ALMOXARIFADO_${os.id.slice(-6).toUpperCase()}.pdf`);
    
    // Update OS status to mark warehouse requested
    await handleUpdateOSStatus(os, os.status, { isWarehouseRequested: true });
  };

  const exportWarehouseGuideAsImage = async (os: ServiceOrder) => {
    const element = document.getElementById('warehouse-guide-export');
    if (!element) return;
    
    setIsGeneratingGuide(true);
    try {
      const canvas = await html2canvas(element, { scale: 2 });
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      saveAs(dataUrl, `GUIA_ALMOXARIFADO_${os.id.slice(-6).toUpperCase()}.jpg`);
      await handleUpdateOSStatus(os, os.status, { isWarehouseRequested: true });
    } catch (error) {
      console.error('Error generating image guide:', error);
    } finally {
      setIsGeneratingGuide(false);
    }
  };


  const createNotification = async (notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => {
    try {
      await supabaseService.createNotification({
        ...notification,
        read: false,
        createdAt: new Date().toISOString()
      } as AppNotification);
    } catch (error) {
      console.error('Erro ao criar notificação:', error);
    }
  };

  const handleUpdateOSStatus = async (os: ServiceOrder, newStatus: OSStatus, updates: Partial<ServiceOrder> = {}) => {
    // Validation: Cannot go back from 'Concluída'
    if (os.status === 'Concluída' && newStatus !== 'Concluída') {
      showError('Não é possível alterar o status de uma ordem de serviço já concluída.');
      return;
    }

    // Validation: Signature is required to conclude
    if (newStatus === 'Concluída' && !os.signature && !updates.signature) {
      showError('A assinatura do cliente é obrigatória para concluir a Ordem de Serviço. O técnico deve coletar a assinatura via aplicativo.');
      return;
    }
    
    // Validation: Cannot go from 'Em andamento' back to 'Aberta' (optional, but good for workflow)
    if (os.status === 'Em andamento' && newStatus === 'Aberta') {
      confirmAction('Tem certeza que deseja voltar o status para "Aberta"? Isso removerá a data de início.', async () => {
        try {
          const updateData: Partial<ServiceOrder> = { ...updates, status: newStatus, updatedAt: new Date().toISOString(), startedAt: undefined };
          await supabaseService.updateServiceOrder(os.id, updateData);
          setViewingOS({ ...os, ...updateData });
          showSuccess('Status atualizado para Aberta.');
        } catch (error) {
          console.error('Erro ao atualizar status:', error);
          showError('Erro ao atualizar status.');
        }
      });
      return;
    }

    try {
      const updateData: any = { ...updates, status: newStatus, updatedAt: new Date().toISOString() };
      if (newStatus === 'Em andamento' && !os.startedAt) {
        updateData.startedAt = new Date().toISOString();
        updateData.surveyCompleted = true;
        updateData.surveyAt = new Date().toISOString();
      } else if (newStatus === 'Concluída' && !os.finishedAt) {
        updateData.finishedAt = new Date().toISOString();
        updateData.normalizationApplied = true;
      }
      
      await supabaseService.updateServiceOrder(os.id, updateData);
      setViewingOS({ ...os, ...updateData });

      // Create notification for completed OS
      if (newStatus === 'Concluída') {
        await createNotification({
          title: 'OS Concluída',
          message: `A Ordem de Serviço #${os.id} para ${os.clientName} foi concluída.`,
          type: 'os_completed',
          osId: os.id
        });
      }

      // Notify technician if they are assigned and someone else is making the update
      if (os.assignedTechnicianId && os.assignedTechnicianId !== profile.uid) {
        let title = 'OS Atualizada';
        let message = `A OS de ${os.clientName} foi atualizada.`;

        if (os.status !== newStatus) {
          title = 'Status da OS Alterado';
          message = `O status da OS de ${os.clientName} mudou para "${newStatus}".`;
        } else if (updates.materials) {
          title = 'Materiais Atualizados';
          message = `A lista de materiais da OS de ${os.clientName} foi atualizada.`;
        } else if (updates.beforePhotos || updates.afterPhotos) {
          title = 'Fotos Adicionadas';
          message = `Novas fotos foram adicionadas à OS de ${os.clientName}.`;
        } else if (updates.isWarehouseRequested) {
          title = 'Almoxarifado Solicitado';
          message = `Uma guia de almoxarifado foi gerada para a OS de ${os.clientName}.`;
        }

        await createNotification({
          title,
          message,
          type: 'os_updated',
          osId: os.id,
          userId: os.assignedTechnicianId
        });
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  // Document Form state
  const [docName, setDocName] = useState('');
  const [docContent, setDocContent] = useState('');
  const [docType, setDocType] = useState<'start' | 'finish' | 'general' | 'os_layout'>('general');
  const [requireClientSignature, setRequireClientSignature] = useState(true);
  const [requireRepresentativeSignature, setRequireRepresentativeSignature] = useState(false);
  const [paperSize, setPaperSize] = useState<'A4' | 'A5' | 'Letter'>('A4');
  const [docHeaderImage, setDocHeaderImage] = useState('');
  const [headerImageWidth, setHeaderImageWidth] = useState('100%');
  const [headerImageHeight, setHeaderImageHeight] = useState('auto');
  const [headerImageTop, setHeaderImageTop] = useState('0');
  const [headerImageLeft, setHeaderImageLeft] = useState('0');
  const [headerImageIsBackground, setHeaderImageIsBackground] = useState(false);
  const [headerImageOpacity, setHeaderImageOpacity] = useState(1);
  const [docMargins, setDocMargins] = useState('20mm');
  const [docFileUrl, setDocFileUrl] = useState('');
  const [docFileName, setDocFileName] = useState('');
  const [previewingDocument, setPreviewingDocument] = useState<DocumentTemplate | null>(null);

  const paperDimensions = useMemo(() => {
    switch (paperSize) {
      case 'A4': return { width: '210mm', minHeight: '297mm' };
      case 'A5': return { width: '148mm', minHeight: '210mm' };
      case 'Letter': return { width: '215.9mm', minHeight: '279.4mm' };
      default: return { width: '210mm', minHeight: '297mm' };
    }
  }, [paperSize]);

  // User Form state
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState<'admin' | 'technician' | 'user'>('technician');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetFeedback, setResetFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [userPermissions, setUserPermissions] = useState<UserPermissions>({
    canCreateOS: true,
    canEditOS: true,
    canDeleteOS: false,
    canSeeAllOS: true,
    canManageUsers: false,
    canCreateMaterials: false,
    canEditMaterials: false,
    canDeleteMaterials: false,
    canCreateDocuments: false,
    canEditDocuments: false,
    canDeleteDocuments: false,
    canManageSettings: false,
    canViewReports: false,
    canViewOSReports: false,
    canViewMaterialReports: false,
    canViewTechnicianReports: false,
    canViewFinancialReports: false,
    canFinalizeOS: true,
    canApproveOS: false
  });

  // Material Form state
  const [matName, setMatName] = useState('');
  const [matUnit, setMatUnit] = useState('');
  const [matPrice, setMatPrice] = useState<number>(0);
  const [matCost, setMatCost] = useState<number>(0);

  // Invite Form state
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [isSavingSignature, setIsSavingSignature] = useState(false);
  const [isGeneratingGuide, setIsGeneratingGuide] = useState(false);
  const signaturePadRef = useRef<SignatureCanvas>(null);
  const preSignaturePadClientRef = useRef<SignatureCanvas>(null);
  const preSignaturePadTechRef = useRef<SignatureCanvas>(null);
  const fullscreenSignaturePadRef = useRef<SignatureCanvas>(null);

  // Notifications state
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;
  
  useEffect(() => {
    if (!showOSForm) setFormErrors({});
  }, [showOSForm]);

  useEffect(() => {
    if (!showMaterialForm) setMaterialFormErrors({});
  }, [showMaterialForm]);

  useEffect(() => {
    if (!showDocumentForm) setDocFormErrors({});
  }, [showDocumentForm]);

  useEffect(() => {
    if (!showUserForm) setUserFormErrors({});
  }, [showUserForm]);

  useEffect(() => {
    if (!showInviteForm) setInviteFormErrors({});
  }, [showInviteForm]);

  useEffect(() => {
    // Check for delayed OS and approaching deadlines
    const checkDeadlines = async () => {
      const now = new Date();
      
      // Only check orders assigned to the user, or all if admin
      const relevantOrders = profile.role === 'admin' 
        ? orders 
        : orders.filter(os => os.assignedTechnicianId === profile.uid);

      // 1. Delayed Orders
      const delayedOrders = relevantOrders.filter(os => 
        os.status !== 'Concluída' && 
        os.deadline && 
        isAfter(now, parseISO(os.deadline))
      );

      for (const os of delayedOrders) {
        const alreadyNotified = notifications.some(n => n.osId === os.id && n.type === 'os_delayed');
        if (!alreadyNotified) {
          await createNotification({
            title: 'OS em Atraso',
            message: `A OS de ${os.clientName} ultrapassou o prazo de finalização (${format(parseISO(os.deadline!), 'dd/MM/yyyy')}).`,
            type: 'os_delayed',
            osId: os.id,
            userId: os.assignedTechnicianId // Target technician if assigned
          });
        }
      }

      // 2. Approaching Deadlines (within 24 hours)
      const approachingOrders = orders.filter(os => 
        os.status !== 'Concluída' && 
        os.deadline && 
        isBefore(now, parseISO(os.deadline)) &&
        differenceInHours(parseISO(os.deadline), now) <= 24
      );

      for (const os of approachingOrders) {
        const alreadyNotified = notifications.some(n => n.osId === os.id && n.type === 'deadline_approaching');
        if (!alreadyNotified) {
          await createNotification({
            title: 'Prazo Próximo',
            message: `A OS de ${os.clientName} vence em menos de 24 horas (${format(parseISO(os.deadline!), 'dd/MM/yyyy HH:mm')}).`,
            type: 'deadline_approaching',
            osId: os.id,
            userId: os.assignedTechnicianId
          });
        }
      }
    };

    if (orders.length > 0) {
      checkDeadlines();
    }
  }, [orders, notifications]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [ordersData, usersData, materialsData, templatesData, notifsData] = await Promise.all([
          supabaseService.getServiceOrders(),
          supabaseService.getAllProfiles(),
          supabaseService.getMaterials(),
          supabaseService.getDocumentTemplates(),
          supabaseService.getNotifications(profile.role === 'admin' ? undefined : profile.uid)
        ]);
        setOrders(ordersData);
        setSystemUsers(usersData);
        setMaterialsDB(materialsData);
        setDocumentTemplates(templatesData);
        setNotifications(notifsData);
      } catch (error) {
        console.error('Error fetching admin data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Real-time subscriptions
    const osSub = supabase.channel('os_admin').on('postgres_changes', { event: '*', schema: 'public', table: 'service_orders' }, () => fetchData()).subscribe();
    const usersSub = supabase.channel('users_admin').on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchData()).subscribe();
    const matSub = supabase.channel('mat_admin').on('postgres_changes', { event: '*', schema: 'public', table: 'materials' }, () => fetchData()).subscribe();
    const docSub = supabase.channel('doc_admin').on('postgres_changes', { event: '*', schema: 'public', table: 'document_templates' }, () => fetchData()).subscribe();
    const notifSub = supabase.channel('notif_admin').on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => fetchData()).subscribe();

    return () => {
      osSub.unsubscribe();
      usersSub.unsubscribe();
      matSub.unsubscribe();
      docSub.unsubscribe();
      notifSub.unsubscribe();
    };
  }, [profile.role, profile.uid]);

  useEffect(() => {
    if (profile.role !== 'admin') return;

    const checkDelayedOrders = async () => {
      const now = new Date();
      const delayedOrders = orders.filter(os => {
        if (os.status !== 'Aberta') return false;
        try {
          const lastUpdate = os.updatedAt ? parseISO(os.updatedAt) : parseISO(os.createdAt);
          return differenceInHours(now, lastUpdate) >= 72;
        } catch (e) {
          return false;
        }
      });

      for (const os of delayedOrders) {
        // Check if notification already exists for this OS delay
        const alreadyNotified = notifications.some(n => n.osId === os.id && n.type === 'os_delayed');
        
        if (!alreadyNotified) {
          try {
            await supabaseService.createNotification({
              title: 'OS Atrasada (72h+)',
              message: `A OS de ${os.clientName} está aberta há mais de 72 horas sem atualizações.`,
              type: 'os_delayed',
              osId: os.id,
              userId: os.assignedTechnicianId || profile.uid
            });
          } catch (error) {
            console.error('Erro ao criar notificação de atraso:', error);
          }
        }
      }
    };

    if (orders.length > 0) {
      checkDelayedOrders();
    }
  }, [orders, notifications, profile.role]);

  const bootstrapMaterials = async () => {
    try {
      await Promise.all(DEFAULT_MATERIALS.map(m => 
        supabaseService.createMaterial({ ...m, createdAt: new Date().toISOString() } as Material)
      ));
    } catch (error) {
      console.error('Error bootstrapping materials:', error);
    }
  };

  const handleSaveOS = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateOSForm()) {
      return;
    }

    if (!editingOS && !isUnderWarranty) {
      alert('Não é possível criar a OS: O tempo de garantia para este serviço expirou.');
      return;
    }

    const isRework = !editingOS && orders.some(o => 
      o.clientName.toLowerCase() === clientName.toLowerCase() && 
      o.houseNumber === houseNumber && 
      o.status === 'Concluída'
    );

    const analysis = getPENGAnalysis(description, serviceType);

    const osData: Partial<ServiceOrder> = {
      clientName,
      clientPhone,
      address,
      houseNumber,
      serviceType,
      description,
      habiteSeDate,
      isUnderWarranty,
      warrantyYears: WARRANTY_PERIODS[serviceType] || 0,
      materials: osMaterials,
      deadline: deadline || undefined,
      scheduledAt: scheduledAt || undefined,
      status: editingOS ? editingOS.status : 'Aberta',
      isRework: editingOS ? editingOS.isRework : isRework,
      createdAt: editingOS ? editingOS.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      assignedTechnicianId: assignedTechId || undefined,
      preInspection,
      completionChecklist,
      attachments,
      requiredDocuments: documentTemplates
        .filter(t => selectedDocumentIds.includes(t.id))
        .map(t => ({
          id: t.id,
          name: t.name,
          content: t.content,
          type: t.type,
          requireClientSignature: t.requireClientSignature ?? true,
          requireRepresentativeSignature: t.requireRepresentativeSignature ?? false,
          paperSize: t.paperSize ?? 'A4',
          headerImage: t.headerImage ?? '',
          headerImageConfig: t.headerImageConfig ?? { width: '100%', height: 'auto', top: '0', left: '0', isBackground: false, opacity: 1 },
          margins: t.margins ?? '20mm',
          fileUrl: t.fileUrl ?? '',
          fileName: t.fileName ?? ''
        })),
      // PENG Data
      rootCause: analysis.rootCause,
      criticalFailureIndex: analysis.criticalIndex,
      pengCrossings: analysis.crossings,
      estimatedNormalizationSaving: analysis.saving,
      normalizationApplied: false
    };

    try {
      if (editingOS) {
        await supabaseService.updateServiceOrder(editingOS.id, osData);
        
        // Notify technician if assignment changed or OS updated by admin
        if (osData.assignedTechnicianId && osData.assignedTechnicianId !== profile.uid) {
          await createNotification({
            title: 'OS Atualizada',
            message: `A OS de ${clientName} foi atualizada pelo administrador.`,
            type: 'os_updated',
            osId: editingOS.id,
            userId: osData.assignedTechnicianId
          });
        }
      } else {
        const newOS = await supabaseService.createServiceOrder(osData as ServiceOrder);
        // Create notification for new OS
        await createNotification({
          title: 'Nova OS Atribuída',
          message: `Você recebeu uma nova ordem de serviço para ${clientName}.`,
          type: 'new_os',
          osId: newOS.id,
          userId: osData.assignedTechnicianId || undefined
        });

        // Also notify admins
        if (profile.role !== 'admin') {
          await createNotification({
            title: 'Nova OS Criada',
            message: `Uma nova OS foi criada por ${profile.name} para ${clientName}.`,
            type: 'new_os',
            osId: newOS.id
          });
        }
      }
      closeOSForm();
    } catch (error) {
      console.error('Erro ao salvar OS:', error);
    }
  };

  const handleApproveOS = async (os: ServiceOrder) => {
    if (!canApproveOS) {
      showError('Você não tem permissão para aprovar Ordens de Serviço.');
      return;
    }
    confirmAction(`Deseja aprovar a OS de ${os.clientName}?`, async () => {
      try {
        const now = new Date().toISOString();
        await supabaseService.updateServiceOrder(os.id, {
          isApproved: true,
          approvedAt: now,
          approvedBy: profile.name,
          updatedAt: now
        });

        // Notify technician
        if (os.assignedTechnicianId && os.assignedTechnicianId !== profile.uid) {
          await createNotification({
            title: 'OS Aprovada',
            message: `A OS de ${os.clientName} foi aprovada por ${profile.name}.`,
            type: 'os_updated',
            osId: os.id,
            userId: os.assignedTechnicianId
          });
        }

        showSuccess('OS aprovada com sucesso!');
      } catch (error) {
        console.error('Erro ao aprovar OS:', error);
        showError('Erro ao aprovar OS. Tente novamente.');
      }
    });
  };

  const handleDeleteOS = async (id: string) => {
    confirmAction('Tem certeza que deseja excluir esta OS?', async () => {
      try {
        await supabaseService.deleteServiceOrder(id);
        showSuccess('OS excluída com sucesso.');
      } catch (error) {
        console.error('Erro ao excluir OS:', error);
        showError('Erro ao excluir OS.');
      }
    });
  };

  const openEditOS = (os: ServiceOrder) => {
    setEditingOS(os);
    setClientName(os.clientName);
    setClientPhone(os.clientPhone);
    setAddress(os.address);
    setHouseNumber(os.houseNumber || '');
    setServiceType(os.serviceType);
    setDescription(os.description);
    setOsMaterials(os.materials || []);
    setAssignedTechId(os.assignedTechnicianId || '');
    setSelectedDocumentIds(os.requiredDocuments?.map(d => d.id) || []);
    setPreInspection(os.preInspection || []);
    setCompletionChecklist(os.completionChecklist || []);
    setAttachments(os.attachments || []);
    setHabiteSeDate(os.habiteSeDate || '');
    setDeadline(os.deadline || '');
    setScheduledAt(os.scheduledAt || '');
    setOsFormTab('cliente');
    setShowOSForm(true);
  };

  const closeOSForm = () => {
    setEditingOS(null);
    setShowOSForm(false);
    resetOSForm();
  };

  const [docFilter, setDocFilter] = useState<'all' | 'start' | 'finish' | 'general'>('all');

  const [materialSearchQuery, setMaterialSearchQuery] = useState('');

  const filteredMaterials = useMemo(() => {
    return materialsDB.filter(mat => 
      mat.name.toLowerCase().includes(materialSearchQuery.toLowerCase()) ||
      mat.unit.toLowerCase().includes(materialSearchQuery.toLowerCase())
    );
  }, [materialsDB, materialSearchQuery]);

  const filteredDocs = useMemo(() => {
    if (docFilter === 'all') return documentTemplates;
    return documentTemplates.filter(d => d.type === docFilter);
  }, [documentTemplates, docFilter]);

  const resetOSForm = () => {
    setFormErrors({});
    setClientName('');
    setClientPhone('');
    setAddress('');
    setHouseNumber('');
    setServiceType('manutenção geral');
    setDescription('');
    setOsMaterials([]);
    setAssignedTechId('');
    setHabiteSeDate('');
    setDeadline('');
    setScheduledAt('');
    // Pre-select documents of type 'start' and 'finish' for automatic association
    const autoSelectedIds = documentTemplates
      .filter(d => d.type === 'start' || d.type === 'finish')
      .map(d => d.id);
    setSelectedDocumentIds(autoSelectedIds);
    setPreInspection([]);
    setCompletionChecklist([]);
    setAttachments([]);
    setOsFormTab('cliente');
  };

  const addMaterialToOS = () => {
    const mat = materialsDB.find(m => m.id === selectedMaterialId);
    if (mat) {
      setOsMaterials([...osMaterials, { 
        id: mat.id, 
        name: mat.name, 
        quantity: newMaterialQty, 
        unit: mat.unit,
        price: mat.price || 0 
      }]);
      setSelectedMaterialId('');
      setNewMaterialQty(1);
    }
  };

  const removeMaterialFromOS = (index: number) => {
    setOsMaterials(osMaterials.filter((_, i) => i !== index));
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await supabaseService.updateNotification(id, { read: true });
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await Promise.all(
        notifications.filter(n => !n.read).map(n => 
          supabaseService.updateNotification(n.id, { read: true })
        )
      );
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    }
  };

  const handleClearNotifications = async () => {
    if (window.confirm('Deseja excluir todas as notificações?')) {
      try {
        await Promise.all(
          notifications.map(n => supabaseService.deleteNotification(n.id))
        );
      } catch (error) {
        console.error('Erro ao excluir notificações:', error);
      }
    }
  };

  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateMaterialForm()) return;
    const matData = { 
      name: matName, 
      unit: matUnit, 
      price: matPrice,
      cost: matCost,
      createdAt: editingMaterial ? editingMaterial.createdAt : new Date().toISOString() 
    };
    try {
      if (editingMaterial) {
        await supabaseService.updateMaterial(editingMaterial.id, matData);
      } else {
        await supabaseService.createMaterial(matData as Material);
      }
      setShowMaterialForm(false);
      setEditingMaterial(null);
      setMatName('');
      setMatUnit('');
      setMatPrice(0);
      setMatCost(0);
    } catch (error) {
      console.error('Erro ao salvar material:', error);
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    confirmAction('Excluir este material da base de dados?', async () => {
      try {
        await supabaseService.deleteMaterial(id);
        showSuccess('Material excluído com sucesso.');
      } catch (error) {
        console.error('Erro ao excluir material:', error);
        showError('Erro ao excluir material.');
      }
    });
  };

  const handleSaveDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateDocumentForm()) return;
    const docData = { 
      name: docName, 
      content: docContent, 
      type: docType, 
      requireClientSignature,
      requireRepresentativeSignature,
      paperSize,
      headerImage: docHeaderImage,
      headerImageConfig: {
        width: headerImageWidth,
        height: headerImageHeight,
        top: headerImageTop,
        left: headerImageLeft,
        isBackground: headerImageIsBackground,
        opacity: headerImageOpacity
      },
      margins: docMargins,
      fileUrl: docFileUrl,
      fileName: docFileName,
      createdAt: editingDocument ? editingDocument.createdAt : new Date().toISOString() 
    };
    try {
      if (editingDocument) {
        await supabaseService.updateDocumentTemplate(editingDocument.id, docData);
      } else {
        await supabaseService.createDocumentTemplate(docData as DocumentTemplate);
      }
      setShowDocumentForm(false);
      setEditingDocument(null);
      setDocName('');
      setDocContent('');
      setDocType('general');
      setRequireClientSignature(true);
      setRequireRepresentativeSignature(false);
      setPaperSize('A4');
      setDocHeaderImage('');
      setHeaderImageWidth('100%');
      setHeaderImageHeight('auto');
      setHeaderImageTop('0');
      setHeaderImageLeft('0');
      setHeaderImageIsBackground(false);
      setHeaderImageOpacity(1);
      setDocMargins('20mm');
      setDocFileUrl('');
      setDocFileName('');
    } catch (error) {
      console.error('Erro ao salvar documento:', error);
    }
  };

  const openEditDocument = (doc: DocumentTemplate) => {
    setEditingDocument(doc);
    setDocName(doc.name);
    setDocContent(doc.content);
    setDocType(doc.type);
    setRequireClientSignature(doc.requireClientSignature ?? true);
    setRequireRepresentativeSignature(doc.requireRepresentativeSignature ?? false);
    setPaperSize(doc.paperSize ?? 'A4');
    setDocHeaderImage(doc.headerImage ?? '');
    setHeaderImageWidth(doc.headerImageConfig?.width ?? '100%');
    setHeaderImageHeight(doc.headerImageConfig?.height ?? 'auto');
    setHeaderImageTop(doc.headerImageConfig?.top ?? '0');
    setHeaderImageLeft(doc.headerImageConfig?.left ?? '0');
    setHeaderImageIsBackground(doc.headerImageConfig?.isBackground ?? false);
    setHeaderImageOpacity(doc.headerImageConfig?.opacity ?? 1);
    setDocMargins(doc.margins ?? '20mm');
    setDocFileUrl(doc.fileUrl ?? '');
    setDocFileName(doc.fileName ?? '');
    setShowDocumentForm(true);
  };

  const handleDeleteDocument = async (id: string) => {
    confirmAction('Excluir este modelo de documento?', async () => {
      try {
        await supabaseService.deleteDocumentTemplate(id);
        showSuccess('Modelo de documento excluído.');
      } catch (error) {
        console.error('Erro ao excluir modelo:', error);
        showError('Erro ao excluir modelo.');
      }
    });
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !validateUserForm()) return;
    try {
      await supabaseService.updateProfile(editingUser.uid, { 
        name: userName, 
        role: userRole,
        permissions: userPermissions
      });
      setShowUserForm(false);
      setEditingUser(null);
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInviteForm()) return;
    setInviting(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: inviteEmail,
        options: {
          emailRedirectTo: window.location.origin,
        }
      });

      if (error) throw error;
      
      alert('Link de acesso enviado com sucesso para ' + inviteEmail);
      setShowInviteForm(false);
      setInviteName('');
      setInviteEmail('');
    } catch (error: any) {
      console.error('Erro ao enviar convite:', error);
      alert('Erro ao enviar convite: ' + error.message);
    } finally {
      setInviting(false);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension === 'xlsx' || extension === 'xls') {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(worksheet) as any[];
          
          if (Array.isArray(json)) {
            await Promise.all(json.map((row: any) => 
              supabaseService.createServiceOrder({
                clientName: row.Cliente || row.clientName || 'N/A',
                clientPhone: String(row.Telefone || row.clientPhone || ''),
                address: row.Endereço || row.address || 'N/A',
                serviceType: (row.Tipo || row.serviceType || 'manutenção geral').toLowerCase(),
                description: row.Descrição || row.description || 'Importado via Excel',
                status: row.Status || row.status || 'Aberta',
                createdAt: new Date().toISOString(),
                assignedTechnicianId: undefined,
                materials: [],
                requiredDocuments: []
              } as ServiceOrder)
            ));
            alert(`${json.length} Ordens de Serviço importadas com sucesso!`);
          }
        } catch (err) {
          alert('Erro ao processar arquivo Excel. Verifique o formato.');
        }
      };
      reader.readAsArrayBuffer(file);
    } else if (extension === 'docx') {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          const result = await mammoth.convertToHtml({ arrayBuffer });
          const html = result.value;
          
          await supabaseService.createDocumentTemplate({
            name: file.name.replace('.docx', ''),
            content: html,
            type: 'general',
            createdAt: new Date().toISOString()
          } as DocumentTemplate);
          alert('Documento Word importado e convertido com sucesso!');
        } catch (err) {
          alert('Erro ao processar arquivo Word.');
        }
      };
      reader.readAsArrayBuffer(file);
    } else if (['png', 'jpg', 'jpeg', 'webp'].includes(extension || '')) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const base64 = event.target?.result as string;
          const html = `<img src="${base64}" style="max-width: 100%;" />`;
          
          await supabaseService.createDocumentTemplate({
            name: file.name,
            content: html,
            type: 'general',
            createdAt: new Date().toISOString()
          } as DocumentTemplate);
          alert('Imagem importada como documento com sucesso!');
        } catch (err) {
          alert('Erro ao processar imagem.');
        }
      };
      reader.readAsDataURL(file);
    } else if (['pdf', 'pptx', 'doc', 'docx'].includes(extension || '') && extension !== 'docx') {
      // For PDF and other formats we don't convert to HTML, store as file
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const base64 = event.target?.result as string;
          await supabaseService.createDocumentTemplate({
            name: file.name,
            content: `<p>Documento em anexo: ${file.name}</p>`,
            type: 'general',
            fileUrl: base64,
            fileName: file.name,
            createdAt: new Date().toISOString()
          } as DocumentTemplate);
          alert(`Arquivo ${extension?.toUpperCase()} importado como modelo com sucesso!`);
        } catch (err) {
          alert('Erro ao processar arquivo.');
        }
      };
      reader.readAsDataURL(file);
    } else if (extension === 'json') {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const imported = JSON.parse(event.target?.result as string);
          if (Array.isArray(imported)) {
            await Promise.all(imported.map(item => {
              if (item.clientName) {
                return supabaseService.createServiceOrder({ ...item, id: undefined, createdAt: item.createdAt || new Date().toISOString() });
              } else if (item.content) {
                return supabaseService.createDocumentTemplate({ ...item, id: undefined, createdAt: item.createdAt || new Date().toISOString() });
              }
              return Promise.resolve();
            }));
            alert('Dados importados com sucesso!');
          }
        } catch (err) {
          alert('Erro ao processar arquivo JSON.');
        }
      };
      reader.readAsText(file);
    } else {
      alert(`O arquivo .${extension} foi recebido. Para importação de dados estruturados, utilize Excel (.xlsx) ou JSON.`);
    }
  };

  const openEditUser = (user: UserProfile) => {
    setEditingUser(user);
    setUserName(user.name || '');
    setUserEmail(user.email || '');
    setUserRole(user.role || 'technician');
    setUserPermissions(user.permissions || {
      canCreateOS: user.role === 'admin',
      canEditOS: user.role === 'admin',
      canDeleteOS: user.role === 'admin',
      canSeeAllOS: true,
      canManageUsers: user.role === 'admin',
      canCreateMaterials: user.role === 'admin',
      canEditMaterials: user.role === 'admin',
      canDeleteMaterials: user.role === 'admin',
      canCreateDocuments: user.role === 'admin',
      canEditDocuments: user.role === 'admin',
      canDeleteDocuments: user.role === 'admin',
      canManageSettings: user.role === 'admin',
      canViewReports: user.role === 'admin',
      canViewOSReports: user.role === 'admin',
      canViewMaterialReports: user.role === 'admin',
      canViewTechnicianReports: user.role === 'admin',
      canViewFinancialReports: user.role === 'admin',
      canFinalizeOS: true,
      canApproveOS: user.role === 'admin'
    });
    setShowUserForm(true);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text('Relatório de Ordens de Serviço', 14, 15);
    
    const tableData = finalFilteredOrders.map(o => [
      o.clientName,
      o.serviceType,
      o.status,
      format(parseISO(o.createdAt), 'dd/MM/yyyy'),
      o.assignedTechnicianId ? systemUsers.find(u => u.uid === o.assignedTechnicianId)?.name || 'N/A' : 'N/A'
    ]);

    autoTable(doc, {
      head: [['Cliente', 'Tipo', 'Status', 'Data', 'Técnico']],
      body: tableData,
      startY: 20
    });

    doc.save(`relatorio_os_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const generatePericialReportPDF = async (os: ServiceOrder) => {
    setIsGeneratingPericialReport(true);
    const doc = new jsPDF();
    const tech = systemUsers.find(u => u.uid === os.assignedTechnicianId);

    // Helper for drawing lines and sections
    const drawSectionHeader = (title: string, y: number) => {
      doc.setFillColor(248, 250, 252);
      doc.rect(15, y, 180, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text(title.toUpperCase(), 20, y + 5.5);
      return y + 15;
    };

    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 45, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(settings.companyName || 'OBRAX', 20, 20);
    
    doc.setFontSize(14);
    doc.text('LAUDO TÉCNICO PERICIAL', 20, 32);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`ID: ${os.id.toUpperCase()}`, 190, 15, { align: 'right' });
    doc.text(`EMITIDO EM: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 190, 20, { align: 'right' });
    if (pericialAuditor) {
      doc.text(`AUDITOR: ${pericialAuditor.toUpperCase()}`, 190, 25, { align: 'right' });
      doc.text(`STATUS: ${os.status.toUpperCase()}`, 190, 30, { align: 'right' });
    } else {
      doc.text(`STATUS: ${os.status.toUpperCase()}`, 190, 25, { align: 'right' });
    }

    let currentY = 55;

    // 1. IDENTIFICAÇÃO
    currentY = drawSectionHeader('1. Identificação da Ocorrência', currentY);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('CLIENTE:', 20, currentY);
    doc.text('LOCALIZAÇÃO:', 110, currentY);
    
    currentY += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(os.clientName || 'N/A', 20, currentY);
    doc.text(`${os.address || ''} ${os.houseNumber || ''}`, 110, currentY);
    
    currentY += 10;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('UNIDADE:', 20, currentY);
    doc.text('TIPO DE SERVIÇO:', 110, currentY);
    
    currentY += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(`Unidade: ${os.unit || '-'} | Bloco: ${os.block || '-'} | Torre: ${os.tower || '-'}`, 20, currentY);
    doc.text(os.serviceType.toUpperCase(), 110, currentY);

    currentY += 15;

    // 2. CONSTATAÇÃO TÉCNICA
    currentY = drawSectionHeader('2. Constatação Técnica', currentY);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const descriptionLines = doc.splitTextToSize(os.description || 'Nenhuma descrição fornecida.', 170);
    doc.text(descriptionLines, 20, currentY);
    currentY += (descriptionLines.length * 5) + 10;

    // 3. DIAGNÓSTICO E CAUSA RAIZ
    currentY = drawSectionHeader('3. Diagnóstico e Causa Raiz', currentY);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('ORIGEM DO PROBLEMA:', 20, currentY);
    
    currentY += 5;
    doc.setFont('helvetica', 'normal');
    const rootCauseText = os.rootCause === 'execution' ? 'FALHA DE EXECUÇÃO TÉCNICA' : 
                         os.rootCause === 'design' ? 'ERRO DE PROJETO/DETALHAMENTO' : 
                         os.rootCause === 'specification' ? 'INCONFORMIDADE DE ESPECIFICAÇÃO' : 'NÃO DEFINIDA';
    doc.text(rootCauseText, 20, currentY);
    
    currentY += 10;
    if (os.criticalityLevel) {
      doc.setFont('helvetica', 'bold');
      doc.text('NÍVEL DE CRITICIDADE:', 20, currentY);
      currentY += 5;
      doc.setFont('helvetica', 'normal');
      const criticalityText = os.criticalityLevel === 'high' ? 'ALTA (RISCO IMINENTE)' : 
                             os.criticalityLevel === 'medium' ? 'MÉDIA (REPARO PROGRAMADO)' : 'BAIXA (MONITORAMENTO)';
      doc.text(criticalityText, 20, currentY);
      currentY += 10;
    }

    if (os.criticalFailureIndex !== undefined) {
      doc.setFont('helvetica', 'bold');
      doc.text('ÍNDICE DE FALHA CRÍTICA (IFC):', 20, currentY);
      currentY += 5;
      doc.setFont('helvetica', 'normal');
      doc.text(`${os.criticalFailureIndex}%`, 20, currentY);
      currentY += 10;
    }

    // 4. RECOMENDAÇÃO TÉCNICA
    if (os.technicalRecommendation) {
      if (currentY > 240) { doc.addPage(); currentY = 20; }
      currentY = drawSectionHeader('4. Recomendação Técnica Corretiva', currentY);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const recommendationLines = doc.splitTextToSize(os.technicalRecommendation, 170);
      doc.text(recommendationLines, 20, currentY);
      currentY += (recommendationLines.length * 5) + 15;
    }

    // 4. FUNDAMENTAÇÃO NORMATIVA (PENG)
    if (os.pengCrossings && os.pengCrossings.length > 0) {
      if (currentY > 240) { doc.addPage(); currentY = 20; }
      currentY = drawSectionHeader('4. Fundamentação Normativa (Motor PENG)', currentY);
      
      const tableData = os.pengCrossings.map(c => [c.nbr, c.normalizationAction]);
      autoTable(doc, {
        startY: currentY,
        head: [['NORMA NBR', 'AÇÃO DE NORMALIZAÇÃO / RECOMENDAÇÃO']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42], fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8 },
        margin: { left: 15, right: 15 }
      });
      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // 5. IMPACTO FINANCEIRO
    if (os.estimatedNormalizationSaving && pericialShowFinancial) {
      if (currentY > 250) { doc.addPage(); currentY = 20; }
      currentY = drawSectionHeader('5. Impacto de Normalização', currentY);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Valor estimado de economia por normalização preventiva: R$ ${os.estimatedNormalizationSaving.toLocaleString('pt-BR')}`, 20, currentY);
      currentY += 15;
    }

    // 6. REGISTRO FOTOGRÁFICO
    if (pericialShowPhotos) {
      const beforePhotos = os.beforePhotos || [];
      const afterPhotos = os.afterPhotos || [];
      const allPhotos = [...beforePhotos.map(p => ({ url: p, type: 'Antes' })), ...afterPhotos.map(p => ({ url: p, type: 'Depois' }))];
      
      if (allPhotos.length > 0) {
        doc.addPage();
        currentY = 20;
        currentY = drawSectionHeader('6. Registro Fotográfico', currentY);
        
        let photoX = 20;
        let photoY = currentY;
        const photoWidth = 80;
        const photoHeight = 60;
  
        for (let i = 0; i < allPhotos.length; i++) {
          if (photoY + photoHeight > 270) {
            doc.addPage();
            photoY = 20;
          }
          
          try {
            doc.addImage(allPhotos[i].url, 'JPEG', photoX, photoY, photoWidth, photoHeight);
            doc.setFontSize(7);
            doc.text(`Foto ${i + 1} - ${allPhotos[i].type}`, photoX, photoY + photoHeight + 4);
          } catch (e) {
            doc.rect(photoX, photoY, photoWidth, photoHeight);
            doc.text('Erro ao carregar imagem', photoX + 20, photoY + 30);
          }
  
          if (i % 2 === 0) {
            photoX = 110;
          } else {
            photoX = 20;
            photoY += photoHeight + 15;
          }
        }
        currentY = photoY + photoHeight + 20;
      }
    }

    // Final Signatures
    if (currentY > 240) { doc.addPage(); currentY = 20; }
    currentY += 30;
    doc.setDrawColor(200, 200, 200);
    doc.line(20, currentY, 90, currentY);
    doc.line(120, currentY, 190, currentY);
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text('RESPONSÁVEL TÉCNICO / PERITO', 55, currentY + 5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text(os.auditorName || tech?.name || 'ENGENHEIRO RESPONSÁVEL', 55, currentY + 10, { align: 'center' });
    
    doc.setFont('helvetica', 'bold');
    doc.text('CIÊNCIA DA GESTÃO', 155, currentY + 5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text(settings.companyName || 'OBRAX ENGENHARIA', 155, currentY + 10, { align: 'center' });
if (settings?.plan !== 'enterprise') {
  const pgH = doc.internal.pageSize.getHeight();
  doc.setFontSize(7);
  doc.setTextColor(180, 180, 180);
  doc.setFont('helvetica', 'normal');
  doc.text('Documento gerado por OBRAX — Gestão Pós-Obra · obrax.com.br', 105, pgH - 6, { align: 'center' });
}
    doc.save(`Laudo_Pericial_${os.id.toUpperCase()}.pdf`);
    setIsGeneratingPericialReport(false);
  };

  const generateConsolidatedPericialReportPDF = async () => {
    const pericialOrders = orders.filter(o => o.pengCrossings && o.pengCrossings.length > 0);
    if (pericialOrders.length === 0) {
      showError('Não há laudos periciais para consolidar.');
      return;
    }

    setIsGeneratingPericialReport(true);
    const doc = new jsPDF();

    // Cover Page
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 297, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(32);
    doc.setFont('helvetica', 'bold');
    doc.text(settings.companyName || 'OBRAX', 105, 100, { align: 'center' });
    
    doc.setFontSize(24);
    doc.text('RELATÓRIO CONSOLIDADO', 105, 130, { align: 'center' });
    doc.text('DE LAUDOS PERICIAIS', 105, 142, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período: ${format(new Date(), 'MMMM yyyy', { locale: ptBR }).toUpperCase()}`, 105, 170, { align: 'center' });
    doc.text(`Total de Laudos: ${pericialOrders.length}`, 105, 180, { align: 'center' });
    if (pericialAuditor) {
      doc.text(`Auditor Responsável: ${pericialAuditor.toUpperCase()}`, 105, 190, { align: 'center' });
    }
    
    doc.setFontSize(10);
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 105, 260, { align: 'center' });

    // Summary Table
    doc.addPage();
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('SUMÁRIO DE OCORRÊNCIAS PERICIAIS', 20, 20);
    
    const summaryData = pericialOrders.map(os => [
      os.id.slice(-6).toUpperCase(),
      os.clientName,
      `${os.unit}/${os.block}`,
      os.serviceType,
      os.rootCause === 'execution' ? 'Execução' : os.rootCause === 'design' ? 'Projeto' : 'Espec.',
      pericialShowFinancial ? `R$ ${os.estimatedNormalizationSaving?.toLocaleString('pt-BR') || '0'}` : 'N/A'
    ]);

    autoTable(doc, {
      startY: 30,
      head: [['ID', 'CLIENTE', 'UN/BL', 'TIPO', 'CAUSA', pericialShowFinancial ? 'ECONOMIA' : 'REF']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], fontSize: 8 },
      bodyStyles: { fontSize: 7 }
    });

    // Individual Pages (Simplified)
    pericialOrders.forEach((os, index) => {
      doc.addPage();
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`DETALHAMENTO DO LAUDO #${os.id.slice(-6).toUpperCase()}`, 20, 20);
      doc.line(20, 25, 190, 25);

      doc.setFontSize(10);
      doc.text('INFORMAÇÕES GERAIS', 20, 35);
      doc.setFont('helvetica', 'normal');
      doc.text(`Cliente: ${os.clientName}`, 20, 42);
      doc.text(`Local: ${os.address} ${os.houseNumber}`, 20, 47);
      doc.text(`Unidade: ${os.unit} | Bloco: ${os.block}`, 20, 52);
      
      doc.setFont('helvetica', 'bold');
      doc.text('DESCRIÇÃO DA OCORRÊNCIA', 20, 65);
      doc.setFont('helvetica', 'normal');
      const descLines = doc.splitTextToSize(os.description, 170);
      doc.text(descLines, 20, 72);
      
      let currentY = 72 + (descLines.length * 5) + 10;
      
      doc.setFont('helvetica', 'bold');
      doc.text('RECOMENDAÇÃO TÉCNICA', 20, currentY);
      currentY += 7;
      doc.setFont('helvetica', 'normal');
      const recLines = doc.splitTextToSize(os.technicalRecommendation || 'Nenhuma recomendação técnica registrada.', 170);
      doc.text(recLines, 20, currentY);
      currentY += (recLines.length * 5) + 10;

      doc.setFont('helvetica', 'bold');
      doc.text('FUNDAMENTAÇÃO NORMATIVA', 20, currentY);
      currentY += 7;
      os.pengCrossings?.forEach(c => {
        doc.setFont('helvetica', 'bold');
        doc.text(c.nbr, 25, currentY);
        currentY += 5;
        doc.setFont('helvetica', 'normal');
        const actionLines = doc.splitTextToSize(c.normalizationAction, 160);
        doc.text(actionLines, 25, currentY);
        currentY += (actionLines.length * 5) + 5;
      });
    });

    doc.save(`RELATORIO_CONSOLIDADO_PERICIAL_${format(new Date(), 'yyyyMMdd')}.pdf`);
    setIsGeneratingPericialReport(false);
  };

  const exportToWord = async () => {
    const tableRows = finalFilteredOrders.map(o => {
      return new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(o.clientName)] }),
          new TableCell({ children: [new Paragraph(o.serviceType)] }),
          new TableCell({ children: [new Paragraph(o.status)] }),
          new TableCell({ children: [new Paragraph(format(parseISO(o.createdAt), 'dd/MM/yyyy'))] }),
          new TableCell({ children: [new Paragraph(o.assignedTechnicianId ? systemUsers.find(u => u.uid === o.assignedTechnicianId)?.name || 'N/A' : 'N/A')] }),
        ],
      });
    });

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: "Relatório de Ordens de Serviço",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: "" }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Cliente", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tipo", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Status", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Data", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Técnico", bold: true })] })] }),
                ],
              }),
              ...tableRows,
            ],
          }),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `relatorio_os_${format(new Date(), 'yyyy-MM-dd')}.docx`);
  };

  const exportToPPT = () => {
    const pptx = new PptxGenJS();
    const slide = pptx.addSlide();
    
    slide.addText("Relatório de Ordens de Serviço", { x: 0.5, y: 0.5, w: 9, h: 1, fontSize: 24, bold: true, align: 'center' });
    
    const tableData = [
      ['Cliente', 'Tipo', 'Status', 'Data', 'Técnico'],
      ...finalFilteredOrders.map(o => [
        o.clientName,
        o.serviceType,
        o.status,
        format(parseISO(o.createdAt), 'dd/MM/yyyy'),
        o.assignedTechnicianId ? systemUsers.find(u => u.uid === o.assignedTechnicianId)?.name || 'N/A' : 'N/A'
      ])
    ];

    slide.addTable(tableData as any, { x: 0.5, y: 1.5, w: 9, rowH: 0.3, fontSize: 10, border: { type: 'solid', color: 'E1E1E1' } });
    
    pptx.writeFile({ fileName: `relatorio_os_${format(new Date(), 'yyyy-MM-dd')}.pptx` });
  };

  const exportToImage = async (imgFormat: 'png' | 'jpeg') => {
    const element = document.getElementById('dashboard-content');
    if (!element) return;
    
    const canvas = await html2canvas(element);
    const dataUrl = canvas.toDataURL(`image/${imgFormat}`);
    const link = document.createElement('a');
    link.download = `dashboard_${format(new Date(), 'yyyy-MM-dd')}.${imgFormat}`;
    link.href = dataUrl;
    link.click();
  };

  const exportToExcel = () => {
    const data = finalFilteredOrders.map(o => ({
      Cliente: o.clientName,
      Telefone: o.clientPhone,
      Endereço: o.address,
      Tipo: o.serviceType,
      Status: o.status,
      CriadoEm: format(parseISO(o.createdAt), 'dd/MM/yyyy HH:mm'),
      Técnico: o.assignedTechnicianId ? systemUsers.find(u => u.uid === o.assignedTechnicianId)?.name || 'N/A' : 'N/A',
      FinalizadoEm: o.finishedAt ? format(parseISO(o.finishedAt), 'dd/MM/yyyy HH:mm') : '-'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ordens de Serviço');
    XLSX.writeFile(wb, `relatorio_os_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  // --- Advanced Reporting Logic ---
  const reports = useMemo(() => {
    const now = new Date();
    
    const filteredByDateAndTech = orders.filter(o => {
      const created = parseISO(o.createdAt);
      const matchesStart = startDate ? !isBefore(created, startOfDay(parseISO(startDate))) : true;
      const matchesEnd = endDate ? !isAfter(created, endOfDay(parseISO(endDate))) : true;
      const matchesTech = selectedTechFilter === 'Todos' ? true : o.assignedTechnicianId === selectedTechFilter;
      const matchesType = serviceTypeFilter === 'Todos' ? true : o.serviceType === serviceTypeFilter;
      return matchesStart && matchesEnd && matchesTech && matchesType;
    });

    const counts = { 
      day: 0, 
      week: 0, 
      month: 0, 
      year: 0, 
      total: filteredByDateAndTech.length,
      completed: 0,
      open: 0,
      inProgress: 0
    };
    const techAssistanceCounts = { day: 0, week: 0, month: 0 };
    const techStats: Record<string, { name: string, count: number, totalTime: number, totalExecutionTime: number, executionCount: number, inProgress: number }> = {};
    const materialUsage: Record<string, { name: string, quantity: number }> = {};
    const statusDistribution: Record<string, number> = { 'Aberta': 0, 'Em andamento': 0, 'Concluída': 0 };
    const typeDistribution: Record<string, number> = {};
    const timelineData: Record<string, number> = {};
    const financialTimelineData: Record<string, number> = {};
    let signedDocsCount = 0;
    let financialImpactTotal = 0;
    const pathologyHeatmap: Record<string, Record<string, Record<string, number>>> = {};
    const originDistribution: Record<string, number> = { 'specification': 0, 'detailing': 0, 'material': 0 };

    let totalDuration = 0;
    let finishedCount = 0;

    const financialStats = {
      revenue: 0,
      expenses: 0,
      profit: 0,
      margin: 0,
      timeline: [] as { date: string, revenue: number, expenses: number, profit: number }[]
    };

    const financialByDate: Record<string, { revenue: number, expenses: number }> = {};

    filteredByDateAndTech.forEach(o => {
      const created = parseISO(o.createdAt);
      const dateKey = format(created, reportPeriod === 'monthly' ? 'MMM' : 'dd/MM');
      
      // Calculate OS Revenue (Normalization Saving + Material Prices)
      const osRevenue = o.estimatedNormalizationSaving || 0;
      const materialRevenue = o.materials?.reduce((sum, m) => sum + ((m.price || 0) * m.quantity), 0) || 0;
      const totalOSRevenue = osRevenue + materialRevenue;

      // Calculate OS Expenses (OS Cost + Material Costs)
      const osExpense = o.cost || 0;
      const materialExpense = o.materials?.reduce((sum, m) => sum + ((m.cost || 0) * m.quantity), 0) || 0;
      const totalOSExpense = osExpense + materialExpense;

      financialStats.revenue += totalOSRevenue;
      financialStats.expenses += totalOSExpense;

      if (!financialByDate[dateKey]) financialByDate[dateKey] = { revenue: 0, expenses: 0 };
      financialByDate[dateKey].revenue += totalOSRevenue;
      financialByDate[dateKey].expenses += totalOSExpense;
      
      // ... existing logic ...
      if (o.pengCrossings && o.pengCrossings.length > 0 && o.status === 'Concluída') {
        financialImpactTotal += o.estimatedNormalizationSaving || 0;
        if (o.rootCause) {
          originDistribution[o.rootCause] = (originDistribution[o.rootCause] || 0) + 1;
        }
      }

      if (o.tower && o.floor && o.unit) {
        if (!pathologyHeatmap[o.tower]) pathologyHeatmap[o.tower] = {};
        if (!pathologyHeatmap[o.tower][o.floor]) pathologyHeatmap[o.tower][o.floor] = {};
        pathologyHeatmap[o.tower][o.floor][o.unit] = (pathologyHeatmap[o.tower][o.floor][o.unit] || 0) + 1;
      }
      
      let timelineKey = '';
      if (reportPeriod === 'daily') {
        timelineKey = format(created, 'dd/MM');
      } else if (reportPeriod === 'weekly') {
        timelineKey = `Sem ${format(created, 'ww')}`;
      } else if (reportPeriod === 'monthly') {
        timelineKey = format(created, 'MMM', { locale: ptBR });
      } else if (reportPeriod === 'yearly') {
        timelineKey = format(created, 'yyyy');
      }
      
      timelineData[timelineKey] = (timelineData[timelineKey] || 0) + 1;
      
      if (o.pengCrossings && o.pengCrossings.length > 0 && o.status === 'Concluída') {
        financialTimelineData[timelineKey] = (financialTimelineData[timelineKey] || 0) + (o.estimatedNormalizationSaving || 0);
      }
      
      statusDistribution[o.status] = (statusDistribution[o.status] || 0) + 1;
      if (o.status === 'Concluída') counts.completed++;
      if (o.status === 'Aberta') counts.open++;
      if (o.status === 'Em andamento') counts.inProgress++;

      typeDistribution[o.serviceType] = (typeDistribution[o.serviceType] || 0) + 1;

      const isTechAssistance = o.serviceType.toLowerCase().includes('assistência') || o.serviceType.toLowerCase().includes('manutenção');

      if (isAfter(created, startOfDay(now))) {
        counts.day++;
        if (isTechAssistance) techAssistanceCounts.day++;
      }
      if (isAfter(created, startOfWeek(now))) {
        counts.week++;
        if (isTechAssistance) techAssistanceCounts.week++;
      }
      if (isAfter(created, startOfMonth(now))) {
        counts.month++;
        if (isTechAssistance) techAssistanceCounts.month++;
      }
      if (isAfter(created, startOfYear(now))) counts.year++;

      // Count signed documents
      if (o.requiredDocuments) {
        o.requiredDocuments.forEach(doc => {
          if (doc.signedAt) signedDocsCount++;
        });
      }

      if (o.assignedTechnicianId) {
        const tech = systemUsers.find(u => u.uid === o.assignedTechnicianId);
        const techName = tech?.name || 'Desconhecido';
        if (!techStats[o.assignedTechnicianId]) {
          techStats[o.assignedTechnicianId] = { name: techName, count: 0, totalTime: 0, totalExecutionTime: 0, executionCount: 0, inProgress: 0 };
        }
        
        if (o.status === 'Em andamento') {
          techStats[o.assignedTechnicianId].inProgress++;
        }

        if (o.status === 'Concluída' && o.finishedAt) {
          const finished = parseISO(o.finishedAt);
          const duration = differenceInMinutes(finished, created);
          totalDuration += duration;
          finishedCount++;

          techStats[o.assignedTechnicianId].count++;
          techStats[o.assignedTechnicianId].totalTime += duration;

          // Execution time (startedAt to finishedAt)
          if (o.startedAt) {
            const started = parseISO(o.startedAt);
            const execDuration = differenceInMinutes(finished, started);
            techStats[o.assignedTechnicianId].totalExecutionTime += execDuration;
            techStats[o.assignedTechnicianId].executionCount++;
          }

          if (o.materials) {
            o.materials.forEach(m => {
              if (!materialUsage[m.name]) materialUsage[m.name] = { name: m.name, quantity: 0 };
              materialUsage[m.name].quantity += m.quantity;
            });
          }
        }
      }
    });

    const avgDuration = finishedCount > 0 ? Math.round(totalDuration / finishedCount) : 0;
    
    const abcData = Object.values(materialUsage)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    const techRanking = Object.values(techStats)
      .sort((a, b) => b.count - a.count);

    const pieStatusData = Object.entries(statusDistribution).map(([name, value]) => ({ name, value }));
    const pieTypeData = Object.entries(typeDistribution).map(([name, value]) => ({ name, value }));
    
    let lineChartData = Object.entries(timelineData)
      .map(([date, count]) => ({ 
        date, 
        count,
        savings: financialTimelineData[date] || 0
      }));

    if (reportPeriod === 'daily') {
      lineChartData = lineChartData.sort((a, b) => {
        const [da, ma] = a.date.split('/').map(Number);
        const [db, mb] = b.date.split('/').map(Number);
        return ma !== mb ? ma - mb : da - db;
      }).slice(-7);
    } else if (reportPeriod === 'weekly') {
      lineChartData = lineChartData.sort((a, b) => {
        const wa = parseInt(a.date.split(' ')[1]);
        const wb = parseInt(b.date.split(' ')[1]);
        return wa - wb;
      }).slice(-8);
    } else if (reportPeriod === 'monthly') {
      const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
      lineChartData = lineChartData.sort((a, b) => {
        return months.indexOf(a.date.toLowerCase()) - months.indexOf(b.date.toLowerCase());
      });
    } else {
      lineChartData = lineChartData.sort((a, b) => parseInt(a.date) - parseInt(b.date));
    }

    financialStats.profit = financialStats.revenue - financialStats.expenses;
    financialStats.margin = financialStats.revenue > 0 ? (financialStats.profit / financialStats.revenue) * 100 : 0;
    financialStats.timeline = Object.entries(financialByDate).map(([date, data]) => ({
      date,
      revenue: data.revenue,
      expenses: data.expenses,
      profit: data.revenue - data.expenses
    }));

    return { 
      counts, 
      techAssistanceCounts,
      signedDocsCount,
      avgDuration, 
      abcData, 
      techRanking, 
      filteredOrders: filteredByDateAndTech, 
      pieStatusData, 
      pieTypeData, 
      lineChartData,
      financialStats,
      pengStats: {
        financialImpactTotal,
        pathologyHeatmap,
        originDistribution: Object.entries(originDistribution).map(([name, value]) => ({ name, value }))
      }
    };
  }, [orders, systemUsers, startDate, endDate, reportTechId, reportServiceType, reportPeriod]);

  const finalFilteredOrders = reports.filteredOrders.filter(o => {
    const matchesStatus = filter === 'Todos' ? true : o.status === filter;
    const matchesHouse = houseNumberFilter ? o.houseNumber?.toLowerCase().includes(houseNumberFilter.toLowerCase()) : true;
    return matchesStatus && matchesHouse;
  });

  const handleSaveSettings = async (newSettings: SystemSettings) => {
    try {
      await supabaseService.updateSettings(newSettings);
      setSettings(newSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const getStatusColor = (status: OSStatus) => {
    switch (status) {
      case 'Aberta': return 'bg-blue-500/10 text-blue-400 border border-blue-500/30';
      case 'Em andamento': return 'bg-amber-500/10 text-amber-400 border border-amber-500/30';
      case 'Concluída': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30';
      default: return 'bg-soft-bg text-soft-text/60 border border-soft-border';
    }
  };

  const canEditOS = profile.role === 'admin' || profile.permissions?.canEditOS;
  const canDeleteOS = profile.role === 'admin' || profile.permissions?.canDeleteOS;
  const canCreateOS = profile.role === 'admin' || profile.permissions?.canCreateOS;
  const canManageUsers = profile.role === 'admin' || profile.permissions?.canManageUsers;
  const canCreateMaterials = profile.role === 'admin' || profile.permissions?.canCreateMaterials;
  const canEditMaterials = profile.role === 'admin' || profile.permissions?.canEditMaterials;
  const canDeleteMaterials = profile.role === 'admin' || profile.permissions?.canDeleteMaterials;
  const canCreateDocuments = profile.role === 'admin' || profile.permissions?.canCreateDocuments;
  const canEditDocuments = profile.role === 'admin' || profile.permissions?.canEditDocuments;
  const canDeleteDocuments = profile.role === 'admin' || profile.permissions?.canDeleteDocuments;
  const canManageSettings = profile.role === 'admin' || profile.permissions?.canManageSettings;
  const canViewReports = profile.role === 'admin' || profile.permissions?.canViewReports;
  const canViewOSReports = profile.role === 'admin' || profile.permissions?.canViewOSReports;
  const canViewMaterialReports = profile.role === 'admin' || profile.permissions?.canViewMaterialReports;
  const canViewTechnicianReports = profile.role === 'admin' || profile.permissions?.canViewTechnicianReports;
  const canViewFinancialReports = profile.role === 'admin' || profile.permissions?.canViewFinancialReports;
  const canFinalizeOS = profile.role === 'admin' || profile.permissions?.canFinalizeOS;
  const canApproveOS = profile.role === 'admin' || profile.permissions?.canApproveOS;

  const canManageMaterials = profile.role === 'admin' || canCreateMaterials || canEditMaterials || canDeleteMaterials;
  const canManageDocuments = profile.role === 'admin' || canCreateDocuments || canEditDocuments || canDeleteDocuments;

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-soft-bg transition-colors duration-300">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between px-6 py-4 bg-soft-card border-b border-soft-border sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3.5">
          {settings.logo ? (
            <img src={settings.logo} alt="Logo" className="h-9 w-auto object-contain" />
          ) : (
            <div className="w-9 h-9 bg-soft-accent rounded-xl flex items-center justify-center text-white font-black text-[11px] shadow-lg shadow-soft-accent/20">OX</div>
          )}
          <div className="flex flex-col">
            <span className="text-sm font-black tracking-tight text-soft-text uppercase leading-none">{settings.companyName || 'OBRAX'}</span>
            <span className="text-[7px] font-black tracking-[0.2em] text-soft-text/30 uppercase mt-1">SaaS Engineering</span>
          </div>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2.5 -mr-2 text-soft-text/60 hover:text-soft-text active:scale-90 transition-all"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-soft-card border-r border-soft-border flex flex-col transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:fixed lg:h-full
      `}>
        {/* Logo area */}
        <div className="p-8 border-b border-soft-border flex items-center justify-between lg:justify-start gap-4">
          <div className="flex items-center gap-4">
            {settings.logo ? (
              <img src={settings.logo} alt="Logo" className="h-11 w-auto object-contain" />
            ) : (
              <div className="w-11 h-11 bg-soft-accent rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-lg shadow-soft-accent/20">OX</div>
            )}
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tighter text-soft-text uppercase leading-none">{settings.companyName || 'OBRAX'}</span>
              <span className="text-[9px] font-black tracking-[0.2em] text-soft-text/30 uppercase mt-1.5">SaaS Engineering</span>
            </div>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden p-2.5 -mr-2 text-soft-text/20 hover:text-soft-danger active:scale-90 transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-6 space-y-8 overflow-y-auto no-scrollbar">
          {/* Operacional Section */}
          <div className="space-y-2">
            <span className="px-4 text-[9px] font-black text-soft-text/20 uppercase tracking-[0.2em]">Operacional</span>
            <div className="space-y-1">
              {profile.role === 'admin' && (
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-[0.1em] transition-all group ${
                    activeTab === 'dashboard' 
                      ? 'bg-soft-accent text-white shadow-xl shadow-soft-accent/25' 
                      : 'text-soft-text/40 hover:text-soft-text hover:bg-soft-bg'
                  }`}
                >
                  <LayoutDashboard className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${activeTab === 'dashboard' ? 'text-white' : 'text-soft-text/30'}`} />
                  Dashboard
                </button>
              )}
              <button
                onClick={() => setActiveTab('os')}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-[0.1em] transition-all group ${
                  activeTab === 'os' 
                    ? 'bg-soft-accent text-white shadow-xl shadow-soft-accent/25' 
                    : 'text-soft-text/40 hover:text-soft-text hover:bg-soft-bg'
                }`}
              >
                <Wrench className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${activeTab === 'os' ? 'text-white' : 'text-soft-text/30'}`} />
                Ordens de Serviço
              </button>
              {canManageMaterials && (
                <button
                  onClick={() => setActiveTab('materials')}
                  className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-[0.1em] transition-all group ${
                    activeTab === 'materials' 
                      ? 'bg-soft-accent text-white shadow-xl shadow-soft-accent/25' 
                      : 'text-soft-text/40 hover:text-soft-text hover:bg-soft-bg'
                  }`}
                >
                  <Package className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${activeTab === 'materials' ? 'text-white' : 'text-soft-text/30'}`} />
                  Materiais
                </button>
              )}
            </div>
          </div>

          {/* Gestão Section */}
          <div className="space-y-2">
            <span className="px-4 text-[9px] font-black text-soft-text/20 uppercase tracking-[0.2em]">Gestão & Laudos</span>
            <div className="space-y-1">
              {canViewReports && (
                <button
                  onClick={() => setActiveTab('pericial_report')}
                  className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-[0.1em] transition-all group ${
                    activeTab === 'pericial_report' 
                      ? 'bg-soft-accent text-white shadow-xl shadow-soft-accent/25' 
                      : 'text-soft-text/40 hover:text-soft-text hover:bg-soft-bg'
                  }`}
                >
                  <ShieldCheck className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${activeTab === 'pericial_report' ? 'text-white' : 'text-soft-text/30'}`} />
                  Laudo Pericial
                </button>
              )}
              {canViewReports && (
                <button
                  onClick={() => setActiveTab('management_impact')}
                  className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-[0.1em] transition-all group ${
                    activeTab === 'management_impact' 
                      ? 'bg-soft-accent text-white shadow-xl shadow-soft-accent/25' 
                      : 'text-soft-text/40 hover:text-soft-text hover:bg-soft-bg'
                  }`}
                >
                  <TrendingUp className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${activeTab === 'management_impact' ? 'text-white' : 'text-soft-text/30'}`} />
                  Impacto de Gestão
                </button>
              )}
              {canViewReports && (
                <button
                  onClick={() => setActiveTab('reports')}
                  className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-[0.1em] transition-all group ${
                    activeTab === 'reports' 
                      ? 'bg-soft-accent text-white shadow-xl shadow-soft-accent/25' 
                      : 'text-soft-text/40 hover:text-soft-text hover:bg-soft-bg'
                  }`}
                >
                  <PieChartIcon className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${activeTab === 'reports' ? 'text-white' : 'text-soft-text/30'}`} />
                  Relatórios
                </button>
              )}
            </div>
          </div>

          {/* Configurações Section */}
          <div className="space-y-2">
            <span className="px-4 text-[9px] font-black text-soft-text/20 uppercase tracking-[0.2em]">Sistema</span>
            <div className="space-y-1">
              {canManageUsers && (
                <button
                  onClick={() => setActiveTab('users')}
                  className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-[0.1em] transition-all group ${
                    activeTab === 'users' 
                      ? 'bg-soft-accent text-white shadow-xl shadow-soft-accent/25' 
                      : 'text-soft-text/40 hover:text-soft-text hover:bg-soft-bg'
                  }`}
                >
                  <Users className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${activeTab === 'users' ? 'text-white' : 'text-soft-text/30'}`} />
                  Usuários
                </button>
              )}
              {canManageDocuments && (
                <button
                  onClick={() => setActiveTab('documents')}
                  className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-[0.1em] transition-all group ${
                    activeTab === 'documents' 
                      ? 'bg-soft-accent text-white shadow-xl shadow-soft-accent/25' 
                      : 'text-soft-text/40 hover:text-soft-text hover:bg-soft-bg'
                  }`}
                >
                  <FileCode className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${activeTab === 'documents' ? 'text-white' : 'text-soft-text/30'}`} />
                  Documentos
                </button>
              )}
              {canManageSettings && (
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-[0.1em] transition-all group ${
                    activeTab === 'settings' 
                      ? 'bg-soft-accent text-white shadow-xl shadow-soft-accent/25' 
                      : 'text-soft-text/40 hover:text-soft-text hover:bg-soft-bg'
                  }`}
                >
                  <Settings className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${activeTab === 'settings' ? 'text-white' : 'text-soft-text/30'}`} />
                  Configurações
                </button>
              )}
            </div>
          </div>
        </nav>

        {/* User Profile */}
        <div className="p-6 border-t border-soft-border bg-soft-bg/30">
{/* Assinatura OBRAX */}
{settings?.plan !== 'enterprise' && (
  <div className="flex items-center justify-center gap-1.5 py-2 border-t border-soft-border/40">
    <span className="text-[9px] text-soft-text/20 font-medium">desenvolvido por</span>
    <a href="https://obrax.com.br" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 opacity-30 hover:opacity-70 transition-opacity">
      <span className="w-[13px] h-[13px] bg-soft-accent rounded-[3px] flex items-center justify-center flex-shrink-0">
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" className="w-[8px] h-[8px]"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      </span>
      <span className="text-[10px] font-semibold text-soft-text/60 tracking-wide">OBRAX</span>
    </a>
  </div>
)} 
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-soft-accent/10 text-soft-accent rounded-xl flex items-center justify-center font-black text-xs">
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-soft-text truncate uppercase tracking-tight">{profile.name}</p>
              <p className="text-[10px] text-soft-text/40 truncate uppercase font-black tracking-widest">{profile.role}</p>
            </div>
            <button 
              onClick={() => supabase.auth.signOut()}
              className="p-2 text-soft-text/20 hover:text-soft-danger transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-72 p-4 lg:p-10">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-soft-text/20" />
              <input 
                type="text"
                placeholder="BUSCAR ORDENS, CLIENTES OU LAUDOS..."
                className="w-full pl-12 pr-4 py-3 bg-soft-card border border-soft-border rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-soft-accent/20 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-3 bg-soft-card border border-soft-border rounded-2xl text-soft-text/40 hover:text-soft-accent transition-all active:scale-95 shadow-sm relative"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-soft-danger text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-soft-card">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-4 w-96 bg-white rounded-[32px] border border-soft-border shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
                  <div className="p-6 border-b border-soft-border flex items-center justify-between bg-soft-bg/30">
                    <h4 className="text-[10px] font-black text-soft-text uppercase tracking-widest">Notificações</h4>
                    <div className="flex gap-2">
                      <button 
                        onClick={handleMarkAllAsRead}
                        className="px-3 py-1 bg-white border border-soft-border rounded-lg text-[8px] font-black text-soft-text/40 hover:text-soft-text uppercase tracking-widest transition-all"
                        title="Marcar todas as notificações como lidas."
                      >
                        Lidas
                      </button>
                      <button 
                        onClick={handleClearNotifications}
                        className="px-3 py-1 bg-white border border-soft-border rounded-lg text-[8px] font-black text-soft-danger/60 hover:text-soft-danger uppercase tracking-widest transition-all"
                        title="Remover todas as notificações da lista."
                      >
                        Limpar
                      </button>
                    </div>
                  </div>
                  <div className="max-h-[480px] overflow-y-auto custom-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="p-12 text-center">
                        <Bell className="w-10 h-10 text-soft-text/10 mx-auto mb-4" />
                        <p className="text-[10px] font-black text-soft-text/40 uppercase tracking-widest">Sem notificações</p>
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div 
                          key={n.id} 
                          onClick={() => handleMarkAsRead(n.id)}
                          className={`p-6 border-b border-soft-bg cursor-pointer transition-all hover:bg-soft-bg/50 ${n.read ? 'opacity-60' : 'bg-soft-accent/5'}`}
                        >
                          <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-2xl ${
                              n.type === 'new_os' ? 'bg-soft-accent/10 text-soft-accent' : 
                              n.type === 'os_completed' ? 'bg-soft-success/10 text-soft-success' :
                              n.type === 'deadline_approaching' ? 'bg-soft-danger/10 text-soft-danger' :
                              'bg-soft-warning/10 text-soft-warning'
                            }`}>
                              {n.type === 'new_os' ? <Plus className="w-4 h-4" /> : 
                               n.type === 'os_completed' ? <CheckCircle className="w-4 h-4" /> :
                               n.type === 'deadline_approaching' ? <AlertTriangle className="w-4 h-4" /> :
                               <Clock className="w-4 h-4" />}
                            </div>
                            <div className="flex-1">
                              <p className="text-xs font-black text-soft-text uppercase tracking-tight leading-tight">{n.title}</p>
                              <p className="text-[10px] text-soft-text/50 mt-1 leading-relaxed">{n.message}</p>
                              <p className="text-[8px] text-soft-text/40 mt-3 font-black uppercase tracking-widest">
                                {format(new Date(n.createdAt), 'dd/MM HH:mm')}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Floating Action Button for Mobile */}
        {(profile.role === 'admin' || profile.permissions?.canCreateOS) && (
          <button
            onClick={() => { 
              resetOSForm(); 
              setPreInspection(DEFAULT_PRE_INSPECTION);
              setCompletionChecklist(DEFAULT_COMPLETION_CHECKLIST);
              setShowOSForm(true); 
            }}
            className="md:hidden fixed bottom-8 right-8 z-40 w-14 h-14 bg-soft-accent text-white rounded-2xl shadow-2xl shadow-soft-accent/40 flex items-center justify-center active:scale-95 transition-transform"
          >
            <Plus className="w-8 h-8" />
          </button>
        )}

        {activeTab === 'dashboard' && canViewReports ? (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700" id="dashboard-content">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <h2 className="text-4xl font-black text-soft-text tracking-tighter uppercase">Visão Geral</h2>
              <p className="text-xs font-black text-soft-text/30 uppercase tracking-[0.2em]">Inteligência em Patologia e Performance Operacional</p>
            </div>
            <div className="flex items-center gap-3 bg-soft-card p-1.5 rounded-2xl border border-soft-border shadow-sm">
              {['daily', 'weekly', 'monthly'].map((p) => (
                <button 
                  key={p}
                  onClick={() => setTimelinePeriod(p as any)}
                  className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${timelinePeriod === p ? 'bg-soft-accent text-white shadow-lg shadow-soft-accent/20' : 'text-soft-text/40 hover:text-soft-text'}`}
                  title={p === 'daily' ? 'Ver dados de hoje' : p === 'weekly' ? 'Ver dados da última semana' : 'Ver dados do último mês'}
                >
                  {p === 'daily' ? 'Hoje' : p === 'weekly' ? 'Semana' : 'Mês'}
                </button>
              ))}
            </div>
          </div>

          {/* Metrics Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bento-card bg-soft-accent text-white border-none shadow-xl shadow-soft-accent/20 overflow-hidden relative group md:col-span-2">
              <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
              <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-2">Total de Ocorrências</p>
                <div className="flex items-end gap-3">
                  <h3 className="text-6xl font-black tracking-tighter">{reports.filteredOrders.length}</h3>
                  <div className="mb-2 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full">
                    <TrendingUp className="w-3 h-3" />
                    <span>+5.2%</span>
                  </div>
                </div>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-4">Volume total monitorado no período selecionado</p>
              </div>
            </div>

            <div className="bento-card bg-soft-text text-white border-none shadow-xl shadow-soft-text/20 overflow-hidden relative group">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
              <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-2">Economia PENG</p>
                <h3 className="text-4xl font-black tracking-tighter">R$ {(orders.reduce((acc, os) => acc + (os.estimatedNormalizationSaving || 0), 0) / 1000).toFixed(1)}k</h3>
                <div className="mt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-soft-success">
                  <Zap className="w-3 h-3" />
                  <span>Normalização Ativa</span>
                </div>
              </div>
            </div>

            <div className="bento-card border-2 border-soft-accent/20 overflow-hidden relative group">
              <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-widest text-soft-text/40 mb-2">Falha Crítica</p>
                <h3 className="text-4xl font-black tracking-tighter text-soft-text">18.5<span className="text-xl text-soft-text/20 ml-1">%</span></h3>
                <div className="mt-6 w-full h-1.5 bg-soft-bg rounded-full overflow-hidden">
                  <div className="h-full bg-soft-accent" style={{ width: '18.5%' }} />
                </div>
                <p className="text-[8px] font-black text-soft-text/30 uppercase tracking-widest mt-3">Meta: Abaixo de 15%</p>
              </div>
            </div>
          </div>

          {/* Main Visualization Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bento-card">
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h3 className="text-lg font-black text-soft-text uppercase tracking-tight">Fluxo de Patologias</h3>
                  <p className="text-[10px] text-soft-text/30 font-black uppercase tracking-widest mt-1">Volume de ocorrências por período</p>
                </div>
                <div className="p-2 bg-soft-bg rounded-xl">
                  <BarChart3 className="w-5 h-5 text-soft-text/20" />
                </div>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={reports.lineChartData}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary-color)" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="var(--primary-color)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} style={{ fontSize: '10px', fontWeight: '900', fill: 'var(--text-color)', opacity: 0.2 }} />
                    <YAxis axisLine={false} tickLine={false} style={{ fontSize: '10px', fontWeight: '900', fill: 'var(--text-color)', opacity: 0.2 }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold', backgroundColor: 'var(--surface-color)', color: 'var(--text-color)' }}
                    />
                    <Area type="monotone" dataKey="count" stroke="var(--primary-color)" strokeWidth={4} fillOpacity={1} fill="url(#colorCount)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bento-card">
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h3 className="text-lg font-black text-soft-text uppercase tracking-tight">Causa Raiz</h3>
                  <p className="text-[10px] text-soft-text/30 font-black uppercase tracking-widest mt-1">Diagnóstico de Planejamento</p>
                </div>
                <div className="p-2 bg-soft-bg rounded-xl">
                  <Target className="w-5 h-5 text-soft-text/20" />
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Execução', value: orders.filter(o => o.rootCause === 'execution').length },
                        { name: 'Projeto', value: orders.filter(o => o.rootCause === 'design').length },
                        { name: 'Especificação', value: orders.filter(o => o.rootCause === 'specification').length },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={10}
                      dataKey="value"
                    >
                      <Cell fill="var(--primary-color)" />
                      <Cell fill="var(--warning-color)" />
                      <Cell fill="var(--danger-color)" />
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 'bold' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3 mt-6">
                {[
                  { label: 'Execução', color: 'bg-soft-accent', value: orders.filter(o => o.rootCause === 'execution').length },
                  { label: 'Projeto', color: 'bg-soft-warning', value: orders.filter(o => o.rootCause === 'design').length },
                  { label: 'Especificação', color: 'bg-soft-danger', value: orders.filter(o => o.rootCause === 'specification').length },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between p-3 bg-soft-bg rounded-2xl">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${item.color}`} />
                      <span className="text-[10px] font-black uppercase tracking-widest text-soft-text/60">{item.label}</span>
                    </div>
                    <span className="text-xs font-black text-soft-text">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Actions & Recent Activity Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bento-card">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-soft-accent/10 rounded-xl">
                  <Zap className="w-5 h-5 text-soft-accent" />
                </div>
                <h3 className="text-lg font-black text-soft-text uppercase tracking-tight">Ações Rápidas</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => { resetOSForm(); setShowOSForm(true); }}
                  className="p-6 bg-soft-bg rounded-[24px] border border-soft-border hover:border-soft-accent/30 hover:bg-white transition-all group text-left"
                  title="Criar uma nova Ordem de Serviço."
                >
                  <div className="p-3 bg-white rounded-2xl w-fit mb-4 shadow-sm group-hover:shadow-md transition-all">
                    <Plus className="w-5 h-5 text-soft-accent" />
                  </div>
                  <span className="block text-[11px] font-black uppercase tracking-widest text-soft-text">Nova OS</span>
                  <span className="text-[9px] font-bold text-soft-text/30 uppercase tracking-widest">Registrar ocorrência</span>
                </button>
                <button 
                  onClick={() => setActiveTab('pericial_report')}
                  className="p-6 bg-soft-bg rounded-[24px] border border-soft-border hover:border-soft-accent/30 hover:bg-white transition-all group text-left"
                  title="Gerar um laudo pericial técnico detalhado."
                >
                  <div className="p-3 bg-white rounded-2xl w-fit mb-4 shadow-sm group-hover:shadow-md transition-all">
                    <FileText className="w-5 h-5 text-soft-accent" />
                  </div>
                  <span className="block text-[11px] font-black uppercase tracking-widest text-soft-text">Laudo Pericial</span>
                  <span className="text-[9px] font-bold text-soft-text/30 uppercase tracking-widest">Gerar relatório técnico</span>
                </button>
                <button 
                  onClick={() => setActiveTab('management_impact')}
                  className="p-6 bg-soft-bg rounded-[24px] border border-soft-border hover:border-soft-accent/30 hover:bg-white transition-all group text-left"
                  title="Analisar o impacto financeiro e economia gerada."
                >
                  <div className="p-3 bg-white rounded-2xl w-fit mb-4 shadow-sm group-hover:shadow-md transition-all">
                    <TrendingUp className="w-5 h-5 text-soft-accent" />
                  </div>
                  <span className="block text-[11px] font-black uppercase tracking-widest text-soft-text">Impacto</span>
                  <span className="text-[9px] font-bold text-soft-text/30 uppercase tracking-widest">Análise de economia</span>
                </button>
                <button 
                  onClick={() => setActiveTab('users')}
                  className="p-6 bg-soft-bg rounded-[24px] border border-soft-border hover:border-soft-accent/30 hover:bg-white transition-all group text-left"
                  title="Gerenciar os usuários e técnicos da plataforma."
                >
                  <div className="p-3 bg-white rounded-2xl w-fit mb-4 shadow-sm group-hover:shadow-md transition-all">
                    <Users className="w-5 h-5 text-soft-accent" />
                  </div>
                  <span className="block text-[11px] font-black uppercase tracking-widest text-soft-text">Equipe</span>
                  <span className="text-[9px] font-bold text-soft-text/30 uppercase tracking-widest">Gerenciar técnicos</span>
                </button>
              </div>
            </div>

            <div className="bento-card">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-soft-accent/10 rounded-xl">
                    <Clock className="w-5 h-5 text-soft-accent" />
                  </div>
                  <h3 className="text-lg font-black text-soft-text uppercase tracking-tight">Atividade Recente</h3>
                </div>
                <button 
                  onClick={() => setActiveTab('os')}
                  className="text-[10px] font-black text-soft-accent uppercase tracking-widest hover:underline"
                >
                  Ver Tudo
                </button>
              </div>
              <div className="space-y-4">
                {orders.slice(0, 5).map((os) => (
                  <div key={os.id} className="flex items-center gap-4 p-4 bg-soft-bg rounded-2xl border border-soft-border/50">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      os.status === 'Aberta' ? 'bg-blue-100 text-blue-600' : 
                      os.status === 'Em andamento' ? 'bg-amber-100 text-amber-600' : 
                      'bg-emerald-100 text-emerald-600'
                    }`}>
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black text-soft-text uppercase tracking-tight truncate">{os.clientName}</p>
                      <p className="text-[9px] font-bold text-soft-text/30 uppercase tracking-widest truncate">{os.serviceType} • {os.houseNumber}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black text-soft-text/40 uppercase tracking-widest">{format(parseISO(os.createdAt), 'dd/MM')}</p>
                      <span className={`text-[8px] font-black uppercase tracking-widest ${
                        os.status === 'Aberta' ? 'text-blue-500' : 
                        os.status === 'Em andamento' ? 'text-amber-500' : 
                        'text-emerald-500'
                      }`}>{os.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'settings' && canManageSettings ? (
        <SettingsTab 
          settings={settings} 
          handleSaveSettings={handleSaveSettings} 
          getContrastColor={getContrastColor} 
        />
      ) : activeTab === 'management_impact' && canViewReports ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Bento Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
            <div>
              <h2 className="text-3xl font-black text-soft-text tracking-tight">Gestão de Lucro</h2>
              <p className="text-sm font-medium text-soft-text/50 uppercase tracking-widest mt-1">Impacto Financeiro e Normalização PENG</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select 
                value={reportPeriod} 
                onChange={(e) => setReportPeriod(e.target.value as any)}
                className="px-4 py-2 bg-white border border-soft-border text-[10px] font-black uppercase tracking-widest rounded-xl outline-none focus:ring-2 focus:ring-soft-accent transition-all"
                title="Filtrar por período de tempo."
              >
                <option value="daily">Diário</option>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensal</option>
                <option value="yearly">Anual</option>
              </select>
              <select 
                value={reportServiceType} 
                onChange={(e) => setReportServiceType(e.target.value as any)}
                className="px-4 py-2 bg-white border border-soft-border text-[10px] font-black uppercase tracking-widest rounded-xl outline-none focus:ring-2 focus:ring-soft-accent transition-all"
                title="Filtrar por tipo de serviço."
              >
                <option value="Todos">Todos os Serviços</option>
                {SERVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select 
                value={reportTechId} 
                onChange={(e) => setReportTechId(e.target.value)}
                className="px-4 py-2 bg-white border border-soft-border text-[10px] font-black uppercase tracking-widest rounded-xl outline-none focus:ring-2 focus:ring-soft-accent transition-all"
                title="Filtrar por técnico responsável."
              >
                <option value="Todos">Todos os Técnicos</option>
                {systemUsers.filter(u => u.role === 'technician').map(u => <option key={u.uid} value={u.uid}>{u.name}</option>)}
              </select>
            </div>
          </div>

          {/* Bento Grid Financial */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Impact Card */}
            <div className="md:col-span-1 bento-card bg-soft-success text-white border-none shadow-lg shadow-soft-success/20">
              <div className="flex flex-col h-full justify-between">
                <div>
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-black tracking-tight leading-tight">Impacto Financeiro Total</h3>
                  <p className="text-white/70 text-[10px] font-black uppercase tracking-widest mt-2">Acumulado PENG</p>
                </div>
                <div className="mt-8">
                  <p className="text-4xl font-black tracking-tighter">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(reports.pengStats.financialImpactTotal)}
                  </p>
                  <p className="text-white/40 text-[8px] font-black uppercase tracking-widest mt-4 leading-relaxed">
                    Custo evitado através da normalização de falhas repetitivas em escala.
                  </p>
                </div>
              </div>
            </div>

            {/* Origin Distribution Chart */}
            <div className="md:col-span-1 bento-card">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-black text-soft-text flex items-center gap-2">
                    <Target className="w-5 h-5 text-soft-accent" />
                    Origem das Patologias
                  </h3>
                  <p className="text-[10px] text-soft-text/40 font-black uppercase tracking-widest mt-0.5">Diagnóstico de causa raiz (PENG)</p>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reports.pengStats.originDistribution} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="rgba(0,0,0,0.03)" />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={100} 
                      axisLine={false} 
                      tickLine={false} 
                      style={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', fill: '#8e8e93' }}
                      tickFormatter={(val) => {
                        if (val === 'specification') return 'Espec.';
                        if (val === 'detailing') return 'Detalh.';
                        if (val === 'material') return 'Material';
                        if (val === 'execution') return 'Execução';
                        if (val === 'design') return 'Projeto';
                        return val;
                      }}
                    />
                    <Tooltip 
                      cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                      contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="value" fill="#0071e3" radius={[0, 12, 12, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Financial Impact Timeline Chart */}
            <div className="md:col-span-1 bento-card">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-black text-soft-text flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-soft-success" />
                    Economia por Período
                  </h3>
                  <p className="text-[10px] text-soft-text/40 font-black uppercase tracking-widest mt-0.5">Evolução da economia PENG</p>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={reports.lineChartData}>
                    <defs>
                      <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#34c759" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#34c759" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      style={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', fill: '#8e8e93' }}
                    />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }}
                      formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Economia']}
                    />
                    <Area type="monotone" dataKey="savings" stroke="#34c759" strokeWidth={3} fillOpacity={1} fill="url(#colorSavings)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Heatmap Card - Large */}
            <div className="md:col-span-3 bento-card">
              <div className="mb-8">
                <h3 className="text-lg font-black text-soft-text flex items-center gap-2">
                  <Layers className="w-5 h-5 text-soft-accent" />
                  Mapa de Calor de Patologias
                </h3>
                <p className="text-[10px] text-soft-text/40 font-black uppercase tracking-widest mt-0.5">Visualização por torre e unidade</p>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {Object.entries(reports.pengStats.pathologyHeatmap).length === 0 ? (
                  <div className="col-span-2 text-center py-12 bg-soft-bg rounded-3xl border border-dashed border-soft-border">
                    <p className="text-soft-text/40 font-black uppercase tracking-widest text-[10px]">Nenhuma patologia mapeada geograficamente</p>
                  </div>
                ) : (
                  Object.entries(reports.pengStats.pathologyHeatmap).map(([tower, floors]) => (
                    <div key={tower} className="space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-soft-accent text-white rounded-lg flex items-center justify-center text-xs font-black">
                          {tower}
                        </div>
                        <h4 className="text-sm font-black text-soft-text uppercase tracking-widest">
                          Torre {tower}
                        </h4>
                      </div>
                      <div className="flex flex-col gap-3">
                        {Object.entries(floors).sort((a, b) => Number(b[0]) - Number(a[0])).map(([floor, units]) => (
                          <div key={floor} className="flex items-center gap-6">
                            <span className="w-10 text-[10px] font-black text-soft-text/40 uppercase text-right">{floor}º Pav</span>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(units).map(([unit, count]) => (
                                <div 
                                  key={unit}
                                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black transition-all hover:scale-110 cursor-help shadow-sm ${
                                    count > 2 ? 'bg-soft-danger text-white' :
                                    count > 1 ? 'bg-soft-warning text-white' :
                                    'bg-soft-success text-white'
                                  }`}
                                  title={`Unidade ${unit}: ${count} patologia(s)`}
                                >
                                  {unit}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Insight PENG Cards */}
            <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
              {reports.filteredOrders.filter(o => o.pengCrossings && o.pengCrossings.length > 0).slice(0, 4).map((os, idx) => (
                <div key={idx} className="bento-card group hover:border-soft-accent/30 transition-all">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-soft-accent/10 text-soft-accent rounded-2xl flex items-center justify-center group-hover:bg-soft-accent group-hover:text-white transition-all">
                        <Zap className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-soft-text uppercase tracking-tight">Insight PENG #{os.id.slice(-4).toUpperCase()}</h4>
                        <p className="text-[10px] text-soft-text/40 font-black uppercase tracking-widest">{os.serviceType}</p>
                      </div>
                    </div>
                    <div className="px-3 py-1.5 bg-soft-danger/10 text-soft-danger text-[10px] font-black uppercase tracking-widest rounded-xl border border-soft-danger/20">
                      Impacto: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(os.estimatedNormalizationSaving || 0)}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-soft-bg p-5 rounded-2xl border border-soft-border">
                      <p className="text-[10px] font-black text-soft-text/40 uppercase tracking-widest mb-2">Causa Raiz & Normalização</p>
                      <p className="text-xs text-soft-text/70 font-medium leading-relaxed italic">
                        {os.rootCause === 'execution' ? 'Execução' : os.rootCause === 'design' ? 'Projeto' : 'Especificação'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <BookOpen className="w-4 h-4 text-soft-accent" />
                      <span className="text-[10px] font-black text-soft-text uppercase tracking-widest">
                        Norma: {(os.pengCrossings?.[0]?.nbr) || 'NBR 15575'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : activeTab === 'pericial_report' && canViewReports ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
            <div>
              <h2 className="text-3xl font-black text-soft-text tracking-tight">Relatório Pericial Automático</h2>
              <p className="text-sm font-medium text-soft-text/50 uppercase tracking-widest mt-1">Geração de Laudos Técnicos com Inteligência PENG</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-soft-border">
                <label className="text-[8px] font-black text-soft-text/40 uppercase tracking-widest ml-1">Auditor:</label>
                <input 
                  type="text" 
                  placeholder="Nome do Auditor" 
                  value={pericialAuditor}
                  onChange={(e) => setPericialAuditor(e.target.value)}
                  className="bg-transparent border-none outline-none text-[10px] font-bold w-32"
                />
              </div>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-soft-text/30" />
                <input 
                  type="text"
                  placeholder="Buscar unidade..."
                  value={pericialSearch}
                  onChange={(e) => setPericialSearch(e.target.value)}
                  className="pl-11 pr-6 py-3 bg-white border border-soft-border text-soft-text text-[10px] font-black uppercase tracking-widest rounded-2xl outline-none focus:ring-2 focus:ring-soft-accent transition-all w-48"
                />
              </div>
              <button 
                onClick={generateConsolidatedPericialReportPDF}
                disabled={isGeneratingPericialReport}
                className="px-6 py-3 bg-soft-accent text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:shadow-lg active:scale-95 transition-all flex items-center gap-2 shadow-soft-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeneratingPericialReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                Consolidado
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Report Preview Area */}
            <div className="lg:col-span-3 space-y-8">
              {(() => {
                const pericialOrders = orders.filter(o => 
                  (o.pengCrossings && o.pengCrossings.length > 0) &&
                  (o.clientName.toLowerCase().includes(pericialSearch.toLowerCase()) || 
                   o.unit?.toLowerCase().includes(pericialSearch.toLowerCase()) ||
                   o.id.toLowerCase().includes(pericialSearch.toLowerCase()))
                );

                if (pericialOrders.length === 0) {
                  return (
                    <div className="bento-card flex flex-col items-center justify-center py-20 text-center">
                      <div className="w-20 h-20 bg-soft-bg rounded-full flex items-center justify-center mb-6">
                        <Search className="w-10 h-10 text-soft-text/20" />
                      </div>
                      <h3 className="text-xl font-black text-soft-text tracking-tight uppercase">Nenhum Laudo Encontrado</h3>
                      <p className="text-soft-text/40 text-xs font-medium uppercase tracking-widest mt-2 max-w-md">Tente ajustar sua busca ou verifique se a ocorrência possui cruzamento de normas PENG.</p>
                    </div>
                  );
                }

                return pericialOrders.map((os, idx) => (
                  <div key={idx} className="bg-white rounded-[32px] border border-soft-border shadow-sm overflow-hidden group hover:border-soft-accent/30 transition-all">
                    <div className="p-8 border-b border-soft-border bg-soft-bg/30 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-2xl border border-soft-border flex items-center justify-center text-soft-accent shadow-sm">
                          <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-soft-text uppercase tracking-tight">Laudo Técnico #{os.id.slice(-6).toUpperCase()}</h3>
                          <p className="text-[10px] text-soft-text/40 font-black uppercase tracking-widest">Unidade: {os.unit} | Bloco: {os.block}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1.5 bg-soft-success/10 text-soft-success text-[10px] font-black uppercase tracking-widest rounded-xl border border-soft-success/20">
                          Normalizado
                        </span>
                        <button 
                          onClick={() => generatePericialReportPDF(os)}
                          disabled={isGeneratingPericialReport}
                          className="p-3 bg-white border border-soft-border text-soft-text/40 hover:text-soft-accent rounded-xl transition-all active:scale-95 disabled:opacity-50"
                        >
                          {isGeneratingPericialReport ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                    
                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest flex items-center gap-2">
                            <FileText className="w-3 h-3" /> Constatação Técnica
                          </label>
                          <p className="text-sm text-slate-700 font-medium leading-relaxed italic">
                            "{os.description}"
                          </p>
                        </div>

                        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest flex items-center gap-2">
                            <Zap className="w-3 h-3" /> Diagnóstico e Causa Raiz
                          </label>
                          <div className="flex flex-wrap gap-2">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              os.rootCause === 'execution' ? 'bg-amber-100 text-amber-700' :
                              os.rootCause === 'design' ? 'bg-blue-100 text-blue-700' :
                              os.rootCause === 'specification' ? 'bg-purple-100 text-purple-700' :
                              'bg-slate-100 text-slate-500'
                            }`}>
                              {os.rootCause === 'execution' ? 'Falha de Execução' :
                               os.rootCause === 'design' ? 'Erro de Projeto' :
                               os.rootCause === 'specification' ? 'Inconformidade' : 'Não Definida'}
                            </span>
                            {os.criticalityLevel && (
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                os.criticalityLevel === 'high' ? 'bg-red-100 text-red-700' :
                                os.criticalityLevel === 'medium' ? 'bg-orange-100 text-orange-700' :
                                'bg-emerald-100 text-emerald-700'
                              }`}>
                                Crit: {os.criticalityLevel === 'high' ? 'Alta' : os.criticalityLevel === 'medium' ? 'Média' : 'Baixa'}
                              </span>
                            )}
                            {os.criticalFailureIndex !== undefined && (
                              <span className="px-3 py-1 rounded-full bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                                IFC: {os.criticalFailureIndex}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest flex items-center gap-2">
                            <ShieldCheck className="w-3 h-3" /> Recomendação Técnica Corretiva
                          </label>
                          <p className="text-sm text-slate-700 font-medium leading-relaxed italic">
                            {os.technicalRecommendation || 'Aguardando parecer técnico especializado...'}
                          </p>
                        </div>

                        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest flex items-center gap-2">
                            <Scale className="w-3 h-3" /> Fundamentação Normativa (PENG)
                          </label>
                          <div className="space-y-2">
                            {os.pengCrossings && os.pengCrossings.length > 0 ? (
                              os.pengCrossings.slice(0, 3).map((c, i) => (
                                <div key={i} className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 shadow-sm">
                                  <span className="text-[10px] font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{c.nbr}</span>
                                  <span className="text-[10px] text-slate-500 font-bold truncate">{c.normalizationAction}</span>
                                </div>
                              ))
                            ) : (
                              <p className="text-[10px] text-slate-400 italic">Nenhuma norma vinculada ao cruzamento.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-8 border-t border-soft-border bg-soft-bg/10 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex -space-x-2">
                          {[...(os.beforePhotos || []), ...(os.afterPhotos || [])].slice(0, 5).map((p, i) => (
                            <div key={i} className="w-10 h-10 rounded-full border-2 border-white overflow-hidden bg-slate-100 shadow-sm">
                              <img src={p} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                          ))}
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          {((os.beforePhotos?.length || 0) + (os.afterPhotos?.length || 0))} Evidências Técnicas
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => { setViewingOS(os); setActiveDetailTab('peng'); }}
                          className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
                        >
                          <Eye className="w-4 h-4" /> Analisar Detalhes
                        </button>
                        <button 
                          onClick={() => generatePericialReportPDF(os)}
                          disabled={isGeneratingPericialReport}
                          className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
                        >
                          {isGeneratingPericialReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                          Gerar Laudo Técnico
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              })()}
            </div>

            {/* Sidebar Stats */}
            <div className="space-y-6">
              <div className="bg-white p-8 rounded-[32px] border border-soft-border shadow-sm sticky top-8">
                <h4 className="text-[10px] font-black text-soft-text/40 uppercase tracking-widest mb-6">Métricas de Engenharia</h4>
                <div className="space-y-6">
                  <div>
                    <p className="text-2xl font-black text-soft-text tracking-tight">
                      {orders.filter(o => o.pengCrossings && o.pengCrossings.length > 0).length}
                    </p>
                    <p className="text-[10px] font-black text-soft-text/40 uppercase tracking-widest">Laudos Automatizados</p>
                  </div>
                  <div>
                    <p className="text-2xl font-black text-soft-success tracking-tight">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                        orders.reduce((acc, o) => acc + (o.estimatedNormalizationSaving || 0), 0)
                      )}
                    </p>
                    <p className="text-[10px] font-black text-soft-text/40 uppercase tracking-widest">Economia Estimada</p>
                  </div>
                  <div className="pt-6 border-t border-soft-border space-y-4">
                    <p className="text-[10px] font-black text-soft-text/40 uppercase tracking-widest mb-2">Configuração do Laudo</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-soft-text uppercase tracking-widest">Incluir Fotos</span>
                      <button 
                        onClick={() => setPericialShowPhotos(!pericialShowPhotos)}
                        className={`w-8 h-4 rounded-full transition-all relative ${pericialShowPhotos ? 'bg-soft-accent' : 'bg-slate-200'}`}
                      >
                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${pericialShowPhotos ? 'left-4.5' : 'left-0.5'}`} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-soft-text uppercase tracking-widest">Impacto Financeiro</span>
                      <button 
                        onClick={() => setPericialShowFinancial(!pericialShowFinancial)}
                        className={`w-8 h-4 rounded-full transition-all relative ${pericialShowFinancial ? 'bg-soft-accent' : 'bg-slate-200'}`}
                      >
                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${pericialShowFinancial ? 'left-4.5' : 'left-0.5'}`} />
                      </button>
                    </div>
                  </div>
                  <div className="pt-6 border-t border-soft-border">
                    <p className="text-[10px] font-black text-soft-text/40 uppercase tracking-widest mb-4">Distribuição de Causa</p>
                    <div className="space-y-3">
                      {['execution', 'design', 'specification'].map(cause => {
                        const count = orders.filter(o => o.rootCause === cause).length;
                        const total = orders.filter(o => o.rootCause).length || 1;
                        const percentage = (count / total) * 100;
                        return (
                          <div key={cause}>
                            <div className="flex justify-between text-[9px] font-black uppercase tracking-widest mb-1">
                              <span>{cause === 'execution' ? 'Execução' : cause === 'design' ? 'Projeto' : 'Espec.'}</span>
                              <span>{Math.round(percentage)}%</span>
                            </div>
                            <div className="h-1.5 bg-soft-bg rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-soft-accent transition-all duration-1000" 
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bento-card bg-soft-accent text-white border-none">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <h4 className="text-sm font-black uppercase tracking-widest">Dica PENG</h4>
                </div>
                <p className="text-xs font-medium leading-relaxed text-white/80">
                  Relatórios com mais de 3 NBRs citadas possuem 85% mais chances de aprovação em auditorias de qualidade ISO 9001.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'reports' && canViewReports ? (
        <div className="space-y-8">
          {/* Filters & Exports */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                  <Filter className="w-6 h-6 text-slate-400" />
                  Relatórios de Gestão
                </h2>
                <p className="text-xs text-slate-400 font-black uppercase tracking-widest mt-1">Gere relatórios detalhados e exporte dados estratégicos</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                  <button
                    onClick={() => setReportPeriod('daily')}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${reportPeriod === 'daily' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    Hoje
                  </button>
                  <button
                    onClick={() => setReportPeriod('weekly')}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${reportPeriod === 'weekly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    Semana
                  </button>
                  <button
                    onClick={() => setReportPeriod('monthly')}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${reportPeriod === 'monthly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    Mês
                  </button>
                  <button
                    onClick={() => setReportPeriod('yearly')}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${reportPeriod === 'yearly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    Ano
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={exportToExcel}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-200 active:scale-95"
                  >
                    <FileSpreadsheet className="w-4 h-4" /> Excel
                  </button>
                  <button
                    onClick={exportToPDF}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-slate-200 active:scale-95"
                  >
                    <Download className="w-4 h-4" /> PDF
                  </button>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 pt-6 border-t border-slate-100">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">Data Inicial</label>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">Data Final</label>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">Técnico Responsável</label>
                <select 
                  value={selectedTechFilter}
                  onChange={(e) => setSelectedTechFilter(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-slate-900 transition-all appearance-none"
                >
                  <option value="Todos">Todos os Técnicos</option>
                  {systemUsers.filter(u => u.role === 'technician').map(u => (
                    <option key={u.uid} value={u.uid}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">Tipo de Serviço</label>
                <select 
                  value={serviceTypeFilter}
                  onChange={(e) => setServiceTypeFilter(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-slate-900 transition-all appearance-none"
                >
                  <option value="Todos">Todos os Tipos</option>
                  <option value="manutenção geral">Manutenção Geral</option>
                  <option value="elétrica">Elétrica</option>
                  <option value="hidráulica">Hidráulica</option>
                  <option value="pintura">Pintura</option>
                  <option value="alvenaria">Alvenaria</option>
                  <option value="revestimento">Revestimento</option>
                  <option value="impermeabilização">Impermeabilização</option>
                  <option value="marcenaria">Marcenaria</option>
                  <option value="serralheria">Serralheria</option>
                </select>
              </div>
              <div className="flex items-end">
                <button 
                  onClick={() => { setStartDate(''); setEndDate(''); setSelectedTechFilter('Todos'); setServiceTypeFilter('Todos'); }}
                  className="w-full px-4 py-3 text-slate-400 hover:text-slate-900 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border border-dashed border-slate-200 rounded-2xl hover:border-slate-900"
                  title="Limpar todos os filtros aplicados aos relatórios."
                >
                  Limpar Filtros
                </button>
              </div>
            </div>
          </div>

          {/* Report Tabs */}
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit mb-8">
            <button
              onClick={() => setActiveReportTab('geral')}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeReportTab === 'geral' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Visão Geral
            </button>
            <button
              onClick={() => setActiveReportTab('financeiro')}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeReportTab === 'financeiro' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Financeiro
            </button>
          </div>

          {activeReportTab === 'geral' ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {canViewFinancialReports && (
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-50 rounded-2xl">
                    <TrendingUp className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Economia (PENG)</p>
                    <p className="text-2xl font-black text-slate-900">R$ {reports.pengStats.financialImpactTotal.toLocaleString('pt-BR')}</p>
                  </div>
                </div>
                <p className="mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Normalização de Patologias</p>
              </div>
            )}

            {canViewOSReports && (
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-50 rounded-2xl">
                    <Wrench className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assistências (Mês)</p>
                    <p className="text-2xl font-black text-slate-900">{reports.techAssistanceCounts.month}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400">Hoje: {reports.techAssistanceCounts.day}</span>
                  <span className="text-slate-200">|</span>
                  <span className="text-[10px] font-bold text-slate-400">Semana: {reports.techAssistanceCounts.week}</span>
                </div>
              </div>
            )}

            {canViewOSReports && (
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-50 rounded-2xl">
                    <FileCheck className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Docs Assinados</p>
                    <p className="text-2xl font-black text-slate-900">{reports.signedDocsCount}</p>
                  </div>
                </div>
                <p className="mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total no período selecionado</p>
              </div>
            )}

            {canViewMaterialReports && (
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-50 rounded-2xl">
                    <Package className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Materiais Utilizados</p>
                    <p className="text-2xl font-black text-slate-900">{reports.abcData.length}</p>
                  </div>
                </div>
                <p className="mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tipos de materiais distintos</p>
              </div>
            )}

            {canViewTechnicianReports && (
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-50 rounded-2xl">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Técnicos Ativos</p>
                    <p className="text-2xl font-black text-slate-900">{reports.techRanking.length}</p>
                  </div>
                </div>
                <p className="mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Com OS no período</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Detailed Stats Table */}
            {canViewOSReports && (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden h-fit">
                <div className="p-8 border-b border-slate-200">
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Resumo de Atividades</h3>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Dados consolidados do período selecionado</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-widest">
                      <tr>
                        <th className="px-8 py-4">Métrica</th>
                        <th className="px-8 py-4 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="px-8 py-4 font-bold text-slate-700">Total de Ordens de Serviço</td>
                        <td className="px-8 py-4 text-right font-black text-slate-900">{reports.counts.total}</td>
                      </tr>
                      <tr>
                        <td className="px-8 py-4 font-bold text-slate-700">OS Concluídas</td>
                        <td className="px-8 py-4 text-right font-black text-emerald-600">{reports.counts.completed}</td>
                      </tr>
                      <tr>
                        <td className="px-8 py-4 font-bold text-slate-700">OS em Aberto / Andamento</td>
                        <td className="px-8 py-4 text-right font-black text-blue-600">{reports.counts.open + reports.counts.inProgress}</td>
                      </tr>
                      <tr>
                        <td className="px-8 py-4 font-bold text-slate-700">Assistências Técnicas (Total)</td>
                        <td className="px-8 py-4 text-right font-black text-slate-900">{reports.techAssistanceCounts.month}</td>
                      </tr>
                      <tr>
                        <td className="px-8 py-4 font-bold text-slate-700">Documentos Assinados</td>
                        <td className="px-8 py-4 text-right font-black text-slate-900">{reports.signedDocsCount}</td>
                      </tr>
                      <tr>
                        <td className="px-8 py-4 font-bold text-slate-700">Tempo Médio de Atendimento</td>
                        <td className="px-8 py-4 text-right font-black text-slate-900">{reports.avgDuration} min</td>
                      </tr>
                      {canViewFinancialReports && (
                        <tr className="bg-emerald-50/30">
                          <td className="px-8 py-4 font-bold text-emerald-700">Economia por Normalização (PENG)</td>
                          <td className="px-8 py-4 text-right font-black text-emerald-600">R$ {reports.pengStats.financialImpactTotal.toLocaleString('pt-BR')}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ABC Curve Chart (Materials) */}
            {canViewMaterialReports && (
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                <div className="mb-8">
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-slate-400" />
                    Consumo de Materiais (Curva ABC)
                  </h3>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Top 10 materiais mais utilizados</p>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reports.abcData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} style={{ fontSize: '10px', fontWeight: '900', fill: '#94a3b8' }} />
                      <Tooltip 
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }}
                      />
                      <Bar dataKey="quantity" fill="#0f172a" radius={[0, 8, 8, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Tech Performance Ranking */}
            {canViewTechnicianReports && (
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                <div className="mb-8">
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-slate-400" />
                    Ranking de Eficiência
                  </h3>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Técnicos com mais conclusões no período</p>
                </div>
                <div className="space-y-4">
                  {reports.techRanking.map((t, i) => (
                    <div key={t.name} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-slate-900 transition-all">
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                          i === 0 ? 'bg-amber-100 text-amber-600' : 
                          i === 1 ? 'bg-slate-200 text-slate-600' : 
                          i === 2 ? 'bg-orange-100 text-orange-600' : 
                          'bg-white text-slate-400'
                        }`}>
                          {i + 1}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{t.name}</p>
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{t.count} OS Concluídas</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Em Andamento</p>
                          <p className="text-sm font-black text-blue-600">{t.inProgress}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Média Exec.</p>
                          <p className="text-sm font-black text-slate-900">{t.executionCount > 0 ? Math.round(t.totalExecutionTime / t.executionCount) : '-'} min</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {reports.techRanking.length === 0 && <p className="text-slate-400 text-center py-8 italic font-medium">Sem dados para o período...</p>}
                </div>
              </div>
            )}

            {/* OS by Service Type (Pie Chart) */}
            {canViewOSReports && (
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                <div className="mb-8">
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <PieChartIcon className="w-5 h-5 text-slate-400" />
                    Distribuição por Tipo de Serviço
                  </h3>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Volume por categoria de atendimento</p>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={reports.pieTypeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {reports.pieTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* Financial Reports Placeholder */}
          {canViewFinancialReports && (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-emerald-50 rounded-2xl">
                  <TrendingUp className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Relatórios Financeiros</h3>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Módulo em desenvolvimento - Projeções e Custos</p>
                </div>
              </div>
              <div className="h-48 bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex items-center justify-center">
                <p className="text-slate-400 text-sm font-medium italic">Gráficos de custos e faturamento aparecerão aqui...</p>
              </div>
            </div>
          )}

          {/* Recently Signed Documents */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-200">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Últimos Documentos Assinados</h3>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Acompanhamento em tempo real das assinaturas</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-widest">
                  <tr>
                    <th className="px-8 py-4">Documento</th>
                    <th className="px-8 py-4">Cliente / OS</th>
                    <th className="px-8 py-4">Assinado por</th>
                    <th className="px-8 py-4 text-right">Data/Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reports.filteredOrders
                    .flatMap(o => (o.requiredDocuments || []).map(d => ({ ...d, clientName: o.clientName, osId: o.id })))
                    .filter(d => d.signedAt)
                    .sort((a, b) => parseISO(b.signedAt!).getTime() - parseISO(a.signedAt!).getTime())
                    .slice(0, 10)
                    .map((d, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="px-8 py-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-50 rounded-lg">
                              <FileCheck className="w-4 h-4 text-emerald-600" />
                            </div>
                            <span className="text-sm font-bold text-slate-700">{d.name}</span>
                          </div>
                        </td>
                        <td className="px-8 py-4">
                          <p className="text-sm font-bold text-slate-900">{d.clientName}</p>
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">OS: {d.osId.slice(-6)}</p>
                        </td>
                        <td className="px-8 py-4 text-sm text-slate-600 font-medium">
                          {d.signedBy || 'Cliente'}
                        </td>
                        <td className="px-8 py-4 text-right">
                          <p className="text-sm font-black text-slate-900">{format(parseISO(d.signedAt!), 'dd/MM/yyyy')}</p>
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{format(parseISO(d.signedAt!), 'HH:mm')}</p>
                        </td>
                      </tr>
                    ))}
                  {reports.signedDocsCount === 0 && (
                    <tr>
                      <td colSpan={4} className="px-8 py-12 text-center text-slate-400 italic font-medium">Nenhum documento assinado no período...</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Financial KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-emerald-50 rounded-2xl">
                      <TrendingUp className="w-6 h-6 text-emerald-600" />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Receita Total</p>
                  </div>
                  <p className="text-3xl font-black text-slate-900">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(reports.financialStats.revenue)}
                  </p>
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-2">Bruto no período</p>
                </div>

                <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-red-50 rounded-2xl">
                      <TrendingDown className="w-6 h-6 text-red-600" />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Despesas Totais</p>
                  </div>
                  <p className="text-3xl font-black text-slate-900">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(reports.financialStats.expenses)}
                  </p>
                  <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest mt-2">Custos operacionais</p>
                </div>

                <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-blue-50 rounded-2xl">
                      <DollarSign className="w-6 h-6 text-blue-600" />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lucro Líquido</p>
                  </div>
                  <p className="text-3xl font-black text-slate-900">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(reports.financialStats.profit)}
                  </p>
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-2">Resultado final</p>
                </div>

                <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-purple-50 rounded-2xl">
                      <Percent className="w-6 h-6 text-purple-600" />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Margem de Lucro</p>
                  </div>
                  <p className="text-3xl font-black text-slate-900">
                    {reports.financialStats.margin.toFixed(1)}%
                  </p>
                  <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest mt-2">Rentabilidade média</p>
                </div>
              </div>

              {/* Financial Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm h-[500px] flex flex-col">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Evolução Financeira</h3>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Comparativo de Receitas vs Despesas</p>
                    </div>
                  </div>
                  <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={reports.financialStats.timeline}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="date" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} 
                          dy={10}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                          tickFormatter={(value) => `R$ ${value >= 1000 ? (value/1000).toFixed(1) + 'k' : value}`}
                        />
                        <Tooltip 
                          contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', padding: '15px' }}
                          formatter={(value: number) => [new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value), '']}
                        />
                        <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                        <Bar dataKey="revenue" name="Receita" fill="#10b981" radius={[6, 6, 0, 0]} barSize={40} />
                        <Bar dataKey="expenses" name="Despesas" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={40} />
                        <Line type="monotone" dataKey="profit" name="Lucro" stroke="#3b82f6" strokeWidth={4} dot={{ r: 6, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm h-[500px] flex flex-col">
                  <div className="mb-8">
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Distribuição de Receita</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Participação por categoria de serviço</p>
                  </div>
                  <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={reports.pieTypeData}
                          cx="50%"
                          cy="50%"
                          innerRadius={80}
                          outerRadius={120}
                          paddingAngle={8}
                          dataKey="value"
                        >
                          {reports.pieTypeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={settings.theme.chartPalette[index % settings.theme.chartPalette.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', padding: '15px' }}
                        />
                        <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : activeTab === 'os' ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <h2 className="text-4xl font-black text-soft-text tracking-tighter uppercase">Ordens de Serviço</h2>
              <p className="text-xs font-black text-soft-text/30 uppercase tracking-[0.2em]">Gestão centralizada de ocorrências e manutenções</p>
            </div>
            {(profile.role === 'admin' || profile.permissions?.canCreateOS) && (
              <button
                onClick={() => { 
                  resetOSForm(); 
                  setPreInspection(DEFAULT_PRE_INSPECTION);
                  setCompletionChecklist(DEFAULT_COMPLETION_CHECKLIST);
                  setShowOSForm(true); 
                }}
                className="bg-soft-accent hover:bg-soft-accent/90 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-soft-accent/25 active:scale-95 flex items-center gap-3"
                title="Criar nova Ordem de Serviço no sistema."
              >
                <Plus className="w-5 h-5" />
                Nova Ordem
              </button>
            )}
          </div>

          {/* Filters Card */}
          <div className="bento-card bg-white shadow-xl shadow-black/5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-center gap-4 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-soft-text/20" />
                  <input
                    type="text"
                    placeholder="BUSCAR POR NÚMERO DA CASA..."
                    value={houseNumberFilter}
                    onChange={(e) => setHouseNumberFilter(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-soft-bg border border-soft-border rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-soft-accent/20 transition-all"
                  />
                </div>
                <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className={`px-6 py-3.5 rounded-2xl border transition-all flex items-center gap-3 text-[10px] font-black uppercase tracking-widest ${showAdvancedFilters ? 'bg-soft-text text-white border-soft-text' : 'bg-white text-soft-text/40 border-soft-border hover:bg-soft-bg'}`}
                  title="Expandir ou recolher opções de filtragem avançada (técnico, data, tipo de serviço)."
                >
                  <Filter className="w-4 h-4" />
                  <span>Filtros Avançados</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-2 bg-soft-bg rounded-xl border border-soft-border" title="Ordem de serviço recém-criada, aguardando início ou vistoria.">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-[9px] font-black text-soft-text/40 uppercase tracking-widest">{finalFilteredOrders.filter(o => o.status === 'Aberta').length} Abertas</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-soft-bg rounded-xl border border-soft-border" title="Técnico em deslocamento ou realizando a vistoria inicial no local.">
                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                  <span className="text-[9px] font-black text-soft-text/40 uppercase tracking-widest">{finalFilteredOrders.filter(o => o.status === 'Vistoria').length} Vistorias</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-soft-bg rounded-xl border border-soft-border" title="Serviço sendo executado pelo técnico responsável.">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-[9px] font-black text-soft-text/40 uppercase tracking-widest">{finalFilteredOrders.filter(o => o.status === 'Em andamento').length} Em Curso</span>
                </div>
              </div>
            </div>

            <AnimatePresence>
              {showAdvancedFilters && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-8 mt-8 border-t border-soft-border/50">
                    {/* Status Filter */}
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-soft-text/30 uppercase tracking-widest ml-1">Status do Processo</label>
                      <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value as any)}
                        className="w-full px-4 py-3 bg-soft-bg border border-soft-border rounded-xl text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-soft-accent/20 outline-none transition-all"
                      >
                        <option value="Todos">Todos os Status</option>
                        <option value="Aberta">Abertas</option>
                        <option value="Vistoria">Vistorias</option>
                        <option value="Em andamento">Em andamento</option>
                        <option value="Concluída">Concluídas</option>
                      </select>
                    </div>

                    {/* Service Type Filter */}
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-soft-text/30 uppercase tracking-widest ml-1">Categoria de Serviço</label>
                      <select
                        value={serviceTypeFilter}
                        onChange={(e) => setServiceTypeFilter(e.target.value)}
                        className="w-full px-4 py-3 bg-soft-bg border border-soft-border rounded-xl text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-soft-accent/20 outline-none transition-all"
                      >
                        <option value="Todos">Todas as Categorias</option>
                        {SERVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>

                    {/* Technician Filter */}
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-soft-text/30 uppercase tracking-widest ml-1">Responsável Técnico</label>
                      <select
                        value={selectedTechFilter}
                        onChange={(e) => setSelectedTechFilter(e.target.value)}
                        className="w-full px-4 py-3 bg-soft-bg border border-soft-border rounded-xl text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-soft-accent/20 outline-none transition-all"
                      >
                        <option value="Todos">Todos os Técnicos</option>
                        {systemUsers.filter(u => u.role === 'technician' || u.role === 'admin').map(u => (
                          <option key={u.uid} value={u.uid}>{u.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Date Range Filter */}
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-soft-text/30 uppercase tracking-widest ml-1">Período de Registro</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="flex-1 px-3 py-3 bg-soft-bg border border-soft-border rounded-xl text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-soft-accent/20 outline-none transition-all"
                        />
                        <span className="text-soft-text/20">-</span>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="flex-1 px-3 py-3 bg-soft-bg border border-soft-border rounded-xl text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-soft-accent/20 outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end mt-6">
                    <button 
                      onClick={() => {
                        setFilter('Todos');
                        setServiceTypeFilter('Todos');
                        setSelectedTechFilter('Todos');
                        setStartDate('');
                        setEndDate('');
                        setHouseNumberFilter('');
                      }}
                      className="text-[9px] font-black text-soft-text/30 hover:text-soft-danger uppercase tracking-widest transition-colors flex items-center gap-2 px-4 py-2 hover:bg-soft-danger/5 rounded-xl"
                      title="Limpar todos os filtros aplicados e mostrar todas as Ordens de Serviço."
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Resetar Filtros
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* OS Table Card */}
          <div className="bg-white rounded-[32px] border border-soft-border shadow-xl shadow-black/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-soft-bg/50 text-soft-text/40 text-[10px] uppercase font-black tracking-[0.2em]">
                  <tr>
                    <th className="px-8 py-6 border-b border-soft-border">Identificação / Cliente</th>
                    <th className="px-8 py-6 border-b border-soft-border">Tipo de Serviço</th>
                    <th className="px-8 py-6 border-b border-soft-border">Status Atual</th>
                    <th className="px-8 py-6 border-b border-soft-border text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-soft-border/50">
                  {finalFilteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-soft-bg/30 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-soft-bg rounded-2xl flex items-center justify-center text-soft-text/20 group-hover:text-soft-accent group-hover:bg-soft-accent/5 transition-all">
                            <FileText className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="font-black text-soft-text text-sm uppercase tracking-tight">{order.clientName}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <p className="text-[10px] text-soft-text/30 font-black uppercase tracking-widest">OS: {order.id.slice(-6)}</p>
                              <span className="text-soft-text/10">•</span>
                              <p className="text-[10px] text-soft-text/30 font-black uppercase tracking-widest">{format(parseISO(order.createdAt), 'dd MMM yyyy', { locale: ptBR })}</p>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="space-y-1.5">
                          <span className="px-3 py-1 bg-soft-bg text-soft-text/60 text-[9px] font-black uppercase tracking-widest rounded-full border border-soft-border">
                            {order.serviceType}
                          </span>
                          <p className="text-[10px] text-soft-text/40 font-medium line-clamp-1 max-w-[200px]">{order.description}</p>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2" title={
                            order.status === 'Aberta' ? 'Ordem de serviço recém-criada, aguardando início ou vistoria.' : 
                            order.status === 'Vistoria' ? 'Técnico em deslocamento ou realizando a vistoria inicial no local.' :
                            order.status === 'Em andamento' ? 'Serviço sendo executado pelo técnico responsável.' : 
                            'Serviço finalizado, com fotos e assinaturas coletadas.'
                          }>
                            <div className={`w-2 h-2 rounded-full ${
                              order.status === 'Aberta' ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 
                              order.status === 'Vistoria' ? 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]' :
                              order.status === 'Em andamento' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 
                              'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                            }`} />
                            <span className={`text-[10px] font-black uppercase tracking-widest ${
                              order.status === 'Aberta' ? 'text-blue-600' : 
                              order.status === 'Vistoria' ? 'text-purple-600' :
                              order.status === 'Em andamento' ? 'text-amber-600' : 
                              'text-emerald-600'
                            }`}>{order.status}</span>
                          </div>
                          {order.deadline && order.status !== 'Concluída' && isAfter(new Date(), parseISO(order.deadline)) && (
                            <span className="flex items-center gap-1.5 text-[8px] font-black text-soft-danger bg-soft-danger/5 px-2 py-1 rounded-lg uppercase tracking-widest border border-soft-danger/10 w-fit animate-pulse" title="O prazo de finalização desta OS expirou.">
                              <Clock className="w-3 h-3" />
                              Atrasada
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2 transition-all">
                          <button 
                            onClick={() => exportOSToPDF(order)} 
                            className="p-2.5 bg-white border border-soft-border text-soft-text/60 hover:text-soft-accent hover:border-soft-accent/30 rounded-xl transition-all shadow-sm"
                            title="Exportar PDF: Gerar documento oficial da Ordem de Serviço em formato PDF."
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setViewingOS(order)} 
                            className="p-2.5 bg-white border border-soft-border text-soft-text/60 hover:text-soft-text hover:border-soft-text/30 rounded-xl transition-all shadow-sm"
                            title="Visualizar OS: Abrir detalhes completos, fotos e histórico da Ordem de Serviço."
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {(profile.role === 'admin' || profile.permissions?.canEditOS) && (
                            <button
                              onClick={() => openEditOS(order)}
                              className="p-2.5 bg-white border border-soft-border text-soft-text/60 hover:text-soft-accent hover:border-soft-accent/30 rounded-xl transition-all shadow-sm"
                              title="Editar: Modificar informações, prazos ou técnicos da Ordem de Serviço."
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {(profile.role === 'admin' || profile.permissions?.canDeleteOS) && (
                            <button
                              onClick={() => handleDeleteOS(order.id)}
                              className="p-2.5 bg-white border border-soft-border text-soft-text/60 hover:text-soft-danger hover:border-soft-danger/30 rounded-xl transition-all shadow-sm"
                              title="Excluir: Remover permanentemente a Ordem de Serviço do sistema."
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {finalFilteredOrders.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-8 py-20 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="p-6 bg-soft-bg rounded-[32px]">
                            <Search className="w-10 h-10 text-soft-text/10" />
                          </div>
                          <div>
                            <p className="text-sm font-black text-soft-text/40 uppercase tracking-widest">Nenhuma ordem encontrada</p>
                            <p className="text-[10px] text-soft-text/20 font-bold uppercase tracking-widest mt-1">Tente ajustar seus filtros de busca</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'users' ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900">Usuários da Plataforma</h2>
              <p className="text-xs text-slate-400 font-medium mt-1 uppercase tracking-widest">Gerencie permissões e acessos da equipe</p>
            </div>
            <button
              onClick={() => { setShowInviteForm(true); }}
              className="btn-primary flex items-center gap-2"
              title="Convidar um novo membro para a equipe."
            >
              <UserPlus className="w-4 h-4" /> Novo Usuário
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-widest">
                <tr>
                  <th className="px-6 py-4">Nome / E-mail</th>
                  <th className="px-6 py-4">Cargo</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {systemUsers.map((user) => (
                  <tr key={user.uid} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="font-black text-slate-900 text-sm uppercase tracking-tight">{user.name}</p>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{user.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                        user.role === 'admin' ? 'bg-slate-900 text-white border-slate-900' : 
                        user.role === 'technician' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                        'bg-slate-50 text-slate-600 border-slate-200'
                      }`} title={
                        user.role === 'admin' ? 'Acesso total ao sistema e configurações.' : 
                        user.role === 'technician' ? 'Acesso ao dashboard técnico e execução de OS.' :
                        'Acesso limitado para visualização.'
                      }>
                        {user.role === 'admin' ? <Shield className="w-3 h-3" /> : 
                         user.role === 'technician' ? <HardHat className="w-3 h-3" /> :
                         <Users className="w-3 h-3" />}
                        {user.role === 'admin' ? 'Admin' : 
                         user.role === 'technician' ? 'Técnico' : 'Usuário'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => openEditUser(user)}
                        className="p-2 text-slate-400 hover:text-slate-900 transition-all hover:bg-white rounded-lg shadow-sm hover:shadow-md active:scale-95 opacity-0 group-hover:opacity-100"
                        title="Editar Usuário"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'materials' ? (
        /* Materials Management Tab */
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900">Base de Dados de Materiais</h2>
              <p className="text-xs text-slate-400 font-medium mt-1 uppercase tracking-widest">Padronização de nomenclaturas para técnicos</p>
            </div>
            {canCreateMaterials && (
              <button
                onClick={() => { setEditingMaterial(null); setMatName(''); setMatUnit(''); setMatPrice(0); setMatCost(0); setShowMaterialForm(true); }}
                className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-slate-200 hover:shadow-md active:scale-95 flex items-center gap-2"
                title="Cadastrar um novo material na base de dados."
              >
                <Plus className="w-4 h-4" /> Novo Material
              </button>
            )}
          </div>
          <div className="px-8 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                placeholder="Buscar material por nome..."
                value={materialSearchQuery}
                onChange={(e) => setMaterialSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-slate-900 transition-all"
              />
            </div>
            {materialSearchQuery && (
              <button 
                onClick={() => setMaterialSearchQuery('')}
                className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
              >
                Limpar Busca
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-widest">
                <tr>
                  <th className="px-6 py-4">Nome do Material</th>
                  <th className="px-6 py-4">Unidade</th>
                  <th className="px-6 py-4 text-right">Custo (R$)</th>
                  <th className="px-6 py-4 text-right">Venda (R$)</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMaterials.length > 0 ? (
                  filteredMaterials.map((mat) => (
                    <tr key={mat.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4 font-black text-slate-900 text-sm uppercase tracking-tight">{mat.name}</td>
                      <td className="px-6 py-4">
                        <span className="bg-slate-100 px-2 py-1 rounded text-[10px] font-black text-slate-500 uppercase tracking-widest">{mat.unit}</span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-600">
                        R$ {mat.cost?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-emerald-600">
                        R$ {mat.price?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {canEditMaterials && (
                            <button 
                              onClick={() => { setEditingMaterial(mat); setMatName(mat.name); setMatUnit(mat.unit); setMatPrice(mat.price || 0); setMatCost(mat.cost || 0); setShowMaterialForm(true); }}
                              className="p-2 text-slate-400 hover:text-slate-900 transition-all hover:bg-white rounded-lg shadow-sm hover:shadow-md active:scale-95"
                              title="Editar Material"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {canDeleteMaterials && (
                            <button 
                              onClick={() => handleDeleteMaterial(mat.id)} 
                              className="p-2 text-slate-400 hover:text-red-600 transition-all hover:bg-white rounded-lg shadow-sm hover:shadow-md active:scale-95"
                              title="Excluir Material"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <Search className="w-8 h-8 opacity-20" />
                        <p className="text-sm font-medium">Nenhum material encontrado para "{materialSearchQuery}"</p>
                        <button 
                          onClick={() => setMaterialSearchQuery('')}
                          className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline mt-2"
                        >
                          Limpar Filtros
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'documents' && canManageDocuments ? (
        /* Documents Management Tab */
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900">Modelos de Documentos</h2>
              <p className="text-slate-500 font-medium text-sm">Gerencie os documentos que exigem assinatura do cliente</p>
            </div>
            <div className="flex gap-3">
              {canManageSettings && (
                <button 
                  onClick={() => {
                    const data = JSON.stringify(documentTemplates, null, 2);
                    const blob = new Blob([data], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `modelos_documentos_${format(new Date(), 'yyyy-MM-dd')}.json`;
                    a.click();
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs uppercase tracking-widest rounded-xl transition-all hover:shadow-md active:scale-95"
                  title="Exportar todos os modelos de documentos para um arquivo JSON."
                >
                  <Download className="w-4 h-4" /> Exportar
                </button>
              )}
              {canCreateDocuments && (
                <label 
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer hover:shadow-md active:scale-95"
                  title="Importar modelos de documentos de um arquivo."
                >
                  <FileIcon className="w-4 h-4" /> Importar
                  <input 
                    type="file" 
                    accept=".json, .xlsx, .xls, .pdf, .docx, .pptx, .jpeg, .png" 
                    className="hidden" 
                    onChange={handleImportFile}
                  />
                </label>
              )}
              {canCreateDocuments && (
                <button 
                  onClick={() => { setEditingDocument(null); setDocName(''); setDocContent(''); setDocType('general'); setShowDocumentForm(true); }}
                  className="flex items-center gap-2 px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-slate-200 transition-all hover:shadow-md active:scale-95"
                  title="Criar um novo modelo de documento personalizado."
                >
                  <Plus className="w-4 h-4" /> Novo Modelo
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4 mb-8">
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-fit">
              {(['all', 'start', 'finish', 'general'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setDocFilter(f)}
                  className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    docFilter === f 
                      ? 'bg-white text-slate-900 shadow-sm' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title={f === 'all' ? 'Ver todos os modelos' : f === 'start' ? 'Ver modelos de início de serviço' : f === 'finish' ? 'Ver modelos de conclusão de serviço' : 'Ver modelos gerais'}
                >
                  {f === 'all' ? 'Todos' : f === 'start' ? 'Início' : f === 'finish' ? 'Conclusão' : 'Geral'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-12">
            {['start', 'finish', 'general'].filter(cat => docFilter === 'all' || docFilter === cat).map(category => {
              const docsInCategory = documentTemplates.filter(d => d.type === category);
              if (docsInCategory.length === 0 && docFilter !== category) return null;

              return (
                <div key={category} className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-1.5 h-6 rounded-full ${
                      category === 'start' ? 'bg-blue-500' : 
                      category === 'finish' ? 'bg-slate-900' : 
                      'bg-slate-300'
                    }`} />
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                      {category === 'start' ? 'Modelos de Início (Check-in)' : 
                       category === 'finish' ? 'Modelos de Conclusão (Check-out)' : 
                       'Modelos Gerais / Opcionais'}
                    </h4>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-black rounded-full">
                      {docsInCategory.length}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {docsInCategory.map((doc) => (
                      <div key={doc.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex justify-between items-start mb-4">
                          <div className="p-3 bg-slate-50 rounded-xl text-slate-400 group-hover:text-slate-900 transition-colors">
                            <FileCode className="w-6 h-6" />
                          </div>
                          <div className="flex gap-1">
                            <button 
                              onClick={() => setPreviewingDocument(doc)}
                              className="p-2 text-soft-text/40 hover:text-soft-text transition-all hover:bg-white rounded-lg shadow-sm hover:shadow-md active:scale-95"
                              title="Visualizar"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {canEditDocuments && (
                              <button 
                                onClick={() => openEditDocument(doc)}
                                className="p-2 text-soft-text/40 hover:text-soft-text transition-all hover:bg-white rounded-lg shadow-sm hover:shadow-md active:scale-95"
                                title="Editar"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}
                            {canDeleteDocuments && (
                              <button 
                                onClick={() => handleDeleteDocument(doc.id)}
                                className="p-2 text-soft-text/40 hover:text-soft-danger transition-all hover:bg-white rounded-lg shadow-sm hover:shadow-md active:scale-95"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                        <h3 className="font-black text-slate-900 mb-1 uppercase text-sm tracking-tight">{doc.name}</h3>
                        {doc.fileUrl ? (
                          <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                            <div className="p-2 bg-white rounded-lg shadow-sm">
                              <FileIcon className="w-4 h-4 text-slate-400" />
                            </div>
                            <div className="flex-1 overflow-hidden">
                              <p className="text-[10px] font-black text-slate-700 truncate uppercase tracking-widest">{doc.fileName || 'Arquivo'}</p>
                              <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">Modelo em Arquivo</p>
                            </div>
                          </div>
                        ) : (
                          <p className="mt-4 text-xs text-slate-500 line-clamp-3 font-medium leading-relaxed" dangerouslySetInnerHTML={{ __html: doc.content }} />
                        )}
                      </div>
                    ))}
                    {docsInCategory.length === 0 && (
                      <div className="col-span-full py-10 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest italic">Nenhum modelo nesta categoria</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : activeTab === 'dashboard' && !canViewReports ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 bg-soft-bg rounded-full flex items-center justify-center mb-6">
            <ShieldAlert className="w-10 h-10 text-soft-text/20" />
          </div>
          <h3 className="text-xl font-black text-soft-text tracking-tight uppercase">Acesso Restrito</h3>
          <p className="text-soft-text/40 text-xs font-medium uppercase tracking-widest mt-2">Você não tem permissão para visualizar o dashboard executivo.</p>
        </div>
      ) : null}
      </main>

      {/* Document Template Form Modal */}
      {showDocumentForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-[1200px] rounded-2xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-white z-10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-900 rounded-xl text-white">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">{editingDocument ? 'Editar Modelo' : 'Novo Modelo de Documento'}</h3>
                  <p className="text-slate-500 text-xs font-medium uppercase tracking-widest">Editor de Documentos Profissional</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowDocPreview(true)} 
                  className="px-6 py-2.5 border border-soft-border text-soft-text font-black text-xs uppercase tracking-widest rounded-xl hover:bg-soft-bg transition-all hover:shadow-md active:scale-95 flex items-center gap-2"
                  title="Visualizar uma prévia de como o documento será impresso."
                >
                  <Eye className="w-4 h-4" /> Visualizar Prévia
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowDocumentForm(false)} 
                  className="px-6 py-2.5 border border-soft-border text-soft-text font-black text-xs uppercase tracking-widest rounded-xl hover:bg-soft-bg transition-all hover:shadow-md active:scale-95"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveDocument} 
                  className="px-6 py-2.5 bg-soft-accent text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-soft-accent/20 hover:shadow-md active:scale-95 transition-all flex items-center gap-2"
                >
                  <Save className="w-4 h-4" /> Salvar Modelo
                </button>
                <button onClick={() => setShowDocumentForm(false)} className="text-soft-text/40 hover:text-soft-text transition-colors ml-2 active:scale-95"><X className="w-6 h-6" /></button>
              </div>
            </div>
            
            <div className="flex-1 flex overflow-hidden">
              {/* Left Panel: Settings */}
              <div className="w-80 border-r border-slate-200 p-6 space-y-6 overflow-y-auto bg-slate-50/50">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Documento</label>
                  <input 
                    value={docName} 
                    onChange={e => {
                      setDocName(e.target.value);
                      if (docFormErrors.name) setDocFormErrors(prev => ({ ...prev, name: '' }));
                    }} 
                    placeholder="Ex: Termo de Ciência de Início"
                    className={`w-full px-4 py-2.5 bg-white border ${docFormErrors.name ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'} rounded-xl outline-none focus:ring-2 focus:ring-slate-900 transition-all font-medium text-sm shadow-sm`} 
                  />
                  {docFormErrors.name && <p className="text-[9px] font-black text-red-500 uppercase tracking-widest ml-1">{docFormErrors.name}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Momento da Assinatura</label>
                  <select 
                    value={docType} 
                    onChange={e => setDocType(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 transition-all font-medium text-sm shadow-sm"
                  >
                    <option value="start">Início do Serviço (Check-in)</option>
                    <option value="finish">Conclusão do Serviço (Check-out)</option>
                    <option value="general">Geral / Opcional</option>
                    <option value="os_layout">Papel Timbrado da OS (Layout)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Papel Timbrado / Logotipo</label>
                  <div className="flex flex-col gap-3">
                    {docHeaderImage ? (
                      <div className="relative group rounded-xl overflow-hidden border border-slate-200 bg-white p-2">
                        <img 
                          src={docHeaderImage} 
                          alt="Timbrado" 
                          className="h-20 w-full object-contain" 
                          referrerPolicy="no-referrer" 
                        />
                        <button 
                          onClick={() => setDocHeaderImage('')}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition-all cursor-pointer group">
                        <Camera className="w-6 h-6 text-slate-300 group-hover:text-slate-500 mb-2" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-600">Escolher Imagem</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const url = await uploadFile(file, `templates/headers/${Date.now()}_${file.name}`);
                                setDocHeaderImage(url);
                              } catch (error) {
                                console.error('Error uploading header image:', error);
                                showError('Erro ao fazer upload da imagem do cabeçalho.');
                              }
                            }
                          }}
                        />
                      </label>
                    )}
                    <div className="flex gap-2">
                      <input 
                        value={docHeaderImage} 
                        onChange={e => setDocHeaderImage(e.target.value)} 
                        placeholder="Ou cole a URL da imagem..."
                        className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 transition-all font-medium text-sm shadow-sm" 
                      />
                    </div>
                  </div>
                  <p className="text-[9px] text-slate-400 ml-1">A imagem aparecerá centralizada no topo do papel.</p>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Arquivo do Modelo (Opcional)</label>
                  <div className="flex flex-col gap-3">
                    {docFileUrl ? (
                      <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <FileIcon className="w-5 h-5 text-slate-400 flex-shrink-0" />
                          <span className="text-xs font-bold text-slate-700 truncate">{docFileName || 'Arquivo selecionado'}</span>
                        </div>
                        <button 
                          onClick={() => { setDocFileUrl(''); setDocFileName(''); }}
                          className="p-1.5 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition-all cursor-pointer group">
                        <Upload className="w-6 h-6 text-slate-300 group-hover:text-slate-500 mb-2" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-600 text-center px-4">Upload de PDF, DOCX, PPTX, etc.</span>
                        <input 
                          type="file" 
                          accept=".pdf, .docx, .doc, .pptx, .xlsx, .xls, .png, .jpg, .jpeg" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setDocFileUrl(reader.result as string);
                                setDocFileName(file.name);
                                if (!docName) setDocName(file.name.split('.')[0]);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                  <p className="text-[9px] text-slate-400 ml-1">Se um arquivo for enviado, ele será usado em vez do editor de texto.</p>
                </div>

                {docHeaderImage && (
                  <div className="p-4 bg-slate-100 rounded-xl space-y-4 border border-slate-200">
                    <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all cursor-pointer group shadow-sm" title="Usar esta imagem como fundo (marca d'água) de todo o documento.">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg transition-colors ${headerImageIsBackground ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400 group-hover:text-slate-600'}`}>
                          <Layers className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Usar como Fundo</span>
                          <span className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">Preencher todo o papel</span>
                        </div>
                      </div>
                      <div className="relative flex items-center">
                        <input 
                          type="checkbox" 
                          checked={headerImageIsBackground} 
                          onChange={(e) => setHeaderImageIsBackground(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div 
                          onClick={() => setHeaderImageIsBackground(!headerImageIsBackground)}
                          className="w-10 h-5 bg-slate-200 rounded-full peer-checked:bg-slate-900 transition-colors cursor-pointer relative"
                        >
                          <div className={`absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-transform ${headerImageIsBackground ? 'translate-x-5' : ''}`}></div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase">Largura</label>
                        <input 
                          type="text" 
                          value={headerImageWidth} 
                          onChange={e => setHeaderImageWidth(e.target.value)} 
                          placeholder="Ex: 100% ou 50mm"
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-slate-900" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase">Altura</label>
                        <input 
                          type="text" 
                          value={headerImageHeight} 
                          onChange={e => setHeaderImageHeight(e.target.value)} 
                          placeholder="Ex: auto ou 30mm"
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-slate-900" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase">Topo (Y)</label>
                        <input 
                          type="text" 
                          value={headerImageTop} 
                          onChange={e => setHeaderImageTop(e.target.value)} 
                          placeholder="Ex: 0 ou 10mm"
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-slate-900" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase">Esquerda (X)</label>
                        <input 
                          type="text" 
                          value={headerImageLeft} 
                          onChange={e => setHeaderImageLeft(e.target.value)} 
                          placeholder="Ex: 0"
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-slate-900" 
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <label className="text-[9px] font-bold text-slate-500 uppercase">Opacidade</label>
                        <span className="text-[9px] font-bold text-slate-900">{Math.round(headerImageOpacity * 100)}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.05" 
                        value={headerImageOpacity} 
                        onChange={e => setHeaderImageOpacity(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900" 
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Margens do Papel</label>
                  <input 
                    type="text" 
                    value={docMargins} 
                    onChange={e => setDocMargins(e.target.value)} 
                    placeholder="Ex: 20mm ou 10mm"
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 transition-all font-medium text-sm shadow-sm" 
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tamanho do Papel</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['A4', 'A5', 'Letter'] as const).map(size => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setPaperSize(size)}
                        className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border ${
                          paperSize === size 
                            ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                            : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-200">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Requisitos de Assinatura</label>
                  
                  <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all cursor-pointer group shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg transition-colors ${requireClientSignature ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400 group-hover:text-slate-600'}`}>
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Assinatura Cliente</span>
                    </div>
                    <div className="relative flex items-center">
                      <input 
                        type="checkbox" 
                        checked={requireClientSignature} 
                        onChange={(e) => setRequireClientSignature(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:bg-slate-900 transition-colors"></div>
                      <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full peer-checked:translate-x-5 transition-transform"></div>
                    </div>
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all cursor-pointer group shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg transition-colors ${requireRepresentativeSignature ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 group-hover:text-slate-600'}`}>
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Assinatura Construtora</span>
                    </div>
                    <div className="relative flex items-center">
                      <input 
                        type="checkbox" 
                        checked={requireRepresentativeSignature} 
                        onChange={(e) => setRequireRepresentativeSignature(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:bg-slate-900 transition-colors"></div>
                      <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full peer-checked:translate-x-5 transition-transform"></div>
                    </div>
                  </label>
                </div>

                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="flex gap-2 text-blue-700 mb-1">
                    <Info className="w-4 h-4 shrink-0" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Dica</p>
                  </div>
                  <p className="text-[10px] text-blue-600 font-medium leading-relaxed">
                    O documento será exibido para o técnico no momento selecionado. As assinaturas serão coletadas digitalmente.
                  </p>
                </div>
              </div>

              {/* Right Panel: Editor */}
              <div className="flex-1 flex flex-col bg-slate-200/50 overflow-hidden relative">
                <div className="flex-1 overflow-y-auto p-12 flex justify-center scrollbar-thin scrollbar-thumb-slate-300">
                  <div 
                    className="bg-white shadow-[0_0_50px_-12px_rgba(0,0,0,0.15)] transition-all duration-300 flex flex-col relative"
                    style={{ 
                      width: paperDimensions.width, 
                      minHeight: paperDimensions.minHeight,
                      padding: docMargins
                    }}
                  >
                    {docHeaderImage && (
                      <div 
                        className={`flex justify-center relative pointer-events-none ${headerImageIsBackground ? 'absolute inset-0 z-0' : 'mb-10 z-10'}`}
                        style={{
                          top: headerImageTop.includes('mm') || headerImageTop.includes('%') || headerImageTop.includes('px') ? headerImageTop : `${headerImageTop}mm`,
                          left: headerImageLeft.includes('mm') || headerImageLeft.includes('%') || headerImageLeft.includes('px') ? headerImageLeft : `${headerImageLeft}mm`,
                          width: headerImageIsBackground ? '100%' : (headerImageWidth.includes('mm') || headerImageWidth.includes('%') || headerImageWidth.includes('px') ? headerImageWidth : `${headerImageWidth}mm`),
                          height: headerImageIsBackground ? '100%' : (headerImageHeight.includes('mm') || headerImageHeight.includes('%') || headerImageHeight.includes('px') ? headerImageHeight : `${headerImageHeight}mm`),
                          opacity: headerImageOpacity,
                        }}
                      >
                        <img 
                          src={docHeaderImage} 
                          alt="Timbrado" 
                          className={`${headerImageIsBackground ? 'w-full h-full object-cover' : 'max-h-full object-contain'}`}
                          referrerPolicy="no-referrer" 
                        />
                      </div>
                    )}
                    <div className={`flex-1 quill-paper-editor relative ${headerImageIsBackground ? 'z-10' : 'z-20'} ${docFormErrors.content ? 'border-2 border-red-500 rounded-xl' : ''}`}>
                      <ReactQuill 
                        ref={quillRef}
                        theme="snow"
                        value={docContent}
                        onChange={(content) => {
                          setDocContent(content);
                          if (docFormErrors.content) setDocFormErrors(prev => ({ ...prev, content: '' }));
                        }}
                        className="h-full"
                        placeholder="Comece a digitar seu documento aqui..."
                        modules={quillModules}
                      />
                    </div>
                    
                    {/* Visual Signature Placeholders */}
                    {(requireClientSignature || requireRepresentativeSignature) && (
                      <div className="mt-20 pt-10 border-t border-slate-100 grid grid-cols-2 gap-10">
                        {requireRepresentativeSignature && (
                          <div className="text-center">
                            <div className="h-12 border-b border-slate-300 mb-2"></div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Representante da Construtora</p>
                          </div>
                        )}
                        {requireClientSignature && (
                          <div className="text-center">
                            <div className="h-12 border-b border-slate-300 mb-2"></div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assinatura do Cliente</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {showDocPreview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-in fade-in duration-300">
          <div className="bg-slate-100 w-full max-w-[1000px] rounded-[32px] shadow-2xl overflow-hidden max-h-[95vh] flex flex-col border border-white/20">
            <div className="p-8 border-b border-slate-200 flex items-center justify-between bg-white/80 backdrop-blur-xl">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-soft-accent/10 rounded-2xl text-soft-accent">
                  <Eye className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-soft-text uppercase tracking-tight">Prévia do Documento</h3>
                  <p className="text-soft-text/40 text-[10px] font-black uppercase tracking-widest">Verifique o layout final antes de salvar</p>
                </div>
              </div>
              <button 
                onClick={() => setShowDocPreview(false)}
                className="p-3 hover:bg-slate-100 rounded-full transition-all active:scale-90"
              >
                <X className="w-6 h-6 text-soft-text/40" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-12 flex justify-center bg-slate-200/30 scrollbar-thin scrollbar-thumb-slate-300">
              <div 
                className="bg-white shadow-2xl transition-all duration-300 flex flex-col relative"
                style={{ 
                  width: paperDimensions.width, 
                  minHeight: paperDimensions.minHeight,
                  padding: docMargins
                }}
              >
                {docHeaderImage && (
                  <div 
                    className={`flex justify-center relative pointer-events-none ${headerImageIsBackground ? 'absolute inset-0 z-0' : 'mb-10 z-10'}`}
                    style={{
                      top: headerImageTop.includes('mm') || headerImageTop.includes('%') || headerImageTop.includes('px') ? headerImageTop : `${headerImageTop}mm`,
                      left: headerImageLeft.includes('mm') || headerImageLeft.includes('%') || headerImageLeft.includes('px') ? headerImageLeft : `${headerImageLeft}mm`,
                      width: headerImageIsBackground ? '100%' : (headerImageWidth.includes('mm') || headerImageWidth.includes('%') || headerImageWidth.includes('px') ? headerImageWidth : `${headerImageWidth}mm`),
                      height: headerImageIsBackground ? '100%' : (headerImageHeight.includes('mm') || headerImageHeight.includes('%') || headerImageHeight.includes('px') ? headerImageHeight : `${headerImageHeight}mm`),
                      opacity: headerImageOpacity,
                    }}
                  >
                    <img 
                      src={docHeaderImage} 
                      alt="Timbrado" 
                      className={`${headerImageIsBackground ? 'w-full h-full object-cover' : 'max-h-full object-contain'}`}
                      referrerPolicy="no-referrer" 
                    />
                  </div>
                )}
                
                <div 
                  className={`flex-1 relative break-words ${headerImageIsBackground ? 'z-10' : 'z-20'}`}
                  style={{ 
                    fontSize: '12pt',
                    lineHeight: '1.5',
                    color: '#1d1d1f'
                  }}
                  dangerouslySetInnerHTML={{ __html: docContent }}
                />
                
                {/* Signature Placeholders */}
                {(requireClientSignature || requireRepresentativeSignature) && (
                  <div className="mt-20 pt-10 border-t border-slate-100 grid grid-cols-2 gap-10">
                    {requireRepresentativeSignature && (
                      <div className="text-center">
                        <div className="h-12 border-b border-slate-300 mb-2"></div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Representante da Construtora</p>
                      </div>
                    )}
                    {requireClientSignature && (
                      <div className="text-center">
                        <div className="h-12 border-b border-slate-300 mb-2"></div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assinatura do Cliente</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="p-8 bg-white/80 backdrop-blur-xl border-t border-slate-200 flex justify-center">
              <button 
                onClick={() => setShowDocPreview(false)}
                className="px-12 py-4 bg-soft-text text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-black/10 hover:scale-105 transition-all active:scale-95"
                title="Fechar a prévia e voltar ao editor."
              >
                Fechar Visualização
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OS Form Modal */}
      {showOSForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-200 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-900">{editingOS ? 'Editar OS' : 'Nova OS'}</h3>
                <button onClick={closeOSForm} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-slate-900 transition-all duration-500 ease-out"
                  style={{ 
                    width: osFormTab === 'cliente' ? '20%' : 
                           osFormTab === 'serviço' ? '40%' : 
                           osFormTab === 'vistoria' ? '60%' : 
                           osFormTab === 'mídia' ? '80%' : '100%' 
                  }}
                />
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl overflow-x-auto no-scrollbar">
                {[
                  { id: 'cliente', label: 'Cliente', icon: User, desc: 'Dados e Localização' },
                  { id: 'serviço', label: 'Serviço', icon: Wrench, desc: 'Tipo e Descrição' },
                  { id: 'vistoria', label: 'Vistoria', icon: ClipboardCheck, desc: 'Checklist Prévio' },
                  { id: 'mídia', label: 'Mídia', icon: Camera, desc: 'Fotos e Anexos' },
                  { id: 'documentos', label: 'Documentos', icon: FileText, desc: 'Termos e Contratos' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setOsFormTab(tab.id as any)}
                    className={`flex-1 min-w-[90px] py-2.5 px-3 rounded-xl transition-all relative flex flex-col items-center gap-1 ${
                      osFormTab === tab.id 
                        ? 'bg-white text-slate-900 shadow-sm' 
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                    title={tab.desc}
                  >
                    <tab.icon className={`w-3.5 h-3.5 ${osFormTab === tab.id ? 'text-soft-accent' : 'text-slate-300'}`} />
                    <span className="text-[9px] font-black uppercase tracking-widest">{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <form onSubmit={handleSaveOS} className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
              {osFormTab === 'cliente' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cliente</label>
                      <input 
                        placeholder="Nome do Cliente" 
                        value={clientName} 
                        onChange={e => {
                          setClientName(e.target.value);
                          if (formErrors.clientName) setFormErrors(prev => ({ ...prev, clientName: '' }));
                        }} 
                        className={`w-full px-4 py-2.5 bg-slate-50 border ${formErrors.clientName ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'} rounded-xl outline-none focus:ring-2 focus:ring-slate-900 transition-all font-medium text-slate-900`} 
                      />
                      {formErrors.clientName && <p className="text-[9px] font-black text-red-500 uppercase tracking-widest ml-1">{formErrors.clientName}</p>}
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefone</label>
                      <input 
                        placeholder="(00) 00000-0000" 
                        value={clientPhone} 
                        onChange={e => {
                          const val = e.target.value.replace(/\D/g, '');
                          let masked = val;
                          if (val.length > 0) {
                            masked = '(' + val.substring(0, 2);
                            if (val.length > 2) {
                              masked += ') ' + val.substring(2, 7);
                              if (val.length > 7) {
                                masked += '-' + val.substring(7, 11);
                              }
                            }
                          }
                          setClientPhone(masked.substring(0, 15));
                          if (formErrors.clientPhone) setFormErrors(prev => ({ ...prev, clientPhone: '' }));
                        }} 
                        className={`w-full px-4 py-2.5 bg-slate-50 border ${formErrors.clientPhone ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'} rounded-xl outline-none focus:ring-2 focus:ring-slate-900 transition-all font-medium text-slate-900`} 
                      />
                      {formErrors.clientPhone && <p className="text-[9px] font-black text-red-500 uppercase tracking-widest ml-1">{formErrors.clientPhone}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2 space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Endereço Completo</label>
                      <input 
                        placeholder="Rua, Bairro, Cidade..." 
                        value={address} 
                        onChange={e => {
                          setAddress(e.target.value);
                          if (formErrors.address) setFormErrors(prev => ({ ...prev, address: '' }));
                        }} 
                        className={`w-full px-4 py-2.5 bg-slate-50 border ${formErrors.address ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'} rounded-xl outline-none focus:ring-2 focus:ring-slate-900 transition-all font-medium text-slate-900`} 
                      />
                      {formErrors.address && <p className="text-[9px] font-black text-red-500 uppercase tracking-widest ml-1">{formErrors.address}</p>}
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Casa / Unidade</label>
                      <input 
                        placeholder="Ex: Casa 01" 
                        value={houseNumber} 
                        onChange={e => {
                          setHouseNumber(e.target.value);
                          if (formErrors.houseNumber) setFormErrors(prev => ({ ...prev, houseNumber: '' }));
                        }} 
                        className={`w-full px-4 py-2.5 bg-slate-50 border ${formErrors.houseNumber ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'} rounded-xl outline-none focus:ring-2 focus:ring-slate-900 transition-all font-medium text-slate-900`} 
                      />
                      {formErrors.houseNumber && <p className="text-[9px] font-black text-red-500 uppercase tracking-widest ml-1">{formErrors.houseNumber}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bloco</label>
                      <input placeholder="A" value={block} onChange={e => setBlock(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 transition-all font-medium text-slate-900" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unidade</label>
                      <input placeholder="101" value={unit} onChange={e => setUnit(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 transition-all font-medium text-slate-900" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Torre</label>
                      <input placeholder="1" value={tower} onChange={e => setTower(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 transition-all font-medium text-slate-900" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Andar</label>
                      <input placeholder="10" value={floor} onChange={e => setFloor(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 transition-all font-medium text-slate-900" />
                    </div>
                  </div>
                </div>
              )}

              {osFormTab === 'serviço' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Serviço</label>
                      <select value={serviceType} onChange={e => setServiceType(e.target.value as ServiceType)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 transition-all font-medium text-slate-900">
                        <option value="elétrica">Elétrica</option>
                        <option value="hidráulica">Hidráulica</option>
                        <option value="pintura">Pintura</option>
                        <option value="manutenção geral">Manutenção Geral</option>
                        <option value="estrutural">Estrutural</option>
                        <option value="pisos e revestimentos">Pisos e Revestimentos</option>
                        <option value="forro e cobertura">Forro e Cobertura</option>
                        <option value="louças e metais">Louças e Metais</option>
                        <option value="impermeabilização">Impermeabilização</option>
                        <option value="esquadrias">Esquadrias</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data do Habite-se</label>
                      <input 
                        type="date" 
                        value={habiteSeDate} 
                        onChange={e => {
                          setHabiteSeDate(e.target.value);
                          if (formErrors.habiteSeDate) setFormErrors(prev => ({ ...prev, habiteSeDate: '' }));
                        }} 
                        className={`w-full px-4 py-2 bg-slate-50 border ${formErrors.habiteSeDate ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'} rounded-xl outline-none focus:ring-2 focus:ring-slate-900 transition-all font-medium text-sm text-slate-900`} 
                      />
                      {formErrors.habiteSeDate && <p className="text-[9px] font-black text-red-500 uppercase tracking-widest ml-1">{formErrors.habiteSeDate}</p>}
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prazo de Finalização</label>
                      <input 
                        type="date" 
                        value={deadline} 
                        onChange={e => setDeadline(e.target.value)} 
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 transition-all font-medium text-sm text-slate-900" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Agendamento (Data e Hora)</label>
                      <input 
                        type="datetime-local" 
                        value={scheduledAt} 
                        onChange={e => setScheduledAt(e.target.value)} 
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 transition-all font-medium text-sm text-slate-900" 
                      />
                    </div>
                  </div>

                  {habiteSeDate && (
                    <div className={`p-4 rounded-2xl border flex items-center gap-3 transition-all ${isUnderWarranty ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                      <div className={`p-2 rounded-xl ${isUnderWarranty ? 'bg-emerald-100' : 'bg-red-100'}`}>
                        {isUnderWarranty ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-black uppercase tracking-tight">
                            Verificação de Procedência: {isUnderWarranty ? 'Procedente' : 'Improcedente'}
                          </p>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${isUnderWarranty ? 'bg-emerald-100 border-emerald-200' : 'bg-red-100 border-red-200'}`}>
                            {isUnderWarranty ? 'Dentro da Garantia' : 'BLOQUEADO: Garantia Expirada'}
                          </span>
                        </div>
                        <p className="text-[10px] font-bold opacity-70 uppercase tracking-tighter mt-1">
                          O prazo normativo para {serviceType} é de {WARRANTY_PERIODS[serviceType] || 0} anos.
                          {isUnderWarranty ? ' Expira em: ' : ' Expirou em: '}
                          {format(addYears(parseISO(habiteSeDate), WARRANTY_PERIODS[serviceType] || 0), 'dd/MM/yyyy')}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Técnico Responsável</label>
                    <select value={assignedTechId} onChange={e => setAssignedTechId(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 transition-all font-medium text-slate-900">
                      <option value="">Designar Técnico...</option>
                      {systemUsers.filter(u => u.role === 'technician').map(u => (
                        <option key={u.uid} value={u.uid}>{u.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição do Problema / Serviço</label>
                    <textarea 
                      placeholder="Descreva detalhadamente o que precisa ser feito..." 
                      value={description} 
                      onChange={e => {
                        setDescription(e.target.value);
                        if (formErrors.description) setFormErrors(prev => ({ ...prev, description: '' }));
                      }} 
                      rows={4} 
                      className={`w-full px-4 py-2.5 bg-slate-50 border ${formErrors.description ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'} rounded-xl outline-none focus:ring-2 focus:ring-slate-900 transition-all font-medium resize-none text-slate-900`} 
                    />
                    {formErrors.description && <p className="text-[9px] font-black text-red-500 uppercase tracking-widest ml-1">{formErrors.description}</p>}
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Materiais da OS</h4>
                    <div className="flex gap-2 mb-3">
                      <select value={selectedMaterialId} onChange={e => setSelectedMaterialId(e.target.value)} className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-900 transition-all font-medium">
                        <option value="">Selecionar material...</option>
                        {materialsDB.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                      </select>
                      <input type="number" min="1" value={newMaterialQty} onChange={e => setNewMaterialQty(parseInt(e.target.value))} className="w-20 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-900 transition-all font-medium" />
                      <button type="button" onClick={addMaterialToOS} className="bg-slate-900 text-white p-2.5 rounded-xl hover:bg-slate-800 transition-all active:scale-95"><Plus className="w-5 h-5" /></button>
                    </div>
                    <div className="space-y-2">
                      {osMaterials.map((m, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-sm font-bold text-slate-700">{m.name}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-slate-900 bg-white px-2 py-1 rounded-lg border border-slate-200">{m.quantity} {m.unit}</span>
                            <button type="button" onClick={() => removeMaterialFromOS(i)} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {osFormTab === 'vistoria' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <ClipboardCheck className="w-4 h-4" /> Vistoria Prévia
                    </h4>
                    <div className="space-y-3">
                      {preInspection.map((item, idx) => (
                        <div key={item.id} className="space-y-2 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                          <div className="flex items-center gap-2">
                            <input 
                              type="text" 
                              value={item.label} 
                              placeholder="Título do item..."
                              onChange={(e) => {
                                const newItems = [...preInspection];
                                newItems[idx].label = e.target.value;
                                setPreInspection(newItems);
                              }}
                              className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-slate-900"
                            />
                            <button type="button" onClick={() => setPreInspection(preInspection.filter((_, i) => i !== idx))} className="p-2 text-slate-300 hover:text-red-500 transition-colors" title="Remover item."><X className="w-4 h-4" /></button>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="p-2 bg-white rounded-lg border border-slate-200">
                              <FileText className="w-3 h-3 text-slate-400" />
                            </div>
                            <input 
                              type="text" 
                              value={item.observation || ''} 
                              placeholder="Observação opcional..."
                              onChange={(e) => {
                                const newItems = [...preInspection];
                                newItems[idx].observation = e.target.value;
                                setPreInspection(newItems);
                              }}
                              className="flex-1 px-3 py-2 bg-white border border-slate-100 rounded-lg text-[10px] font-medium outline-none focus:ring-1 focus:ring-slate-900 italic"
                            />
                          </div>
                        </div>
                      ))}
                      <button type="button" onClick={() => setPreInspection([...preInspection, { id: Math.random().toString(), label: '', checked: false }])} className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 flex items-center gap-1 ml-1" title="Adicionar um novo item ao checklist de vistoria."><Plus className="w-3 h-3" /> Adicionar Item de Vistoria</button>
                    </div>
                  </div>

                  <div className="space-y-4 pt-6 border-t border-slate-100">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" /> Checklist de Conclusão
                    </h4>
                    <div className="space-y-3">
                      {completionChecklist.map((item, idx) => (
                        <div key={item.id} className="space-y-2 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                          <div className="flex items-center gap-2">
                            <input 
                              type="text" 
                              value={item.label} 
                              placeholder="Título do item..."
                              onChange={(e) => {
                                const newItems = [...completionChecklist];
                                newItems[idx].label = e.target.value;
                                setCompletionChecklist(newItems);
                              }}
                              className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-slate-900"
                            />
                            <button type="button" onClick={() => setCompletionChecklist(completionChecklist.filter((_, i) => i !== idx))} className="p-2 text-slate-300 hover:text-red-500 transition-colors" title="Remover item."><X className="w-4 h-4" /></button>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="p-2 bg-white rounded-lg border border-slate-200">
                              <FileText className="w-3 h-3 text-slate-400" />
                            </div>
                            <input 
                              type="text" 
                              value={item.observation || ''} 
                              placeholder="Observação opcional..."
                              onChange={(e) => {
                                const newItems = [...completionChecklist];
                                newItems[idx].observation = e.target.value;
                                setCompletionChecklist(newItems);
                              }}
                              className="flex-1 px-3 py-2 bg-white border border-slate-100 rounded-lg text-[10px] font-medium outline-none focus:ring-1 focus:ring-slate-900 italic"
                            />
                          </div>
                        </div>
                      ))}
                      <button type="button" onClick={() => setCompletionChecklist([...completionChecklist, { id: Math.random().toString(), label: '', checked: false }])} className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 flex items-center gap-1 ml-1" title="Adicionar um novo item ao checklist de conclusão."><Plus className="w-3 h-3" /> Adicionar Item de Conclusão</button>
                    </div>
                  </div>
                </div>
              )}

              {osFormTab === 'documentos' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div>
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Documentos Requeridos</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {documentTemplates.map(doc => (
                        <label key={doc.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-200 transition-all cursor-pointer group">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg transition-colors ${selectedDocumentIds.includes(doc.id) ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 group-hover:text-slate-600'}`}>
                              <FileText className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-700">{doc.name}</p>
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                                {doc.type === 'start' ? 'Início' : doc.type === 'finish' ? 'Conclusão' : doc.type === 'os_layout' ? 'Layout OS' : 'Geral'}
                              </p>
                            </div>
                          </div>
                          <input 
                            type="checkbox" 
                            checked={selectedDocumentIds.includes(doc.id)} 
                            onChange={(e) => {
                              if (e.target.checked) setSelectedDocumentIds([...selectedDocumentIds, doc.id]);
                              else setSelectedDocumentIds(selectedDocumentIds.filter(id => id !== doc.id));
                            }}
                            className="w-4 h-4 text-slate-900 rounded border-slate-300 focus:ring-slate-900"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {osFormTab === 'mídia' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div>
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Anexos / Fotos</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {attachments.map((file, idx) => (
                        <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                          {file.url.startsWith('data:image') ? (
                            <img src={file.url} alt={file.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-4">
                              <FileText className="w-8 h-8 text-slate-300 mb-2" />
                              <span className="text-[8px] font-black text-slate-400 uppercase text-center truncate w-full">{file.name}</span>
                            </div>
                          )}
                          <button 
                            type="button" 
                            onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                            className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur-sm text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      <label className="aspect-square flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 hover:border-slate-900 transition-all group" title="Clique para selecionar e enviar fotos ou arquivos.">
                        <Plus className="w-6 h-6 text-slate-300 group-hover:text-slate-900" />
                        <span className="text-[8px] font-black text-slate-400 uppercase group-hover:text-slate-900">Adicionar Mídia</span>
                        <input 
                          type="file" 
                          multiple
                          className="hidden" 
                          onChange={async (e) => {
                            const files = Array.from(e.target.files || []);
                            for (const file of files) {
                              try {
                                const url = await uploadFile(file, `os/attachments/${Date.now()}_${file.name}`);
                                setAttachments(prev => [...prev, { name: file.name, url }]);
                              } catch (error) {
                                console.error('Error uploading attachment:', error);
                                showError(`Erro ao enviar ${file.name}`);
                              }
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-6 flex gap-3 mt-auto">
                {osFormTab !== 'cliente' && (
                  <button 
                    type="button" 
                    onClick={() => {
                      if (osFormTab === 'serviço') setOsFormTab('cliente');
                      else if (osFormTab === 'vistoria') setOsFormTab('serviço');
                      else if (osFormTab === 'mídia') setOsFormTab('vistoria');
                      else if (osFormTab === 'documentos') setOsFormTab('mídia');
                    }}
                    className="flex-1 py-3 border border-slate-200 text-slate-600 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-all"
                    title="Voltar para a etapa anterior do formulário."
                  >
                    Voltar
                  </button>
                )}
                <button 
                  type="submit" 
                  className="flex-1 py-3 bg-soft-accent text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-soft-accent/20 hover:shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
                  title="Salvar todas as informações preenchidas até agora."
                >
                  <Save className="w-4 h-4" /> {editingOS ? 'Salvar Alterações' : 'Criar OS'}
                </button>
                {osFormTab !== 'documentos' && (
                  <button 
                    type="button" 
                    onClick={() => {
                      if (osFormTab === 'cliente') setOsFormTab('serviço');
                      else if (osFormTab === 'serviço') setOsFormTab('vistoria');
                      else if (osFormTab === 'vistoria') setOsFormTab('mídia');
                      else if (osFormTab === 'mídia') setOsFormTab('documentos');
                    }}
                    className="flex-1 py-3 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-slate-900/20 hover:shadow-md active:scale-95 transition-all"
                    title="Avançar para a próxima etapa do formulário."
                  >
                    Próximo
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OS Details Modal */}
      {viewingOS && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 md:p-8">
          <div className="bg-white w-full max-w-5xl rounded-[32px] shadow-2xl overflow-hidden max-h-[95vh] flex flex-col border border-white/20">
            <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-br from-slate-50 to-white">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${getStatusColor(viewingOS.status)}`}>
                  <FileText className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">OS #{viewingOS.id.slice(-6).toUpperCase()}</h3>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(viewingOS.status)}`}>
                      {viewingOS.status}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Detalhes da Ordem de Serviço</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
                  <button 
                    onClick={() => exportOSToPDF(viewingOS, true)}
                    className="p-3 text-slate-400 hover:text-slate-900 transition-all hover:bg-slate-50 rounded-xl active:scale-95"
                    title="Visualizar Impressão: Abrir visualização prévia do documento para conferência."
                  >
                    <Printer className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => exportOSToPDF(viewingOS)}
                    className="p-3 text-slate-400 hover:text-slate-900 transition-all hover:bg-slate-50 rounded-xl active:scale-95"
                    title="Exportar PDF: Baixar o documento oficial da OS em formato PDF."
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => exportOSToJPEG(viewingOS.id)}
                    className="p-3 text-slate-400 hover:text-slate-900 transition-all hover:bg-slate-50 rounded-xl active:scale-95"
                    title="Exportar JPEG: Gerar uma imagem da Ordem de Serviço para compartilhamento rápido."
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                </div>
                <button 
                  onClick={() => setViewingOS(null)} 
                  className="p-3 bg-slate-100 text-slate-400 hover:text-slate-900 hover:bg-slate-200 transition-all rounded-2xl active:scale-95" 
                  title="Fechar Detalhes"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="flex flex-col flex-1 overflow-hidden">
              {/* Horizontal Tabs */}
              <div className="bg-slate-50/50 border-b border-slate-100 p-2 flex items-center gap-2 overflow-x-auto custom-scrollbar no-scrollbar">
                {[
                  { id: 'cliente', label: 'Cliente', icon: User },
                  { id: 'descricao', label: 'Descrição', icon: FileText },
                  { id: 'materiais', label: 'Materiais', icon: Package },
                  { id: 'vistoria', label: 'Vistoria', icon: ClipboardCheck },
                  { id: 'historico', label: 'Execução', icon: Clock },
                  { id: 'peng', label: 'Insight PENG', icon: Zap }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveDetailTab(tab.id as any)}
                    className={`flex items-center gap-3 px-6 py-3 rounded-2xl transition-all whitespace-nowrap group ${
                      activeDetailTab === tab.id 
                        ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' 
                        : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                    }`}
                  >
                    <tab.icon className={`w-4 h-4 ${activeDetailTab === tab.id ? 'text-slate-900' : 'text-slate-300 group-hover:text-slate-500'}`} />
                    <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Content Area */}
              <div id={`os-details-${viewingOS.id}`} className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-white">
              {activeDetailTab === 'cliente' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100 shadow-sm">
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-6 tracking-widest flex items-center gap-2">
                          <User className="w-4 h-4" /> Dados do Solicitante
                        </label>
                        <div className="space-y-6">
                          <div>
                            <p className="text-3xl font-black text-slate-900 uppercase tracking-tight leading-none">{viewingOS.clientName}</p>
                            <div className="flex items-center gap-4 mt-4">
                              <a href={`tel:${viewingOS.clientPhone}`} className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:text-slate-900 transition-all shadow-sm">
                                <Phone className="w-3.5 h-3.5 text-emerald-500" /> {viewingOS.clientPhone}
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100 shadow-sm">
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-6 tracking-widest flex items-center gap-2">
                          <MapPin className="w-4 h-4" /> Localização do Imóvel
                        </label>
                        <div className="space-y-6">
                          <div className="flex items-start gap-4">
                            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
                              <MapPin className="w-6 h-6 text-slate-400" />
                            </div>
                            <div className="flex-1">
                              <p className="text-lg font-black text-slate-900 leading-tight">{viewingOS.address}, {viewingOS.houseNumber}</p>
                              <div className="grid grid-cols-3 gap-4 mt-4">
                                <div className="bg-white p-3 rounded-2xl border border-slate-200 text-center">
                                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Torre</p>
                                  <p className="text-sm font-black text-slate-900">{viewingOS.tower || '-'}</p>
                                </div>
                                <div className="bg-white p-3 rounded-2xl border border-slate-200 text-center">
                                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Andar</p>
                                  <p className="text-sm font-black text-slate-900">{viewingOS.floor || '-'}</p>
                                </div>
                                <div className="bg-white p-3 rounded-2xl border border-slate-200 text-center">
                                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Unidade</p>
                                  <p className="text-sm font-black text-slate-900">{viewingOS.unit || '-'}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-3 pt-2">
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(`${viewingOS.address}, ${viewingOS.houseNumber}`);
                                setNotification({ message: 'Endereço copiado para a área de transferência!', type: 'success' });
                              }}
                              className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm active:scale-95"
                            >
                              <Copy className="w-4 h-4" /> Copiar Endereço
                            </button>
                            <button 
                              onClick={() => {
                                const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${viewingOS.address}, ${viewingOS.houseNumber}`)}`;
                                window.open(url, '_blank');
                              }}
                              className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm active:scale-95"
                            >
                              <ExternalLink className="w-4 h-4" /> Ver no Maps
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100 shadow-sm">
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-6 tracking-widest flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4" /> Status de Garantia
                        </label>
                        {viewingOS.habiteSeDate ? (
                          <div className="space-y-6">
                            <div className={`p-6 rounded-[28px] border-2 flex items-center gap-6 transition-all ${viewingOS.isUnderWarranty ? 'bg-emerald-50/50 border-emerald-100 text-emerald-700' : 'bg-red-50/50 border-red-100 text-red-700'}`}>
                              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner ${viewingOS.isUnderWarranty ? 'bg-emerald-100' : 'bg-red-100'}`}>
                                {viewingOS.isUnderWarranty ? <CheckCircle className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <p className="text-xl font-black uppercase tracking-tight">
                                    {viewingOS.isUnderWarranty ? 'Procedente' : 'Improcedente'}
                                  </p>
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">
                                  {viewingOS.isUnderWarranty ? 'Dentro do prazo de garantia' : 'Garantia expirada pelo Habite-se'}
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-white p-4 rounded-2xl border border-slate-200">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Data do Habite-se</p>
                                <p className="text-sm font-black text-slate-900">{format(parseISO(viewingOS.habiteSeDate), 'dd/MM/yyyy')}</p>
                              </div>
                              <div className="bg-white p-4 rounded-2xl border border-slate-200">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Prazo de Garantia</p>
                                <p className="text-sm font-black text-slate-900">{WARRANTY_PERIODS[viewingOS.serviceType] || 0} Anos</p>
                              </div>
                            </div>

                            <div className="p-4 bg-white rounded-2xl border border-slate-200 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 rounded-lg">
                                  <Calendar className="w-4 h-4 text-blue-500" />
                                </div>
                                <div>
                                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Expiração Estimada</p>
                                  <p className="text-xs font-black text-slate-900">
                                    {format(addYears(parseISO(viewingOS.habiteSeDate), WARRANTY_PERIODS[viewingOS.serviceType] || 0), 'dd/MM/yyyy')}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-12 bg-white rounded-[28px] border border-dashed border-slate-200">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                              <AlertTriangle className="w-8 h-8 text-slate-300" />
                            </div>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-tight">Dados de Habite-se Ausentes</p>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1 px-8">Vincule a data do habite-se para validar a garantia automaticamente.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeDetailTab === 'descricao' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                      <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100 shadow-sm">
                        <div className="flex items-center justify-between mb-6 border-b border-slate-200/50 pb-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <FileText className="w-4 h-4" /> Relato do Problema
                          </label>
                          <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-sm">
                              {viewingOS.serviceType}
                            </span>
                            <select 
                              value={viewingOS.status}
                              onChange={(e) => handleUpdateOSStatus(viewingOS, e.target.value as OSStatus)}
                              className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border-2 outline-none focus:ring-4 focus:ring-slate-900/10 transition-all cursor-pointer shadow-sm ${getStatusColor(viewingOS.status)}`}
                            >
                              <option value="Aberta">Aberta</option>
                              <option value="Em andamento">Em andamento</option>
                              <option value="Concluída">Concluída</option>
                              <option value="Cancelada">Cancelada</option>
                            </select>
                          </div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-inner">
                          <p className="text-base text-slate-700 font-medium leading-relaxed">
                            {viewingOS.description}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-6">
                        {viewingOS.beforePhotos && viewingOS.beforePhotos.length > 0 && (
                          <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100 shadow-sm">
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-6 tracking-widest flex items-center gap-2">
                              <Camera className="w-4 h-4" /> Evidências Iniciais (Antes)
                            </label>
                            <PhotoCarousel photos={viewingOS.beforePhotos} title="Evidências (Antes)" />
                          </div>
                        )}

                        {viewingOS.afterPhotos && viewingOS.afterPhotos.length > 0 && (
                          <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100 shadow-sm">
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-6 tracking-widest flex items-center gap-2">
                              <CheckCircle className="w-4 h-4" /> Evidências de Conclusão (Depois)
                            </label>
                            <PhotoCarousel photos={viewingOS.afterPhotos} title="Evidências (Depois)" />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-8">
                      <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100 shadow-sm">
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-6 tracking-widest flex items-center gap-2">
                          <Clock className="w-4 h-4" /> Cronograma de Execução
                        </label>
                        <div className="space-y-4">
                          <div className="relative pl-8 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                            <div className="relative">
                              <div className="absolute -left-8 top-1 w-6 h-6 rounded-full bg-white border-2 border-slate-900 flex items-center justify-center z-10 shadow-sm">
                                <div className="w-2 h-2 rounded-full bg-slate-900"></div>
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Abertura do Chamado</p>
                                <p className="text-sm font-black text-slate-900 mt-0.5">{format(parseISO(viewingOS.createdAt), 'dd/MM/yyyy HH:mm')}</p>
                              </div>
                            </div>

                            {viewingOS.startedAt && (
                              <div className="relative">
                                <div className="absolute -left-8 top-1 w-6 h-6 rounded-full bg-white border-2 border-blue-500 flex items-center justify-center z-10 shadow-sm">
                                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                </div>
                                <div>
                                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Início dos Trabalhos</p>
                                  <p className="text-sm font-black text-blue-900 mt-0.5">{format(parseISO(viewingOS.startedAt), 'dd/MM/yyyy HH:mm')}</p>
                                </div>
                              </div>
                            )}

                            {viewingOS.finishedAt && (
                              <div className="relative">
                                <div className="absolute -left-8 top-1 w-6 h-6 rounded-full bg-white border-2 border-emerald-500 flex items-center justify-center z-10 shadow-sm">
                                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                </div>
                                <div>
                                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Conclusão Final</p>
                                  <p className="text-sm font-black text-emerald-900 mt-0.5">{format(parseISO(viewingOS.finishedAt), 'dd/MM/yyyy HH:mm')}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {viewingOS.attachments && viewingOS.attachments.length > 0 && (
                        <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100 shadow-sm">
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-6 tracking-widest flex items-center gap-2">
                            <Paperclip className="w-4 h-4" /> Anexos da Construtora
                          </label>
                          <div className="space-y-3">
                            {viewingOS.attachments.map((file, idx) => (
                              <a 
                                key={idx} 
                                href={file.url} 
                                download={file.name}
                                className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 hover:border-slate-900 hover:shadow-md transition-all group active:scale-95"
                              >
                                <div className="flex items-center gap-3 overflow-hidden">
                                  <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-slate-900 group-hover:text-white transition-colors">
                                    <FileText className="w-4 h-4" />
                                  </div>
                                  <span className="text-xs font-bold text-slate-700 truncate">{file.name}</span>
                                </div>
                                <Download className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeDetailTab === 'materiais' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100 shadow-sm">
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-6 tracking-widest flex items-center gap-2">
                      <Package className="w-4 h-4" /> Insumos e Materiais Utilizados
                    </label>
                    {viewingOS.materials && viewingOS.materials.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {viewingOS.materials.map((m, i) => (
                          <div key={i} className="flex justify-between items-center p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-slate-900 transition-all group">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-slate-50 rounded-xl group-hover:bg-slate-900 group-hover:text-white transition-colors">
                                <Package className="w-4 h-4" />
                              </div>
                              <span className="font-bold text-slate-700 text-sm">{m.name}</span>
                            </div>
                            <span className="font-black text-slate-900 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 text-[10px] uppercase tracking-widest">
                              {m.quantity} {m.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-16 bg-white rounded-[28px] border border-dashed border-slate-200">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Package className="w-8 h-8 text-slate-300" />
                        </div>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-tight">Nenhum material registrado</p>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Os materiais utilizados serão listados aqui após o preenchimento pelo técnico.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeDetailTab === 'vistoria' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-8 border-b border-slate-200/50 pb-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <ClipboardCheck className="w-4 h-4" /> Laudo de Vistoria Técnica
                      </label>
                      {viewingOS.surveyCompleted && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Concluída</span>
                        </div>
                      )}
                    </div>

                    {viewingOS.surveyCompleted ? (
                      <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Data e Hora da Vistoria</p>
                            <p className="text-sm font-black text-slate-900">
                              {format(parseISO(viewingOS.surveyAt!), 'dd/MM/yyyy HH:mm')}
                            </p>
                          </div>
                          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Técnico Responsável</p>
                            <p className="text-sm font-black text-slate-900">
                              {viewingOS.technicianName || 'Técnico não identificado'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="bg-white p-8 rounded-[28px] border border-slate-100 shadow-inner">
                          <label className="block text-[8px] font-black text-slate-400 uppercase mb-4 tracking-widest">Parecer Técnico e Observações</label>
                          <div className="relative">
                            <Quote className="absolute -left-2 -top-2 w-8 h-8 text-slate-100 -z-0" />
                            <p className="relative z-10 text-base text-slate-700 font-medium leading-relaxed italic">
                              {viewingOS.observations || 'Nenhuma observação técnica registrada para esta vistoria.'}
                            </p>
                          </div>
                        </div>

                        {viewingOS.media && viewingOS.media.length > 0 && (
                          <div className="space-y-4">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                              <Camera className="w-4 h-4" /> Mídias e Evidências de Campo
                            </label>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                              {viewingOS.media.map((m, idx) => (
                                <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border-2 border-white shadow-md group hover:scale-105 transition-all cursor-pointer">
                                  {m.type === 'image' ? (
                                    <img src={m.url} alt={`Vistoria ${idx}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  ) : (
                                    <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                                      <Play className="w-10 h-10 text-white opacity-50" />
                                    </div>
                                  )}
                                  <a 
                                    href={m.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2"
                                  >
                                    <ExternalLink className="w-6 h-6 text-white" />
                                    <span className="text-[8px] font-black text-white uppercase tracking-widest">Abrir Original</span>
                                  </a>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-20 bg-white rounded-[28px] border border-dashed border-slate-200">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                          <ClipboardCheck className="w-10 h-10 text-slate-300" />
                        </div>
                        <p className="text-lg font-bold text-slate-500 uppercase tracking-tight">Aguardando Vistoria Técnica</p>
                        <p className="text-xs text-slate-400 font-black uppercase tracking-widest mt-2 max-w-xs mx-auto">O técnico ainda não realizou o preenchimento do laudo em campo.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeDetailTab === 'historico' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Signatures Section */}
                    <div className="space-y-8">
                      <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100 shadow-sm">
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-6 tracking-widest flex items-center gap-2">
                          <Edit3 className="w-4 h-4" /> Assinaturas de Vistoria Prévia
                        </label>
                        <div className="grid grid-cols-1 gap-6">
                          {/* Client Signature */}
                          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                              <p className="text-[10px] font-black text-slate-400 uppercase">Assinatura do Cliente</p>
                              {viewingOS.preInspectionSignatureClient && (
                                <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100 uppercase tracking-widest">Coletada</span>
                              )}
                            </div>
                            {viewingOS.preInspectionSignatureClient ? (
                              <div className="relative bg-slate-50 rounded-xl border border-slate-100 p-4 flex flex-col items-center group">
                                <img src={viewingOS.preInspectionSignatureClient} alt="Assinatura Cliente" className="max-h-24 object-contain" referrerPolicy="no-referrer" />
                                {viewingOS.status === 'Aberta' && (
                                  <button 
                                    onClick={() => handleUpdateOSStatus(viewingOS, viewingOS.status, { preInspectionSignatureClient: '' })}
                                    className="absolute top-2 right-2 p-1.5 bg-white text-slate-400 hover:text-red-500 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-xl">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Aguardando assinatura</p>
                              </div>
                            )}
                          </div>

                          {/* Tech Signature */}
                          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                              <p className="text-[10px] font-black text-slate-400 uppercase">Assinatura do Técnico</p>
                              {viewingOS.preInspectionSignatureTech && (
                                <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100 uppercase tracking-widest">Coletada</span>
                              )}
                            </div>
                            {viewingOS.preInspectionSignatureTech ? (
                              <div className="relative bg-slate-50 rounded-xl border border-slate-100 p-4 flex flex-col items-center group">
                                <img src={viewingOS.preInspectionSignatureTech} alt="Assinatura Técnico" className="max-h-24 object-contain" referrerPolicy="no-referrer" />
                                {viewingOS.status === 'Aberta' && (
                                  <button 
                                    onClick={() => handleUpdateOSStatus(viewingOS, viewingOS.status, { preInspectionSignatureTech: '' })}
                                    className="absolute top-2 right-2 p-1.5 bg-white text-slate-400 hover:text-red-500 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-xl">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Aguardando assinatura</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {(viewingOS.status === 'Em andamento' || viewingOS.status === 'Concluída') && (
                        <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100 shadow-sm">
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-6 tracking-widest flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" /> Assinatura de Conclusão (Termo de Ciência)
                          </label>
                          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            {viewingOS.signature ? (
                              <div className="relative bg-slate-50 rounded-xl border border-slate-100 p-6 flex flex-col items-center group">
                                <img src={viewingOS.signature} alt="Assinatura Final" className="max-h-32 object-contain" referrerPolicy="no-referrer" />
                                <p className="text-[10px] font-black text-slate-400 uppercase mt-4 tracking-widest">Ciência do reparo realizado</p>
                              </div>
                            ) : (
                              <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-xl">
                                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                  <Edit3 className="w-6 h-6 text-slate-300" />
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Aguardando finalização do serviço</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Materials and Guide Section */}
                    <div className="space-y-8">
                      <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100 shadow-sm">
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-6 tracking-widest flex items-center gap-2">
                          <Package className="w-4 h-4" /> Guia de Retirada (Almoxarifado)
                        </label>
                        <div className="space-y-6">
                          {viewingOS.materials && viewingOS.materials.length > 0 ? (
                            <div className="space-y-4">
                              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                <div className="space-y-3">
                                  {viewingOS.materials.map((m, i) => (
                                    <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                                      <span className="text-xs font-bold text-slate-700">{m.name}</span>
                                      <span className="text-[10px] font-black text-slate-900 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 uppercase">{m.quantity} {m.unit}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className="flex gap-3">
                                <button 
                                  onClick={async () => {
                                    setIsGeneratingGuide(true);
                                    try { await exportWarehouseGuide(viewingOS); } finally { setIsGeneratingGuide(false); }
                                  }}
                                  disabled={isGeneratingGuide}
                                  className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg ${viewingOS.isWarehouseRequested ? 'bg-emerald-500 text-white shadow-emerald-100' : 'bg-blue-600 text-white shadow-blue-100 hover:bg-blue-700'}`}
                                >
                                  {isGeneratingGuide ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Printer className="w-4 h-4" /> {viewingOS.isWarehouseRequested ? 'Reemitir PDF' : 'Emitir PDF'}</>}
                                </button>
                                <button 
                                  onClick={() => exportWarehouseGuideAsImage(viewingOS)}
                                  className="flex-1 flex items-center justify-center gap-2 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                                >
                                  <Camera className="w-4 h-4" /> Emitir Imagem
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-12 bg-white rounded-[28px] border border-dashed border-slate-200">
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Nenhum material solicitado</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Photos Section */}
                      <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100 shadow-sm">
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-6 tracking-widest flex items-center gap-2">
                          <Camera className="w-4 h-4" /> Evidências Fotográficas
                        </label>
                        <div className="space-y-8">
                          {/* Before Photos */}
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] font-black text-slate-400 uppercase">Local (Antes do Serviço)</p>
                              {viewingOS.status === 'Aberta' && (
                                <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 cursor-pointer flex items-center gap-1">
                                  <Plus className="w-3 h-3" /> Adicionar
                                  <input 
                                    type="file" multiple className="hidden" accept="image/*"
                                    onChange={async (e) => {
                                      const files = Array.from(e.target.files || []);
                                      if (files.length === 0) return;
                                      setIsSavingSignature(true);
                                      try {
                                        const newPhotos = [...(viewingOS.beforePhotos || [])];
                                        for (const file of files) {
                                          const reader = new FileReader();
                                          const promise = new Promise<string>((resolve) => { reader.onloadend = () => resolve(reader.result as string); });
                                          reader.readAsDataURL(file);
                                          const base64 = await promise;
                                          const compressedBase64 = await compressImage(base64, 1200, 1200, 0.7);
                                          const blob = dataURLtoBlob(compressedBase64);
                                          const url = await uploadFile(blob, `os/${viewingOS.id}/before_${Date.now()}_${file.name}`);
                                          newPhotos.push(url);
                                        }
                                        await handleUpdateOSStatus(viewingOS, viewingOS.status, { beforePhotos: newPhotos });
                                      } catch (error) {
                                        console.error('Erro ao fazer upload de fotos:', error);
                                        showError('Erro ao fazer upload de fotos.');
                                      } finally { setIsSavingSignature(false); }
                                    }}
                                  />
                                </label>
                              )}
                            </div>
                            {viewingOS.beforePhotos && viewingOS.beforePhotos.length > 0 ? (
                              <div className="grid grid-cols-3 gap-3">
                                {viewingOS.beforePhotos.map((photo, idx) => (
                                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group">
                                    <img src={photo} alt={`Antes ${idx}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    <button 
                                      onClick={() => {
                                        navigator.clipboard.writeText(photo);
                                        showSuccess('Link da imagem copiado!');
                                      }}
                                      className="absolute bottom-1 right-1 p-1 bg-white/80 backdrop-blur-sm text-slate-900 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                      title="Copiar link direto"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </button>
                                    {viewingOS.status === 'Aberta' && (
                                      <button 
                                        onClick={() => {
                                          const newPhotos = viewingOS.beforePhotos?.filter((_, i) => i !== idx);
                                          handleUpdateOSStatus(viewingOS, viewingOS.status, { beforePhotos: newPhotos });
                                        }}
                                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-slate-200">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Nenhuma foto registrada</p>
                              </div>
                            )}
                          </div>

                          {/* After Photos */}
                          {(viewingOS.status === 'Em andamento' || viewingOS.status === 'Concluída') && (
                            <div className="space-y-4 pt-6 border-t border-slate-200">
                              <div className="flex items-center justify-between">
                                <p className="text-[10px] font-black text-slate-400 uppercase">Serviço (Depois do Reparo)</p>
                                {viewingOS.status === 'Em andamento' && (
                                  <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 cursor-pointer flex items-center gap-1">
                                    <Plus className="w-3 h-3" /> Adicionar
                                    <input 
                                      type="file" multiple className="hidden" accept="image/*"
                                      onChange={async (e) => {
                                        const files = Array.from(e.target.files || []);
                                        if (files.length === 0) return;
                                        setIsSavingSignature(true);
                                        try {
                                          const newPhotos = [...(viewingOS.afterPhotos || [])];
                                          for (const file of files) {
                                            const reader = new FileReader();
                                            const promise = new Promise<string>((resolve) => { reader.onloadend = () => resolve(reader.result as string); });
                                            reader.readAsDataURL(file);
                                            const base64 = await promise;
                                            const compressedBase64 = await compressImage(base64, 1200, 1200, 0.7);
                                            const blob = dataURLtoBlob(compressedBase64);
                                            const url = await uploadFile(blob, `os/${viewingOS.id}/after_${Date.now()}_${file.name}`);
                                            newPhotos.push(url);
                                          }
                                          await handleUpdateOSStatus(viewingOS, viewingOS.status, { afterPhotos: newPhotos });
                                        } catch (error) {
                                          console.error('Erro ao fazer upload de fotos:', error);
                                          showError('Erro ao fazer upload de fotos.');
                                        } finally { setIsSavingSignature(false); }
                                      }}
                                    />
                                  </label>
                                )}
                              </div>
                              {viewingOS.afterPhotos && viewingOS.afterPhotos.length > 0 ? (
                                <div className="grid grid-cols-3 gap-3">
                                  {viewingOS.afterPhotos.map((photo, idx) => (
                                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group">
                                      <img src={photo} alt={`Depois ${idx}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                      <button 
                                        onClick={() => {
                                          navigator.clipboard.writeText(photo);
                                          showSuccess('Link da imagem copiado!');
                                        }}
                                        className="absolute bottom-1 right-1 p-1 bg-white/80 backdrop-blur-sm text-slate-900 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Copiar link direto"
                                      >
                                        <Copy className="w-3 h-3" />
                                      </button>
                                      {viewingOS.status === 'Em andamento' && (
                                        <button 
                                          onClick={() => {
                                            const newPhotos = viewingOS.afterPhotos?.filter((_, i) => i !== idx);
                                            handleUpdateOSStatus(viewingOS, viewingOS.status, { afterPhotos: newPhotos });
                                          }}
                                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-slate-200">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase">Aguardando fotos de conclusão</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Checklists Section */}
                      <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100 shadow-sm">
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-6 tracking-widest flex items-center gap-2">
                          <ClipboardCheck className="w-4 h-4" /> Checklists de Verificação
                        </label>
                        <div className="space-y-8">
                          {/* Pre-Inspection Checklist */}
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] font-black text-slate-400 uppercase">Itens de Vistoria Prévia</p>
                            </div>
                            <div className="space-y-2">
                              {viewingOS.preInspection?.map((item, idx) => (
                                <div key={item.id} className="p-3 bg-white rounded-xl border border-slate-100 space-y-2">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${item.checked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
                                      {item.checked && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                    <span className={`text-[10px] font-bold ${item.checked ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{item.label}</span>
                                  </div>
                                  {item.observation && (
                                    <div className="ml-7 flex items-start gap-2 text-[9px] text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                                      <FileText className="w-3 h-3 mt-0.5 shrink-0" />
                                      <span>{item.observation}</span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Completion Checklist */}
                          {(viewingOS.status === 'Em andamento' || viewingOS.status === 'Concluída') && (
                            <div className="space-y-4 pt-6 border-t border-slate-200">
                              <div className="flex items-center justify-between">
                                <p className="text-[10px] font-black text-slate-400 uppercase">Checklist de Conclusão</p>
                              </div>
                              <div className="space-y-2">
                                {viewingOS.completionChecklist?.map((item, idx) => (
                                  <div key={item.id} className="p-3 bg-white rounded-xl border border-slate-100 space-y-2">
                                    <div className="flex items-center gap-3">
                                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${item.checked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
                                        {item.checked && <Check className="w-3 h-3 text-white" />}
                                      </div>
                                      <span className={`text-[10px] font-bold ${item.checked ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{item.label}</span>
                                    </div>
                                    {item.observation && (
                                      <div className="ml-7 flex items-start gap-2 text-[9px] text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                                        <FileText className="w-3 h-3 mt-0.5 shrink-0" />
                                        <span>{item.observation}</span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {profile.role === 'admin' && viewingOS.status !== 'Concluída' && viewingOS.status !== 'Cancelada' && (
                        <div className="bg-slate-900 p-8 rounded-[32px] shadow-2xl shadow-slate-200">
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-6 tracking-widest flex items-center gap-2">
                            <Shield className="w-4 h-4" /> Ações Administrativas
                          </label>
                          <button 
                            onClick={() => handleUpdateOSStatus(viewingOS, 'Concluída', { finishedAt: new Date().toISOString() })}
                            className="w-full py-4 bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-3 active:scale-95"
                          >
                            <CheckCircle className="w-5 h-5" /> Finalizar Ordem de Serviço
                          </button>
                          <p className="text-[10px] text-slate-500 font-medium mt-4 text-center italic">
                            * A finalização manual pelo administrador ignora a necessidade de assinaturas de campo.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

          {activeDetailTab === 'peng' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4 mb-6 border-b border-slate-100 pb-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                    <Zap className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Análise Pericial Especializada</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Parecer Técnico e Fundamentação Normativa</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nível de Criticidade</label>
                      <select 
                        value={viewingOS.criticalityLevel || ''}
                        onChange={(e) => handleUpdateOSStatus(viewingOS, viewingOS.status, { criticalityLevel: e.target.value as any })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 transition-all font-bold text-xs uppercase"
                      >
                        <option value="">Selecionar...</option>
                        <option value="low">Baixa (Monitoramento)</option>
                        <option value="medium">Média (Reparo Programado)</option>
                        <option value="high">Alta (Risco Iminente)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Perito Auditor</label>
                      <input 
                        placeholder="Nome do Engenheiro"
                        value={viewingOS.auditorName || ''}
                        onChange={(e) => handleUpdateOSStatus(viewingOS, viewingOS.status, { auditorName: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 transition-all font-bold text-xs uppercase"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Recomendação Técnica Corretiva</label>
                    <textarea 
                      rows={4}
                      placeholder="Descreva a solução técnica definitiva para o problema..."
                      value={viewingOS.technicalRecommendation || ''}
                      onChange={(e) => handleUpdateOSStatus(viewingOS, viewingOS.status, { technicalRecommendation: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 transition-all font-medium text-sm"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fundamentação Normativa (PENG)</label>
                    <div className="space-y-2">
                      {viewingOS.pengCrossings && viewingOS.pengCrossings.length > 0 ? (
                        viewingOS.pengCrossings.map((c, i) => (
                          <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="px-2 py-0.5 bg-slate-900 text-white text-[8px] font-black uppercase tracking-widest rounded">{c.nbr}</span>
                              <span className="text-[10px] font-bold text-slate-600">{c.description}</span>
                            </div>
                            <p className="text-xs text-slate-700 font-medium leading-relaxed">{c.normalizationAction}</p>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                          <Scale className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nenhuma norma vinculada via PENG</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
              <div className="p-6 border-t border-slate-200 flex flex-col gap-4 bg-slate-50/50">
                <div className="flex gap-3">
                  <button 
                    onClick={() => exportOSToPDF(viewingOS)}
                    className="flex-1 py-3 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all hover:shadow-md active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" /> Exportar PDF
                  </button>
                  <button 
                    onClick={() => exportOSToJPEG(viewingOS.id)}
                    className="flex-1 py-3 bg-white border border-slate-200 text-slate-900 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-all hover:shadow-md active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Camera className="w-4 h-4" /> Exportar JPEG
                  </button>
                </div>

                {viewingOS.status === 'Em andamento' && (
                  <button 
                    onClick={() => {
                      confirmAction('Deseja finalizar esta OS?', async () => {
                        await handleUpdateOSStatus(viewingOS, 'Concluída');
                        setViewingOS(null);
                      });
                    }}
                    className="w-full py-4 bg-emerald-600 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all hover:shadow-md active:scale-95 flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" /> Finalizar Ordem de Serviço
                  </button>
                )}

              {viewingOS.status === 'Aberta' && (
                <div className="space-y-2">
                  {(!(viewingOS.preInspection?.every(i => i.checked)) || 
                    !(viewingOS.beforePhotos && viewingOS.beforePhotos.length >= 5) ||
                    !viewingOS.preInspectionSignatureClient ||
                    !viewingOS.preInspectionSignatureTech ||
                    !viewingOS.isWarehouseRequested) && (
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest text-center animate-pulse">
                      {(!viewingOS.beforePhotos || viewingOS.beforePhotos.length < 5) 
                        ? `Anexe no mínimo 5 fotos do local (${viewingOS.beforePhotos?.length || 0}/5)` 
                        : (!viewingOS.preInspectionSignatureClient || !viewingOS.preInspectionSignatureTech)
                        ? 'Colete as assinaturas do cliente e técnico'
                        : !viewingOS.isWarehouseRequested
                        ? 'Emita a guia de almoxarifado'
                        : 'Complete a vistoria prévia'} para iniciar
                    </p>
                  )}
                  <button 
                    onClick={() => {
                      const allPreChecked = viewingOS.preInspection?.every(i => i.checked);
                      const hasPhotos = viewingOS.beforePhotos && viewingOS.beforePhotos.length >= 5;
                      const hasSignatures = viewingOS.preInspectionSignatureClient && viewingOS.preInspectionSignatureTech;
                      const hasWarehouse = viewingOS.isWarehouseRequested;
                      if (!allPreChecked || !hasPhotos || !hasSignatures || !hasWarehouse) return;
                      handleUpdateOSStatus(viewingOS, 'Em andamento', { startedAt: new Date().toISOString() });
                    }}
                    disabled={
                      !(viewingOS.preInspection?.every(i => i.checked)) || 
                      !(viewingOS.beforePhotos && viewingOS.beforePhotos.length >= 5) ||
                      !viewingOS.preInspectionSignatureClient ||
                      !viewingOS.preInspectionSignatureTech ||
                      !viewingOS.isWarehouseRequested
                    }
                    className={`w-full py-3 font-black text-xs uppercase tracking-widest rounded-xl transition-all hover:shadow-md active:scale-95 flex items-center justify-center gap-2 ${
                      (viewingOS.preInspection?.every(i => i.checked) && 
                       viewingOS.beforePhotos && viewingOS.beforePhotos.length >= 5 &&
                       viewingOS.preInspectionSignatureClient &&
                       viewingOS.preInspectionSignatureTech &&
                       viewingOS.isWarehouseRequested)
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-100 hover:bg-blue-700' 
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Clock className="w-4 h-4" /> Vistoria Realizada (Iniciar)
                  </button>
                </div>
              )}
              {viewingOS.status === 'Em andamento' && (
                <div className="space-y-2">
                  {(!(viewingOS.completionChecklist?.every(i => i.checked)) || !(viewingOS.afterPhotos && viewingOS.afterPhotos.length >= 5) || !viewingOS.isSignedByClient) && (
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest text-center animate-pulse">
                      {(!viewingOS.afterPhotos || viewingOS.afterPhotos.length < 5) 
                        ? `Anexe no mínimo 5 fotos do serviço (${viewingOS.afterPhotos?.length || 0}/5)` 
                        : !viewingOS.isSignedByClient 
                        ? 'Colete a assinatura do cliente' 
                        : 'Complete o checklist de conclusão'} para finalizar
                    </p>
                  )}
                  <button 
                    onClick={() => {
                      const allCompChecked = viewingOS.completionChecklist?.every(i => i.checked);
                      const hasPhotos = viewingOS.afterPhotos && viewingOS.afterPhotos.length >= 5;
                      const hasSignature = viewingOS.isSignedByClient;
                      if (!allCompChecked || !hasPhotos || !hasSignature) return;
                      handleUpdateOSStatus(viewingOS, 'Concluída', { finishedAt: new Date().toISOString() });
                    }}
                    disabled={!(viewingOS.completionChecklist?.every(i => i.checked)) || !(viewingOS.afterPhotos && viewingOS.afterPhotos.length >= 5) || !viewingOS.isSignedByClient}
                    className={`w-full py-3 font-black text-xs uppercase tracking-widest rounded-xl transition-all hover:shadow-md active:scale-95 flex items-center justify-center gap-2 ${
                      (viewingOS.completionChecklist?.every(i => i.checked) && viewingOS.afterPhotos && viewingOS.afterPhotos.length >= 5 && viewingOS.isSignedByClient)
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100 hover:bg-emerald-700' 
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4" /> Finalizar Serviço
                  </button>
                </div>
              )}
              <button onClick={() => setViewingOS(null)} className="w-full py-3 bg-slate-100 text-slate-600 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-all active:scale-95">Fechar</button>
            </div>
          </div>
        </div>
      </div>
    )}

      {/* Material Form Modal */}
      {showMaterialForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900">{editingMaterial ? 'Editar Material' : 'Novo Material'}</h3>
              <button onClick={() => setShowMaterialForm(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSaveMaterial} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Material</label>
                <input 
                  placeholder="Ex: Cimento Portland CP II" 
                  value={matName} 
                  onChange={e => {
                    setMatName(e.target.value);
                    if (materialFormErrors.name) setMaterialFormErrors(prev => ({ ...prev, name: '' }));
                  }} 
                  className={`w-full px-4 py-2.5 bg-slate-50 border ${materialFormErrors.name ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'} rounded-xl outline-none focus:ring-2 focus:ring-slate-900 transition-all font-medium`} 
                />
                {materialFormErrors.name && <p className="text-[9px] font-black text-red-500 uppercase tracking-widest ml-1">{materialFormErrors.name}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unidade de Medida</label>
                <input 
                  placeholder="Ex: Saco 50kg, m², Un" 
                  value={matUnit} 
                  onChange={e => {
                    setMatUnit(e.target.value);
                    if (materialFormErrors.unit) setMaterialFormErrors(prev => ({ ...prev, unit: '' }));
                  }} 
                  className={`w-full px-4 py-2.5 bg-slate-50 border ${materialFormErrors.unit ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'} rounded-xl outline-none focus:ring-2 focus:ring-slate-900 transition-all font-medium`} 
                />
                {materialFormErrors.unit && <p className="text-[9px] font-black text-red-500 uppercase tracking-widest ml-1">{materialFormErrors.unit}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Custo (R$)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    placeholder="0,00" 
                    value={matCost || ''} 
                    onChange={e => {
                      setMatCost(parseFloat(e.target.value) || 0);
                      if (materialFormErrors.cost) setMaterialFormErrors(prev => ({ ...prev, cost: '' }));
                    }} 
                    className={`w-full px-4 py-2.5 bg-slate-50 border ${materialFormErrors.cost ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'} rounded-xl outline-none focus:ring-2 focus:ring-slate-900 transition-all font-medium`} 
                  />
                  {materialFormErrors.cost && <p className="text-[9px] font-black text-red-500 uppercase tracking-widest ml-1">{materialFormErrors.cost}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Preço Venda (R$)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    placeholder="0,00" 
                    value={matPrice || ''} 
                    onChange={e => {
                      setMatPrice(parseFloat(e.target.value) || 0);
                      if (materialFormErrors.price) setMaterialFormErrors(prev => ({ ...prev, price: '' }));
                    }} 
                    className={`w-full px-4 py-2.5 bg-slate-50 border ${materialFormErrors.price ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'} rounded-xl outline-none focus:ring-2 focus:ring-slate-900 transition-all font-medium`} 
                  />
                  {materialFormErrors.price && <p className="text-[9px] font-black text-red-500 uppercase tracking-widest ml-1">{materialFormErrors.price}</p>}
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowMaterialForm(false)} 
                  className="flex-1 py-3 border border-slate-200 text-slate-600 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-all hover:shadow-md active:scale-95"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all hover:shadow-md active:scale-95"
                >
                  Salvar Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Form Modal */}
      {showUserForm && editingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Configurações de Acesso</h3>
              <button onClick={() => setShowUserForm(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSaveUser} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
              <div>
                <label className="label-caps">Nome do Usuário</label>
                <input 
                  placeholder="Nome" 
                  value={userName || ''} 
                  onChange={e => {
                    setUserName(e.target.value);
                    if (userFormErrors.name) setUserFormErrors(prev => ({ ...prev, name: '' }));
                  }} 
                  className={`input-field ${userFormErrors.name ? 'border-soft-danger ring-1 ring-soft-danger' : ''}`} 
                />
                {userFormErrors.name && <p className="text-[9px] font-black text-soft-danger uppercase tracking-widest ml-1">{userFormErrors.name}</p>}
              </div>
              <div>
                <label className="label-caps">Cargo / Função</label>
                <select value={userRole} onChange={e => setUserRole(e.target.value as any)} className="input-field">
                  <option value="technician">Técnico</option>
                  <option value="admin">Administrador</option>
                  <option value="user">Usuário</option>
                </select>
              </div>

              <div className="space-y-4 pt-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Permissões de Acesso</p>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Operacional</p>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { key: 'canCreateOS', label: 'Criar OS', icon: <Plus className="w-3.5 h-3.5" /> },
                        { key: 'canEditOS', label: 'Editar OS', icon: <Edit2 className="w-3.5 h-3.5" /> },
                        { key: 'canDeleteOS', label: 'Excluir OS', icon: <Trash2 className="w-3.5 h-3.5" /> },
                        { key: 'canSeeAllOS', label: 'Ver Todas as OS', icon: <Eye className="w-3.5 h-3.5" /> },
                      ].map((p) => (
                        <label key={p.key} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-200 transition-all cursor-pointer group">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg transition-colors ${userPermissions[p.key as keyof UserPermissions] ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 group-hover:text-slate-600'}`}>
                              {p.icon}
                            </div>
                            <span className="text-sm font-bold text-slate-700">{p.label}</span>
                          </div>
                          <div className="relative flex items-center">
                            <input 
                              type="checkbox" 
                              checked={userPermissions[p.key as keyof UserPermissions]} 
                              onChange={(e) => setUserPermissions({ ...userPermissions, [p.key]: e.target.checked })}
                              className="sr-only peer"
                            />
                            <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:bg-slate-900 transition-colors"></div>
                            <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full peer-checked:translate-x-5 transition-transform"></div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Materiais</p>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { key: 'canCreateMaterials', label: 'Criar Materiais', icon: <Plus className="w-3.5 h-3.5" /> },
                        { key: 'canEditMaterials', label: 'Editar Materiais', icon: <Edit2 className="w-3.5 h-3.5" /> },
                        { key: 'canDeleteMaterials', label: 'Excluir Materiais', icon: <Trash2 className="w-3.5 h-3.5" /> },
                      ].map((p) => (
                        <label key={p.key} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-200 transition-all cursor-pointer group">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg transition-colors ${userPermissions[p.key as keyof UserPermissions] ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 group-hover:text-slate-600'}`}>
                              {p.icon}
                            </div>
                            <span className="text-sm font-bold text-slate-700">{p.label}</span>
                          </div>
                          <div className="relative flex items-center">
                            <input 
                              type="checkbox" 
                              checked={userPermissions[p.key as keyof UserPermissions]} 
                              onChange={(e) => setUserPermissions({ ...userPermissions, [p.key]: e.target.checked })}
                              className="sr-only peer"
                            />
                            <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:bg-slate-900 transition-colors"></div>
                            <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full peer-checked:translate-x-5 transition-transform"></div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Documentos</p>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { key: 'canCreateDocuments', label: 'Criar Documentos', icon: <Plus className="w-3.5 h-3.5" /> },
                        { key: 'canEditDocuments', label: 'Editar Documentos', icon: <Edit2 className="w-3.5 h-3.5" /> },
                        { key: 'canDeleteDocuments', label: 'Excluir Documentos', icon: <Trash2 className="w-3.5 h-3.5" /> },
                      ].map((p) => (
                        <label key={p.key} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-200 transition-all cursor-pointer group">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg transition-colors ${userPermissions[p.key as keyof UserPermissions] ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 group-hover:text-slate-600'}`}>
                              {p.icon}
                            </div>
                            <span className="text-sm font-bold text-slate-700">{p.label}</span>
                          </div>
                          <div className="relative flex items-center">
                            <input 
                              type="checkbox" 
                              checked={userPermissions[p.key as keyof UserPermissions]} 
                              onChange={(e) => setUserPermissions({ ...userPermissions, [p.key]: e.target.checked })}
                              className="sr-only peer"
                            />
                            <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:bg-slate-900 transition-colors"></div>
                            <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full peer-checked:translate-x-5 transition-transform"></div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Relatórios</p>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { key: 'canViewReports', label: 'Acesso Geral a Relatórios', icon: <TrendingUp className="w-3.5 h-3.5" /> },
                        { key: 'canViewOSReports', label: 'Relatórios de OS', icon: <FileText className="w-3.5 h-3.5" /> },
                        { key: 'canViewMaterialReports', label: 'Relatórios de Materiais', icon: <Package className="w-3.5 h-3.5" /> },
                        { key: 'canViewTechnicianReports', label: 'Relatórios de Técnicos', icon: <Users className="w-3.5 h-3.5" /> },
                        { key: 'canViewFinancialReports', label: 'Relatórios Financeiros', icon: <TrendingUp className="w-3.5 h-3.5" /> },
                      ].map((p) => (
                        <label key={p.key} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-200 transition-all cursor-pointer group">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg transition-colors ${userPermissions[p.key as keyof UserPermissions] ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 group-hover:text-slate-600'}`}>
                              {p.icon}
                            </div>
                            <span className="text-sm font-bold text-slate-700">{p.label}</span>
                          </div>
                          <div className="relative flex items-center">
                            <input 
                              type="checkbox" 
                              checked={userPermissions[p.key as keyof UserPermissions]} 
                              onChange={(e) => setUserPermissions({ ...userPermissions, [p.key]: e.target.checked })}
                              className="sr-only peer"
                            />
                            <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:bg-slate-900 transition-colors"></div>
                            <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full peer-checked:translate-x-5 transition-transform"></div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Funções OS</p>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { key: 'canFinalizeOS', label: 'Finalizar OS', icon: <CheckCircle className="w-3.5 h-3.5" /> },
                        { key: 'canApproveOS', label: 'Aprovar OS', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
                      ].map((p) => (
                        <label key={p.key} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-200 transition-all cursor-pointer group">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg transition-colors ${userPermissions[p.key as keyof UserPermissions] ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 group-hover:text-slate-600'}`}>
                              {p.icon}
                            </div>
                            <span className="text-sm font-bold text-slate-700">{p.label}</span>
                          </div>
                          <div className="relative flex items-center">
                            <input 
                              type="checkbox" 
                              checked={userPermissions[p.key as keyof UserPermissions]} 
                              onChange={(e) => setUserPermissions({ ...userPermissions, [p.key]: e.target.checked })}
                              className="sr-only peer"
                            />
                            <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:bg-slate-900 transition-colors"></div>
                            <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full peer-checked:translate-x-5 transition-transform"></div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Gestão</p>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                      ].map((p) => (
                        <label key={p.key} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-200 transition-all cursor-pointer group">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg transition-colors ${userPermissions[p.key as keyof UserPermissions] ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 group-hover:text-slate-600'}`}>
                              {p.icon}
                            </div>
                            <span className="text-sm font-bold text-slate-700">{p.label}</span>
                          </div>
                          <div className="relative flex items-center">
                            <input 
                              type="checkbox" 
                              checked={userPermissions[p.key as keyof UserPermissions]} 
                              onChange={(e) => setUserPermissions({ ...userPermissions, [p.key]: e.target.checked })}
                              className="sr-only peer"
                            />
                            <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:bg-slate-900 transition-colors"></div>
                            <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full peer-checked:translate-x-5 transition-transform"></div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Configurações</p>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { key: 'canManageUsers', label: 'Gerenciar Usuários', icon: <Users className="w-3.5 h-3.5" /> },
                        { key: 'canManageSettings', label: 'Configurações do Sistema', icon: <Settings className="w-3.5 h-3.5" /> },
                      ].map((p) => (
                        <label key={p.key} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-200 transition-all cursor-pointer group">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg transition-colors ${userPermissions[p.key as keyof UserPermissions] ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 group-hover:text-slate-600'}`}>
                              {p.icon}
                            </div>
                            <span className="text-sm font-bold text-slate-700">{p.label}</span>
                          </div>
                          <div className="relative flex items-center">
                            <input 
                              type="checkbox" 
                              checked={userPermissions[p.key as keyof UserPermissions]} 
                              onChange={(e) => setUserPermissions({ ...userPermissions, [p.key]: e.target.checked })}
                              className="sr-only peer"
                            />
                            <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:bg-slate-900 transition-colors"></div>
                            <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full peer-checked:translate-x-5 transition-transform"></div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 flex flex-col gap-3">
                {resetFeedback && (
                  <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-3 ${
                    resetFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'
                  }`}>
                    {resetFeedback.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {resetFeedback.message}
                  </div>
                )}
                <button
                  type="button"
                  disabled={resetLoading}
                  onClick={async () => {
                    setResetLoading(true);
                    setResetFeedback(null);
                    try {
                      const { error } = await supabase.auth.resetPasswordForEmail(editingUser.email, {
                        redirectTo: window.location.origin,
                      });
                      if (error) throw error;
                      setResetFeedback({ type: 'success', message: 'E-mail de redefinição enviado com sucesso!' });
                      setTimeout(() => setResetFeedback(null), 5000);
                    } catch (error: any) {
                      setResetFeedback({ type: 'error', message: 'Erro ao enviar e-mail: ' + error.message });
                    } finally {
                      setResetLoading(false);
                    }
                  }}
                  className="btn-secondary w-full flex items-center justify-center gap-2"
                >
                  {resetLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                  Redefinir Senha do Usuário
                </button>
                <div className="flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setShowUserForm(false)} 
                    className="btn-secondary flex-1"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="btn-primary flex-1"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite User Modal */}
      {showInviteForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Convidar Novo Usuário</h3>
              <button onClick={() => setShowInviteForm(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleInviteUser} className="p-6 space-y-4">
              <div>
                <label className="label-caps">Nome Completo</label>
                <input 
                  placeholder="Ex: João Silva" 
                  value={inviteName} 
                  onChange={e => {
                    setInviteName(e.target.value);
                    if (inviteFormErrors.name) setInviteFormErrors(prev => ({ ...prev, name: '' }));
                  }} 
                  className={`input-field ${inviteFormErrors.name ? 'border-soft-danger ring-1 ring-soft-danger' : ''}`} 
                />
                {inviteFormErrors.name && <p className="text-[9px] font-black text-soft-danger uppercase tracking-widest ml-1">{inviteFormErrors.name}</p>}
              </div>
              <div>
                <label className="label-caps">E-mail</label>
                <input 
                  type="email"
                  placeholder="email@empresa.com" 
                  value={inviteEmail} 
                  onChange={e => {
                    setInviteEmail(e.target.value);
                    if (inviteFormErrors.email) setInviteFormErrors(prev => ({ ...prev, email: '' }));
                  }} 
                  className={`input-field ${inviteFormErrors.email ? 'border-soft-danger ring-1 ring-soft-danger' : ''}`} 
                />
                {inviteFormErrors.email && <p className="text-[9px] font-black text-soft-danger uppercase tracking-widest ml-1">{inviteFormErrors.email}</p>}
              </div>
              <p className="text-xs text-soft-text/40 leading-relaxed">
                Um link de acesso será enviado para o e-mail informado. O usuário poderá definir sua senha ao acessar o link pela primeira vez.
              </p>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowInviteForm(false)} 
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={inviting}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  Enviar Convite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Hidden Warehouse Guide for Image Export */}
      {viewingOS && (
        <div id="warehouse-guide-export" className="fixed -left-[9999px] top-0 bg-white p-12 w-[800px] space-y-8 text-slate-900">
          <div className="bg-slate-900 -m-12 p-12 mb-8 flex justify-between items-center text-white">
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tight">Guia de Solicitação</h1>
              <p className="text-sm font-bold opacity-70 uppercase tracking-widest">Almoxarifado / Suprimentos</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-black">OS: #{viewingOS.id.slice(-8).toUpperCase()}</p>
              <p className="text-sm opacity-70">{format(new Date(), 'dd/MM/yyyy')}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 pt-8">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Técnico Responsável</p>
              <p className="font-bold text-lg">{systemUsers.find(u => u.uid === viewingOS.assignedTechnicianId)?.name || 'Não designado'}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cliente / Local</p>
              <p className="font-bold text-lg">{viewingOS.clientName}</p>
              <p className="text-sm text-slate-500">{viewingOS.address}, {viewingOS.houseNumber || ''}</p>
            </div>
          </div>

          <div className="pt-8">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Materiais Solicitados</p>
            <div className="space-y-3">
              {viewingOS.materials?.map((m, i) => (
                <div key={i} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="font-bold">{m.name}</span>
                  <span className="font-black bg-white px-4 py-1 rounded-xl border border-slate-200">{m.quantity} {m.unit}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-12 grid grid-cols-2 gap-12">
            <div className="text-center space-y-4">
              <div className="h-32 border-b-2 border-slate-200 flex items-center justify-center">
                {viewingOS.preInspectionSignatureTech && (
                  <img src={viewingOS.preInspectionSignatureTech} alt="Assinatura Técnico" className="max-h-24" />
                )}
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assinatura do Técnico</p>
            </div>
            <div className="text-center space-y-4">
              <div className="h-32 border-b-2 border-slate-200 flex items-center justify-center">
                {viewingOS.preInspectionSignatureClient && (
                  <img src={viewingOS.preInspectionSignatureClient} alt="Assinatura Cliente" className="max-h-24" />
                )}
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsável Almoxarifado</p>
            </div>
          </div>
          
          <div className="pt-8 text-center">
            <p className="text-[10px] text-slate-300 italic">Documento gerado digitalmente pelo Sistema de Gestão de OS</p>
          </div>
        </div>
      )}
      {/* Fullscreen Signature Modal */}
      {fullscreenSignature && (
        <div className="fixed inset-0 bg-black z-[100] flex flex-col">
          <div className="p-4 flex items-center justify-between border-b border-white/10 bg-slate-900 text-white">
            <h3 className="text-sm font-black uppercase tracking-widest">{fullscreenSignature.title}</h3>
            <button onClick={() => setFullscreenSignature(null)} className="p-2 hover:bg-white/10 rounded-full transition-all">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 bg-white relative">
            <SignatureCanvas 
              ref={fullscreenSignaturePadRef}
              penColor='black'
              backgroundColor="white"
              canvasProps={{ className: 'w-full h-full cursor-crosshair' }}
            />
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4 w-full max-w-md px-6">
              <button 
                onClick={() => fullscreenSignaturePadRef.current?.clear()} 
                className="flex-1 py-4 bg-slate-100 text-slate-600 font-black uppercase tracking-widest rounded-2xl shadow-lg"
              >
                Limpar
              </button>
              <button 
                onClick={async () => {
                  if (fullscreenSignaturePadRef.current?.isEmpty()) return;
                  setIsSavingSignature(true);
                  try {
                    const canvas = fullscreenSignaturePadRef.current?.getTrimmedCanvas?.() || fullscreenSignaturePadRef.current?.getCanvas?.();
                    const data = canvas?.toDataURL('image/png');
                    const compressedBase64 = await compressImage(data, 800, 400, 0.8);
                    const blob = dataURLtoBlob(compressedBase64);
                    const url = await uploadFile(blob, `os/${viewingOS?.id}/signature_${fullscreenSignature.type}_${Date.now()}.png`);
                    
                    const updates: any = {};
                    if (fullscreenSignature.type === 'pre_client') updates.preInspectionSignatureClient = url;
                    if (fullscreenSignature.type === 'pre_tech') updates.preInspectionSignatureTech = url;
                    if (fullscreenSignature.type === 'finish_client') updates.signature = url;
                    if (fullscreenSignature.type === 'finish_tech') updates.technicianSignature = url;
                    
                    if (viewingOS) {
                      await handleUpdateOSStatus(viewingOS, viewingOS.status, updates);
                    }
                    setFullscreenSignature(null);
                  } finally {
                    setIsSavingSignature(false);
                  }
                }}
                disabled={isSavingSignature}
                className="flex-2 py-4 bg-slate-900 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl flex items-center justify-center gap-2"
              >
                {isSavingSignature ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar Assinatura'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewingDocument && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-slate-100 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
            <div className="p-6 bg-white border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{previewingDocument.name}</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Pré-visualização do Modelo</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    const docToEdit = previewingDocument;
                    setPreviewingDocument(null);
                    openEditDocument(docToEdit);
                  }}
                  className="px-4 py-2 bg-slate-900 text-white text-[10px] font-black rounded-xl hover:bg-slate-800 transition-all uppercase tracking-widest flex items-center gap-2"
                >
                  <Edit2 className="w-3 h-3" /> Editar Modelo
                </button>
                <button 
                  onClick={() => setPreviewingDocument(null)} 
                  className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-12 flex justify-center scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
              <div 
                className="bg-white shadow-2xl relative overflow-hidden"
                style={{ 
                  width: previewingDocument.paperSize === 'A5' ? '148mm' : previewingDocument.paperSize === 'Letter' ? '215.9mm' : '210mm',
                  minHeight: previewingDocument.paperSize === 'A5' ? '210mm' : previewingDocument.paperSize === 'Letter' ? '279.4mm' : '297mm',
                  padding: previewingDocument.margins || '20mm'
                }}
              >
                {previewingDocument.fileUrl ? (
                  <div className="w-full h-full flex flex-col items-center justify-center min-h-[500px]">
                    {previewingDocument.fileUrl.startsWith('data:application/pdf') ? (
                      <iframe 
                        src={previewingDocument.fileUrl} 
                        className="w-full h-[800px] border-none rounded-xl"
                        title={previewingDocument.fileName}
                      />
                    ) : previewingDocument.fileUrl.startsWith('data:image') ? (
                      <img 
                        src={previewingDocument.fileUrl} 
                        alt={previewingDocument.fileName} 
                        className="max-w-full h-auto rounded-xl shadow-sm"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="text-center p-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                        <FileIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <h4 className="text-lg font-black text-slate-900 uppercase tracking-widest">Arquivo: {previewingDocument.fileName}</h4>
                        <p className="text-slate-500 font-medium text-sm mt-2">Este formato de arquivo não pode ser visualizado diretamente no navegador.</p>
                        <a 
                          href={previewingDocument.fileUrl} 
                          download={previewingDocument.fileName}
                          className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all shadow-lg"
                        >
                          <Download className="w-4 h-4" /> Baixar Arquivo
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {previewingDocument.headerImage && (
                  <div 
                    className={`flex justify-center relative ${previewingDocument.headerImageConfig?.isBackground ? 'absolute inset-0 z-0' : 'mb-10 z-10'}`}
                    style={{
                      top: previewingDocument.headerImageConfig?.top ? (previewingDocument.headerImageConfig.top.includes('mm') || previewingDocument.headerImageConfig.top.includes('%') || previewingDocument.headerImageConfig.top.includes('px') ? previewingDocument.headerImageConfig.top : `${previewingDocument.headerImageConfig.top}mm`) : '0',
                      left: previewingDocument.headerImageConfig?.left ? (previewingDocument.headerImageConfig.left.includes('mm') || previewingDocument.headerImageConfig.left.includes('%') || previewingDocument.headerImageConfig.left.includes('px') ? previewingDocument.headerImageConfig.left : `${previewingDocument.headerImageConfig.left}mm`) : '0',
                      width: previewingDocument.headerImageConfig?.isBackground ? '100%' : (previewingDocument.headerImageConfig?.width ? (previewingDocument.headerImageConfig.width.includes('mm') || previewingDocument.headerImageConfig.width.includes('%') || previewingDocument.headerImageConfig.width.includes('px') ? previewingDocument.headerImageConfig.width : `${previewingDocument.headerImageConfig.width}mm`) : '100%'),
                      height: previewingDocument.headerImageConfig?.isBackground ? '100%' : (previewingDocument.headerImageConfig?.height ? (previewingDocument.headerImageConfig.height.includes('mm') || previewingDocument.headerImageConfig.height.includes('%') || previewingDocument.headerImageConfig.height.includes('px') ? previewingDocument.headerImageConfig.height : `${previewingDocument.headerImageConfig.height}mm`) : 'auto'),
                      opacity: previewingDocument.headerImageConfig?.opacity ?? 1,
                      pointerEvents: 'none'
                    }}
                  >
                    <img 
                      src={previewingDocument.headerImage} 
                      alt="Timbrado" 
                      className={`${previewingDocument.headerImageConfig?.isBackground ? 'w-full h-full object-cover' : 'max-h-full object-contain'}`}
                      referrerPolicy="no-referrer" 
                    />
                  </div>
                )}
                
                <div 
                  className={`prose prose-slate max-w-none text-slate-700 font-medium leading-relaxed relative ${previewingDocument.headerImageConfig?.isBackground ? 'z-10' : 'z-20'}`}
                  dangerouslySetInnerHTML={{ __html: previewingDocument.content }} 
                />

                <div className={`mt-20 grid grid-cols-2 gap-12 relative ${previewingDocument.headerImageConfig?.isBackground ? 'z-10' : 'z-20'}`}>
                  {previewingDocument.requireRepresentativeSignature && (
                    <div className="text-center space-y-2">
                      <div className="h-24 border-b border-slate-200 flex items-end justify-center pb-2">
                        <p className="text-[10px] text-slate-300 italic">Assinatura do Representante</p>
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Representante da Construtora</p>
                    </div>
                  )}
                  {previewingDocument.requireClientSignature && (
                    <div className="text-center space-y-2">
                      <div className="h-24 border-b border-slate-200 flex items-end justify-center pb-2">
                        <p className="text-[10px] text-slate-300 italic">Assinatura do Cliente</p>
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assinatura do Cliente</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
            
            <div className="p-6 bg-white border-t border-slate-200 flex justify-center">
              <button 
                onClick={() => setPreviewingDocument(null)}
                className="px-12 py-3 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95"
              >
                Fechar Visualização
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 min-w-[300px] border ${
              notification.type === 'success' ? 'bg-emerald-600 border-emerald-500 text-white' :
              notification.type === 'error' ? 'bg-red-600 border-red-500 text-white' :
              'bg-slate-900 border-slate-800 text-white'
            }`}
          >
            {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : 
             notification.type === 'error' ? <AlertCircle className="w-5 h-5" /> : 
             <Info className="w-5 h-5" />}
            <p className="text-xs font-black uppercase tracking-widest">{notification.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmation && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl border border-slate-100"
            >
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-6">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2 uppercase">Confirmar Ação</h3>
              <p className="text-sm font-medium text-slate-500 leading-relaxed mb-8">
                {confirmation.message}
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmation(null)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    confirmation.onConfirm();
                    setConfirmation(null);
                  }}
                  className="flex-1 py-4 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Floating Action Button */}
      <div className="md:hidden fixed bottom-8 right-8 z-40">
        <button
          onClick={() => {
            if (activeTab === 'os' || activeTab === 'dashboard') {
              resetOSForm();
              setPreInspection(DEFAULT_PRE_INSPECTION);
              setCompletionChecklist(DEFAULT_COMPLETION_CHECKLIST);
              setShowOSForm(true);
            }
          }}
          className="w-14 h-14 bg-soft-accent text-white rounded-2xl shadow-2xl shadow-soft-accent/40 flex items-center justify-center active:scale-95 transition-transform"
        >
          <Plus className="w-8 h-8" />
        </button>
      </div>
    </div>
  );
}
