import { useState, useRef, useEffect } from 'react';
import React from 'react';
import { supabaseService } from '../services/supabaseService';
import { ServiceOrder, MaterialUsed, Material, OSStatus, OSDocument, ChecklistItem } from '../types';
import { compressImage, uploadFile, dataURLtoBlob } from '../lib/image-utils';
import PhotoCarousel from './PhotoCarousel';
import { ArrowLeft, Camera, Plus, Trash2, CheckCircle, Loader2, MapPin, Package, FileText, User, Clock, Video, Eye, Signature, X, Save, Calendar, ClipboardCheck, Check } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { format } from 'date-fns';

interface Props {
  order: ServiceOrder;
  onBack: () => void;
  technicianId: string;
  canFinalizeOS?: boolean;
}

export default function OSFinishForm({ order, onBack, technicianId, canFinalizeOS = true }: Props) {
  const [mediaFiles, setMediaFiles] = useState<{ file: File, type: 'image' | 'video', preview: string }[]>([]);
  const [status, setStatus] = useState<OSStatus>(order.status);
  const [materials, setMaterials] = useState<MaterialUsed[]>(order.materials || []);
  const [preInspection, setPreInspection] = useState<ChecklistItem[]>(order.preInspection || []);
  const [completionChecklist, setCompletionChecklist] = useState<ChecklistItem[]>(order.completionChecklist || []);
  const [observations, setObservations] = useState(order.observations || '');
  const [surveyCompleted, setSurveyCompleted] = useState(order.surveyCompleted || false);
  const [surveyAt, setSurveyAt] = useState(order.surveyAt || '');
  const [loading, setLoading] = useState(false);
  const [isSavingSignature, setIsSavingSignature] = useState(false);
  const [materialsDB, setMaterialsDB] = useState<Material[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [materialQty, setMaterialQty] = useState(1);
  const [requiredDocs, setRequiredDocs] = useState<OSDocument[]>(order.requiredDocuments || []);
  const [signingDoc, setSigningDoc] = useState<OSDocument | null>(null);
  const [showOSDetails, setShowOSDetails] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  const sigCanvas = useRef<SignatureCanvas>(null);
  const docSigCanvas = useRef<SignatureCanvas>(null);

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const mats = await supabaseService.getMaterials();
        setMaterialsDB(mats);
      } catch (error) {
        console.error('Error fetching materials:', error);
      }
    };
    fetchMaterials();
  }, []);

  const handleAddMaterial = () => {
    const mat = materialsDB.find(m => m.id === selectedMaterialId);
    if (mat) {
      setMaterials([...materials, { 
        id: mat.id, 
        name: mat.name, 
        quantity: materialQty, 
        unit: mat.unit,
        price: mat.price,
        cost: mat.cost
      }]);
      setSelectedMaterialId('');
      setMaterialQty(1);
    }
  };

  const removeMaterial = (index: number) => {
    setMaterials(materials.filter((_, i) => i !== index));
  };

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const newMedia = files.map((file: File) => ({
        file,
        type: file.type.startsWith('video/') ? 'video' as const : 'image' as const,
        preview: URL.createObjectURL(file)
      }));
      setMediaFiles(prev => [...prev, ...newMedia]);
    }
  };

  // Cleanup object URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      mediaFiles.forEach(m => URL.revokeObjectURL(m.preview));
    };
  }, [mediaFiles]);

  const removeMedia = (index: number) => {
    const fileToRemove = mediaFiles[index];
    URL.revokeObjectURL(fileToRemove.preview);
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSignDocument = async () => {
    if (docSigCanvas.current && signingDoc) {
      const canvas = docSigCanvas.current.getTrimmedCanvas?.() || docSigCanvas.current.getCanvas?.();
      const signatureBase64 = canvas?.toDataURL('image/png');
      if (!signatureBase64) return;
      
      setIsSavingSignature(true);
      try {
        const compressedBase64 = await compressImage(signatureBase64, 800, 400, 0.8);
        const blob = dataURLtoBlob(compressedBase64);
        const url = await uploadFile(blob, `os/${order.id}/doc_signature_${signingDoc.id}_${Date.now()}.png`);
        
        const updatedDocs = requiredDocs.map(d => 
          d.id === signingDoc.id 
            ? { ...d, signature: url, signedAt: new Date().toISOString() } 
            : d
        );
        setRequiredDocs(updatedDocs);
        setSigningDoc(null);
      } catch (error) {
        console.error('Error saving document signature:', error);
        alert('Erro ao salvar assinatura do documento.');
      } finally {
        setIsSavingSignature(false);
      }
    }
  };

  const handleSaveSurvey = async () => {
    // Mandatory for survey: at least one photo and observations
    if (mediaFiles.length === 0 && (!order.media || order.media.length === 0)) {
      alert('Por favor, adicione pelo menos uma foto para a vistoria.');
      return;
    }
    if (!observations.trim()) {
      alert('Por favor, preencha as observações da vistoria.');
      return;
    }

    setLoading(true);
    try {
      // 1. Upload media
      const mediaUrls = await Promise.all(
        mediaFiles.map(async (m: { file: File, type: 'image' | 'video' }) => {
          let fileToUpload: File | Blob = m.file;
          
          if (m.type === 'image') {
            try {
              const reader = new FileReader();
              const base64Promise = new Promise<string>((resolve) => {
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(m.file);
              });
              const base64 = await base64Promise;
              const compressedBase64 = await compressImage(base64);
              fileToUpload = dataURLtoBlob(compressedBase64);
            } catch (err) {
              console.error('Error compressing image:', err);
            }
          }

          const url = await uploadFile(fileToUpload, `os_media/${order.id}/${Date.now()}_${m.file.name}`);
          return { url, type: m.type };
        })
      );

      const now = new Date().toISOString();
      const updateData: Partial<ServiceOrder> = {
        observations,
        surveyAt: now,
        surveyCompleted: true,
        status: 'Em andamento', // Automatically move to 'Em andamento' after survey
        media: [...(order.media || []), ...mediaUrls],
        updatedAt: now
      };

      await supabaseService.updateServiceOrder(order.id, updateData);
      setSurveyCompleted(true);
      setSurveyAt(now);
      setMediaFiles([]); // Clear local media files after upload
      alert('Vistoria salva com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar vistoria:', error);
      alert('Erro ao salvar vistoria. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setFormError(null);
    // Check for mandatory documents based on status
    if (status === 'Em andamento') {
      const pendingStartDocs = requiredDocs.filter(d => d.type === 'start' && !d.signature);
      if (pendingStartDocs.length > 0) {
        setFormError(`Por favor, solicite a assinatura dos documentos de início: ${pendingStartDocs.map(d => d.name).join(', ')}`);
        return;
      }
    }

    if (status === 'Concluída') {
      if (!canFinalizeOS) {
        setFormError('Você não tem permissão para finalizar Ordens de Serviço.');
        return;
      }
      if (!surveyCompleted) {
        setFormError('Por favor, salve a vistoria antes de finalizar a OS.');
        return;
      }
      
      // Check for "After" photos
      const hasAfterPhotos = (order.afterPhotos && order.afterPhotos.length > 0) || 
                            (mediaFiles.length > 0) || 
                            (order.media && order.media.some(m => m.type === 'image'));
      
      if (!hasAfterPhotos) {
        setFormError('É obrigatório adicionar fotos da conclusão do serviço.');
        return;
      }

      const pendingFinishDocs = requiredDocs.filter(d => d.type === 'finish' && !d.signature);
      if (pendingFinishDocs.length > 0) {
        setFormError(`Por favor, solicite a assinatura dos documentos de conclusão: ${pendingFinishDocs.map(d => d.name).join(', ')}`);
        return;
      }
      if (sigCanvas.current?.isEmpty()) {
        setFormError('A assinatura do cliente é obrigatória para concluir a Ordem de Serviço.');
        return;
      }
    }

    setLoading(true);
    try {
      // 1. Upload media
      const mediaUrls = await Promise.all(
        mediaFiles.map(async (m: { file: File, type: 'image' | 'video' }) => {
          let fileToUpload: File | Blob = m.file;
          
          if (m.type === 'image') {
            try {
              const reader = new FileReader();
              const base64Promise = new Promise<string>((resolve) => {
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(m.file);
              });
              const base64 = await base64Promise;
              const compressedBase64 = await compressImage(base64);
              fileToUpload = dataURLtoBlob(compressedBase64);
            } catch (err) {
              console.error('Error compressing image:', err);
            }
          }

          const url = await uploadFile(fileToUpload, `os_media/${order.id}/${Date.now()}_${m.file.name}`);
          return { url, type: m.type };
        })
      );

      // 2. Get signature (only if concluding)
      let signatureUrl = order.signature;
      if (status === 'Concluída' && sigCanvas.current) {
        const canvas = sigCanvas.current.getTrimmedCanvas?.() || sigCanvas.current.getCanvas?.();
        const signatureBase64 = canvas?.toDataURL('image/png');
        if (signatureBase64) {
          const compressedBase64 = await compressImage(signatureBase64, 800, 400, 0.8);
          const blob = dataURLtoBlob(compressedBase64);
          signatureUrl = await uploadFile(blob, `os/${order.id}/final_signature_${Date.now()}.png`);
        }
      }

      // 3. Update Supabase
      const updateData: Partial<ServiceOrder> = {
        status,
        materials,
        preInspection,
        completionChecklist,
        observations,
        signature: signatureUrl,
        assignedTechnicianId: technicianId,
        media: [...(order.media || []), ...mediaUrls],
        requiredDocuments: requiredDocs,
        updatedAt: new Date().toISOString()
      };

      if (status === 'Concluída' && !order.finishedAt) {
        updateData.finishedAt = new Date().toISOString();
      }

      await supabaseService.updateServiceOrder(order.id, updateData);

      // Create notification for completed OS
      if (status === 'Concluída') {
        await supabaseService.createNotification({
          title: 'OS Concluída',
          message: `A Ordem de Serviço #${order.id} para ${order.clientName} foi concluída.`,
          type: 'os_completed',
          osId: order.id,
          read: false,
          createdAt: new Date().toISOString()
        } as any);
      }

      onBack();
    } catch (error) {
      console.error('Erro ao salvar OS:', error);
      alert('Erro ao salvar OS. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Editar Atendimento</h2>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Atualize o progresso do serviço</p>
              {order.scheduledAt && (
                <span className="flex items-center gap-1 text-[8px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase tracking-widest border border-blue-100">
                  <Calendar className="w-2.5 h-2.5" />
                  Agendado: {format(new Date(order.scheduledAt), 'dd/MM/yy HH:mm')}
                </span>
              )}
              {order.deadline && order.status !== 'Concluída' && new Date() > new Date(order.deadline) && (
                <span className="flex items-center gap-1 text-[8px] font-black text-red-600 bg-red-50 px-1.5 py-0.5 rounded uppercase tracking-widest border border-red-100 animate-pulse">
                  <Clock className="w-2.5 h-2.5" />
                  Atrasada
                </span>
              )}
            </div>
          </div>
        </div>
        <button 
          onClick={() => setShowOSDetails(true)}
          className="flex items-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-2xl transition-all active:scale-95 shadow-lg shadow-slate-200 uppercase text-[10px] tracking-widest"
        >
          <Eye className="w-4 h-4" /> Ver OS
        </button>
      </div>

      <div className="space-y-6">
        {/* Status Selection */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-black mb-6 flex items-center gap-2 text-slate-900 uppercase tracking-widest">
            <Clock className="w-5 h-5 text-slate-400" /> Status do Atendimento
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {(['Aberta', 'Em andamento', 'Concluída'] as OSStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`py-4 rounded-2xl font-black text-[10px] transition-all border-2 uppercase tracking-widest active:scale-95 ${
                  status === s 
                    ? 'bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-200' 
                    : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Required Documents */}
        {requiredDocs.length > 0 && (
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-black mb-6 flex items-center gap-2 text-slate-900 uppercase tracking-widest">
              <FileText className="w-5 h-5 text-slate-400" /> Documentos Obrigatórios
            </h3>
            <div className="space-y-4">
              {requiredDocs.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex-1">
                    <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{doc.name}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-1">
                      {doc.type === 'start' ? 'Início do Serviço' : doc.type === 'finish' ? 'Conclusão' : 'Geral'}
                    </p>
                  </div>
                  {doc.signature ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="w-5 h-5" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Assinado</span>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setSigningDoc(doc)}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-[10px] font-black rounded-xl hover:bg-slate-800 transition-all active:scale-95 uppercase tracking-widest"
                    >
                      <Signature className="w-4 h-4" /> Assinar
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info Summary */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-black text-[10px] uppercase tracking-widest">
            <CheckCircle className="w-4 h-4 text-slate-400" /> Resumo do Serviço
          </div>
          <div className="flex gap-4">
            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center shrink-0 border border-slate-100">
              <User className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-slate-900 font-black uppercase tracking-tight self-center">{order.clientName}</p>
          </div>
          <div className="flex gap-4">
            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center shrink-0 border border-slate-100">
              <MapPin className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-sm text-slate-600 font-medium self-center">{order.address}</p>
          </div>
          <div className="flex gap-4">
            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center shrink-0 border border-slate-100">
              <FileText className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-sm text-slate-600 font-black uppercase tracking-widest self-center">{order.serviceType}</p>
          </div>
        </div>

        {/* Checklists */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8">
          {/* Pre-Inspection Checklist */}
          <div className="space-y-6">
            <h3 className="text-sm font-black flex items-center gap-2 text-slate-900 uppercase tracking-widest">
              <ClipboardCheck className="w-5 h-5 text-slate-400" /> Vistoria Prévia
            </h3>
            <div className="space-y-4">
              {preInspection.map((item, idx) => (
                <div key={item.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div 
                      onClick={() => {
                        const newItems = [...preInspection];
                        newItems[idx].checked = !newItems[idx].checked;
                        setPreInspection(newItems);
                      }}
                      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${item.checked ? 'bg-emerald-500 border-emerald-500 shadow-lg shadow-emerald-100' : 'bg-white border-slate-200 group-hover:border-slate-400'}`}
                    >
                      {item.checked && <Check className="w-4 h-4 text-white" />}
                    </div>
                    <span className={`text-sm font-bold transition-all ${item.checked ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                      {item.label}
                    </span>
                  </label>
                  <div className="flex items-center gap-2 pl-9">
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
              {preInspection.length === 0 && (
                <p className="text-[10px] font-black text-slate-400 uppercase text-center py-4 border border-dashed border-slate-200 rounded-2xl">Nenhum item de vistoria definido</p>
              )}
            </div>
          </div>

          {/* Completion Checklist */}
          {(status === 'Em andamento' || status === 'Concluída') && (
            <div className="space-y-6 pt-8 border-t border-slate-100">
              <h3 className="text-sm font-black flex items-center gap-2 text-slate-900 uppercase tracking-widest">
                <CheckCircle className="w-5 h-5 text-slate-400" /> Checklist de Conclusão
              </h3>
              <div className="space-y-4">
                {completionChecklist.map((item, idx) => (
                  <div key={item.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div 
                        onClick={() => {
                          const newItems = [...completionChecklist];
                          newItems[idx].checked = !newItems[idx].checked;
                          setCompletionChecklist(newItems);
                        }}
                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${item.checked ? 'bg-emerald-500 border-emerald-500 shadow-lg shadow-emerald-100' : 'bg-white border-slate-200 group-hover:border-slate-400'}`}
                      >
                        {item.checked && <Check className="w-4 h-4 text-white" />}
                      </div>
                      <span className={`text-sm font-bold transition-all ${item.checked ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                        {item.label}
                      </span>
                    </label>
                    <div className="flex items-center gap-2 pl-9">
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
                {completionChecklist.length === 0 && (
                  <p className="text-[10px] font-black text-slate-400 uppercase text-center py-4 border border-dashed border-slate-200 rounded-2xl">Nenhum item de conclusão definido</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Photos & Videos Upload */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-black mb-6 flex items-center gap-2 text-slate-900 uppercase tracking-widest">
            <Camera className="w-5 h-5 text-slate-400" /> Fotos e Vídeos
          </h3>
          
          {/* Existing Media */}
          {order.media && order.media.filter(m => m.type === 'image').length > 0 && (
            <div className="mb-8">
              <PhotoCarousel 
                photos={order.media.filter(m => m.type === 'image').map(m => m.url)} 
                title="Fotos Existentes" 
              />
            </div>
          )}

          {/* Videos (if any) */}
          {order.media && order.media.filter(m => m.type === 'video').length > 0 && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              {order.media.filter(m => m.type === 'video').map((m, i) => (
                <div key={i} className="aspect-square bg-slate-50 rounded-2xl overflow-hidden relative group border border-slate-100">
                  <div className="w-full h-full flex items-center justify-center bg-slate-800">
                    <Video className="w-8 h-8 text-white opacity-50" />
                  </div>
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <a href={m.url} target="_blank" rel="noopener noreferrer" className="text-white text-[10px] font-black uppercase tracking-widest">Ver Vídeo</a>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            {mediaFiles.map((m, i) => (
              <div key={i} className="aspect-square bg-slate-50 rounded-2xl overflow-hidden relative border border-slate-100 group">
                {m.type === 'image' ? (
                  <img 
                    src={m.preview} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800">
                    <Video className="w-8 h-8 text-white/50" />
                    <span className="text-[8px] font-black text-white/70 uppercase mt-2 truncate px-2 w-full text-center tracking-widest">{m.file.name}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button 
                    onClick={() => removeMedia(i)}
                    className="bg-red-500 text-white p-2 rounded-xl shadow-lg active:scale-95 hover:bg-red-600 transition-colors"
                    title="Remover"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            <label className="aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 hover:border-slate-900 transition-all group">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                <Plus className="w-6 h-6 text-slate-400 group-hover:text-slate-900" />
              </div>
              <span className="text-[10px] font-black text-slate-400 group-hover:text-slate-900 uppercase tracking-widest mt-3">Adicionar</span>
              <input type="file" accept="image/*,video/*" multiple onChange={handleMediaChange} className="hidden" />
            </label>
          </div>
        </div>

        {/* Materials */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-black mb-6 flex items-center gap-2 text-slate-900 uppercase tracking-widest">
            <Package className="w-5 h-5 text-slate-400" /> Materiais Utilizados
          </h3>
          <div className="flex gap-3 mb-6">
            <select
              value={selectedMaterialId}
              onChange={(e) => setSelectedMaterialId(e.target.value)}
              className="flex-1 px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-slate-900 text-sm font-medium appearance-none"
            >
              <option value="">Selecionar material...</option>
              {materialsDB.map(m => (
                <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              value={materialQty}
              onChange={(e) => setMaterialQty(parseInt(e.target.value))}
              className="w-24 px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-slate-900 text-sm font-black"
            />
            <button
              onClick={handleAddMaterial}
              className="bg-slate-900 text-white p-4 rounded-2xl hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
          <div className="space-y-3">
            {materials.map((m, i) => (
              <div key={i} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-sm font-black text-slate-900 uppercase tracking-tight">{m.name}</span>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-100 uppercase tracking-widest">{m.quantity} {m.unit}</span>
                  <button onClick={() => removeMaterial(i)} className="text-slate-300 hover:text-red-500 transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Observations */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-black flex items-center gap-2 text-slate-900 uppercase tracking-widest">
              <FileText className="w-5 h-5 text-slate-400" /> Observações
            </h3>
            {surveyCompleted && (
              <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100 uppercase tracking-widest">
                Vistoria Realizada em {format(new Date(surveyAt), 'dd/MM/yy HH:mm')}
              </span>
            )}
          </div>
          <textarea
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            rows={4}
            placeholder="Relate detalhes do serviço executado..."
            className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-slate-900 resize-none font-medium text-slate-700"
          />
        </div>

        {/* Signature */}
        {status === 'Concluída' && (
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-black mb-6 flex items-center gap-2 text-slate-900 uppercase tracking-widest">
              <CheckCircle className="w-5 h-5 text-slate-400" /> Assinatura do Cliente
            </h3>
            <div className={`border ${formError && formError.includes('assinatura') && sigCanvas.current?.isEmpty() ? 'border-red-500 ring-2 ring-red-500' : 'border-slate-100'} rounded-2xl overflow-hidden bg-white transition-all`}>
              <SignatureCanvas 
                ref={sigCanvas}
                penColor="black"
                backgroundColor="white"
                canvasProps={{ className: 'w-full h-48 cursor-crosshair' }}
              />
            </div>
            <button 
              onClick={() => sigCanvas.current?.clear()}
              className="mt-4 text-[10px] font-black text-slate-400 hover:text-slate-900 uppercase tracking-widest transition-colors"
            >
              Limpar Assinatura
            </button>
          </div>
        )}

        {/* Submit */}
        <div className="flex flex-col gap-3">
          {formError && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 animate-shake">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                <X className="w-4 h-4 text-red-600" />
              </div>
              <p className="text-xs font-bold text-red-600 uppercase tracking-widest leading-relaxed">
                {formError}
              </p>
            </div>
          )}
          <button
            onClick={handleSaveSurvey}
            disabled={loading}
            className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-3xl shadow-xl shadow-emerald-100 transition-all flex items-center justify-center gap-3 disabled:opacity-70 active:scale-95 uppercase text-xs tracking-widest"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
            {surveyCompleted ? 'Atualizar Vistoria' : 'Salvar Vistoria'}
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full py-5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-3xl shadow-xl shadow-slate-200 transition-all flex items-center justify-center gap-3 disabled:opacity-70 active:scale-95 uppercase text-xs tracking-widest"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : status === 'Concluída' ? 'Finalizar e Salvar OS' : 'Salvar Alterações'}
          </button>
        </div>
      </div>

      {/* OS Details Modal */}
      {showOSDetails && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-stone-200 flex items-center justify-between">
              <h3 className="text-xl font-bold">Detalhes da Ordem de Serviço</h3>
              <button onClick={() => setShowOSDetails(false)} className="text-stone-400 hover:text-stone-600"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-stone-400 uppercase mb-1">Cliente</label>
                  <p className="font-bold text-stone-900">{order.clientName}</p>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-stone-400 uppercase mb-1">Telefone</label>
                  <p className="font-bold text-stone-900">{order.clientPhone}</p>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-stone-400 uppercase mb-1">Endereço</label>
                <p className="text-stone-700">{order.address}</p>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-stone-400 uppercase mb-1">Tipo de Serviço</label>
                  <p className="font-bold text-stone-900 uppercase text-xs">{order.serviceType}</p>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-stone-400 uppercase mb-1">Status Atual</label>
                  <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded text-[10px] font-black uppercase">{order.status}</span>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-stone-400 uppercase mb-1">Descrição do Problema</label>
                <p className="text-stone-700 bg-stone-50 p-4 rounded-xl border border-stone-100">{order.description}</p>
              </div>
              {order.observations && (
                <div>
                  <label className="block text-[10px] font-black text-stone-400 uppercase mb-1">Observações do Técnico</label>
                  <p className="text-stone-700 bg-amber-50 p-4 rounded-xl border border-amber-100">{order.observations}</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-stone-200">
              <button onClick={() => setShowOSDetails(false)} className="w-full py-3 bg-stone-900 text-white font-bold rounded-xl">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* Document Signing Modal */}
      {signingDoc && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-slate-100 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
            <div className="p-6 bg-white border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Assinar Documento</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{signingDoc.name}</p>
              </div>
              <button 
                onClick={() => setSigningDoc(null)} 
                className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-12 flex justify-center scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
              <div 
                className="bg-white shadow-2xl relative overflow-hidden"
                style={{ 
                  width: signingDoc.paperSize === 'A5' ? '148mm' : signingDoc.paperSize === 'Letter' ? '215.9mm' : '210mm',
                  minHeight: signingDoc.paperSize === 'A5' ? '210mm' : signingDoc.paperSize === 'Letter' ? '279.4mm' : '297mm',
                  padding: signingDoc.margins || '20mm'
                }}
              >
                {signingDoc.headerImage && (
                  <div 
                    className={`flex justify-center relative ${signingDoc.headerImageConfig?.isBackground ? 'absolute inset-0 z-0' : 'mb-10 z-10'}`}
                    style={{
                      top: signingDoc.headerImageConfig?.top ? (signingDoc.headerImageConfig.top.includes('mm') || signingDoc.headerImageConfig.top.includes('%') || signingDoc.headerImageConfig.top.includes('px') ? signingDoc.headerImageConfig.top : `${signingDoc.headerImageConfig.top}mm`) : '0',
                      left: signingDoc.headerImageConfig?.left ? (signingDoc.headerImageConfig.left.includes('mm') || signingDoc.headerImageConfig.left.includes('%') || signingDoc.headerImageConfig.left.includes('px') ? signingDoc.headerImageConfig.left : `${signingDoc.headerImageConfig.left}mm`) : '0',
                      width: signingDoc.headerImageConfig?.isBackground ? '100%' : (signingDoc.headerImageConfig?.width ? (signingDoc.headerImageConfig.width.includes('mm') || signingDoc.headerImageConfig.width.includes('%') || signingDoc.headerImageConfig.width.includes('px') ? signingDoc.headerImageConfig.width : `${signingDoc.headerImageConfig.width}mm`) : '100%'),
                      height: signingDoc.headerImageConfig?.isBackground ? '100%' : (signingDoc.headerImageConfig?.height ? (signingDoc.headerImageConfig.height.includes('mm') || signingDoc.headerImageConfig.height.includes('%') || signingDoc.headerImageConfig.height.includes('px') ? signingDoc.headerImageConfig.height : `${signingDoc.headerImageConfig.height}mm`) : 'auto'),
                      opacity: signingDoc.headerImageConfig?.opacity ?? 1,
                      pointerEvents: 'none'
                    }}
                  >
                    <img 
                      src={signingDoc.headerImage} 
                      alt="Timbrado" 
                      className={`${signingDoc.headerImageConfig?.isBackground ? 'w-full h-full object-cover' : 'max-h-full object-contain'}`}
                      referrerPolicy="no-referrer" 
                    />
                  </div>
                )}
                
                <div 
                  className={`prose prose-slate max-w-none text-slate-700 font-medium leading-relaxed relative ${signingDoc.headerImageConfig?.isBackground ? 'z-10' : 'z-20'}`}
                  dangerouslySetInnerHTML={{ __html: signingDoc.content }} 
                />

                <div className={`mt-20 space-y-12 relative ${signingDoc.headerImageConfig?.isBackground ? 'z-10' : 'z-20'}`}>
                  {signingDoc.requireClientSignature && (
                    <div className="max-w-md mx-auto">
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 text-center tracking-widest">Assinatura do Cliente</label>
                      <div className="border-2 border-slate-200 rounded-2xl bg-white overflow-hidden shadow-inner">
                        <SignatureCanvas
                          ref={docSigCanvas}
                          penColor="#0f172a"
                          backgroundColor="white"
                          canvasProps={{ className: 'w-full h-48 cursor-crosshair' }}
                        />
                      </div>
                      <button 
                        type="button"
                        onClick={() => docSigCanvas.current?.clear()}
                        className="mt-2 text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest block mx-auto"
                      >
                        Limpar Assinatura
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="p-6 bg-white border-t border-slate-200 flex gap-4">
              <button 
                onClick={() => setSigningDoc(null)} 
                className="flex-1 py-4 border border-slate-200 text-slate-600 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSignDocument} 
                className="flex-1 py-4 bg-emerald-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95"
              >
                Confirmar Assinatura
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
