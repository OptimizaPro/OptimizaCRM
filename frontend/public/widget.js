/**
 * OptimizaCRM Web Widget
 * Embed on any website to capture leads or link to WhatsApp.
 * Usage: <script src="https://yourdomain.com/widget.js" data-token="YOUR_TOKEN" async></script>
 */
(function () {
  'use strict';

  var script  = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  var TOKEN   = script.getAttribute('data-token');
  var API_URL = script.getAttribute('data-api') || 'http://localhost:8000/api/v1';

  if (!TOKEN) { console.warn('[OptimizaCRM] data-token is required'); return; }

  // ── Fetch config then render ────────────────────────────────────────────────
  fetch(API_URL + '/widget/config/?token=' + TOKEN)
    .then(function (r) { return r.json(); })
    .then(function (cfg) { boot(cfg); })
    .catch(function (e) { console.warn('[OptimizaCRM] Widget config error', e); });

  function boot(cfg) {
    var color    = cfg.color    || '#EA580C';
    var mode     = cfg.mode     || 'form';
    var waNumber = (cfg.whatsapp_number || '').replace(/\D/g, '');
    var waMsg    = encodeURIComponent(cfg.whatsapp_message || 'Hola, me gustaría más información');

    // ── Shadow host ──────────────────────────────────────────────────────────
    var host = document.createElement('div');
    host.id  = 'optimiza-crm-widget';
    host.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:2147483647;font-family:system-ui,sans-serif;';
    document.body.appendChild(host);

    var shadow = host.attachShadow({ mode: 'open' });

    // ── Styles ───────────────────────────────────────────────────────────────
    var style = document.createElement('style');
    style.textContent = [
      '*{box-sizing:border-box;margin:0;padding:0}',
      '.fab{width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(0,0,0,.25);transition:transform .2s,box-shadow .2s}',
      '.fab:hover{transform:scale(1.08);box-shadow:0 6px 20px rgba(0,0,0,.3)}',
      '.fab svg{width:26px;height:26px;fill:white}',
      '.fab-row{display:flex;flex-direction:column;align-items:flex-end;gap:10px}',
      '.fab-wa{background:#25D366}',
      '.fab-form{background:' + color + '}',
      '.panel{position:absolute;bottom:70px;right:0;width:320px;background:#1e293b;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.4);overflow:hidden;transition:opacity .2s,transform .2s}',
      '.panel.hidden{opacity:0;transform:translateY(12px);pointer-events:none}',
      '.panel-head{padding:18px 18px 14px;background:' + color + '}',
      '.panel-title{font-size:15px;font-weight:700;color:#fff}',
      '.panel-sub{font-size:12px;color:rgba(255,255,255,.8);margin-top:2px}',
      '.panel-body{padding:16px}',
      'input,textarea{width:100%;background:#0f172a;border:1px solid #334155;border-radius:8px;padding:9px 12px;font-size:13px;color:#e2e8f0;outline:none;margin-bottom:10px;transition:border .15s}',
      'input::placeholder,textarea::placeholder{color:#64748b}',
      'input:focus,textarea:focus{border-color:' + color + '}',
      'textarea{resize:vertical;min-height:72px;font-family:inherit}',
      '.btn{width:100%;padding:10px;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;transition:opacity .15s}',
      '.btn:hover{opacity:.88}',
      '.btn-send{background:' + color + ';color:#fff}',
      '.btn:disabled{opacity:.5;cursor:not-allowed}',
      '.success{text-align:center;padding:24px 16px;color:#4ade80;font-size:14px;font-weight:500}',
      '.err{color:#f87171;font-size:12px;margin-bottom:8px}',
      '.close-btn{position:absolute;top:14px;right:14px;background:rgba(255,255,255,.2);border:none;border-radius:50%;width:24px;height:24px;cursor:pointer;color:#fff;font-size:14px;display:flex;align-items:center;justify-content:center}',
      '.close-btn:hover{background:rgba(255,255,255,.35)}',
    ].join('');
    shadow.appendChild(style);

    // ── Root container ────────────────────────────────────────────────────────
    var root = document.createElement('div');
    root.className = 'fab-row';
    shadow.appendChild(root);

    // ── WhatsApp button ───────────────────────────────────────────────────────
    if ((mode === 'whatsapp' || mode === 'both') && waNumber) {
      var waBtn = document.createElement('button');
      waBtn.className = 'fab fab-wa';
      waBtn.title     = 'WhatsApp';
      waBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M11.999 0C5.373 0 0 5.373 0 12c0 2.117.554 4.103 1.523 5.826L.057 23.926a.5.5 0 0 0 .611.611l6.101-1.466A11.94 11.94 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.8 9.8 0 0 1-5.012-1.373l-.36-.213-3.626.872.888-3.544-.234-.374A9.772 9.772 0 0 1 2.182 12c0-5.42 4.398-9.818 9.817-9.818 5.42 0 9.819 4.398 9.819 9.818 0 5.42-4.399 9.818-9.819 9.818z"/></svg>';
      waBtn.addEventListener('click', function () {
        window.open('https://wa.me/' + waNumber + '?text=' + waMsg, '_blank');
      });
      root.appendChild(waBtn);
    }

    // ── Form button + panel (form or both mode) ───────────────────────────────
    if (mode === 'form' || mode === 'both') {
      var formBtn = document.createElement('button');
      formBtn.className = 'fab fab-form';
      formBtn.title     = 'Contactar';
      formBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/></svg>';
      root.appendChild(formBtn);

      // Panel
      var panel = document.createElement('div');
      panel.className = 'panel hidden';
      panel.innerHTML = [
        '<div class="panel-head">',
          '<button class="close-btn" aria-label="Cerrar">✕</button>',
          '<div class="panel-title">' + escHtml(cfg.title || '¿Podemos ayudarte?') + '</div>',
          '<div class="panel-sub">' + escHtml(cfg.subtitle || 'Escríbenos y te contactamos pronto') + '</div>',
        '</div>',
        '<div class="panel-body">',
          '<div id="ocw-form">',
            '<input id="ocw-name"    placeholder="Nombre *" required />',
            '<input id="ocw-email"   type="email" placeholder="Email *" required />',
            '<input id="ocw-phone"   type="tel"   placeholder="Teléfono (opcional)" />',
            '<textarea id="ocw-msg"  placeholder="Mensaje (opcional)"></textarea>',
            '<div id="ocw-err" class="err" style="display:none"></div>',
            '<button class="btn btn-send" id="ocw-submit">' + escHtml(cfg.button_text || 'Enviar mensaje') + '</button>',
          '</div>',
          '<div id="ocw-success" class="success" style="display:none">' + escHtml(cfg.success_message || '¡Gracias! Nos pondremos en contacto pronto.') + '</div>',
        '</div>',
      ].join('');
      root.appendChild(panel);

      // Toggle panel
      var open = false;
      function togglePanel() {
        open = !open;
        if (open) panel.classList.remove('hidden');
        else       panel.classList.add('hidden');
      }

      formBtn.addEventListener('click', togglePanel);
      panel.querySelector('.close-btn').addEventListener('click', togglePanel);

      // Submit
      panel.querySelector('#ocw-submit').addEventListener('click', function () {
        var name  = panel.querySelector('#ocw-name').value.trim();
        var email = panel.querySelector('#ocw-email').value.trim();
        var phone = panel.querySelector('#ocw-phone').value.trim();
        var msg   = panel.querySelector('#ocw-msg').value.trim();
        var errEl = panel.querySelector('#ocw-err');
        var btn   = panel.querySelector('#ocw-submit');

        errEl.style.display = 'none';
        if (!name || !email) {
          errEl.textContent    = 'Nombre y email son obligatorios';
          errEl.style.display  = 'block';
          return;
        }

        btn.disabled     = true;
        btn.textContent  = 'Enviando…';

        fetch(API_URL + '/widget/submit/', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ token: TOKEN, name: name, email: email, phone: phone, message: msg }),
        })
          .then(function (r) { return r.json(); })
          .then(function (res) {
            if (res.ok) {
              panel.querySelector('#ocw-form').style.display    = 'none';
              panel.querySelector('#ocw-success').style.display = 'block';
            } else {
              errEl.textContent   = res.error || 'Error al enviar. Inténtalo de nuevo.';
              errEl.style.display = 'block';
              btn.disabled        = false;
              btn.textContent     = cfg.button_text || 'Enviar mensaje';
            }
          })
          .catch(function () {
            errEl.textContent   = 'Error de conexión. Inténtalo de nuevo.';
            errEl.style.display = 'block';
            btn.disabled        = false;
            btn.textContent     = cfg.button_text || 'Enviar mensaje';
          });
      });
    }
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

})();
