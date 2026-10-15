/**
 * Confere o token do Firebase (ID token) que vem no header Authorization.
 * Recebe o auth() do firebase-admin por parametro (injecao de dependencia).
 */
function criarAutenticador(firebaseAuth) {
  return async function autenticar(req, res, next) {
    const [tipo, token] = (req.headers.authorization || '').split(' ');
    if (tipo !== 'Bearer' || !token) return res.status(401).json({ erro: 'Token ausente' });
    try {
      const dados = await firebaseAuth.verifyIdToken(token);
      req.usuario = { id: dados.uid, nome: dados.name, email: dados.email, papel: dados.papel || 'operador' };
      next();
    } catch {
      res.status(401).json({ erro: 'Token invalido ou expirado' });
    }
  };
}

function exigirPapel(...papeis) {
  return (req, res, next) =>
    papeis.includes(req.usuario.papel) ? next() : res.status(403).json({ erro: 'Sem permissao' });
}

module.exports = { criarAutenticador, exigirPapel };
