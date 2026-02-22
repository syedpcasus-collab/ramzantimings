# Ramadan Timings Website (React + Tailwind + Apps Script)

## Features
- Dynamic Country → State → District → Area dropdowns (with **Other** option)
- Sehri, Iftar, Last Updated display
- Countdown to next Iftar
- Volunteer form: Add / Edit timing (POST)
- Dark mode (saved in localStorage)
- Mobile-first responsive Tailwind UI
- Session cache (2-minute stale-while-revalidate)

## Setup
```bash
cp .env.example .env
npm install
npm run dev
```

Set API URL in `.env`:
```env
VITE_API_URL=https://script.google.com/macros/s/AKfycbyPkBWIASupSmjB8iG7uw3NjBIU5EmBil97nmAzi7agAAZtstYk3Iq6Lr7zqt3qwP3B/exec
```

## Apps Script backend notes
Backend implementation is in `Code.gs`.

Set editor key in Apps Script:
```javascript
PropertiesService.getScriptProperties().setProperty('EDITOR_KEY','your-secret')
```

Deploy steps:
1. Deploy → New deployment
2. Select **Web app**
3. Execute as: **Me**
4. Who has access: **Anyone**
5. Create new version after each edit

Webapp URL:
`https://script.google.com/macros/s/AKfycbyPkBWIASupSmjB8iG7uw3NjBIU5EmBil97nmAzi7agAAZtstYk3Iq6Lr7zqt3qwP3B/exec`

## API curl examples
GET:
```bash
curl 'https://script.google.com/macros/s/AKfycbyPkBWIASupSmjB8iG7uw3NjBIU5EmBil97nmAzi7agAAZtstYk3Iq6Lr7zqt3qwP3B/exec?date=2026-03-05&country=India&state=Tamil%20Nadu&district=Trichy&area=Kattur'
```

POST add:
```bash
curl -X POST 'https://script.google.com/macros/s/AKfycbyPkBWIASupSmjB8iG7uw3NjBIU5EmBil97nmAzi7agAAZtstYk3Iq6Lr7zqt3qwP3B/exec' \
 -H "Content-Type: application/json" \
 -d '{"action":"add","Country":"India","State":"Tamil Nadu","District":"Trichy","Area":"Kattur","Date":"2026-03-05","Sehri":"05:10","Iftar":"18:20"}'
```

POST update with editor key:
```bash
curl -X POST 'https://script.google.com/macros/s/AKfycbyPkBWIASupSmjB8iG7uw3NjBIU5EmBil97nmAzi7agAAZtstYk3Iq6Lr7zqt3qwP3B/exec' \
 -H "Content-Type: application/json" \
 -d '{"action":"update","editor_key":"MYSECRET","Country":"India","State":"Tamil Nadu","District":"Trichy","Area":"Kattur","Date":"2026-03-05","Sehri":"05:09","Iftar":"18:21"}'
```

## Security note
If you want auto-approve, you can pass `editor_key` from client env, but this is **not recommended**. Better approach: use a small secured admin page and never expose secret in public bundle.

## Future improvements
- Rate limiting
- Admin approval UI for pending queue
- IP whitelist for sensitive updates
- CAPTCHA for public submission
- Logs retention policy

## Manual checklist (dropdown + Other)
- Country/State/District/Area show placeholder first.
- Each dropdown ends with **Other (type manually)**.
- Selecting Other reveals inline input **Enter country/state/district/area**.
- If API returns no locations, alert appears: **No saved locations found — please type your location below**.
- Volunteer form submits typed values exactly as entered.
- Existing saved locations can still be selected normally.
