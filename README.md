# 🚀 ResumeMatch

<div align="center">

![ResumeMatch Logo](./docs/logo.png)

**AI-powered resume optimizer that matches your CV to job descriptions.**

Get compatibility scores, keyword suggestions & AI-generated cover letters.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11-red)](https://nestjs.com/)
[![Better Auth](https://img.shields.io/badge/Better%20Auth-1.3-green)](https://better-auth.com/)

[Demo](https://resumematch.felipes.dev) • [API Docs](https://api.resumematch.felipes.dev/docs) • [Features](#-features)

</div>

---

## 📋 Table of Contents

- [About](#-about)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [License](#-license)

---

## 🎯 About

**ResumeMatch** is an open-source AI-powered SaaS platform that helps job seekers optimize their resumes for specific job postings. Using advanced AI analysis, it identifies compatibility gaps, suggests improvements, and generates personalized application materials.

### Why ResumeMatch?

- 🎯 **ATS Optimization**: Increase your chances of passing Applicant Tracking Systems
- 🤖 **AI-Powered Analysis**: Deep analysis using Claude/GPT models
- 📊 **Actionable Insights**: Get specific, data-driven recommendations
- 💰 **Open Source**: Free forever with optional premium features
- ⚡ **Modern Stack**: Built with cutting-edge technologies

### Problem We Solve

90% of large companies use ATS systems that filter out resumes before human review. Most job seekers don't know how to optimize their CVs for these systems, losing opportunities. Existing solutions (Jobscan, Zety) are expensive and closed-source.

---

## ✨ Features

### 🚀 Current Features (MVP v1.0)

- ✅ **Job Description Analysis**
  - Parse job postings from URL or text
  - Extract keywords, requirements, and skills
  - Identify must-have vs. nice-to-have qualifications

- ✅ **Resume Compatibility Score** ✨ NEW
  - Calculate match percentage with job posting (0-100%)
  - Visual breakdown by category (Skills 40%, Experience 30%, Keywords 20%, Education 10%)
  - Identify critical gaps with importance levels
  - AI-powered gap analysis and recommendations
  - Accessible via `/compare` page

- ✅ **Keyword Analysis**
  - Show missing keywords with frequency
  - Prioritize by importance
  - Suggest natural integration points

- ✅ **PDF Report Generation**
  - Comprehensive analysis report
  - Downloadable and shareable
  - Professional formatting

- ✅ **User Dashboard**
  - Track analysis history
  - Compare multiple job applications
  - Export data

- ✅ **Authentication & User Management**
  - Secure sign-up/login
  - OAuth providers (Google, GitHub)
  - Profile management

### 🔮 Coming Soon

- 🔄 **AI Resume Reformulation** (v1.1 - Dec 2025)
- 📝 **Cover Letter Generator** (v1.1 - Dec 2025)
- 🎥 **Mock Interview with AI** (v2.0 - Q1 2026)
- 🔗 **LinkedIn Integration** (v2.0 - Q1 2026)
- 🏢 **B2B API for Recruiters** (v2.5 - Q2 2026)

---

## 🛠 Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5.9
- **UI Library**: React 19
- **Styling**: TailwindCSS 4 + Shadcn/UI
- **State Management**: TanStack Query (React Query)
- **Forms**: TanStack Form + Zod
- **HTTP Client**: Axios

### Backend
- **Framework**: NestJS 11
- **HTTP Server**: Fastify (via NestJS adapter)
- **Language**: TypeScript 5.9
- **Database**: PostgreSQL (Neon Serverless)
- **ORM**: Drizzle ORM
- **AI Integration**: AI SDK (Anthropic/OpenAI)
- **Authentication**: Better Auth
- **API**: RESTful API with Swagger/OpenAPI

### Infrastructure
- **Frontend Hosting**: Vercel
- **Backend Hosting**: Railway / Render
- **Database**: Neon (Serverless Postgres)
- **Storage**: AWS S3 (PDFs, documents)
- **Monitoring**: Sentry
- **Analytics**: PostHog

### DevOps
- **Monorepo**: Turborepo
- **Package Manager**: pnpm
- **Code Quality**: Biome, Oxlint, Ultracite
- **Testing**: Jest (backend)

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed:

- **Node.js** >= 20.x
- **pnpm** >= 10.x
- **PostgreSQL** >= 16.x (or Neon account)
- **Redis** >= 7.x (optional, for development)

### Installation

1. **Clone the repository**
   ```
   git clone https://github.com/felipesdotdev/ResumeMatch.git
   cd ResumeMatch
   ```

2. **Install dependencies**
   ```
   pnpm install
   ```

3. **Set up environment variables**

   Create `.env` file in `apps/server/` with:
   ```bash
   DATABASE_URL=your_postgresql_connection_string
   CORS_ORIGIN=http://localhost:3001
   PORT=3000
   
   # AI Provider (choose one or multiple - priority: Anthropic > Groq > OpenAI)
   # Option 1: Anthropic Claude (best accuracy for structured extraction)
   # Get API key from https://console.anthropic.com/
   ANTHROPIC_API_KEY=sk-ant-api03-...
   
   # Option 2: Groq (very fast and cost-effective, great performance)
   # Get API key from https://console.groq.com/
   # GROQ_API_KEY=gsk_...
   
   # Option 3: OpenAI (reliable fallback)
   # Get API key from https://platform.openai.com/api-keys
   # OPENAI_API_KEY=sk-...
   ```

   Create `.env.local` or `.env` file in `apps/web/` with:
   ```bash
   NEXT_PUBLIC_SERVER_URL=http://localhost:3000
   ```
   
   **Note**: 
   - **Priority order**: Anthropic Claude → Groq → OpenAI → Basic parsing
   - **Anthropic Claude**: Best accuracy for structured data extraction
   - **Groq**: Very fast, cost-effective, excellent performance (uses Llama 3 70B)
   - **OpenAI GPT-4**: Reliable fallback option
   - If no AI provider is configured, uses basic text parsing as fallback (less accurate)
   - See `.env.example` in the root directory for a template

4. **Push database schema**
   ```
   pnpm db:push
   ```

5. **Start development servers**
   ```
   # Start all services (frontend + backend)
   pnpm dev

   # Or start individually
   pnpm dev:web      # Frontend only
   pnpm dev:server   # Backend only
   ```

6. **Open your browser**
   - Frontend: [http://localhost:3001](http://localhost:3001)
   - Backend API: [http://localhost:3000](http://localhost:3000)
   - API Docs: [http://localhost:3000/docs](http://localhost:3000/docs)

### Quick Start Commands

```
# Development
pnpm dev              # Start all services
pnpm dev:web          # Start frontend only (port 3001)
pnpm dev:server       # Start backend only (port 3000)

# Build
pnpm build            # Build all apps

# Database
pnpm db:generate      # Generate migrations
pnpm db:migrate       # Run migrations
pnpm db:push          # Push schema changes
pnpm db:studio        # Open Drizzle Studio

# Code Quality
pnpm check            # Run Oxlint
pnpm check-types      # TypeScript check
```

---

## 📁 Project Structure

```
resumematch/
├── apps/
│   ├── web/                 # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/         # App Router pages
│   │   │   ├── components/  # React components
│   │   │   └── lib/         # Utilities & API client
│   │   └── package.json
│   │
│   └── server/              # NestJS backend
│       ├── src/
│       │   ├── filters/     # Exception filters
│       │   ├── app.module.ts
│       │   ├── app.controller.ts
│       │   └── main.ts       # Entry point
│       └── package.json
│
├── packages/
│   ├── db/                  # Drizzle schema & database helpers
│   │   ├── src/
│   │   │   ├── schema/        # Database schemas (auth, todo)
│   │   │   └── index.ts      # Database instance & helpers
│   │   └── drizzle.config.ts
│   │
│   ├── api/                 # NestJS API modules
│   │   ├── src/
│   │   │   ├── todos/        # Todos feature module
│   │   │   ├── database/     # Database module
│   │   │   └── api.module.ts
│   │   └── package.json
│   │
│   ├── api-client/          # Generated API client
│   │   ├── src/
│   │   │   └── api.ts        # Type-safe API client
│   │   └── orval.config.ts
│   │
│   └── auth/                # Better Auth configuration
│       └── src/
│           └── index.ts      # Auth instance
│
├── pnpm-workspace.yaml      # Workspace configuration
├── turbo.json               # Turborepo configuration
├── biome.json               # Biome linter/formatter config
├── LICENSE                  # MIT License
└── README.md                # This file
```

---

## 📚 Documentation

This project is built with Better-T-Stack CLI and follows a monorepo structure with:
- **Frontend**: Next.js 16 with App Router
- **Backend**: NestJS 11 with Fastify adapter
- **Database**: Drizzle ORM with PostgreSQL (Neon)
- **Authentication**: Better Auth

For API documentation, visit `/docs` endpoint when the server is running.

---

## 🤝 Contributing

We welcome contributions from the community! Whether it's:

- 🐛 Bug reports
- 💡 Feature requests
- 📝 Documentation improvements
- 🔧 Code contributions

### Quick Contribution Steps

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes following commit lint convention
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the **MIT License** - see the [LICENSE](./LICENSE) file for details.

---

## 🙏 Acknowledgments

- Built with inspiration from Jobscan and Zety
- Powered by Claude AI (Anthropic)
- UI components from Shadcn/UI
- Community contributions from amazing developers

---

## 📬 Contact & Support

- **Author**: Luis Felipe
- **Email**: [contato@felipes.dev](mailto:contato@felipes.dev)
- **LinkedIn**: [/felipesdev](https://www.linkedin.com/in/felipesdev)
- **GitHub**: [@felipesdotdev](https://github.com/felipesdotdev)

**Found a bug?** [Open an issue](https://github.com/felipesdotdev/ResumeMatch/issues/new)

**Have questions?** [Start a discussion](https://github.com/felipesdotdev/ResumeMatch/discussions)

---

<div align="center">

Made with ❤️ by [Luis Felipe](https://github.com/felipesdotdev)

⭐ Star this repo if you find it helpful!

</div>