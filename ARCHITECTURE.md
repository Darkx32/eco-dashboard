# Arquitetura do Projeto — Eco Dashboard

## Visão geral

O **Eco Dashboard** adota uma arquitetura **100% frontend (SPA)** em React, consolidando no próprio navegador a comunicação com a API pública do IBGE, a limpeza/normalização dos dados econômicos e um sistema de cache temporário de 15 minutos — sem dependência de backend em Python.

- **Interface:** React 19 + Vite + Tailwind CSS + Recharts
- **Camada de dados e limpeza:** Módulos JavaScript dedicados (`src/services/ibge.js`, `src/services/cache.js` e `src/services/api.js`)
- **Catálogo dinâmico:** Configuração declarativa de indicadores (`src/data/indicadores.js`)
- **Gerenciamento de pacotes:** npm
- **Hospedagem / Deploy:** Estático / Edge no Cloudflare (Cloudflare Pages ou Cloudflare Workers Assets)

Essa arquitetura simplifica o deploy, reduz latência e custos operacionais (sem servidor intermediário para manter) e permite publicar o dashboard diretamente na borda da rede via Cloudflare.

---

## Estrutura do projeto

```text
eco-dashboard/
├── frontend/
│   ├── public/
│   │   └── favicon.svg
│   ├── src/
│   │   ├── components/
│   │   │   ├── DadosEconomia.jsx
│   │   │   └── RelatoriosEconomia.jsx
│   │   ├── data/
│   │   │   └── indicadores.js
│   │   ├── hooks/
│   │   │   └── useLocalStorage.js
│   │   ├── pages/
│   │   │   ├── Economia.css
│   │   │   └── Economia.jsx
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   ├── cache.js
│   │   │   └── ibge.js
│   │   ├── utils/
│   │   │   ├── dadosEconomia.js
│   │   │   └── relatorioEconomia.js
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── eslint.config.js
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── wrangler.jsonc
│
├── .gitignore
├── ARCHITECTURE.md
├── Makefile
└── README.md
```

---

## Frontend

As consultas partem dos componentes React guiados pelo catálogo dinâmico `INDICADORES`, passam pela camada de cache temporário (15 minutos) e, quando não há entrada válida em cache, são buscadas na API de Agregados v3 do IBGE, limpas em JavaScript e armazenadas antes de chegar à UI:

```text
┌──────────────────────────────────────────────┐
│              React Components                │
│  (Economia, DadosEconomia, Relatorios...)    │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│       API & Indicadores Dinâmicos            │
│   (src/services/api.js + indicadores.js)     │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│          Cache Temporário (15 min)           │
│  (src/services/cache.js: Memória +           │
│   localStorage + deduplicação em voo)        │
└──────────────────────┬───────────────────────┘
                       │ cache miss / expirado
                       ▼
┌──────────────────────────────────────────────┐
│              Módulo IBGE JS                  │
│  (src/services/ibge.js: Limpeza, Conversão   │
│   Monetária e Consolidação do PIB Anual)     │
└──────────────────────┬───────────────────────┘
                       │ HTTPS / JSON
                       ▼
┌──────────────────────────────────────────────┐
│                  API IBGE                    │
│     https://servicodados.ibge.gov.br/api/v3  │
└──────────────────────────────────────────────┘
```

---

## Módulos principais

### `src/services/ibge.js`

Responsável por toda a integração e higienização de dados que anteriormente ficava no backend Python:

- **Consumo da API de Agregados v3 do IBGE** (`https://servicodados.ibge.gov.br/api/v3/agregados`).
- **Limpeza de valores:** converte marcadores ausentes ou não numéricos do IBGE (`".."`, `"..."`, `"-"`, `"x"`, `""`, `NaN`, `Infinity`) para `null` com `converterNumero`, descartando registros inválidos e ordenando as séries cronologicamente.
- **Normalização de unidades e conversão monetária:** traduz rótulos de unidade (`UNIT_TRANSFORM`) e multiplica automaticamente séries expressas em `"Mil Reais"`, `"Milhões de Reais"` ou `"Bilhões de Reais"` para `"Reais"` com controle de precisão decimal (`multiplicarComPrecisao`).
- **Consolidação do PIB anual (`completarPibAnual`):** preserva os anos já publicados na série anual (agregado `6784`, variável `9808`) e acrescenta anos posteriores que já possuam os 4 trimestres fechados na série trimestral (agregado `1846`, variável `585`, classificação `11255[90707]`), evitando exibir anos incompletos.
- **Limpeza de metadados (`limparMetadadosAgregado`):** remove campos verbosos (`nivelTerritorial`, `sumarizacao`) e normaliza unidades de variáveis e categorias.

### `src/services/cache.js`

Sistema de cache temporário com **TTL padrão de 15 minutos (`CACHE_TTL_MS = 15 * 60 * 1000`)**:

- **Duas camadas de armazenamento:** cache rápido em memória (`Map`) combinado com persistência no `localStorage` do navegador (sob o prefixo `eco-api-cache:v1:`), sobrevivendo a recarregamentos da página dentro da janela de 15 minutos.
- **Expiração e limpeza automática:** valida o timestamp `expiraEm` a cada leitura, removendo entradas expiradas ou corrompidas e liberando espaço automaticamente em caso de limite de quota.
- **Deduplicação de requisições em andamento:** múltiplas chamadas simultâneas para a mesma chave (`comCache`) compartilham a mesma `Promise` em voo, evitando requisições duplicadas à API do IBGE.

### `src/data/indicadores.js`

Catálogo dinâmico central dos indicadores econômicos exibidos na aplicação:

- Define para cada indicador seus parâmetros de consulta no IBGE (`agregadoId`, `variavelId`, `classificacao` e, quando aplicável, `complementoTrimestral`), metadados (`nome`, `nomeTabela`, `unidade`, `frequencia`, `descricao`) e regras de exibição (`formato`, `casasDecimais`, `destaqueKpi`, `detalheKpi`, `exibirVariacaoKpi`).
- A página `Economia.jsx` e os componentes `DadosEconomia.jsx` e `RelatoriosEconomia.jsx` consomem esse catálogo dinamicamente, sem listas fixas de hooks ou chamadas manuais por indicador.

### `src/services/api.js`

Fachada consumida pelos componentes e hooks React, expondo `buscarIndicador`, `buscarSerie`, `buscarPibAnual`, `buscarAgregados`, `buscarInfoAgregado` e controles do cache (`limparCache`, `CACHE_TTL_MS`).

---

## Desenvolvimento local

A partir da raiz do projeto (via `Makefile`) ou dentro de `frontend/`:

```bash
cd frontend
npm install
npm run dev      # Servidor de desenvolvimento Vite (http://localhost:5173)
npm run lint     # Verificação estática com ESLint
npm run build    # Build de produção em frontend/dist/
```

---

## Deploy no Cloudflare

O projeto gera um bundle puramente estático em `frontend/dist/`, pronto para publicação no **Cloudflare Workers Assets** ou **Cloudflare Pages**:

- **`frontend/wrangler.jsonc`:** configura o projeto (`name: "eco-dashboard"`), `compatibility_date` e o diretório de assets `./dist` com roteamento SPA (`single-page-application`), sem necessidade de `_redirects` (que causaria loop com o roteamento SPA do Cloudflare).

### Configuração de build (Cloudflare Pages / Workers)

- **Diretório raiz (Root directory):** `frontend`
- **Comando de build:** `npm run build`
- **Diretório de saída (Output directory):** `dist`

Para publicar manualmente via Wrangler CLI a partir de `frontend/`:

```bash
cd frontend
npm run build
npx wrangler deploy
```