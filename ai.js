/* =========================================================
   NOVA AI — ai.js
   The "brain" of Nova AI.

   Primary path: calls the Anthropic Messages API directly from
   the browser. This works out-of-the-box when this app is run
   inside Claude.ai's artifact preview (the API key is injected
   by the host automatically — see fetch() call below).

   Fallback path: if that request fails (e.g. this file was
   downloaded and opened locally, with no backend configured),
   Nova switches to a lightweight offline responder so the demo
   still feels alive. For a real production deployment, point
   `NOVA_API_ENDPOINT` at your own backend (see /server) which
   should hold your OpenAI/Anthropic API key server-side.
========================================================= */

const NovaAI = (() => {
  // Set this to your own backend proxy endpoint in production,
  // e.g. 'https://api.yourapp.com/chat'. Leave null to use the
  // direct in-browser call (artifact preview) with offline fallback.
  const NOVA_API_ENDPOINT = null;

  const SYSTEM_PROMPT = `You are Nova, a premium, friendly AI assistant embedded in the "Nova AI" web app.
You help with: general knowledge, programming & debugging, generating HTML/CSS/JS/Python code,
step-by-step math, summarizing documents, translation, startup brainstorming, study/exam prep,
explaining AI/ML concepts, and writing CVs & scholarship applications.
Format responses in clean markdown. Use fenced code blocks with a language tag for any code.
Use tables when comparing structured data. Keep answers focused and well organized with headings
or bullet points when helpful. Be warm, concise, and precise.`;

  /** Build the conversation history into the API's expected message format. */
  function toApiMessages(history) {
    return history
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: m.content }));
  }

  /** Attempt the real API call (works inside Claude.ai artifact hosting). */
  async function callRealApi(history) {
    const endpoint = NOVA_API_ENDPOINT || 'https://api.anthropic.com/v1/messages';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: toApiMessages(history),
      }),
    });

    if (!response.ok) throw new Error(`API responded with status ${response.status}`);
    const data = await response.json();
    const textBlock = (data.content || []).find(b => b.type === 'text');
    if (!textBlock) throw new Error('Empty response from API');
    return textBlock.text;
  }

  // ---------------- Offline fallback responder ----------------
  // Pattern-matches common intents so the app stays demoable without
  // network access or an API key configured.

  function offlineResponse(latestUserMessage, history) {
    const msg = latestUserMessage.toLowerCase();

    if (/\b(hi|hello|hey)\b/.test(msg) && msg.length < 20) {
      return `Hello! 👋 I'm Nova, running in **offline demo mode** right now (no live API connection detected). I can still show you how responses, code blocks, and formatting look. Try asking me to "write a python function" or "explain neural networks".`;
    }

    if (/(write|generate).*(code|function|script|html|css|javascript|python)/.test(msg) || /palindrome/.test(msg)) {
      return [
        "Here's an example response — when connected to a live model, Nova writes real, tailored code. Here's a sample Python snippet to illustrate formatting:",
        '',
        '```python',
        'def is_palindrome(text: str) -> bool:',
        '    """Return True if `text` reads the same forwards and backwards."""',
        '    cleaned = "".join(ch.lower() for ch in text if ch.isalnum())',
        '    return cleaned == cleaned[::-1]',
        '',
        'print(is_palindrome("Was it a car or a cat I saw?"))  # True',
        '```',
        '',
        '**Note:** This is a static demo reply because no AI API is currently connected. Plug in your API key or backend in `js/ai.js` to get real, dynamic answers.',
      ].join('\n');
    }

    if (/\b(solve|calculate|math|equation|derivative|integral)\b/.test(msg)) {
      return [
        '**Step-by-step (demo formatting)**',
        '',
        '1. Identify the knowns and the unknown in the problem.',
        '2. Choose the relevant formula or method.',
        '3. Substitute values carefully, keeping units consistent.',
        '4. Simplify step by step, double-checking arithmetic.',
        '5. State the final answer clearly.',
        '',
        '> Connect Nova to a live AI API to get this worked out for your *exact* problem.',
      ].join('\n');
    }

    if (/translat/.test(msg)) {
      return `I'd normally translate that for you here. In offline demo mode I can't reach a live model, but once connected, just tell me the target language (e.g. "translate to French") and paste your text.`;
    }

    if (/(startup|idea|brainstorm)/.test(msg)) {
      return [
        '**Sample brainstorm (demo data)**',
        '',
        '| Idea | One-line pitch |',
        '|---|---|',
        '| MindLoop | AI study planner that adapts to your forgetting curve |',
        '| CivicLens | Plain-language summaries of local government decisions |',
        '| Repair.ai | Computer-vision app that diagnoses appliance issues from a photo |',
        '',
        'Connect a live API key for ideas tailored to *your* prompt.',
      ].join('\n');
    }

    if (/(cv|resume|scholarship|cover letter)/.test(msg)) {
      return `Here's the kind of structure Nova would help you build:\n\n1. **Hook** — one compelling sentence about your motivation.\n2. **Evidence** — a concrete achievement with a measurable result.\n3. **Fit** — why this opportunity specifically, in your own words.\n4. **Close** — a forward-looking, confident final line.\n\n*This is a static template — connect a live AI API for a draft personalized to your story.*`;
    }

    if (/(neural network|machine learning|\bai\b|artificial intelligence)/.test(msg)) {
      return `**Neural networks, briefly:** they're layers of simple math units ("neurons") that each take inputs, apply weights, and pass the result through a non-linear function. During training, the network compares its output to the correct answer and nudges every weight slightly to reduce the error — repeated millions of times until the pattern is learned.\n\n*(This is a static demo explanation. Connect a live AI API for deeper, interactive answers.)*`;
    }

    // Generic fallback
    return `I received your message: "${escapeForQuote(latestUserMessage)}"\n\nI'm currently running in **offline demo mode** because no live AI API connection was detected from this browser session. Everything else — markdown rendering, code highlighting, voice, file uploads, history — is fully functional.\n\nTo enable real answers, open \`js/ai.js\` and connect your Anthropic or OpenAI API key (ideally via the included \`/server\` backend, so the key stays private).`;
  }

  function escapeForQuote(s) {
    return s.length > 120 ? s.slice(0, 120) + '…' : s;
  }

  /**
   * Main entry point. Tries the real API, falls back to the offline
   * responder on any failure so the UI never dead-ends.
   */
  async function getResponse(history) {
    const latest = [...history].reverse().find(m => m.role === 'user');
    const latestText = latest ? latest.content : '';

    try {
      const text = await callRealApi(history);
      return { text, offline: false };
    } catch (err) {
      console.warn('Nova AI: live API unavailable, using offline demo responder.', err.message);
      // Small artificial delay so the offline path still feels conversational.
      await new Promise(r => setTimeout(r, 500 + Math.random() * 400));
      return { text: offlineResponse(latestText, history), offline: true };
    }
  }

  return { getResponse };
})();
