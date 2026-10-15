const { Router } = require('express');

module.exports = function authRoutes(controller) {
  const router = Router();
  router.post('/registrar', controller.registrar);
  router.post('/login', controller.login);
  router.post('/renovar', controller.renovar);
  return router;
};
