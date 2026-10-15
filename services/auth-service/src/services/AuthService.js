const { AppError, ConflitoError, NaoAutorizadoError, NaoEncontradoError } = require('../errors/AppError');

/**
 * Regras de negocio do login.
 * - Quem guarda e confere a SENHA e o Firebase Authentication.
 * - O PERFIL (nome, papel) fica no Firestore.
 * - O papel tambem vai dentro do token (custom claim), assim o
 *   estoque-service descobre se e admin sem consultar este servico.
 */
class AuthService {
  constructor({ firebaseAuth, usuarioRepository, authGateway }) {
    this.firebaseAuth = firebaseAuth;     // firebase-admin auth()
    this.repo = usuarioRepository;        // Firestore
    this.gateway = authGateway;           // API REST de login
  }

  async registrar({ nome, email, senha }) {
    if (!nome || !email || !senha) throw new AppError('nome, email e senha sao obrigatorios');
    if (senha.length < 6) throw new AppError('A senha precisa ter pelo menos 6 caracteres');

    let conta;
    try {
      conta = await this.firebaseAuth.createUser({ email, password: senha, displayName: nome });
    } catch (e) {
      if (e.code === 'auth/email-already-exists') throw new ConflitoError('E-mail ja cadastrado');
      if (e.code === 'auth/invalid-email') throw new AppError('E-mail invalido');
      throw e;
    }

    try {
      const usuario = await this.repo.criarPerfil({ id: conta.uid, nome, email });
      await this.firebaseAuth.setCustomUserClaims(conta.uid, { papel: usuario.papel });
      return usuario;
    } catch (e) {
      // Compensacao: se o perfil falhou, desfaz a conta para nao ficar "meio cadastrado".
      await this.firebaseAuth.deleteUser(conta.uid).catch(() => {});
      throw e;
    }
  }

  async login({ email, senha }) {
    if (!email || !senha) throw new NaoAutorizadoError('E-mail ou senha invalidos');
    let sessao = await this.gateway.entrar(email, senha);
    let usuario = await this.repo.buscarPorId(sessao.uid);
    if (!usuario) {
      // Conta criada direto no Console do Firebase: cria o perfil agora
      // e entra de novo para o token ja vir com o papel.
      usuario = await this.#criarPerfilFaltante(sessao.uid);
      sessao = await this.gateway.entrar(email, senha);
    }
    return { accessToken: sessao.idToken, refreshToken: sessao.refreshToken, usuario };
  }

  async renovar(refreshToken) {
    if (!refreshToken) throw new NaoAutorizadoError('Refresh token ausente');
    const sessao = await this.gateway.renovar(refreshToken);
    const usuario = await this.repo.buscarPorId(sessao.uid);
    return { accessToken: sessao.idToken, refreshToken: sessao.refreshToken, usuario };
  }

  async perfil(uid) {
    const usuario = await this.repo.buscarPorId(uid);
    if (!usuario) throw new NaoEncontradoError('Perfil nao encontrado');
    return usuario;
  }

  async #criarPerfilFaltante(uid) {
    const conta = await this.firebaseAuth.getUser(uid);
    const nome = conta.displayName || conta.email.split('@')[0];
    const usuario = await this.repo.criarPerfil({ id: uid, nome, email: conta.email });
    await this.firebaseAuth.setCustomUserClaims(uid, { papel: usuario.papel });
    return usuario;
  }

  listarUsuarios() { return this.repo.listar(); }

  async alterarPapel(uid, papel) {
    if (!['admin', 'operador'].includes(papel)) throw new AppError('papel deve ser admin ou operador');
    if (!(await this.repo.buscarPorId(uid))) throw new NaoEncontradoError('Usuario nao encontrado');
    await this.firebaseAuth.setCustomUserClaims(uid, { papel });
    return this.repo.alterarPapel(uid, papel); // vale no proximo login/renovacao do usuario
  }
}

module.exports = AuthService;
