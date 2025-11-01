# 🤝 Contributing to ResumeMatch

Thank you for your interest in contributing! We welcome contributions from developers of all skill levels.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Commit Messages](#commit-messages)
- [Testing](#testing)

---

## Code of Conduct

This project adheres to a Code of Conduct. By participating, you agree to:

- Be respectful and inclusive
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy towards others

---

## Getting Started

### Prerequisites

- Node.js >= 20.x
- pnpm >= 10.x (specified in packageManager)
- PostgreSQL >= 16.x (or Neon account)
- Basic TypeScript knowledge

### Setup

1. **Fork the repository**
2. **Clone your fork**
   ```
   git clone https://github.com/YOUR_USERNAME/ResumeMatch.git
   cd ResumeMatch
   ```

3. **Install dependencies**
   ```
   pnpm install
   ```

4. **Set up environment variables**

   Create `.env` file in `apps/server/`:
   ```
   DATABASE_URL=your_postgresql_connection_string
   CORS_ORIGIN=http://localhost:3001
   PORT=3000
   ```

   Create `.env.local` or `.env` file in `apps/web/`:
   ```
   NEXT_PUBLIC_SERVER_URL=http://localhost:3000
   ```

5. **Push database schema**
   ```
   pnpm db:push
   ```

6. **Start development servers**
   ```
   # Start all services (frontend + backend)
   pnpm dev

   # Or start individually
   pnpm dev:web      # Frontend only (port 3001)
   pnpm dev:server   # Backend only (port 3000)
   ```

7. **Access the application**
   - Frontend: http://localhost:3001
   - Backend API: http://localhost:3000
   - API Docs: http://localhost:3000/docs

---

## Development Workflow

### 1. Create a Branch

```
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

**Branch Naming**:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation
- `refactor/` - Code refactoring
- `test/` - Adding tests

### 2. Make Changes

- Write clean, readable code
- Follow existing code style
- Add tests for new features
- Update documentation if needed

### 3. Test Your Changes

```
# Type checking
pnpm check-types

# Code quality (Oxlint)
pnpm check

# Format code (Biome)
pnpm -F <package-name> format

# Lint specific package
pnpm -F <package-name> lint

# Run tests (if available in package)
pnpm -F <package-name> test
```

**Note**: Test scripts are workspace-specific. Check individual package.json files for available commands.

### 4. Commit

```
git add .
git commit -m "feat: add resume reformulation feature"
```

See [Commit Messages](#commit-messages) for format.

### 5. Push

```
git push origin feature/your-feature-name
```

### 6. Open Pull Request

Go to GitHub and create a PR from your branch.

---

## Pull Request Process

### Before Submitting

- ✅ Code passes type checking (`pnpm check-types`)
- ✅ Code quality check passes (`pnpm check`)
- ✅ Follows code style (Biome formatter)
- ✅ Documentation updated (if needed)
- ✅ Commit messages follow Conventional Commits

### PR Template

```
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
Describe tests you ran

## Screenshots (if applicable)

## Checklist
- [ ] Tests pass
- [ ] Code follows style guide
- [ ] Documentation updated
```

### Review Process

1. Maintainer reviews code
2. Feedback provided (if needed)
3. You address feedback
4. Approved and merged

---

## Coding Standards

### TypeScript

```
// ✅ Good
export async function analyzeResume(
  resumeId: string,
  options: AnalysisOptions
): Promise<AnalysisResult> {
  const resume = await getResume(resumeId);
  return performAnalysis(resume, options);
}

// ❌ Bad
export async function analyze(id, opts) {
  const r = await get(id);
  return doAnalysis(r, opts);
}
```

**Key Points**:
- Use explicit types (avoid `any`)
- Prefer `async/await` over promises
- Use proper error handling
- Follow strict TypeScript configuration

### React Components

```
// ✅ Good
interface AnalysisCardProps {
  analysis: Analysis;
  onView: (id: string) => void;
}

export function AnalysisCard({ analysis, onView }: AnalysisCardProps) {
  return (
    <div className="rounded-lg border p-4">
      <h3>{analysis.jobTitle}</h3>
      <Button onClick={() => onView(analysis.id)}>View</Button>
    </div>
  );
}

// ❌ Bad
export function Card(props) {
  return <div>{props.children}</div>;
}
```

**Key Points**:
- Use TypeScript interfaces for props
- Prefer function components
- Use proper props destructuring
- Follow Next.js App Router patterns

### Naming Conventions

- **Files**: `kebab-case.ts`
- **Components**: `PascalCase.tsx`
- **Functions**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Interfaces**: `PascalCase` (no `I` prefix)

---

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/).

### Format

```
<type>(<scope>): <subject>

<body> (optional)

<footer> (optional)
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

### Examples

```
feat(analysis): add resume reformulation

Implements AI-powered resume text improvements
using Claude API with custom prompts.

Closes #123
```

```
fix(auth): resolve session expiration issue

Better Auth sessions were expiring too quickly. 
Updated session configuration for better UX.
```

```
docs(readme): update installation instructions
```

---

## Testing

### Testing Structure

This project uses Jest for backend testing. Test files should follow the naming convention:
- Unit tests: `*.spec.ts`
- E2E tests: `*.e2e-spec.ts` (in `test/` directory)

### Example Unit Test

```
// todos.controller.spec.ts
import { Test } from '@nestjs/testing';
import { TodosController } from './todos.controller';

describe('TodosController', () => {
  let controller: TodosController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [TodosController],
    }).compile();

    controller = module.get<TodosController>(TodosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
```

### Running Tests

```
# Run backend tests
pnpm -F server test

# Run tests in watch mode
pnpm -F server test:watch

# Run E2E tests
pnpm -F server test:e2e
```

**Note**: Frontend testing setup is planned. Currently, manual testing and type checking are the primary validation methods.

---

## Areas for Contribution

### 🟢 Good First Issues

- Documentation improvements
- UI/UX enhancements
- Bug fixes
- Adding tests

### 🟡 Intermediate

- New features (from roadmap)
- Performance optimizations
- Refactoring

### 🔴 Advanced

- Architecture changes
- New integrations
- Scaling improvements

[View open issues →](https://github.com/felipesdotdev/ResumeMatch/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)

---

## Development Tips

### Monorepo Structure

This project uses a Turborepo monorepo with pnpm workspaces:

- `apps/web/` - Next.js frontend
- `apps/server/` - NestJS backend
- `packages/api/` - Shared API modules
- `packages/auth/` - Authentication logic
- `packages/db/` - Database schemas and helpers
- `packages/api-client/` - Generated API client

### Working with Packages

```
# Build a specific package
pnpm -F @resumematch/api build

# Run dev mode for a package
pnpm -F @resumematch/db dev

# Add dependency to a workspace
pnpm -F server add <package-name>
```

### Code Quality Tools

- **Biome**: Formatting and linting (primary tool)
- **Oxlint**: Fast linting (`pnpm check`)
- **TypeScript**: Type checking (`pnpm check-types`)
- **Ultracite**: Extended linting rules

### Database Commands

```
pnpm db:push      # Push schema changes (development)
pnpm db:generate  # Generate migration files
pnpm db:migrate   # Run migrations
pnpm db:studio    # Open Drizzle Studio
```

## Questions?

- 📧 **Email**: [contato@felipes.dev](mailto:contato@felipes.dev)
- 💬 [Discussions](https://github.com/felipesdotdev/ResumeMatch/discussions)
- 📝 Open an issue for questions
- 🔍 Check existing documentation in `/docs`

---

Thank you for contributing! 🎉