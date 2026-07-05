/**
 * OptimizaCRM Hub Widget
 * Single floating button that expands into a multi-channel contact hub.
 * Channels: Voice AI · Formulario · WhatsApp — shown based on org config.
 *
 * Usage:
 *   <script src="/hub-widget.js" data-token="WEB_WIDGET_TOKEN" data-api="https://api.yourdomain.com/api/v1" async></script>
 */
(function () {
  'use strict';

  var script  = document.currentScript || (function () {
    var ss = document.getElementsByTagName('script');
    return ss[ss.length - 1];
  })();

  var TOKEN   = script.getAttribute('data-token');
  var API_URL = (script.getAttribute('data-api') || 'http://localhost:8000/api/v1').replace(/\/$/, '');

  if (!TOKEN) { console.warn('[OptimizaCRM Hub] data-token is required'); return; }

  fetch(API_URL + '/widget/hub/?token=' + TOKEN)
    .then(function (r) { return r.json(); })
    .then(function (cfg) { boot(cfg); })
    .catch(function (e) { console.warn('[OptimizaCRM Hub] config error', e); });

  // ── Pre-load Vapi SDK if voice channel present ─────────────────────────────
  var _vapiClass   = null;
  var _vapiLoading = false;

  function _loadVapi() {
    if (_vapiClass || _vapiLoading) return;
    _vapiLoading = true;

    function _done(Vapi) {
      _vapiClass   = Vapi || null;
      _vapiLoading = false;
    }

    // Dynamic ESM import — avoids window.Vapi UMD issues across all modern browsers.
    // esm.sh primary; jsDelivr +esm fallback.
    import('https://esm.sh/@vapi-ai/web@2')
      .then(function (m) { _done(m && (m.default || m.Vapi)); })
      .catch(function () {
        import('https://cdn.jsdelivr.net/npm/@vapi-ai/web@2/+esm')
          .then(function (m) { _done(m && (m.default || m.Vapi)); })
          .catch(function ()  { _done(null); });
      });
  }

  // ── Vapi error → human-readable string ────────────────────────────────────
  function _vapiErrMsg(e) {
    if (!e) return 'Error de conexión con el agente de voz.';
    var inner = e.error || e;
    var msg = inner.message || inner.errorMessage || inner.msg || inner.statusCode
           || e.message || e.errorMessage || e.msg;
    if (msg && typeof msg === 'string') return msg;
    try { return JSON.stringify(inner); } catch(_) { return 'Error desconocido de Vapi.'; }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function esc(str) {
    return String(str || '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function darken(hex) {
    try {
      hex = hex.replace('#','');
      if (hex.length === 3) hex = hex.split('').map(function(c){return c+c;}).join('');
      var r = Math.max(0, parseInt(hex.slice(0,2),16)-50);
      var g = Math.max(0, parseInt(hex.slice(2,4),16)-30);
      var b = Math.max(0, parseInt(hex.slice(4,6),16)-20);
      return '#' + [r,g,b].map(function(n){return ('0'+n.toString(16)).slice(-2);}).join('');
    } catch(e) { return '#'+hex; }
  }

  // ── Channel icons ──────────────────────────────────────────────────────────
  var ICONS = {
    hub: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>',
    voice: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1a4 4 0 0 0-4 4v6a4 4 0 0 0 8 0V5a4 4 0 0 0-4-4zm-2 4a2 2 0 0 1 4 0v6a2 2 0 0 1-4 0V5zm-5 6a1 1 0 0 1 1 1 6 6 0 0 0 12 0 1 1 0 1 1 2 0 8 8 0 0 1-7 7.93V21h2a1 1 0 1 1 0 2H9a1 1 0 1 1 0-2h2v-2.07A8 8 0 0 1 4 12a1 1 0 0 1 1-1z"/></svg>',
    form: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM11.999 0C5.373 0 0 5.373 0 12c0 2.117.554 4.103 1.523 5.826L.057 23.926a.5.5 0 0 0 .611.611l6.101-1.466A11.94 11.94 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.8 9.8 0 0 1-5.012-1.373l-.36-.213-3.626.872.888-3.544-.234-.374A9.772 9.772 0 0 1 2.182 12c0-5.42 4.398-9.818 9.817-9.818 5.42 0 9.819 4.398 9.819 9.818 0 5.42-4.399 9.818-9.819 9.818z"/></svg>',
    mic: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1a4 4 0 0 0-4 4v6a4 4 0 0 0 8 0V5a4 4 0 0 0-4-4zm-2 4a2 2 0 0 1 4 0v6a2 2 0 0 1-4 0V5zm-5 6a1 1 0 0 1 1 1 6 6 0 0 0 12 0 1 1 0 1 1 2 0 8 8 0 0 1-7 7.93V21h2a1 1 0 1 1 0 2H9a1 1 0 1 1 0-2h2v-2.07A8 8 0 0 1 4 12a1 1 0 0 1 1-1z"/></svg>',
    hangup: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/></svg>',
  };
  var CHANNEL_COLORS = { voice: '#7c3aed', form: '#0ea5e9', whatsapp: '#25D366' };

  // ── Main boot ──────────────────────────────────────────────────────────────
  function boot(cfg) {
    var color    = cfg.color    || '#EA580C';
    var channels = cfg.channels || [];
    if (!channels.length) return;

    // Pre-load Vapi if voice channel exists
    var hasVoice = channels.some(function(c){ return c.type === 'voice'; });
    if (hasVoice) _loadVapi();

    // ── Shadow host ──────────────────────────────────────────────────────────
    var host = document.createElement('div');
    host.id  = 'optimiza-hub-widget';
    host.style.cssText = 'position:fixed;bottom:84px;right:4px;z-index:2147483647;font-family:system-ui,sans-serif;';
    document.body.appendChild(host);
    var shadow = host.attachShadow({ mode: 'open' });

    // ── Styles ───────────────────────────────────────────────────────────────
    var style = document.createElement('style');
    style.textContent = [
      '*{box-sizing:border-box;margin:0;padding:0}',

      // FAB row (label + button side by side)
      '.fab-row{display:flex;align-items:center;justify-content:flex-end;gap:10px}',
      '.fab-label{background:#fff;border-radius:22px;padding:9px 16px;font-size:13px;font-weight:600;color:#1e293b;box-shadow:0 3px 14px rgba(0,0,0,.22);white-space:nowrap;cursor:pointer;transition:opacity .25s,transform .25s;user-select:none}',
      '.fab-label:hover{box-shadow:0 5px 20px rgba(0,0,0,.3)}',
      '.fab-label.gone{opacity:0;transform:translateX(8px);pointer-events:none}',

      // FAB
      '.fab{width:58px;height:58px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;background:'+color+';box-shadow:0 4px 20px rgba(0,0,0,.3);transition:transform .2s,box-shadow .2s}',
      '.fab:hover{transform:scale(1.08);box-shadow:0 6px 26px rgba(0,0,0,.38)}',
      '.fab-icon{width:26px;height:26px;color:#fff;display:flex;align-items:center;justify-content:center;transition:opacity .15s}',
      '.fab-icon svg{width:26px;height:26px;fill:#fff}',

      // Channel list
      '.channels{display:flex;flex-direction:column;gap:10px;margin-bottom:14px;opacity:0;transform:translateY(16px);transition:opacity .22s,transform .22s;pointer-events:none}',
      '.channels.open{opacity:1;transform:translateY(0);pointer-events:auto}',

      // Channel card
      '.ch{display:flex;align-items:center;gap:12px;background:#1e293b;border-radius:14px;padding:11px 14px;cursor:pointer;box-shadow:0 2px 12px rgba(0,0,0,.25);transition:transform .15s,box-shadow .15s;border:1px solid rgba(255,255,255,.06)}',
      '.ch:hover{transform:translateX(-4px);box-shadow:0 4px 18px rgba(0,0,0,.35)}',
      '.ch-icon{width:40px;height:40px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center}',
      '.ch-icon svg{width:20px;height:20px;fill:#fff}',
      '.ch-text{flex:1}',
      '.ch-label{font-size:13px;font-weight:600;color:#f1f5f9}',
      '.ch-sub{font-size:11px;color:#64748b;margin-top:1px}',
      '.ch-arrow{color:#475569;font-size:14px;line-height:1}',

      // Panel (form or voice)
      '.panel{position:absolute;bottom:72px;right:0;width:320px;background:#1e293b;border-radius:16px;box-shadow:0 8px 36px rgba(0,0,0,.45);overflow:hidden;opacity:0;transform:translateY(14px) scale(.97);transition:opacity .2s,transform .2s;pointer-events:none}',
      '.panel.open{opacity:1;transform:translateY(0) scale(1);pointer-events:auto}',
      '.p-head{padding:16px 18px 14px;position:relative}',
      '.p-title{font-size:15px;font-weight:700;color:#fff}',
      '.p-sub{font-size:12px;color:rgba(255,255,255,.75);margin-top:2px}',
      '.p-close{position:absolute;top:12px;right:12px;background:rgba(255,255,255,.18);border:none;border-radius:50%;width:26px;height:26px;cursor:pointer;color:#fff;display:flex;align-items:center;justify-content:center}',
      '.p-close:hover{background:rgba(255,255,255,.32)}',
      '.p-close svg{width:14px;height:14px;fill:#fff}',
      '.p-body{padding:16px}',

      // Form inputs
      'input,textarea{width:100%;background:#0f172a;border:1px solid #334155;border-radius:8px;padding:9px 12px;font-size:13px;color:#e2e8f0;outline:none;margin-bottom:10px;transition:border .15s;font-family:inherit}',
      'input::placeholder,textarea::placeholder{color:#475569}',
      'input:focus,textarea:focus{border-color:'+color+'}',
      'textarea{resize:vertical;min-height:68px}',
      '.btn{width:100%;padding:10px;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;transition:opacity .15s}',
      '.btn:hover{opacity:.88}',
      '.btn:disabled{opacity:.5;cursor:not-allowed}',
      '.btn-send{background:'+color+';color:#fff}',
      '.btn-end{background:#dc2626;color:#fff}',
      '.err{color:#f87171;font-size:12px;margin-bottom:8px}',
      '.ok{text-align:center;padding:20px 16px;color:#4ade80;font-size:14px;font-weight:500}',

      // Reasons pills
      '.reasons{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}',
      '.r-btn{border:1px solid #334155;background:rgba(15,23,42,.6);border-radius:20px;padding:5px 10px;font-size:11px;color:#94a3b8;cursor:pointer;transition:border-color .15s,color .15s;white-space:nowrap}',
      '.r-btn.active{border-color:'+color+';background:rgba(234,88,12,.12);color:'+color+'}',

      // Voice panel — premium design
      '.v-panel-body{padding:24px 20px 20px;display:flex;flex-direction:column;align-items:center}',
      '.v-avatar-wrap{position:relative;width:80px;height:80px;margin-bottom:14px;border-radius:50%;padding:3px}',
      '.v-avatar{width:74px;height:74px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;color:#fff;position:relative;z-index:1;overflow:hidden}',
      '.v-ring{position:absolute;inset:-10px;border-radius:50%;border:2px solid;opacity:0;pointer-events:none}',
      '.v-ring.pulse{animation:ring-out 2s ease-out infinite}',
      '.v-ring.pulse2{animation:ring-out 2s ease-out infinite .7s}',
      '@keyframes ring-out{0%{transform:scale(1);opacity:.5}100%{transform:scale(1.55);opacity:0}}',
      '.v-agent-name{font-size:18px;font-weight:700;color:#f1f5f9;margin-bottom:3px;text-align:center}',
      '.v-state-label{font-size:11px;font-weight:500;color:#94a3b8;letter-spacing:.04em;text-transform:uppercase;margin-bottom:18px;text-align:center}',
      '.waveform{display:flex;align-items:center;justify-content:center;gap:3px;height:28px;margin-bottom:6px;opacity:0;transition:opacity .3s}',
      '.waveform.active{opacity:1}',
      '.bar{width:3px;border-radius:3px;height:3px;transition:height .12s}',
      '.waveform.active .bar:nth-child(1){animation:wave .9s ease-in-out infinite .00s}',
      '.waveform.active .bar:nth-child(2){animation:wave .9s ease-in-out infinite .10s}',
      '.waveform.active .bar:nth-child(3){animation:wave .9s ease-in-out infinite .20s}',
      '.waveform.active .bar:nth-child(4){animation:wave .9s ease-in-out infinite .30s}',
      '.waveform.active .bar:nth-child(5){animation:wave .9s ease-in-out infinite .20s}',
      '.waveform.active .bar:nth-child(6){animation:wave .9s ease-in-out infinite .10s}',
      '.waveform.active .bar:nth-child(7){animation:wave .9s ease-in-out infinite .00s}',
      '@keyframes wave{0%,100%{height:3px}50%{height:20px}}',
      '.v-greeting{font-size:12px;color:#cbd5e1;text-align:center;margin-bottom:16px;font-style:italic;line-height:1.55;padding:0 4px}',
      '.v-status{font-size:12px;color:#94a3b8;text-align:center;margin-bottom:20px;min-height:16px}',
      '.v-err{width:100%;text-align:center;font-size:11px;color:#f87171;margin-bottom:12px;padding:7px 10px;background:rgba(220,38,38,.1);border-radius:8px;border:1px solid rgba(220,38,38,.18)}',
      '.v-actions{display:flex;gap:28px;align-items:flex-end;justify-content:center}',
      '.v-btn-wrap{display:flex;flex-direction:column;align-items:center;gap:6px}',
      '.v-btn-label{font-size:10px;font-weight:600;color:#64748b;letter-spacing:.03em;text-transform:uppercase}',
      '.v-mic-btn{width:60px;height:60px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 18px rgba(0,0,0,.35);transition:transform .15s,box-shadow .15s}',
      '.v-mic-btn:hover{transform:scale(1.07);box-shadow:0 6px 26px rgba(0,0,0,.45)}',
      '.v-mic-btn svg{width:26px;height:26px;fill:#fff}',
      '.v-end-btn{width:52px;height:52px;border-radius:50%;border:none;cursor:pointer;background:#dc2626;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(220,38,38,.4);transition:transform .15s}',
      '.v-end-btn:hover{transform:scale(1.08)}',
      '.v-end-btn svg{width:22px;height:22px;fill:#fff}',
    ].join('');
    shadow.appendChild(style);

    // ── Layout wrapper ───────────────────────────────────────────────────────
    var wrap = document.createElement('div');
    shadow.appendChild(wrap);

    // ── Channel list ─────────────────────────────────────────────────────────
    var chList = document.createElement('div');
    chList.className = 'channels';
    channels.forEach(function (ch) {
      var card = document.createElement('div');
      card.className = 'ch';
      var bg = CHANNEL_COLORS[ch.type] || color;
      var iconStyle = ch.type === 'voice'
        ? 'background:'+bg+';box-shadow:0 0 14px '+bg+'80,0 0 5px '+bg+'4d'
        : 'background:'+bg;
      card.innerHTML =
        '<div class="ch-icon" style="'+iconStyle+'">' + (ICONS[ch.type] || ICONS.form) + '</div>' +
        '<div class="ch-text">' +
          '<div class="ch-label">' + esc(ch.label) + '</div>' +
          '<div class="ch-sub">'   + esc(ch.subtitle || '') + '</div>' +
        '</div>' +
        '<span class="ch-arrow">\u203A</span>';
      card.addEventListener('click', function () { openChannel(ch); });
      chList.appendChild(card);
    });
    wrap.appendChild(chList);

    // ── Panel ────────────────────────────────────────────────────────────────
    var panel = document.createElement('div');
    panel.className = 'panel';
    panel.innerHTML = '<div id="p-inner"></div>';
    wrap.appendChild(panel);

    // ── FAB row (label + button) ─────────────────────────────────────────────
    var fabRow = document.createElement('div');
    fabRow.className = 'fab-row';

    var fabLabel = document.createElement('div');
    fabLabel.className = 'fab-label';
    fabLabel.textContent = cfg.greeting_text || '¿En qué podemos ayudarte?';
    fabLabel.addEventListener('click', function () { toggleHub(); });
    fabRow.appendChild(fabLabel);

    var fab = document.createElement('button');
    fab.className = 'fab';
    fab.innerHTML = '<span class="fab-icon">' + ICONS.hub + '</span>';
    fabRow.appendChild(fab);

    wrap.appendChild(fabRow);

    var hubOpen    = false;
    var activePanel = null; // 'form' | 'voice' | null
    var vapiInstance = null;

    function openHub() {
      hubOpen = true;
      chList.classList.add('open');
      panel.classList.remove('open');
      activePanel = null;
      fab.innerHTML = '<span class="fab-icon">' + ICONS.close + '</span>';
      fabLabel.classList.add('gone');
    }
    function closeAll() {
      hubOpen = false;
      activePanel = null;
      chList.classList.remove('open');
      panel.classList.remove('open');
      fab.innerHTML = '<span class="fab-icon">' + ICONS.hub + '</span>';
      fabLabel.classList.remove('gone');
      if (vapiInstance) { try { vapiInstance.stop(); } catch(e){} vapiInstance = null; }
    }
    function toggleHub() {
      if (hubOpen || activePanel) { closeAll(); } else { openHub(); }
    }

    fab.addEventListener('click', toggleHub);

    // ── Channel opener ───────────────────────────────────────────────────────
    function openChannel(ch) {
      chList.classList.remove('open');
      fabLabel.classList.add('gone');
      if (ch.type === 'whatsapp') {
        var wa = 'https://wa.me/' + ch.number.replace(/\D/g,'') + '?text=' + encodeURIComponent(ch.message || '');
        window.open(wa, '_blank');
        closeAll();
        return;
      }
      if (ch.type === 'form')  { renderForm(ch);  }
      if (ch.type === 'voice') { renderVoice(ch); }
      panel.classList.add('open');
      hubOpen = false;
      activePanel = ch.type;
    }

    // ── Form panel ───────────────────────────────────────────────────────────
    function renderForm(ch) {
      var reasons = (ch.contact_reasons || []).filter(function(r){ return r.trim(); });
      var reasonsHtml = reasons.length
        ? '<div class="reasons" id="f-reasons">' +
            reasons.map(function(r){ return '<button type="button" class="r-btn" data-r="'+esc(r)+'">'+esc(r)+'</button>'; }).join('') +
          '</div>'
        : '';

      var inner = panel.querySelector('#p-inner');
      inner.innerHTML =
        '<div class="p-head" style="background:linear-gradient(135deg,'+color+' 0%,'+darken(color)+' 100%)">' +
          '<button class="p-close" id="f-close">' + ICONS.close + '</button>' +
          '<div class="p-title">' + esc(ch.label || '¿Podemos ayudarte?') + '</div>' +
          '<div class="p-sub">'  + esc(ch.subtitle || '') + '</div>' +
        '</div>' +
        '<div class="p-body">' +
          '<div id="f-form">' +
            '<input id="f-name"    placeholder="Nombre *" />' +
            '<input id="f-email"   type="email" placeholder="Email *" />' +
            '<input id="f-phone"   type="tel"   placeholder="Teléfono (opcional)" />' +
            '<input id="f-company"             placeholder="Empresa (opcional)" />' +
            reasonsHtml +
            '<textarea id="f-msg" placeholder="Mensaje (opcional)"></textarea>' +
            '<div id="f-err" class="err" style="display:none"></div>' +
            '<button class="btn btn-send" id="f-send">' + esc(ch.button_text || 'Enviar mensaje') + '</button>' +
          '</div>' +
          '<div id="f-ok" class="ok" style="display:none">' + esc(ch.success_message || '¡Gracias!') + '</div>' +
        '</div>';

      inner.querySelector('#f-close').addEventListener('click', closeAll);

      // Reason pills
      var selReason = '';
      var reasonsEl = inner.querySelector('#f-reasons');
      if (reasonsEl) {
        reasonsEl.addEventListener('click', function(e) {
          var btn = e.target.closest('.r-btn');
          if (!btn) return;
          var already = btn.classList.contains('active');
          reasonsEl.querySelectorAll('.r-btn').forEach(function(b){ b.classList.remove('active'); });
          if (!already) { btn.classList.add('active'); selReason = btn.getAttribute('data-r') || ''; }
          else { selReason = ''; }
        });
      }

      inner.querySelector('#f-send').addEventListener('click', function() {
        var name    = inner.querySelector('#f-name').value.trim();
        var email   = inner.querySelector('#f-email').value.trim();
        var phone   = inner.querySelector('#f-phone').value.trim();
        var company = inner.querySelector('#f-company').value.trim();
        var msg     = inner.querySelector('#f-msg').value.trim();
        var errEl = inner.querySelector('#f-err');
        var btn   = inner.querySelector('#f-send');

        errEl.style.display = 'none';
        if (!name || !email) { errEl.textContent = 'Nombre y email son obligatorios'; errEl.style.display = 'block'; return; }

        btn.disabled = true; btn.textContent = 'Enviando…';
        fetch(API_URL + '/widget/submit/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: TOKEN, name: name, email: email, phone: phone, company: company, reason: selReason, message: msg }),
        })
          .then(function(r){ return r.json(); })
          .then(function(res){
            if (res.ok) {
              inner.querySelector('#f-form').style.display = 'none';
              inner.querySelector('#f-ok').style.display   = 'block';
            } else {
              errEl.textContent = res.error || 'Error al enviar.';
              errEl.style.display = 'block';
              btn.disabled = false; btn.textContent = ch.button_text || 'Enviar mensaje';
            }
          })
          .catch(function(){
            errEl.textContent = 'Error de conexión.';
            errEl.style.display = 'block';
            btn.disabled = false; btn.textContent = ch.button_text || 'Enviar mensaje';
          });
      });
    }

    // ── Voice panel ──────────────────────────────────────────────────────────
    function renderVoice(ch) {
      var agentName  = ch.agent_name || 'Asistente';
      var greeting   = ch.greeting   || ('Hola, soy ' + agentName + '. ¿En qué puedo ayudarte?');
      var vcolor     = ch.color || color;
      var initial    = agentName.charAt(0).toUpperCase();
      var avatarUrl  = ch.avatar_url || '';
      var bars       = ('<div class="bar" style="background:'+vcolor+'"></div>').repeat(7);
      var avatarInner = avatarUrl
        ? '<img src="'+esc(avatarUrl)+'" alt="" style="width:74px;height:74px;border-radius:50%;object-fit:cover;position:relative;z-index:1;display:block" />'
        : '<div class="v-avatar" style="background:'+vcolor+'">' + initial + '</div>';

      var inner = panel.querySelector('#p-inner');
      inner.innerHTML =
        // Header — dark, minimal
        '<div style="background:#0f172a;padding:11px 14px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,.06)">' +
          '<span style="font-size:10px;font-weight:600;color:#94a3b8;letter-spacing:.06em;text-transform:uppercase">Agente de Voz IA</span>' +
          '<button class="p-close" id="v-close" style="background:rgba(255,255,255,.08)">' + ICONS.close + '</button>' +
        '</div>' +
        // Body
        '<div class="v-panel-body">' +
          // Avatar with pulse rings
          '<div class="v-avatar-wrap" style="background:'+vcolor+';box-shadow:0 0 18px '+vcolor+'73,0 0 6px '+vcolor+'40">' +
            '<div class="v-ring" id="v-ring1" style="border-color:'+vcolor+'"></div>' +
            '<div class="v-ring v-ring2" id="v-ring2" style="border-color:'+vcolor+'"></div>' +
            avatarInner +
          '</div>' +
          // Name + state
          '<div class="v-agent-name">' + esc(agentName) + '</div>' +
          '<div class="v-state-label" id="v-status-head">Listo para llamar</div>' +
          // Waveform (visible only when active)
          '<div class="waveform" id="v-wave">' + bars + '</div>' +
          // Greeting
          '<p class="v-greeting">' + esc(greeting) + '</p>' +
          // Error
          '<div class="v-err" id="v-err" style="display:none"></div>' +
          // Status hint
          '<div class="v-status" id="v-status">Toca el micrófono para iniciar</div>' +
          // Action buttons
          '<div class="v-actions">' +
            '<div class="v-btn-wrap" id="v-mic-wrap">' +
              '<button class="v-mic-btn" id="v-mic" style="background:'+vcolor+'">' + ICONS.mic + '</button>' +
              '<span class="v-btn-label">Llamar</span>' +
            '</div>' +
            '<div class="v-btn-wrap" id="v-end-wrap" style="display:none">' +
              '<button class="v-end-btn" id="v-end">' + ICONS.hangup + '</button>' +
              '<span class="v-btn-label">Finalizar</span>' +
            '</div>' +
          '</div>' +
        '</div>';

      inner.querySelector('#v-close').addEventListener('click', function(){
        if (vapiInstance) { try { vapiInstance.stop(); } catch(e){} vapiInstance = null; }
        closeAll();
      });

      var waveEl   = inner.querySelector('#v-wave');
      var statusEl = inner.querySelector('#v-status');
      var headEl   = inner.querySelector('#v-status-head');
      var errEl    = inner.querySelector('#v-err');
      var micBtn   = inner.querySelector('#v-mic');
      var micWrap  = inner.querySelector('#v-mic-wrap');
      var endBtn   = inner.querySelector('#v-end');
      var endWrap  = inner.querySelector('#v-end-wrap');
      var ring1    = inner.querySelector('#v-ring1');
      var ring2    = inner.querySelector('#v-ring2');

      function setVState(s) {
        errEl.style.display = 'none';
        waveEl.classList.remove('active');
        ring1.classList.remove('pulse'); ring2.classList.remove('pulse', 'pulse2');
        endWrap.style.display = 'none';
        micWrap.style.display = 'flex';
        if (s === 'connecting') {
          headEl.textContent = 'Conectando…'; statusEl.textContent = 'Estableciendo conexión…';
          micWrap.style.display = 'none';
        } else if (s === 'active') {
          headEl.textContent = 'En llamada'; statusEl.textContent = 'Habla ahora — te estoy escuchando';
          waveEl.classList.add('active');
          ring1.classList.add('pulse'); ring2.classList.add('pulse', 'pulse2');
          endWrap.style.display = 'flex'; micWrap.style.display = 'none';
        } else if (s === 'ended') {
          headEl.textContent = 'Llamada finalizada'; statusEl.textContent = '¡Gracias por contactarnos!';
          setTimeout(function(){ setVState('idle'); }, 3000);
        } else {
          headEl.textContent = 'Listo para llamar'; statusEl.textContent = 'Toca el micrófono para iniciar';
        }
      }

      micBtn.addEventListener('click', function() {
        if (!_vapiClass) {
          if (!_vapiLoading) { errEl.textContent = 'SDK de voz no disponible. Recarga la página.'; errEl.style.display = 'block'; return; }
          // SDK still loading — poll up to 6 s, also stop if loading failed
          var tries = 0;
          statusEl.textContent = 'Cargando SDK de voz…';
          var poll = setInterval(function () {
            if (_vapiClass) {
              clearInterval(poll);
              statusEl.textContent = 'Haz clic en el micrófono para iniciar';
              micBtn.click();
            } else if (!_vapiLoading || ++tries >= 30) {
              clearInterval(poll);
              statusEl.textContent = 'Haz clic en el micrófono para iniciar';
              errEl.textContent = 'No se pudo cargar el SDK de voz. Revisa tu conexión y recarga la página.';
              errEl.style.display = 'block';
            }
          }, 200);
          return;
        }
        var VapiClass = _vapiClass;
        if (!ch.assistant_id) { errEl.textContent = 'Agente no configurado. Guarda la configuración en el panel primero.'; errEl.style.display = 'block'; return; }
        if (!ch.vapi_public_key) { errEl.textContent = 'Falta la Vapi Public Key. Configúrala en Integraciones.'; errEl.style.display = 'block'; return; }
        try {
          vapiInstance = new VapiClass(ch.vapi_public_key);
          var callStartedAt = 0;

          vapiInstance.on('call-start', function() {
            callStartedAt = Date.now();
            setVState('active');
          });
          vapiInstance.on('call-end', function(call) {
            var reason   = (call && call.endedReason) || '';
            console.info('[OptimizaCRM Hub] call-end reason:', reason);
            var quickEnd = callStartedAt && (Date.now() - callStartedAt) < 4000;
            vapiInstance = null;
            if (quickEnd && reason && reason !== 'customer-ended-call') {
              setVState('idle');
              errEl.textContent = 'La llamada no pudo establecerse (' + reason + '). Verifica tu micrófono e inténtalo de nuevo.';
              errEl.style.display = 'block';
            } else {
              setVState('ended');
            }
            callStartedAt = 0;
          });
          vapiInstance.on('speech-start', function(){ waveEl.style.filter='brightness(1.3)'; });
          vapiInstance.on('speech-end',   function(){ waveEl.style.filter=''; });
          vapiInstance.on('error', function(e) {
            console.error('[OptimizaCRM Hub] Vapi error object:', JSON.stringify(e, null, 2));
            setVState('idle');
            errEl.textContent = _vapiErrMsg(e);
            errEl.style.display = 'block';
            vapiInstance = null;
          });
          setVState('connecting');
          vapiInstance.start(ch.assistant_id);
        } catch(err) {
          setVState('idle');
          errEl.textContent = (err && err.message) || 'No se pudo iniciar la llamada';
          errEl.style.display = 'block';
        }
      });

      endBtn.addEventListener('click', function() {
        if (vapiInstance) { try { vapiInstance.stop(); } catch(e){} vapiInstance = null; }
        setVState('ended');
      });

      setVState('idle');
    }

    // If only one channel, clicking FAB opens it directly
    if (channels.length === 1) {
      fab.addEventListener('click', function(e) {
        e.stopImmediatePropagation();
        if (activePanel) { closeAll(); } else { openChannel(channels[0]); }
      }, true);
    }
  }

})();
