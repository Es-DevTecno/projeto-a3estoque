const { AppError, NaoAutorizadoError } = require('../errors/AppError');

/**
 * Conversa com a API REST do Firebase Authentication
 * (login com e-mail/senha e renovacao de token).
 * Com o emulador ligado, as chamadas vao para ele em vez do Google.
 */
class FirebaseAuthGateway {
  constructor(apiKey, emuladorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    if (!apiKey) throw new Error('Defina FIREBASE_API_KEY no arquivo .env');
    this.apiKey = apiKey;
    const prefixo = emuladorHost ? `http://${emuladorHost}/` : 'https://';
    this.urlLogin = `${prefixo}identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
    this.urlToken = `${prefixo}securetoken.googleapis.com/v1/token?key=${apiKey}`;
  }

  async entrar(email, senha) {
    const dados = await this.#post(this.urlLogin, { email, password: senha, returnSecureToken: true });
    return { uid: dados.localId, idToken: dados.idToken, refreshToken: dados.refreshToken };
  }

  async renovar(refreshToken) {
    const dados = await this.#post(this.urlToken, { grant_type: 'refresh_token', refresh_token: refreshToken });
    return { uid: dados.user_id, idToken: dados.id_token, refreshToken: dados.refresh_token };
  }

  async #post(url, corpo) {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
    });
    const dados = await resp.json().catch(() => ({}));
    if (!resp.ok) throw FirebaseAuthGateway.traduzirErro(dados.error?.message || '');
    return dados;
  }

  /** Transforma os codigos do Firebase em mensagens em portugues. */
  static traduzirErro(codigo) {
    if (/INVALID_LOGIN_CREDENTIALS|INVALID_PASSWORD|EMAIL_NOT_FOUND|INVALID_EMAIL/.test(codigo)) {
      return new NaoAutorizadoError('E-mail ou senha invalidos');
    }
    if (/TOKEN_EXPIRED|INVALID_REFRESH_TOKEN|USER_NOT_FOUND|USER_DISABLED/.test(codigo)) {
      return new NaoAutorizadoError('Sessao expirada, entre novamente');
    }
    if (/TOO_MANY_ATTEMPTS/.test(codigo)) return new AppError('Muitas tentativas. Aguarde um pouco.', 429);
    return new AppError(`Erro no Firebase: ${codigo || 'desconhecido'}`, 502);
  }
}

module.exports = FirebaseAuthGateway;
