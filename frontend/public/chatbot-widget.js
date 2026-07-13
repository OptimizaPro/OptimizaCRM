/**
 * OptimizaCRM Chatbot Widget
 * RAG-powered floating chat bubble — zero dependencies.
 *
 * Usage:
 *   <script
 *     src="/chatbot-widget.js"
 *     data-token="WIDGET_TOKEN"
 *     data-api="https://api.optimizacrm.com/api/v1"
 *     defer
 *   ></script>
 */
(function () {
  'use strict';

  // ── Script attributes ────────────────────────────────────────────────────────
  var script = document.currentScript || (function () {
    var ss = document.getElementsByTagName('script');
    return ss[ss.length - 1];
  })();

  var TOKEN   = (script.getAttribute('data-token') || '').trim();
  var API_URL = (script.getAttribute('data-api') || 'http://localhost:8000/api/v1').replace(/\/$/, '');
  var SESSION_KEY = 'ochat_sid_' + TOKEN.slice(0, 8);

  if (!TOKEN) { console.warn('[OptimizaCRM Chat] data-token is required'); return; }

  // ── SVG icons ────────────────────────────────────────────────────────────────
  var ICON = {
    chat:  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>',
    send:  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>',
    bot:   '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7H3a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M7 14a1 1 0 0 1 1 1 1 1 0 0 1-1 1 1 1 0 0 1-1-1 1 1 0 0 1 1-1m10 0a1 1 0 0 1 1 1 1 1 0 0 1-1 1 1 1 0 0 1-1-1 1 1 0 0 1 1-1M5 17a7 7 0 0 0 14 0z"/></svg>',
    link:  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>',
  };

  // ── Simple markdown renderer ─────────────────────────────────────────────────
  function renderMd(text) {
    return String(text || '')
      // escape HTML first
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      // bold **text**
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // inline code `text`
      .replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,.08);padding:1px 4px;border-radius:4px;font-size:.85em">$1</code>')
      // links [text](url) — only http/https
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:#fb923c;text-decoration:underline">$1</a>')
      // newlines → <br>
      .replace(/\n/g, '<br>');
  }

  // ── Fetch config, then boot ──────────────────────────────────────────────────
  fetch(API_URL + '/chatbot/config/?token=' + TOKEN)
    .then(function (r) { return r.json(); })
    .then(function (cfg) { boot(cfg); })
    .catch(function (e) { console.warn('[OptimizaCRM Chat] config error', e); });

  // ── Boot ─────────────────────────────────────────────────────────────────────
  function boot(cfg) {
    var color        = cfg.color        || '#EA580C';
    var botName      = cfg.name         || 'Asistente';
    var orgName      = cfg.org_name     || '';
    var welcome      = cfg.welcome_message || '¡Hola! ¿En qué puedo ayudarte?';
    var placeholder  = cfg.placeholder  || 'Escribe tu mensaje…';
    var showSources  = !!cfg.show_sources;

    // Color darkened for gradient
    function darken(hex, amt) {
      amt = amt || 40;
      try {
        hex = hex.replace('#', '');
        if (hex.length === 3) hex = hex.split('').map(function(c){return c+c;}).join('');
        var r = Math.max(0, parseInt(hex.slice(0,2),16)-amt);
        var g = Math.max(0, parseInt(hex.slice(2,4),16)-amt);
        var b = Math.max(0, parseInt(hex.slice(4,6),16)-amt);
        return '#' + [r,g,b].map(function(n){return ('0'+n.toString(16)).slice(-2);}).join('');
      } catch(e) { return '#'+hex; }
    }
    var colorDark = darken(color);

    // ── Shadow host ────────────────────────────────────────────────────────────
    var host = document.createElement('div');
    host.id  = 'optimiza-chatbot-widget';
    host.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:2147483647;font-family:system-ui,-apple-system,sans-serif;';
    document.body.appendChild(host);
    var shadow = host.attachShadow({ mode: 'open' });

    // ── CSS ───────────────────────────────────────────────────────────────────
    var style = document.createElement('style');
    style.textContent = [
      '*{box-sizing:border-box;margin:0;padding:0}',

      // FAB
      '.fab{width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,'+color+' 0%,'+colorDark+' 100%);box-shadow:0 4px 20px rgba(0,0,0,.35);transition:transform .2s,box-shadow .2s;position:relative;z-index:2}',
      '.fab:hover{transform:scale(1.08);box-shadow:0 6px 28px rgba(0,0,0,.45)}',
      '.fab svg{width:26px;height:26px;fill:#fff;transition:opacity .15s}',

      // Unread badge
      '.badge{position:absolute;top:-2px;right:-2px;width:18px;height:18px;border-radius:50%;background:#ef4444;border:2px solid #0f172a;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#fff;opacity:0;transition:opacity .2s}',
      '.badge.show{opacity:1}',

      // Panel
      '.panel{position:absolute;bottom:68px;right:0;width:360px;max-width:calc(100vw - 40px);height:520px;max-height:calc(100vh - 100px);background:#0f172a;border-radius:20px;box-shadow:0 16px 64px rgba(0,0,0,.55);overflow:hidden;display:flex;flex-direction:column;opacity:0;transform:translateY(16px) scale(.97);transition:opacity .22s,transform .22s;pointer-events:none}',
      '.panel.open{opacity:1;transform:translateY(0) scale(1);pointer-events:auto}',

      // Panel header
      '.p-head{flex-shrink:0;padding:14px 16px;background:linear-gradient(135deg,'+color+' 0%,'+colorDark+' 100%);display:flex;align-items:center;gap:10px}',
      '.p-avatar{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;flex-shrink:0}',
      '.p-avatar svg{width:20px;height:20px;fill:#fff}',
      '.p-info{flex:1;min-width:0}',
      '.p-name{font-size:14px;font-weight:700;color:#fff;line-height:1.2}',
      '.p-org{font-size:11px;color:rgba(255,255,255,.7);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.p-online{display:flex;align-items:center;gap:4px;font-size:11px;color:rgba(255,255,255,.75);margin-top:2px}',
      '.p-dot{width:6px;height:6px;border-radius:50%;background:#4ade80}',
      '.p-close{width:28px;height:28px;border-radius:50%;border:none;background:rgba(255,255,255,.18);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .15s}',
      '.p-close:hover{background:rgba(255,255,255,.32)}',
      '.p-close svg{width:14px;height:14px;fill:#fff}',

      // Messages
      '.msgs{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth}',
      '.msgs::-webkit-scrollbar{width:4px}',
      '.msgs::-webkit-scrollbar-track{background:transparent}',
      '.msgs::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:4px}',

      // Message bubble
      '.msg{display:flex;gap:8px;align-items:flex-end;max-width:85%}',
      '.msg.user{align-self:flex-end;flex-direction:row-reverse}',
      '.msg-avatar{width:26px;height:26px;border-radius:50%;background:#1e293b;border:1px solid #334155;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-bottom:2px}',
      '.msg-avatar svg{width:14px;height:14px;fill:#64748b}',
      '.bubble{padding:9px 13px;border-radius:14px;font-size:13px;line-height:1.55;word-break:break-word}',
      '.msg.bot .bubble{background:#1e293b;border:1px solid #334155;color:#e2e8f0;border-bottom-left-radius:4px}',
      '.msg.user .bubble{background:linear-gradient(135deg,'+color+' 0%,'+colorDark+' 100%);color:#fff;border-bottom-right-radius:4px}',

      // Sources
      '.sources{margin-top:8px;display:flex;flex-wrap:wrap;gap:5px}',
      '.src-chip{display:flex;align-items:center;gap:4px;background:#0f172a;border:1px solid #334155;border-radius:20px;padding:3px 9px;font-size:10px;color:#64748b;cursor:default}',
      '.src-chip svg{width:9px;height:9px;fill:#64748b}',

      // Typing indicator
      '.typing{display:flex;align-items:center;gap:5px;padding:10px 13px;background:#1e293b;border:1px solid #334155;border-radius:14px;border-bottom-left-radius:4px;width:fit-content}',
      '.typing .dot{width:7px;height:7px;border-radius:50%;background:#475569;animation:bounce .9s ease-in-out infinite}',
      '.typing .dot:nth-child(2){animation-delay:.2s}',
      '.typing .dot:nth-child(3){animation-delay:.4s}',
      '@keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}',

      // Timestamp
      '.ts{font-size:10px;color:#334155;margin-top:3px;text-align:right;padding:0 2px}',
      '.msg.bot .ts{text-align:left}',

      // Input area
      '.p-foot{flex-shrink:0;padding:12px;background:#0f172a;border-top:1px solid #1e293b;display:flex;align-items:flex-end;gap:8px}',
      'textarea.inp{flex:1;background:#1e293b;border:1px solid #334155;border-radius:12px;padding:9px 12px;font-size:13px;color:#e2e8f0;resize:none;outline:none;font-family:inherit;line-height:1.45;max-height:100px;overflow-y:auto;transition:border-color .15s}',
      'textarea.inp::placeholder{color:#334155}',
      'textarea.inp:focus{border-color:'+color+'}',
      '.send-btn{width:38px;height:38px;border-radius:50%;border:none;cursor:pointer;background:linear-gradient(135deg,'+color+' 0%,'+colorDark+' 100%);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:transform .15s,opacity .15s}',
      '.send-btn:hover{transform:scale(1.08)}',
      '.send-btn:disabled{opacity:.4;cursor:not-allowed}',
      '.send-btn svg{width:16px;height:16px;fill:#fff;transform:translateX(1px)}',

      // Powered by
      '.powered{flex-shrink:0;text-align:center;padding:5px;font-size:10px;color:#1e293b;background:#0f172a;letter-spacing:.02em}',
      '.powered a{color:#334155;text-decoration:none}',
      '.powered a:hover{color:#475569}',
    ].join('');
    shadow.appendChild(style);

    // ── Layout ────────────────────────────────────────────────────────────────
    var wrap = document.createElement('div');
    shadow.appendChild(wrap);

    // Panel
    var panel = document.createElement('div');
    panel.className = 'panel';

    // Header
    var head = document.createElement('div');
    head.className = 'p-head';
    head.innerHTML =
      '<div class="p-avatar">' + ICON.bot + '</div>' +
      '<div class="p-info">' +
        '<div class="p-name">' + _esc(botName) + '</div>' +
        (orgName ? '<div class="p-org">' + _esc(orgName) + '</div>' : '') +
        '<div class="p-online"><span class="p-dot"></span>En línea</div>' +
      '</div>' +
      '<button class="p-close" id="chat-close">' + ICON.close + '</button>';
    panel.appendChild(head);

    // Messages container
    var msgsEl = document.createElement('div');
    msgsEl.className = 'msgs';
    msgsEl.id = 'chat-msgs';
    panel.appendChild(msgsEl);

    // Footer
    var foot = document.createElement('div');
    foot.className = 'p-foot';
    var inp = document.createElement('textarea');
    inp.className = 'inp';
    inp.placeholder = placeholder;
    inp.rows = 1;
    var sendBtn = document.createElement('button');
    sendBtn.className = 'send-btn';
    sendBtn.innerHTML = ICON.send;
    sendBtn.disabled = true;
    foot.appendChild(inp);
    foot.appendChild(sendBtn);
    panel.appendChild(foot);

    // Powered by
    var pw = document.createElement('div');
    pw.className = 'powered';
    pw.innerHTML = 'Powered by <a href="https://optimizacrm.com" target="_blank" rel="noopener">OptimizaCRM</a>';
    panel.appendChild(pw);

    wrap.appendChild(panel);

    // FAB
    var fab = document.createElement('button');
    fab.className = 'fab';
    fab.setAttribute('aria-label', 'Abrir chat');
    fab.innerHTML = ICON.chat + '<span class="badge" id="unread-badge">1</span>';
    wrap.appendChild(fab);

    // ── State ─────────────────────────────────────────────────────────────────
    var isOpen    = false;
    var isBusy    = false;
    var sessionId = sessionStorage.getItem(SESSION_KEY) || null;
    var unread    = 0;
    var typingEl  = null;

    var badge = shadow.querySelector('#unread-badge');

    function setUnread(n) {
      unread = n;
      if (badge) {
        badge.textContent = n > 9 ? '9+' : String(n);
        badge.className   = 'badge' + (n > 0 && !isOpen ? ' show' : '');
      }
    }

    function openChat() {
      isOpen = true;
      panel.classList.add('open');
      fab.setAttribute('aria-label', 'Cerrar chat');
      fab.innerHTML = ICON.close + '<span class="badge" id="unread-badge"></span>';
      badge = shadow.querySelector('#unread-badge');
      setUnread(0);
      inp.focus();
      scrollBottom();
    }

    function closeChat() {
      isOpen = false;
      panel.classList.remove('open');
      fab.setAttribute('aria-label', 'Abrir chat');
      fab.innerHTML = ICON.chat + '<span class="badge" id="unread-badge">' + (unread || '') + '</span>';
      badge = shadow.querySelector('#unread-badge');
      if (unread > 0) badge.classList.add('show');
    }

    fab.addEventListener('click', function () {
      if (isOpen) { closeChat(); } else { openChat(); }
    });
    shadow.querySelector('#chat-close').addEventListener('click', closeChat);

    // ── Auto-resize textarea ──────────────────────────────────────────────────
    inp.addEventListener('input', function () {
      inp.style.height = 'auto';
      inp.style.height = Math.min(inp.scrollHeight, 100) + 'px';
      sendBtn.disabled = !inp.value.trim() || isBusy;
    });
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!sendBtn.disabled) send();
      }
    });
    sendBtn.addEventListener('click', send);

    // ── Helpers ───────────────────────────────────────────────────────────────
    function _esc(s) {
      return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function _ts() {
      return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function scrollBottom() {
      setTimeout(function () { msgsEl.scrollTop = msgsEl.scrollHeight; }, 30);
    }

    // ── Render a message bubble ───────────────────────────────────────────────
    function appendMsg(role, text, sources) {
      var row = document.createElement('div');
      row.className = 'msg ' + (role === 'user' ? 'user' : 'bot');

      var inner = '';

      if (role === 'bot') {
        inner += '<div class="msg-avatar">' + ICON.bot + '</div>';
      }

      inner += '<div>';
      inner += '<div class="bubble">' + renderMd(text) + '</div>';

      if (role === 'bot' && showSources && sources && sources.length) {
        inner += '<div class="sources">';
        sources.forEach(function (s) {
          inner += '<span class="src-chip">' + ICON.link + _esc(s) + '</span>';
        });
        inner += '</div>';
      }

      inner += '<div class="ts">' + _ts() + '</div>';
      inner += '</div>';

      row.innerHTML = inner;
      msgsEl.appendChild(row);
      scrollBottom();
      return row;
    }

    // ── Typing indicator ──────────────────────────────────────────────────────
    function showTyping() {
      typingEl = document.createElement('div');
      typingEl.className = 'msg bot';
      typingEl.innerHTML =
        '<div class="msg-avatar">' + ICON.bot + '</div>' +
        '<div class="typing"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>';
      msgsEl.appendChild(typingEl);
      scrollBottom();
    }

    function hideTyping() {
      if (typingEl && typingEl.parentNode) {
        typingEl.parentNode.removeChild(typingEl);
        typingEl = null;
      }
    }

    // ── Send message ──────────────────────────────────────────────────────────
    function send() {
      var msg = inp.value.trim();
      if (!msg || isBusy) return;

      appendMsg('user', msg);
      inp.value = '';
      inp.style.height = 'auto';
      sendBtn.disabled = true;
      isBusy = true;
      showTyping();

      fetch(API_URL + '/chatbot/chat/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: TOKEN, session_id: sessionId || '', message: msg }),
      })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          hideTyping();
          if (res.error) {
            appendMsg('bot', 'Lo siento, ocurrió un error: ' + _esc(res.error));
          } else {
            if (res.session_id) {
              sessionId = res.session_id;
              sessionStorage.setItem(SESSION_KEY, sessionId);
            }
            appendMsg('bot', res.response || '…', res.sources);
            if (!isOpen) setUnread(unread + 1);
          }
        })
        .catch(function () {
          hideTyping();
          appendMsg('bot', 'Error de conexión. Por favor inténtalo de nuevo.');
        })
        .finally(function () {
          isBusy = false;
          sendBtn.disabled = !inp.value.trim();
        });
    }

    // ── Welcome message ───────────────────────────────────────────────────────
    appendMsg('bot', welcome);
    // Show unread badge after 2s if not opened
    setTimeout(function () {
      if (!isOpen) setUnread(1);
    }, 2000);
  }

  // ── Markdown renderer (defined at module scope) ───────────────────────────────
  function renderMd(text) {
    return String(text || '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
      .replace(/`([^`]+)`/g,'<code style="background:rgba(255,255,255,.1);padding:1px 5px;border-radius:4px;font-size:.85em;font-family:monospace">$1</code>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g,'<a href="$2" target="_blank" rel="noopener" style="color:#fb923c;text-decoration:underline">$1</a>')
      .replace(/\n/g,'<br>');
  }

})();
