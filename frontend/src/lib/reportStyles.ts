// ─────────────────────────────────────────────────────────────────────────────
// Salmo Assist – Shared Report Generation Utilities
// Professional PDF/Print report styles, layouts, and HTML generators
// ─────────────────────────────────────────────────────────────────────────────

/* ═══════════════════════════════════════════════════════════════════════════
   1. BRAND CONSTANTS
   ═══════════════════════════════════════════════════════════════════════════ */

export const SALMO_BRAND = {
  colors: {
    black: '#0F0F0F',
    white: '#FFFFFF',
    indigo: '#6366f1',
    violet: '#8b5cf6',
    gold: '#f59e0b',
    emerald: '#10b981',
    danger: '#ef4444',
    orange: '#f97316',
    muted: '#666666',
    border: '#EDEDED',
    surface: '#FAFAFA',
    gradientStart: '#6366f1',
    gradientEnd: '#8b5cf6',
  },
  fonts: {
    primary: "'Tajawal', 'Cairo', 'Segoe UI', system-ui, sans-serif",
    mono: "'IBM Plex Mono', 'Courier New', monospace",
  },
  /** Inline SVG logo mark — stylised "S" with scales-of-justice motif */
  logoSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="48" height="48">
    <defs>
      <linearGradient id="salmo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#6366f1"/>
        <stop offset="100%" stop-color="#8b5cf6"/>
      </linearGradient>
    </defs>
    <rect rx="24" width="120" height="120" fill="url(#salmo-grad)"/>
    <path d="M60 22c-6 0-11 2-14 6l-2 3c-2 3-3 7-1 10 2 4 6 6 11 7l12 3c4 1 7 3 8 6 1 4-1 8-5 10-3 2-7 3-11 3-5 0-9-2-12-5" stroke="#fff" stroke-width="6" stroke-linecap="round" fill="none"/>
    <path d="M60 58c6 0 11 2 14 6l2 3c2 3 3 7 1 10-2 4-6 6-11 7l-12 3c-4 1-7 3-8 6-1 4 1 8 5 10 3 2 7 3 11 3 5 0 9-2 12-5" stroke="#fff" stroke-width="6" stroke-linecap="round" fill="none" opacity=".7"/>
    <circle cx="60" cy="22" r="4" fill="#fff"/>
    <circle cx="60" cy="98" r="4" fill="#fff" opacity=".7"/>
  </svg>`,
  /** Wider logo for cover pages */
  logoSvgLarge: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="80" height="80">
    <defs>
      <linearGradient id="salmo-grad-lg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#6366f1"/>
        <stop offset="100%" stop-color="#8b5cf6"/>
      </linearGradient>
    </defs>
    <rect rx="24" width="120" height="120" fill="url(#salmo-grad-lg)"/>
    <path d="M60 22c-6 0-11 2-14 6l-2 3c-2 3-3 7-1 10 2 4 6 6 11 7l12 3c4 1 7 3 8 6 1 4-1 8-5 10-3 2-7 3-11 3-5 0-9-2-12-5" stroke="#fff" stroke-width="6" stroke-linecap="round" fill="none"/>
    <path d="M60 58c6 0 11 2 14 6l2 3c2 3 3 7 1 10-2 4-6 6-11 7l-12 3c-4 1-7 3-8 6-1 4 1 8 5 10 3 2 7 3 11 3 5 0 9-2 12-5" stroke="#fff" stroke-width="6" stroke-linecap="round" fill="none" opacity=".7"/>
    <circle cx="60" cy="22" r="4" fill="#fff"/>
    <circle cx="60" cy="98" r="4" fill="#fff" opacity=".7"/>
  </svg>`,
} as const;

/* ═══════════════════════════════════════════════════════════════════════════
   2. UTILITY FUNCTIONS
   ═══════════════════════════════════════════════════════════════════════════ */

/** Returns a hex colour based on a 0-100 score */
export function scoreColor(score: number): string {
  if (score >= 90) return SALMO_BRAND.colors.emerald;
  if (score >= 75) return SALMO_BRAND.colors.gold;
  if (score >= 60) return SALMO_BRAND.colors.orange;
  return SALMO_BRAND.colors.danger;
}

/** Returns an Arabic label for a 0-100 score */
export function scoreLabel(score: number): string {
  if (score >= 90) return 'ممتاز';
  if (score >= 75) return 'جيد';
  if (score >= 60) return 'متوسط';
  return 'ضعيف';
}

/** Risk-level badge HTML */
export function riskBadgeHtml(level: string): string {
  const l = (level || '').toLowerCase();
  let bg: string;
  let fg: string;
  let icon: string;
  let label: string;

  if (l.includes('منخفض') || l.includes('low')) {
    bg = '#ecfdf5'; fg = '#065f46'; icon = '✓'; label = level || 'منخفض';
  } else if (l.includes('متوسط') || l.includes('medium')) {
    bg = '#fffbeb'; fg = '#92400e'; icon = '⚠'; label = level || 'متوسط';
  } else if (l.includes('عالي') || l.includes('مرتفع') || l.includes('high')) {
    bg = '#fef2f2'; fg = '#991b1b'; icon = '✗'; label = level || 'عالي';
  } else {
    bg = '#f3f4f6'; fg = '#374151'; icon = '●'; label = level;
  }

  return `<span class="report-badge" style="background:${bg};color:${fg};border:1px solid ${fg}22">${icon} ${label}</span>`;
}

/** Status badge HTML (for invoices, general statuses) */
export function statusBadgeHtml(status: string): string {
  const s = (status || '').toLowerCase();
  let bg: string;
  let fg: string;

  if (s.includes('success') || s.includes('paid') || s.includes('active') || s.includes('ناجح') || s.includes('مدفوع') || s.includes('فعال')) {
    bg = '#ecfdf5'; fg = '#065f46';
  } else if (s.includes('pending') || s.includes('معلق') || s.includes('قيد')) {
    bg = '#fffbeb'; fg = '#92400e';
  } else if (s.includes('fail') || s.includes('cancel') || s.includes('فشل') || s.includes('ملغ')) {
    bg = '#fef2f2'; fg = '#991b1b';
  } else {
    bg = '#f3f4f6'; fg = '#374151';
  }

  return `<span class="report-badge" style="background:${bg};color:${fg};border:1px solid ${fg}22">${status}</span>`;
}

/** Progress bar HTML */
export function progressBarHtml(percentage: number, color?: string): string {
  const clamp = Math.max(0, Math.min(100, percentage));
  const c = color || scoreColor(clamp);
  return `<div class="report-progress-track">
    <div class="report-progress-fill" style="width:${clamp}%;background:${c}"></div>
    <span class="report-progress-label">${clamp}%</span>
  </div>`;
}

/** Score ring SVG (for inline use in reports) */
export function scoreRingSvg(score: number, size = 120): string {
  const radius = (size / 2) - 10;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = scoreColor(score);
  const cx = size / 2;
  const cy = size / 2;

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="report-score-ring">
    <circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="#EDEDED" stroke-width="8"/>
    <circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${color}" stroke-width="8"
      stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${circumference - progress}"
      transform="rotate(-90 ${cx} ${cy})"/>
    <text x="${cx}" y="${cy - 4}" text-anchor="middle" fill="${color}" font-size="${size * 0.25}px" font-weight="700" font-family="${SALMO_BRAND.fonts.primary}">${score}</text>
    <text x="${cx}" y="${cy + 14}" text-anchor="middle" fill="#999" font-size="${size * 0.1}px" font-family="${SALMO_BRAND.fonts.primary}">/100</text>
  </svg>`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. HTML GENERATORS
   ═══════════════════════════════════════════════════════════════════════════ */

export interface CoverPageConfig {
  title: string;
  subtitle?: string;
  reportId?: string;
  date?: string;
  metadata?: { label: string; value: string }[];
}

/** Professional branded cover page */
export function generateCoverPage(config: CoverPageConfig): string {
  const metaRows = (config.metadata || [])
    .map(m => `<div class="cover-meta-row"><span class="cover-meta-label">${m.label}</span><span class="cover-meta-value">${m.value}</span></div>`)
    .join('');

  return `<div class="report-cover-page">
    <div class="cover-bg-pattern"></div>
    <div class="cover-content">
      <div class="cover-logo">${SALMO_BRAND.logoSvgLarge}</div>
      <div class="cover-brand">
        <span class="cover-brand-en">SALMO</span>
        <span class="cover-brand-ar">SALMO AI</span>
      </div>
      <div class="cover-divider"></div>
      <h1 class="cover-title">${config.title}</h1>
      ${config.subtitle ? `<p class="cover-subtitle">${config.subtitle}</p>` : ''}
      <div class="cover-meta">
        ${config.reportId ? `<div class="cover-meta-row"><span class="cover-meta-label">رقم التقرير</span><span class="cover-meta-value cover-meta-mono">${config.reportId}</span></div>` : ''}
        ${config.date ? `<div class="cover-meta-row"><span class="cover-meta-label">تاريخ الإصدار</span><span class="cover-meta-value">${config.date}</span></div>` : ''}
        ${metaRows}
      </div>
      <div class="cover-footer-line">
        <span>Salmo Assist</span>
        <span>·</span>
        <span>حلول الموارد البشرية الذكية</span>
      </div>
    </div>
  </div>`;
}

/** Compact branded header for subsequent pages */
export function generateHeader(title: string): string {
  return `<header class="report-header">
    <div class="report-header-right">
      ${SALMO_BRAND.logoSvg}
      <div class="report-header-brand">
        <span class="report-header-brand-name">SALMO</span>
        <span class="report-header-brand-sub">SALMO AI</span>
      </div>
    </div>
    <div class="report-header-title">${title}</div>
  </header>`;
}

/** Page footer with disclaimer */
export function generateFooter(disclaimer?: string): string {
  const disc = disclaimer || 'هذا التقرير للأغراض الاستشارية فقط ولا يُعد استشارة قانونية رسمية';
  return `<footer class="report-footer">
    <div class="report-footer-disclaimer">${disc}</div>
    <div class="report-footer-meta">
      <span class="report-footer-brand">Salmo Assist © ${new Date().getFullYear()}</span>
      <span class="report-footer-page"></span>
    </div>
  </footer>`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. FULL HTML DOCUMENT WRAPPER
   ═══════════════════════════════════════════════════════════════════════════ */

export interface WrapReportConfig {
  title: string;
  bodyContent: string;
  coverPage?: string;
  printBtnText?: string;
}

/** Wraps report body in a complete HTML document with styles, cover page, and print button */
export function wrapReportHtml(config: WrapReportConfig): string {
  const btnText = config.printBtnText || 'طباعة / حفظ PDF';

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${config.title} — Salmo Assist</title>
  ${getReportBaseStyles()}
</head>
<body>
  ${config.coverPage || ''}
  <div class="report-body">
    ${generateHeader(config.title)}
    <main class="report-main">
      ${config.bodyContent}
    </main>
    ${generateFooter()}
  </div>
  <button class="report-print-btn no-print" onclick="window.print()">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
    ${btnText}
  </button>
</body>
</html>`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   5. BASE STYLES (CSS)
   ═══════════════════════════════════════════════════════════════════════════ */

export function getReportBaseStyles(): string {
  return `<style>
/* ── Google Fonts ──────────────────────────────────────────────────────── */
@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

/* ── CSS Reset & Base ──────────────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { font-size: 14px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body {
  font-family: ${SALMO_BRAND.fonts.primary};
  direction: rtl;
  text-align: right;
  color: ${SALMO_BRAND.colors.black};
  background: ${SALMO_BRAND.colors.white};
  line-height: 1.7;
  -webkit-font-smoothing: antialiased;
}

/* ── @page ─────────────────────────────────────────────────────────────── */
@page {
  size: A4;
  margin: 18mm 15mm 22mm 15mm;
}

/* ── Cover Page ────────────────────────────────────────────────────────── */
.report-cover-page {
  position: relative;
  width: 100%;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0F0F0F 0%, #1a1a2e 40%, #16213e 70%, #0F0F0F 100%);
  overflow: hidden;
  page-break-after: always;
  break-after: page;
}
.cover-bg-pattern {
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(circle at 20% 30%, rgba(99,102,241,0.15) 0%, transparent 50%),
    radial-gradient(circle at 80% 70%, rgba(139,92,246,0.12) 0%, transparent 50%),
    radial-gradient(circle at 50% 50%, rgba(245,158,11,0.06) 0%, transparent 40%);
  pointer-events: none;
}
.cover-bg-pattern::before {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 40px,
    rgba(255,255,255,0.015) 40px,
    rgba(255,255,255,0.015) 41px
  );
}
.cover-content {
  position: relative;
  z-index: 1;
  text-align: center;
  padding: 60px 40px;
  max-width: 600px;
}
.cover-logo {
  margin-bottom: 24px;
  filter: drop-shadow(0 4px 20px rgba(99,102,241,0.3));
}
.cover-brand {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 12px;
  margin-bottom: 32px;
}
.cover-brand-en {
  font-size: 2.4rem;
  font-weight: 800;
  letter-spacing: 6px;
  color: #fff;
  text-transform: uppercase;
}
.cover-brand-ar {
  font-size: 1.6rem;
  font-weight: 700;
  color: rgba(255,255,255,0.6);
}
.cover-divider {
  width: 80px;
  height: 3px;
  margin: 0 auto 32px;
  background: linear-gradient(90deg, ${SALMO_BRAND.colors.indigo}, ${SALMO_BRAND.colors.violet});
  border-radius: 2px;
}
.cover-title {
  font-size: 2rem;
  font-weight: 800;
  color: #fff;
  line-height: 1.4;
  margin-bottom: 12px;
}
.cover-subtitle {
  font-size: 1.05rem;
  color: rgba(255,255,255,0.55);
  font-weight: 400;
  margin-bottom: 36px;
}
.cover-meta {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 16px;
  padding: 20px 28px;
  margin: 32px auto 0;
  max-width: 380px;
  backdrop-filter: blur(10px);
}
.cover-meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}
.cover-meta-row + .cover-meta-row {
  border-top: 1px solid rgba(255,255,255,0.08);
}
.cover-meta-label {
  font-size: 0.85rem;
  color: rgba(255,255,255,0.5);
}
.cover-meta-value {
  font-size: 0.9rem;
  font-weight: 600;
  color: #fff;
}
.cover-meta-mono {
  font-family: ${SALMO_BRAND.fonts.mono};
  letter-spacing: 1px;
  direction: ltr;
}
.cover-footer-line {
  margin-top: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 0.8rem;
  color: rgba(255,255,255,0.3);
}

/* ── Page Header ───────────────────────────────────────────────────────── */
.report-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
  margin-bottom: 28px;
  border-bottom: 2px solid ${SALMO_BRAND.colors.border};
}
.report-header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.report-header-brand {
  display: flex;
  flex-direction: column;
}
.report-header-brand-name {
  font-size: 1.1rem;
  font-weight: 800;
  letter-spacing: 3px;
  color: ${SALMO_BRAND.colors.black};
  text-transform: uppercase;
  line-height: 1.2;
}
.report-header-brand-sub {
  font-size: 0.75rem;
  color: ${SALMO_BRAND.colors.muted};
  font-weight: 500;
}
.report-header-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: ${SALMO_BRAND.colors.muted};
  text-align: left;
  direction: ltr;
}

/* ── Page Footer ───────────────────────────────────────────────────────── */
.report-footer {
  margin-top: 40px;
  padding-top: 16px;
  border-top: 1px solid ${SALMO_BRAND.colors.border};
}
.report-footer-disclaimer {
  font-size: 0.72rem;
  color: #999;
  text-align: center;
  margin-bottom: 8px;
  line-height: 1.6;
}
.report-footer-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.7rem;
  color: #bbb;
}
.report-footer-brand {
  font-weight: 500;
}
.report-footer-page::after {
  counter-increment: page;
  content: counter(page);
}

/* ── Report Body ───────────────────────────────────────────────────────── */
.report-body {
  max-width: 210mm;
  margin: 0 auto;
  padding: 32px 24px;
}
.report-main {
  min-height: 60vh;
}

/* ── Section Titles ────────────────────────────────────────────────────── */
.report-section-title {
  font-size: 1.25rem;
  font-weight: 800;
  color: ${SALMO_BRAND.colors.black};
  margin: 32px 0 16px;
  padding-bottom: 10px;
  border-bottom: 2px solid ${SALMO_BRAND.colors.indigo};
  display: flex;
  align-items: center;
  gap: 10px;
}
.report-section-title .section-icon {
  font-size: 1.3rem;
}
.report-subsection-title {
  font-size: 1rem;
  font-weight: 700;
  color: ${SALMO_BRAND.colors.black};
  margin: 20px 0 10px;
}

/* ── Cards ─────────────────────────────────────────────────────────────── */
.report-card {
  background: #fff;
  border: 1px solid ${SALMO_BRAND.colors.border};
  border-radius: 14px;
  padding: 20px 24px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.02);
}
.report-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid ${SALMO_BRAND.colors.border};
}
.report-card-title {
  font-size: 1rem;
  font-weight: 700;
  color: ${SALMO_BRAND.colors.black};
}
.report-card-accent {
  border-right: 4px solid ${SALMO_BRAND.colors.indigo};
}
.report-card-danger {
  border-right: 4px solid ${SALMO_BRAND.colors.danger};
  background: #fffbfb;
}
.report-card-success {
  border-right: 4px solid ${SALMO_BRAND.colors.emerald};
  background: #f7fdf9;
}
.report-card-warning {
  border-right: 4px solid ${SALMO_BRAND.colors.gold};
  background: #fffdf5;
}

/* ── Summary Grid (2×2 or 4-col) ──────────────────────────────────────── */
.report-summary-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
  margin-bottom: 24px;
}
.report-summary-grid-4 {
  grid-template-columns: repeat(4, 1fr);
}
.report-summary-item {
  background: ${SALMO_BRAND.colors.surface};
  border: 1px solid ${SALMO_BRAND.colors.border};
  border-radius: 12px;
  padding: 16px 18px;
  text-align: center;
}
.report-summary-item-value {
  font-size: 1.6rem;
  font-weight: 800;
  color: ${SALMO_BRAND.colors.indigo};
  line-height: 1.2;
  margin-bottom: 4px;
}
.report-summary-item-label {
  font-size: 0.78rem;
  color: ${SALMO_BRAND.colors.muted};
  font-weight: 500;
}

/* ── Two-Column Grid ───────────────────────────────────────────────────── */
.report-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}

/* ── Score Ring ─────────────────────────────────────────────────────────── */
.report-score-ring {
  display: block;
  margin: 0 auto;
}
.report-score-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px;
}
.report-score-label {
  font-size: 1.1rem;
  font-weight: 700;
  text-align: center;
}
.report-score-sublabel {
  font-size: 0.8rem;
  color: ${SALMO_BRAND.colors.muted};
}

/* ── Progress Bar ──────────────────────────────────────────────────────── */
.report-progress-track {
  position: relative;
  width: 100%;
  height: 10px;
  background: #f0f0f0;
  border-radius: 6px;
  overflow: visible;
}
.report-progress-fill {
  height: 100%;
  border-radius: 6px;
  transition: width 0.3s ease;
}
.report-progress-label {
  position: absolute;
  left: 4px;
  top: -18px;
  font-size: 0.7rem;
  font-weight: 600;
  color: ${SALMO_BRAND.colors.muted};
  direction: ltr;
}

/* ── Badges ─────────────────────────────────────────────────────────────── */
.report-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 12px;
  border-radius: 20px;
  font-size: 0.78rem;
  font-weight: 600;
  white-space: nowrap;
  line-height: 1.5;
}

/* ── Tags / Chips ──────────────────────────────────────────────────────── */
.report-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 8px 0;
}
.report-tag {
  display: inline-block;
  padding: 3px 12px;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 500;
  background: #f0edff;
  color: ${SALMO_BRAND.colors.indigo};
  border: 1px solid #e0dbff;
}
.report-tag-emerald {
  background: #ecfdf5;
  color: #065f46;
  border-color: #a7f3d0;
}
.report-tag-gold {
  background: #fffbeb;
  color: #92400e;
  border-color: #fde68a;
}
.report-tag-danger {
  background: #fef2f2;
  color: #991b1b;
  border-color: #fecaca;
}

/* ── Tables ─────────────────────────────────────────────────────────────── */
.report-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  border: 1px solid ${SALMO_BRAND.colors.border};
  border-radius: 12px;
  overflow: hidden;
  margin: 16px 0;
  font-size: 0.85rem;
}
.report-table thead {
  background: ${SALMO_BRAND.colors.surface};
}
.report-table th {
  padding: 12px 16px;
  font-weight: 700;
  color: ${SALMO_BRAND.colors.black};
  text-align: right;
  border-bottom: 2px solid ${SALMO_BRAND.colors.border};
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.report-table td {
  padding: 11px 16px;
  border-bottom: 1px solid ${SALMO_BRAND.colors.border};
  color: #333;
}
.report-table tbody tr:nth-child(even) {
  background: ${SALMO_BRAND.colors.surface};
}
.report-table tbody tr:last-child td {
  border-bottom: none;
}
.report-table tfoot td {
  padding: 12px 16px;
  font-weight: 700;
  background: ${SALMO_BRAND.colors.surface};
  border-top: 2px solid ${SALMO_BRAND.colors.border};
}

/* ── Highlight Boxes ───────────────────────────────────────────────────── */
.report-highlight {
  border-radius: 12px;
  padding: 16px 20px;
  margin: 14px 0;
  font-size: 0.88rem;
  line-height: 1.7;
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.report-highlight-icon {
  font-size: 1.2rem;
  flex-shrink: 0;
  margin-top: 2px;
}
.report-highlight-info {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #1e40af;
}
.report-highlight-success {
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  color: #065f46;
}
.report-highlight-warning {
  background: #fffbeb;
  border: 1px solid #fde68a;
  color: #92400e;
}
.report-highlight-danger {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
}
.report-highlight-tip {
  background: #f5f3ff;
  border: 1px solid #ddd6fe;
  color: #5b21b6;
}

/* ── Key-Value Rows ────────────────────────────────────────────────────── */
.report-kv-list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.report-kv-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid ${SALMO_BRAND.colors.border};
  font-size: 0.88rem;
}
.report-kv-row:last-child {
  border-bottom: none;
}
.report-kv-label {
  color: ${SALMO_BRAND.colors.muted};
  font-weight: 500;
}
.report-kv-value {
  font-weight: 600;
  color: ${SALMO_BRAND.colors.black};
}

/* ── Bullet Lists ──────────────────────────────────────────────────────── */
.report-list {
  list-style: none;
  padding: 0;
  margin: 8px 0;
}
.report-list li {
  position: relative;
  padding: 6px 18px 6px 0;
  font-size: 0.88rem;
  line-height: 1.7;
}
.report-list li::before {
  content: '';
  position: absolute;
  right: 0;
  top: 14px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${SALMO_BRAND.colors.indigo};
}
.report-list-danger li::before { background: ${SALMO_BRAND.colors.danger}; }
.report-list-success li::before { background: ${SALMO_BRAND.colors.emerald}; }
.report-list-warning li::before { background: ${SALMO_BRAND.colors.gold}; }

/* ── Dividers ──────────────────────────────────────────────────────────── */
.report-divider {
  border: none;
  border-top: 1px solid ${SALMO_BRAND.colors.border};
  margin: 24px 0;
}
.report-divider-thick {
  border-top-width: 2px;
  border-color: ${SALMO_BRAND.colors.indigo};
}

/* ── Print Button ──────────────────────────────────────────────────────── */
.report-print-btn {
  position: fixed;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 28px;
  background: ${SALMO_BRAND.colors.black};
  color: #fff;
  border: none;
  border-radius: 12px;
  font-family: ${SALMO_BRAND.fonts.primary};
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(0,0,0,0.25);
  z-index: 1000;
  transition: background 0.2s, transform 0.2s;
}
.report-print-btn:hover {
  background: #1a1a1a;
  transform: translateX(-50%) translateY(-2px);
}

/* ── Print Media Queries ───────────────────────────────────────────────── */
@media print {
  .no-print,
  .report-print-btn {
    display: none !important;
  }
  body {
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .report-cover-page {
    min-height: 100vh;
    page-break-after: always;
    break-after: page;
  }
  .report-body {
    padding: 0;
    max-width: 100%;
  }
  .report-card {
    break-inside: avoid;
    page-break-inside: avoid;
    box-shadow: none;
    border: 1px solid #ddd;
  }
  .report-summary-grid,
  .report-grid-2 {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .report-table {
    break-inside: auto;
    page-break-inside: auto;
  }
  .report-table thead {
    display: table-header-group;
  }
  .report-table tr {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .report-section-title {
    break-after: avoid;
    page-break-after: avoid;
  }
  .report-highlight {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .report-header {
    position: running(header);
  }
  .report-footer {
    position: running(footer);
  }
  /* Ensure score rings print in colour */
  svg circle,
  svg text {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}

/* ── Responsive (for screen preview) ───────────────────────────────────── */
@media screen and (max-width: 640px) {
  .report-summary-grid,
  .report-summary-grid-4 {
    grid-template-columns: repeat(2, 1fr);
  }
  .report-grid-2 {
    grid-template-columns: 1fr;
  }
  .report-body {
    padding: 16px 12px;
  }
  .cover-title {
    font-size: 1.5rem;
  }
  .cover-brand-en {
    font-size: 1.8rem;
  }
}
</style>`;
}