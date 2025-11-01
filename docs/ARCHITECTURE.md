# 🏗 Architecture Documentation

## Table of Contents

- [System Overview](#system-overview)
- [Architecture Principles](#architecture-principles)
- [System Architecture](#system-architecture)
- [Data Flow](#data-flow)
- [Technology Decisions](#technology-decisions)
- [Security](#security)
- [Scalability](#scalability)

---

## System Overview

ResumeMatch is a **full-stack TypeScript application** built as a modern monorepo using Turborepo. The system consists of three main layers:

1. **Presentation Layer** (Next.js)
2. **Application Layer** (NestJS)
3. **Data Layer** (PostgreSQL + Redis)

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Client (Browser)                    │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ HTTPS
                     │
┌────────────────────▼────────────────────────────────────┐
│               Frontend (Next.js 16)                     │
│  ┌─────────────────────────────────────────────────┐    │
│  │  -  React Server Components                     │    │
│  │  -  TanStack Query (data fetching)              │    │
│  │  -  Shadcn/UI components                        │    │
│  └─────────────────────────────────────────────────┘    │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ REST API
                     │
┌────────────────────▼────────────────────────────────────┐
│              Backend (NestJS + Fastify)                 │
│  ┌─────────────────────────────────────────────────┐    │
│  │  App Module (NestJS)                            │    │
│  │  - API Module (packages/api)                    │    │
│  │  - Todos Module                                 │    │
│  │  - Better Auth Integration                      │    │
│  └─────────────────────────────────────────────────┘    │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────┼───────────┐
         │           │           │
┌────────▼──────┐ ┌─▼────────┐ ┌▼────────────┐
│  PostgreSQL   │ │  AI APIs │ │  (Future)   │
│  (Neon)       │ │  (Claude)│ │  Redis/Cache│
│  (Drizzle)    │ └──────────┘ └─────────────┘
└───────────────┘
```

---

## Architecture Principles

### 1. **Separation of Concerns**
- Frontend focuses solely on UI/UX
- Backend handles business logic and data access
- Database layer is abstracted via Drizzle ORM

### 2. **Type Safety End-to-End**
- TypeScript everywhere (frontend, backend, database)
- Shared types via monorepo packages
- Zod for runtime validation

### 3. **Performance First**
- Fastify for 2-3x faster HTTP handling
- Redis caching for AI responses
- React Server Components for optimal loading
- Drizzle for zero-overhead SQL queries

### 4. **Scalability by Design**
- Stateless backend (horizontal scaling ready)
- Queue-based async processing (Bull)
- Database connection pooling
- CDN for static assets

### 5. **Security**
- Environment variable validation (Zod)
- Rate limiting (@fastify/rate-limit)
- Input sanitization (Zod + DTOs)
- Secure authentication (Better Auth)
- Helmet for security headers

---

## System Architecture

### Frontend Architecture (Next.js)

```
apps/web/
├── src/
│   ├── app/                    # App Router
│   │   ├── login/              # Auth page
│   │   ├── dashboard/          # Protected routes
│   │   ├── todos/              # Todos feature
│   │   ├── ai/                 # AI chat page
│   │   ├── page.tsx            # Home page
│   │   └── layout.tsx         # Root layout
│   │
│   ├── components/
│   │   ├── ui/                 # Shadcn UI components
│   │   ├── header.tsx          # Navigation header
│   │   ├── providers.tsx       # App providers
│   │   ├── sign-in-form.tsx    # Auth forms
│   │   └── user-menu.tsx       # User menu
│   │
│   ├── lib/
│   │   ├── api.ts              # REST API client
│   │   ├── auth-client.ts      # Better Auth client
│   │   └── utils.ts            # Helper functions
│   │
│   └── index.css               # Global styles
```

**Key Patterns:**
- **React Server Components** for data fetching
- **Client Components** for interactivity
- **TanStack Query** for client-side caching
- **Optimistic Updates** for better UX

---

### Backend Architecture (NestJS)

```
apps/server/
├── src/
│   ├── filters/                # Exception filters
│   │   └── all-exceptions.filter.ts
│   ├── app.module.ts          # Root module
│   ├── app.controller.ts       # Root controller
│   ├── app.service.ts         # Root service
│   └── main.ts                # Bootstrap (Fastify setup)

packages/api/
├── src/
│   ├── todos/                 # Todos feature module
│   │   ├── todos.controller.ts
│   │   ├── todos.module.ts
│   │   └── dto/               # Data Transfer Objects
│   ├── database/              # Database module
│   │   ├── database.module.ts
│   │   └── database.providers.ts
│   └── api.module.ts          # Main API module

packages/auth/
└── src/
    └── index.ts               # Better Auth configuration

packages/db/
└── src/
    ├── schema/                # Drizzle schemas
    │   ├── auth.ts
    │   └── todo.ts
    └── index.ts               # Database instance & helpers
```

**Key Patterns:**
- **Module-based architecture** (NestJS modules)
- **Monorepo packages** (api, auth, db)
- **Dependency Injection** (IoC container)
- **DTOs with validation** (Zod + NestJS)
- **RESTful API** with Swagger/OpenAPI
- **Better Auth** integration via Fastify routes

---

## Data Flow

### 1. API Request Flow

```
Client Request
         │
         ▼
┌────────────────────┐
│  Frontend (Next)   │  TanStack Query + Axios
└────────┬───────────┘
         │ REST API
         ▼
┌────────────────────┐
│  NestJS Controller │  Receives request, validates DTO
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  Service/Module    │  Business logic
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  Database Helpers  │  (packages/db)
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  PostgreSQL (Neon)│  Query via Drizzle ORM
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  Response DTO      │  Type-safe response
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  Frontend          │  React Query cache update
└────────────────────┘
```

### 2. Authentication Flow

```
User Login
         │
         ▼
┌────────────────────┐
│  Better Auth       │  Email/password or OAuth
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  Session Cookie    │  HttpOnly, Secure, SameSite
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  Protected Routes │  Session validation
└────────────────────┘
```

---

## Technology Decisions

### Why Next.js 16?
- **React Server Components**: Reduce bundle size, faster initial load
- **App Router**: Better routing, layouts, and loading states
- **Built-in optimization**: Image, font, script optimization
- **Vercel deployment**: Seamless CI/CD

### Why NestJS + Fastify?
- **NestJS**: Enterprise-grade architecture, built-in DI
- **Fastify**: 2-3x faster than Express, JSON schema validation
- **TypeScript-first**: Native TS support, no hacks
- **Scalable**: Modular, testable, maintainable

### Why Drizzle over Prisma?
- **Performance**: 4.3x smaller bundle, 2.7x less memory
- **Type inference**: Better TypeScript experience
- **SQL control**: Write real SQL, no ORM magic
- **No N+1 issues**: Proper JOIN generation

### Why PostgreSQL?
- **ACID compliance**: Critical for user data
- **JSON support**: Store flexible analysis data
- **Mature ecosystem**: Battle-tested, reliable
- **Neon**: Serverless, auto-scaling, cost-effective

### Why Better Auth?
- **Modern auth library**: Built for modern web frameworks
- **Type-safe**: Full TypeScript support
- **Flexible**: Supports multiple providers (email, OAuth)
- **Database adapter**: Works seamlessly with Drizzle
- **Secure**: Built-in security best practices

### Why REST API over tRPC?
- **Universal compatibility**: Any client can consume
- **OpenAPI/Swagger**: Auto-generated documentation
- **Client generation**: Type-safe clients via Orval
- **Standard protocols**: HTTP/REST is widely understood

---

## Security

### Authentication
- **Better Auth**: Modern authentication library
- **Session-based**: Secure cookie-based sessions
- **OAuth providers**: Support for multiple providers (configurable)
- **Email/password**: Standard email authentication
- **Secure cookies**: HttpOnly, Secure, SameSite: none (for CORS)

### Authorization
- **Role-based access control** (RBAC)
- **Guards**: Protect routes at controller level
- **Decorators**: Custom permission checks

### Data Protection
- **Input validation**: All inputs validated (Zod + DTOs)
- **SQL injection**: Drizzle prevents via parameterized queries
- **XSS protection**: React escapes by default
- **CORS**: Configured for cross-origin requests
- **Rate limiting**: @fastify/rate-limit (300 req/min)
- **Helmet**: Security headers via @fastify/helmet

### Secrets Management
- **Environment variables**: Never commit secrets
- **Validation**: Zod schemas validate env vars at startup
- **Separation**: Different secrets per environment

---

## Scalability

### Horizontal Scaling
- **Stateless backend**: Scale to N instances
- **Load balancer**: Distribute traffic (Nginx, AWS ALB)
- **Database pooling**: Neon serverless handles connections

### Vertical Scaling
- **Fastify performance**: Handle more requests per instance (2-3x faster than Express)
- **Drizzle efficiency**: Zero-overhead SQL queries
- **Compression**: @fastify/compress reduces payload size

### Future Scaling (Planned)
- **Redis caching**: Cache AI responses (expensive calls)
- **Queue-based processing**: Bull for async jobs
- **Multiple workers**: Scale analysis independently

### Database Optimization
- **Indexes**: On frequently queried columns
- **Connection pooling**: Reuse connections
- **Read replicas**: Separate read/write traffic (future)

---

## Monitoring & Observability

### Metrics
- **Sentry**: Error tracking, performance monitoring
- **PostHog**: User analytics, feature flags
- **Custom metrics**: API latency, queue length

### Logging
- **Structured logs**: JSON format (Pino)
- **Log levels**: Error, warn, info, debug
- **Context**: Request ID, user ID in logs

### Health Checks
- `/health`: Application health (via @fastify/under-pressure)
  - Event loop delay monitoring
  - Heap usage monitoring
  - RSS usage monitoring

---

## Current Architecture Status

### ✅ Implemented
- **Monorepo structure**: Turborepo with pnpm workspaces
- **NestJS backend**: RESTful API with Fastify
- **Better Auth**: Authentication system
- **Drizzle ORM**: Database abstraction
- **Type-safe API client**: Generated from OpenAPI spec
- **Swagger documentation**: Auto-generated API docs

### 🚧 Planned Improvements

#### Phase 2 (Q1 2026)
- **Redis integration**: Caching layer for AI responses
- **Queue system**: Bull for async job processing
- **Additional modules**: Analysis, Users modules
- **WebSocket support**: Real-time updates

#### Phase 3 (Q2 2026)
- **Microservices**: Split AI module into separate service
- **Multi-region**: Deploy to multiple regions
- **CDN**: CloudFlare for global edge caching
- **Kubernetes**: Container orchestration for scaling

---

**Last Updated**: November 2025  
**Maintained by**: [Luis Felipe](https://github.com/felipesdotdev)
```

***

## 📄 **FEATURES.md** (Especificação de Features)

```markdown
# ✨ Features Specification

Complete list of features, their status, and technical specifications.

---

## 🎯 Feature Status Legend

- ✅ **Implemented** - Feature is live and working
- 🚧 **In Progress** - Currently being developed
- 📋 **Planned** - Approved, in roadmap
- 💡 **Proposed** - Community suggestion, under review
- ❌ **Deprecated** - No longer supported

---

## Core Features (MVP v1.0)

### 1. User Authentication ✅

**Status**: Implemented  
**Version**: v1.0  
**Module**: `packages/auth` + Better Auth routes in `apps/server/src/main.ts`

**Description**: Complete authentication system using Better Auth.

**Capabilities**:
- Email/password registration and login
- OAuth integration (configurable providers)
- Session-based authentication
- Secure cookie management

**Technical Details**:
```
// Auth endpoints (Better Auth)
POST /api/auth/sign-up/email     // Create account
POST /api/auth/sign-in/email     // Sign in
POST /api/auth/sign-out          // Sign out
GET  /api/auth/session           // Get current session
POST /api/auth/forget-password   // Request password reset
POST /api/auth/reset-password    // Reset password
```

**Security**:
- Better Auth handles password hashing
- Session cookies: HttpOnly, Secure, SameSite: none (for CORS)
- Rate limiting: 300 requests per minute (via @fastify/rate-limit)
- CORS enabled with credentials

---

### 2. Todos Management ✅

**Status**: Implemented  
**Version**: v1.0  
**Module**: `packages/api/src/todos`

**Description**: Complete CRUD operations for todo items.

**Capabilities**:
- Create new todos
- List all todos
- Update todo (title and completion status)
- Delete todos
- Real-time UI updates

**Technical Details**:
```
GET    /todos           // List all todos
GET    /todos/:id       // Get single todo
POST   /todos           // Create todo
PATCH  /todos/:id       // Update todo
DELETE /todos/:id       // Delete todo
```

**Frontend**: `apps/web/src/app/todos/page.tsx`

---

### 3. User Dashboard ✅

**Status**: Implemented (Basic)  
**Version**: v1.0  
**Module**: `apps/web/src/app/dashboard`

**Description**: Basic user dashboard with session display.

**Capabilities**:
- Display user session information
- Protected route with authentication check
- User name display

**Future Enhancements**:
- Analysis history (planned)
- Comparison tools (planned)
- Report downloads (planned)

---

### 4. Job Description Analysis 📋

**Status**: Planned  
**Version**: v1.1  
**Module**: `packages/api/src/analysis` (planned)

**Description**: Parse and analyze job postings to extract key information.

**Capabilities**:
- Parse job URL (auto-scrape description)
- Accept manual job description text
- Extract:
  - Required skills and qualifications
  - Preferred skills
  - Years of experience
  - Job title and company
  - Industry keywords
  - Soft skills requirements

**Technical Details**:
```
POST /api/analysis/job
Body: {
  url?: string;
  text?: string;
}

Response: {
  jobId: string;
  title: string;
  company: string;
  requiredSkills: string[];
  preferredSkills: string[];
  keywords: { word: string; frequency: number }[];
}
```

**AI Integration**:
- Uses Claude 3.5 Sonnet for parsing
- Fallback to GPT-4 if Claude fails
- Structured output with JSON schema
- Cached for 24 hours (same URL)

---

### 5. Resume Upload & Parsing 📋

**Status**: Planned  
**Version**: v1.1  
**Module**: `packages/api/src/todos` (current), `packages/api/src/analysis` (planned)

**Description**: Accept and parse resume files.

**Capabilities**:
- File upload (PDF, DOCX)
- Text extraction
- Section detection (Education, Experience, Skills)
- Skill extraction
- Contact info parsing

**Technical Details**:
```
POST /api/analysis/resume
Body: multipart/form-data
  file: File (max 5MB)

Response: {
  resumeId: string;
  text: string;
  skills: string[];
  experience: Experience[];
  education: Education[];
}
```

**File Processing**:
- Max file size: 5 MB
- Supported formats: PDF, DOCX
- Text extraction: pdf-parse, mammoth
- Storage: AWS S3 (encrypted at rest)

---

### 6. Compatibility Score Calculation 📋

**Status**: Planned  
**Version**: v1.1  
**Module**: `packages/api/src/todos` (current), `packages/api/src/analysis` (planned)

**Description**: Calculate match percentage between resume and job.

**Capabilities**:
- Overall compatibility score (0-100%)
- Breakdown by category:
  - Skills match (40% weight)
  - Experience match (30% weight)
  - Keywords match (20% weight)
  - Education match (10% weight)

**Algorithm**:
```
// Simplified version
function calculateScore(resume, job) {
  const skillsScore = matchSkills(resume.skills, job.requiredSkills);
  const experienceScore = matchExperience(resume.experience, job.experience);
  const keywordsScore = matchKeywords(resume.text, job.keywords);
  const educationScore = matchEducation(resume.education, job.education);

  return (
    skillsScore * 0.4 +
    experienceScore * 0.3 +
    keywordsScore * 0.2 +
    educationScore * 0.1
  );
}
```

**Output**:
```
{
  "overallScore": 67,
  "breakdown": {
    "skills": { "score": 70, "weight": 0.4 },
    "experience": { "score": 65, "weight": 0.3 },
    "keywords": { "score": 60, "weight": 0.2 },
    "education": { "score": 80, "weight": 0.1 }
  }
}
```

---

### 7. Gap Analysis & Recommendations 📋

**Status**: Planned  
**Version**: v1.1  
**Module**: `packages/api/src/todos` (current), `packages/api/src/analysis` (planned)

**Description**: Identify missing elements and suggest improvements.

**Capabilities**:
- Identify missing required skills
- Highlight missing keywords
- Suggest experience improvements
- Recommend education additions (if applicable)

**Output**:
```
{
  "criticalGaps": [
    {
      "type": "skill",
      "missing": "Docker",
      "frequency": 8,
      "importance": "high"
    }
  ],
  "suggestions": [
    {
      "section": "experience",
      "current": "Worked with databases",
      "suggested": "Architected and scaled PostgreSQL databases handling 1M+ records"
    }
  ]
}
```

---

### 8. PDF Report Generation 📋

**Status**: Planned  
**Version**: v1.1  
**Module**: `packages/api/src/todos` (current), `packages/api/src/analysis` (planned)

**Description**: Generate professional analysis reports.

**Capabilities**:
- Comprehensive analysis summary
- Visual compatibility score
- Gap analysis breakdown
- Actionable recommendations
- Downloadable PDF

**Technical Details**:
- Library: PDFKit
- Template: Custom design
- Storage: S3 with expiring links (7 days)
- Size: Avg 500KB per report

---

### 9. AI Chat 💡

**Status**: Implemented (Basic)  
**Version**: v1.0  
**Module**: `apps/web/src/app/ai`

**Description**: AI chat interface (example feature from Better-T-Stack).

**Note**: This is a basic AI chat example. Full resume analysis features are planned.

---

## Planned Features (v1.1 - Q2 2026)

### 10. AI Resume Reformulation 📋

**Status**: Planned  
**Target**: Q2 2026  
**Module**: `packages/api/src/ai` (planned)

**Description**: AI-powered resume text improvements.

**Capabilities**:
- Rewrite bullet points with better impact
- Suggest 2-3 alternatives per section
- Maintain truthfulness (no fabrication)
- Match tone to job description
- Include job-specific keywords naturally

**Example**:
```
Input: "Worked with React"

Output Options:
1. "Developed responsive web applications using React 18"
2. "Built and maintained React components with TypeScript"
3. "Architected React-based frontend serving 10k+ daily users"
```

---

### 11. Cover Letter Generator 📋

**Status**: Planned  
**Target**: Q2 2026  
**Module**: `packages/api/src/ai` (planned)

**Description**: Auto-generate personalized cover letters.

**Capabilities**:
- Based on resume + job description
- Personalized to user's experience
- Multiple tone options (formal, casual, enthusiastic)
- Editable template
- Export to PDF/DOCX

**Template Structure**:
1. Opening (why this role)
2. Relevant experience (2-3 highlights)
3. Cultural fit
4. Call to action

---

### 12. Batch Analysis 📋

**Status**: Planned  
**Target**: Q2 2026  
**Module**: `packages/api/src/analysis` (planned)

**Description**: Analyze multiple jobs at once.

**Capabilities**:
- Upload list of job URLs
- Compare compatibility across all jobs
- Rank jobs by match score
- Export comparison table

**Use Case**: User applies to 20 jobs, wants to know which to prioritize.

---

## Future Features (v2.0 - Q3 2026)

### 13. Mock Interview with AI 💡

**Status**: Proposed  
**Target**: Q3 2026  
**Module**: `packages/api/src/interview` (planned)

**Description**: Practice interviews with AI feedback.

**Capabilities**:
- Speech-to-text interview simulation
- Common interview questions based on job
- Real-time feedback on:
  - Clarity and conciseness
  - Keywords mentioned
  - Confidence (tone analysis)
- Video recording option
- Scoring and improvement tips

**Tech Stack**:
- Speech-to-text: Whisper API
- AI evaluation: Claude with custom prompt
- Video: WebRTC recording

---

### 14. LinkedIn Integration 💡

**Status**: Proposed  
**Target**: Q3 2026  
**Module**: `packages/api/src/integrations` (planned)

**Description**: Sync and analyze LinkedIn profile.

**Capabilities**:
- Import LinkedIn profile
- Compare LinkedIn vs. Resume consistency
- Suggest LinkedIn headline improvements
- Optimize LinkedIn summary with keywords

---

### 15. Chrome Extension 💡

**Status**: Proposed  
**Target**: Q4 2026

**Description**: Browser extension for instant analysis.

**Capabilities**:
- One-click analysis on job posting pages
- Works on LinkedIn, Indeed, Glassdoor
- Quick compatibility score overlay
- Deep dive link to full analysis

---

## B2B Features (v2.5 - Q4 2026)

### 16. Recruiter API 💡

**Status**: Proposed  
**Target**: Q4 2026  
**Module**: `packages/api/src/recruiter` (planned)

**Description**: API for recruiters to analyze candidate resumes.

**Capabilities**:
- Bulk resume analysis
- Ranking candidates by job fit
- Automated screening
- Integration with ATS systems

**Pricing**: R$ 999/month for 500 analyses

---

### 17. White-Label Solution 💡

**Status**: Proposed  
**Target**: Q1 2027

**Description**: Customizable ResumeMatch for enterprises.

**Capabilities**:
- Custom branding
- On-premise deployment option
- SSO integration
- Custom AI prompts
- Dedicated support

**Pricing**: Custom (starting at R$ 5,000/month)

---

## Community Requested Features

### 18. Multi-Language Support 💡

**Status**: Under Review  
**Votes**: 45 upvotes

**Description**: Support resumes/jobs in multiple languages.

**Supported Languages** (proposed):
- Portuguese (BR)
- English (US/UK)
- Spanish (ES/LATAM)

---

### 19. ATS Simulator 💡

**Status**: Under Review  
**Votes**: 38 upvotes

**Description**: Simulate actual ATS parsing.

**Capability**: Show how major ATS systems (Greenhouse, Lever, Workday) would parse the user's resume.

---

**Last Updated**: November 2025  
**Feature Requests**: [Submit here](https://github.com/felipesdotdev/ResumeMatch/issues/new?template=feature_request.md)