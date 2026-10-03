# Arquitetura do Projeto --- Eco Dashboard

## Visão geral

O **Eco Dashboard** utiliza uma arquitetura separada entre frontend e
backend:

-   **Frontend:** React.js
-   **Backend:** FastAPI (Python)
-   **Gerenciamento do frontend:** npm
-   **Gerenciamento do backend:** uv + `pyproject.toml`
-   **Comunicação:** API HTTP/JSON

A separação permite que frontend e backend evoluam de forma
independente, mantendo responsabilidades bem definidas.

## Estrutura do projeto

``` text
eco-dashboard/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── pages/
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js
│
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── routers/
│   │   ├── schemas/
│   │   ├── models/
│   │   └── services/
│   ├── .venv/
│   ├── pyproject.toml
│   └── uv.lock
│
├── .gitignore
└── README.md
```

> As pastas internas do backend e frontend devem ser criadas conforme a
> necessidade. Não é necessário manter pastas vazias apenas para seguir
> esta estrutura.

## Frontend

O frontend é responsável pela interface do usuário e pela apresentação
dos dados fornecidos pela API.

### `src/components/`

Componentes reutilizáveis da interface, como:

-   cards;
-   tabelas;
-   gráficos;
-   botões;
-   menus;
-   inputs.

### `src/pages/`

Páginas completas da aplicação, como:

``` text
pages/
├── Dashboard.jsx
├── Login.jsx
└── Settings.jsx
```

### `src/assets/`

Recursos estáticos utilizados pelo React, como imagens, ícones e outros
arquivos importados pela aplicação.

## Backend

Todo o código Python da API fica dentro do pacote `app`.

### `app/main.py`

Ponto de entrada da aplicação FastAPI.

Exemplo:

``` python
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def root():
    return {"message": "Hello World"}
```

Durante o desenvolvimento, a API pode ser executada a partir de
`backend/` com:

``` bash
uv run fastapi dev app/main.py
```

Também é possível executá-la diretamente com Uvicorn:

``` bash
uv run uvicorn app.main:app --reload
```

### `app/routers/`

Define os endpoints da API, separados por domínio ou funcionalidade.

Exemplo:

``` text
routers/
├── dashboard.py
└── users.py
```

O objetivo é evitar concentrar todas as rotas em `main.py`.

### `app/schemas/`

Contém os schemas usados para entrada e saída de dados da API,
normalmente definidos com Pydantic.

Exemplos:

-   payloads de requisições;
-   respostas da API;
-   validação de dados.

### `app/models/`

Contém os modelos relacionados à persistência dos dados, caso o projeto
utilize banco de dados.
```

## Comunicação entre frontend e backend

O React não acessa diretamente banco de dados ou regras internas do
backend.

O fluxo principal é:

``` text
┌──────────────┐
│    React     │
│   Frontend   │
└──────┬───────┘
       │
       │ HTTP / JSON
       ▼
┌──────────────┐
│   FastAPI    │
│   Backend    │
└──────┬───────┘
       │
       ├── Banco de dados
       └── API INEP Economia
```

Durante o desenvolvimento, os serviços podem rodar separadamente:

``` text
React / Vite
http://localhost:5173

        │
        ▼

FastAPI
http://localhost:8000
```

## Dependências Python

As dependências do backend são declaradas em `backend/pyproject.toml`.

Exemplo:

``` toml
[project]
name = "backend"
version = "0.1.0"
requires-python = ">=3.12"

dependencies = [
    "fastapi[standard]",
]

[tool.uv]
package = false
```

O ambiente virtual local fica em:

``` text
backend/.venv/
```

Para sincronizar as dependências:

``` bash
cd backend
uv sync
```

Para adicionar uma dependência:

``` bash
uv add nome-da-dependencia
```

O `.venv` não deve ser versionado no Git.

## Princípios da arquitetura

A arquitetura deve permanecer simples e crescer junto com o projeto.

1.  **Frontend cuida da interface.**
2.  **Backend cuida dos dados e regras de negócio.**
3.  **Routers recebem e respondem requisições HTTP.**
4.  **Services concentram regras de negócio quando elas surgirem.**
5.  **Schemas definem e validam os dados da API.**
6.  **Models representam a camada de persistência quando necessária.**
7.  **Novas abstrações só devem ser adicionadas quando resolverem uma
    necessidade real.**

## Evolução

A estrutura inicial pode ser mínima:

``` text
backend/
└── app/
    ├── __init__.py
    └── main.py
```

Conforme o projeto crescer, as responsabilidades podem ser extraídas
gradualmente para `routers/`, `schemas/` e `models/`.