/* "Your Tech Assistant" chat widget */
(function () {
  'use strict';
  var cfg = window.PIS_CHAT || {};
  var panel = document.getElementById('chatPanel');
  var openBtn = document.getElementById('chatOpen');
  var closeBtn = document.getElementById('chatClose');
  var body = document.getElementById('chatBody');
  var form = document.getElementById('chatForm');
  var input = document.getElementById('chatInput');
  var suggest = document.getElementById('chatSuggest');
  if (!panel || !openBtn) return;

  var history = [];
  var busy = false;
  var lang = function () { return (window.PIS_LANG && window.PIS_LANG()) || 'en'; };

  function open() {
    panel.hidden = false;
    requestAnimationFrame(function () { panel.classList.add('open'); });
    openBtn.setAttribute('aria-expanded', 'true');
    document.body.classList.add('chat-open');
    setTimeout(function () { input.focus(); }, 200);
  }
  function close() {
    panel.classList.remove('open');
    openBtn.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('chat-open');
    setTimeout(function () { panel.hidden = true; }, 250);
    openBtn.focus();
  }
  openBtn.addEventListener('click', function () { panel.hidden ? open() : close(); });
  closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) close(); });
  document.querySelectorAll('[data-open-chat]').forEach(function (b) { b.addEventListener('click', open); });

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function format(t) {
    // Escape, then turn URLs into links, **bold** into <b>, newlines into <br>.
    var s = esc(t);
    s = s.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    return s.replace(/\n/g, '<br>');
  }
  function add(role, text) {
    var m = document.createElement('div');
    m.className = 'msg ' + (role === 'user' ? 'user' : 'bot');
    m.innerHTML = '<div class="bubble">' + (role === 'user' ? esc(text) : format(text)) + '</div>';
    body.appendChild(m);
    body.scrollTop = body.scrollHeight;
    return m;
  }
  function typing() {
    var m = document.createElement('div');
    m.className = 'msg bot typing';
    m.innerHTML = '<div class="bubble"><i></i><i></i><i></i></div>';
    body.appendChild(m);
    body.scrollTop = body.scrollHeight;
    return m;
  }

  function send(text) {
    text = (text || '').trim();
    if (!text || busy) return;
    busy = true;
    if (suggest) suggest.classList.add('hide');
    add('user', text);
    history.push({ role: 'user', content: text });
    input.value = '';
    var t = typing();
    fetch(cfg.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history.slice(-12), lang: lang() })
    })
      .then(function (r) { return r.json().catch(function () { return {}; }); })
      .then(function (d) {
        t.remove();
        var reply = (d && d.reply) || (lang() === 'ar'
          ? 'عذراً، حدث خطأ. تواصل معنا على واتساب ' + (cfg.phone || '')
          : 'Sorry, something went wrong. Please WhatsApp us on ' + (cfg.phone || ''));
        add('bot', reply);
        history.push({ role: 'assistant', content: reply });
      })
      .catch(function () {
        t.remove();
        add('bot', lang() === 'ar' ? 'تعذر الاتصال. حاول مرة أخرى أو راسلنا على واتساب.' : 'Connection problem. Please try again or WhatsApp us.');
      })
      .then(function () { busy = false; });
  }

  form.addEventListener('submit', function (e) { e.preventDefault(); send(input.value); });
  if (suggest) {
    suggest.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () { send(b.textContent); });
    });
  }

  // Gentle nudge: show the label pulse after a few seconds on first visit.
  try {
    if (!sessionStorage.getItem('pis-chat-seen')) {
      setTimeout(function () { openBtn.classList.add('nudge'); }, 4000);
      sessionStorage.setItem('pis-chat-seen', '1');
    }
  } catch (e) {}
})();
