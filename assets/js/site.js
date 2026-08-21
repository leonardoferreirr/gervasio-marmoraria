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
     Sentinela em vez de ler scrollY a cada evento: mesmo resultado sem
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
    // a gaveta é clara: com a barra ainda sobre o hero escuro, o traço do
    // botão ficaria branco sobre branco
    nav.toggleAttribute('data-claro', v);
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

  /* ===================== fita e colunas do hero =====================
     cloneNode e não innerHTML += innerHTML: reescrever o HTML recria todos
     os nós e cancela os downloads em curso. */
  const duplicar = (el) => { if (el) Array.from(el.children).forEach(f => el.appendChild(f.cloneNode(true))); };
  duplicar($('#fita'));
  duplicar($('#colA'));
  duplicar($('#colB'));

  const ano = $('#ano');
  if (ano) ano.textContent = new Date().getFullYear();

  /* ===================== carrossel de trabalhos ===================== */
  const pista = $('#pista'), ant = $('#carAnt'), prox = $('#carProx');
  if (pista && ant && prox) {
    const passo = () => {
      const c = pista.querySelector('.card');
      return c ? c.getBoundingClientRect().width + 14 : 300;
    };
    const estado = () => {
      const fim = pista.scrollWidth - pista.clientWidth - 2;
      ant.disabled = pista.scrollLeft <= 2;
      prox.disabled = pista.scrollLeft >= fim;
    };
    ant.addEventListener('click', () => pista.scrollBy({ left: -passo() * 2, behavior: 'smooth' }));
    prox.addEventListener('click', () => pista.scrollBy({ left: passo() * 2, behavior: 'smooth' }));
    pista.addEventListener('scroll', estado, { passive: true });
    addEventListener('resize', estado);
    estado();
  }

  /* =====================================================================
     A PEDRA DO HERO
     A superfície é gerada, não fotografada: mármore verde com veios que
     ramificam como trovão, e pulsos de luz percorrendo esses mesmos veios.
     A textura é pintada uma vez; só os pulsos redesenham a cada quadro.
     ===================================================================== */
  const tela = $('#telaPedra'), luz = $('#telaLuz');
  if (!tela || !luz) return;

  const bx = tela.getContext('2d', { alpha: false });
  const gx = luz.getContext('2d');
  let W = 0, H = 0, DPR = 1, ramos = [], pulsos = [], rodando = false, visivel = false;

  /* mesma semente a cada carga daria sempre a mesma pedra, e a promessa da
     casa é que nenhuma chapa se repete */
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
  function fbm(x, y, o) { let s = 0, a = .5, f = 1; for (let i = 0; i < o; i++) { s += a * ruido(x * f, y * f); f *= 2; a *= .5; } return s; }
  function cristal(x, y, o) { let s = 0, a = .5, f = 1; for (let i = 0; i < o; i++) { s += a * (1 - Math.abs(ruido(x * f, y * f))); f *= 2.1; a *= .5; } return s; }

  /* ---------------------------------------------------------------
     TROVÃO: o segmento é subdividido e o ponto médio deslocado na
     perpendicular, geração após geração. É esse deslocamento que dá a
     quebra angular do raio; caminhar com ruído suave, como na primeira
     versão, produzia fio de cabelo, não veio de pedra.
     --------------------------------------------------------------- */
  function trovao(ax, ay, bx2, by2, esp, geracoes, dest, prof, classe) {
    let segs = [[{ x: ax, y: ay }, { x: bx2, y: by2 }]];
    let desl = Math.hypot(bx2 - ax, by2 - ay) * 0.16;
    const filhos = [];
    for (let g = 0; g < geracoes; g++) {
      const novos = [];
      for (const [p1, p2] of segs) {
        const vx = p2.x - p1.x, vy = p2.y - p1.y;
        const len = Math.hypot(vx, vy) || 1;
        const off = (rnd() - .5) * 2 * desl;
        const m = { x: (p1.x + p2.x) / 2 + (-vy / len) * off, y: (p1.y + p2.y) / 2 + (vx / len) * off };
        novos.push([p1, m], [m, p2]);
        // o ramo sai do meio num ângulo agudo e morre bem antes do tronco
        if (prof < 2 && g >= 1 && rnd() < 0.34) {
          const ang = Math.atan2(vy, vx) + (rnd() < .5 ? -1 : 1) * (0.38 + rnd() * 0.55);
          const c = len * (0.55 + rnd() * 0.85);
          filhos.push({ x1: m.x, y1: m.y, x2: m.x + Math.cos(ang) * c, y2: m.y + Math.sin(ang) * c,
                        esp: esp * (0.42 + rnd() * 0.2) });
        }
      }
      segs = novos; desl *= 0.56;
    }
    const pts = [segs[0][0]];
    for (const [, p2] of segs) pts.push(p2);
    dest.push({ pts, esp, comp: pts.length, prof, classe });
    for (const f of filhos) trovao(f.x1, f.y1, f.x2, f.y2, f.esp, Math.max(3, geracoes - 2), dest, prof + 1, classe);
  }

  function gerarVeios() {
    ramos = [];
    const D = Math.hypot(W, H), CX = W / 2, CY = H / 2;
    /* Três castas, como numa chapa de verdade: veios mestres que atravessam
       a peça, alguns médios e uma teia de rachaduras finas. Todos na mesma
       espessura davam aspecto de nervura.

       Origem aleatória deixava metade da tela vazia, porque vários raios
       nasciam e morriam fora do quadro. Cada casta é distribuída ao longo do
       eixo perpendicular à direção dominante: a cobertura fica garantida e o
       acaso fica no jitter, não em existir ou não. */
    const CASTAS = [
      { n: 4,  porte: 1.30, esp: [1.5, 0.9],  ger: 6, classe: 'mestre', desvio: 0.42, jit: 0.55 },
      { n: 7,  porte: 0.62, esp: [0.62, 0.4], ger: 5, classe: 'medio',  desvio: 0.95, jit: 0.85 },
      { n: 11, porte: 0.30, esp: [0.26, 0.2], ger: 4, classe: 'fino',   desvio: 1.7,  jit: 1.1 },
    ];
    const BASE = -Math.PI * 0.34;
    for (const c of CASTAS) {
      for (let i = 0; i < c.n; i++) {
        const ang = BASE + (rnd() - .5) * c.desvio;
        const dx = Math.cos(ang), dy = Math.sin(ang);
        const px = -dy, py = dx;
        const faixa = ((i + 0.5) / c.n - 0.5) + (rnd() - .5) * (c.jit / c.n);
        const off = faixa * (W + H) * 0.78;
        const meio = D * c.porte * 0.5;
        trovao(CX + px * off - dx * meio, CY + py * off - dy * meio,
               CX + px * off + dx * meio, CY + py * off + dy * meio,
               c.esp[0] + rnd() * c.esp[1], c.ger, ramos, 0, c.classe);
      }
    }
    /* o dourado da chapa não é um veio próprio: ele acompanha a borda do
       veio branco, e por isso aqui é uma cópia deslocada, não um traçado */
    ramos.forEach((r, i) => {
      r.ouro = r.classe === 'fino' ? (i % 3 === 0) : false;
      r.temOuro = r.classe !== 'fino' && (i % 2 === 0);
    });
  }

  /* rampa amostrada de uma chapa de mármore verde: é o contraste entre o
     quase-preto e o verde acinzentado que faz ler como pedra */
  const RAMPA = [[8, 24, 22], [11, 34, 34], [3, 64, 55], [42, 88, 76], [120, 150, 138]];
  function corPedra(t) {
    const s = Math.max(0, Math.min(.9999, t)) * (RAMPA.length - 1);
    const i = s | 0, f = s - i, a = RAMPA[i], b = RAMPA[i + 1] || a;
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
  }

  /* Gerar tudo de uma vez custava uma tarefa única de 698ms na thread
     principal, e o Lighthouse conta isso inteiro como bloqueio. O trabalho
     é o mesmo, só que devolvido ao navegador em fatias: nenhuma passa de
     poucos milissegundos, e o fundo verde sólido cobre enquanto isso. */
  const ceder = () => new Promise(r => setTimeout(r, 0));

  async function pintarPedra() {
    /* gerada em fração da resolução e escalada: a textura é difusa, e pixel
       a pixel em resolução cheia custava 800ms de thread travada */
    const ESC = W < 700 ? 4 : 3;
    const PW = Math.max(2, Math.ceil(tela.width / ESC)), PH = Math.max(2, Math.ceil(tela.height / ESC));
    const off = document.createElement('canvas'); off.width = PW; off.height = PH;
    const ox = off.getContext('2d');
    const img = ox.createImageData(PW, PH), d = img.data;
    const esc = 1.9 / Math.max(PW, PH);
    const FAIXA = Math.max(24, Math.ceil(PH / 12));
    for (let y0 = 0; y0 < PH; y0 += FAIXA) {
      const ate = Math.min(PH, y0 + FAIXA);
      for (let y = y0; y < ate; y++) {
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
      if (ate < PH) await ceder();
    }
    ox.putImageData(img, 0, 0);
    bx.setTransform(1, 0, 0, 1, 0, 0);
    bx.imageSmoothingEnabled = true; bx.imageSmoothingQuality = 'high';
    bx.drawImage(off, 0, 0, tela.width, tela.height);

    bx.setTransform(DPR, 0, 0, DPR, 0, 0);
    bx.globalCompositeOperation = 'lighter';
    bx.lineCap = 'round'; bx.lineJoin = 'round';
    const risca = (r, l, cor, a) => {
      bx.beginPath(); bx.moveTo(r.pts[0].x, r.pts[0].y);
      for (let i = 1; i < r.pts.length; i++) bx.lineTo(r.pts[i].x, r.pts[i].y);
      bx.strokeStyle = 'rgba(' + cor + ',' + a + ')'; bx.lineWidth = l; bx.stroke();
    };
    // o dourado sai deslocado na perpendicular, como na borda do veio real
    const riscaDesl = (r, l, cor, a, dist) => {
      bx.beginPath();
      for (let i = 0; i < r.pts.length; i++) {
        const p1 = r.pts[i], p0 = r.pts[i - 1] || r.pts[i + 1] || p1;
        const vx = p1.x - p0.x, vy = p1.y - p0.y, m = Math.hypot(vx, vy) || 1;
        const x = p1.x + (-vy / m) * dist, y = p1.y + (vx / m) * dist;
        i ? bx.lineTo(x, y) : bx.moveTo(x, y);
      }
      bx.strokeStyle = 'rgba(' + cor + ',' + a + ')'; bx.lineWidth = l; bx.stroke();
    };
    let desenhados = 0;
    for (const r of ramos) {
      if (++desenhados % 120 === 0) await ceder();
      if (r.classe === 'fino') {
        if (r.ouro) { risca(r, r.esp * 3, '214,182,110', .13); risca(r, r.esp * 1.0, '244,222,158', .30); }
        else        { risca(r, r.esp * 4, '214,234,220', .06); risca(r, r.esp * 1.0, '238,248,240', .26); }
        continue;
      }
      const mestre = r.classe === 'mestre';
      risca(r, r.esp * (mestre ? 15 : 11), '186,214,196', mestre ? .05 : .035);   // aura difusa
      risca(r, r.esp * (mestre ? 6.5 : 5), '222,238,228', mestre ? .10 : .075);
      risca(r, r.esp * (mestre ? 2.8 : 2.2), '242,249,244', mestre ? .26 : .17);  // corpo
      risca(r, r.esp * (mestre ? 1.1 : 0.9), '253,255,252', mestre ? .50 : .34);  // núcleo
      if (r.temOuro) {
        const dist = r.esp * (mestre ? 2.0 : 1.6);
        riscaDesl(r, r.esp * 1.5, '206,170,96', .20, dist);
        riscaDesl(r, r.esp * 0.7, '244,220,150', .42, dist);
      }
    }
    bx.globalCompositeOperation = 'source-over';
  }

  function semearPulsos() {
    pulsos = [];
    if (!ramos.length) return;
    const n = Math.min(24, Math.max(8, Math.round(W * H / 62000)));
    for (let i = 0; i < n; i++) {
      const r = ramos[(rnd() * ramos.length) | 0];
      pulsos.push({ r, t: rnd() * r.comp, vel: .30 + rnd() * .5, cauda: 14 + rnd() * 22 });
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
      if (p.t > p.r.comp + p.cauda) {
        p.r = ramos[(rnd() * ramos.length) | 0]; p.t = -p.cauda * rnd(); p.vel = .30 + rnd() * .5;
      }
      const pts = p.r.pts;
      const ini = Math.max(0, Math.floor(p.t - p.cauda)), fim = Math.min(pts.length - 1, Math.floor(p.t));
      if (fim <= ini) continue;
      for (let i = ini; i < fim; i++) {
        const f = (i - ini) / (fim - ini), a = Math.pow(f, 2.4);
        gx.beginPath(); gx.moveTo(pts[i].x, pts[i].y); gx.lineTo(pts[i + 1].x, pts[i + 1].y);
        gx.strokeStyle = 'rgba(226,246,214,' + (a * .5) + ')';
        gx.lineWidth = p.r.esp * 2.6 * (.3 + f); gx.stroke();
        if (f > .6) {
          gx.beginPath(); gx.moveTo(pts[i].x, pts[i].y); gx.lineTo(pts[i + 1].x, pts[i + 1].y);
          gx.strokeStyle = 'rgba(255,255,246,' + ((f - .6) * 2.2 * .85) + ')';
          gx.lineWidth = p.r.esp * 1.05 * f; gx.stroke();
        }
      }
      const c = pts[fim];
      if (c) {
        const R = 20 * p.r.esp + 7;
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
  const ligar = () => { if (!rodando && visivel && !document.hidden && !menos) { rodando = true; requestAnimationFrame(t => { ultimo = t; quadro(t); }); } };
  const parar = () => { rodando = false; };

  let montando = false;
  async function montar() {
    if (montando) return;
    montando = true;
    const cx = tela.parentElement.getBoundingClientRect();
    W = Math.round(cx.width); H = Math.round(cx.height);
    if (W < 2 || H < 2) { montando = false; return; }
    DPR = Math.min(2, devicePixelRatio || 1);
    for (const c of [tela, luz]) { c.width = Math.round(W * DPR); c.height = Math.round(H * DPR); }
    await ceder();
    gerarVeios();
    await ceder();
    await pintarPedra();
    semearPulsos();
    montando = false;
    ligar();
  }

  /* o hero é a primeira tela: monta assim que o resto carregar, para não
     disputar banda com a foto e o texto que pintam a página */
  let montada = false;
  const secao = $('#topo');
  const iniciar = () => {
    visivel = true;
    if (montada) { ligar(); return; }
    montada = true;
    // requestIdleCallback tira a geração do caminho crítico do carregamento
    (window.requestIdleCallback || (f => setTimeout(f, 200)))(() => montar(), { timeout: 1500 });
  };
  if (document.readyState === 'complete') iniciar();
  else addEventListener('load', iniciar, { once: true });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => {
      visivel = e.isIntersecting;
      visivel ? ligar() : parar();          // fora da tela não gasta bateria
    }, { rootMargin: '150px', threshold: 0 }).observe(secao);
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
