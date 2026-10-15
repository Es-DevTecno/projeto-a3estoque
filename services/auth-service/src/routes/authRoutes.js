const { Router } = require('express');
const { exigirPapel } = require('../middlewares/autenticar');

module.exports = function authRoutes(controller, autenticar) {
  const router = Router();
  router.post('/registrar', controller.registrar);
  router.post('/login', controller.login);
  router.post('/renovar', controller.renovar);
  router.get('/me', autenticar, controller.eu);
  router.get('/usuarios', autenticar, exigirPapel('admin'), controller.listarUsuarios);
  router.patch('/usuarios/:id/papel', autenticar, exigirPapel('admin'), controller.alterarPapel);
  return router;
};
