const { AppError, NaoEncontradoError, ConflitoError } = require('../errors/AppError');
const { TipoMovimentacao } = require('../models/Movimentacao');

const MAX_TENTATIVAS = 10;

class EstoqueService {
  constructor(db, produtoRepository, outboxRepository) {
    this.db = db;
    this.produtos = produtoRepository;
    this.outbox = outboxRepository;
  }

  listar() { return this.produtos.listar(); }
  listarMovimentacoes() { return this.produtos.listarMovimentacoes(); }
  listarNotificacoes() { return this.produtos.listarNotificacoes(); }

  async criarProduto(dados) {
    if (!dados.nome || !dados.sku) throw new AppError('nome e sku sao obrigatorios');
    try { return await this.produtos.criar(dados); }
    catch (e) { if (e.code === '23505') throw new ConflitoError('SKU ja existe'); throw e; }
  }

  /**
   * Movimenta o estoque com seguranca sob CONCORRENCIA:
   * 1. le o produto (com a versao atual)
   * 2. aplica a regra no objeto (darEntrada / darSaida)
   * 3. grava so se ninguem mudou antes (lock otimista)
   * 4. na mesma transacao: registra a movimentacao e publica o evento no outbox
   * Se der conflito, tenta de novo (ate MAX_TENTATIVAS).
   */
  async movimentar({ produtoId, tipo, quantidade, usuarioId, usuarioNome }) {
    if (!Object.values(TipoMovimentacao).includes(tipo)) throw new AppError('tipo deve ser ENTRADA ou SAIDA');

    for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
      const resultado = await this.db.transacao(async (client) => {
        const produto = await this.produtos.buscarPorId(produtoId, client);
        if (!produto) throw new NaoEncontradoError('Produto nao encontrado');

        if (tipo === TipoMovimentacao.ENTRADA) produto.darEntrada(quantidade);
        else produto.darSaida(quantidade);

        const gravou = await this.produtos.atualizarQuantidade(produto, client);
        if (!gravou) return null; // conflito: alguem atualizou antes, vamos repetir

        await this.produtos.registrarMovimentacao({ produtoId, tipo, quantidade, usuarioId, usuarioNome }, client);
        await this.outbox.publicar('EstoqueMovimentado', { produtoId, tipo, quantidade, usuarioId, saldo: produto.quantidade }, client);
        if (produto.estaAbaixoDoMinimo()) {
          await this.outbox.publicar('EstoqueBaixo', { produtoId, nome: produto.nome, saldo: produto.quantidade, minimo: produto.estoqueMinimo }, client);
        }
        return produto;
      });

      if (resultado) return resultado;
      await new Promise(r => setTimeout(r, Math.random() * 20 * tentativa)); // pequena espera aleatoria
    }
    throw new ConflitoError('Muitas atualizacoes simultaneas, tente novamente');
  }
}

module.exports = EstoqueService;
