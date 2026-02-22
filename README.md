# Ramadan Timings Website (React + Tailwind)

A beginner-friendly Ramadan timings web app with:

- Live Google Apps Script API integration
- Country → State → District → Area filters (with **Other** option)
- Manual add-location + timing form (POST to Google Apps Script)
- Sehri, Iftar, Last Updated display
- Countdown timer for next Iftar
- Auto refresh every 5 minutes
- Dark mode + responsive UI

## Run locally

```bash
npm install
npm run dev
```

## API endpoints

- GET timings:
  - `https://script.google.com/macros/s/AKfycbyPkBWIASupSmjB8iG7uw3NjBIU5EmBil97nmAzi7agAAZtstYk3Iq6Lr7zqt3qwP3B/exec`
- POST new timing:
  - same URL (uses `doPost` in Apps Script)

If GET API fails, app falls back to `public/data/timings.json`.

## Google Apps Script (doPost)

Use this in your Apps Script project (replace `SHEET_NAME` if needed):

```javascript
const SHEET_NAME = 'Sheet1';

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || '{}');
    const required = ['country', 'state', 'district', 'area', 'sehri', 'iftar'];

    for (var i = 0; i < required.length; i++) {
      if (!payload[required[i]]) {
        return ContentService
          .createTextOutput(JSON.stringify({ ok: false, error: required[i] + ' is required' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const lastUpdated = new Date();

    sheet.appendRow([
      payload.country,
      payload.state,
      payload.district,
      payload.area,
      payload.sehri,
      payload.iftar,
      lastUpdated
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, message: 'Row added successfully' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

## Beginner flow

1. Select Country/State/District/Area.
2. If your location is missing, pick **Other** and type the new value.
3. Fill Sehri + Iftar.
4. Click **Submit New Timing**.
5. See loading, success, or error message.
