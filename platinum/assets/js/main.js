/* Platinum Integrated Solutions — site interactions + EN/AR switching */
(function () {
  'use strict';
  var html = document.documentElement;

  /* ---------- Language ---------- */
  // Texts are rendered by PHP in the page language, with both versions in data-en / data-ar.
  var nodes = Array.prototype.slice.call(document.querySelectorAll('[data-ar]'));
  nodes.forEach(function (n) { if (!n.hasAttribute('data-en')) n.setAttribute('data-en', n.innerHTML); });
  var phs = Array.prototype.slice.call(document.querySelectorAll('[data-ar-placeholder]'));
  phs.forEach(function (n) { if (!n.hasAttribute('data-en-placeholder')) n.setAttribute('data-en-placeholder', n.getAttribute('placeholder') || ''); });
  var serverLang = html.getAttribute('data-server-lang') || 'en';

  // Keep the chosen language when moving between pages (?lang=ar), so pages arrive already translated.
  function tagLinks(l) {
    document.querySelectorAll('a[href]').forEach(function (a) {
      var u;
      try { u = new URL(a.getAttribute('href'), location.href); } catch (e) { return; }
      if (u.origin !== location.origin || /\/wp-(admin|json|login)/.test(u.pathname) || /\.(webp|png|jpe?g|pdf|xml)$/i.test(u.pathname)) return;
      if (l === 'ar') u.searchParams.set('lang', 'ar'); else u.searchParams.delete('lang');
      a.setAttribute('href', u.pathname + u.search + u.hash);
    });
    try {
      var cur = new URL(location.href);
      if (l === 'ar') cur.searchParams.set('lang', 'ar'); else cur.searchParams.delete('lang');
      history.replaceState(null, '', cur.pathname + cur.search + cur.hash);
    } catch (e) {}
  }

  function setLang(l, save) {
    html.lang = l;
    html.dir = l === 'ar' ? 'rtl' : 'ltr';
    nodes.forEach(function (n) { var v = n.getAttribute(l === 'ar' ? 'data-ar' : 'data-en'); if (v) n.innerHTML = v; });
    phs.forEach(function (n) { n.setAttribute('placeholder', n.getAttribute(l === 'ar' ? 'data-ar-placeholder' : 'data-en-placeholder')); });
    if (save) { try { localStorage.setItem('pis-lang', l); } catch (e) {} }
    document.querySelectorAll('input[name="form_lang"]').forEach(function (i) { i.value = l; });
    tagLinks(l);
    document.dispatchEvent(new CustomEvent('pis:lang', { detail: l }));
  }
  window.PIS_LANG = function () { return html.lang === 'ar' ? 'ar' : 'en'; };
  // header.php may have switched html.lang from localStorage; translate if it differs from what PHP rendered.
  if (html.lang !== serverLang) setLang(html.lang, false); else if (html.lang === 'ar') tagLinks('ar');
  var lt = document.getElementById('langToggle');
  if (lt) lt.addEventListener('click', function () {
    var next = html.lang === 'ar' ? 'en' : 'ar';
    setLang(next, true);
    // Pages that list news posts are filtered by language on the server: reload to get the right posts.
    if (document.querySelector('[data-lang-posts]')) { location.reload(); }
  });

  /* Prefetch internal pages on hover (fallback where speculation rules are not available). */
  var prefetched = {};
  function prefetch(e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target === '_blank') return;
    var u; try { u = new URL(a.href); } catch (er) { return; }
    if (u.origin !== location.origin || u.pathname === location.pathname || /\/wp-(admin|json|login)/.test(u.pathname) || prefetched[u.href]) return;
    prefetched[u.href] = 1;
    var l = document.createElement('link'); l.rel = 'prefetch'; l.href = u.href; document.head.appendChild(l);
  }
  document.addEventListener('mouseover', prefetch, { passive: true });
  document.addEventListener('touchstart', prefetch, { passive: true });

  /* ---------- Header ---------- */
  var header = document.getElementById('siteHeader');
  function onScroll() { if (header) header.classList.toggle('scrolled', window.scrollY > 30); }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  var menuBtn = document.getElementById('menuToggle');
  var nav = document.getElementById('mainNav');
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('nav-open', open);
    });
    nav.querySelectorAll('.has-sub > a, .menu-item-has-children > a').forEach(function (a) {
      a.addEventListener('click', function (e) {
        if (window.matchMedia('(max-width: 1020px)').matches) {
          e.preventDefault();
          a.parentElement.classList.toggle('sub-open');
        }
      });
    });
  }

  /* ---------- Hero: rotating verb + glowing system + project badge ---------- */
  var words = Array.prototype.slice.call(document.querySelectorAll('.rot-word'));
  var bld = document.getElementById('heroBuilding');
  var chips = Array.prototype.slice.call(document.querySelectorAll('.hx-copy .sys-chip'));
  var badge = document.getElementById('projBadge');
  var badges = window.PIS_BADGES || {};
  var idx = 0, paused = false, current = '', countRaf = 0;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function showBadge(sys) {
    if (!badge || !bld || !badges[sys]) return;
    var b = badges[sys], lbl = bld.querySelector('.lbl[data-sys="' + sys + '"] rect');
    var card = badge.parentElement.getBoundingClientRect();
    var svgR = bld.getBoundingClientRect();
    // Ratio between on-screen pixels and CSS pixels (differs when the page is zoomed).
    var k = (badge.parentElement.offsetWidth && card.width / badge.parentElement.offsetWidth) || 1;
    // Empty strip between the card edge and the building shell (shell starts at x=70 of the 470 viewBox).
    var gap = (svgR.left - card.left + svgR.width * (66 / 470)) / k;
    var w = Math.max(56, gap - 8);
    badge.style.width = w + 'px';
    badge.style.left = Math.max(4, (gap - w) / 2) + 'px';
    badge.classList.toggle('tight', w < 78);
    if (lbl) {
      var r = lbl.getBoundingClientRect();
      var top = (r.top - card.top + r.height / 2) / k - badge.offsetHeight / 2;
      badge.style.top = Math.max(4, Math.min(card.height / k - badge.offsetHeight - 4, top)) + 'px';
    }
    badge.style.setProperty('--c', b.color);
    document.getElementById('projIcon').innerHTML = b.icon;
    var ar = html.lang === 'ar';
    document.getElementById('projLbl').textContent = ar ? b.ar : b.en;
    badge.classList.remove('pop'); void badge.offsetWidth; badge.classList.add('pop');
    var numEl = document.getElementById('projNum');
    cancelAnimationFrame(countRaf);
    if (typeof b.num === 'number' && !reduce) {
      var st = performance.now();
      (function step(now) {
        var p = Math.min(1, (now - st) / 900);
        numEl.textContent = Math.round(b.num * (1 - Math.pow(1 - p, 3))) + b.suffix;
        if (p < 1) countRaf = requestAnimationFrame(step);
      })(st);
    } else {
      numEl.textContent = b.num + b.suffix;
    }
  }

  function activate(sys, force) {
    if (!sys || (sys === current && !force)) return;
    current = sys;
    if (bld) {
      bld.setAttribute('data-active', sys);
      bld.querySelectorAll('.sys').forEach(function (g) { g.classList.toggle('on', g.getAttribute('data-sys') === sys); });
    }
    chips.forEach(function (c) { c.classList.toggle('is-on', c.getAttribute('data-sys') === sys); });
    words.forEach(function (w, i) { var on = w.getAttribute('data-sys') === sys; w.classList.toggle('is-on', on); if (on) idx = i; });
    showBadge(sys);
  }
  function next() {
    if (paused || !words.length) return;
    activate(words[(idx + 1) % words.length].getAttribute('data-sys'));
  }
  if (words.length) {
    activate(words[0].getAttribute('data-sys'), true);
    if (!reduce) setInterval(next, 2800);
    var hoverables = chips.slice();
    if (bld) hoverables = hoverables.concat(Array.prototype.slice.call(bld.querySelectorAll('.lbl, .sys-link')));
    hoverables.forEach(function (el) {
      el.addEventListener('mouseenter', function () { paused = true; activate(el.getAttribute('data-sys')); });
      el.addEventListener('focus', function () { paused = true; activate(el.getAttribute('data-sys')); });
      el.addEventListener('mouseleave', function () { paused = false; });
    });
    document.addEventListener('pis:lang', function () { activate(current, true); });
    window.addEventListener('resize', function () { activate(current, true); });
  }

  /* Hero subtle parallax on pointer */
  var hx = document.querySelector('.hero-x');
  if (hx && !reduce) {
    hx.addEventListener('pointermove', function (e) {
      var r = hx.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      hx.style.setProperty('--px', (x * 18).toFixed(1) + 'px');
      hx.style.setProperty('--py', (y * 18).toFixed(1) + 'px');
    });
  }

  /* ---------- Reveal + counters ---------- */
  function count(el) {
    var t = Number(el.getAttribute('data-count')), s = el.getAttribute('data-suffix') || '', st = performance.now();
    (function step(now) {
      var p = Math.min(1, (now - st) / 1400);
      el.textContent = Math.round(t * (1 - Math.pow(1 - p, 3))) + s;
      if (p < 1) requestAnimationFrame(step);
    })(st);
  }
  var reveals = document.querySelectorAll('.reveal, .stats');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        e.target.querySelectorAll('[data-count]').forEach(count);
        io.unobserve(e.target);
      });
    }, { threshold: 0.12 });
    reveals.forEach(function (r) { io.observe(r); });
  } else {
    reveals.forEach(function (r) { r.classList.add('in'); });
  }

  /* ---------- Certificate lightbox ---------- */
  var lb = document.getElementById('lightbox');
  if (lb) {
    var lbImg = lb.querySelector('img');
    var closeLb = function () { lb.hidden = true; document.body.style.overflow = ''; };
    document.querySelectorAll('.cert-thumb').forEach(function (t) {
      t.addEventListener('click', function () {
        lbImg.src = t.getAttribute('data-full'); lbImg.alt = t.querySelector('img').alt;
        lb.hidden = false; document.body.style.overflow = 'hidden'; lb.querySelector('.lb-close').focus();
      });
    });
    lb.addEventListener('click', function (e) { if (e.target !== lbImg) closeLb(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !lb.hidden) closeLb(); });
  }

  /* ---------- Map office tabs ---------- */
  var frame = document.getElementById('mapFrame'), dir = document.getElementById('mapDirections');
  document.querySelectorAll('.office-tab').forEach(function (t) {
    t.addEventListener('click', function () {
      document.querySelectorAll('.office-tab').forEach(function (o) { o.classList.remove('is-active'); o.setAttribute('aria-selected', 'false'); });
      t.classList.add('is-active'); t.setAttribute('aria-selected', 'true');
      if (frame) frame.src = t.getAttribute('data-map');
      if (dir) dir.href = t.getAttribute('data-dir');
    });
  });

  /* ---------- Quote form: elevator cabin designs appear when Elevators / Full project is ticked ---------- */
  document.querySelectorAll('.quote-form').forEach(function (f) {
    var box = f.querySelector('#cabinPick');
    if (!box) return;
    var sync = function () {
      var on = !!f.querySelector('input[data-key="elevator"]:checked, input[data-key="all"]:checked');
      if (on && box.hidden) { box.hidden = false; box.classList.remove('pop-in'); void box.offsetWidth; box.classList.add('pop-in'); }
      if (!on) box.hidden = true;
    };
    f.querySelectorAll('input[name="division[]"]').forEach(function (i) { i.addEventListener('change', sync); });
    sync();

    // Highlight the chosen model; picking a finish for a part selects that model automatically.
    var mark = function () {
      var cur = f.querySelector('input[name="cabin_design"]:checked');
      f.querySelectorAll('.cabin-model').forEach(function (m) { m.classList.toggle('is-chosen', !!cur && m.contains(cur)); });
      box.classList.toggle('has-choice', !!(cur && cur.closest('.cabin-model')));
    };
    f.querySelectorAll('.cabin-model').forEach(function (m) {
      m.addEventListener('change', function (e) {
        if (e.target.name && e.target.name.indexOf('cabin_part') === 0) {
          var cur = f.querySelector('input[name="cabin_design"]:checked');
          if (!cur || !m.contains(cur)) {
            var first = m.querySelector('input[name="cabin_design"]');
            if (first) first.checked = true;
          }
        }
        mark();
      });
    });
    box.addEventListener('change', mark);
    mark();

    // Live preview on the cabin photo: hovering/choosing a part lights it up; a different material is laid over it.
    f.querySelectorAll('.cabin-model').forEach(function (m) {
      var map = m.querySelector('.cabin-map');
      var tag = m.querySelector('.cabin-tag');
      if (!map) return;
      var sticky = '';
      var show = function (part) {
        map.querySelectorAll('.zone').forEach(function (z) { z.classList.toggle('on', z.getAttribute('data-part') === part); });
        m.querySelectorAll('.part-row').forEach(function (r) { r.classList.toggle('is-active', r.getAttribute('data-part') === part); });
        var row = part && m.querySelector('.part-row[data-part="' + part + '"]');
        if (tag) {
          tag.textContent = row ? row.getAttribute(document.documentElement.lang === 'ar' ? 'data-label-ar' : 'data-label-en') : '';
          tag.classList.toggle('show', !!row);
        }
      };
      var applyTex = function () {
        map.querySelectorAll('.zone').forEach(function (z) {
          var part = z.getAttribute('data-part');
          var sel = m.querySelector('.part-row[data-part="' + part + '"] input:checked');
          var idx = sel ? sel.getAttribute('data-idx') : z.getAttribute('data-in-photo');
          z.querySelectorAll('.tex').forEach(function (t) { t.classList.toggle('on', t.getAttribute('data-idx') === idx); });
        });
      };
      m.querySelectorAll('.part-row').forEach(function (r) {
        var part = r.getAttribute('data-part');
        r.addEventListener('mouseenter', function () { show(part); });
        r.addEventListener('focusin', function () { show(part); });
        r.addEventListener('mouseleave', function () { show(sticky); });
        r.addEventListener('change', function () { sticky = part; show(part); applyTex(); });
      });
      document.addEventListener('pis:lang', function () { show(sticky); });
      applyTex();
    });
  });

  /* ---------- Quote form: require name + phone ---------- */
  document.querySelectorAll('.quote-form').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      var ok = true;
      ['name', 'phone'].forEach(function (k) {
        var el = f.elements[k];
        var bad = !el.value.trim();
        el.classList.toggle('invalid', bad);
        if (bad) ok = false;
      });
      if (!ok) { e.preventDefault(); f.elements[f.elements.name.value.trim() ? 'phone' : 'name'].focus(); }
    });
  });
})();

/* Instant feedback when moving to another page */
(function () {
  'use strict';
  var bar = document.createElement('div');
  bar.className = 'nav-progress';
  document.body.appendChild(bar);
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    var u; try { u = new URL(a.href); } catch (er) { return; }
    if (u.origin !== location.origin || (u.pathname === location.pathname && u.search === location.search)) return;
    bar.classList.remove('go'); void bar.offsetWidth; bar.classList.add('go');
  });
  window.addEventListener('pageshow', function () { bar.classList.remove('go'); });
})();
