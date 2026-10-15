# A3 Estoque – Microsserviços

Sistema de controle de estoque com login separado, bancos segregados,
concorrência segura, escala horizontal e mensageria via banco de dados.

## Como rodar
Pré-requisito: Docker + Docker Compose.

```bash
docker compose up --build                              # 1 réplica de cada
docker compose up --build --scale estoque-service=3    # 3 réplicas do estoque
```
Abra http://localhost:8080 , crie uma conta (a primeira vira **admin**) e entre.

## Arquitetura
```
Navegador ──► gateway (nginx :8080)
                 ├── /            → frontend (HTML/JS)
                 ├── /api/auth    → auth-service     ──► auth_db
                 └── /api/estoque → estoque-service xN ─► estoque_db
                                                          ▲  (tabela outbox)
                                    notificacao-worker ───┘
```

## Estrutura de pastas
```
docker-compose.yml          sobe tudo
gateway/nginx.conf          API Gateway + balanceamento + rate limit
infra/postgres/init.sql     cria auth_db e estoque_db (bancos segregados)
frontend/                   Quasar (Vue 3) via CDN: index.html, css/app.css, js/ApiClient.js, js/app.js
services/
  auth-service/src/         login, cadastro, JWT + refresh token
  estoque-service/src/      produtos, movimentações, lock otimista, outbox
  notificacao-worker/src/   lê a outbox e gera alertas de estoque baixo
testes/carga-k6.js          teste de concorrência
```
Cada serviço segue as camadas: `routes → controllers → services → repositories → banco`,
com `models/` (entidades), `middlewares/`, `errors/` e `config/`.

## Como cada requisito é atendido
| Requisito | Onde |
|---|---|
| API REST | rotas em `*/src/routes` (GET/POST, JSON, status HTTP corretos) |
| Login separado | `auth-service` próprio; o estoque só valida o JWT (`middlewares/autenticar.js`) |
| Banco segregado na nuvem | `auth_db` e `estoque_db`; troque a `DATABASE_URL` por Neon/Supabase/RDS |
| Concorrência | lock otimista (coluna `versao`) + retry em `EstoqueService.movimentar` |
| Escala horizontal | serviços sem estado + `--scale` + nginx balanceando; header `X-Instancia` |
| Mensageria via BD | Outbox Pattern + `FOR UPDATE SKIP LOCKED` no `OutboxWorker` |
| Microsserviços | 3 serviços independentes, cada um com seu Dockerfile |

## Orientação a Objetos
- **Classes por camada:** `UsuarioRepository`, `AuthService`, `AuthController`, `ProdutoRepository`, `EstoqueService`...
- **Encapsulamento:** campos/métodos privados (`#senhaHash`, `#gerarTokens`, `#validarQuantidade`).
- **Regra no objeto:** `Produto.darSaida()` impede estoque negativo.
- **Herança:** `AppError` → `NaoEncontradoError`, `ConflitoError`...
- **Classe abstrata + polimorfismo:** `EventoHandler` → `EstoqueBaixoHandler`, `EstoqueMovimentadoHandler`.
- **Singleton:** `Database.get()`.
- **Injeção de dependência:** cada `index.js` monta Repository → Service → Controller.

## Front-end (Quasar + Vue 3)
Sem etapa de build: o Quasar vem por CDN e o nginx serve os arquivos.
- `index.html`: templates das telas (login dividido, painel, produtos, movimentações, alertas, dialogs).
- `js/app.js`: estado e ações do Vue (composition API) + tema da marca.
- `js/ApiClient.js`: classe que conversa com a API e renova o token sozinha.
- `css/app.css`: tema corporativo (azul-marinho + laranja), cards, tabelas, responsivo.

## Endpoints
| Método | Rota (via gateway) | Auth |
|---|---|---|
| POST | /api/auth/registrar | — |
| POST | /api/auth/login | — |
| POST | /api/auth/renovar | — |
| GET | /api/estoque/produtos | JWT |
| POST | /api/estoque/produtos | JWT admin |
| GET | /api/estoque/movimentacoes | JWT |
| GET | /api/estoque/notificacoes | JWT |
| POST | /api/estoque/produtos/:id/movimentacoes | JWT (`{tipo: ENTRADA|SAIDA, quantidade}`) |

## Demonstração de concorrência
Com um produto de 100 unidades, 300 saídas simultâneas em 2 réplicas resultaram
em exatamente 100 aceitas, saldo final 0 e nunca negativo. Para repetir:
`k6 run -e TOKEN=<accessToken> -e PRODUTO=1 testes/carga-k6.js`
