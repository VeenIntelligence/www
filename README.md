# Venn Intelligence Foundation — Official Website

> **Venn Intelligence Foundation LLC** — Decentralized Privacy × LLM Infrastructure × Intelligent Trading

Official website for Venn Intelligence Foundation, a Wyoming-based LLC specializing in next-generation AI infrastructure, quantitative trading systems, academic donations, and technical consulting.

🌐 **Live**: [vennai.org](https://vennai.org)

---

## 🏢 Company Profile

|                      |                                         |
| -------------------- | --------------------------------------- |
| **Full Name**        | Venn Intelligence Foundation LLC        |
| **Chinese Name**     | 文氏智能基金会有限责任公司              |
| **Type**             | LLC (Limited Liability Company)         |
| **State**            | Wyoming (WY)                            |
| **Founded**          | February 25, 2026                       |
| **Registration ID**  | 2026-001903366                          |
| **Address**          | 30 N Gould St Ste N, Sheridan, WY 82801 |
| **Founder & CEO**    | Chengzhi Gao                            |
| **Registered Agent** | Northwest Registered Agent Service Inc  |

---

## 🎯 What We Do

### Project Σ (Sigma) — Collective Intelligence Infrastructure

Building the next-generation infrastructure protocol for human collective intelligence. Four pillars: Proof of Humanity (ZK-based), Σ Engine (information-theoretic evaluation), Cognitive Topology (self-organizing knowledge fields), and Bazaar of Currencies (multi-tribe token economics).

### Project Ω (Omega) — AI Trading Development Documentation

The first product to sell the complete evolutionary record of building an AI-agent-driven trading system — every architecture decision, every failed approach, every pivot, documented in real time. Featuring agent-native intelligence, trigger-driven execution, reflection dashboards, and human-agent co-governance via Telegram.

### Consulting Services

Personal consulting from Taitan Pascal (co-founder), offered in two tiers:

- **Casual Chat** — $100 / 30 min
- **Formal Consulting** — $1000 / hour (with Google Meeting replay & legal documentation)

### Blog

Markdown-based blog system with per-article routing (`/blog/:slug`), table of contents generation, and full i18n support.

---

## 🛠 Tech Stack

```
Frontend:
  ├── React 19.x            (SPA with client-side routing)
  ├── Vite 8.x              (dev server & build tooling)
  ├── Tailwind CSS 4.x      (utility-first styling)
  ├── Three.js 0.183.x      (WebGL rendering pipeline)
  ├── Framer Motion 12.x    (page transitions & animations)
  ├── React Router 7.x      (client-side routing)
  └── @liquidglass/react    (glassmorphism effects)

Rendering Pipeline:
  ├── UnifiedStage           (full-screen fixed WebGL compositor)
  ├── Custom GLSL shaders    (droplet, frosted wave, sequin looks)
  ├── GPU adaptive quality   (auto-scales resolution by frame rate)
  └── Section freeze system  (pauses off-screen heavy renders)

Hosting:
  ├── Cloudflare Workers     (edge deployment, auto-deploy from GitHub)
  └── Custom domain          (vennai.org)

i18n:
  ├── English (default)
  └── Chinese (中文)
```

---

## 📁 Project Structure

```
Vennai/
├── public/
│   ├── brand/                  # Brand assets (avatar SVG/PNG)
│   ├── video/                  # Video assets
│   ├── favicon.svg             # Site favicon
│   ├── screenshot*.jpg         # OG / preview screenshots
│   └── consul-lines.png        # Consultant section decoration
├── src/
│   ├── components/             # Global shared components
│   │   ├── Navbar.jsx          # Sticky navigation bar
│   │   ├── Footer.jsx          # Site footer
│   │   ├── UnifiedStage.jsx    # Full-screen WebGL rendering compositor
│   │   ├── LiquidGoldBackground.jsx  # Frosted gold canvas background
│   │   ├── ScrollDownArrow.jsx # Animated scroll indicator
│   │   ├── LanguageToggle.jsx  # EN/ZH language switcher
│   │   ├── MagnetText.jsx      # Magnetic text hover effect
│   │   ├── GPUDebugPanel.jsx   # Dev-only GPU tuning panel
│   │   └── common/             # Shared micro-components
│   │       ├── BrandWordmark.jsx
│   │       ├── I18nSwap.jsx
│   │       ├── ScrollToTop.jsx
│   │       └── SocialIcons.jsx
│   ├── pages/
│   │   ├── HomePage.jsx        # Landing page assembler
│   │   ├── BlogPage.jsx        # Blog listing page
│   │   ├── BlogArticlePage.jsx # Individual blog post page
│   │   ├── NotFound.jsx        # 404
│   │   ├── home/               # Landing page sections
│   │   │   ├── HeroSection.jsx       # Hero with animated title
│   │   │   ├── SigmaSection.jsx      # Project Σ introduction
│   │   │   ├── OmegaSection.jsx      # Project Ω introduction
│   │   │   ├── ConsultantsSection.jsx # Consulting services
│   │   │   └── PendulumBackground.jsx # Pendulum animation
│   │   └── blog/
│   │       ├── registry.js     # Blog post metadata registry
│   │       └── posts/          # Markdown blog articles
│   ├── hooks/                  # Shared React hooks
│   │   ├── useSectionFreeze.js     # Pause off-screen heavy renders
│   │   ├── useAdaptiveQuality.js   # GPU auto-quality scaling
│   │   └── useCharMagnet.js        # Character magnet interaction
│   ├── config/                 # Centralized configuration
│   │   ├── i18n.js             # All UI text (EN + ZH)
│   │   ├── dropletLook.js      # Hero droplet shader params
│   │   ├── frostedWaveLook.js  # Sigma frosted wave params
│   │   ├── sequinLook.js       # Omega sequin shader params
│   │   └── consultantsLook.js  # Consultants visual params
│   ├── shaders/                # GLSL shader modules
│   │   ├── unifiedFragment.js  # Main fragment shader (all looks)
│   │   └── fullscreenVertex.js # Fullscreen quad vertex shader
│   ├── utils/                  # Pure utility functions
│   │   ├── unifiedShaderBuilder.js  # Shader compilation pipeline
│   │   ├── unifiedPhysics.js        # Physics simulation engine
│   │   ├── gpuDebugBus.js           # GPU debug event bus
│   │   ├── glassCompatibility.js    # Device glass effect detection
│   │   ├── glassUtils.js            # Glass rendering helpers
│   │   └── frameThrottle.js         # Frame rate throttling
│   ├── context/                # React Contexts
│   │   ├── LanguageContext.jsx # Language provider (EN/ZH)
│   │   └── useLanguage.js      # Language hook shorthand
│   ├── styles/
│   │   ├── components/         # Component stylesheets
│   │   │   ├── navbar.css
│   │   │   ├── footer.css
│   │   │   ├── gpu-debug-panel.css
│   │   │   ├── liquid-gold-bg.css
│   │   │   ├── scroll-down-arrow.css
│   │   │   └── brand-wordmark.css
│   │   ├── sections/           # Landing page section styles
│   │   │   ├── hero.css
│   │   │   ├── sigma.css
│   │   │   ├── omega.css
│   │   │   └── consultants.css
│   │   ├── pages/              # Page-level styles
│   │   │   └── blog.css
│   │   └── glass-fallback.css  # Fallback for non-glass devices
│   ├── assets/                 # Bundled static assets
│   ├── App.jsx                 # Root component (pure router)
│   ├── main.jsx                # Entry point
│   └── index.css               # Global reset & CSS custom properties
├── scripts/
│   └── audit.mjs               # Code quality audit script
├── docs/
│   ├── audit.md                # Audit documentation
│   └── conpanyinfo.md          # Company information
├── todos/                      # Development task tracking
├── index.html                  # HTML entry point
├── vite.config.js              # Vite configuration
├── wrangler.toml               # Cloudflare Workers config
├── worker.js                   # Worker entry point
├── eslint.config.js            # ESLint flat config
├── package.json
├── AGENT.md                    # AI agent instructions (triple-sync)
├── GEMINI.md                   # AI agent instructions (triple-sync)
└── CLAUDE.md                   # AI agent instructions (triple-sync)
```

---

## ✨ Key Features

### WebGL Rendering Pipeline

The site features a **UnifiedStage** — a full-screen fixed-position WebGL compositor built with Three.js. It renders multiple shader "looks" that transition seamlessly as the user scrolls between sections:

| Section     | Shader Look  | Description                       |
| ----------- | ------------ | --------------------------------- |
| Hero        | Droplet      | Organic liquid droplet simulation |
| Sigma       | Frosted Wave | Cool-toned frosted glass wave     |
| Omega       | Sequin       | Warm gold sequin/hexagonal grid   |
| Consultants | Custom       | Pendulum background animation     |

### GPU Adaptive Quality

The `useAdaptiveQuality` hook automatically monitors frame rate over a 30-frame sliding window and scales rendering resolution to maintain smooth performance across devices — from high-end desktops to mobile phones.

### Section Freeze System

The `useSectionFreeze` hook uses IntersectionObserver + Page Visibility API to completely pause WebGL rendering loops for off-screen sections, dramatically reducing GPU usage on long-scroll pages.

### GPU Debug Panel

In development mode (`npm run dev:gpu`), a floating GPU tuning panel allows real-time adjustment of shader parameters, quality tiers, and resolution scaling. Production builds completely tree-shake this panel — zero runtime overhead.

### Glassmorphism Compatibility

Automatic detection of device glass effect support with graceful CSS fallbacks for Android and lower-end devices.

### Internationalization

All UI text is centralized in `src/config/i18n.js` with full English and Chinese translations. Language toggle persists user preference.

---

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start development server (port 5273)
npm run dev

# Start with GPU debug panel enabled
npm run dev:gpu

# Build for production
npm run build

# Preview production build
npm run preview

# Run code quality audit
npm run audit

# Lint
npm run lint
```

---

## 🌐 Deployment

### Cloudflare Workers (Production)

|                       |                        |
| --------------------- | ---------------------- |
| **Git Provider**      | GitHub                 |
| **Repository**        | `VeenIntelligence/www` |
| **Production Branch** | `main`                 |
| **Auto Deploy**       | On push to `main`      |

**Build Configuration:**

|                       |                                                |
| --------------------- | ---------------------------------------------- |
| **Build Command**     | `npm run build`                                |
| **Output Directory**  | `dist`                                         |
| **Root Directory**    | `/`                                            |
| **Node.js Version**   | `^20.19.0 \|\| >=22.12.0` (Vite 8 requirement) |
| **Worker Entrypoint** | `worker.js`                                    |

**Wrangler Config** (`wrangler.toml`):

```toml
name = "www"
main = "worker.js"
compatibility_date = "2026-03-28"

[assets]
directory = "./dist"
binding = "ASSETS"
not_found_handling = "single-page-application"
```

**SPA Routing:** Handled at the Workers asset level via `not_found_handling = "single-page-application"`. No `_redirects` file needed.

### Manual Deploy Trigger

```bash
git commit --allow-empty -m "chore: trigger cloudflare workers deploy" && git push origin main
```

### Cloudflare Worker + Pages Deploy

```bash
npm run cf:deploy
```

---

## 🧪 Development Tools

| Command             | Description                                 |
| ------------------- | ------------------------------------------- |
| `npm run dev`       | Standard dev server on port 5273            |
| `npm run dev:gpu`   | Dev server with GPU debug panel enabled     |
| `npm run build`     | Production build (also used for validation) |
| `npm run audit`     | Code quality & performance audit            |
| `npm run cf:dev`    | Build + local Wrangler dev server           |
| `npm run cf:deploy` | Build + deploy to Cloudflare Workers        |

---

## 📜 License

© 2026 Venn Intelligence Foundation LLC. All rights reserved.
