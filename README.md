# Dimensionador PHE — Alfaved

Software web de **dimensionamento preliminar de trocadores de calor de placas (PHE)**,
com comparação entre fabricantes: **Alfaved** (destaque), Alfa Laval, GEA, Danfoss e APV.

## Arquivos

- `index.html` — página principal
- `css/estilo.css` — estilos
- `js/fabricantes.js` — dados dos fabricantes e placas
- `js/calculo.js` — motor de dimensionamento (balanço de energia, LMTD, correlações chevron)
- `js/app.js` — interface e comparação

## Testar localmente

Abra o `index.html` diretamente no navegador (não precisa de servidor).

## Publicar no GitHub Pages

1. Crie um repositório e suba os arquivos, mantendo as pastas `css/` e `js/`.
2. No repositório: **Settings → Pages** → Branch `main` → pasta `/ (root)` → **Save**.
3. Acesse `https://SEU_USUARIO.github.io/SEU_REPOSITORIO/`.

## Importante

Os coeficientes de cada fabricante são **representativos** (correlações públicas).
Calibre com os catálogos oficiais editando `js/fabricantes.js`
(`fator_desempenho`, `fator_atrito`, `fator_custo` e geometria das placas).
