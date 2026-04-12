import { useState, useEffect, useMemo, useRef } from 'react';
import { supabaseService } from '../services/supabaseService';
import { supabase } from '../supabase';
import { ServiceOrder, UserProfile, OSStatus, OSDocument, AppNotification } from '../types';
import { MapPin, Phone, ExternalLink, CheckCircle, Clock, AlertCircle, ChevronRight, Search, TrendingUp, Award, Timer, Users, HardHat, Camera, Video, Plus, Trash2, X, Eye, FileText, PenTool, Check, Loader2, Calendar, ClipboardCheck, Play, Bell } from 'lucide-react';
import { format, startOfDay, startOfWeek, startOfMonth, startOfYear, isAfter, differenceInMinutes, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { WARRANTY_PERIODS } from '../constants';
import { compressImage, uploadFile, dataURLtoBlob } from '../lib/image-utils';
import OSFinishForm from './OSFinishForm';
import PhotoCarousel from './PhotoCarousel';
import SignatureCanvas from 'react-signature-canvas';

interface Props {
  profile: UserProfile;
}

type Tab = 'my-os' | 'performance';

export default function TechnicianDashboard({ profile }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('my-os');
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [allOrders, setAllOrders] = useState<ServiceOrder[]>([]);
  const [systemUsers, setSystemUsers] = useState<UserProfile[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const [viewingOrder, setViewingOrder] = useState<ServiceOrder | null>(null);
  const [signingDoc, setSigningDoc] = useState<{ order: ServiceOrder, doc: OSDocument } | null>(null);
  const [isSavingSignature, setIsSavingSignature] = useState(false);
  const signaturePadRef = useRef<SignatureCanvas>(null);
  const repSignaturePadRef = useRef<SignatureCanvas>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const initialOrderIds = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (orders.length > 0) {
      if (isFirstLoad.current) {
        initialOrderIds.current = new Set(orders.map(o => o.id));
        isFirstLoad.current = false;
        return;
      }

      const newOrders = orders.filter(o => !initialOrderIds.current.has(o.id));
      if (newOrders.length > 0) {
        newOrders.forEach(order => {
          alert(`🔔 NOVA ORDEM DE SERVIÇO!\n\nCliente: ${order.clientName}\nTipo: ${order.serviceType}\nEndereço: ${order.address}`);
          initialOrderIds.current.add(order.id);
        });
      }
    }
  }, [orders]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch Service Orders
        const allOrdersData = await supabaseService.getServiceOrders();
        setAllOrders(allOrdersData);

        // Filter for technician
        let filtered;
        if (profile.role === 'admin' || profile.permissions?.canSeeAllOS) {
          filtered = allOrdersData.filter(o => o.status === 'Aberta' || o.status === 'Em andamento');
        } else {
          filtered = allOrdersData.filter(o => 
            (o.status === 'Aberta' || o.status === 'Em andamento') && 
            o.assignedTechnicianId === profile.uid
          );
        }
        setOrders(filtered);

        // Fetch Users
        const users = await supabaseService.getAllProfiles();
        setSystemUsers(users);

        // Fetch Notifications
        const notifs = await supabaseService.getNotifications(profile.uid);
        setNotifications(notifs);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Real-time subscription for Service Orders
    const osSubscription = supabase
      .channel('service_orders_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_orders' }, () => {
        fetchData();
      })
      .subscribe();

    // Real-time subscription for Notifications
    const notifSubscription = supabase
      .channel('notifications_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.uid}` }, (payload) => {
        const newNotif = payload.new as any;
        if (Notification.permission === 'granted') {
          new Notification(newNotif.title, { 
            body: newNotif.message,
            icon: '/favicon.ico'
          });
        }
        fetchData();
      })
      .subscribe();

    return () => {
      osSubscription.unsubscribe();
      notifSubscription.unsubscribe();
    };
  }, [profile.role, profile.uid, profile.permissions]);

  const reports = useMemo(() => {
    const techStats: Record<string, { name: string, count: number, totalTime: number, totalExecutionTime: number, executionCount: number }> = {};
    let totalDuration = 0;
    let finishedCount = 0;

    allOrders.forEach(o => {
      if (o.status === 'Concluída' && o.finishedAt && o.assignedTechnicianId) {
        const created = parseISO(o.createdAt);
        const finished = parseISO(o.finishedAt);
        const duration = differenceInMinutes(finished, created);
        totalDuration += duration;
        finishedCount++;

        const tech = systemUsers.find(u => u.uid === o.assignedTechnicianId);
        const techName = tech?.name || 'Desconhecido';
        if (!techStats[o.assignedTechnicianId]) {
          techStats[o.assignedTechnicianId] = { name: techName, count: 0, totalTime: 0, totalExecutionTime: 0, executionCount: 0 };
        }
        techStats[o.assignedTechnicianId].count++;
        techStats[o.assignedTechnicianId].totalTime += duration;

        if (o.startedAt) {
          const started = parseISO(o.startedAt);
          const execDuration = differenceInMinutes(finished, started);
          techStats[o.assignedTechnicianId].totalExecutionTime += execDuration;
          techStats[o.assignedTechnicianId].executionCount++;
        }
      }
    });

    const avgDuration = finishedCount > 0 ? Math.round(totalDuration / finishedCount) : 0;
    const techRanking = Object.values(techStats).sort((a, b) => b.count - a.count);

    return { avgDuration, techRanking };
  }, [allOrders, systemUsers]);

  const handleSignDocument = async () => {
    if (!signingDoc) return;
    
    const clientSigRequired = signingDoc.doc.requireClientSignature ?? true;
    const repSigRequired = signingDoc.doc.requireRepresentativeSignature ?? false;

    if (clientSigRequired && (!signaturePadRef.current || signaturePadRef.current.isEmpty())) {
      alert('Por favor, forneça a assinatura do cliente.');
      return;
    }

    if (repSigRequired && (!repSignaturePadRef.current || repSignaturePadRef.current.isEmpty())) {
      alert('Por favor, forneça a assinatura do representante da construtora.');
      return;
    }

    setIsSavingSignature(true);
    try {
      let clientSignatureUrl = signingDoc.doc.signature;
      let repSignatureUrl = signingDoc.doc.representativeSignature;

      if (clientSigRequired && signaturePadRef.current) {
        const signatureBase64 = signaturePadRef.current.getTrimmedCanvas().toDataURL('image/png');
        const compressedBase64 = await compressImage(signatureBase64, 800, 400, 0.8);
        const blob = dataURLtoBlob(compressedBase64);
        clientSignatureUrl = await uploadFile(blob, `os/${signingDoc.order.id}/doc_signature_client_${signingDoc.doc.id}_${Date.now()}.png`);
      }

      if (repSigRequired && repSignaturePadRef.current) {
        const signatureBase64 = repSignaturePadRef.current.getTrimmedCanvas().toDataURL('image/png');
        const compressedBase64 = await compressImage(signatureBase64, 800, 400, 0.8);
        const blob = dataURLtoBlob(compressedBase64);
        repSignatureUrl = await uploadFile(blob, `os/${signingDoc.order.id}/doc_signature_rep_${signingDoc.doc.id}_${Date.now()}.png`);
      }
      
      const updatedDocs = (signingDoc.order.requiredDocuments || []).map(d => {
        if (d.id === signingDoc.doc.id) {
          return {
            ...d,
            signedAt: clientSigRequired ? new Date().toISOString() : d.signedAt,
            signature: clientSignatureUrl ?? d.signature,
            signedBy: clientSigRequired ? signingDoc.order.clientName : d.signedBy,
            representativeSignature: repSignatureUrl ?? d.representativeSignature,
            representativeSignedAt: repSigRequired ? new Date().toISOString() : d.representativeSignedAt
          };
        }
        return d;
      });

      await supabaseService.updateServiceOrder(signingDoc.order.id, {
        requiredDocuments: updatedDocs,
        updatedAt: new Date().toISOString()
      });

      setSigningDoc(null);
      // Update viewingOrder if it's the same
      if (viewingOrder?.id === signingDoc.order.id) {
        setViewingOrder({ ...viewingOrder, requiredDocuments: updatedDocs });
      }
      alert('Documento assinado com sucesso!');
    } catch (error) {
      console.error('Erro ao assinar documento:', error);
      alert('Erro ao salvar assinatura.');
    } finally {
      setIsSavingSignature(false);
    }
  };

  const handleGoToAddress = async (order: ServiceOrder) => {
    if (order.status === 'Aberta') {
      try {
        await supabaseService.updateServiceOrder(order.id, {
          status: 'Vistoria',
          updatedAt: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error updating status to Vistoria:', error);
      }
    }
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address)}`, '_blank');
  };

  const handleUpdateOSStatus = async (order: ServiceOrder, newStatus: OSStatus) => {
    // Validation: Cannot go back from 'Concluída'
    if (order.status === 'Concluída' && newStatus !== 'Concluída') {
      alert('Não é possível alterar o status de uma ordem de serviço já concluída.');
      return;
    }
    
    // Validation: Cannot go from 'Em andamento' back to 'Aberta'
    if (order.status === 'Em andamento' && newStatus === 'Aberta') {
      if (!confirm('Tem certeza que deseja voltar o status para "Aberta"? Isso removerá a data de início.')) {
        return;
      }
    }

    try {
      const updates: Partial<ServiceOrder> = { 
        status: newStatus, 
        updatedAt: new Date().toISOString() 
      };
      
      if (newStatus === 'Em andamento' && !order.startedAt) {
        updates.startedAt = new Date().toISOString();
      } else if (newStatus === 'Concluída' && !order.finishedAt) {
        updates.finishedAt = new Date().toISOString();
      } else if (newStatus === 'Aberta') {
        updates.startedAt = undefined;
      }
      
      await supabaseService.updateServiceOrder(order.id, updates);
      setViewingOrder({ ...order, ...updates });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      alert('Erro ao atualizar status.');
    }
  };

  const handleStartOrder = async (orderId: string) => {
    try {
      await supabaseService.updateServiceOrder(orderId, {
        status: 'Em andamento',
        assignedTechnicianId: profile.uid,
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erro ao iniciar OS:', error);
    }
  };

  const filteredOrders = orders.filter(o => 
    o.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (selectedOrder) {
    return (
      <OSFinishForm 
        order={selectedOrder} 
        onBack={() => setSelectedOrder(null)} 
        technicianId={profile.uid}
        canFinalizeOS={profile.role === 'admin' || profile.permissions?.canFinalizeOS}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 bg-white p-1 rounded-2xl border border-slate-200 w-fit shadow-sm overflow-x-auto max-w-full">
        <button
          onClick={() => setActiveTab('my-os')}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
            activeTab === 'my-os' 
              ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' 
              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
          }`}
        >
          Minhas OS
        </button>
        <button
          onClick={() => setActiveTab('performance')}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
            activeTab === 'performance' 
              ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' 
              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
          }`}
        >
          Desempenho
        </button>
      </div>

      {activeTab === 'my-os' ? (
        <div className="space-y-6">
          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-bold text-stone-900">Ordens de Serviço</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
              <input
                type="text"
                placeholder="Buscar por cliente ou endereço..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-stone-200 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredOrders.map((order) => (
              <div 
                key={order.id}
                className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden hover:border-emerald-200 transition-colors"
              >
                <div className="p-5">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                          order.status === 'Aberta' ? 'bg-amber-50 text-amber-700 border-amber-100' : 
                          order.status === 'Vistoria' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                          order.status === 'Em andamento' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                          order.status === 'Concluída' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                          'bg-slate-50 text-slate-700 border-slate-100'
                        }`}>
                          {order.status === 'Aberta' ? <AlertCircle className="w-3 h-3" /> : 
                           order.status === 'Vistoria' ? <MapPin className="w-3 h-3" /> :
                           <Clock className="w-3 h-3" />}
                          {order.status}
                        </span>
                        {order.status === 'Em andamento' && order.startedAt && (
                          <span className="text-[10px] font-black text-yellow-600 bg-yellow-50 px-2 py-1 rounded-lg flex items-center gap-1.5 border border-yellow-100">
                            <Timer className="w-3 h-3" />
                            {differenceInMinutes(new Date(), parseISO(order.startedAt))} MIN
                          </span>
                        )}
                        {order.habiteSeDate && (
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-tighter border ${
                            order.isUnderWarranty ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'
                          }`}>
                            {order.isUnderWarranty ? <CheckCircle className="w-2.5 h-2.5" /> : <AlertCircle className="w-2.5 h-2.5" />}
                            {order.isUnderWarranty ? 'Procedente' : 'Improcedente'}
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-black text-slate-900 mt-3 uppercase tracking-tight">{order.clientName}</h3>
                    </div>
                    <span className="text-[10px] font-black text-slate-400 bg-slate-50 border border-slate-100 px-3 py-1 rounded-lg uppercase tracking-widest">
                      {order.serviceType}
                    </span>
                  </div>

                  <div className="space-y-4 mb-8">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center shrink-0 border border-slate-100">
                        <MapPin className="w-5 h-5 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-600 font-medium leading-relaxed">{order.address}</p>
                        <button 
                          onClick={() => handleGoToAddress(order)}
                          className="text-slate-900 text-[10px] font-black flex items-center gap-1.5 mt-2 hover:underline uppercase tracking-widest"
                        >
                          <ExternalLink className="w-3 h-3" /> Abrir no Google Maps
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center shrink-0 border border-slate-100">
                        <Phone className="w-5 h-5 text-slate-400" />
                      </div>
                      <a href={`tel:${order.clientPhone}`} className="text-sm text-slate-600 font-black hover:text-slate-900 uppercase tracking-tight">
                        {order.clientPhone}
                      </a>
                    </div>
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Problema Relatado</p>
                      <p className="text-sm text-slate-700 font-medium leading-relaxed">{order.description}</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setViewingOrder(order)}
                      className="px-5 py-4 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl transition-all flex items-center justify-center active:scale-95 border border-slate-100 shadow-sm"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    {order.status === 'Aberta' ? (
                      <div className="flex-1 flex gap-2">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-900 font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 uppercase text-xs tracking-widest shadow-sm active:scale-95"
                        >
                          <ClipboardCheck className="w-5 h-5" /> Vistoria
                        </button>
                        <button
                          onClick={() => handleStartOrder(order.id)}
                          className="flex-[2] bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 uppercase text-xs tracking-widest shadow-xl shadow-slate-200 active:scale-95"
                        >
                          <Play className="w-5 h-5" /> Iniciar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 uppercase text-xs tracking-widest shadow-xl shadow-slate-200 active:scale-95"
                      >
                        <CheckCircle className="w-5 h-5" /> Editar / Finalizar
                      </button>
                    )}
                  </div>
                </div>
                <div className="bg-stone-50 px-5 py-3 border-t border-stone-100 flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-stone-400 font-black uppercase tracking-widest">Criada em {format(new Date(order.createdAt), 'dd/MM/yy HH:mm', { locale: ptBR })}</span>
                    {order.scheduledAt && (
                      <span className="text-[10px] text-blue-600 font-black uppercase tracking-widest flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Agendado: {format(parseISO(order.scheduledAt), 'dd/MM/yy HH:mm')}
                      </span>
                    )}
                    {order.deadline && order.status !== 'Concluída' && isAfter(new Date(), parseISO(order.deadline)) && (
                      <span className="text-[10px] text-red-600 font-black uppercase tracking-widest flex items-center gap-1 animate-pulse">
                        <Clock className="w-3 h-3" /> Atrasada
                      </span>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-300" />
                </div>
              </div>
            ))}

            {filteredOrders.length === 0 && (
              <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-stone-300">
                <AlertCircle className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                <p className="text-stone-500 font-medium">Nenhuma ordem de serviço pendente.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                Ranking de Eficiência (Equipe)
              </h3>
              <div className="space-y-3">
                {reports.techRanking.map((t, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-stone-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-xs font-bold border border-stone-200">{i+1}</span>
                      <span className="font-bold text-stone-700">{t.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-[10px] font-black text-stone-400 uppercase">Tempo Médio</p>
                        <p className="text-xs font-bold text-stone-600">{Math.round(t.totalTime / t.count)} min</p>
                      </div>
                      {t.executionCount > 0 && (
                        <div className="text-right">
                          <p className="text-[10px] font-black text-emerald-400 uppercase">Execução</p>
                          <p className="text-xs font-bold text-emerald-600">{Math.round(t.totalExecutionTime / t.executionCount)} min</p>
                        </div>
                      )}
                      <span className="bg-emerald-600 text-white px-3 py-1 rounded-lg text-xs font-bold">{t.count} OS</span>
                    </div>
                  </div>
                ))}
                {reports.techRanking.length === 0 && <p className="text-stone-400 text-center py-4 italic">Sem dados de finalização</p>}
              </div>
            </div>

            <div className="bg-emerald-600 p-6 rounded-2xl shadow-lg shadow-emerald-100 text-white flex items-center justify-between h-fit">
              <div>
                <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest mb-1">Tempo Médio da Equipe</p>
                <p className="text-3xl font-black">{reports.avgDuration} <span className="text-lg font-normal">minutos</span></p>
              </div>
              <Timer className="w-12 h-12 text-emerald-400 opacity-50" />
            </div>
          </div>
        </div>
      )}
      {/* OS Details Modal */}
      {viewingOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-stone-200 flex items-center justify-between">
              <h3 className="text-xl font-bold">Detalhes da Ordem de Serviço</h3>
              <button onClick={() => setViewingOrder(null)} className="text-stone-400 hover:text-stone-600"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-stone-400 uppercase mb-1">Cliente</label>
                  <p className="font-bold text-stone-900">{viewingOrder.clientName}</p>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-stone-400 uppercase mb-1">Telefone</label>
                  <p className="font-bold text-stone-900">{viewingOrder.clientPhone}</p>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-stone-400 uppercase mb-1">Endereço</label>
                <p className="text-stone-700">{viewingOrder.address}</p>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-stone-400 uppercase mb-1">Tipo de Serviço</label>
                  <p className="font-bold text-stone-900 uppercase text-xs">{viewingOrder.serviceType}</p>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-stone-400 uppercase mb-1">Prazo de Finalização</label>
                  {viewingOrder.deadline ? (
                    <p className={`font-bold text-xs uppercase ${isAfter(new Date(), parseISO(viewingOrder.deadline)) && viewingOrder.status !== 'Concluída' ? 'text-red-600' : 'text-stone-900'}`}>
                      {format(parseISO(viewingOrder.deadline), 'dd/MM/yyyy')}
                      {isAfter(new Date(), parseISO(viewingOrder.deadline)) && viewingOrder.status !== 'Concluída' && ' (ATRASADA)'}
                    </p>
                  ) : (
                    <p className="text-xs text-stone-400 italic">Não definido</p>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-black text-stone-400 uppercase mb-1">Agendamento</label>
                  {viewingOrder.scheduledAt ? (
                    <p className="font-bold text-xs uppercase text-blue-600 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(parseISO(viewingOrder.scheduledAt), 'dd/MM/yyyy HH:mm')}
                    </p>
                  ) : (
                    <p className="text-xs text-stone-400 italic">Não agendado</p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-stone-400 uppercase mb-1">Status Atual</label>
                      <div className="flex flex-col gap-2">
                        <select 
                          value={viewingOrder.status}
                          onChange={(e) => handleUpdateOSStatus(viewingOrder, e.target.value as OSStatus)}
                          className={`px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-widest border outline-none focus:ring-2 focus:ring-slate-900 transition-all ${
                            viewingOrder.status === 'Aberta' ? 'bg-amber-50 border-amber-200 text-amber-600' :
                            viewingOrder.status === 'Vistoria' ? 'bg-purple-50 border-purple-200 text-purple-600' :
                            viewingOrder.status === 'Em andamento' ? 'bg-blue-50 border-blue-200 text-blue-600' :
                            viewingOrder.status === 'Concluída' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' :
                            'bg-slate-50 border-slate-200 text-slate-600'
                          }`}
                        >
                          <option value="Aberta">Aberta</option>
                          <option value="Vistoria">Vistoria</option>
                          <option value="Em andamento">Em andamento</option>
                          <option value="Concluída">Concluída</option>
                        </select>
                      </div>
                </div>
              
              {viewingOrder.habiteSeDate && (
                <div className={`p-4 rounded-2xl border flex items-center gap-3 transition-all ${viewingOrder.isUnderWarranty ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                  <div className={`p-2 rounded-xl ${viewingOrder.isUnderWarranty ? 'bg-emerald-100' : 'bg-red-100'}`}>
                    {viewingOrder.isUnderWarranty ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-black uppercase tracking-tight">
                        Verificação de Procedência: {viewingOrder.isUnderWarranty ? 'Procedente' : 'Improcedente'}
                      </p>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${viewingOrder.isUnderWarranty ? 'bg-emerald-100 border-emerald-200' : 'bg-red-100 border-red-200'}`}>
                        {viewingOrder.isUnderWarranty ? 'Dentro da Garantia' : 'Garantia Expirada'}
                      </span>
                    </div>
                    <p className="text-[10px] font-bold opacity-70 uppercase tracking-tighter mt-1">
                      Habite-se: {format(parseISO(viewingOrder.habiteSeDate), 'dd/MM/yyyy')} • 
                      Garantia de {viewingOrder.warrantyYears || WARRANTY_PERIODS[viewingOrder.serviceType] || 0} anos
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-stone-400 uppercase mb-1">Descrição do Problema</label>
                <p className="text-stone-700 bg-stone-50 p-4 rounded-xl border border-stone-100">{viewingOrder.description}</p>
              </div>

              {/* Photos Carousel */}
              {(viewingOrder.beforePhotos?.length || 0) > 0 && (
                <PhotoCarousel photos={viewingOrder.beforePhotos || []} title="Fotos Antes" />
              )}
              {(viewingOrder.afterPhotos?.length || 0) > 0 && (
                <PhotoCarousel photos={viewingOrder.afterPhotos || []} title="Fotos Depois" />
              )}
              {(viewingOrder.media?.length || 0) > 0 && (
                <PhotoCarousel 
                  photos={viewingOrder.media?.filter(m => m.type === 'image').map(m => m.url) || []} 
                  title="Mídia do Atendimento" 
                />
              )}

              {viewingOrder.materials && viewingOrder.materials.length > 0 && (
                <div>
                  <label className="block text-[10px] font-black text-stone-400 uppercase mb-1">Materiais Planejados</label>
                  <div className="space-y-2 mt-2">
                    {viewingOrder.materials.map((m, i) => (
                      <div key={i} className="flex justify-between text-sm p-2 bg-stone-50 rounded-lg">
                        <span className="font-medium">{m.name}</span>
                        <span className="font-bold text-emerald-600">{m.quantity} {m.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Checklists Section */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4" /> Checklists de Verificação
                </label>
                <div className="space-y-6">
                  {/* Pre-Inspection Checklist */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase">Vistoria Prévia</p>
                    <div className="space-y-2">
                      {viewingOrder.preInspection?.map((item) => (
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
                  {(viewingOrder.status === 'Em andamento' || viewingOrder.status === 'Concluída') && (
                    <div className="space-y-3 pt-4 border-t border-slate-200">
                      <p className="text-[10px] font-black text-slate-400 uppercase">Checklist de Conclusão</p>
                      <div className="space-y-2">
                        {viewingOrder.completionChecklist?.map((item) => (
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

              {viewingOrder.requiredDocuments && viewingOrder.requiredDocuments.length > 0 && (
                <div>
                  <label className="block text-[10px] font-black text-stone-400 uppercase mb-1">Documentos para Assinatura</label>
                  <div className="space-y-3 mt-2">
                    {viewingOrder.requiredDocuments.map((d) => (
                      <div key={d.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl ${d.signature ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{d.name}</p>
                            <div className="flex flex-col gap-1 mt-1">
                              {d.signature && (
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                                  <Check className="w-3 h-3" /> Cliente: {format(parseISO(d.signedAt!), 'dd/MM/yy HH:mm')}
                                </p>
                              )}
                              {d.representativeSignature && (
                                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1">
                                  <Check className="w-3 h-3" /> Construtora: {format(parseISO(d.representativeSignedAt!), 'dd/MM/yy HH:mm')}
                                </p>
                              )}
                              {!d.signature && !d.representativeSignature && (
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                  Aguardando assinatura
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        {((!d.signature && (d.requireClientSignature ?? true)) || (!d.representativeSignature && (d.requireRepresentativeSignature ?? false))) ? (
                          <button 
                            onClick={() => setSigningDoc({ order: viewingOrder, doc: d })}
                            className="p-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                          >
                            <PenTool className="w-4 h-4" />
                          </button>
                        ) : (
                          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                            <Check className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-stone-200">
              <button onClick={() => setViewingOrder(null)} className="w-full py-3 bg-stone-900 text-white font-bold rounded-xl">Fechar</button>
            </div>
          </div>
        </div>
      )}
      {/* Document Signing Modal */}
      {signingDoc && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900">{signingDoc.doc.name}</h3>
              <button onClick={() => setSigningDoc(null)} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-8">
              <div 
                className="prose prose-slate max-w-none text-slate-700 font-medium leading-relaxed bg-white border border-slate-100 shadow-sm rounded-xl relative overflow-hidden"
                style={{ padding: signingDoc.doc.margins || '2rem' }}
              >
                {signingDoc.doc.headerImage && (
                  <div 
                    className={`flex justify-center relative ${signingDoc.doc.headerImageConfig?.isBackground ? 'absolute inset-0 z-0' : 'mb-8 z-10'}`}
                    style={{
                      top: signingDoc.doc.headerImageConfig?.top ? (signingDoc.doc.headerImageConfig.top.includes('mm') || signingDoc.doc.headerImageConfig.top.includes('%') || signingDoc.doc.headerImageConfig.top.includes('px') ? signingDoc.doc.headerImageConfig.top : `${signingDoc.doc.headerImageConfig.top}mm`) : '0',
                      left: signingDoc.doc.headerImageConfig?.left ? (signingDoc.doc.headerImageConfig.left.includes('mm') || signingDoc.doc.headerImageConfig.left.includes('%') || signingDoc.doc.headerImageConfig.left.includes('px') ? signingDoc.doc.headerImageConfig.left : `${signingDoc.doc.headerImageConfig.left}mm`) : '0',
                      width: signingDoc.doc.headerImageConfig?.isBackground ? '100%' : (signingDoc.doc.headerImageConfig?.width ? (signingDoc.doc.headerImageConfig.width.includes('mm') || signingDoc.doc.headerImageConfig.width.includes('%') || signingDoc.doc.headerImageConfig.width.includes('px') ? signingDoc.doc.headerImageConfig.width : `${signingDoc.doc.headerImageConfig.width}mm`) : '100%'),
                      height: signingDoc.doc.headerImageConfig?.isBackground ? '100%' : (signingDoc.doc.headerImageConfig?.height ? (signingDoc.doc.headerImageConfig.height.includes('mm') || signingDoc.doc.headerImageConfig.height.includes('%') || signingDoc.doc.headerImageConfig.height.includes('px') ? signingDoc.doc.headerImageConfig.height : `${signingDoc.doc.headerImageConfig.height}mm`) : 'auto'),
                      opacity: signingDoc.doc.headerImageConfig?.opacity ?? 1,
                      pointerEvents: 'none'
                    }}
                  >
                    <img 
                      src={signingDoc.doc.headerImage} 
                      alt="Timbrado" 
                      className={`${signingDoc.doc.headerImageConfig?.isBackground ? 'w-full h-full object-cover' : 'max-h-full object-contain'}`}
                      referrerPolicy="no-referrer" 
                    />
                  </div>
                )}
                <div className={`relative ${signingDoc.doc.headerImageConfig?.isBackground ? 'z-10' : 'z-20'}`} dangerouslySetInnerHTML={{ __html: signingDoc.doc.content }} />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-slate-100">
                {(signingDoc.doc.requireRepresentativeSignature ?? false) && (
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Representante da Construtora</label>
                    <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-2">
                      <SignatureCanvas 
                        ref={repSignaturePadRef}
                        penColor="#0f172a"
                        backgroundColor="white"
                        canvasProps={{
                          className: "w-full h-40 cursor-crosshair"
                        }}
                      />
                    </div>
                    <div className="flex justify-center">
                      <button 
                        type="button"
                        onClick={() => repSignaturePadRef.current?.clear()}
                        className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                      >
                        Limpar Assinatura
                      </button>
                    </div>
                  </div>
                )}

                {(signingDoc.doc.requireClientSignature ?? true) && (
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Assinatura do Cliente</label>
                    <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-2">
                      <SignatureCanvas 
                        ref={signaturePadRef}
                        penColor="#0f172a"
                        backgroundColor="white"
                        canvasProps={{
                          className: "w-full h-40 cursor-crosshair"
                        }}
                      />
                    </div>
                    <div className="flex justify-center">
                      <button 
                        type="button"
                        onClick={() => signaturePadRef.current?.clear()}
                        className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                      >
                        Limpar Assinatura
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button 
                type="button"
                onClick={() => setSigningDoc(null)} 
                className="flex-1 py-4 border border-slate-200 text-slate-600 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={handleSignDocument}
                disabled={isSavingSignature}
                className="flex-1 py-4 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSavingSignature ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                Confirmar Assinatura
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
