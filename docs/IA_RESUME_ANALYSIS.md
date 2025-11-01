# 🤖 Análise de IA para Currículo - Documentação Técnica

## 📋 Visão Geral

A página `/resume` (`http://localhost:3001/resume`) oferece análise automatizada de currículos usando Inteligência Artificial. O sistema extrai informações estruturadas de um texto de currículo, organizando em categorias como habilidades, experiência profissional e formação acadêmica.

---

## 🎯 Funcionalidades Principais

### 1. **Análise de Currículo em Tempo Real**
- **Streaming**: Análise progressiva com resultados aparecendo em tempo real (quando suportado pelo provedor de IA)
- **Análise Tradicional**: Fallback para análise completa ao final do processamento
- **Feedback Visual**: Interface mostra resultados conforme são processados

### 2. **Extração de Informações Estruturadas**

A IA extrai automaticamente:

#### ✅ **Habilidades (Skills)**
- Linguagens de programação
- Frameworks e bibliotecas
- Ferramentas e tecnologias
- Skills técnicas em geral

#### 💼 **Experiência Profissional (Experience)**
Para cada posição extrai:
- **Título**: Cargo ou posição
- **Empresa**: Nome da empresa
- **Data de Início**: Formato MM/YYYY ou YYYY
- **Data de Término**: MM/YYYY, YYYY, ou `null` se posição atual
- **Descrição**: Responsabilidades e conquistas

#### 🎓 **Formação Acadêmica (Education)**
Para cada formação extrai:
- **Grau**: Nome do curso (ex: "Bachelor of Science")
- **Instituição**: Universidade ou escola
- **Campo**: Área de estudo (opcional)
- **Data de Graduação**: MM/YYYY ou YYYY (opcional)

### 3. **Persistência de Dados**
- Após análise, os resultados são salvos no banco de dados PostgreSQL
- Cada análise é associada ao usuário logado
- Histórico completo de análises pode ser acessado posteriormente

---

## 🏗️ Arquitetura Técnica

### Fluxo de Dados

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (Next.js)                                      │
│  ┌───────────────────────────────────────────────────┐  │
│  │  /resume page                                      │  │
│  │  - Textarea para input                            │  │
│  │  - useObject hook (@ai-sdk/react)                 │  │
│  │  - Display de resultados em tempo real            │  │
│  └────────────────────┬──────────────────────────────┘  │
│                       │                                  │
│                       │ POST /api/analysis/resume/stream│
│                       ▼                                  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Next.js API Route Proxy                          │  │
│  │  apps/web/src/app/api/analysis/resume/stream/     │  │
│  └────────────────────┬──────────────────────────────┘  │
└───────────────────────┼──────────────────────────────────┘
                        │
                        │ HTTP Stream
                        │
┌───────────────────────▼──────────────────────────────────┐
│  Backend (NestJS + Fastify)                               │
│  ┌───────────────────────────────────────────────────┐    │
│  │  AnalysisController                              │    │
│  │  POST /analysis/resume/stream                    │    │
│  └────────────────────┬──────────────────────────────┘    │
│                       │                                    │
│                       ▼                                    │
│  ┌───────────────────────────────────────────────────┐    │
│  │  AnalysisService                                  │    │
│  │  - streamResume()                                 │    │
│  │  - analyzeResume()                                │    │
│  └────────────────────┬──────────────────────────────┘    │
│                       │                                    │
│                       ▼                                    │
│  ┌───────────────────────────────────────────────────┐    │
│  │  AIService                                        │    │
│  │  - Suporte múltiplos provedores                  │    │
│  │  - Streaming com streamObject()                  │    │
│  │  - Análise completa com generateStructuredObject()│    │
│  └────────────────────┬──────────────────────────────┘    │
│                       │                                    │
│                       ▼                                    │
│  ┌───────────────────────────────────────────────────┐    │
│  │  Provedores de IA                                 │    │
│  │  - Anthropic Claude 3.5 Sonnet                    │    │
│  │  - OpenAI GPT-4o                                   │    │
│  │  - Groq (openai/gpt-oss-20b)                      │    │
│  └────────────────────┬──────────────────────────────┘    │
│                       │                                    │
│                       ▼                                    │
│  ┌───────────────────────────────────────────────────┐    │
│  │  Database (PostgreSQL via Drizzle)                │    │
│  │  - Tabela: resume                                 │    │
│  │  - Armazena texto, skills, experience, education   │    │
│  └───────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────┘
```

---

## 🔧 Componentes Principais

### **Frontend**

#### `apps/web/src/app/resume/page.tsx`
**Responsabilidades:**
- Interface do usuário para input de texto
- Controle de streaming vs análise tradicional
- Exibição de resultados em tempo real
- Integração com `useObject` hook do AI SDK
- Persistência final dos resultados

**Principais Estados:**
```typescript
- resumeText: string           // Texto do currículo
- useStreaming: boolean         // Se deve usar streaming
- finalResult: ResumeDto | null // Resultado final salvo
- error: string | null          // Mensagens de erro
```

**Fluxo:**
1. Usuário cola texto do currículo
2. Clica em "Analisar Currículo"
3. Se streaming habilitado → usa `/api/analysis/resume/stream`
4. Resultados aparecem progressivamente na tela
5. Ao finalizar, salva no banco via `/api/analysis/resume`
6. Se streaming falhar → fallback para análise tradicional

#### `apps/web/src/app/api/analysis/resume/stream/route.ts`
**Responsabilidades:**
- Proxy Next.js para backend NestJS
- Repasse de headers de autenticação
- Streaming de chunks sem buffering
- Preservação de headers HTTP corretos

---

### **Backend**

#### `packages/api/src/analysis/analysis.controller.ts`

**Endpoints:**

1. **POST `/analysis/resume`** (Não-streaming)
   - Autenticação obrigatória
   - Retorna análise completa após processamento
   - Salva resultado no banco de dados

2. **POST `/analysis/resume/stream`** (Streaming)
   - Autenticação opcional (pode funcionar sem login)
   - Retorna stream de chunks progressivos
   - Usa `toTextStreamResponse()` do AI SDK

3. **GET `/analysis/resume/:id`**
   - Recupera análise salva por ID
   - Retorna DTO completo

#### `packages/api/src/analysis/analysis.service.ts`

**Métodos Principais:**

```typescript
// Streaming (quando suportado)
streamResume(data: { text: string }): AsyncIterable<...> | null

// Análise completa
analyzeResume(data: {
  text: string;
  userId: string;
  fileUrl?: string;
  fileName?: string;
}): Promise<ResumeRecord>

// Fallback (se IA falhar)
analyzeResumeFallback(data: {...}): Promise<ResumeRecord>
```

**Estratégia de Fallback:**
- Se IA falhar (sem API key, rate limit, etc.)
- Usa parsing básico com regex
- Extrai skills básicos de lista predefinida
- Tenta detectar experiência e educação via padrões de texto

#### `packages/api/src/analysis/ai.service.ts`

**Provedores Suportados (Prioridade):**

1. **Anthropic Claude** (`claude-3-5-sonnet-20241022`)
   - ✅ Suporta streaming com structured outputs
   - ✅ Melhor qualidade de extração
   - ⚠️ Requer `ANTHROPIC_API_KEY`

2. **OpenAI** (`gpt-4o`)
   - ✅ Suporta streaming com structured outputs
   - ✅ Excelente qualidade
   - ⚠️ Requer `OPENAI_API_KEY`

3. **Groq** (`openai/gpt-oss-20b`)
   - ✅ Rápido e econômico
   - ❌ Não suporta streaming com structured outputs
   - ⚠️ Requer `GROQ_API_KEY`
   - ⚠️ Usa fallback para `generateText` com parsing manual

**Funcionalidades:**

- **Detecção Automática de Provedor**: Escolhe baseado em variáveis de ambiente
- **Normalização de Respostas**: Converte respostas inconsistentes (nulls, objetos vazios) para formato esperado
- **Parse de Datas**: Converte strings como "2020 - Presente" em `startDate` e `endDate`
- **Validação com Zod**: Garante estrutura correta antes de retornar

**Schema de Análise (Zod):**

```typescript
resumeAnalysisSchema = z.object({
  skills: z.array(z.string()),
  experience: z.array(
    z.object({
      title: z.string(),
      company: z.string(),
      startDate: z.string().nullable(),
      endDate: z.string().nullable(),
      description: z.string().nullable(),
    })
  ),
  education: z.array(
    z.object({
      degree: z.string(),
      institution: z.string(),
      field: z.string().nullable(),
      graduationDate: z.string().nullable(),
    })
  ),
});
```

---

## 🔄 Fluxo Detalhado: Streaming vs Não-Streaming

### **Modo Streaming (Recomendado)**

```
1. Usuário clica "Analisar Currículo"
   ↓
2. Frontend chama submitStreaming({ text: resumeText })
   ↓
3. useObject hook faz POST /api/analysis/resume/stream
   ↓
4. Next.js proxy encaminha para backend NestJS
   ↓
5. Backend: analysisService.streamResume()
   ↓
6. AIService.streamResumeText() → streamObject()
   ↓
7. Provedor IA (Claude/OpenAI) começa a processar
   ↓
8. Chunks são enviados progressivamente via HTTP stream
   ↓
9. Frontend recebe chunks e atualiza UI em tempo real
   ↓
10. Quando completo → onFinish() callback
    ↓
11. Frontend salva no banco via analysisApi.analyzeResume()
    ↓
12. Resultado final persistido em PostgreSQL
```

**Vantagens:**
- Feedback imediato para o usuário
- Melhor experiência UX (não precisa esperar tudo)
- Pode cancelar se necessário

### **Modo Não-Streaming (Fallback)**

```
1. Usuário desativa streaming OU streaming não suportado
   ↓
2. Frontend chama handleAnalyzeRegular()
   ↓
3. POST /api/analysis/resume (via analysisApi)
   ↓
4. Backend: analysisService.analyzeResume()
   ↓
5. AIService.analyzeResumeText() → generateStructuredObject()
   ↓
6. Provedor IA processa completamente
   ↓
7. Resposta completa retornada de uma vez
   ↓
8. Resultado salvo no banco automaticamente
   ↓
9. Frontend exibe resultado completo
```

**Quando Usado:**
- Streaming não suportado (Groq sem structuredOutputs)
- Usuário desabilitou streaming manualmente
- Erro no streaming (fallback automático)

---

## 🛡️ Tratamento de Erros

### **Níveis de Fallback**

1. **IA Falha (sem API key, rate limit, etc.)**
   ```
   AIService → generateStructuredObject() falha
   ↓
   AnalysisService → catch error
   ↓
   analyzeResumeFallback() executado
   ↓
   Parsing básico com regex
   ```

2. **Streaming Não Suportado**
   ```
   Frontend → streaming retorna 404
   ↓
   onError() callback
   ↓
   setShouldUseStreaming(false)
   ↓
   handleAnalyzeRegular() chamado
   ```

3. **Erro na Validação**
   ```
   Zod schema validation falha
   ↓
   normalizeGroqResponse() tenta corrigir
   ↓
   Se ainda falhar → exceção lançada
   ```

### **Mensagens de Erro**

- **Frontend**: Exibe mensagens em português para o usuário
- **Backend**: Logs detalhados no console para debugging
- **Autenticação**: Se não logado, streaming funciona mas salvamento falha silenciosamente

---

## 📊 Schema de Banco de Dados

### Tabela `resume`

```sql
CREATE TABLE resume (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  file_url TEXT,
  file_name TEXT,
  file_size TEXT,
  text TEXT NOT NULL,
  skills JSON DEFAULT '[]',           -- string[]
  experience JSON DEFAULT '[]',       -- Experience[]
  education JSON DEFAULT '[]',        -- Education[]
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Tipos TypeScript:**

```typescript
type ResumeRecord = {
  id: string;
  userId: string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: string | null;
  text: string;
  skills: string[];
  experience: Array<{
    title: string;
    company: string;
    startDate?: string | null;
    endDate?: string | null;
    description?: string | null;
  }>;
  education: Array<{
    degree: string;
    institution: string;
    field?: string | null;
    graduationDate?: string | null;
  }>;
  createdAt: Date;
  updatedAt: Date;
};
```

---

## 🎨 Interface do Usuário

### Elementos Principais

1. **Textarea de Input**
   - Placeholder: "Cole aqui o conteúdo completo do seu currículo..."
   - Mínimo 300px de altura
   - Desabilitado durante análise

2. **Checkbox "Usar streaming"**
   - Habilitado por padrão
   - Permite alternar entre modos

3. **Botão "Analisar Currículo"**
   - Desabilitado quando não há texto
   - Mostra "Analisando..." durante processamento

4. **Cards de Resultado**
   - **Streaming**: Atualiza em tempo real conforme campos são preenchidos
   - **Final**: Exibe resultado completo após salvamento
   - Seções: Skills, Experience, Education

### Exemplo de Exibição

```typescript
// Skills
- JavaScript
- TypeScript
- React
- Node.js

// Experience
┌─────────────────────────────────┐
│ Senior Full Stack Developer     │
│ Tech Corp                       │
│ 2020 - Presente                 │
│ Desenvolvimento de aplicações...│
└─────────────────────────────────┘

// Education
┌─────────────────────────────────┐
│ Bachelor of Science             │
│ Universidade Federal            │
│ Computer Science               │
│ 2018                           │
└─────────────────────────────────┘
```

---

## 🔐 Autenticação

### **Streaming (Opcional)**
- Pode funcionar sem autenticação
- Permite teste rápido da funcionalidade
- Salvamento falha silenciosamente se não logado

### **Análise Regular (Obrigatória)**
- Requer usuário autenticado
- Usa `auth.api.getSession()` do Better Auth
- Retorna 401 se não autenticado

---

## 📈 Performance e Otimizações

### **Streaming**
- **Sem Buffering**: Chunks são enviados imediatamente
- **Incremental**: UI atualiza conforme dados chegam
- **Low Latency**: Primeiro chunk chega rapidamente

### **Backend**
- **Cache de Provedores**: Modelo selecionado uma vez por instância
- **Error Recovery**: Fallback automático para parsing básico
- **Logging**: Logs detalhados para debugging (podem ser removidos em produção)

### **Database**
- **JSON Fields**: Skills, experience, education armazenados como JSON
- **Indexes**: `userId` indexado para queries rápidas
- **Cascade Delete**: Currículos deletados quando usuário é removido

---

## 🧪 Casos de Uso

### 1. **Análise Básica de Currículo**
```
Input: Texto completo do currículo
Output: Skills, Experience, Education estruturados
```

### 2. **Análise em Tempo Real**
```
Input: Texto longo (2-3 páginas)
Processo: Streaming mostra resultados conforme IA processa
Resultado: UX melhor, usuário vê progresso
```

### 3. **Fallback Automático**
```
Cenário: IA indisponível (sem API key)
Processo: Parsing básico com regex
Resultado: Funcionalidade básica mantida
```

---

## 🚀 Melhorias Futuras (Planejadas)

1. **Upload de Arquivo**
   - Suporte para PDF e DOCX
   - Extração automática de texto
   - Processamento de imagens (OCR)

2. **Comparação com Vaga**
   - Compara currículo com descrição de vaga
   - Calcula score de compatibilidade
   - Sugestões de melhorias

3. **Análise de Gaps**
   - Identifica skills faltantes
   - Sugere melhorias no currículo
   - Recomendações personalizadas

4. **Histórico de Análises**
   - Lista de análises anteriores
   - Comparação entre versões
   - Exportação para PDF

---

## 📝 Notas Técnicas

### **Variáveis de Ambiente Necessárias**

```bash
# Pelo menos uma das seguintes:
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GROQ_API_KEY=gsk_...

# URLs
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
```

### **Dependências Principais**

```json
{
  "@ai-sdk/anthropic": "^0.0.x",
  "@ai-sdk/groq": "^0.0.x",
  "@ai-sdk/openai": "^0.0.x",
  "@ai-sdk/react": "^0.0.x",
  "ai": "^3.x.x",
  "zod": "^3.x.x"
}
```

### **Limitações Conhecidas**

1. **Groq sem Streaming**: Não suporta streaming com structured outputs
2. **Parsing Básico**: Fallback é limitado (lista pequena de skills)
3. **Idioma**: Funciona melhor com currículos em português/inglês
4. **Formato**: Requer texto limpo (sem formatação complexa)

---

## 🐛 Debugging

### **Logs Importantes**

```typescript
// Frontend
console.log("[Frontend] Streaming state:", {...})
console.log("[Frontend] streamingObject updated:", {...})

// Backend
console.log("[AIService] Using Anthropic Claude")
console.log("[AnalysisService] Starting AI resume analysis...")
console.log("[Stream] Sending chunk #X, size: Y bytes")
```

### **Problemas Comuns**

1. **"No AI provider configured"**
   - Solução: Configure uma das API keys

2. **"Streaming not supported"**
   - Solução: Usa análise regular ou configure Anthropic/OpenAI

3. **"Failed to parse AI response"**
   - Solução: Verifique formato do texto de input
   - Pode indicar problema com normalização Groq

---

## 📚 Referências

- **AI SDK**: [Vercel AI SDK Documentation](https://sdk.vercel.ai/docs)
- **Zod**: [Zod Schema Validation](https://zod.dev)
- **Drizzle ORM**: [Drizzle ORM Documentation](https://orm.drizzle.team)
- **Better Auth**: [Better Auth Documentation](https://better-auth.com)

---

**Última Atualização**: Dezembro 2024  
**Mantido por**: [Luis Felipe](https://github.com/felipesdotdev)

