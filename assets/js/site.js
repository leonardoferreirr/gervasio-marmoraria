/* Gervásio Mármores e Granitos — interações e a pedra gerada em canvas */
(() => {
  'use strict';
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const menos = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ===================== WhatsApp =====================
     O número mora aqui, num lugar só. Todo CTA com [data-wa] passa por
     obrigado.html, que dispara a conversão e só então abre a conversa. */
  const NUM = '5531996905875';
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
     A superfície é gerada, não fotografada. Duas peças:

     1. A CHAPA, pintada uma vez. O que faz ler como mármore e não como
        ruído é o sin() aplicado a uma coordenada já deformada — é ele que
        produz as bandas fluidas — e o veio ser uma FAIXA de largura
        variável, que engrossa, afina e some ao longo do caminho. Traço de
        espessura constante dá raio; foi o erro da versão anterior.

     2. A LUZ, que só respira. Nada percorre a pedra: a chapa inteira ganha
        e perde brilho num fade lento que nunca fecha em zero. Custa um
        drawImage por quadro, porque a camada já está pronta.
     ===================================================================== */
  const tela = $('#telaPedra'), luz = $('#telaLuz');
  if (!tela || !luz) return;

  const bx = tela.getContext('2d', { alpha: false });
  const gx = luz.getContext('2d');
  let W = 0, H = 0, DPR = 1, rodando = false, visivel = false;
  let camOuro = null, camVeio = null, regioes = [];

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

  /* rampa amostrada da chapa de mármore verde que o cliente mandou */
  const RAMPA = [[4,25,26],[6,34,28],[14,43,40],[16,57,53],[0,84,67],[16,105,84],[97,153,137]];
  function corPedra(t) {
    const s = Math.max(0, Math.min(.9999, t)) * (RAMPA.length - 1);
    const i = s | 0, f = s - i, a = RAMPA[i], b = RAMPA[i + 1] || a;
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
  }

  /* Gerar tudo de uma vez custa uma tarefa única de centenas de ms na
     thread principal, e o Lighthouse conta isso inteiro como bloqueio. O
     trabalho é o mesmo, devolvido ao navegador em fatias; o verde sólido
     do CSS cobre enquanto isso, então não há flash. */
  const ceder = () => new Promise(r => setTimeout(r, 0));

  const ANG = -Math.PI * 0.19;   // direção dominante dos veios na chapa

  async function texturaPedra(PW, PH) {
    const img = bx.createImageData(PW, PH), d = img.data;
    const afoga = new ImageData(PW, PH);
    /* escala pequena = mais zoom no ruído. Grande demais, a chapa repete o
       mesmo redemoinho a cada palmo e lê como textura tileável. */
    const esc = 1.35 / Math.max(PW, PH);
    const ca = Math.cos(ANG), sa = Math.sin(ANG);
    const FAIXA = Math.max(24, Math.ceil(PH / 12));
    for (let y0 = 0; y0 < PH; y0 += FAIXA) {
      const ate = Math.min(PH, y0 + FAIXA);
      for (let y = y0; y < ate; y++) {
        for (let x = 0; x < PW; x++) {
          const px = x * esc, py = y * esc;
          const q1 = fbm(px + 5.2, py + 1.3, 4), q2 = fbm(px - 3.1, py + 8.7, 4);
          const r1 = fbm(px + 3.4 * q1 + 1.7, py + 3.4 * q2 - 2.4, 5);
          const u = (px * ca - py * sa);
          /* frequência baixa e warp fraco dentro do sin: banda curta vira
             papel marmorizado, e warp forte enrola a faixa em espiral
             fechada e vira malaquita. */
          const banda = Math.sin((u * 2.9 + r1 * .95) * Math.PI);
          const reg = fbm(px * .62 - 21, py * .62 + 33, 3);   // manchas lentas
          let t = .50 + banda * .16 + r1 * .26 + reg * .24;
          t += fbm(px * 5.5, py * 5.5, 3) * .09;              // grão
          t = (t - .5) * 1.18 + .52;                          // contraste
          t = Math.max(0, Math.min(1, t));
          const c = corPedra(t), i = (y * PW + x) * 4;
          d[i] = c[0]; d[i+1] = c[1]; d[i+2] = c[2]; d[i+3] = 255;
          /* a mesma matriz volta por cima do veio e engole trechos dele.
             Precisa ser quase binária e de mancha grande: com alpha médio
             em toda parte ela lava o veio inteiro em vez de interrompê-lo. */
          const m = fbm(px * .85 + 40, py * .85 - 17, 3);
          let a = Math.max(0, Math.min(1, (m - .10) * 4.4));
          a = a * a * (3 - 2 * a);
          afoga.data[i] = c[0]; afoga.data[i+1] = c[1]; afoga.data[i+2] = c[2];
          afoga.data[i+3] = a * 208;
        }
      }
      if (ate < PH) await ceder();
    }
    return [img, afoga];
  }

  /* Midpoint displacement dá a estrutura irregular; a suavização tira a
     quebra elétrica dos veios largos e deixa a angulosidade nas
     rachaduras finas. Amplitude alta demais vira meandro de rio. */
  function caminho(ax, ay, bx2, by2, geracoes, amp) {
    let segs = [[{x:ax,y:ay},{x:bx2,y:by2}]];
    let desl = Math.hypot(bx2-ax, by2-ay) * amp;
    for (let g = 0; g < geracoes; g++) {
      const novos = [];
      for (const [p1,p2] of segs) {
        const vx = p2.x-p1.x, vy = p2.y-p1.y, len = Math.hypot(vx,vy)||1;
        const off = (rnd()-.5)*2*desl;
        const m = {x:(p1.x+p2.x)/2 + (-vy/len)*off, y:(p1.y+p2.y)/2 + (vx/len)*off};
        novos.push([p1,m],[m,p2]);
      }
      segs = novos; desl *= 0.62;   // decair rápido alisa as últimas gerações
    }
    const pts = [segs[0][0]];
    for (const [,p2] of segs) pts.push(p2);
    return pts;
  }
  function suavizar(pts, vezes) {
    for (let v = 0; v < vezes; v++) {
      const n = [pts[0]];
      for (let i = 1; i < pts.length-1; i++)
        n.push({ x:(pts[i-1].x + pts[i].x*2 + pts[i+1].x)/4, y:(pts[i-1].y + pts[i].y*2 + pts[i+1].y)/4 });
      n.push(pts[pts.length-1]); pts = n;
    }
    return pts;
  }

  function faixa(ctx, pts, larg, semeia, corte, piso) {
    const n = pts.length;
    const ws = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = i/(n-1);
      /* frequência alta no perfil: varrendo poucas unidades de ruído o veio
         inteiro ganha uma barriga só e sai com forma de lâmina. E ruido()
         devolve [-1,1] — sem normalizar, o clamp satura em 1 quase o
         caminho todo e a largura volta a ser constante. */
      let perfil = (fbm(t*9.2 + semeia, semeia*.37, 3) + 1) * .5;
      perfil = (perfil - .38) * 2.6;
      perfil = Math.max(0, Math.min(1, perfil));
      perfil = Math.pow(perfil, 1.35);
      if (corte && perfil < corte) perfil = 0;
      if (piso) perfil = Math.max(perfil, piso);   // mestres afinam mas atravessam
      /* pontas com taxas altas e diferentes entre si: lento vira agulha,
         simétrico vira pétala */
      const pontas = Math.min(1, Math.min(t * (11 + (semeia % 9)), (1-t) * (14 + (semeia % 13))));
      ws[i] = larg * perfil * pontas * .5;
    }
    /* as larguras são suavizadas ANTES de virar geometria: aplicadas ponto
       a ponto, a borda do veio sai facetada, com arestas retas visíveis —
       o que mais denuncia desenho vetorial. */
    for (let v = 0; v < 3; v++) {
      const c2 = Float32Array.from(ws);
      for (let i = 1; i < n-1; i++) ws[i] = (c2[i-1] + c2[i]*2 + c2[i+1]) / 4;
    }
    const cima = [], baixo = [];
    for (let i = 0; i < n; i++) {
      const p0 = pts[i-1] || pts[i], p1 = pts[i+1] || pts[i];
      const vx = p1.x-p0.x, vy = p1.y-p0.y, m = Math.hypot(vx,vy)||1;
      const nx = -vy/m, ny = vx/m, w = ws[i];
      cima.push({ x:pts[i].x + nx*w, y:pts[i].y + ny*w });
      baixo.push({ x:pts[i].x - nx*w, y:pts[i].y - ny*w });
    }
    ctx.beginPath();
    ctx.moveTo(cima[0].x, cima[0].y);
    for (let i = 1; i < n; i++) ctx.lineTo(cima[i].x, cima[i].y);
    for (let i = n-1; i >= 0; i--) ctx.lineTo(baixo[i].x, baixo[i].y);
    ctx.closePath(); ctx.fill();
  }

  /* Poucos veios largos e muitos finos: na chapa real há dois ou três
     brancos dominantes e o resto é rachadura. Castas iguais dão escovado. */
  const CASTAS = [
    { n:3,  porte:1.40, larg:[44,20], ger:7, amp:.085, suave:3, corte:.26, piso:.20, ouro:1,   fino:0 },
    { n:5,  porte:1.15, larg:[14,9],  ger:7, amp:.10,  suave:3, corte:.30, piso:.13, ouro:1,   fino:0 },
    { n:11, porte:.85,  larg:[5,4],   ger:6, amp:.13,  suave:2, corte:.34, piso:0,   ouro:.8,  fino:0 },
    { n:24, porte:.60,  larg:[2,1.4], ger:5, amp:.20,  suave:1, corte:.36, piso:0,   ouro:.45, fino:1 },
  ];

  async function desenharVeios(vc, oc) {
    const vx2 = vc.getContext('2d'), ox2 = oc.getContext('2d');
    vx2.setTransform(DPR,0,0,DPR,0,0); ox2.setTransform(DPR,0,0,DPR,0,0);
    const D = Math.hypot(W,H), CX = W/2, CY = H/2;
    let feitos = 0;
    for (const c of CASTAS) {
      for (let i = 0; i < c.n; i++) {
        if (++feitos % 6 === 0) await ceder();
        const ang = ANG + (rnd()-.5) * (c.fino ? 1.5 : .34);
        const dx = Math.cos(ang), dy = Math.sin(ang), px = -dy, py = dx;
        /* origem aleatória deixa metade da tela vazia, porque vários veios
           nascem e morrem fora do quadro. Cada casta é distribuída ao longo
           do eixo perpendicular; o acaso fica no jitter, não em existir. */
        const pos = ((i+.5)/c.n - .5) + (rnd()-.5) * (1.0/c.n);
        const offp = pos * (W+H) * .82;
        const meio = D * c.porte * .5;
        let pts = caminho(CX + px*offp - dx*meio, CY + py*offp - dy*meio,
                          CX + px*offp + dx*meio, CY + py*offp + dy*meio, c.ger, c.amp);
        pts = suavizar(pts, c.suave);
        const larg = c.larg[0] + rnd()*c.larg[1], sem = rnd()*100;

        if (c.fino) {
          vx2.fillStyle = 'rgba(196,222,210,.30)';
          faixa(vx2, pts, larg, sem, c.corte, c.piso);
        } else {
          /* auréola VERDE CLARA e larga, não branca: na chapa o entorno do
             veio clareia o verde antes de virar branco. Só no fim um núcleo
             estreito e opaco — é ele que dá o aspecto mineral. */
          vx2.fillStyle = 'rgba(96,150,128,.17)';
          faixa(vx2, pts, larg*2.9, sem, c.corte, c.piso);
          vx2.fillStyle = 'rgba(168,204,188,.26)';
          faixa(vx2, pts, larg*1.5, sem, c.corte, c.piso);
          vx2.fillStyle = 'rgba(214,228,222,.62)';
          faixa(vx2, pts, larg*.80, sem, c.corte, c.piso);
          vx2.fillStyle = 'rgba(240,245,242,.97)';
          faixa(vx2, pts, larg*.34, sem+3.1, c.corte + .16, c.piso*.5);
        }
        // o dourado não é veio próprio: acompanha uma das bordas do branco
        if (rnd() < c.ouro) {
          const desl = larg*.42, lado = rnd() < .5 ? 1 : -1;
          const pd = pts.map((p,k) => {
            const p0 = pts[k-1]||p, p1 = pts[k+1]||p;
            const vx3 = p1.x-p0.x, vy3 = p1.y-p0.y, m = Math.hypot(vx3,vy3)||1;
            return { x:p.x + (-vy3/m)*desl*lado, y:p.y + (vx3/m)*desl*lado };
          });
          ox2.fillStyle = 'rgba(206,166,82,.42)';
          faixa(ox2, pd, Math.max(3.8, larg*.36), sem+11.7, .30, 0);
          ox2.fillStyle = 'rgba(247,214,134,.62)';
          faixa(ox2, pd, Math.max(1.9, larg*.16), sem+11.7, .34, 0);
        }
      }
    }
  }

  async function pintarPedra() {
    /* a textura é difusa: gerada em fração da resolução e escalada. Pixel a
       pixel em resolução cheia trava a thread por quase um segundo. */
    const ESC = W < 700 ? 4 : 3;
    const PW = Math.max(2, Math.ceil(tela.width / ESC)), PH = Math.max(2, Math.ceil(tela.height / ESC));
    const [img, afoga] = await texturaPedra(PW, PH);

    const off = document.createElement('canvas'); off.width = PW; off.height = PH;
    off.getContext('2d').putImageData(img, 0, 0);   // putImageData ignora a transform: usar tamanho físico
    bx.setTransform(1,0,0,1,0,0);
    bx.imageSmoothingEnabled = true; bx.imageSmoothingQuality = 'high';
    bx.drawImage(off, 0, 0, tela.width, tela.height);
    await ceder();

    const vc = document.createElement('canvas'); vc.width = tela.width; vc.height = tela.height;
    const oc = document.createElement('canvas'); oc.width = tela.width; oc.height = tela.height;
    await desenharVeios(vc, oc);

    /* o branco sai chapado do preenchimento, e chapado lê como vetor. Uma
       passada de destination-out com ruído come pedaços do veio por dentro
       e devolve a nuvem que o mármore tem. */
    {
      const nz = new ImageData(PW, PH), e2 = 3.2 / Math.max(PW, PH);
      for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
        const m = fbm(x*e2 + 71, y*e2 - 29, 4);
        const a = Math.max(0, Math.min(1, (m + .05) * 2.2));
        nz.data[(y*PW+x)*4 + 3] = a * 150;
      }
      const nc = document.createElement('canvas'); nc.width = PW; nc.height = PH;
      nc.getContext('2d').putImageData(nz, 0, 0);
      const v2 = vc.getContext('2d');
      v2.setTransform(1,0,0,1,0,0);
      v2.globalCompositeOperation = 'destination-out';
      v2.drawImage(nc, 0, 0, vc.width, vc.height);
      v2.globalCompositeOperation = 'source-over';
    }
    await ceder();

    // borda difusa de verdade: um blur único na composição, não por traço
    bx.setTransform(1,0,0,1,0,0);
    bx.filter = 'blur(' + (1.1*DPR) + 'px)';
    bx.drawImage(vc, 0, 0);
    bx.filter = 'none';
    bx.globalAlpha = .50; bx.drawImage(vc, 0, 0); bx.globalAlpha = 1;   // segunda passada nítida: acima disso o núcleo do veio estoura o contraste do texto

    const ac = document.createElement('canvas'); ac.width = PW; ac.height = PH;
    ac.getContext('2d').putImageData(afoga, 0, 0);
    bx.drawImage(ac, 0, 0, tela.width, tela.height);

    // o dourado entra depois do afogamento: na chapa real ele fica por cima
    bx.filter = 'blur(' + (.7*DPR) + 'px)';
    bx.drawImage(oc, 0, 0);
    bx.filter = 'none';

    camOuro = oc; camVeio = vc;
    /* O brilho global variava pouco a olho: a tela inteira subindo e descendo
       junto é justamente o que a visão menos percebe. Aqui a chapa é dividida
       em manchas grandes que acendem em tempos próprios — nada se desloca,
       cada mancha só faz o seu fade. */
    const MANCHAS = [
      { cx:.14, cy:.22, r:.40, per: 4.6, fase: 0   },
      { cx:.86, cy:.30, r:.42, per: 6.2, fase: 2.1 },
      { cx:.24, cy:.78, r:.40, per: 7.9, fase: 4.2 },
      { cx:.80, cy:.82, r:.44, per: 5.4, fase: 1.2 },
      { cx:.50, cy:.06, r:.34, per: 9.1, fase: 3.3 },
      { cx:.50, cy:.96, r:.36, per: 6.8, fase: 5.0 },
    ];
    const D = Math.hypot(oc.width, oc.height);
    regioes = MANCHAS.map(m => {
      const c = document.createElement('canvas');
      c.width = oc.width; c.height = oc.height;
      const x = c.getContext('2d');
      x.drawImage(oc, 0, 0);
      x.globalCompositeOperation = 'destination-in';
      const R = D * m.r;
      const g = x.createRadialGradient(oc.width*m.cx, oc.height*m.cy, 0,
                                       oc.width*m.cx, oc.height*m.cy, R);
      g.addColorStop(0,   'rgba(0,0,0,1)');
      g.addColorStop(.45, 'rgba(0,0,0,.66)');
      g.addColorStop(1,   'rgba(0,0,0,0)');
      x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
      return { c, per: m.per, fase: m.fase };
    });
  }

  /* Nada percorre a pedra. A chapa ganha e perde brilho num fade que nunca
     fecha em zero; duas senoides de períodos que não se encaixam evitam a
     batida de metrônomo. Um drawImage por quadro, a camada já está pronta. */
  let t0 = 0;
  function quadro(ts) {
    if (!rodando || !camOuro) return;
    if (!t0) t0 = ts;
    const t = (ts - t0) / 1000;
    const o1 = Math.sin(t * (2*Math.PI/6.0));
    const o2 = Math.sin(t * (2*Math.PI/9.4) + 1.1);
    const osc = (o1*.62 + o2*.38) * .5 + .5;
    gx.setTransform(1,0,0,1,0,0);
    gx.clearRect(0, 0, luz.width, luz.height);
    /* 'lighter' faz as passadas do ouro somarem entre si: é o que acende o
       fio em vez de só deixá-lo mais opaco. Halo largo primeiro, fio nítido
       por cima — o halo sozinho vira mancha, o fio sozinho não ilumina. */
    gx.globalCompositeOperation = 'lighter';
    // halo largo do conjunto: dá o corpo do brilho
    gx.globalAlpha = .16 + .34 * osc;
    gx.filter = 'blur(' + (6*DPR) + 'px)';
    gx.drawImage(camOuro, 0, 0);
    gx.filter = 'none';
    /* cada mancha acende no seu tempo. Amplitude larga (quase apaga, quase
       satura): variação estreita não é percebida como animação. */
    for (const r of regioes) {
      const o = Math.sin(t * (2*Math.PI/r.per) + r.fase) * .5 + .5;
      const f = o * o;                           // ao quadrado: acende rápido, apaga devagar
      gx.globalAlpha = .05 + .95 * f;
      gx.drawImage(r.c, 0, 0);
      /* globalAlpha para em 1. Para o pico realmente ESTOURAR, a mancha acesa
         entra de novo: com 'lighter' as passadas somam e o fio acende. */
      if (f > .45) {
        gx.globalAlpha = (f - .45) * 1.6;
        gx.drawImage(r.c, 0, 0);
      }
    }
    // as rajadas brancas respiram junto, em outro compasso
    gx.globalAlpha = .10 + .40 * (Math.sin(t*(2*Math.PI/6.3)+2.2)*.5+.5);
    gx.drawImage(camVeio, 0, 0);
    gx.globalAlpha = 1;
    gx.globalCompositeOperation = 'source-over';
    requestAnimationFrame(quadro);
  }
  const ligar = () => { if (!rodando && visivel && !document.hidden && !menos && camOuro) { rodando = true; requestAnimationFrame(quadro); } };
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
    await pintarPedra();
    montando = false;
    ligar();
  }

  /* =====================================================================
     FOTOS QUE APARECEM E SOMEM
     Aparições curtas em pontos afastados do texto, em verde: por um
     instante a chapa deixa ver o que já virou peça. Entram por JS depois do
     load — são decorativas e não podem disputar com o texto do hero.
     ===================================================================== */
  const palco = $('#heroFotos');
  if (palco && !menos) {
    const FOTOS = [
      ['amb-ilha-cooktop-sm.webp', 1],
      ['of-bancada-curva-verde-sm.webp', .8],
      ['peca-mesa-cogumelo-sm.webp', 1],
      ['amb-escada-sm.webp', 1.25],
      ['amb-recepcao-sm.webp', .8],
      ['peca-mesa-redonda-verde-sm.webp', 1],
      ['amb-cozinha-branca-sm.webp', .75],
      ['peca-cachepots-sm.webp', 1.2],
      ['amb-nicho-sm.webp', 1.3],
      ['chapa-veios-brancos-sm.webp', .8],
    ];
    /* posições ancoradas nas bordas, nunca por coordenada central: assim
       nenhuma aparição estoura o quadro em tela estreita */
    const POSES_L = [
      { left:'1%',  top:'13%' },   { right:'1%', top:'12%' },
      { left:'2%',  top:'34%' },   { right:'2%', top:'31%' },
      { left:'3%',  bottom:'21%' },{ right:'3%', bottom:'19%' },
      { left:'9%',  bottom:'3%' }, { right:'8%', bottom:'2%' },
      { left:'20%', top:'11%' },   { right:'18%', top:'11%' },
      { left:'25%', bottom:'1%' }, { right:'23%', bottom:'2%' },
      { left:'16%', top:'27%' },   { right:'15%', top:'24%' },
      { left:'30%', bottom:'14%' },{ right:'28%', bottom:'12%' },
      { left:'38%', top:'12%' },   { right:'36%', bottom:'6%' },
    ];
    const POSES_P = [
      { left:'2%',  top:'11%' }, { right:'3%',  top:'10%' },
      { left:'4%',  bottom:'6%' }, { right:'2%', bottom:'8%' },
      { left:'16%', top:'10%' }, { right:'14%', bottom:'3%' },
      { left:'5%',  top:'30%' }, { right:'4%',  top:'27%' },
      { left:'8%',  bottom:'24%' }, { right:'6%', bottom:'22%' },
    ];
    const estreito = () => innerWidth < 1000;
    let poses = estreito() ? POSES_P : POSES_L;
    const ocupadas = new Set();
    let ultima = -1;

    const sorteia = (n, evita) => { let k; do { k = (Math.random()*n)|0; } while (n > 1 && k === evita); return k; };

    /* fotos grandes alcançam o texto em telas curtas. Em vez de torcer para
       a pose caber, a caixa é medida contra a do texto e a pose é trocada
       quando invade — vale para qualquer tamanho de tela. */
    /* as fotos podem cruzar o texto de propósito — o texto está numa camada
       acima e continua por cima. Só a barra fica fora de alcance: ali há
       links, e foto atrás de link atrapalha a leitura do menu. */
    const barra = $('.nav__in');
    const cruza = (a, b, folga) =>
      !(a.right < b.left - folga || a.left > b.right + folga ||
        a.bottom < b.top - folga || a.top > b.bottom + folga);
    const invade = (el) => {
      const a = el.getBoundingClientRect();
      if (barra && cruza(a, barra.getBoundingClientRect(), 10)) return true;
      /* encostar em outra foto preenche; empilhar vira borrão. Rejeita a
         pose quando a sobreposição passa de um terço da menor das duas. */
      for (const o of $$('.hf.vis')) {
        if (o === el) continue;
        const b = o.getBoundingClientRect();
        if (!cruza(a, b, 0)) continue;
        const iw = Math.min(a.right,b.right) - Math.max(a.left,b.left);
        const ih = Math.min(a.bottom,b.bottom) - Math.max(a.top,b.top);
        const menor = Math.min(a.width*a.height, b.width*b.height) || 1;
        if ((iw*ih) / menor > .34) return true;
      }
      return false;
    };

    const bloco = $('.hero__centro');
    const sobreTexto = (el) => bloco ? cruza(el.getBoundingClientRect(), bloco.getBoundingClientRect(), 0) : false;

    function ciclo(el, slot) {
      const f = sorteia(FOTOS.length, ultima); ultima = f;
      const [arq, prop] = FOTOS[f];
      const larg = estreito()
        ? 128 + Math.random() * Math.min(96, innerWidth * .17)
        : 168 + Math.random() * Math.min(214, innerWidth * .13);
      const alt = Math.round(larg * (prop < 1 ? 1/prop : prop) * .82);

      // procura uma pose livre que não encoste no texto
      let p = -1;
      /* cada slot fica numa metade da tela (a lista alterna esquerda/direita):
         com sorteio livre as seis fotos podiam cair todas no mesmo canto */
      const meu = [...poses.keys()].filter(k => k % 2 === slot % 2);
      const ordem = [...meu, ...poses.keys()].sort(() => Math.random() - .5);
      for (const cand of ordem) {
        if (ocupadas.has(cand)) continue;
        el.style.cssText = '';
        Object.assign(el.style, poses[cand]);
        el.style.width = larg + 'px'; el.style.height = alt + 'px';
        if (!invade(el)) { p = cand; break; }
      }
      if (p < 0) { setTimeout(() => ciclo(el, slot), 1200); return; }   // nada coube agora
      ocupadas.add(p);
      el.classList.toggle('hf--fundo', sobreTexto(el));

      el.querySelector('img').src = 'assets/img/' + arq;
      el.style.transitionDuration = (1.3 + Math.random()*.6) + 's';

      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('vis')));
      const fica = 3200 + Math.random()*2600;
      setTimeout(() => {
        el.classList.remove('vis');
        setTimeout(() => {
          ocupadas.delete(p);
          if (!document.hidden && visivel) setTimeout(() => ciclo(el, slot), 250 + Math.random()*1500);
          else setTimeout(() => ciclo(el, slot), 4000);
        }, 1900);
      }, fica);
    }

    const soltar = () => {
      const quantos = estreito() ? 4 : 6;
      for (let i = 0; i < quantos; i++) {
        const el = document.createElement('div');
        el.className = 'hf';
        const im = document.createElement('img');
        im.alt = ''; im.decoding = 'async'; im.width = 260; im.height = 260;
        el.appendChild(im);
        palco.appendChild(el);
        setTimeout(() => ciclo(el, i), 700 + i * 1050 + Math.random()*800);
      }
    };
    addEventListener('resize', () => { poses = estreito() ? POSES_P : POSES_L; });
    (window.requestIdleCallback || (f => setTimeout(f, 600)))(soltar, { timeout: 2500 });
  }

  /* o hero é a primeira tela: monta assim que o resto carregar, para não
     disputar banda com o texto que pinta a página */
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
