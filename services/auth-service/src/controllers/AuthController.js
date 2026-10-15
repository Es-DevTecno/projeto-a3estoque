/**
 * Controller: traduz HTTP <-> chamadas do service.
 * Nao tem regra de negocio aqui, so le o req e monta o res.
 */
class AuthController {
  constructor(authService) { this.service = authService; }

  registrar = async (req, res, next) => {
    try { res.status(201).json(await this.service.registrar(req.body)); }
    catch (e) { next(e); }
  };

  login = async (req, res, next) => {
    try { res.json(await this.service.login(req.body)); }
    catch (e) { next(e); }
  };

  renovar = async (req, res, next) => {
    try { res.json(await this.service.renovar(req.body.refreshToken)); }
    catch (e) { next(e); }
  };

  eu = async (req, res, next) => {
    try { res.json(await this.service.perfil(req.usuario.id)); }
    catch (e) { next(e); }
  };

  listarUsuarios = async (req, res, next) => {
    try { res.json(await this.service.listarUsuarios()); }
    catch (e) { next(e); }
  };

  alterarPapel = async (req, res, next) => {
    try { res.json(await this.service.alterarPapel(req.params.id, req.body.papel)); }
    catch (e) { next(e); }
  };
}

module.exports = AuthController;
