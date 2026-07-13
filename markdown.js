/* =========================================================
   NOVA AI — markdown.js
   Renders AI message markdown into safe, styled HTML with
   syntax-highlighted, copyable code blocks.
========================================================= */

const NovaMarkdown = (() => {
  let configured = false;

  function configure() {
    if (configured || typeof marked === 'undefined') return;
    marked.setOptions({
      breaks: true,
      gfm: true,
    });
    configured = true;
  }

  /** Escape raw HTML to prevent injection from user/AI text before markdown parse fallback. */
  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /**
   * Render markdown text into an HTML string. Falls back to escaped
   * plain text (with line breaks) if marked.js hasn't loaded yet.
   */
  function render(text) {
    configure();
    if (typeof marked === 'undefined') {
      return `<p>${escapeHtml(text).replace(/\n/g, '<br>')}</p>`;
    }
    const rawHtml = marked.parse(text || '');
    return rawHtml;
  }

  /**
   * Post-process a rendered message element: wrap <pre><code> blocks
   * with a header (language + copy button) and apply syntax highlighting.
   */
  function enhanceCodeBlocks(container) {
    const blocks = container.querySelectorAll('pre code');
    blocks.forEach(codeEl => {
      // Syntax highlight
      if (typeof hljs !== 'undefined') {
        try { hljs.highlightElement(codeEl); } catch (e) { /* ignore */ }
      }
      const pre = codeEl.parentElement;
      if (pre.parentElement && pre.parentElement.classList.contains('code-block-wrap')) return;

      const lang = (codeEl.className.match(/language-(\w+)/) || [, 'text'])[1];

      const wrap = document.createElement('div');
      wrap.className = 'code-block-wrap';

      const head = document.createElement('div');
      head.className = 'code-block-head';
      head.innerHTML = `<span>${lang}</span>`;

      const copyBtn = document.createElement('button');
      copyBtn.className = 'code-copy-btn';
      copyBtn.type = 'button';
      copyBtn.textContent = 'Copy';
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(codeEl.textContent).then(() => {
          copyBtn.textContent = 'Copied!';
          setTimeout(() => (copyBtn.textContent = 'Copy'), 1500);
        }).catch(() => NovaApp.toast('Could not copy to clipboard', 'error'));
      });
      head.appendChild(copyBtn);

      pre.parentNode.insertBefore(wrap, pre);
      wrap.appendChild(head);
      wrap.appendChild(pre);
    });
  }

  return { render, enhanceCodeBlocks, escapeHtml };
})();
