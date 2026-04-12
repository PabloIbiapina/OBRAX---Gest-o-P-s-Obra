import { ServiceType } from './types';

export const WARRANTY_PERIODS: Record<ServiceType, number> = {
  'estrutural': 5,
  'impermeabilização': 5,
  'hidráulica': 3,
  'elétrica': 3,
  'forro e cobertura': 5,
  'pisos e revestimentos': 2,
  'esquadrias': 2,
  'louças e metais': 1,
  'pintura': 1,
  'manutenção geral': 1,
};
