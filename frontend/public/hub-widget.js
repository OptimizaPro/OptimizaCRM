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
  var _vapiClass = null;
  function _loadVapi() {
    if (_vapiClass || document.getElementById('ocw-vapi-sdk')) return;
    var s = document.createElement('script');
    s.id  = 'ocw-vapi-sdk';
    s.src = 'https://cdn.jsdelivr.net/npm/@vapi-ai/web@2/dist/index.js';
    s.onload = function () {
      _vapiClass = window.Vapi || (window.vapiSdk && window.vapiSdk.Vapi) || null;
    };
    document.head.appendChild(s);
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
    host.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:2147483647;font-family:system-ui,sans-serif;';
    document.body.appendChild(host);
    var shadow = host.attachShadow({ mode: 'open' });

    // ── Styles ───────────────────────────────────────────────────────────────
    var style = document.createElement('style');
    style.textContent = [
      '*{box-sizing:border-box;margin:0;padding:0}',

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

      // Voice waveform
      '.waveform{display:flex;align-items:center;justify-content:center;gap:5px;height:44px;margin-bottom:12px}',
      '.bar{width:6px;border-radius:4px;background:'+color+';height:8px;transition:height .15s}',
      '.waveform.active .bar:nth-child(1){animation:wave 1.1s ease-in-out infinite}',
      '.waveform.active .bar:nth-child(2){animation:wave 1.1s ease-in-out infinite .18s}',
      '.waveform.active .bar:nth-child(3){animation:wave 1.1s ease-in-out infinite .36s}',
      '@keyframes wave{0%,100%{height:8px}50%{height:30px}}',
      '.v-status{text-align:center;font-size:13px;color:#94a3b8;margin-bottom:14px}',
      '.v-greeting{font-size:12px;color:#475569;text-align:center;margin-bottom:12px;font-style:italic}',
      '.v-err{text-align:center;font-size:12px;color:#f87171;margin-bottom:10px;padding:7px;background:rgba(220,38,38,.1);border-radius:8px;border:1px solid rgba(220,38,38,.2)}',
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
      card.innerHTML =
        '<div class="ch-icon" style="background:'+bg+'">' + (ICONS[ch.type] || ICONS.form) + '</div>' +
        '<div class="ch-text">' +
          '<div class="ch-label">' + esc(ch.label) + '</div>' +
          '<div class="ch-sub">'   + esc(ch.subtitle || '') + '</div>' +
        '</div>' +
        '<span class="ch-arrow">›</span>';
      card.addEventListener('click', function () { openChannel(ch); });
      chList.appendChild(card);
    });
    wrap.appendChild(chList);

    // ── Panel ────────────────────────────────────────────────────────────────
    var panel = document.createElement('div');
    panel.className = 'panel';
    panel.innerHTML = '<div id="p-inner"></div>';
    wrap.appendChild(panel);

    // ── FAB ──────────────────────────────────────────────────────────────────
    var fab = document.createElement('button');
    fab.className = 'fab';
    fab.innerHTML = '<span class="fab-icon">' + ICONS.hub + '</span>';
    wrap.appendChild(fab);

    var hubOpen    = false;
    var activePanel = null; // 'form' | 'voice' | null
    var vapiInstance = null;

    function openHub() {
      hubOpen = true;
      chList.classList.add('open');
      panel.classList.remove('open');
      activePanel = null;
      fab.innerHTML = '<span class="fab-icon">' + ICONS.close + '</span>';
    }
    function closeAll() {
      hubOpen = false;
      activePanel = null;
      chList.classList.remove('open');
      panel.classList.remove('open');
      fab.innerHTML = '<span class="fab-icon">' + ICONS.hub + '</span>';
      if (vapiInstance) { try { vapiInstance.stop(); } catch(e){} vapiInstance = null; }
    }

    fab.addEventListener('click', function () {
      if (hubOpen || activePanel) { closeAll(); } else { openHub(); }
    });

    // ── Channel opener ───────────────────────────────────────────────────────
    function openChannel(ch) {
      chList.classList.remove('open');
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

      document.getElementById('p-inner').innerHTML =
        '<div class="p-head" style="background:linear-gradient(135deg,'+color+' 0%,'+darken(color)+' 100%)">' +
          '<button class="p-close" id="f-close">' + ICONS.close + '</button>' +
          '<div class="p-title">' + esc(ch.label || '¿Podemos ayudarte?') + '</div>' +
          '<div class="p-sub">'  + esc(ch.subtitle || '') + '</div>' +
        '</div>' +
        '<div class="p-body">' +
          '<div id="f-form">' +
            '<input id="f-name"  placeholder="Nombre *" />' +
            '<input id="f-email" type="email" placeholder="Email *" />' +
            '<input id="f-phone" type="tel"   placeholder="Teléfono (opcional)" />' +
            reasonsHtml +
            '<textarea id="f-msg" placeholder="Mensaje (opcional)"></textarea>' +
            '<div id="f-err" class="err" style="display:none"></div>' +
            '<button class="btn btn-send" id="f-send">' + esc(ch.button_text || 'Enviar mensaje') + '</button>' +
          '</div>' +
          '<div id="f-ok" class="ok" style="display:none">' + esc(ch.success_message || '¡Gracias!') + '</div>' +
        '</div>';

      var inner = document.getElementById('p-inner');

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
        var name  = inner.querySelector('#f-name').value.trim();
        var email = inner.querySelector('#f-email').value.trim();
        var phone = inner.querySelector('#f-phone').value.trim();
        var msg   = inner.querySelector('#f-msg').value.trim();
        var errEl = inner.querySelector('#f-err');
        var btn   = inner.querySelector('#f-send');

        errEl.style.display = 'none';
        if (!name || !email) { errEl.textContent = 'Nombre y email son obligatorios'; errEl.style.display = 'block'; return; }

        btn.disabled = true; btn.textContent = 'Enviando…';
        fetch(API_URL + '/widget/submit/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: TOKEN, name: name, email: email, phone: phone, reason: selReason, message: msg }),
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
      var agentName = ch.agent_name || 'Asistente';
      var greeting  = ch.greeting   || ('Hola, soy ' + agentName + '. ¿En qué puedo ayudarte?');
      var vcolor    = ch.color || color;

      document.getElementById('p-inner').innerHTML =
        '<div class="p-head" style="background:linear-gradient(135deg,'+vcolor+' 0%,'+darken(vcolor)+' 100%)">' +
          '<button class="p-close" id="v-close">' + ICONS.close + '</button>' +
          '<div class="p-title">' + esc(agentName) + '</div>' +
          '<div class="p-sub" id="v-status-head">Listo para llamar</div>' +
        '</div>' +
        '<div class="p-body">' +
          '<p class="v-greeting">' + esc(greeting) + '</p>' +
          '<div class="waveform" id="v-wave"><div class="bar"></div><div class="bar"></div><div class="bar"></div></div>' +
          '<div class="v-err" id="v-err" style="display:none"></div>' +
          '<div class="v-status" id="v-status">Haz clic en el micrófono para iniciar</div>' +
          '<button class="btn" id="v-mic" style="background:'+vcolor+';color:#fff;margin-bottom:8px">'+ICONS.mic+' Iniciar llamada</button>' +
          '<button class="btn btn-end" id="v-end" style="display:none">Finalizar llamada</button>' +
        '</div>';

      var inner = document.getElementById('p-inner');
      inner.querySelector('#v-close').addEventListener('click', function(){
        if (vapiInstance) { try { vapiInstance.stop(); } catch(e){} vapiInstance = null; }
        closeAll();
      });

      var waveEl   = inner.querySelector('#v-wave');
      var statusEl = inner.querySelector('#v-status');
      var headEl   = inner.querySelector('#v-status-head');
      var errEl    = inner.querySelector('#v-err');
      var micBtn   = inner.querySelector('#v-mic');
      var endBtn   = inner.querySelector('#v-end');

      function setVState(s) {
        errEl.style.display = 'none';
        waveEl.classList.remove('active');
        endBtn.style.display = 'none';
        micBtn.style.display = 'block';
        if (s === 'connecting') {
          headEl.textContent = 'Conectando…'; statusEl.textContent = 'Estableciendo conexión…';
          micBtn.style.display = 'none';
        } else if (s === 'active') {
          headEl.textContent = 'Hablando con ' + agentName; statusEl.textContent = 'Llamada activa — habla ahora';
          waveEl.classList.add('active'); endBtn.style.display = 'block'; micBtn.style.display = 'none';
        } else if (s === 'ended') {
          headEl.textContent = 'Llamada finalizada'; statusEl.textContent = 'Llamada finalizada';
          setTimeout(function(){ setVState('idle'); }, 3000);
        } else {
          headEl.textContent = 'Listo para llamar'; statusEl.textContent = 'Haz clic en el micrófono para iniciar';
        }
      }

      micBtn.addEventListener('click', function() {
        var VapiClass = _vapiClass;
        if (!VapiClass) { errEl.textContent = 'SDK de voz cargando, inténtalo en unos segundos.'; errEl.style.display = 'block'; return; }
        if (!ch.assistant_id) { errEl.textContent = 'Agente no configurado. Guarda la configuración primero.'; errEl.style.display = 'block'; return; }
        try {
          vapiInstance = new VapiClass(ch.vapi_public_key);
          vapiInstance.on('call-start', function(){ setVState('active'); });
          vapiInstance.on('call-end',   function(){ setVState('ended'); vapiInstance = null; });
          vapiInstance.on('speech-start', function(){ waveEl.style.filter='brightness(1.3)'; });
          vapiInstance.on('speech-end',   function(){ waveEl.style.filter=''; });
          vapiInstance.on('error', function(e){ errEl.textContent = (e&&e.message)||'Error de conexión'; errEl.style.display='block'; setVState('idle'); vapiInstance=null; });
          setVState('connecting');
          vapiInstance.start(ch.assistant_id);
        } catch(err) {
          errEl.textContent = (err&&err.message)||'No se pudo iniciar la llamada';
          errEl.style.display = 'block';
          setVState('idle');
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
