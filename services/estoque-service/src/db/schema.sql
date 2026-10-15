CREATE TABLE IF NOT EXISTS produtos (
  id              SERIAL PRIMARY KEY,
  nome            VARCHAR(120) NOT NULL,
  sku             VARCHAR(50)  NOT NULL UNIQUE,
  quantidade      INT NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
  estoque_minimo  INT NOT NULL DEFAULT 5,
  versao          INT NOT NULL DEFAULT 1,      -- usado no lock otimista
  atualizado_em   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS movimentacoes (
  id          SERIAL PRIMARY KEY,
  produto_id  INT NOT NULL REFERENCES produtos(id),
  tipo        VARCHAR(10) NOT NULL CHECK (tipo IN ('ENTRADA', 'SAIDA')),
  quantidade  INT NOT NULL CHECK (quantidade > 0),
  usuario_id  VARCHAR(128) NOT NULL,          -- uid do Firebase
  usuario_nome VARCHAR(120),
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ajuste para bancos criados na versao antiga (id numerico)
ALTER TABLE movimentacoes ALTER COLUMN usuario_id TYPE VARCHAR(128);
ALTER TABLE movimentacoes ADD COLUMN IF NOT EXISTS usuario_nome VARCHAR(120);

-- MENSAGERIA VIA BANCO (Outbox Pattern):
-- o evento e gravado na MESMA transacao da movimentacao,
-- e o notificacao-worker le esta tabela e processa.
CREATE TABLE IF NOT EXISTS outbox (
  id             BIGSERIAL PRIMARY KEY,
  tipo_evento    VARCHAR(50) NOT NULL,
  payload        JSONB NOT NULL,
  status         VARCHAR(15) NOT NULL DEFAULT 'PENDENTE',  -- PENDENTE, PROCESSADO, ERRO
  tentativas     INT NOT NULL DEFAULT 0,
  criado_em      TIMESTAMP NOT NULL DEFAULT NOW(),
  processado_em  TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_outbox_pendente ON outbox (status, id);

CREATE TABLE IF NOT EXISTS notificacoes (
  id          SERIAL PRIMARY KEY,
  mensagem    TEXT NOT NULL,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
