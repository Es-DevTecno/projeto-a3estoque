class ProdutoController {
  constructor(estoqueService) { this.service = estoqueService; }

  listar = async (req, res, next) => {
    try { res.json(await this.service.listar()); } catch (e) { next(e); }
  };

  movimentacoes = async (req, res, next) => {
    try { res.json(await this.service.listarMovimentacoes()); } catch (e) { next(e); }
  };

  notificacoes = async (req, res, next) => {
    try { res.json(await this.service.listarNotificacoes()); } catch (e) { next(e); }
  };

  criar = async (req, res, next) => {
    try { res.status(201).json(await this.service.criarProduto(req.body)); } catch (e) { next(e); }
  };

  movimentar = async (req, res, next) => {
    try {
      const produto = await this.service.movimentar({
        produtoId: Number(req.params.id),
        tipo: req.body.tipo,
        quantidade: Number(req.body.quantidade),
        usuarioId: req.usuario.id,
      });
      res.json(produto);
    } catch (e) { next(e); }
  };
}

module.exports = ProdutoController;
