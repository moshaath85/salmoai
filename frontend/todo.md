## Design
- **Style**: Modern Saudi premium tech / AI SaaS aesthetic
- **Color Palette**: 
  - Primary: #6366f1 (Indigo), #8b5cf6 (Violet)
  - Accent: #06b6d4 (Cyan), #10b981 (Emerald)
  - Dark BG: #0f172a, #1e293b
  - Light BG: #f8fafc, #ffffff
  - Gold accent: #f59e0b (Saudi premium feel)
- **Typography**: System Arabic fonts (Tajawal via existing setup)
- **Visual Elements**: Glassmorphism, gradient backgrounds, particle effects, SVG animated characters, speech bubbles, AI glow effects

## Report Redesign Tasks
- [x] Create shared report utility (src/lib/reportStyles.ts) with Salmo branding constants, cover page, header/footer templates
- [x] Redesign Contract Analysis report - professional branded HTML report with cover page, score visualization, risk analysis cards
- [x] Redesign Resume Analysis report - upgrade HTML template with cover page, modern score cards, progress bars, branded layout
- [x] Redesign Invoice PDF - upgrade jsPDF with Salmo branding, professional layout, PAID watermark
- [x] Run lint and build checks
- [x] Run CheckUI validation

## Previous Tasks (Completed)
- [x] Create SVG Saudi characters component (SaudiCharacters.tsx)
- [x] Create LoadingScreen component (LoadingScreen.tsx)
- [x] Create SpeechBubble component with typing effect
- [x] Integrate LoadingScreen into App.tsx
- [x] Redesign shemagh with proper Saudi red/white checkered SVG pattern
- [x] Improve character quality
- [x] Add MiniLoader component for page transitions
- [x] Replace simple PageLoader with MiniLoader
- [x] Add voice wave bars, floating geometric shapes, improved card glow animations
- [x] Add new CSS animations
- [x] Create ProtectedRoute component for user-facing protected pages
- [x] Wrap all 10 protected user routes with ProtectedRoute in App.tsx
- [x] Update AuthCallback to redirect users back to intended page after login