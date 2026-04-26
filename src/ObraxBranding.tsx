// src/components/ObraxBranding.tsx
// Assinatura OBRAX — aparece na sidebar e nos laudos/PDFs
// Controlado pelo plano do cliente (Starter/Pro: visível | Enterprise: oculto)

import { shouldShowObraxSidebar, shouldShowObraxReport } from '../hooks/usePlan';

interface ObraxSidebarSignatureProps {
  planTier?: string;
}

// ─── Assinatura da sidebar (abaixo do usuário logado) ───────────────────────
export function ObraxSidebarSignature({ planTier }: ObraxSidebarSignatureProps) {
  if (!shouldShowObraxSidebar(planTier)) return null;

  return (
    <div className="obrax-sidebar-signature">
      <span className="obrax-sidebar-signature__label">desenvolvido por</span>
      <a
        href="https://obrax.com.br"
        target="_blank"
        rel="noopener noreferrer"
        className="obrax-sidebar-signature__link"
        title="OBRAX — Gestão Pós-Obra"
      >
        <span className="obrax-sidebar-signature__icon" aria-hidden="true">
          {/* Ícone de casa — identidade OBRAX */}
          <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </span>
        <span className="obrax-sidebar-signature__name">OBRAX</span>
      </a>
    </div>
  );
}

// ─── Assinatura de rodapé nos laudos/PDFs ───────────────────────────────────
export function ObraxReportSignature({ planTier }: ObraxSidebarSignatureProps) {
  if (!shouldShowObraxReport(planTier)) return null;

  return (
    <div className="obrax-report-signature">
      <span className="obrax-report-signature__label">Documento gerado por</span>
      <a
        href="https://obrax.com.br"
        target="_blank"
        rel="noopener noreferrer"
        className="obrax-report-signature__badge"
        title="OBRAX — Gestão Pós-Obra"
      >
        <span className="obrax-report-signature__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </span>
        <span className="obrax-report-signature__text">
          <strong>OBRAX</strong>
          <span>Gestão Pós-Obra</span>
        </span>
      </a>
    </div>
  );
}
