# Wantujiang

Next.js app for AI image rewriting, pricing/payment submission, and admin API key management.

## Requirements

- Node.js 20.9.0 or newer
- npm
- Supabase project with auth, `profiles`, and `api_keys` tables
- OpenAI-compatible image generation provider credentials

## Setup

Install dependencies:

```bash
npm install
```

Create local environment files with these variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

OPENAI_API_KEY=
OPENAI_API_BASE_URL=
OPENAI_MODEL=

POLO_API_KEY=
POLO_BASE_URL=
POLO_MODEL=

TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
RATE_LIMIT_HASH_SALT=
```

Run the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Quality Checks

```bash
npm run lint
npm run typecheck
npm run build
```

## Notes

- Admin page access is protected by `proxy.ts`.
- Admin API routes still perform their own authorization and return JSON `401` or `403` responses.
- Browser auth clients use `@supabase/ssr`; the service-role client remains server-only.
