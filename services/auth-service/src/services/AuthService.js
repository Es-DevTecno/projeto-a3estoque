const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { AppError, NaoAutorizadoError, ConflitoError } = require('../errors/AppError');

/**
 * Regras de negocio de autenticacao.
 * Recebe o repository pelo construtor (injecao de dependencia),
 * entao nao sabe nada de SQL, e fica facil de testar.
 */
class AuthService {
  constructor(usuarioRepository, jwtSecret) {
    this.repo = usuarioRepository;
    this.jwtSecret = jwtSecret;
  }

  async registrar({ nome, email, senha }) {
    if (!nome || !email || !senha) throw new AppError('nome, email e senha sao obrigatorios');
    if (senha.length < 6) throw new AppError('A senha precisa ter pelo menos 6 caracteres');
    if (await this.repo.buscarPorEmail(email)) throw new ConflitoError('E-mail ja cadastrado');

    // O primeiro usuario do sistema vira admin (pratico para a demonstracao).
    const papel = (await this.repo.contar()) === 0 ? 'admin' : 'operador';
    const senhaHash = await bcrypt.hash(senha, 10);
    return this.repo.criar({ nome, email, senhaHash, papel });
  }

  async login({ email, senha }) {
    const usuario = await this.repo.buscarPorEmail(email || '');
    if (!usuario || !(await bcrypt.compare(senha || '', usuario.senhaHash))) {
      throw new NaoAutorizadoError('E-mail ou senha invalidos');
    }
    return this.#gerarTokens(usuario);
  }

  async renovar(refreshToken) {
    const usuarioId = await this.repo.consumirRefreshToken(refreshToken || '');
    if (!usuarioId) throw new NaoAutorizadoError('Refresh token invalido ou expirado');
    const usuario = await this.repo.buscarPorId(usuarioId);
    return this.#gerarTokens(usuario);
  }

  /** Metodo privado: access token curto (15 min) + refresh token longo (7 dias). */
  async #gerarTokens(usuario) {
    const accessToken = jwt.sign(
      { sub: usuario.id, nome: usuario.nome, papel: usuario.papel },
      this.jwtSecret,
      { expiresIn: '15m' }
    );
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const expira = new Date(Date.now() + 7 * 24 * 3600 * 1000);
    await this.repo.salvarRefreshToken(refreshToken, usuario.id, expira);
    return { accessToken, refreshToken, usuario };
  }
}

module.exports = AuthService;
