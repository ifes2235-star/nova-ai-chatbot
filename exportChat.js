/* =========================================================
   NOVA AI — exportChat.js
   Export a conversation to a downloadable .txt or .pdf file.
========================================================= */

const NovaExport = (() => {

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function safeFilename(title) {
    return (title || 'nova-conversation').replace(/[^\w\- ]/g, '').trim().slice(0, 60) || 'nova-conversation';
  }

  function toTxt(conversation) {
    const lines = [`Nova AI — ${conversation.title}`, `Exported ${new Date().toLocaleString()}`, ''.padEnd(40, '=')];
    conversation.messages.forEach(m => {
      const speaker = m.role === 'user' ? 'You' : 'Nova AI';
      lines.push(`\n${speaker}:\n${m.content}`);
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, `${safeFilename(conversation.title)}.txt`);
  }

  function toPdf(conversation) {
    if (typeof window.jspdf === 'undefined') {
      NovaApp.toast('PDF export library failed to load. Check your connection.', 'error');
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 48;
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxWidth = pageWidth - margin * 2;
    let y = margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Nova AI Conversation', margin, y);
    y += 20;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(`${conversation.title} — exported ${new Date().toLocaleString()}`, margin, y);
    y += 26;
    doc.setTextColor(20);

    conversation.messages.forEach(m => {
      const speaker = m.role === 'user' ? 'You' : 'Nova AI';
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      if (y > 760) { doc.addPage(); y = margin; }
      doc.text(speaker, margin, y);
      y += 16;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      const plain = m.content.replace(/```[\s\S]*?```/g, code => code.replace(/```\w*\n?/g, ''));
      const wrapped = doc.splitTextToSize(plain, maxWidth);
      wrapped.forEach(line => {
        if (y > 780) { doc.addPage(); y = margin; }
        doc.text(line, margin, y);
        y += 14;
      });
      y += 12;
    });

    doc.save(`${safeFilename(conversation.title)}.pdf`);
  }

  return { toTxt, toPdf };
})();
