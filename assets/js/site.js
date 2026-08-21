/* Gervásio Mármores e Granitos — interações e a pedra gerada em canvas */
(() => {
  'use strict';
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const menos = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ===================== WhatsApp =====================
     O número mora aqui, num lugar só. Todo CTA com [data-wa] passa por
     obrigado.html, que dispara a conversão e só então abre a conversa. */
  const NUM = '5531972400514';
  const MSG = 'Olá! Vim pelo site da Gervásio e quero falar sobre pedra para o meu projeto.';
  const destino = 'obrigado.html?n=' + NUM + '&t=' + encodeURIComponent(MSG);
  $$('[data-wa]').forEach(a => a.setAttribute('href', destino));

  /* ===================== nav =====================
     Sentinela em vez de ler scrollY a cada evento: o mesmo resultado sem
     forçar layout na thread principal a cada rolagem. */
  const nav = $('#nav');
  const sentinela = document.createElement('div');
  sentinela.setAttribute('aria-hidden', 'true');
  sentinela.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:28px;pointer-events:none';
  document.body.prepend(sentinela);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => nav.toggleAttribute('data-fixa', !e.isIntersecting),
      { threshold: 0 }).observe(sentinela);
  } else {
    nav.setAttribute('data-fixa', '');
  }

  /* ===================== gaveta do celular ===================== */
  const burger = $('#burger'), gaveta = $('#gaveta');
  const abrir = (v) => {
    gaveta.toggleAttribute('data-aberta', v);
    gaveta.setAttribute('aria-hidden', String(!v));   // sem isto o menu abre mas some pro leitor de tela
    burger.setAttribute('aria-expanded', String(v));
    burger.setAttribute('aria-label', v ? 'Fechar menu' : 'Abrir menu');
    document.body.classList.toggle('travado', v);
  };
  burger.addEventListener('click', () => abrir(!gaveta.hasAttribute('data-aberta')));
  gaveta.addEventListener('click', (e) => { if (e.target.closest('a')) abrir(false); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') abrir(false); });

  /* ===================== revelação ===================== */
  const alvos = $$('[data-sobe]');
  if (menos || !('IntersectionObserver' in window)) {
    alvos.forEach(el => el.classList.add('dentro'));
  } else {
    const io = new IntersectionObserver((ents, obs) => {
      ents.forEach(e => { if (e.isIntersecting) { e.target.classList.add('dentro'); obs.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.06 });
    alvos.forEach(el => io.observe(el));
  }

  /* ===================== fita =====================
     cloneNode e não innerHTML += innerHTML: reescrever o HTML recria todos
     os nós e cancela os downloads em curso. */
  const fita = $('#fita');
  if (fita) {
    const orig = Array.from(fita.children);
    orig.forEach(li => fita.appendChild(li.cloneNode(true)));
  }

  const ano = $('#ano');
  if (ano) ano.textContent = new Date().getFullYear();

  /* =====================================================================
     A PEDRA
     A superfície é gerada, não fotografada: um bloco de mármore verde com
     veios brancos e fios dourados, e pulsos de luz que percorrem esses
     mesmos veios. A textura é pintada uma vez; só os pulsos redesenham.
     ===================================================================== */
  const tela = $('#telaPedra'), luz = $('#telaLuz');
  if (!tela || !luz) return;

  const bx = tela.getContext('2d', { alpha: false });
  const gx = luz.getContext('2d');
  let W = 0, H = 0, DPR = 1, principais = [], finos = [], todos = [], pulsos = [], rodando = false, visivel = false;

  /* ruído: mesma semente a cada carga daria sempre a mesma pedra, e a
     seção promete o contrário, então a semente vem do relógio */
  let semente = (Date.now() % 100000) + 7;
  const rnd = () => (semente = (semente * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const perm = new Uint8Array(512);
  (() => {
    const p = [...Array(256).keys()];
    for (let i = 255; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; [p[i], p[j]] = [p[j], p[i]]; }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  })();
  const suav = t => t * t * t * (t * (t * 6 - 15) + 10);
  const mist = (a, b, t) => a + (b - a) * t;
  const incl = (h, x, y) => ((h & 1) ? x : -x) + ((h & 2) ? y : -y);
  function ruido(x, y) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    x -= Math.floor(x); y -= Math.floor(y);
    const u = suav(x), v = suav(y), A = perm[X] + Y, B = perm[X + 1] + Y;
    return mist(mist(incl(perm[A], x, y), incl(perm[B], x - 1, y), u),
                mist(incl(perm[A + 1], x, y - 1), incl(perm[B + 1], x - 1, y - 1), u), v);
  }
  function fbm(x, y, oct) { let s = 0, a = .5, f = 1; for (let i = 0; i < oct; i++) { s += a * ruido(x * f, y * f); f *= 2; a *= .5; } return s; }
  function cristal(x, y, oct) { let s = 0, a = .5, f = 1; for (let i = 0; i < oct; i++) { s += a * (1 - Math.abs(ruido(x * f, y * f))); f *= 2.1; a *= .5; } return s; }

  const DIR = -Math.PI * 0.34;
  function tracar(x, y, ang, esp, prof, destino) {
    const pts = [{ x, y }];
    const passo = Math.max(W, H) * 0.011;
    const max = prof === 0 ? 300 : 70 - prof * 16;
    for (let i = 0; i < max; i++) {
      const n = fbm(x * 0.0011, y * 0.0011, 3);
      ang += n * 0.20 + (rnd() - .5) * 0.06 + (DIR - ang) * 0.030;  // volta pra diagonal: veio não faz laço
      x += Math.cos(ang) * passo; y += Math.sin(ang) * passo;
      pts.push({ x, y });
      if (x < -W * .15 || x > W * 1.15 || y < -H * .15 || y > H * 1.15) break;
      if (prof < 2 && i > 18 && rnd() < 0.040) {
        tracar(x, y, ang + (rnd() < .5 ? -1 : 1) * (0.55 + rnd() * 0.5), esp * 0.5, prof + 1, finos);
      }
    }
    if (pts.length > 6) destino.push({ pts, esp, comp: pts.length });
  }
  function gerarVeios() {
    principais = []; finos = [];
    for (let i = 0; i < 5; i++) {
      const t = (i + .5) / 5;
      tracar(-W * .35 + W * 1.5 * t + (rnd() - .5) * W * .10, H * (1.10 + rnd() * .12),
             DIR + (rnd() - .5) * .34, .72 + rnd() * .5, 0, principais);
    }
    for (let i = 0; i < 2; i++) {   // entram pela direita e cortam o topo
      tracar(W * (1.06 + rnd() * .1), H * (.30 + rnd() * .5), -Math.PI * .80 + (rnd() - .5) * .3, .6, 0, principais);
    }
    for (let i = 0; i < 9; i++) {   // a rede fina, dourada
      tracar(rnd() * W * 1.3 - W * .15, H * (.15 + rnd() * 1.0), DIR + (rnd() - .5) * 1.0, .30, 1, finos);
    }
    todos = principais.concat(finos);
  }

  /* rampa amostrada de uma chapa de mármore verde: o contraste entre o
     quase-preto e o verde acinzentado é o que faz ler como pedra */
  const RAMPA = [[8, 24, 22], [11, 34, 34], [3, 64, 55], [42, 88, 76], [120, 150, 138]];
  function corPedra(t) {
    const s = Math.max(0, Math.min(.9999, t)) * (RAMPA.length - 1);
    const i = s | 0, f = s - i, a = RAMPA[i], b = RAMPA[i + 1] || a;
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
  }
  function pintarPedra() {
    /* gerada em 1/3 da resolução e escalada: a textura é difusa, e pixel a
       pixel em resolução cheia custava 800ms de thread travada */
    const ESC = 3;
    const PW = Math.max(2, Math.ceil(tela.width / ESC)), PH = Math.max(2, Math.ceil(tela.height / ESC));
    const off = document.createElement('canvas'); off.width = PW; off.height = PH;
    const ox = off.getContext('2d');
    const img = ox.createImageData(PW, PH), d = img.data;
    const esc = 1.9 / Math.max(PW, PH);
    for (let y = 0; y < PH; y++) {
      for (let x = 0; x < PW; x++) {
        const wx = fbm(x * esc + 5.2, y * esc + 1.3, 4), wy = fbm(x * esc - 3.1, y * esc + 8.7, 4);
        const v = fbm(x * esc + wx * 2.6, y * esc + wy * 2.6, 5);
        const cr = cristal(x * esc * 2.8 + 11, y * esc * 2.8 - 4, 3);
        let t = (v + 1) * .5;
        t = (t - .5) * 1.55 + .42;
        t = Math.max(0, Math.min(1, t + (cr - .58) * .30));
        const c = corPedra(t), i = (y * PW + x) * 4;
        d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
      }
    }
    ox.putImageData(img, 0, 0);
    bx.setTransform(1, 0, 0, 1, 0, 0);
    bx.imageSmoothingEnabled = true; bx.imageSmoothingQuality = 'high';
    bx.drawImage(off, 0, 0, tela.width, tela.height);

    bx.setTransform(DPR, 0, 0, DPR, 0, 0);
    bx.globalCompositeOperation = 'lighter';
    bx.lineCap = 'round'; bx.lineJoin = 'round';
    const risca = (v, larg, cor, alfa) => {
      bx.beginPath(); bx.moveTo(v.pts[0].x, v.pts[0].y);
      for (let i = 1; i < v.pts.length; i++) bx.lineTo(v.pts[i].x, v.pts[i].y);
      bx.strokeStyle = 'rgba(' + cor + ',' + alfa + ')'; bx.lineWidth = larg; bx.stroke();
    };
    for (const v of principais) {
      risca(v, v.esp * 22, '208,228,214', .038);
      risca(v, v.esp * 9,  '232,244,236', .075);
      risca(v, v.esp * 3.4,'248,252,248', .15);
      risca(v, v.esp * 1.2,'255,255,255', .34);
    }
    for (const v of finos) {
      risca(v, v.esp * 8,  '190,158,88',  .045);
      risca(v, v.esp * 2.6,'222,190,116', .11);
      risca(v, v.esp * 0.9,'246,224,162', .28);
    }
    bx.globalCompositeOperation = 'source-over';
  }

  function semearPulsos() {
    pulsos = [];
    if (!todos.length) return;
    const n = Math.min(20, Math.max(7, Math.round(W * H / 76000)));
    for (let i = 0; i < n; i++) {
      const v = todos[(rnd() * todos.length) | 0];
      pulsos.push({ v, t: rnd() * v.comp, vel: .32 + rnd() * .5, cauda: 20 + rnd() * 30 });
    }
  }

  let ultimo = 0;
  function quadro(ts) {
    if (!rodando) return;
    const dt = Math.min(50, ts - ultimo); ultimo = ts;
    gx.setTransform(DPR, 0, 0, DPR, 0, 0);
    gx.clearRect(0, 0, W, H);
    gx.globalCompositeOperation = 'lighter';
    gx.lineCap = 'round'; gx.lineJoin = 'round';
    for (const p of pulsos) {
      p.t += p.vel * (dt / 16.67);
      if (p.t > p.v.comp + p.cauda) {
        p.v = todos[(rnd() * todos.length) | 0]; p.t = -p.cauda * rnd(); p.vel = .32 + rnd() * .5;
      }
      const pts = p.v.pts;
      const ini = Math.max(0, Math.floor(p.t - p.cauda)), fim = Math.min(pts.length - 1, Math.floor(p.t));
      if (fim <= ini) continue;
      for (let i = ini; i < fim; i++) {
        const f = (i - ini) / (fim - ini), a = Math.pow(f, 2.4);
        gx.beginPath(); gx.moveTo(pts[i].x, pts[i].y); gx.lineTo(pts[i + 1].x, pts[i + 1].y);
        gx.strokeStyle = 'rgba(226,246,214,' + (a * .5) + ')';
        gx.lineWidth = p.v.esp * 2.6 * (.3 + f); gx.stroke();
        if (f > .6) {
          gx.beginPath(); gx.moveTo(pts[i].x, pts[i].y); gx.lineTo(pts[i + 1].x, pts[i + 1].y);
          gx.strokeStyle = 'rgba(255,255,246,' + ((f - .6) * 2.2 * .85) + ')';
          gx.lineWidth = p.v.esp * 1.05 * f; gx.stroke();
        }
      }
      const c = pts[fim];
      if (c) {
        const R = 22 * p.v.esp + 8;
        const g = gx.createRadialGradient(c.x, c.y, 0, c.x, c.y, R);
        g.addColorStop(0, 'rgba(255,255,250,.7)');
        g.addColorStop(.34, 'rgba(198,244,206,.24)');
        g.addColorStop(1, 'rgba(110,220,160,0)');
        gx.fillStyle = g; gx.beginPath(); gx.arc(c.x, c.y, R, 0, Math.PI * 2); gx.fill();
      }
    }
    gx.globalCompositeOperation = 'source-over';
    requestAnimationFrame(quadro);
  }
  const ligar  = () => { if (!rodando && visivel && !document.hidden && !menos) { rodando = true; requestAnimationFrame(t => { ultimo = t; quadro(t); }); } };
  const parar  = () => { rodando = false; };

  function montar() {
    const cx = tela.parentElement.getBoundingClientRect();
    W = Math.round(cx.width); H = Math.round(cx.height);
    if (W < 2 || H < 2) return;
    DPR = Math.min(2, devicePixelRatio || 1);
    for (const c of [tela, luz]) { c.width = Math.round(W * DPR); c.height = Math.round(H * DPR); }
    gerarVeios(); pintarPedra(); semearPulsos();
  }

  /* só monta quando a seção chega perto: a pedra não pesa no carregamento */
  let montada = false;
  const secao = $('#pedraviva');
  const aoAparecer = (ent) => {
    visivel = ent.isIntersecting;
    if (visivel && !montada) { montada = true; montar(); }
    visivel ? ligar() : parar();
  };
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => aoAparecer(e), { rootMargin: '250px', threshold: 0 }).observe(secao);
  } else {
    montada = true; visivel = true; montar(); ligar();
  }
  document.addEventListener('visibilitychange', () => document.hidden ? parar() : ligar());

  let tmr;
  addEventListener('resize', () => {
    if (!montada) return;
    clearTimeout(tmr);
    tmr = setTimeout(() => {
      const cx = tela.parentElement.getBoundingClientRect();
      if (Math.abs(Math.round(cx.width) - W) < 2) return;   // só a barra do navegador mudou de altura
      montar();
    }, 260);
  });
})();
