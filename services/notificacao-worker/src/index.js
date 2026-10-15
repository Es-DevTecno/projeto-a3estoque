const Database = require('./config/Database');
const OutboxWorker = require('./OutboxWorker');
const { EstoqueBaixoHandler, EstoqueMovimentadoHandler } = require('./handlers/EventoHandler');

async function main() {
  const db = Database.get();
  await db.aguardarConexao();
  // espera o estoque-service criar as tabelas
  for (;;) {
    const { rows } = await db.query("SELECT to_regclass('public.outbox') AS t");
    if (rows[0].t) break;
    await new Promise(r => setTimeout(r, 2000));
  }

  const worker = new OutboxWorker(db, {
    EstoqueBaixo: new EstoqueBaixoHandler(db),
    EstoqueMovimentado: new EstoqueMovimentadoHandler(db),
  });
  process.on('SIGTERM', () => worker.parar());
  await worker.iniciar();
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
