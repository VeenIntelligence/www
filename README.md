# Venn Intelligence Foundation — Official Website

> **Venn Intelligence Foundation LLC** — Decentralized Privacy × LLM Infrastructure × Intelligent Trading

Official landing page for Venn Intelligence Foundation, a Wyoming-based LLC specializing in next-generation AI infrastructure, quantitative trading systems, academic donations, and technical consulting.

🌐 **Domain**: [vennai.org](https://vennai.org)

---

## 🏢 Company Profile

| | |
|---|---|
| **Full Name** | Venn Intelligence Foundation LLC |
| **Chinese Name** | 文氏智能基金会有限责任公司 |
| **Type** | LLC (Limited Liability Company) |
| **State** | Wyoming (WY) |
| **Founded** | February 25, 2026 |
| **Registration ID** | 2026-001903366 |
| **Address** | 30 N Gould St Ste N, Sheridan, WY 82801 |
| **Founder & CEO** | Chengzhi Gao |
| **Registered Agent** | Northwest Registered Agent Service Inc |

---

## 🎯 What We Do

### Core Focus Areas
- **Decentralized Privacy** — Building infrastructure for a privacy-first future
- **LLM-Era Infrastructure** — Tools and platforms for the age of large language models
- **Intelligent Trading Systems** — AI-agent-driven quantitative trading infrastructure

### Our Product — VennTriggerTrade
A comprehensive intelligent scheduling infrastructure for strategy generation and execution, powered by large language model agents and featuring a smart hook-based architecture.

→ [Product Details →](/product/venn-trigger-trade)

### Services
- **Academic Donation Program** — Supporting research and education
- **Technical Consulting** — Linux systems, AI agents, prompt engineering, and more

---

## 🛠 Tech Stack

```
Frontend:
  ├── React 19.x
  ├── Vite 8.x
  ├── Vanilla CSS (custom design system)
  └── React Router (client-side routing)

Hosting:
  ├── Cloudflare Pages (static hosting, free tier)
  └── Custom domain (vennai.org)

Language:
  ├── Default: English
  ├── Supported: Chinese (中文)
  └── Others: via Google Translate
```

---

## 📁 Project Structure

```
Vennai/
├── public/
│   ├── favicon.ico
│   └── assets/                # Static images, icons
├── src/
│   ├── components/            # Reusable UI components
│   │   ├── Navbar.jsx
│   │   ├── Hero.jsx
│   │   ├── About.jsx
│   │   ├── Product.jsx
│   │   ├── Services.jsx
│   │   └── Footer.jsx
│   ├── pages/                 # Page-level components
│   │   ├── Home.jsx           # Main landing page
│   │   ├── ProductDetail.jsx  # VennTriggerTrade detail page
│   │   └── NotFound.jsx       # 404
│   ├── i18n/                  # Internationalization
│   │   ├── en.json            # English strings
│   │   └── zh.json            # Chinese strings
│   ├── styles/                # CSS files
│   │   ├── index.css          # Global styles & design tokens
│   │   └── components/        # Component-specific styles
│   ├── App.jsx                # Root component with routing
│   └── main.jsx               # Entry point
├── todos/                     # Development task tracking
│   └── phase1-design-layout.md
├── index.html
├── vite.config.js
├── package.json
└── README.md
```

---

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 🌐 Deployment

### Cloudflare Pages (Production)

Repository:
- Git provider: GitHub
- Repo: `https://github.com/VeenIntelligence/www`
- Production branch: `main`
- Monorepo: yes (current frontend project root is `/`)

Build config:
- Framework preset: `Vite`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `/`
- Node.js version: `20.19.0+` (Vite 8 requires `^20.19.0 || >=22.12.0`)
- Install command: `npm install` (or `npm ci` if lockfile-only CI install is preferred)

Environment variables:
- Production: none

Routing:
- SPA fallback: enabled via `public/_redirects` with `/* /index.html 200`

#### Setup Steps
1. In Cloudflare dashboard, go to `Workers & Pages` -> `Create` -> `Pages` -> `Connect to Git`.
2. Connect GitHub and select repo `VeenIntelligence/www`.
3. Set production branch to `main`.
4. Fill build settings with the values above and deploy.
5. Add custom domain `vennai.org` in Pages project -> `Custom domains`.
6. Add `www.vennai.org` as well, then configure a redirect rule from `www` to apex domain (`vennai.org`).

#### Domain Status Note
You said the domain is purchased but not bound to any server yet. That is fine.
You only need DNS pointing to Cloudflare (or nameservers switched to Cloudflare) before/while binding `vennai.org` in Pages.

#### Manual Trigger Command
Default behavior is auto deploy on push to `main`.  
If you want to force a deploy without code changes, run:

```bash
git commit --allow-empty -m "chore: trigger cloudflare pages deploy" && git push origin main
```

---

## 📋 Development Phases

Development is tracked in the [`todos/`](./todos/) directory.

| Phase | Focus | Status |
|-------|-------|--------|
| **Phase 1** | Page layout & content structure | 🔄 In Progress |
| Phase 2 | Visual polish & animations | ⏳ Pending |
| Phase 3 | Stripe payment + backend integration | ⏳ Pending |
| Phase 4 | Email, analytics, production deploy | ⏳ Pending |

→ See [todos/phase1-design-layout.md](./todos/phase1-design-layout.md) for current tasks.

---

## 📜 License

© 2026 Venn Intelligence Foundation LLC. All rights reserved.
