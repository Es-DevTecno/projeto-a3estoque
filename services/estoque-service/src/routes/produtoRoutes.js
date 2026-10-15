const { Router } = require('express');
const { autenticar, exigirPapel } = require('../middlewares/autenticar');

module.exports = function produtoRoutes(controller) {
  const router = Router();
  router.use(autenticar);                                   // tudo exige login
  router.get('/produtos', controller.listar);
  router.post('/produtos', exigirPapel('admin'), controller.criar);
  router.post('/produtos/:id/movimentacoes', controller.movimentar);
  router.get('/movimentacoes', controller.movimentacoes);
  router.get('/notificacoes', controller.notificacoes);
  return router;
};
