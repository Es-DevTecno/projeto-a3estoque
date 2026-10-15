/** Erro de aplicacao com status HTTP. Heranca: AppError extends Error. */
class AppError extends Error {
  constructor(mensagem, status = 400) {
    super(mensagem);
    this.name = 'AppError';
    this.status = status;
  }
}

class NaoEncontradoError extends AppError {
  constructor(mensagem = 'Recurso nao encontrado') { super(mensagem, 404); }
}

class NaoAutorizadoError extends AppError {
  constructor(mensagem = 'Nao autorizado') { super(mensagem, 401); }
}

class ConflitoError extends AppError {
  constructor(mensagem = 'Conflito') { super(mensagem, 409); }
}

module.exports = { AppError, NaoEncontradoError, NaoAutorizadoError, ConflitoError };
