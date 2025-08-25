## GoalTracker AI

A Next.js app with server-side API routes backed by Supabase. Authentication is handled via a custom JWT cookie-based system issued by our API after Supabase user creation or login. All user-facing responses are in English.

### Setup
1. Install dependencies:
```
npm install
```
2. Create a `.env.local` with the following variables:
```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
JWT_SECRET=
# One of the following for AI features
OPENAI_API_KEY=
# or
A4F_API_KEY=
```
3. Start the dev server:
```
npm run dev
```

### Key API Routes
- Auth: `/api/auth/signup`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, `/api/auth/profile`
- Goals: `/api/goals` (GET, POST), `/api/goals/[id]` (PUT, DELETE)
- Daily Logs: `/api/daily-logs` (GET, POST), `/api/daily-logs/[id]` (PUT)
- Analytics: `/api/analytics/goals` (GET)
- AI Suggestions: `/api/ai-suggestions` (POST), `/api/ai-suggestions/recent` (GET)
- Chat: `/api/chat` (POST)

Session is stored in an HTTP-only cookie named `auth_token` (JWT, HMAC-SHA256). API routes verify the session per request.
