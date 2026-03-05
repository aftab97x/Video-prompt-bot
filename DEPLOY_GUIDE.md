# 🚀 Telegram Mini App — Deploy Guide

## 📁 Project Structure
```
tg-mini-app/
├── pages/
│   ├── _app.js          ← Telegram SDK load হয় এখানে
│   ├── index.js         ← Main UI
│   └── api/
│       └── analyze.js   ← Backend (Anthropic API call)
├── .env.local.example   ← API key template
├── .gitignore
├── next.config.js
└── package.json
```

---

## ✅ STEP 1 — GitHub এ Upload

1. GitHub এ নতুন repository বানাও (private রাখো)
2. এই folder এর সব ফাইল upload করো
3. `.env.local` কখনো push করবে না — `.gitignore` এ আছে

---

## ✅ STEP 2 — Vercel Deploy

1. https://vercel.com এ যাও, GitHub দিয়ে login করো
2. **"New Project"** → তোমার repository select করো
3. **Environment Variables** এ গিয়ে add করো:
   ```
   Key:   ANTHROPIC_API_KEY
   Value: sk-ant-api03-তোমার-real-key
   ```
4. **Deploy** চাপো
5. Deploy হলে একটা URL পাবে, যেমন:
   ```
   https://video-prompt-xxx.vercel.app
   ```
   এটা সেভ করো।

---

## ✅ STEP 3 — Telegram Bot এ Mini App Set করো

BotFather এ যাও এবং এই commands গুলো run করো:

### 3a. Menu Button set করো
```
/mybots
→ তোমার bot select করো
→ Bot Settings
→ Menu Button
→ Configure menu button
→ URL দাও: https://video-prompt-xxx.vercel.app
→ Button text: 🎬 Prompt বানাও
```

### 3b. অথবা /newapp দিয়ে Mini App register করো
```
/newapp
→ Bot select করো
→ App title: Video Prompt Generator
→ Description: ভিডিও দিলে AI prompt বানাবে
→ Photo: একটা ছবি দাও (optional)
→ Web App URL: https://video-prompt-xxx.vercel.app
```

---

## ✅ STEP 4 — Test করো

Telegram এ তোমার bot এ যাও → Menu button চাপো → Mini App খুলবে!

অথবা direct link:
```
https://t.me/তোমার_bot_username/app_short_name
```

---

## 🔒 Security Notes

- ✅ `ANTHROPIC_API_KEY` শুধু Vercel server এ থাকে, client কখনো দেখতে পায় না
- ✅ `/api/analyze.js` serverless function হিসেবে run হয়
- ✅ `.env.local` কখনো GitHub এ যাবে না
- ⚠️ চাইলে `/api/analyze.js` এ Telegram initData validation add করতে পারো (extra security)

---

## 🐛 Common Issues

**"Module not found" error?**
→ `npm install` চালাও

**API key কাজ করছে না?**
→ Vercel Dashboard → Settings → Environment Variables → ঠিকমতো set আছে কিনা দেখো
→ Redeploy করো

**Mini App খুলছে না?**
→ URL টা browser এ directly test করো আগে
→ HTTPS আছে কিনা দেখো (Vercel automatically দেয়)

---

## 📱 Telegram SDK Features (already implemented)

| Feature | কী করে |
|---------|---------|
| `webapp.expand()` | Full screen এ খোলে |
| `webapp.ready()` | Loading screen সরায় |
| `BackButton` | Telegram এর native back button |
| `HapticFeedback` | Success/error vibration |
| `themeParams` | Telegram এর theme colors follow করে |
