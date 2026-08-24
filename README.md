# Gervásio Mármores e Granitos

Landing page da **Gervásio Mármores e Granitos**, marmoraria em Nova Lima, MG.
Cliente da Fish (agência do Lucas). Site estático, sem framework, deploy na Vercel
em `gervasiomarmoraria.com.br`.

## Estado

Lighthouse **100 / 100 / 100 / 100** no mobile e no desktop (performance,
acessibilidade, boas práticas, SEO). LCP 1,0s no mobile e 0,1s no desktop, CLS zero.
Verificado em Chromium e WebKit, em 390, 768, 1440 e 1920 de largura.

## Como editar

O CSS fica em `assets/css/site.css`, mas o navegador lê a **cópia inline** dentro do
`index.html`: servido como arquivo separado, o CSS bloqueava a primeira pintura por
725ms no celular e derrubava a performance para 96.

Depois de mexer no CSS, rode:

```bash
python3 build.py
```

O script minifica, corrige os caminhos das fontes (`../fonts/` vira `assets/fonts/`,
porque inline o caminho relativo sai da raiz e não de `assets/css/`) e substitui o
bloco `<style>` do HTML. Sem rodar o build, a alteração não aparece no site.

## A seção da pedra

O bloco verde não é foto: é gerado em canvas a cada carregamento, em
`assets/js/site.js`. São duas camadas, a pedra e a luz.

- **A pedra** é ruído fractal com domain warping, pintada uma única vez. A rampa de
  cor foi amostrada de uma chapa de mármore verde real, do quase-preto ao verde
  acinzentado. É gerada em 1/3 da resolução e escalada: pixel a pixel em resolução
  cheia custava 800ms de thread travada.
- **Os veios** são caminhos com direção dominante e ramificações, desenhados na
  pedra em branco e em dourado.
- **Os pulsos** percorrem esses mesmos caminhos, com rastro e halo. Só essa camada
  redesenha a cada quadro.

A semente vem do relógio, então o desenho muda a cada visita, que é exatamente o que
a seção afirma no texto. A cena só é montada quando a seção se aproxima da tela, e
para de animar quando sai de vista, quando a aba fica oculta ou quando o visitante
pede menos movimento.

**Ordem das camadas:** pedra (z 0), véu (z 1), luz (z 2), texto (z 4). O véu precisa
ficar entre a pedra e os pulsos; acima deles, ele apaga a luz que deveria brilhar.

## Assets

- `assets/img/wordmark.svg` — logotipo vetorizado do PDF do cliente com potrace,
  usa `currentColor`, então funciona em bordô sobre branco e em branco sobre verde.
  No HTML entra como `<symbol id="wm">` e é referenciado por `<use href="#wm">`.
- `assets/img/losango.svg` e `favicon.svg` — o losango da marca, redesenhado.
- Fotos: extraídas do portfólio em PDF (`pdfimages`) e do material do WhatsApp,
  convertidas para WebP em duas larguras (nativa até 1400px, e `-sm` para 520px).
  Nenhuma foi ampliada além do tamanho original.

As duas imagens de mármore verde que vieram na pasta do briefing **não foram usadas**:
são de banco de imagem, uma delas com marca d'água visível. O verde do site é gerado.

## Dados do cliente

- WhatsApp `5531996905875` — mora numa constante só, no topo do `site.js`
- Fixo (31) 3541-8936
- Rua Toronto, 1854 — Jardim Canadá, Nova Lima, MG
- Instagram [@marmorariagervasio_](https://www.instagram.com/marmorariagervasio_/)

Todo CTA passa por `obrigado.html`, que dispara o evento de conversão no `dataLayer`
e só então abre a conversa. Não há GTM instalado ainda: quando entrar, o evento
`whatsapp_click` já está sendo empurrado.

## Em aberto

- **Tempo de mercado.** O briefing cita "experiência no mercado" como diferencial mas
  não diz há quantos anos. Assim que o cliente confirmar, vale entrar no bloco
  "A Gervásio" e nos números do topo, que é prova forte para quem está escolhendo.
- **Horário de funcionamento** não foi informado e por isso não está no site nem no
  schema.org.
