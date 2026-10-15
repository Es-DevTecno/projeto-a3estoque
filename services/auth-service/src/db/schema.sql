CREATE TABLE IF NOT EXISTS usuarios (
  id          SERIAL PRIMARY KEY,
  nome        VARCHAR(100) NOT NULL,
  email       VARCHAR(150) NOT NULL UNIQUE,
  senha_hash  VARCHAR(100) NOT NULL,
  papel       VARCHAR(20)  NOT NULL DEFAULT 'operador',  -- 'admin' ou 'operador'
  criado_em   TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  token       VARCHAR(200) PRIMARY KEY,
  usuario_id  INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  expira_em   TIMESTAMP NOT NULL
);
