const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// ===============================
// Serve Frontend Files
// ===============================
app.use(express.static(path.join(__dirname, '..')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// ===============================
// AI System Prompt
// ===============================
const SYSTEM_PROMPT = `You are Nova, a premium, friendly AI assistant.
Format responses in clean markdown.
Use fenced code blocks with language tags for code.
Use tables where appropriate.
Be warm, concise, and precise.`;

// ===============================
// Chat API
// ===============================
app.post('/api/chat', async (req, res) => {
    try {
        const { messages } = req.body;

        if (!Array.isArray(messages)) {
            return res.status(400).json({
                error: 'messages must be an array of {role, content}'
            });
        }

        if (!ANTHROPIC_API_KEY) {
            return res.status(500).json({
                error: 'Server is missing ANTHROPIC_API_KEY.'
            });
        }

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-6',
                max_tokens: 1000,
                system: SYSTEM_PROMPT,
                messages
            })
        });

        if (!response.ok) {
            const detail = await response.text();
            return res.status(response.status).json({
                error: 'Upstream AI API error',
                detail
            });
        }

        const data = await response.json();

        const textBlock = (data.content || []).find(
            block => block.type === 'text'
        );

        res.json({
            text: textBlock ? textBlock.text : ''
        });

    } catch (err) {
        console.error('Chat proxy error:', err);

        res.status(500).json({
            error: 'Internal server error'
        });
    }
});

// ===============================
// Health Check
// ===============================
app.get('/health', (req, res) => {
    res.json({ ok: true });
});

// ===============================
// Start Server
// ===============================
app.listen(PORT, () => {
    console.log(`Nova AI backend listening on port ${PORT}`);
});