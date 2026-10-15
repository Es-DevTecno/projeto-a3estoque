const fs = require('fs');
const path = require('path');
const os = require('os');
const express = require('express');

const Database = require('./config/Database');
const UsuarioRepository = require('./repositories/UsuarioRepository');
const AuthService = require('./services/AuthService');
const AuthController = require('./controllers/AuthController');
const authRoutes = require('./routes/authRoutes');
const tratarErros = require('./middlewares/tratarErros');

async function main() {
  const db = Database.get();
  await db.aguardarConexao();
  await db.query(fs.readFileSync(path.join(__dirname, 'db/schema.sql'), 'utf8'));

  // Montagem das camadas: Repository -> Service -> Controller -> Rotas
  const repo = new UsuarioRepository(db);
  const service = new AuthService(repo, process.env.JWT_SECRET);
  const controller = new AuthController(service);

  const app = express();
  app.use(express.json());
  app.get('/health', (req, res) => res.json({ status: 'ok', servico: 'auth', instancia: os.hostname() }));
  app.use('/', authRoutes(controller));
  app.use(tratarErros);

  const porta = process.env.PORT || 3001;
  app.listen(porta, () => console.log(`auth-service ouvindo na porta ${porta}`));
}

main().catch(err => { console.error(err); process.exit(1); });
