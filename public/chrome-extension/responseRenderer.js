// Bob Semantic Response Renderer
// Implements the Bob AI Response Experience specification:
// Semantic blocks: Headings with colored accents, clean paragraphs (no rigid card wrapper),
// bullet lists with bold lead-ins, responsive tables, callouts (Tip, Info, Warning),
// code blocks with language & copy, citations, and contextual action bar.

(function () {
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatInline(str, citations) {
    if (!str) return '';

    // Citations [1], [2]
    str = str.replace(/\[(\d+)\]/g, (match, num) => {
      const idx = parseInt(num, 10);
      const cite = citations && citations[idx - 1];
      const title = cite ? escapeHtml(cite.title || cite.url || `Source ${num}`) : `Source ${num}`;
      return `<sup class="bob-citation" data-cite-idx="${idx}" title="${title}">[${idx}]</sup>`;
    });

    // Code: `code`
    str = str.replace(/`([^`]+)`/g, (m, c) => `<code class="bob-inline-code">${escapeHtml(c)}</code>`);

    // Bold: **text**
    str = str.replace(/\*\*([^*]+)\*\*/g, (m, b) => `<strong class="bob-strong">${b}</strong>`);

    // Italic: *text*
    str = str.replace(/\*([^*]+)\*/g, (m, i) => `<em class="bob-em">${i}</em>`);

    // Links: [text](url)
    str = str.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (m, txt, url) => {
      return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="bob-link">${escapeHtml(txt)} <span class="arr">↗</span></a>`;
    });

    return str;
  }

  function detectHeadingAccent(text) {
    const lower = text.toLowerCase();
    if (lower.includes('finding') || lower.includes('insight') || lower.includes('evidence') || lower.includes('claim') || lower.includes('research') || lower.includes('analysis')) {
      return 'blue';
    }
    if (lower.includes('recommend') || lower.includes('suggest') || lower.includes('plan') || lower.includes('action') || lower.includes('next step') || lower.includes('takeaway')) {
      return 'yellow';
    }
    if (lower.includes('conclusion') || lower.includes('summary') || lower.includes('result') || lower.includes('outcome') || lower.includes('completed') || lower.includes('done')) {
      return 'green';
    }
    if (lower.includes('caution') || lower.includes('warning') || lower.includes('risk') || lower.includes('limitation') || lower.includes('tradeoff')) {
      return 'orange';
    }
    return 'default';
  }

  function renderBobResponse(rawText, citations = [], options = {}) {
    const container = document.createElement('div');
    container.className = 'bob-response-flow';

    const lines = (rawText || '').split(/\r?\n/);
    let inCode = false;
    let codeBuffer = [];
    let codeLang = '';

    let inTable = false;
    let tableBuffer = [];

    let inList = false;
    let listType = 'ul'; // 'ul' or 'ol'
    let listItems = [];

    let inBlockquote = false;
    let quoteBuffer = [];

    function flushList() {
      if (!inList || !listItems.length) return;
      const listEl = document.createElement(listType);
      listEl.className = listType === 'ul' ? 'bob-bullet-list' : 'bob-numbered-list';
      listItems.forEach(itemText => {
        const li = document.createElement('li');
        li.className = 'bob-list-item';
        // Checklist detection: [ ] or [x]
        const checkMatch = itemText.match(/^\[([ xX])\]\s*(.*)$/);
        if (checkMatch) {
          li.classList.add('bob-checklist-item');
          const isChecked = checkMatch[1].toLowerCase() === 'x';
          li.innerHTML = `<input type="checkbox" ${isChecked ? 'checked' : ''} disabled class="bob-checklist-box"> <span>${formatInline(checkMatch[2], citations)}</span>`;
        } else {
          li.innerHTML = formatInline(itemText, citations);
        }
        listEl.appendChild(li);
      });
      container.appendChild(listEl);
      inList = false;
      listItems = [];
    }

    function flushTable() {
      if (!inTable || tableBuffer.length < 2) {
        inTable = false;
        tableBuffer = [];
        return;
      }
      const wrap = document.createElement('div');
      wrap.className = 'bob-table-wrap';

      const table = document.createElement('table');
      table.className = 'bob-table';

      const headerLine = tableBuffer[0];
      const headers = headerLine.split('|').map(s => s.trim()).filter((s, i, a) => (i > 0 && i < a.length - 1) || a.length <= 2);

      const thead = document.createElement('thead');
      const trHead = document.createElement('tr');
      headers.forEach(h => {
        const th = document.createElement('th');
        th.innerHTML = formatInline(h, citations);
        trHead.appendChild(th);
      });
      thead.appendChild(trHead);
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      // Skip row 0 (headers) and row 1 (separator |---|---|)
      const dataRows = tableBuffer.slice(2);
      dataRows.forEach(rowLine => {
        const cells = rowLine.split('|').map(s => s.trim()).filter((s, i, a) => (i > 0 && i < a.length - 1) || a.length <= 2);
        if (cells.length > 0) {
          const tr = document.createElement('tr');
          cells.forEach((cell, cIdx) => {
            const td = document.createElement('td');
            td.innerHTML = formatInline(cell, citations);
            tr.appendChild(td);
          });
          tbody.appendChild(tr);
        }
      });
      table.appendChild(tbody);
      wrap.appendChild(table);
      container.appendChild(wrap);

      inTable = false;
      tableBuffer = [];
    }

    function flushCode() {
      if (!inCode) return;
      const codeWrap = document.createElement('div');
      codeWrap.className = 'bob-code-block';

      const topBar = document.createElement('div');
      topBar.className = 'bob-code-header';
      topBar.innerHTML = `
        <span class="bob-code-lang">${escapeHtml(codeLang || 'code')}</span>
        <button class="bob-code-copy" type="button" title="Copy code">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          <span>Copy</span>
        </button>
      `;

      const codeText = codeBuffer.join('\n');
      const copyBtn = topBar.querySelector('.bob-code-copy');
      if (copyBtn) {
        copyBtn.addEventListener('click', () => {
          navigator.clipboard.writeText(codeText).then(() => {
            copyBtn.innerHTML = `<span>Copied!</span>`;
            setTimeout(() => {
              copyBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                <span>Copy</span>
              `;
            }, 1800);
          });
        });
      }

      const pre = document.createElement('pre');
      const code = document.createElement('code');
      code.className = `language-${codeLang || 'plaintext'}`;
      code.textContent = codeText;
      pre.appendChild(code);

      codeWrap.appendChild(topBar);
      codeWrap.appendChild(pre);
      container.appendChild(codeWrap);

      inCode = false;
      codeBuffer = [];
      codeLang = '';
    }

    function flushBlockquote() {
      if (!inBlockquote || !quoteBuffer.length) {
        inBlockquote = false;
        quoteBuffer = [];
        return;
      }
      const fullText = quoteBuffer.join(' ').trim();
      // Check for Callout syntax: [!TIP], [!INFO], [!WARNING], [!IMPORTANT], or Tip:, Note:, Warning:
      let calloutType = null;
      let calloutTitle = '';
      let calloutContent = fullText;

      const tipMatch = fullText.match(/^(?:\[!TIP\]|\*\*Tip\*\*:?|Tip:)\s*(.*)$/i);
      const infoMatch = fullText.match(/^(?:\[!INFO\]|\[!NOTE\]|\*\*Note\*\*:?|Note:|\*\*Info\*\*:?|Info:)\s*(.*)$/i);
      const warnMatch = fullText.match(/^(?:\[!WARNING\]|\*\*Warning\*\*:?|Warning:|\*\*Caution\*\*:?)\s*(.*)$/i);
      const impMatch = fullText.match(/^(?:\[!IMPORTANT\]|\*\*Important\*\*:?|Important:)\s*(.*)$/i);

      if (tipMatch) {
        calloutType = 'tip';
        calloutTitle = 'Tip';
        calloutContent = tipMatch[1];
      } else if (infoMatch) {
        calloutType = 'info';
        calloutTitle = 'Information';
        calloutContent = infoMatch[1];
      } else if (warnMatch) {
        calloutType = 'warning';
        calloutTitle = 'Caution';
        calloutContent = warnMatch[1];
      } else if (impMatch) {
        calloutType = 'important';
        calloutTitle = 'Important';
        calloutContent = impMatch[1];
      }

      if (calloutType) {
        const callout = document.createElement('div');
        callout.className = `bob-callout ${calloutType}`;
        const icon = calloutType === 'tip' ? '💡' : calloutType === 'info' ? 'ℹ️' : calloutType === 'warning' ? '⚠️' : '🎯';
        callout.innerHTML = `
          <div class="bob-callout-head">
            <span class="bob-callout-icon">${icon}</span>
            <span class="bob-callout-title">${calloutTitle}</span>
          </div>
          <div class="bob-callout-body">${formatInline(calloutContent, citations)}</div>
        `;
        container.appendChild(callout);
      } else {
        const bq = document.createElement('blockquote');
        bq.className = 'bob-quote';
        bq.innerHTML = formatInline(fullText, citations);
        container.appendChild(bq);
      }

      inBlockquote = false;
      quoteBuffer = [];
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // 1. Code fence ```
      if (trimmed.startsWith('```')) {
        if (!inCode) {
          flushList();
          flushTable();
          flushBlockquote();
          inCode = true;
          codeLang = trimmed.slice(3).trim();
          codeBuffer = [];
        } else {
          flushCode();
        }
        continue;
      }
      if (inCode) {
        codeBuffer.push(line);
        continue;
      }

      // 2. Table row | ... |
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        flushList();
        flushBlockquote();
        inTable = true;
        tableBuffer.push(trimmed);
        continue;
      } else if (inTable) {
        flushTable();
      }

      // 3. Blockquote > ...
      if (trimmed.startsWith('>')) {
        flushList();
        flushTable();
        inBlockquote = true;
        quoteBuffer.push(trimmed.replace(/^>\s*/, ''));
        continue;
      } else if (inBlockquote) {
        flushBlockquote();
      }

      // 4. Bullet lists: - , * , •
      const bulletMatch = line.match(/^(\s*)([-*•])\s+(.*)$/);
      if (bulletMatch) {
        flushTable();
        flushBlockquote();
        if (!inList || listType !== 'ul') {
          flushList();
          inList = true;
          listType = 'ul';
        }
        listItems.push(bulletMatch[3]);
        continue;
      }

      // 5. Numbered lists: 1. , 2.
      const numMatch = line.match(/^(\s*)\d+\.\s+(.*)$/);
      if (numMatch) {
        flushTable();
        flushBlockquote();
        if (!inList || listType !== 'ol') {
          flushList();
          inList = true;
          listType = 'ol';
        }
        listItems.push(numMatch[2]);
        continue;
      }

      // If we were in a list and this is not a list item:
      if (inList) {
        flushList();
      }

      // 6. Blank line
      if (trimmed === '') {
        continue;
      }

      // 7. Headings
      if (trimmed.startsWith('# ')) {
        const text = trimmed.slice(2).trim();
        const h1 = document.createElement('h1');
        h1.className = 'bob-h1';
        h1.innerHTML = formatInline(text, citations);
        container.appendChild(h1);
        continue;
      }

      if (trimmed.startsWith('## ')) {
        const text = trimmed.slice(3).trim();
        const accent = detectHeadingAccent(text);
        const h2 = document.createElement('h2');
        h2.className = `bob-h2 bob-heading-${accent}`;
        h2.innerHTML = `<span class="bob-heading-accent"></span><span>${formatInline(text, citations)}</span>`;
        container.appendChild(h2);
        continue;
      }

      if (trimmed.startsWith('### ')) {
        const text = trimmed.slice(4).trim();
        const h3 = document.createElement('h3');
        h3.className = 'bob-h3';
        h3.innerHTML = formatInline(text, citations);
        container.appendChild(h3);
        continue;
      }

      // 8. Normal paragraph text
      const p = document.createElement('p');
      p.className = 'bob-p';
      p.innerHTML = formatInline(trimmed, citations);
      container.appendChild(p);
    }

    // Flush any pending buffers
    flushCode();
    flushTable();
    flushBlockquote();
    flushList();

    // Citations Sources Section at bottom if sources exist
    if (citations && citations.length > 0) {
      const srcWrap = document.createElement('div');
      srcWrap.className = 'bob-sources-section';
      srcWrap.innerHTML = `
        <div class="bob-sources-head">
          <span class="bob-sources-icon">🔗</span>
          <span class="bob-sources-title">Referenced Tab Sources</span>
          <span class="bob-sources-count">${citations.length}</span>
        </div>
        <div class="bob-sources-chips">
          ${citations.map((c, i) => `
            <a href="${escapeHtml(c.url || '#')}" target="_blank" rel="noopener noreferrer" class="bob-source-chip" title="${escapeHtml(c.title || c.url)}">
              <span class="bob-source-num">${i + 1}</span>
              <span class="bob-source-text">${escapeHtml(c.title || c.url || 'Source')}</span>
              <span class="arr">↗</span>
            </a>
          `).join('')}
        </div>
      `;
      container.appendChild(srcWrap);
    }

    // Action Bar (Copy, Save to Notes, Turn into Task)
    const actionsBar = document.createElement('div');
    actionsBar.className = 'bob-response-actions';
    actionsBar.innerHTML = `
      <button class="bob-action-btn btn-copy" type="button" title="Copy response to clipboard">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="13" height="13"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        <span>Copy</span>
      </button>
      <button class="bob-action-btn btn-save-notes" type="button" title="Save this response to Research Notes">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="13" height="13"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
        <span>Save to Notes</span>
      </button>
      <button class="bob-action-btn btn-task" type="button" title="Create actionable research task">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="13" height="13"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
        <span>Turn into Task</span>
      </button>
    `;

    const copyBtn = actionsBar.querySelector('.btn-copy');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(rawText).then(() => {
          copyBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.2" width="13" height="13"><polyline points="20 6 9 17 4 12"/></svg>
            <span style="color:#16a34a;font-weight:600;">Copied</span>
          `;
          setTimeout(() => {
            copyBtn.innerHTML = `
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="13" height="13"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              <span>Copy</span>
            `;
          }, 1800);
        });
      });
    }

    const saveNotesBtn = actionsBar.querySelector('.btn-save-notes');
    if (saveNotesBtn) {
      saveNotesBtn.addEventListener('click', () => {
        if (typeof options.onSaveNotes === 'function') {
          options.onSaveNotes(rawText);
        }
        saveNotesBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.2" width="13" height="13"><polyline points="20 6 9 17 4 12"/></svg>
          <span style="color:#16a34a;font-weight:600;">Saved</span>
        `;
      });
    }

    const taskBtn = actionsBar.querySelector('.btn-task');
    if (taskBtn) {
      taskBtn.addEventListener('click', () => {
        if (typeof options.onCreateTask === 'function') {
          options.onCreateTask(rawText);
        }
        taskBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2.2" width="13" height="13"><polyline points="20 6 9 17 4 12"/></svg>
          <span style="color:#0284c7;font-weight:600;">Task Created</span>
        `;
      });
    }

    container.appendChild(actionsBar);

    return container;
  }

  // Export to window
  window.renderBobResponse = renderBobResponse;
})();
