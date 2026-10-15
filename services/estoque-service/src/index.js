const fs = require('fs');
const path = require('path');
const os = require('os');
const express = require('express');

const Database = require('./config/Database');
const ProdutoRepository = require('./repositories/ProdutoRepository');
const OutboxRepository = require('./repositories/OutboxRepository');
const EstoqueService = require('./services/EstoqueService');
const ProdutoController = require('./controllers/ProdutoController');
const produtoRoutes = require('./routes/produtoRoutes');
const tratarErros = require('./middlewares/tratarErros');

async function main() {
  const db = Database.get();
  await db.aguardarConexao();
  // Lock consultivo: se 3 replicas sobem juntas, so uma cria as tabelas por vez.
  await db.transacao(async (c) => {
    await c.query('SELECT pg_advisory_xact_lock(42)');
    await c.query(fs.readFileSync(path.join(__dirname, 'db/schema.sql'), 'utf8'));
  });

  const service = new EstoqueService(db, new ProdutoRepository(db), new OutboxRepository());
  const controller = new ProdutoController(service);

  const app = express();
  app.use(express.json());
  // Header que mostra QUAL replica respondeu (prova da escala horizontal)
  app.use((req, res, next) => { res.set('X-Instancia', os.hostname()); next(); });
  app.get('/health', (req, res) => res.json({ status: 'ok', servico: 'estoque', instancia: os.hostname() }));
  app.use('/', produtoRoutes(controller));
  app.use(tratarErros);

  const porta = process.env.PORT || 3002;
  app.listen(porta, () => console.log(`estoque-service (${os.hostname()}) ouvindo na porta ${porta}`));
}

main().catch(err => { console.error(err); process.exit(1); });
