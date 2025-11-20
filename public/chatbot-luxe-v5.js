/* public/chatbot-luxe-v5.js
   Chatbot V5+ Ultimate (front-end)
   -> Ne contient PAS de clé API : il appelle /api/chat (proxy)
   -> Place ce fichier dans /public et intègre via <script src="https://<ton-projet>.vercel.app/public/chatbot-luxe-v5.js"></script>
*/

(function () {
  const CONFIG = {
    apiEndpoint: (typeof CHATBOT_API_ENDPOINT !== 'undefined') ? CHATBOT_API_ENDPOINT : '/api/chat',
    suggestItems: [
      { t: 'Accueil', u: 'https://soloatico.es/FR/accueil' },
      { t: 'Suites', u: 'https://soloatico.es/es/suites' },
      { t: 'Réserver', u: 'https://soloatico.amenitiz.io/fr/booking/room#DatesGuests-BE' },
      { t: 'Tintorera', u: 'https://soloatico.es/es/tintorera-1' },
      { t: 'Reiki', u: 'https://soloatico.es/es/tratamiento-reiki' },
      { t: 'Que faire', u: 'https://soloatico.es/es/quehacer' },
      { t: 'Contact', u: 'https://soloatico.es/es/contacto' }
    ]
  };

  /* --- Utils --- */
  function escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Basic transformation for custom image token: [IMAGE]url[/IMAGE]
  function renderRichText(raw) {
    if (!raw) return '';
    // escape then restore images
    let safe = escapeHtml(raw);
    // Convert [IMAGE]URL[/IMAGE] into an <img> tag
    safe = safe.replace(/\[IMAGE\](https?:\/\/[^\]\s]+)\[\/IMAGE\]/gi, function (m, url) {
      return `<div style="margin-top:8px;"><img src="${url}" style="width:100%;max-width:200px;border-radius:8px;object-fit:cover;" alt="image"></div>`;
    });
    // Allow simple links: convert plain URLs to <a>
    safe = safe.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    // newlines to <br>
    safe = safe.replace(/\n/g, '<br>');
    return safe;
  }

  /* --- Create UI --- */
  function createUI() {
    // Button
    const btn = document.createElement('div');
    btn.id = 'sa_btn';
    btn.title = 'Ouvrir le chat Solo Ático';
    Object.assign(btn.style, {
      position: 'fixed', right: '25px', bottom: '25px',
      width: '72px', height: '72px', borderRadius: '50%',
      background: '#003b70', color: '#fff', display: 'flex',
      alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
      zIndex: 999999, boxShadow: '0 8px 24px rgba(0,0,0,0.25)', fontSize: '34px'
    });
    btn.innerHTML = '💬';

    // Box
    const box = document.createElement('div');
    box.id = 'sa_box';
    Object.assign(box.style, {
      position: 'fixed', right: '25px', bottom: '110px',
      width: '520px', maxHeight: '720px', background: '#f7fbff',
      border: '2px solid #004080', borderRadius: '14px', display: 'none',
      flexDirection: 'column', zIndex: 999998, overflow: 'hidden',
      boxShadow: '0 12px 40px rgba(0,0,0,0.28)', fontFamily: 'Inter, system-ui, sans-serif'
    });

    box.innerHTML = `
      <div id="sa_header" style="padding:14px;background:#004080;color:#fff;font-weight:700;display:flex;justify-content:space-between;align-items:center;">
        <div>Solo Ático — Concierge 5★</div>
        <div id="sa_close" style="cursor:pointer;opacity:0.9">✕</div>
      </div>
      <div id="sa_chat" style="flex:1;overflow:auto;padding:14px;font-size:14px;line-height:1.45;background:linear-gradient(#f7fbff,#ffffff);"></div>
      <div id="sa_suggestions" style="padding:10px;border-top:1px solid #e6eef8;display:flex;gap:8px;flex-wrap:wrap;background:#f7fbff;"></div>
      <div style="padding:10px;border-top:1px solid #e6eef8;display:flex;gap:8px;background:#ffffff;">
        <input id="sa_input" placeholder="Écrire un message..." style="flex:1;padding:10px;border-radius:8px;border:1px solid #d7e6f6;font-size:14px;">
        <button id="sa_send" style="background:#004080;color:#fff;border:none;padding:10px 14px;border-radius:8px;cursor:pointer;">Envoyer</button>
      </div>
    `;

    document.body.appendChild(btn);
    document.body.appendChild(box);

    // Toggle
    btn.addEventListener('click', () => {
      box.style.display = box.style.display === 'none' ? 'flex' : 'none';
      if (box.style.display === 'flex') {
        renderSuggestions();
        const chat = document.getElementById('sa_chat');
        setTimeout(()=> chat.scrollTop = chat.scrollHeight, 100);
      }
    });
    document.getElementById('sa_close').addEventListener('click', () => box.style.display = 'none');
  }

  function renderSuggestions() {
    const area = document.getElementById('sa_suggestions');
    area.innerHTML = '';
    CONFIG.suggestItems.forEach(it => {
      const b = document.createElement('button');
      b.innerText = it.t;
      Object.assign(b.style, { padding: '8px 10px', borderRadius: '8px', border: 'none', background: '#004080', color: '#fff', cursor: 'pointer', fontSize:'13px' });
      b.onclick = () => {
        // open page directly and also add to chat
        appendMessage('user', it.t);
        sendToServer(it.t);
      };
      area.appendChild(b);
    });
  }

  /* --- Messaging --- */
  function appendMessage(kind, content) {
    const chat = document.getElementById('sa_chat');
    const wrapper = document.createElement('div');
    wrapper.style.marginBottom = '12px';
    if (kind === 'user') {
      wrapper.style.display = 'flex';
      wrapper.style.justifyContent = 'flex-end';
      wrapper.innerHTML = `<div style="background:#e6f2ff;padding:10px 12px;border-radius:12px;max-width:78%;font-size:14px;"><strong style="display:block;margin-bottom:6px;color:#004080">Vous</strong><div>${escapeHtml(content)}</div></div>`;
    } else {
      wrapper.style.display = 'flex';
      wrapper.style.justifyContent = 'flex-start';
      // allow rich rendering for assistant replies (images, links)
      wrapper.innerHTML = `<div style="background:#fff;padding:12px;border-radius:12px;max-width:78%;border:1px solid #e6eef8;color:#072039;font-size:14px;"><strong style="display:block;margin-bottom:6px;color:#004080">Solo Ático</strong><div>${renderRichText(content)}</div></div>`;
    }
    chat.appendChild(wrapper);
    chat.scrollTop = chat.scrollHeight;
  }

  async function sendToServer(text) {
    appendMessage('user', text);
    const lang = (navigator.language || 'fr').slice(0,2).toLowerCase();
    // show typing indicator
    const typingId = showTyping();
    try {
      const res = await fetch(CONFIG.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_message: text, visitor_lang: lang })
      });
      const j = await res.json();
      hideTyping(typingId);
      if (j.error) {
        const errMsg = j.error && (j.error.message || j.error) ? (j.error.message || j.error) : 'erreur';
        appendMessage('bot', `Le chatbot ne peut pas répondre pour le moment : ${escapeHtml(errMsg)}`);
        console.error('API returned error:', j.error);
        return;
      }
      if (j.reply) {
        appendMessage('bot', j.reply);
      } else {
        appendMessage('bot', 'Désolé, aucune réponse reçue.');
      }
    } catch (err) {
      hideTyping(typingId);
      appendMessage('bot', 'Erreur de communication. Veuillez réessayer plus tard.');
      console.error('Fetch error:', err);
    }
  }

  function showTyping() {
    const chat = document.getElementById('sa_chat');
    const id = 'sa_typing_' + Date.now();
    const el = document.createElement('div');
    el.id = id;
    el.style = 'margin-bottom:10px;display:flex;justify-content:flex-start;';
    el.innerHTML = `<div style="background:#fff;padding:10px;border-radius:12px;max-width:78%;border:1px solid #e6eef8;color:#666"><em>Solo Ático réfléchi…</em></div>`;
    chat.appendChild(el);
    chat.scrollTop = chat.scrollHeight;
    return id;
  }

  function hideTyping(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  /* --- Wire input --- */
  function wireInput() {
    document.getElementById('sa_send').addEventListener('click', () => {
      const v = document.getElementById('sa_input').value.trim();
      if (!v) return;
      document.getElementById('sa_input').value = '';
      sendToServer(v);
    });
    document.getElementById('sa_input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const v = e.target.value.trim();
        if (!v) return;
        e.target.value = '';
        sendToServer(v);
      }
    });
  }

  /* --- Init --- */
  createUI();
  wireInput();

  // small welcome message
  setTimeout(() => {
    appendMessage('bot', 'Bienvenue au Solo Ático Concierge — je peux vous aider pour les suites, réservations, Tintorera, Reiki et conseils locaux. Essayez : "Quel est le prix de la suite Neus ?"');
  }, 600);

})();
