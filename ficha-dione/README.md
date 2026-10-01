# Ficha · Lanchonete da Dione

Sistema de fichas e vendas da lanchonete. Os lançamentos ficam guardados no próprio Netlify (Netlify Blobs) e aparecem iguais em todos os aparelhos, protegidos por PIN.

## Estrutura
- `public/` — o site (index.html e imagens)
- `netlify/functions/dados.mjs` — o "servidor" que guarda e junta os lançamentos
- `netlify.toml` e `package.json` — configuração do Netlify

## Publicar
1. Suba esta pasta num repositório novo no GitHub.
2. No Netlify: Add new site → Import an existing project → GitHub → escolha o repositório. As configurações já vêm do `netlify.toml`; é só clicar em Deploy.
3. (Opcional) Domain management → adicione `ficha.scopomkt.com.br`.

## PIN
- No primeiro acesso, o site pede para criar um PIN. Os outros aparelhos usam o mesmo PIN.
- Para trocar/fixar o PIN: Site configuration → Environment variables → `FICHA_PIN` = número desejado, e faça um novo deploy.

## Segurança extra
O servidor guarda automaticamente uma cópia por dia (`copia-AAAA-MM-DD`) no Netlify Blobs.
