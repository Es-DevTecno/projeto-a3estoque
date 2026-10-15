const Produto = require('../models/Produto');

class ProdutoRepository {
  constructor(db) { this.db = db; }

  async listar() {
    const { rows } = await this.db.query('SELECT * FROM produtos ORDER BY nome');
    return rows.map(r => new Produto(r));
  }

  async buscarPorId(id, client = this.db) {
    const { rows } = await client.query('SELECT * FROM produtos WHERE id = $1', [id]);
    return rows[0] ? new Produto(rows[0]) : null;
  }

  async criar({ nome, sku, quantidade = 0, estoqueMinimo = 5 }) {
    const { rows } = await this.db.query(
      `INSERT INTO produtos (nome, sku, quantidade, estoque_minimo)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [nome, sku, quantidade, estoqueMinimo]
    );
    return new Produto(rows[0]);
  }

  /**
   * LOCK OTIMISTA: so atualiza se a versao ainda for a que lemos.
   * Se outra requisicao mexeu antes, rowCount = 0 e sabemos que houve conflito.
   */
  async atualizarQuantidade(produto, client) {
    const { rowCount } = await client.query(
      `UPDATE produtos
          SET quantidade = $1, versao = versao + 1, atualizado_em = NOW()
        WHERE id = $2 AND versao = $3`,
      [produto.quantidade, produto.id, produto.versao]
    );
    return rowCount === 1;
  }

  async listarMovimentacoes(limite = 50) {
    const { rows } = await this.db.query(
      `SELECT m.id, m.tipo, m.quantidade, m.usuario_id AS "usuarioId", to_char(m.criado_em AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "criadoEm",
              p.nome AS produto, p.sku
         FROM movimentacoes m JOIN produtos p ON p.id = m.produto_id
        ORDER BY m.id DESC LIMIT $1`, [limite]);
    return rows;
  }

  async listarNotificacoes(limite = 20) {
    const { rows } = await this.db.query(
      `SELECT id, mensagem, to_char(criado_em AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "criadoEm" FROM notificacoes ORDER BY id DESC LIMIT $1`, [limite]);
    return rows;
  }

  async registrarMovimentacao({ produtoId, tipo, quantidade, usuarioId }, client) {
    await client.query(
      'INSERT INTO movimentacoes (produto_id, tipo, quantidade, usuario_id) VALUES ($1, $2, $3, $4)',
      [produtoId, tipo, quantidade, usuarioId]
    );
  }
}

module.exports = ProdutoRepository;
