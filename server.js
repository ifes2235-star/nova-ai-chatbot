/**
 * Nova AI — optional backend (Node.js + Express)
 * ---------------------------------------------------------
 * This is a minimal, production-style proxy server. Its job is
 * to keep your AI API key off the client: the frontend calls
 * POST /api/chat, and this server forwards the request to your
 * AI provider (Anthropic or OpenAI) using a key stored in an
 * environment variable.
 *
 * To use it with the frontend:
 *   1. `npm install` inside /server
 *   2. Create a `.env` file with ANTHROPIC_API_KEY=sk-...
 *   3. `npm start` (runs on http://localhost:3000)
 *   4. In js/ai.js, set NOVA_API_ENDPOINT = 'http://localhost:3000/api/chat'
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

app.use(cors());
app.use(express.json({ limit: '5mb' }));

const SYSTEM_PROMPT = `You are Nova, a premium, friendly AI assistant. Format responses in clean
markdown, using fenced code blocks with a language tag for any code, and tables for structured
comparisons. Be warm, concise, and precise.`;

app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages must be an array of {role, content}' });
    }
    if (!ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'Server is missing ANTHROPIC_API_KEY. Set it in your .env file.' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      return res.status(response.status).json({ error: 'Upstream AI API error', detail });
    }

    const data = await response.json();
    const textBlock = (data.content || []).find((b) => b.type === 'text');
    res.json({ text: textBlock ? textBlock.text : '' });
  } catch (err) {
    console.error('Chat proxy error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Nova AI backend listening on http://localhost:${PORT}`);
});
