/**
 * OptimizaCRM Voice AI Agent Widget
 * Embed on any website to add a floating voice assistant powered by Vapi.
 * Usage: <script src="/voice-widget.js" data-token="WIDGET_TOKEN" data-api="http://localhost:8000/api/v1" async></script>
 */
(function () {
  'use strict';

  var script = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  var TOKEN   = script.getAttribute('data-token');
  var API_URL = script.getAttribute('data-api') || 'http://localhost:8000/api/v1';

  if (!TOKEN) { console.warn('[OptimizaCRM Voice] data-token is required'); return; }

  // ── Fetch config then boot ──────────────────────────────────────────────────
  fetch(API_URL + '/voice-widget/config/?token=' + TOKEN)
    .then(function (r) { return r.json(); })
    .then(function (cfg) { loadVapiAndBoot(cfg); })
    .catch(function (e) { console.warn('[OptimizaCRM Voice] Config error', e); });

  function loadVapiAndBoot(cfg) {
    // Create the widget UI immediately so the button is always visible.
    // Vapi SDK is loaded in the background; until it's ready the button
    // shows a loading state when clicked.
    var vapiClass = null;
    var pendingStart = false;

    var widgetAPI = boot(cfg, function getVapi() { return vapiClass; });

    var vapiScript = document.createElement('script');
    vapiScript.src = 'https://cdn.jsdelivr.net/npm/@vapi-ai/web@2/dist/index.js';
    vapiScript.onload = function () {
      vapiClass = window.Vapi || (window.vapiSdk && window.vapiSdk.Vapi) || null;
      if (!vapiClass) {
        console.warn('[OptimizaCRM Voice] Vapi SDK not found after script load');
      }
      // If user clicked the button while SDK was loading, start now
      if (pendingStart && vapiClass && widgetAPI) {
        widgetAPI.startCall();
        pendingStart = false;
      }
    };
    vapiScript.onerror = function () {
      console.warn('[OptimizaCRM Voice] Failed to load Vapi SDK from CDN');
      if (widgetAPI) widgetAPI.showSdkError();
    };
    document.head.appendChild(vapiScript);

    // Expose pendingStart setter so boot() can signal SDK-not-ready clicks
    if (widgetAPI) widgetAPI.setPendingStart = function(v) { pendingStart = v; };
  }

  // boot() now receives a getter function for VapiClass (loaded async)
  // and returns a small control API for loadVapiAndBoot to use.
  function boot(cfg, getVapi) {
    var color     = (cfg.config && cfg.config.color)      || '#EA580C';
    var agentName = (cfg.config && cfg.config.agent_name) || 'Asistente';
    var greeting  = (cfg.config && cfg.config.greeting)   || ('Hola, soy ' + agentName + '. ¿En qué puedo ayudarte?');

    var vapi      = null;
    var state     = 'idle'; // idle | connecting | active | ended

    // ── Shadow host ────────────────────────────────────────────────────────────
    var host = document.createElement('div');
    host.id  = 'optimiza-voice-widget';
    host.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:2147483647;font-family:system-ui,sans-serif;';
    document.body.appendChild(host);

    var shadow = host.attachShadow({ mode: 'open' });

    // ── Styles ─────────────────────────────────────────────────────────────────
    var style = document.createElement('style');
    style.textContent = [
      '*{box-sizing:border-box;margin:0;padding:0}',
      // Floating button
      '.fab{width:60px;height:60px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(0,0,0,.35);transition:transform .2s,box-shadow .2s;background:' + color + ';position:relative;}',
      '.fab:hover{transform:scale(1.08);box-shadow:0 6px 24px rgba(0,0,0,.4)}',
      '.fab svg{width:28px;height:28px;fill:white}',
      // Tooltip
      '.tooltip{position:absolute;bottom:68px;right:0;background:#1e293b;color:#f1f5f9;font-size:12px;padding:6px 10px;border-radius:8px;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity .2s;border:1px solid #334155}',
      '.fab:hover .tooltip{opacity:1}',
      // Spinner overlay on button
      '.fab-spinner{position:absolute;inset:0;border-radius:50%;border:3px solid rgba(255,255,255,.3);border-top-color:#fff;animation:spin .8s linear infinite}',
      '@keyframes spin{to{transform:rotate(360deg)}}',
      // Panel
      '.panel{position:absolute;bottom:72px;right:0;width:300px;background:#1e293b;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,.5);overflow:hidden;transition:opacity .2s,transform .2s}',
      '.panel.hidden{opacity:0;transform:translateY(12px);pointer-events:none}',
      // Panel header
      '.panel-head{padding:16px 18px 14px;background:linear-gradient(135deg,' + color + ' 0%,' + darken(color) + ' 100%);position:relative}',
      '.panel-title{font-size:15px;font-weight:700;color:#fff}',
      '.panel-status{font-size:12px;color:rgba(255,255,255,.8);margin-top:3px}',
      '.close-btn{position:absolute;top:12px;right:12px;background:rgba(255,255,255,.2);border:none;border-radius:50%;width:24px;height:24px;cursor:pointer;color:#fff;font-size:14px;display:flex;align-items:center;justify-content:center;line-height:1}',
      '.close-btn:hover{background:rgba(255,255,255,.35)}',
      // Panel body
      '.panel-body{padding:20px 18px}',
      // Waveform
      '.waveform{display:flex;align-items:center;justify-content:center;gap:5px;height:48px;margin-bottom:16px}',
      '.bar{width:6px;border-radius:4px;background:' + color + ';height:8px;transition:height .15s}',
      '.waveform.active .bar:nth-child(1){animation:wave 1.1s ease-in-out infinite}',
      '.waveform.active .bar:nth-child(2){animation:wave 1.1s ease-in-out infinite .18s}',
      '.waveform.active .bar:nth-child(3){animation:wave 1.1s ease-in-out infinite .36s}',
      '.waveform.agent-speaking .bar{background:#f97316}',
      '@keyframes wave{0%,100%{height:8px}50%{height:32px}}',
      // Status text
      '.status-text{text-align:center;font-size:13px;color:#94a3b8;margin-bottom:16px}',
      // End call button
      '.btn-end{width:100%;padding:10px;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;background:#dc2626;color:#fff;transition:opacity .15s}',
      '.btn-end:hover{opacity:.85}',
      // Error
      '.error-msg{text-align:center;font-size:12px;color:#f87171;margin-bottom:12px;padding:8px;background:rgba(220,38,38,.1);border-radius:8px;border:1px solid rgba(220,38,38,.2)}',
      // Greeting
      '.greeting{font-size:12px;color:#64748b;text-align:center;margin-bottom:14px;font-style:italic}',
    ].join('');
    shadow.appendChild(style);

    // ── Floating button ─────────────────────────────────────────────────────────
    var fab = document.createElement('button');
    fab.className = 'fab';
    fab.innerHTML = micIcon() + '<span class="tooltip">Hablar con ' + escHtml(agentName) + '</span>';
    shadow.appendChild(fab);

    // ── Panel ───────────────────────────────────────────────────────────────────
    var panel = document.createElement('div');
    panel.className = 'panel hidden';
    panel.innerHTML = [
      '<div class="panel-head">',
        '<button class="close-btn" aria-label="Cerrar">✕</button>',
        '<div class="panel-title">' + escHtml(agentName) + '</div>',
        '<div class="panel-status" id="vw-status">Listo para llamar</div>',
      '</div>',
      '<div class="panel-body">',
        '<p class="greeting">' + escHtml(greeting) + '</p>',
        '<div class="waveform" id="vw-waveform">',
          '<div class="bar"></div>',
          '<div class="bar"></div>',
          '<div class="bar"></div>',
        '</div>',
        '<div id="vw-error" class="error-msg" style="display:none"></div>',
        '<div id="vw-status-text" class="status-text">Haz clic en el micrófono para iniciar</div>',
        '<button class="btn-end" id="vw-end-btn" style="display:none">Finalizar llamada</button>',
      '</div>',
    ].join('');
    shadow.appendChild(panel);

    var panelOpen = false;

    function openPanel() { panel.classList.remove('hidden'); panelOpen = true; }
    function closePanel() { panel.classList.add('hidden'); panelOpen = false; }

    panel.querySelector('.close-btn').addEventListener('click', function () {
      if (state === 'active' || state === 'connecting') {
        stopCall();
      }
      closePanel();
    });

    // ── State machine ───────────────────────────────────────────────────────────
    var statusEl    = panel.querySelector('#vw-status');
    var statusText  = panel.querySelector('#vw-status-text');
    var waveform    = panel.querySelector('#vw-waveform');
    var endBtn      = panel.querySelector('#vw-end-btn');
    var errorEl     = panel.querySelector('#vw-error');

    function setState(newState) {
      state = newState;
      errorEl.style.display = 'none';

      // Reset
      fab.querySelector('.fab-spinner') && fab.querySelector('.fab-spinner').remove();
      waveform.classList.remove('active');
      endBtn.style.display = 'none';

      if (newState === 'idle') {
        fab.innerHTML = micIcon() + '<span class="tooltip">Hablar con ' + escHtml(agentName) + '</span>';
        statusEl.textContent = 'Listo para llamar';
        statusText.textContent = 'Haz clic en el micrófono para iniciar';
      } else if (newState === 'connecting') {
        fab.innerHTML = micIcon();
        var spinner = document.createElement('div');
        spinner.className = 'fab-spinner';
        fab.appendChild(spinner);
        statusEl.textContent = 'Conectando…';
        statusText.textContent = 'Estableciendo conexión…';
      } else if (newState === 'active') {
        fab.innerHTML = micIcon() + '<span class="tooltip">En llamada</span>';
        statusEl.textContent = 'Hablando con ' + agentName;
        statusText.textContent = 'Llamada activa — habla ahora';
        waveform.classList.add('active');
        endBtn.style.display = 'block';
      } else if (newState === 'ended') {
        fab.innerHTML = micIcon() + '<span class="tooltip">Hablar con ' + escHtml(agentName) + '</span>';
        statusEl.textContent = 'Llamada finalizada';
        statusText.textContent = 'Llamada finalizada';
        setTimeout(function () { setState('idle'); }, 3000);
      }
    }

    function showError(msg) {
      errorEl.textContent = msg || 'Error de conexión';
      errorEl.style.display = 'block';
    }

    // ── Vapi call ───────────────────────────────────────────────────────────────
    function startCall() {
      if (state !== 'idle') return;
      var VapiClass = getVapi();
      if (!VapiClass) {
        // SDK still loading — signal loadVapiAndBoot to start once ready
        setState('connecting');
        if (widgetAPI && widgetAPI.setPendingStart) widgetAPI.setPendingStart(true);
        return;
      }
      if (!cfg.assistant_id) {
        showError('Agente no configurado. Guarda la configuración en el panel primero.');
        return;
      }
      try {
        vapi = new VapiClass(cfg.vapi_public_key);

        vapi.on('call-start', function () { setState('active'); });
        vapi.on('call-end',   function () { setState('ended'); });
        vapi.on('speech-start', function () { waveform.classList.add('agent-speaking'); });
        vapi.on('speech-end',   function () { waveform.classList.remove('agent-speaking'); });
        vapi.on('error', function (e) {
          showError((e && e.message) || 'Error de conexión');
          setState('idle');
        });

        setState('connecting');
        vapi.start(cfg.assistant_id);
      } catch (err) {
        showError((err && err.message) || 'No se pudo iniciar la llamada');
        setState('idle');
      }
    }

    function stopCall() {
      if (vapi) {
        try { vapi.stop(); } catch (e) { /* ignore */ }
        vapi = null;
      }
    }

    // ── Event listeners ─────────────────────────────────────────────────────────
    fab.addEventListener('click', function () {
      if (!panelOpen) {
        openPanel();
        if (state === 'idle') startCall();
      } else if (state === 'idle') {
        startCall();
      }
    });

    endBtn.addEventListener('click', function () {
      stopCall();
      setState('ended');
    });

    // Initialize idle state
    setState('idle');

    // Return control API for loadVapiAndBoot
    var widgetAPI = {
      startCall: startCall,
      showSdkError: function () { showError('No se pudo cargar el SDK de voz. Verifica tu conexión.'); },
      setPendingStart: null, // filled by loadVapiAndBoot
    };
    return widgetAPI;
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function micIcon() {
    return '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 1a4 4 0 0 0-4 4v6a4 4 0 0 0 8 0V5a4 4 0 0 0-4-4zm-2 4a2 2 0 0 1 4 0v6a2 2 0 0 1-4 0V5zm-5 6a1 1 0 0 1 1 1 6 6 0 0 0 12 0 1 1 0 1 1 2 0 8 8 0 0 1-7 7.93V21h2a1 1 0 1 1 0 2H9a1 1 0 1 1 0-2h2v-2.07A8 8 0 0 1 4 12a1 1 0 0 1 1-1z"/></svg>';
  }

  function darken(hex) {
    // Simple darken by 20% for gradient
    try {
      hex = hex.replace('#', '');
      if (hex.length === 3) hex = hex.split('').map(function(c){return c+c;}).join('');
      var r = Math.max(0, parseInt(hex.slice(0,2),16) - 50);
      var g = Math.max(0, parseInt(hex.slice(2,4),16) - 30);
      var b = Math.max(0, parseInt(hex.slice(4,6),16) - 20);
      return '#' + [r,g,b].map(function(n){return ('0'+n.toString(16)).slice(-2);}).join('');
    } catch(e) { return hex; }
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

})();
