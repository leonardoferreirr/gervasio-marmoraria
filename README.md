# Gervásio Marmoraria

Site estático (HTML/CSS/JS puro). Placeholder inicial, criado só para
conectar o domínio do cliente na Vercel antes de o site existir.

## Deploy

Vercel ligada neste repositório: **todo push na `main` publica sozinho**.
`vercel.json` fixa `framework: null` para a Vercel servir os arquivos como
estão, sem tentar detectar e buildar nada.

## Domínio

O domínio do cliente aponta para este projeto na Vercel.
Enquanto o site não existe, quem acessa vê a página de construção, que está
com `noindex,nofollow` para o Google não guardar o placeholder como se fosse
o site. **Remover essa meta tag do `index.html` quando o site real subir.**

## Rodar local

Qualquer servidor estático serve, por exemplo:

    python3 -m http.server 8080
