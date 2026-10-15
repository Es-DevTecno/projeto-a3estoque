const { Pool } = require('pg');

/**
 * Classe Database (padrao Singleton): uma unica pool de conexoes por processo.
 * A pool e o que permite atender muitos acessos simultaneos sem abrir
 * uma conexao nova a cada requisicao.
 */
class Database {
  static #instancia = null;

  constructor(connectionString) {
    this.pool = new Pool({ connectionString, max: 10 });
  }

  static get() {
    if (!Database.#instancia) {
      Database.#instancia = new Database(process.env.DATABASE_URL);
    }
    return Database.#instancia;
  }

  query(sql, params) {
    return this.pool.query(sql, params);
  }

  /** Executa uma funcao dentro de uma transacao (BEGIN/COMMIT/ROLLBACK). */
  async transacao(fn) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const resultado = await fn(client);
      await client.query('COMMIT');
      return resultado;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /** Tenta conectar algumas vezes (o banco pode demorar a subir). */
  async aguardarConexao(tentativas = 10) {
    for (let i = 1; i <= tentativas; i++) {
      try { await this.query('SELECT 1'); return; }
      catch (e) { console.log(`Banco indisponivel (${i}/${tentativas})...`); await new Promise(r => setTimeout(r, 2000)); }
    }
    throw new Error('Nao foi possivel conectar ao banco');
  }
}

module.exports = Database;
