const jwt = require('jsonwebtoken');

/**
 * O estoque NAO consulta o banco de login: ele so confere a assinatura do JWT
 * com o segredo compartilhado. Por isso os servicos ficam independentes.
 */
function autenticar(req, res, next) {
  const [tipo, token] = (req.headers.authorization || '').split(' ');
  if (tipo !== 'Bearer' || !token) return res.status(401).json({ erro: 'Token ausente' });
  try {
    const dados = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = { id: dados.sub, nome: dados.nome, papel: dados.papel };
    next();
  } catch {
    res.status(401).json({ erro: 'Token invalido ou expirado' });
  }
}

/** Autorizacao por papel: exigirPapel('admin') */
function exigirPapel(...papeis) {
  return (req, res, next) =>
    papeis.includes(req.usuario.papel) ? next() : res.status(403).json({ erro: 'Sem permissao' });
}

module.exports = { autenticar, exigirPapel };
