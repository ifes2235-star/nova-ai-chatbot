/* =========================================================
   NOVA AI — chat.js
   Conversation state management + chat UI rendering.
========================================================= */

const NovaChat = (() => {
  let userId = null;
  let conversations = [];
  let activeId = null;
  let pendingFiles = [];     // attachments staged for the next message
  let ttsAutoEnabled = false;
  let isGenerating = false;

  const els = {};

  function cacheEls() {
    els.messages = document.getElementById('messages');
    els.welcome = document.getElementById('welcome-screen');
    els.list = document.getElementById('conversation-list');
    els.title = document.getElementById('chat-title');
    els.form = document.getElementById('composer-form');
    els.input = document.getElementById('composer-input');
    els.sendBtn = document.getElementById('send-btn');
    els.filePreviewRow = document.getElementById('file-preview-row');
    els.search = document.getElementById('chat-search');
  }

  // ---------------- Persistence ----------------
  function persist() {
    NovaStorage.saveConversations(userId, conversations);
  }

  function init(uid) {
    cacheEls();
    userId = uid;
    conversations = NovaStorage.getConversations(userId);
    activeId = null;
    renderSidebarList();
    showWelcome();
    bindEvents();
  }

  function newConversation() {
    const convo = {
      id: NovaStorage.uid('conv'),
      title: 'New conversation',
      messages: [],
      createdAt: Date.now(),
    };
    conversations.unshift(convo);
    activeId = convo.id;
    persist();
    renderSidebarList();
    showWelcome();
    closeSidebarOnMobile();
    els.input.focus();
  }

  function getActive() {
    return conversations.find(c => c.id === activeId) || null;
  }

  function selectConversation(id) {
    activeId = id;
    renderSidebarList();
    renderMessages();
    closeSidebarOnMobile();
  }

  function deleteConversation(id, evt) {
    evt.stopPropagation();
    conversations = conversations.filter(c => c.id !== id);
    persist();
    if (activeId === id) {
      activeId = null;
      showWelcome();
    }
    renderSidebarList();
  }

  function clearAllHistory() {
    conversations = [];
    activeId = null;
    persist();
    renderSidebarList();
    showWelcome();
  }

  // ---------------- Sidebar list ----------------
  function renderSidebarList(filterText) {
    const q = (filterText || '').trim().toLowerCase();
    const list = q
      ? conversations.filter(c =>
          c.title.toLowerCase().includes(q) ||
          c.messages.some(m => m.content.toLowerCase().includes(q)))
      : conversations;

    els.list.innerHTML = '';
    if (!list.length) {
      const empty = document.createElement('div');
      empty.className = 'conv-empty';
      empty.textContent = q ? 'No conversations match your search.' : 'No conversations yet — start one!';
      els.list.appendChild(empty);
      return;
    }

    list.forEach(c => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'conv-item' + (c.id === activeId ? ' active' : '');
      item.innerHTML = `
        <span class="conv-title">${NovaMarkdown.escapeHtml(c.title)}</span>
        <span class="conv-delete" title="Delete conversation" aria-label="Delete conversation">🗑</span>
      `;
      item.addEventListener('click', () => selectConversation(c.id));
      item.querySelector('.conv-delete').addEventListener('click', (e) => deleteConversation(c.id, e));
      els.list.appendChild(item);
    });
  }

  function closeSidebarOnMobile() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (window.innerWidth <= 880) {
      sidebar.classList.remove('open');
      overlay.hidden = true;
    }
  }

  // ---------------- Rendering ----------------
  function showWelcome() {
    els.messages.innerHTML = '';
    els.messages.appendChild(els.welcome);
    els.welcome.hidden = false;
    els.title.textContent = 'New conversation';
  }

  function scrollToBottom() {
    els.messages.scrollTo({ top: els.messages.scrollHeight, behavior: 'smooth' });
  }

  function renderMessages() {
    const convo = getActive();
    els.messages.innerHTML = '';
    if (!convo || convo.messages.length === 0) { showWelcome(); return; }

    els.title.textContent = convo.title;
    convo.messages.forEach((m, idx) => appendMessageEl(m, idx === convo.messages.length - 1 && m.role === 'assistant'));
    scrollToBottom();
  }

  function buildAvatar(role) {
    const span = document.createElement('div');
    span.className = 'msg-avatar';
    span.textContent = role === 'user' ? (currentUserInitial() || 'U') : 'N';
    return span;
  }

  function currentUserInitial() {
    const user = NovaAuth.currentUser();
    return user ? user.name.trim().charAt(0).toUpperCase() : 'U';
  }

  function buildFileChips(files) {
    if (!files || !files.length) return null;
    const wrap = document.createElement('div');
    wrap.className = 'msg-files';
    files.forEach(f => {
      const chip = document.createElement('span');
      chip.className = 'msg-file-chip';
      chip.textContent = `${f.kind === 'image' ? '🖼' : '📄'} ${f.name}`;
      wrap.appendChild(chip);
    });
    return wrap;
  }

  function appendMessageEl(message, isLast) {
    const row = document.createElement('div');
    row.className = `msg-row ${message.role === 'user' ? 'user' : 'ai'}`;
    row.dataset.id = message.id;

    const body = document.createElement('div');
    body.className = 'msg-body';

    if (message.files && message.files.length) {
      const chips = buildFileChips(message.files);
      if (chips) body.appendChild(chips);
    }

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble' + (message.error ? ' error' : '');
    if (message.role === 'assistant') {
      bubble.innerHTML = NovaMarkdown.render(message.content);
    } else {
      bubble.textContent = message.content;
    }
    body.appendChild(bubble);

    const actions = document.createElement('div');
    actions.className = 'msg-actions';

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.innerHTML = '📋 Copy';
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(message.content).then(() => {
        copyBtn.innerHTML = '✅ Copied';
        setTimeout(() => (copyBtn.innerHTML = '📋 Copy'), 1500);
      });
    });
    actions.appendChild(copyBtn);

    if (message.role === 'assistant') {
      const speakBtn = document.createElement('button');
      speakBtn.type = 'button';
      speakBtn.innerHTML = '🔊 Listen';
      speakBtn.addEventListener('click', () => NovaVoice.speak(message.content));
      actions.appendChild(speakBtn);

      if (isLast) {
        const regenBtn = document.createElement('button');
        regenBtn.type = 'button';
        regenBtn.innerHTML = '🔁 Regenerate';
        regenBtn.addEventListener('click', regenerateLast);
        actions.appendChild(regenBtn);
      }
    }
    body.appendChild(actions);

    row.appendChild(buildAvatar(message.role));
    row.appendChild(body);
    els.messages.appendChild(row);

    if (message.role === 'assistant') NovaMarkdown.enhanceCodeBlocks(bubble);
    return row;
  }

  function showSkeleton() {
    const row = document.createElement('div');
    row.className = 'skeleton-row';
    row.id = 'skeleton-row';
    row.innerHTML = `
      <div class="skeleton skeleton-avatar"></div>
      <div class="skeleton-lines"><div></div><div></div><div></div></div>
    `;
    els.messages.appendChild(row);
    scrollToBottom();
  }

  function removeSkeleton() {
    document.getElementById('skeleton-row')?.remove();
  }

  function showTypingBubble() {
    const row = document.createElement('div');
    row.className = 'msg-row ai';
    row.id = 'typing-row';
    row.innerHTML = `
      <div class="msg-avatar">N</div>
      <div class="msg-body"><div class="msg-bubble typing-bubble"><span></span><span></span><span></span></div></div>
    `;
    els.messages.appendChild(row);
    scrollToBottom();
  }

  function removeTypingBubble() {
    document.getElementById('typing-row')?.remove();
  }

  // ---------------- Sending messages ----------------
  function autoTitle(text) {
    const trimmed = text.trim().replace(/\s+/g, ' ');
    return trimmed.length > 42 ? trimmed.slice(0, 42) + '…' : (trimmed || 'New conversation');
  }

  async function sendMessage(text, filesOverride) {
    if (isGenerating) return;
    const trimmed = (text || '').trim();
    const files = filesOverride !== undefined ? filesOverride : pendingFiles;
    if (!trimmed && (!files || !files.length)) return;

    let convo = getActive();
    if (!convo) {
      convo = { id: NovaStorage.uid('conv'), title: 'New conversation', messages: [], createdAt: Date.now() };
      conversations.unshift(convo);
      activeId = convo.id;
    }
    if (convo.messages.length === 0) convo.title = autoTitle(trimmed || (files[0] && files[0].name) || 'New conversation');

    els.welcome.hidden = true;

    // Build user-visible + AI-context content (append extracted file text to prompt context)
    let aiContextText = trimmed;
    if (files && files.length) {
      const textFiles = files.filter(f => f.kind === 'text' && f.textContent);
      if (textFiles.length) {
        aiContextText += '\n\n' + textFiles.map(f => `--- Content of ${f.name} ---\n${f.textContent}`).join('\n\n');
      }
    }

    const userMsg = { id: NovaStorage.uid('msg'), role: 'user', content: trimmed || `(Sent ${files.length} file${files.length > 1 ? 's' : ''})`, files, ts: Date.now() };
    convo.messages.push(userMsg);
    appendMessageEl(userMsg, false);
    scrollToBottom();
    persist();
    renderSidebarList(els.search.value);
    els.title.textContent = convo.title;

    pendingFiles = [];
    renderFilePreview();
    els.input.value = '';
    autoResizeInput();

    await generateAndAppendAssistantReply(convo, aiContextText);
  }

  async function generateAndAppendAssistantReply(convo, lastUserContextOverride) {
    isGenerating = true;
    setComposerBusy(true);
    showTypingBubble();

    // Build the model-facing history (use override context for the very last user turn if provided)
    const history = convo.messages.map((m, idx) => {
      if (lastUserContextOverride !== undefined && idx === convo.messages.length - 1 && m.role === 'user') {
        return { role: 'user', content: lastUserContextOverride };
      }
      return { role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content };
    });

    try {
      const { text, offline } = await NovaAI.getResponse(history);
      removeTypingBubble();
      const aiMsg = { id: NovaStorage.uid('msg'), role: 'assistant', content: text, ts: Date.now(), offline };
      convo.messages.push(aiMsg);
      persist();
      renderMessages();
      if (ttsAutoEnabled) NovaVoice.speak(text);
    } catch (err) {
      removeTypingBubble();
      console.error('Nova AI generation failed:', err);
      const errMsg = {
        id: NovaStorage.uid('msg'), role: 'assistant',
        content: "Sorry — I couldn't generate a response just now. Please check your connection and try again.",
        error: true, ts: Date.now(),
      };
      convo.messages.push(errMsg);
      persist();
      renderMessages();
      NovaApp.toast('Something went wrong generating a response.', 'error');
    } finally {
      isGenerating = false;
      setComposerBusy(false);
    }
  }

  function regenerateLast() {
    const convo = getActive();
    if (!convo || isGenerating) return;
    // Remove the last assistant message, then regenerate from remaining history.
    const lastIdx = convo.messages.length - 1;
    if (convo.messages[lastIdx]?.role === 'assistant') {
      convo.messages.pop();
      persist();
      renderMessages();
    }
    generateAndAppendAssistantReply(convo);
  }

  function setComposerBusy(busy) {
    els.sendBtn.disabled = busy;
  }

  // ---------------- Composer interactions ----------------
  function autoResizeInput() {
    els.input.style.height = 'auto';
    els.input.style.height = Math.min(els.input.scrollHeight, 200) + 'px';
  }

  function renderFilePreview() {
    const row = els.filePreviewRow;
    row.innerHTML = '';
    if (!pendingFiles.length) { row.hidden = true; return; }
    row.hidden = false;
    pendingFiles.forEach((f, idx) => {
      const chip = document.createElement('div');
      chip.className = 'file-chip';
      chip.innerHTML = `<span>${f.kind === 'image' ? '🖼' : '📄'} ${NovaMarkdown.escapeHtml(f.name)} <small style="opacity:.6">(${f.sizeLabel})</small></span>`;
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.textContent = '✕';
      removeBtn.addEventListener('click', () => { pendingFiles.splice(idx, 1); renderFilePreview(); });
      chip.appendChild(removeBtn);
      row.appendChild(chip);
    });
  }

  function bindEvents() {
    els.form.addEventListener('submit', (e) => {
      e.preventDefault();
      sendMessage(els.input.value);
    });

    els.input.addEventListener('input', autoResizeInput);
    els.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(els.input.value);
      }
    });

    document.querySelectorAll('.suggestion-card').forEach(card => {
      card.addEventListener('click', () => sendMessage(card.dataset.prompt));
    });

    els.search.addEventListener('input', () => renderSidebarList(els.search.value));

    // File attach
    const attachBtn = document.getElementById('attach-btn');
    const fileInput = document.getElementById('file-input');
    attachBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async (e) => {
      if (!e.target.files.length) return;
      NovaApp.toast('Reading file(s)…', 'success');
      const processed = await NovaFileUpload.processFiles(e.target.files);
      processed.forEach(f => {
        if (f.kind === 'unsupported') {
          NovaApp.toast(`${f.name}: ${f.error}`, 'error');
        } else {
          pendingFiles.push(f);
        }
      });
      renderFilePreview();
      fileInput.value = '';
    });
  }

  // ---------------- Settings hooks ----------------
  function setTtsAuto(enabled) { ttsAutoEnabled = enabled; }
  function getActiveConversationOrNull() { return getActive(); }

  return {
    init, newConversation, selectConversation, deleteConversation, clearAllHistory,
    sendMessage, setTtsAuto, getActiveConversationOrNull, renderSidebarList,
  };
})();
