# CreateK

A real-time, multi-format creator platform built on a live Convex backend, with a dedicated Flask analytics microservice for content trend discovery.

**Stack:** Next.js · Convex · Flask · scikit-learn · LiveKit · WebRTC · Inngest

> Note: the resume this README is built from describes CreateK as a "5-format creator platform" without naming all five formats. Three are documented below (video, audio/podcast, livestream) — the remaining two aren't specified here rather than guessed. Worth filling in once you write the full README yourself.

---

## What CreateK Does

CreateK is a creator platform built around a real-time backend rather than a traditional request/response API — content, sessions, and workflows update live across the app via Convex subscriptions.

### Real-Time Backend
- Built on **Convex** with live subscriptions — UI updates automatically as data changes, no polling
- **JWT-secured identity** across the platform
- **Inngest** background workflows for asynchronous processing (e.g. long-running jobs that shouldn't block the request/response cycle)

### Browser-Native Creative Tools
Three tools built to remove dependency on external desktop software entirely:
- **Canvas video editor** — in-browser video editing via the Canvas API
- **Web Audio API podcast studio** — in-browser audio recording/editing
- **LiveKit WebRTC livestream room** — real-time livestreaming without a separate broadcast app

### Analytics Microservice (Flask)
A separate Python service running a 3-stage ML pipeline for Reddit trend discovery:
1. **TF-IDF** — vectorize post/comment text
2. **K-Means** — cluster content into emerging topic groups
3. **LDA** (Latent Dirichlet Allocation) — extract underlying topics per cluster

Results are exposed through a live analytics dashboard in the main app.

## Architecture
                ┌──────────────────────┐
                │       Frontend       │
                │       Next.js        │
                └──────────┬───────────┘
                           │
            ┌──────────────┼───────────────┐
            │                              │
            ▼                              ▼
┌───────────────────────┐      ┌─────────────────────────┐
│        Convex         │      │  Flask Analytics        │
│  Real-time backend    │      │  Microservice           │
│  Live subscriptions   │      │  TF-IDF → K-Means → LDA │
│  JWT-secured identity │      │  Reddit trend discovery │
└──────────┬────────────┘      └─────────────┬───────────┘
           │                                    │
           ▼                                    ▼
┌───────────────────────┐          ┌─────────────────────────┐
│       Inngest         │          │     Live Analytics      │
│  Background workflows │          │        Dashboard        │
└───────────────────────┘          └─────────────────────────┘

    ┌─────────────────────────────────────────────────────┐
    │              Browser-Native Creative Tools          │
    │   Canvas video editor · Web Audio podcast studio    │
    │           LiveKit WebRTC livestream room            │
    └─────────────────────────────────────────────────────┘

## Tech Stack

**Frontend:** Next.js
**Backend:** Convex (real-time), Inngest (background jobs)
**Analytics Service:** Flask, scikit-learn (Python)
**Real-time media:** LiveKit, WebRTC, Web Audio API, Canvas API
**Auth:** JWT

## Getting Started

> Standard setup for this stack — adjust to your actual project structure/env var names.

### Prerequisites
- Node.js 18+
- Python 3.10+
- A Convex account/project (`npx convex dev` to scaffold)
- A LiveKit server/cloud project (for the livestream room)

### 1. Install dependencies
```bash
# Frontend + Convex
npm install

# Analytics microservice
cd analytics-service
pip install -r requirements.txt --break-system-packages
```

### 2. Environment variables

Frontend `.env.local`:
```env
NEXT_PUBLIC_CONVEX_URL=your-convex-deployment-url
LIVEKIT_API_KEY=your-livekit-api-key
LIVEKIT_API_SECRET=your-livekit-api-secret
NEXT_PUBLIC_LIVEKIT_URL=wss://your-livekit-instance
INNGEST_EVENT_KEY=your-inngest-event-key
JWT_SECRET=long-random-secret
```

Analytics service `.env`:
```env
FLASK_ENV=development
REDDIT_CLIENT_ID=your-reddit-api-client-id
REDDIT_CLIENT_SECRET=your-reddit-api-client-secret
```

### 3. Run locally
```bash
# Convex dev server (separate terminal)
npx convex dev

# Frontend
npm run dev

# Analytics microservice
cd analytics-service && python app.py
```

Open http://localhost:3000.

## Project Highlights

- Real-time, multi-format creator platform on a live Convex backend
- Live UI updates via Convex subscriptions — no manual polling
- JWT-secured identity across the platform
- Asynchronous background processing via Inngest
- 3-stage ML pipeline (TF-IDF → K-Means → LDA) for Reddit trend discovery, exposed through a live dashboard
- Three browser-native creative tools, eliminating external desktop-software dependencies entirely

## Author

**Harshita Sharma**
B.Tech — Computer Science & Engineering, KIIT University

- GitHub: https://github.com/harshita624
- LinkedIn: https://www.linkedin.com/in/harshita-sharma-b782942a7/
Results are exposed through a live analytics dashboard in the main app.

## Architecture
