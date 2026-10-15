# A3 Estoque – Microsserviços

Sistema de controle de estoque com login separado, bancos segregados,
concorrência segura, escala horizontal e mensageria via banco de dados.

## Passo 0: criar o Firebase (só uma vez)
O login usa **Firebase Authentication** e os perfis dos usuários ficam no **Firestore**.
1. Entre em https://console.firebase.google.com e clique em **Criar projeto** (pode desligar o Analytics).
2. Menu **Criação > Authentication > Vamos começar > E-mail/senha > Ativar > Salvar**.
3. Menu **Criação > Firestore Database > Criar banco de dados**, escolha `southamerica-east1 (São Paulo)` e **modo de produção**.
4. Engrenagem **> Configurações do projeto > Geral**: copie o **ID do projeto** e a **Chave de API da Web**.
   (Se a chave não aparecer, clique no ícone `</>` para registrar um app da Web e ela surge.)
5. Mesma tela, aba **Contas de serviço > Gerar nova chave privada**. Renomeie o arquivo baixado para
   `service-account.json` e coloque na pasta `firebase/` (ele NÃO vai para o GitHub).
6. Na raiz do projeto: `cp .env.example .env` e preencha `FIREBASE_PROJECT_ID` e `FIREBASE_API_KEY`.

## Como rodar
Pré-requisito: Docker + Docker Compose e o Passo 0 feito.

```bash
docker compose up --build                              # 1 réplica de cada
docker compose up --build --scale estoque-service=3    # 3 réplicas do estoque
```
Abra http://localhost:8080 , crie uma conta (a primeira vira **admin**) e entre.

## Testar a API no Postman
Importe `postman/A3-Estoque.postman_collection.json` (Postman > Import) e rode em ordem.
O Login salva o token sozinho; a pasta Segurança mostra o 401 sem token.

## Arquitetura
```
Navegador ──► gateway (nginx :8080)
                 ├── /            → frontend (HTML/JS)
                 ├── /api/auth    → auth-service     ──► Firebase Auth (senhas) + Firestore (perfis)
                 └── /api/estoque → estoque-service xN ─► estoque_db
                                                          ▲  (tabela outbox)
                                    notificacao-worker ───┘
```

## Estrutura de pastas
```
docker-compose.yml          sobe tudo
gateway/nginx.conf          API Gateway + balanceamento + rate limit
infra/postgres/init.sql     cria estoque_db (usuários ficam no Firestore)
firebase/                   coloque aqui o service-account.json (ignorado pelo git)
frontend/                   Quasar (Vue 3) via CDN: index.html, css/app.css, js/ApiClient.js, js/app.js
services/
  auth-service/src/         login/cadastro via Firebase Auth, perfis no Firestore
  estoque-service/src/      produtos, movimentações, lock otimista, outbox
  notificacao-worker/src/   lê a outbox e gera alertas de estoque baixo
testes/carga-k6.js          teste de concorrência
postman/                    coleção pronta para o Postman
```
Cada serviço segue as camadas: `routes → controllers → services → repositories → banco`,
com `models/` (entidades), `middlewares/`, `errors/` e `config/`.

## Como cada requisito é atendido
| Requisito | Onde |
|---|---|
| API REST | rotas em `*/src/routes` (GET/POST, JSON, status HTTP corretos) |
| Login separado | `auth-service` + Firebase Authentication; o estoque só confere o token do Firebase (`middlewares/autenticar.js`) |
| Banco segregado na nuvem | usuários no **Firestore** (nuvem, NoSQL) e estoque no **PostgreSQL** (`DATABASE_URL` pode ir pro Neon/Supabase) |
| Concorrência | lock otimista (coluna `versao`) + retry em `EstoqueService.movimentar` |
| Escala horizontal | serviços sem estado + `--scale` + nginx balanceando; header `X-Instancia` |
| Mensageria via BD | Outbox Pattern + `FOR UPDATE SKIP LOCKED` no `OutboxWorker` |
| Microsserviços | 3 serviços independentes, cada um com seu Dockerfile |

## Orientação a Objetos
- **Classes por camada:** `UsuarioRepository` (Firestore), `FirebaseAuthGateway`, `AuthService`, `AuthController`, `ProdutoRepository`, `EstoqueService`...
- **Encapsulamento:** campos/métodos privados (`#app` no singleton `Firebase`, `#post`, `#criarPerfilFaltante`, `#validarQuantidade`).
- **Regra no objeto:** `Produto.darSaida()` impede estoque negativo.
- **Herança:** `AppError` → `NaoEncontradoError`, `ConflitoError`...
- **Classe abstrata + polimorfismo:** `EventoHandler` → `EstoqueBaixoHandler`, `EstoqueMovimentadoHandler`.
- **Singleton:** `Database.get()` e `Firebase.app()`.
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
| GET | /api/auth/me | token |
| GET | /api/auth/usuarios | token admin |
| PATCH | /api/auth/usuarios/:id/papel | token admin (`{papel: admin|operador}`) |
| GET | /api/estoque/produtos | token |
| POST | /api/estoque/produtos | token admin |
| GET | /api/estoque/movimentacoes | token |
| GET | /api/estoque/notificacoes | token |
| POST | /api/estoque/produtos/:id/movimentacoes | token (`{tipo: ENTRADA|SAIDA, quantidade}`) |

## Demonstração de concorrência
Com um produto de 100 unidades, 300 saídas simultâneas em 2 réplicas resultaram
em exatamente 100 aceitas, saldo final 0 e nunca negativo. Para repetir:
`k6 run -e TOKEN=<accessToken> -e PRODUTO=1 testes/carga-k6.js`

## Como o Firebase entra no login
1. **Cadastro** (`POST /api/auth/registrar`): o auth-service cria a conta no Firebase Authentication
   (ele guarda a senha), grava o perfil em `usuarios/{uid}` no Firestore numa **transação**
   (o primeiro vira admin, mesmo com cadastros simultâneos) e coloca o papel dentro do token (*custom claim*).
   Se o Firestore falhar, a conta é apagada (compensação).
2. **Login** (`POST /api/auth/login`): o Firebase confere a senha e devolve o token (vale 1 hora) + refresh token.
3. **Estoque**: só confere a assinatura do token com as chaves públicas do Google. Não precisa de senha nem de credencial.
4. **Usuários** (tela só para admin): lista os perfis do Firestore e permite trocar operador/admin.
