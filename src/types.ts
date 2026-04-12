export type UserRole = 'admin' | 'technician' | 'user';

export interface UserPermissions {
  canCreateOS: boolean;
  canEditOS: boolean;
  canDeleteOS: boolean;
  canSeeAllOS: boolean;
  canManageUsers: boolean;
  canCreateMaterials: boolean;
  canEditMaterials: boolean;
  canDeleteMaterials: boolean;
  canCreateDocuments: boolean;
  canEditDocuments: boolean;
  canDeleteDocuments: boolean;
  canManageSettings: boolean;
  canViewReports: boolean;
  canViewOSReports: boolean;
  canViewMaterialReports: boolean;
  canViewTechnicianReports: boolean;
  canViewFinancialReports: boolean;
  canFinalizeOS: boolean;
  canApproveOS: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  permissions?: UserPermissions;
  createdAt: string;
}

export type OSStatus = 'Aberta' | 'Vistoria' | 'Em andamento' | 'Concluída' | 'Cancelada';
export type ServiceType = 
  | 'elétrica' 
  | 'hidráulica' 
  | 'pintura' 
  | 'manutenção geral'
  | 'estrutural'
  | 'pisos e revestimentos'
  | 'forro e cobertura'
  | 'louças e metais'
  | 'impermeabilização'
  | 'esquadrias';

export interface Material {
  id: string;
  name: string;
  unit: string;
  price?: number;
  cost?: number;
  createdAt: string;
}

export interface MaterialUsed {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  price?: number;
  cost?: number;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  content: string;
  type: 'start' | 'finish' | 'general' | 'os_layout';
  createdAt: string;
  requireClientSignature?: boolean;
  requireRepresentativeSignature?: boolean;
  paperSize?: 'A4' | 'A5' | 'Letter';
  headerImage?: string;
  headerImageConfig?: {
    width?: string;
    height?: string;
    top?: string;
    left?: string;
    isBackground?: boolean;
    opacity?: number;
  };
  margins?: string;
  fileUrl?: string;
  fileName?: string;
}

export interface OSDocument {
  id: string;
  name: string;
  content: string;
  type: 'start' | 'finish' | 'general' | 'os_layout';
  signedAt?: string;
  signature?: string;
  signedBy?: string;
  representativeSignature?: string;
  representativeSignedAt?: string;
  requireClientSignature?: boolean;
  requireRepresentativeSignature?: boolean;
  paperSize?: 'A4' | 'A5' | 'Letter';
  headerImage?: string;
  headerImageConfig?: {
    width?: string;
    height?: string;
    top?: string;
    left?: string;
    isBackground?: boolean;
    opacity?: number;
  };
  margins?: string;
  fileUrl?: string;
  fileName?: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  observation?: string;
}

export type RootCause = 'specification' | 'design' | 'execution';

export interface PENGCrossing {
  nbr: string;
  description: string;
  normalizationAction: string;
}

export interface ServiceOrder {
  id: string;
  clientName: string;
  clientPhone: string;
  address: string;
  houseNumber: string;
  serviceType: ServiceType;
  description: string;
  status: OSStatus;
  isRework?: boolean;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  finishedAt?: string;
  assignedTechnicianId?: string;
  technicianName?: string;
  photos?: string[];
  beforePhotos?: string[];
  afterPhotos?: string[];
  attachments?: { name: string; url: string }[];
  media?: { url: string; type: 'image' | 'video' }[];
  materials?: MaterialUsed[];
  observations?: string;
  signature?: string;
  representativeSignature?: string;
  representativeSignedAt?: string;
  isSignedByClient?: boolean;
  preInspectionSignatureClient?: string;
  preInspectionSignatureTech?: string;
  isPreInspectionSigned?: boolean;
  isWarehouseRequested?: boolean;
  requiredDocuments?: OSDocument[];
  preInspection?: ChecklistItem[];
  completionChecklist?: ChecklistItem[];
  surveyAt?: string;
  surveyCompleted?: boolean;
  habiteSeDate?: string;
  isUnderWarranty?: boolean;
  warrantyYears?: number;
  isApproved?: boolean;
  approvedAt?: string;
  approvedBy?: string;
  deadline?: string;
  scheduledAt?: string;
  tower?: string;
  floor?: string;
  unit?: string;
  block?: string;
  cost?: number;
  rootCause?: RootCause;
  criticalFailureIndex?: number; // 0-100
  normalizationApplied?: boolean;
  pengCrossings?: PENGCrossing[];
  estimatedNormalizationSaving?: number;
  technicalRecommendation?: string;
  criticalityLevel?: 'low' | 'medium' | 'high';
  auditorName?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'new_os' | 'os_completed' | 'os_delayed' | 'os_updated' | 'deadline_approaching';
  osId: string;
  userId?: string;
  read: boolean;
  createdAt: string;
}

export interface ThemeConfig {
  mode: 'light' | 'dark';
  primaryColor: string;
  surfaceColor: string;
  backgroundColor: string;
  chartPalette: string[];
}

export interface SystemSettings {
  logo?: string;
  theme: ThemeConfig;
  companyName?: string;
}
