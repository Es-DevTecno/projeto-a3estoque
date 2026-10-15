/** Publica eventos na tabela outbox (a "fila" que mora no banco). */
class OutboxRepository {
  async publicar(tipoEvento, payload, client) {
    await client.query(
      'INSERT INTO outbox (tipo_evento, payload) VALUES ($1, $2)',
      [tipoEvento, JSON.stringify(payload)]
    );
  }
}

module.exports = OutboxRepository;
