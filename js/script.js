/* ===== Lucieudo 2026 — script.js ===== */
(() => {
  'use strict';
  document.documentElement.classList.add('js');

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const wait = (fn, ms) => setTimeout(fn, RM ? 0 : ms);
  const COLORS = ['#ff2fb3', '#ffd23f', '#a6ff3d', '#2a4bff', '#ff7a1a', '#00e5ff', '#fff'];

  const body = document.body, intro = $('#intro'), festa = $('#festa');
  const say = (el, txt) => { el.textContent = txt; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); };

  /* ---------- Áudio (sons sintetizados + música opcional) ---------- */
  const A = {
    ctx: null, muted: false,
    init() {
      if (!this.ctx) { const C = window.AudioContext || window.webkitAudioContext; if (C) this.ctx = new C(); }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },
    tone(f, d = .15, type = 'sine', v = .12, at = 0, slide) {
      if (this.muted || !this.ctx) return;
      const t = this.ctx.currentTime + at, o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
      o.connect(g).connect(this.ctx.destination); o.start(t); o.stop(t + d + .02);
    },
    noise(d = .4, v = .15, f = 1200) {
      if (this.muted || !this.ctx) return;
      const c = this.ctx, n = Math.floor(c.sampleRate * d), buf = c.createBuffer(1, n, c.sampleRate), ch = buf.getChannelData(0);
      for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const s = c.createBufferSource(), lp = c.createBiquadFilter(), g = c.createGain();
      s.buffer = buf; lp.type = 'lowpass'; lp.frequency.value = f; g.gain.value = v;
      s.connect(lp).connect(g).connect(c.destination); s.start();
    },
    pop() { this.tone(500, .12, 'triangle', .15, 0, 120); },
    ding() { this.tone(880, .3, 'sine', .12); this.tone(1320, .4, 'sine', .08, .1); },
    fanfare() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, .25, 'square', .06, i * .12)); },
    blow() { this.noise(.35, .12, 800); },
    boom() { this.noise(.6, .2, 300); this.tone(90, .4, 'sine', .2, 0, 40); }
  };
  const bgm = $('#bgm'), btnMusic = $('#btnMusic'), btnMute = $('#btnMute'), note = $('#audioNote');
  let noteTimer;
  const showNote = t => { note.textContent = t; clearTimeout(noteTimer); noteTimer = setTimeout(() => (note.textContent = ''), 4000); };

  btnMusic.addEventListener('click', async () => {
    A.init();
    if (bgm.paused) {
      try { await bgm.play(); btnMusic.setAttribute('aria-pressed', 'true'); btnMusic.setAttribute('aria-label', 'Pausar música'); }
      catch { btnMusic.setAttribute('aria-pressed', 'false'); showNote('Música não encontrada. Coloque musica.mp3 em assets/audio/'); }
    } else {
      bgm.pause(); btnMusic.setAttribute('aria-pressed', 'false'); btnMusic.setAttribute('aria-label', 'Tocar música');
    }
  });
  btnMute.addEventListener('click', () => {
    A.muted = !A.muted; bgm.muted = A.muted;
    btnMute.setAttribute('aria-pressed', A.muted);
    btnMute.textContent = A.muted ? '🔇' : '🔊';
    btnMute.setAttribute('aria-label', A.muted ? 'Ligar os sons' : 'Desligar todos os sons');
  });

  /* ---------- Canvas: confetes, emojis e fogos ---------- */
  class FX {
    constructor(c) { this.c = c; this.x = c.getContext('2d'); this.p = []; this.run = false; addEventListener('resize', () => this.size()); }
    size() {
      const d = Math.min(devicePixelRatio || 1, 2), r = this.c.getBoundingClientRect();
      this.w = r.width; this.h = r.height; this.c.width = r.width * d; this.c.height = r.height * d;
      this.x.setTransform(d, 0, 0, d, 0, 0);
    }
    add(o) {
      if (RM) return;
      this.p.push(o);
      if (!this.run) { this.run = true; this.size(); this.t = performance.now(); requestAnimationFrame(t => this.loop(t)); }
    }
    sparks(x, y, n = 70) {
      const c = pick(COLORS);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * 6.283, s = rnd(40, 230);
        this.p.push({ k: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 120, life: rnd(.8, 1.6), max: 1.6, c: Math.random() < .3 ? '#fff' : c, s: rnd(1.5, 3) });
      }
    }
    loop(t) {
      const dt = Math.min((t - this.t) / 1000, .05); this.t = t;
      const x = this.x; x.clearRect(0, 0, this.w, this.h);
      this.p = this.p.filter(p => {
        p.life -= dt; p.vy += (p.g || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.k === 'rocket') {
          if (p.vy > -70 || p.life <= 0) { this.sparks(p.x, p.y); A.boom(); return false; }
          x.globalAlpha = 1; x.fillStyle = '#fff'; x.beginPath(); x.arc(p.x, p.y, 2.5, 0, 6.283); x.fill(); return true;
        }
        if (p.life <= 0 || p.y > this.h + 40) return false;
        x.globalAlpha = Math.max(0, Math.min(1, p.life / (p.max * .4)));
        if (p.k === 'emoji') { x.font = p.s + 'px serif'; x.fillText(p.e, p.x, p.y); }
        else if (p.k === 'spark') { x.fillStyle = p.c; x.beginPath(); x.arc(p.x, p.y, p.s, 0, 6.283); x.fill(); }
        else { p.r += p.vr * dt; x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c; x.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); x.restore(); }
        return true;
      });
      x.globalAlpha = 1;
      if (this.p.length) requestAnimationFrame(t2 => this.loop(t2)); else { this.run = false; x.clearRect(0, 0, this.w, this.h); }
    }
  }
  const fx = new FX($('#fx')), fxFinal = new FX($('#fxFinal'));

  const confetti = (x, y, n = 90, f = fx) => {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + rnd(-1.1, 1.1), s = rnd(200, 620);
      f.add({ k: 'rect', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 900, life: rnd(2, 3.4), max: 3.4, c: pick(COLORS), s: rnd(8, 14), r: rnd(0, 6), vr: rnd(-12, 12) });
    }
  };
  const confettiAt = el => { const r = el.getBoundingClientRect(); confetti(r.left + r.width / 2, r.top + r.height / 2); A.pop(); };
  const rain = (emojis, n = 36, f = fx) => {
    for (let i = 0; i < n; i++)
      setTimeout(() => f.add({ k: 'emoji', e: pick(emojis), x: rnd(10, innerWidth - 30), y: -30, vx: rnd(-30, 30), vy: rnd(120, 260), g: 20, life: 6, max: 6, s: rnd(22, 38) }), i * 60);
  };
  const fireworks = (n = 4, f = fx) => {
    for (let i = 0; i < n; i++) setTimeout(() => {
      const w = f.w || innerWidth, h = f.h || innerHeight;
      f.add({ k: 'rocket', x: rnd(w * .15, w * .85), y: h, vx: rnd(-30, 30), vy: -rnd(520, 720), g: 360, life: 3, max: 3 });
    }, i * 450);
  };
  const balloons = (n = 10) => {
    if (RM) return;
    const box = $('#balloons');
    for (let i = 0; i < n; i++) setTimeout(() => {
      const b = document.createElement('div'), d = rnd(9, 16);
      b.className = 'balloon';
      b.style.cssText = `left:${rnd(2, 92)}%;--c:${pick(COLORS.slice(0, 6))};--d:${d}s;--sway:${rnd(-50, 50)}px`;
      b.addEventListener('animationend', () => b.remove());
      box.appendChild(b);
    }, i * 250);
  };

  /* ---------- Mensagens ---------- */
  const SURPRISES = ['Você é demais, Luci! 🌟', 'Hoje o bolo é todo seu! 🍰', 'Pode pedir música, hoje você manda! 🎶', 'Parabéns, primo! A família toda está torcendo por você! ❤️', 'Surpresa! Mais um ano de pura lenda! 🏆', 'Guarda esse sorriso, ele combina com festa! 😄'];
  const RANDOM = ['Hoje o bolo é todo seu, sem dividir! 🎂', 'Mais um ano de experiência desbloqueado! 🎮', 'Que a sua vida seja uma festa que nunca acaba! 🎉', 'Você não está envelhecendo, está ficando premium! 💎', 'Nada de dieta hoje, ordens do aniversariante! 🍰', 'Que venham muitas risadas e histórias novas! 😂', 'Sorria: hoje o universo inteiro está de parabéns pra você! ✨', 'Tamo junto sempre, primo! 🤝'];

  /* ---------- Palavras aparecendo aos poucos ---------- */
  $$('[data-words]').forEach(p => {
    const words = p.textContent.trim().split(/\s+/);
    p.textContent = '';
    words.forEach((w, i) => {
      const s = document.createElement('span');
      s.className = 'w'; s.style.setProperty('--i', i); s.textContent = w;
      p.append(s, ' ');
    });
    p.classList.add('ready');
  });

  /* ---------- Revelar ao rolar ---------- */
  const watch = (els, cb, th = .2) => {
    if (!('IntersectionObserver' in window)) return els.forEach(e => cb(e, true));
    const io = new IntersectionObserver(es => es.forEach(e => cb(e.target, e.isIntersecting, io)), { threshold: th });
    els.forEach(e => io.observe(e));
  };
  watch($$('.reveal, .words'), (el, vis, io) => { if (vis) { el.classList.add('in'); io && io.unobserve(el); } }, .15);

  /* ---------- Progresso e parallax ---------- */
  const bar = $('#progressBar'), prog = $('#progress'), deco = $$('[data-parallax]');
  let tick = false;
  const onScroll = () => {
    if (tick) return; tick = true;
    requestAnimationFrame(() => {
      const max = document.documentElement.scrollHeight - innerHeight;
      const pct = max > 0 ? Math.min(100, Math.round(scrollY / max * 100)) : 0;
      bar.style.width = pct + '%'; prog.setAttribute('aria-valuenow', pct);
      if (!RM) deco.forEach(d => { const r = d.parentElement.getBoundingClientRect(); d.style.transform = `translateY(${(r.top + r.height / 2 - innerHeight / 2) * -d.dataset.parallax}px)`; });
      tick = false;
    });
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Menu ---------- */
  const btnMenu = $('#btnMenu'), menu = $('#menu');
  const setMenu = open => { menu.classList.toggle('open', open); btnMenu.setAttribute('aria-expanded', open); btnMenu.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu'); };
  btnMenu.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
  menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  /* ---------- Entrada (cortinas) ---------- */
  $('#btnEntrar').addEventListener('click', () => {
    A.init(); A.fanfare();
    intro.classList.add('closing');
    wait(() => {
      festa.hidden = false; body.classList.remove('no-scroll'); $('#soundControls').hidden = false;
      scrollTo(0, 0);
      intro.classList.replace('closing', 'opening'); intro.inert = true; intro.setAttribute('aria-hidden', 'true');
      confetti(innerWidth * .2, innerHeight * .9, 80); confetti(innerWidth * .8, innerHeight * .9, 80);
      balloons(8); onScroll();
      setTimeout(() => $('#parabens h2').setAttribute('tabindex', '-1'), 0);
    }, 1400);
  });

  /* ---------- Botões da seção Parabéns ---------- */
  $$('[data-action]').forEach(b => b.addEventListener('click', () => {
    A.init();
    const a = b.dataset.action, msg = $('#surpriseMsg');
    if (a === 'confetti') confettiAt(b);
    if (a === 'surprise') { say(msg, pick(SURPRISES)); A.ding(); confettiAt(b); }
    if (a === 'shine') { say(msg, 'Você brilha demais! ✨'); rain(['✨', '⭐', '🌟'], 30); A.ding(); }
  }));

  /* ---------- Foto interativa ---------- */
  const frame = $('#photoFrame'), img = $('#lucieudoImg'), fb = $('#photoFallback');
  const showFb = () => { fb.hidden = false; img.hidden = true; };
  if (img.complete && !img.naturalWidth) showFb();
  img.addEventListener('error', showFb);
  const tilt = e => {
    const r = frame.getBoundingClientRect();
    frame.style.setProperty('--rx', ((e.clientX - r.left) / r.width - .5) * 18 + 'deg');
    frame.style.setProperty('--ry', -((e.clientY - r.top) / r.height - .5) * 18 + 'deg');
  };
  const untilt = () => { frame.style.setProperty('--rx', '0deg'); frame.style.setProperty('--ry', '0deg'); };
  if (!RM) { frame.addEventListener('pointermove', tilt); frame.addEventListener('pointerleave', untilt); frame.addEventListener('pointerup', untilt); frame.addEventListener('pointercancel', untilt); }
  frame.addEventListener('click', () => { A.init(); A.pop(); A.ding(); rain(['💖', '⭐', '💛', '✨', '❤️'], 40); });

  /* ---------- Alex ---------- */
  const alexCard = $('#alexCard'), alexMsg = $('#alexMsg');
  alexCard.addEventListener('click', () => {
    const open = alexMsg.hidden;
    alexMsg.hidden = !open; alexCard.classList.toggle('open', open); alexCard.setAttribute('aria-expanded', open);
    if (open) { A.init(); A.ding(); confettiAt(alexCard); }
  });

  /* ---------- Bolo ---------- */
  const btnVelas = $('#btnVelas'), veil = $('#darkVeil'), wish = $('#wishMsg');
  let blown = false, busy = false;
  btnVelas.addEventListener('click', () => {
    if (busy) return; A.init();
    const candles = $$('.candle');
    if (blown) {
      candles.forEach(c => c.classList.remove('out'));
      blown = false; wish.textContent = ''; btnVelas.textContent = 'APAGAR AS VELINHAS! 💨'; A.ding(); return;
    }
    busy = true;
    candles.forEach((c, i) => setTimeout(() => { c.classList.add('out'); A.blow(); }, RM ? 0 : i * 260));
    wait(() => {
      veil.classList.add('on'); say(wish, 'Pedido feito! Que ele se realize, Luci! 🌟');
      setTimeout(() => {
        veil.classList.remove('on'); fireworks(3); confettiAt(btnVelas); A.fanfare();
        blown = true; busy = false; btnVelas.textContent = 'ACENDER DE NOVO 🕯️';
      }, RM ? 0 : 1800);
    }, candles.length * 260 + 300);
  });

  /* ---------- Presentes ---------- */
  const gifts = $$('.gift'), counter = $('#giftCounter');
  gifts.forEach(g => {
    const btn = $('.gift-btn', g), msg = $('.gift-msg', g), name = $('.gift-title', g).textContent;
    btn.addEventListener('click', () => {
      A.init();
      const open = msg.hidden;
      msg.hidden = !open; g.classList.toggle('open', open); btn.setAttribute('aria-expanded', open);
      btn.setAttribute('aria-label', (open ? 'Fechar presente: ' : 'Abrir presente: ') + name);
      const n = gifts.filter(x => x.classList.contains('open')).length;
      counter.textContent = n === gifts.length ? 'Todos os presentes abertos! 🎉' : `${n} de ${gifts.length} presentes abertos`;
      if (open) { A.ding(); confettiAt(btn); if (n === gifts.length) { fireworks(3); A.fanfare(); } }
    });
  });

  /* ---------- Carta ---------- */
  const btnCarta = $('#btnCarta'), letter = $('#letter'), env = $('#envelope'), lt = $('#letterText'), secLetter = $('#carta');
  let letterTimers = [];
  const closeLetter = () => {
    letterTimers.forEach(clearTimeout); letterTimers = [];
    letter.hidden = true; env.classList.remove('open'); secLetter.classList.remove('sparkle');
    lt.classList.remove('typing'); $$('p', lt).forEach(p => p.classList.remove('show'));
    btnCarta.setAttribute('aria-expanded', 'false'); btnCarta.textContent = 'ABRIR MINHA CARTA';
  };
  btnCarta.addEventListener('click', () => {
    A.init();
    if (btnCarta.getAttribute('aria-expanded') === 'true') return closeLetter();
    btnCarta.setAttribute('aria-expanded', 'true'); btnCarta.textContent = 'FECHAR A CARTA';
    env.classList.add('open'); secLetter.classList.add('sparkle'); A.ding();
    letterTimers.push(setTimeout(() => {
      letter.hidden = false;
      if (!RM) {
        lt.classList.add('typing');
        $$('p', lt).forEach((p, i) => { p.style.transition = 'opacity .7s'; letterTimers.push(setTimeout(() => p.classList.add('show'), 600 + i * 1100)); });
      }
      letter.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'center' });
    }, RM ? 0 : 900));
  });

  /* ---------- Festa de verdade ---------- */
  const rm = $('#randomMsg');
  $$('[data-party]').forEach(b => b.addEventListener('click', () => {
    A.init();
    switch (b.dataset.party) {
      case 'confetti': confettiAt(b); confetti(innerWidth / 2, innerHeight * .8, 100); break;
      case 'balloons': balloons(14); A.pop(); break;
      case 'hearts': rain(['💖', '💗', '💕', '❤️', '💘'], 40); A.ding(); break;
      case 'theme': body.dataset.theme = (+body.dataset.theme + 1) % 4; A.ding(); break;
      case 'fireworks': fireworks(5); break;
      case 'message': say(rm, pick(RANDOM)); A.pop(); break;
    }
  }));

  /* ---------- Final: fogos ao chegar + repetir ---------- */
  let finalTimer;
  watch([$('#final')], (_, vis) => {
    clearInterval(finalTimer);
    if (vis && !RM) { fireworks(2, fxFinal); finalTimer = setInterval(() => fireworks(1, fxFinal), 2200); }
  }, .35);

  $('#btnRepetir').addEventListener('click', () => {
    closeLetter();
    gifts.forEach(g => { g.classList.remove('open'); $('.gift-msg', g).hidden = true; $('.gift-btn', g).setAttribute('aria-expanded', 'false'); });
    counter.textContent = `0 de ${gifts.length} presentes abertos`;
    alexMsg.hidden = true; alexCard.classList.remove('open'); alexCard.setAttribute('aria-expanded', 'false');
    $$('.candle').forEach(c => c.classList.remove('out')); blown = false; busy = false; wish.textContent = ''; btnVelas.textContent = 'APAGAR AS VELINHAS! 💨';
    $('#surpriseMsg').textContent = ''; rm.textContent = 'Aperte o botão de mensagem e receba um recado!';
    body.dataset.theme = '0'; bgm.pause(); btnMusic.setAttribute('aria-pressed', 'false');
    clearInterval(finalTimer); setMenu(false);
    scrollTo({ top: 0, behavior: 'auto' });
    festa.hidden = true; $('#soundControls').hidden = true; body.classList.add('no-scroll');
    intro.classList.remove('opening'); intro.inert = false; intro.removeAttribute('aria-hidden');
    $('#btnEntrar').focus({ preventScroll: true });
  });
})();
