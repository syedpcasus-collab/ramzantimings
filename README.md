# Ramadan Timings Website (React + Tailwind)

A beginner-friendly Ramadan timings web app with:

- Google Apps Script API integration
- Country → State → District → Area dropdown filters
- Sehri and Iftar timings
- Live countdown to next Iftar
- Last updated timestamp display
- Auto refresh every 5 minutes
- Dark mode toggle
- Responsive layout for mobile/tablet/desktop

## 1) Run locally

```bash
npm install
npm run dev
```

## 2) API source

Primary API:

```text
https://script.google.com/macros/s/AKfycbyPkBWIASupSmjB8iG7uw3NjBIU5EmBil97nmAzi7agAAZtstYk3Iq6Lr7zqt3qwP3B/exec
```

Fallback API/data: `public/data/timings.json`

If the Google API is temporarily unavailable (CORS/network/down), the app gracefully falls back to local JSON so users still see timings.

## 3) Beginner flow

1. Open app.
2. Select Country → State → District → Area.
3. Timings update instantly.
4. Check countdown and last updated timestamp.
5. App refreshes data every 5 minutes automatically.
6. Click **Refresh Now** for manual refresh.

## 4) Deployment (free)

- Netlify (Vite build command: `npm run build`, publish dir: `dist`)
- Vercel (Framework preset: Vite)
