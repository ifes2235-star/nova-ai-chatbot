# Nova AI

A premium, futuristic AI chat assistant — built with plain HTML5, CSS3, and
modern JavaScript (ES6+). No build step required.

![Nova AI](https://img.shields.io/badge/status-demo--ready-6C5CE7)

## ✨ Features

- Landing page, login/signup, and a ChatGPT-style chat workspace
- Sidebar with searchable conversation history + new chat
- Markdown rendering, syntax-highlighted code blocks with copy buttons
- Typing animation, loading skeletons, regenerate & copy message actions
- Voice input (Web Speech Recognition) and text-to-speech read-aloud
- File upload with text extraction for PDF, DOCX, and TXT; image preview
- Light / dark mode with glassmorphism design throughout
- Profile & settings modal, conversation export to PDF and TXT
- Fully responsive, mobile-first layout with an accessible focus system
- Local-first: all chats and accounts live in your browser's `localStorage`

## 🗂 Project structure

```
nova-ai/
├── index.html              # All views: landing, auth, chat app shell
├── css/
│   ├── style.css           # Design tokens, reset, layout, landing/auth
│   ├── components.css      # Buttons, cards, sidebar, chat UI, modals
│   └── animations.css      # Keyframes + ambient background
├── js/
│   ├── storage.js          # localStorage wrapper (users, chats, settings)
│   ├── theme.js             # Light/dark theme toggle
│   ├── particles.js         # Canvas particle background
│   ├── auth.js               # Demo-grade client-side auth
│   ├── markdown.js           # marked.js + highlight.js wrapper
│   ├── ai.js                 # AI response engine (live API + offline fallback)
│   ├── voice.js              # Speech recognition + text-to-speech
│   ├── fileUpload.js         # PDF/DOCX/TXT/image attachment handling
│   ├── exportChat.js         # Export conversation to PDF / TXT
│   ├── chat.js                # Conversation state + chat UI rendering
│   └── app.js                 # Routing, wiring, bootstrap
└── server/                  # Optional Node.js + Express backend proxy
    ├── server.js
    └── package.json
```

## 🚀 Running it

This is a static site — just open `index.html` in a modern browser, or serve
the folder with any static server, e.g.:

```bash
npx serve nova-ai
```

## 🔌 Connecting a real AI model

By default, `js/ai.js` tries calling the Anthropic Messages API directly from
the browser, and falls back to a built-in **offline demo responder** if that
request fails (e.g. no API key configured) — so the UI is always fully
demoable.

For a real deployment, **don't put API keys in frontend code.** Instead:

1. `cd server && npm install`
2. Create a `.env` file with `ANTHROPIC_API_KEY=sk-...` (or adapt
   `server.js` for the OpenAI API)
3. `npm start`
4. In `js/ai.js`, set:
   ```js
   const NOVA_API_ENDPOINT = 'http://localhost:3000/api/chat';
   ```

## 🔐 About authentication

The included login/signup is a **client-side demo** for portfolio purposes —
accounts and password hashes are stored in `localStorage` using a simple
non-cryptographic hash. For production, replace `js/auth.js` with calls to a
real backend that hashes passwords with bcrypt/argon2 and issues secure,
signed session tokens.

## 🎨 Design system

- Dark theme by default with a violet → blue gradient (`--nova-violet`,
  `--nova-blue`) and glassmorphism surfaces (`.glass-card`)
- Display type: Space Grotesk · Body: Inter · Code/data: JetBrains Mono
- All colors, radii, and motion timing are CSS custom properties in
  `css/style.css` — change the palette in one place

## ♿ Accessibility

- Skip-to-content link, visible focus rings, semantic landmarks
- `aria-live` regions for chat messages and toasts
- Respects `prefers-reduced-motion` (disables particle animation & easing)
- Keyboard-operable composer, modal (Esc to close), and navigation

## 📄 License

Provided as a portfolio / educational demo. Replace branding, copy, and the
auth layer before using in production.
