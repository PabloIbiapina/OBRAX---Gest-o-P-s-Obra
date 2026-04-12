import { supabase } from '../supabase';
import { ServiceOrder, Material, AppNotification, UserProfile, SystemSettings, DocumentTemplate } from '../types';

// Helper to convert snake_case to camelCase for ServiceOrder
const mapServiceOrder = (data: any): ServiceOrder => ({
  id: data.id,
  clientName: data.client_name,
  clientPhone: data.client_phone,
  address: data.address,
  houseNumber: data.house_number,
  tower: data.tower,
  floor: data.floor,
  unit: data.unit,
  block: data.block,
  serviceType: data.service_type,
  description: data.description,
  status: data.status,
  isRework: data.is_rework,
  assignedTechnicianId: data.assigned_technician_id,
  startedAt: data.started_at,
  finishedAt: data.finished_at,
  surveyAt: data.survey_at,
  surveyCompleted: data.survey_completed,
  media: data.media,
  materials: data.materials,
  preInspection: data.pre_inspection,
  completionChecklist: data.completion_checklist,
  requiredDocuments: data.required_documents,
  observations: data.observations,
  signature: data.signature,
  isSignedByClient: data.is_signed_by_client,
  isUnderWarranty: data.is_under_warranty,
  warrantyYears: data.warranty_years,
  isApproved: data.is_approved,
  approvedAt: data.approved_at,
  approvedBy: data.approved_by,
  deadline: data.deadline,
  scheduledAt: data.scheduled_at,
  cost: data.cost,
  rootCause: data.root_cause,
  criticalFailureIndex: data.critical_failure_index,
  normalizationApplied: data.normalization_applied,
  pengCrossings: data.peng_crossings,
  estimatedNormalizationSaving: data.estimated_normalization_saving,
  technicalRecommendation: data.technical_recommendation,
  criticalityLevel: data.criticality_level,
  auditorName: data.auditor_name,
  createdAt: data.created_at,
  updatedAt: data.updated_at,
});

// Helper to convert camelCase to snake_case for ServiceOrder
const unmapServiceOrder = (order: Partial<ServiceOrder>): any => {
  const data: any = {};
  if (order.clientName !== undefined) data.client_name = order.clientName;
  if (order.clientPhone !== undefined) data.client_phone = order.clientPhone;
  if (order.address !== undefined) data.address = order.address;
  if (order.houseNumber !== undefined) data.house_number = order.houseNumber;
  if (order.tower !== undefined) data.tower = order.tower;
  if (order.floor !== undefined) data.floor = order.floor;
  if (order.unit !== undefined) data.unit = order.unit;
  if (order.block !== undefined) data.block = order.block;
  if (order.serviceType !== undefined) data.service_type = order.serviceType;
  if (order.description !== undefined) data.description = order.description;
  if (order.status !== undefined) data.status = order.status;
  if (order.isRework !== undefined) data.is_rework = order.isRework;
  if (order.assignedTechnicianId !== undefined) data.assigned_technician_id = order.assignedTechnicianId;
  if (order.startedAt !== undefined) data.started_at = order.startedAt;
  if (order.finishedAt !== undefined) data.finished_at = order.finishedAt;
  if (order.surveyAt !== undefined) data.survey_at = order.surveyAt;
  if (order.surveyCompleted !== undefined) data.survey_completed = order.surveyCompleted;
  if (order.media !== undefined) data.media = order.media;
  if (order.materials !== undefined) data.materials = order.materials;
  if (order.preInspection !== undefined) data.pre_inspection = order.preInspection;
  if (order.completionChecklist !== undefined) data.completion_checklist = order.completionChecklist;
  if (order.requiredDocuments !== undefined) data.required_documents = order.requiredDocuments;
  if (order.observations !== undefined) data.observations = order.observations;
  if (order.signature !== undefined) data.signature = order.signature;
  if (order.isSignedByClient !== undefined) data.is_signed_by_client = order.isSignedByClient;
  if (order.isUnderWarranty !== undefined) data.is_under_warranty = order.isUnderWarranty;
  if (order.warrantyYears !== undefined) data.warranty_years = order.warrantyYears;
  if (order.isApproved !== undefined) data.is_approved = order.isApproved;
  if (order.approvedAt !== undefined) data.approved_at = order.approvedAt;
  if (order.approvedBy !== undefined) data.approved_by = order.approvedBy;
  if (order.deadline !== undefined) data.deadline = order.deadline;
  if (order.scheduledAt !== undefined) data.scheduled_at = order.scheduledAt;
  if (order.cost !== undefined) data.cost = order.cost;
  if (order.rootCause !== undefined) data.root_cause = order.rootCause;
  if (order.criticalFailureIndex !== undefined) data.critical_failure_index = order.criticalFailureIndex;
  if (order.normalizationApplied !== undefined) data.normalization_applied = order.normalizationApplied;
  if (order.pengCrossings !== undefined) data.peng_crossings = order.pengCrossings;
  if (order.estimatedNormalizationSaving !== undefined) data.estimated_normalization_saving = order.estimatedNormalizationSaving;
  if (order.technicalRecommendation !== undefined) data.technical_recommendation = order.technicalRecommendation;
  if (order.criticalityLevel !== undefined) data.criticality_level = order.criticalityLevel;
  if (order.auditorName !== undefined) data.auditor_name = order.auditorName;
  if (order.updatedAt !== undefined) data.updated_at = order.updatedAt;
  return data;
};

export const supabaseService = {
  // Profiles
  async getProfile(uid: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .single();
    if (error) throw error;
    return {
      uid: data.id,
      email: data.email,
      name: data.name,
      role: data.role,
      permissions: data.permissions,
      createdAt: data.created_at
    } as UserProfile;
  },

  async getAllProfiles() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    return data.map(d => ({
      uid: d.id,
      email: d.email,
      name: d.name,
      role: d.role,
      permissions: d.permissions,
      createdAt: d.created_at
    })) as UserProfile[];
  },

  async updateProfile(uid: string, updates: Partial<UserProfile>) {
    const data: any = {};
    if (updates.name !== undefined) data.name = updates.name;
    if (updates.role !== undefined) data.role = updates.role;
    if (updates.permissions !== undefined) data.permissions = updates.permissions;

    const { error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', uid);
    if (error) throw error;
  },

  // Service Orders
  async getServiceOrders() {
    const { data, error } = await supabase
      .from('service_orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(mapServiceOrder);
  },

  async createServiceOrder(order: Partial<ServiceOrder>) {
    const mapped = unmapServiceOrder(order);
    const { data, error } = await supabase
      .from('service_orders')
      .insert([mapped])
      .select()
      .single();
    if (error) throw error;
    return mapServiceOrder(data);
  },

  async updateServiceOrder(id: string, updates: Partial<ServiceOrder>) {
    const mapped = unmapServiceOrder(updates);
    const { data, error } = await supabase
      .from('service_orders')
      .update(mapped)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapServiceOrder(data);
  },

  async deleteServiceOrder(id: string) {
    const { error } = await supabase
      .from('service_orders')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // Materials
  async getMaterials() {
    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    return data.map(d => ({
      id: d.id,
      name: d.name,
      unit: d.unit,
      price: d.price,
      cost: d.cost,
      createdAt: d.created_at
    })) as Material[];
  },

  async createMaterial(material: Partial<Material>) {
    const { data, error } = await supabase
      .from('materials')
      .insert([{
        name: material.name,
        unit: material.unit,
        price: material.price,
        cost: material.cost
      }])
      .select()
      .single();
    if (error) throw error;
    return {
      id: data.id,
      name: data.name,
      unit: data.unit,
      price: data.price,
      cost: data.cost,
      createdAt: data.created_at
    } as Material;
  },

  async updateMaterial(id: string, material: Partial<Material>) {
    const { error } = await supabase
      .from('materials')
      .update({
        name: material.name,
        unit: material.unit,
        price: material.price,
        cost: material.cost
      })
      .eq('id', id);
    if (error) throw error;
  },

  async deleteMaterial(id: string) {
    const { error } = await supabase
      .from('materials')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // Document Templates
  async getDocumentTemplates() {
    const { data, error } = await supabase
      .from('document_templates')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    return data.map(d => ({
      id: d.id,
      name: d.name,
      content: d.content,
      type: d.type,
      requireClientSignature: d.require_client_signature,
      requireRepresentativeSignature: d.require_representative_signature,
      paperSize: d.paper_size,
      headerImage: d.header_image,
      headerImageConfig: d.header_image_config,
      margins: d.margins,
      fileUrl: d.file_url,
      fileName: d.file_name,
      createdAt: d.created_at
    })) as DocumentTemplate[];
  },

  async createDocumentTemplate(template: Partial<DocumentTemplate>) {
    const { data, error } = await supabase
      .from('document_templates')
      .insert([{
        name: template.name,
        content: template.content,
        type: template.type,
        require_client_signature: template.requireClientSignature,
        require_representative_signature: template.requireRepresentativeSignature,
        paper_size: template.paperSize,
        header_image: template.headerImage,
        header_image_config: template.headerImageConfig,
        margins: template.margins,
        file_url: template.fileUrl,
        file_name: template.fileName
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateDocumentTemplate(id: string, template: Partial<DocumentTemplate>) {
    const { error } = await supabase
      .from('document_templates')
      .update({
        name: template.name,
        content: template.content,
        type: template.type,
        require_client_signature: template.requireClientSignature,
        require_representative_signature: template.requireRepresentativeSignature,
        paper_size: template.paperSize,
        header_image: template.headerImage,
        header_image_config: template.headerImageConfig,
        margins: template.margins,
        file_url: template.fileUrl,
        file_name: template.fileName
      })
      .eq('id', id);
    if (error) throw error;
  },

  async deleteDocumentTemplate(id: string) {
    const { error } = await supabase
      .from('document_templates')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // Notifications
  async getNotifications(userId?: string) {
    let query = supabase.from('notifications').select('*').order('created_at', { ascending: false });
    if (userId) {
      query = query.eq('user_id', userId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data.map(d => ({
      id: d.id,
      title: d.title,
      message: d.message,
      type: d.type,
      osId: d.os_id,
      userId: d.user_id,
      read: d.read,
      createdAt: d.created_at
    })) as AppNotification[];
  },

  async createNotification(notification: Partial<AppNotification>) {
    const { error } = await supabase
      .from('notifications')
      .insert([{
        title: notification.title,
        message: notification.message,
        type: notification.type,
        os_id: notification.osId,
        user_id: notification.userId,
        read: false
      }]);
    if (error) throw error;
  },

  async markNotificationAsRead(id: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);
    if (error) throw error;
  },

  async updateNotification(id: string, updates: Partial<AppNotification>) {
    const data: any = {};
    if (updates.read !== undefined) data.read = updates.read;
    if (updates.title !== undefined) data.title = updates.title;
    if (updates.message !== undefined) data.message = updates.message;

    const { error } = await supabase
      .from('notifications')
      .update(data)
      .eq('id', id);
    if (error) throw error;
  },

  async deleteNotification(id: string) {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async clearAllNotifications(userId: string) {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId);
    if (error) throw error;
  },

  // Settings
  async getSettings() {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('id', 'system')
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data.data as SystemSettings;
  },

  async updateSettings(settings: SystemSettings) {
    const { error } = await supabase
      .from('settings')
      .upsert({ id: 'system', data: settings, updated_at: new Date().toISOString() });
    if (error) throw error;
  }
};
