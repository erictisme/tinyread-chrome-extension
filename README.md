# TinyRead

Stop wasting energy on duplicate AI summaries. Share canonical summaries that everyone can reuse.

## What's This?

TinyRead creates **canonical summaries** that get reused instead of regenerated. When you press `Cmd+Shift+S` on any article:

- **If someone already summarized it:** Instant reuse ♻️
- **If it's new:** Generate once, share forever 🆕
- **Environmental impact:** Track CO₂ savings from reuse

## Why This Matters

In 6-12 months, every browser will have built-in AI. The value isn't summarization - it's the canonical reuse layer that prevents redundant computation.

## Project Structure

```
├── Extension/          Chrome extension files
│   ├── manifest.json   Extension config
│   ├── content.js      Cmd+Shift+S overlay
│   ├── overlay.css     UI styling
│   └── popup.html      Extension popup
└── api/               Backend API
    ├── server.js       Express server
    ├── gemini.js       Gemini AI integration
    ├── database.js     SQLite storage
    └── vercel.json     Deployment config
```

## Quick Start

### 1. Install Extension (Local Testing)
1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" → Select this directory
4. Press `Cmd+Shift+S` on any article!

### 2. Run API Locally
```bash
cd api
npm install
npm start
# API runs on http://localhost:3000
```

### 3. Deploy API to Vercel
- Connect this GitHub repo to Vercel
- Set root directory to `api/`
- Add environment variable: `GEMINI_API_KEY`
- Deploy!

## Testing the Hypothesis

**Key Metric:** Reuse rate >30% validates the concept
- Track in popup: summaries generated vs reused
- Environmental impact: CO₂ saved from reuse
- Network effects: More summaries = more value

## Tech Stack

- **Extension:** Vanilla JS (fast, simple)
- **Backend:** Node.js + Express + SQLite
- **AI:** Google Gemini (fast + cheap)
- **Deploy:** Vercel

## Future Vision

When browsers commoditize AI summarization, TinyRead becomes the canonical knowledge layer everyone shares. The moat isn't the AI - it's the network effect of reusable summaries.

**Move fast. Break things. Test the reuse hypothesis.** 🚀