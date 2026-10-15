const admin = require('firebase-admin');

/**
 * O estoque NAO consulta o servico de login nem o Firestore:
 * ele so confere a assinatura do token do Firebase (chaves publicas do Google).
 * So precisa do FIREBASE_PROJECT_ID; nenhuma senha ou credencial.
 * O papel (admin/operador) vem dentro do token, como "custom claim".
 */
const app = admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID });

async function autenticar(req, res, next) {
  const [tipo, token] = (req.headers.authorization || '').split(' ');
  if (tipo !== 'Bearer' || !token) return res.status(401).json({ erro: 'Token ausente' });
  try {
    const dados = await app.auth().verifyIdToken(token);
    req.usuario = { id: dados.uid, nome: dados.name, papel: dados.papel || 'operador' };
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
