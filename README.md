# Ramadan Timings Website (React + Tailwind)

A beginner-friendly Ramadan timings web app with:

- Country → State → District → Area dropdown filters
- Sehri and Iftar timings
- Live countdown to next Iftar
- Dark mode toggle
- Last updated timestamp display
- Easy admin JSON editor (no login/signup)
- Responsive layout for mobile/tablet/desktop

## 1) Run locally

```bash
npm install
npm run dev
```

Open the local URL shown by Vite.

## 2) Data source (simple backend)

This app reads timing data from `public/data/timings.json`.

You can update timings in two easy ways:

1. **Developer way**: edit `public/data/timings.json` and redeploy.
2. **Non-technical way**: use the built-in **Easy Admin Update** panel and click **Save Timings**.
   - Data is saved into browser localStorage.
   - No login/signup required.

## 3) JSON structure

```json
{
  "India": {
    "Tamil Nadu": {
      "Chennai": {
        "Anna Nagar": {
          "sehri": "04:47",
          "iftar": "18:22",
          "lastUpdated": "2026-02-22 18:00 IST"
        }
      }
    }
  }
}
```

## 4) Free deployment

### Option A: Netlify
1. Push code to GitHub.
2. Go to Netlify → **Add new site** → **Import from Git**.
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Deploy.

### Option B: Vercel
1. Push code to GitHub.
2. Import project in Vercel.
3. Framework preset: **Vite**.
4. Deploy.

## 5) Beginner notes

- Default location is **India → Tamil Nadu → Chennai → Anna Nagar**.
- When you change dropdowns, timing updates instantly.
- Countdown automatically updates every second.
- Last updated timestamp shown below timing cards.

