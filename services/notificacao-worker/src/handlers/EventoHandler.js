/**
 * Classe base (abstrata) para tratar eventos.
 * Polimorfismo: cada evento tem sua classe filha com o proprio "processar".
 */
class EventoHandler {
  constructor(db) {
    if (new.target === EventoHandler) throw new Error('EventoHandler e abstrata');
    this.db = db;
  }

  /** @abstract */
  async processar(payload, client) { throw new Error('Implemente processar()'); }
}

class EstoqueBaixoHandler extends EventoHandler {
  async processar({ nome, saldo, minimo }, client) {
    const msg = `ALERTA: ${nome} esta com ${saldo} unidade(s) (minimo ${minimo})`;
    await client.query('INSERT INTO notificacoes (mensagem) VALUES ($1)', [msg]);
    console.log(msg); // aqui poderia ser e-mail, Telegram, etc.
  }
}

class EstoqueMovimentadoHandler extends EventoHandler {
  async processar({ produtoId, tipo, quantidade, saldo }) {
    console.log(`Movimentacao: produto ${produtoId} ${tipo} ${quantidade} (saldo ${saldo})`);
  }
}

module.exports = { EventoHandler, EstoqueBaixoHandler, EstoqueMovimentadoHandler };
