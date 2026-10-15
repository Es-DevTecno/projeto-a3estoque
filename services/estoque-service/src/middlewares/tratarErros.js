const { AppError } = require('../errors/AppError');

/** Middleware central de erros: transforma excecoes em respostas JSON. */
module.exports = function tratarErros(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ erro: err.message });
  }
  console.error(err);
  res.status(500).json({ erro: 'Erro interno' });
};
