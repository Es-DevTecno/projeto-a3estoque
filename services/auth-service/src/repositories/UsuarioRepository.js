const Usuario = require('../models/Usuario');

/** Repository: unica classe que conversa com a tabela "usuarios". */
class UsuarioRepository {
  constructor(db) { this.db = db; }

  async buscarPorEmail(email) {
    const { rows } = await this.db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    return rows[0] ? new Usuario(rows[0]) : null;
  }

  async buscarPorId(id) {
    const { rows } = await this.db.query('SELECT * FROM usuarios WHERE id = $1', [id]);
    return rows[0] ? new Usuario(rows[0]) : null;
  }

  async contar() {
    const { rows } = await this.db.query('SELECT COUNT(*)::int AS total FROM usuarios');
    return rows[0].total;
  }

  async criar({ nome, email, senhaHash, papel }) {
    const { rows } = await this.db.query(
      `INSERT INTO usuarios (nome, email, senha_hash, papel)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [nome, email, senhaHash, papel]
    );
    return new Usuario(rows[0]);
  }

  async salvarRefreshToken(token, usuarioId, expiraEm) {
    await this.db.query(
      'INSERT INTO refresh_tokens (token, usuario_id, expira_em) VALUES ($1, $2, $3)',
      [token, usuarioId, expiraEm]
    );
  }

  /** Consome (apaga) o refresh token e devolve o dono, se for valido. */
  async consumirRefreshToken(token) {
    const { rows } = await this.db.query(
      'DELETE FROM refresh_tokens WHERE token = $1 AND expira_em > NOW() RETURNING usuario_id',
      [token]
    );
    return rows[0] ? rows[0].usuario_id : null;
  }
}

module.exports = UsuarioRepository;
