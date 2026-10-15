/**
 * Consumidor da "fila" no banco.
 * FOR UPDATE SKIP LOCKED: varios workers podem rodar ao mesmo tempo
 * sem pegar o mesmo evento (cada um pula as linhas que outro ja travou).
 */
class OutboxWorker {
  constructor(db, handlers, { lote = 10, intervaloMs = 1000, maxTentativas = 5 } = {}) {
    this.db = db;
    this.handlers = handlers; // { EstoqueBaixo: handler, ... }
    this.lote = lote;
    this.intervaloMs = intervaloMs;
    this.maxTentativas = maxTentativas;
    this.rodando = false;
  }

  async iniciar() {
    this.rodando = true;
    console.log('notificacao-worker iniciado');
    while (this.rodando) {
      const processados = await this.processarLote().catch(e => { console.error(e); return 0; });
      if (processados === 0) await new Promise(r => setTimeout(r, this.intervaloMs));
    }
  }

  parar() { this.rodando = false; }

  async processarLote() {
    return this.db.transacao(async (client) => {
      const { rows } = await client.query(
        `SELECT * FROM outbox
          WHERE status = 'PENDENTE'
          ORDER BY id
          LIMIT $1
          FOR UPDATE SKIP LOCKED`,
        [this.lote]
      );

      for (const evento of rows) {
        const handler = this.handlers[evento.tipo_evento];
        try {
          await client.query('SAVEPOINT evento');
          if (handler) await handler.processar(evento.payload, client);
          await client.query(`UPDATE outbox SET status = 'PROCESSADO', processado_em = NOW() WHERE id = $1`, [evento.id]);
        } catch (err) {
          await client.query('ROLLBACK TO SAVEPOINT evento');
          const novoStatus = evento.tentativas + 1 >= this.maxTentativas ? 'ERRO' : 'PENDENTE';
          await client.query('UPDATE outbox SET tentativas = tentativas + 1, status = $2 WHERE id = $1', [evento.id, novoStatus]);
          console.error(`Falha no evento ${evento.id}:`, err.message);
        }
      }
      return rows.length;
    });
  }
}

module.exports = OutboxWorker;
