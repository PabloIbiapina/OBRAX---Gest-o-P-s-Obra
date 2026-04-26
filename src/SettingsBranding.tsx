// src/components/SettingsBranding.tsx
// Seção de "Identidade & Plano" dentro do SettingsModal existente
// Mostra opções conforme o plano do cliente

import { getPlanConfig, PlanTier, PLANS } from '../hooks/usePlan';

interface SettingsBrandingProps {
  currentPlan: PlanTier;
  companyName: string;
  companySlogan: string;
  primaryColor: string;
  logoUrl?: string;
  showObraxSidebar: boolean;
  showObraxReports: boolean;
  onChangePrimaryColor: (color: string) => void;
  onChangeCompanyName: (name: string) => void;
  onChangeCompanySlogan: (slogan: string) => void;
  onChangeShowObraxSidebar: (show: boolean) => void;
  onChangeShowObraxReports: (show: boolean) => void;
  onLogoUpload: (file: File) => void;
  onSave: () => void;
}

// Paleta de cores predefinidas
const PRESET_COLORS = [
  '#2563eb', // Azul (padrão OBRAX)
  '#7c3aed', // Roxo
  '#0891b2', // Ciano
  '#059669', // Verde
  '#d97706', // Âmbar
  '#dc2626', // Vermelho
  '#e8501a', // Laranja construção
  '#0f1e38', // Azul-marinho
];

export default function SettingsBranding({
  currentPlan,
  companyName,
  companySlogan,
  primaryColor,
  logoUrl,
  showObraxSidebar,
  showObraxReports,
  onChangePrimaryColor,
  onChangeCompanyName,
  onChangeCompanySlogan,
  onChangeShowObraxSidebar,
  onChangeShowObraxReports,
  onLogoUpload,
  onSave,
}: SettingsBrandingProps) {
  const plan = getPlanConfig(currentPlan);

  return (
    <div className="settings-branding">

      {/* ── Plano atual ─────────────────────────────────────────────────── */}
      <div className="sb-section">
        <div className="sb-section__header">
          <h3>Plano atual</h3>
          <span className={`plan-badge plan-badge--${currentPlan}`}>{plan.name}</span>
        </div>
        <p className="sb-section__desc">
          Seu plano define quais recursos de personalização estão disponíveis.
        </p>
        <div className="plan-features-grid">
          {Object.values(PLANS).map((p) => (
            <div
              key={p.tier}
              className={`plan-card ${p.tier === currentPlan ? 'plan-card--active' : ''}`}
            >
              <div className="plan-card__name">{p.name}</div>
              <div className="plan-card__price">R$ {p.priceMonthly}/mês</div>
              <ul className="plan-card__features">
                <li className={p.canCustomizeBrand ? 'yes' : 'no'}>Personalização de marca</li>
                <li className={p.canRemoveObraxBranding ? 'yes' : 'no'}>White-label completo</li>
                <li className={p.hasAdvancedReports ? 'yes' : 'no'}>Relatórios avançados</li>
                <li className={p.hasApi ? 'yes' : 'no'}>API e integrações</li>
              </ul>
              {p.tier !== currentPlan && (
                <button className="plan-card__upgrade">
                  {p.priceMonthly > plan.priceMonthly ? '↑ Fazer upgrade' : '↓ Ver plano'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Identidade da empresa ────────────────────────────────────────── */}
      <div className="sb-section">
        <div className="sb-section__header">
          <h3>Identidade da empresa</h3>
          {!plan.canCustomizeBrand && (
            <span className="lock-badge">🔒 Disponível no Pro</span>
          )}
        </div>
        <p className="sb-section__desc">
          Nome, slogan e logotipo exibidos no sistema e nos relatórios gerados.
        </p>
        <div className={`sb-fields ${!plan.canCustomizeBrand ? 'sb-fields--locked' : ''}`}>
          <div className="sb-field-row">
            <div className="sb-field">
              <label>Nome da empresa</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => onChangeCompanyName(e.target.value)}
                disabled={!plan.canCustomizeBrand}
                placeholder="Ex: Construtora Horizonte"
              />
            </div>
            <div className="sb-field">
              <label>Slogan / subtítulo</label>
              <input
                type="text"
                value={companySlogan}
                onChange={(e) => onChangeCompanySlogan(e.target.value)}
                disabled={!plan.canCustomizeBrand}
                placeholder="Ex: Construindo o futuro"
              />
            </div>
          </div>

          {/* Upload de logo */}
          <div className="sb-field">
            <label>Logotipo</label>
            {logoUrl ? (
              <div className="logo-preview">
                <img src={logoUrl} alt="Logotipo" />
                <button
                  className="logo-preview__remove"
                  onClick={() => onLogoUpload(null as any)}
                  disabled={!plan.canCustomizeBrand}
                >
                  Remover
                </button>
              </div>
            ) : (
              <label
                className={`logo-upload ${!plan.canCustomizeBrand ? 'logo-upload--disabled' : ''}`}
              >
                <input
                  type="file"
                  accept="image/png,image/svg+xml,image/jpeg"
                  style={{ display: 'none' }}
                  disabled={!plan.canCustomizeBrand}
                  onChange={(e) => e.target.files?.[0] && onLogoUpload(e.target.files[0])}
                />
                <span>↑ Fazer upload do logotipo</span>
                <small>SVG ou PNG transparente recomendado</small>
              </label>
            )}
          </div>
        </div>
      </div>

      {/* ── Cor da marca ─────────────────────────────────────────────────── */}
      <div className="sb-section">
        <div className="sb-section__header">
          <h3>Cor da marca</h3>
          {!plan.canCustomizeBrand && (
            <span className="lock-badge">🔒 Disponível no Pro</span>
          )}
        </div>
        <p className="sb-section__desc">
          Cor principal do sistema — sidebar, botões e destaques.
        </p>
        <div className={`color-picker ${!plan.canCustomizeBrand ? 'color-picker--locked' : ''}`}>
          <div className="color-presets">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                className={`color-swatch ${primaryColor === color ? 'color-swatch--selected' : ''}`}
                style={{ background: color }}
                onClick={() => plan.canCustomizeBrand && onChangePrimaryColor(color)}
                disabled={!plan.canCustomizeBrand}
                title={color}
              />
            ))}
          </div>
          <div className="color-custom">
            <label>Cor personalizada:</label>
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => onChangePrimaryColor(e.target.value)}
              disabled={!plan.canCustomizeBrand}
            />
            <code>{primaryColor}</code>
          </div>
        </div>
      </div>

      {/* ── Assinatura OBRAX (white-label) ───────────────────────────────── */}
      <div className="sb-section">
        <div className="sb-section__header">
          <h3>Assinatura OBRAX</h3>
          {!plan.canRemoveObraxBranding && (
            <span className="lock-badge">🔒 White-label no Enterprise</span>
          )}
        </div>
        <p className="sb-section__desc">
          Controle onde a assinatura "desenvolvido por OBRAX" aparece.
          No plano Enterprise você pode removê-la completamente.
        </p>

        <div className="toggle-list">
          <div className={`toggle-item ${!plan.canRemoveObraxBranding ? 'toggle-item--locked' : ''}`}>
            <div className="toggle-item__info">
              <strong>Assinatura na sidebar</strong>
              <span>Exibe "desenvolvido por OBRAX" abaixo do usuário logado</span>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={showObraxSidebar}
                disabled={!plan.canRemoveObraxBranding}
                onChange={(e) => onChangeShowObraxSidebar(e.target.checked)}
              />
              <span className="toggle__track" />
            </label>
          </div>

          <div className={`toggle-item ${!plan.canRemoveObraxBranding ? 'toggle-item--locked' : ''}`}>
            <div className="toggle-item__info">
              <strong>Assinatura nos laudos e relatórios</strong>
              <span>Exibe "Documento gerado por OBRAX" no rodapé dos PDFs</span>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={showObraxReports}
                disabled={!plan.canRemoveObraxBranding}
                onChange={(e) => onChangeShowObraxReports(e.target.checked)}
              />
              <span className="toggle__track" />
            </label>
          </div>
        </div>

        {/* Aviso informativo para planos Starter/Pro */}
        {!plan.canRemoveObraxBranding && (
          <div className="info-box">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12" y2="16"/>
            </svg>
            <span>
              A assinatura OBRAX identifica o sistema e é parte do acordo de uso.
              Para removê-la, faça upgrade para o plano <strong>Enterprise</strong>.
            </span>
          </div>
        )}
      </div>

      {/* ── Botão salvar ─────────────────────────────────────────────────── */}
      <div className="sb-save-row">
        <button className="btn-save" onClick={onSave}>
          Salvar configurações
        </button>
      </div>
    </div>
  );
}
