# Zypt AI — Video Script & Prompt Generator

5টি AI একসাথে আপনার ভিডিও বিশ্লেষণ করে Script ও Prompt তৈরি করে।

## AI Models
- **Groq** — Llama 4 Scout (Vision) — ভিডিও বিশ্লেষণ
- **Cohere** — Command R+
- **OpenRouter** — DeepSeek R1 Free
- **Sambanova** — Llama 3.3 70B
- **Cerebras** — Llama 3.1 70B

## Setup

### 1. Install
```bash
npm install
```

### 2. Environment Variables
`.env.local` ফাইল বানান:
```
NEXT_PUBLIC_SUPABASE_URL=xxx
SUPABASE_SERVICE_KEY=xxx
GROQ_API_KEY=xxx
COHERE_API_KEY=xxx
OPENROUTER_API_KEY=xxx
SAMBANOVA_API_KEY=xxx
CEREBRAS_API_KEY=xxx
```

### 3. Supabase Table
Supabase dashboard এ এই SQL run করুন:
```sql
CREATE TABLE analyses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name text,
  type text,
  duration_ms integer,
  groq_success boolean,
  cohere_success boolean,
  openr_success boolean,
  samba_success boolean,
  cerebras_success boolean,
  created_at timestamptz DEFAULT now()
);
```

### 4. Run
```bash
npm run dev
```

### 5. Deploy to Vercel
- Vercel এ নতুন project import করুন
- Environment variables add করুন
- Deploy!
