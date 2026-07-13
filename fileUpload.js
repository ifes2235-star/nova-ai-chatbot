/* =========================================================
   NOVA AI — fileUpload.js
   Reads attached files (PDF, DOCX, TXT, images) and extracts
   text content where possible so it can be added to the AI's
   context. Falls back gracefully if a parsing library isn't
   loaded yet.
========================================================= */

const NovaFileUpload = (() => {
  const MAX_FILE_MB = 10;
  const MAX_CHARS = 6000; // cap extracted text so prompts stay reasonable

  function humanSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function truncate(text) {
    if (!text) return '';
    return text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) + '\n…(truncated)' : text;
  }

  function readAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  function readAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function readAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  async function extractPdfText(file) {
    if (typeof pdfjsLib === 'undefined') return '[PDF text extraction library not loaded]';
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const buffer = await readAsArrayBuffer(file);
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    let text = '';
    const pageCount = Math.min(pdf.numPages, 15); // cap pages for performance
    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(it => it.str).join(' ') + '\n';
      if (text.length > MAX_CHARS) break;
    }
    return truncate(text.trim());
  }

  async function extractDocxText(file) {
    if (typeof mammoth === 'undefined') return '[DOCX text extraction library not loaded]';
    const buffer = await readAsArrayBuffer(file);
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    return truncate(result.value.trim());
  }

  /**
   * Process a single File object into a normalized attachment record:
   * { name, size, type, kind: 'text'|'image'|'unsupported', textContent?, dataUrl? }
   */
  async function processFile(file) {
    const base = { name: file.name, size: file.size, sizeLabel: humanSize(file.size), type: file.type };

    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      return { ...base, kind: 'unsupported', error: `File exceeds ${MAX_FILE_MB}MB limit.` };
    }

    try {
      if (file.type.startsWith('image/')) {
        const dataUrl = await readAsDataURL(file);
        return { ...base, kind: 'image', dataUrl };
      }
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        const textContent = await extractPdfText(file);
        return { ...base, kind: 'text', textContent };
      }
      if (file.name.toLowerCase().endsWith('.docx')) {
        const textContent = await extractDocxText(file);
        return { ...base, kind: 'text', textContent };
      }
      if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) {
        const textContent = truncate(await readAsText(file));
        return { ...base, kind: 'text', textContent };
      }
      return { ...base, kind: 'unsupported', error: 'Unsupported file type.' };
    } catch (err) {
      console.error('File processing failed:', err);
      return { ...base, kind: 'unsupported', error: 'Could not read this file.' };
    }
  }

  async function processFiles(fileList) {
    const files = Array.from(fileList);
    return Promise.all(files.map(processFile));
  }

  return { processFiles, humanSize };
})();
