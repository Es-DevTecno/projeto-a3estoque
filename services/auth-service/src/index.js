const os = require('os');
const express = require('express');

const Firebase = require('./config/Firebase');
const UsuarioRepository = require('./repositories/UsuarioRepository');
const FirebaseAuthGateway = require('./services/FirebaseAuthGateway');
const AuthService = require('./services/AuthService');
const AuthController = require('./controllers/AuthController');
const authRoutes = require('./routes/authRoutes');
const { criarAutenticador } = require('./middlewares/autenticar');
const tratarErros = require('./middlewares/tratarErros');

/** Monta o app recebendo as dependencias (facilita testar com objetos falsos). */
function criarApp({ firebaseAuth, usuarioRepository, authGateway }) {
  const service = new AuthService({ firebaseAuth, usuarioRepository, authGateway });
  const controller = new AuthController(service);

  const app = express();
  app.use(express.json());
  app.get('/health', (req, res) => res.json({ status: 'ok', servico: 'auth', instancia: os.hostname() }));
  app.use('/', authRoutes(controller, criarAutenticador(firebaseAuth)));
  app.use(tratarErros);
  return app;
}

if (require.main === module) {
  const app = criarApp({
    firebaseAuth: Firebase.auth(),
    usuarioRepository: new UsuarioRepository(Firebase.firestore()),
    authGateway: new FirebaseAuthGateway(process.env.FIREBASE_API_KEY),
  });
  const porta = process.env.PORT || 3001;
  app.listen(porta, () => console.log(`auth-service (Firebase) ouvindo na porta ${porta}`));
}

module.exports = { criarApp };
