#!/usr/bin/env python3
"""
Injeta assets/css/site.css minificado dentro do <head> do index.html.

Por que inline: servido como arquivo, o CSS bloqueava a primeira pintura por
725ms no celular. Inline, o Lighthouse mobile sobe de 96 para 100.

A fonte da verdade continua sendo assets/css/site.css. Depois de editar o CSS,
rode este script; ele substitui o bloco <style> que já está no HTML.

    python3 build.py
"""
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).parent
CSS = RAIZ / "assets/css/site.css"
HTML = RAIZ / "index.html"

MARCA_INI = "<style>"
MARCA_FIM = "</style>"


def minificar(css: str) -> str:
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)     # comentários
    css = re.sub(r"\s*\n\s*", "\n", css)
    css = re.sub(r"\n{2,}", "\n", css)
    css = re.sub(r"\s*([{}:;,>])\s*", r"\1", css)       # espaço em volta dos separadores
    css = re.sub(r";}", "}", css)                        # último ponto e vírgula
    return css.strip()


def reancorar(css: str) -> str:
    """No arquivo, `../fonts/` sai de assets/css/ e chega em assets/fonts/.
    Inline no index.html, que está na raiz, o mesmo caminho vira /fonts/ e dá
    404: as fontes somem e a página cai no fallback sem avisar.

    Vale para qualquer pasta de assets, não só fontes — uma imagem de fundo
    com `../img/` quebra do mesmo jeito, e igualmente em silêncio."""
    return re.sub(r"""url\((['"]?)\.\./""", r"url(\1assets/", css)


def main() -> int:
    if not CSS.exists() or not HTML.exists():
        print("assets/css/site.css ou index.html não encontrado", file=sys.stderr)
        return 1

    bruto = CSS.read_text(encoding="utf-8")
    enxuto = reancorar(minificar(bruto))
    html = HTML.read_text(encoding="utf-8")

    if "url(" in enxuto and re.search(r"""url\((['"]?)\.\./""", enxuto):
        print("ainda há caminho relativo ../ no CSS inline", file=sys.stderr)
        return 1

    ini = html.find(MARCA_INI)
    fim = html.find(MARCA_FIM, ini)
    if ini == -1 or fim == -1:
        print("bloco <style> não encontrado no index.html", file=sys.stderr)
        return 1

    novo = html[:ini] + MARCA_INI + enxuto + html[fim:]
    if novo == html:
        print("nada mudou")
        return 0

    HTML.write_text(novo, encoding="utf-8")
    print(f"css {len(bruto)} B -> {len(enxuto)} B  |  index.html {len(novo)} B")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
