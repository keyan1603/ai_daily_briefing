# 🌅 Daily Briefing — AI-Powered Morning Companion

> A professional multi-agent AI system built with Next.js that delivers hyper-personalised daily briefings using real-time weather, local news, and Claude AI sub-agents.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

---

## ✨ What It Does

Every morning, 5 AI agents collaborate to give you:

| Agent | What It Does |
|-------|-------------|
| 🌤 **Weather Agent** | Fetches live weather from Open-Meteo (FREE, no key) |
| 📰 **News Agent** | Pulls & ranks local news via NewsData.io + AI scoring |
| 👔 **Clothing Agent** | Claude sub-agent recommends outfit based on weather + day |
| 🛡 **Safety Agent** | Claude sub-agent assesses news for safety concerns |
| ✨ **Orchestrator** | Master agent that coordinates all others in parallel |

---

## 🏗️ Architecture — Agent-to-Agent Communication

```
Browser → /api/briefing (Orchestrator)
               ├── /api/weather  (Open-Meteo API, no key needed)
               ├── /api/news     (NewsData.io + Claude AI ranking)
               └── Calendarific  (Holiday detection)
                        ↓
               /api/recommend (Claude Orchestrator)
                        ├── Sub-Agent A: Clothing Recommendation
                        ├── Sub-Agent B: Safety Assessment
                        ├── Sub-Agent C: Greeting & Day Context
                        ├── Sub-Agent D: Office Advice
                        └── Sub-Agent E: News Summary
                              ↓ (all 5 run in parallel)
                         Final Briefing JSON
```

All parallel calls use `Promise.allSettled()` — if one agent fails, the rest continue gracefully.

---

## 🚀 Step-by-Step Setup

### Step 1 — Clone the repository

```bash
git clone https://github.com/keyan1603/ai_daily_briefing.git
cd ai_daily_briefing
npm install
```

### Step 2 — Get your FREE Anthropic API key

1. Go to **https://console.anthropic.com**
2. Click **Sign Up** — no credit card required
3. You receive **$5 free credit** (enough for hundreds of briefings)
4. Go to **API Keys** → **Create Key**
5. Copy the key (starts with `sk-ant-...`)

> 💡 $5 credit ≈ ~1,000 briefing requests at ~$0.005 each

### Step 3 — Get your FREE NewsData.io key (optional)

1. Go to **https://newsdata.io/register**
2. Sign up for free — **200 requests/day** at no cost
3. Copy your API key from the dashboard

> Without this key, the app uses realistic demo news articles

### Step 4 — Get your FREE Calendarific key (optional)

1. Go to **https://calendarific.com/sign-up**
2. Free tier: **1,000 requests/month**
3. Copy your API key

> Without this key, holiday detection is disabled (not critical)

### Step 5 — Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
NEWSDATA_API_KEY=pub_your-newsdata-key-here       # optional
CALENDARIFIC_API_KEY=your-calendarific-key-here   # optional
APP_URL=http://localhost:3000
```

⚠️ **IMPORTANT**: Never commit `.env.local` — it's in `.gitignore`

### Step 6 — Run locally

```bash
npm run build
npm run dev
```

Open **http://localhost:3000** — click "Get My Briefing" and allow location access.

---

## 🌐 Deploy to Vercel (FREE)

### Step 7 — Push to GitHub

```bash
git init
git add .
git commit -m "feat: Daily Briefing multi-agent app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/daily-briefing.git
git push -u origin main
```

### Step 8 — Deploy on Vercel

1. Go to **https://vercel.com** → Sign in with GitHub
2. Click **"Add New Project"**
3. Import your `daily-briefing` repository
4. In **Environment Variables**, add:
   - `ANTHROPIC_API_KEY` → your key
   - `NEWSDATA_API_KEY` → your key (optional)
   - `CALENDARIFIC_API_KEY` → your key (optional)
   - `APP_URL` → `https://your-app.vercel.app` (fill after first deploy)
5. Click **Deploy** — live in ~60 seconds!

### Step 9 — Update APP_URL after deploy

After deployment, copy your Vercel URL (e.g. `https://daily-briefing-xyz.vercel.app`):

1. Go to Vercel → Your Project → **Settings** → **Environment Variables**
2. Update `APP_URL` to your actual Vercel URL
3. Redeploy (Deployments → ... → Redeploy)

---

## 🔑 Secret Storage Best Practices

| Where | How | Security Level |
|-------|-----|---------------|
| Local dev | `.env.local` (git-ignored) | ✅ Safe |
| Vercel | Dashboard → Environment Variables | ✅ Encrypted at rest |
| GitHub Actions | Repo Secrets | ✅ Encrypted |
| ❌ Never | Hardcoded in source | 🚨 Never do this |
| ❌ Never | Committed `.env` files | 🚨 Never do this |

All secrets live on the **server side** — they're accessed only in `/app/api/*` routes, never exposed to the browser.

---

## 📁 Project Structure

```
daily-briefing/
├── app/
│   ├── api/
│   │   ├── briefing/route.ts   # Master orchestrator
│   │   ├── weather/route.ts    # Weather agent
│   │   ├── news/route.ts       # News agent + AI ranking
│   │   └── recommend/route.ts  # 5 Claude sub-agents in parallel
│   ├── layout.tsx
│   ├── page.tsx                # Main UI
│   └── globals.css
├── components/
│   ├── AgentPipeline.tsx       # Live loading pipeline UI
│   ├── WeatherCard.tsx
│   ├── ClothingCard.tsx
│   ├── NewsCard.tsx
│   ├── SafetyCard.tsx
│   └── ArchitectureDiagram.tsx
├── lib/
│   ├── anthropic.ts            # Claude API client
│   ├── types.ts                # TypeScript interfaces
│   └── weather-codes.ts        # WMO weather code mapping
├── .env.example                # Template (safe to commit)
├── .env.local                  # Your secrets (NEVER commit)
└── .gitignore
```

---

## 🎓 Learning Highlights (for interviews)

- **Agent-to-Agent Communication**: Orchestrator fans out to 3 data agents, then 5 AI sub-agents run in parallel
- **Graceful Degradation**: `Promise.allSettled()` ensures partial failures don't break the experience
- **Server-Side Secret Management**: All API keys stay in Next.js API routes, never exposed client-side
- **Free APIs Only**: Open-Meteo (weather), NewsData.io free tier, Anthropic $5 credit
- **Real-time Streaming Pipeline**: Visual agent status during generation
- **TypeScript Throughout**: Full type safety across all layers

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + Custom CSS |
| AI | Anthropic Claude Sonnet 4 |
| Weather | Open-Meteo (free, no key) |
| News | NewsData.io (free tier) |
| Geolocation | Browser Geolocation API + Nominatim |
| Hosting | Vercel (free tier) |

---

## 🙏 Credits

Built as a portfolio/demo project by Karthikeyan Manickavasagam showcasing multi-agent AI architecture patterns.
