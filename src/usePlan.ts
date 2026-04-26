// src/hooks/usePlan.ts
// Gerencia o plano do cliente e permissões de white-label

export type PlanTier = 'starter' | 'pro' | 'enterprise';

export interface PlanConfig {
  tier: PlanTier;
  name: string;
  priceMonthly: number;
  maxUsers: number;
  canCustomizeBrand: boolean;       // Pro+: logo, cores, nome
  showObraxSidebar: boolean;        // Starter/Pro: assinatura na sidebar
  showObraxReports: boolean;        // Starter/Pro: assinatura nos laudos/PDFs
  canRemoveObraxBranding: boolean;  // Enterprise: remove tudo
  hasAdvancedReports: boolean;      // Pro+
  hasApi: boolean;                  // Enterprise
  hasPrioritySupport: boolean;      // Enterprise
}

export const PLANS: Record<PlanTier, PlanConfig> = {
  starter: {
    tier: 'starter',
    name: 'Starter',
    priceMonthly: 197,
    maxUsers: 3,
    canCustomizeBrand: false,
    showObraxSidebar: true,
    showObraxReports: true,
    canRemoveObraxBranding: false,
    hasAdvancedReports: false,
    hasApi: false,
    hasPrioritySupport: false,
  },
  pro: {
    tier: 'pro',
    name: 'Pro',
    priceMonthly: 397,
    maxUsers: 10,
    canCustomizeBrand: true,
    showObraxSidebar: true,
    showObraxReports: true,
    canRemoveObraxBranding: false,
    hasAdvancedReports: true,
    hasApi: false,
    hasPrioritySupport: false,
  },
  enterprise: {
    tier: 'enterprise',
    name: 'Enterprise',
    priceMonthly: 797,
    maxUsers: Infinity,
    canCustomizeBrand: true,
    showObraxSidebar: false,        // White-label: oculto por padrão
    showObraxReports: false,        // White-label: oculto por padrão
    canRemoveObraxBranding: true,
    hasAdvancedReports: true,
    hasApi: true,
    hasPrioritySupport: true,
  },
};

// Retorna o plano ativo a partir das configurações do sistema (Supabase)
// systemSettings.plan deve ser 'starter' | 'pro' | 'enterprise'
export function getPlanConfig(tier?: string): PlanConfig {
  const key = (tier ?? 'starter') as PlanTier;
  return PLANS[key] ?? PLANS.starter;
}

// Verifica se a assinatura OBRAX deve aparecer na sidebar
export function shouldShowObraxSidebar(tier?: string): boolean {
  const plan = getPlanConfig(tier);
  // Enterprise pode ter removido via configuração — respeitamos o flag do plano
  return plan.showObraxSidebar;
}

// Verifica se a assinatura OBRAX deve aparecer nos laudos/PDFs
export function shouldShowObraxReport(tier?: string): boolean {
  const plan = getPlanConfig(tier);
  return plan.showObraxReports;
}
