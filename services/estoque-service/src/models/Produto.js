const { AppError } = require('../errors/AppError');

/**
 * Entidade Produto. A regra "nao pode sair mais do que tem" mora AQUI,
 * dentro do objeto, e nao espalhada pelos controllers.
 */
class Produto {
  constructor({ id, nome, sku, quantidade, estoque_minimo, versao }) {
    this.id = id;
    this.nome = nome;
    this.sku = sku;
    this.quantidade = quantidade;
    this.estoqueMinimo = estoque_minimo;
    this.versao = versao;
  }

  darEntrada(qtd) {
    this.#validarQuantidade(qtd);
    this.quantidade += qtd;
  }

  darSaida(qtd) {
    this.#validarQuantidade(qtd);
    if (qtd > this.quantidade) {
      throw new AppError(`Estoque insuficiente: ha ${this.quantidade} unidade(s) de ${this.nome}`, 422);
    }
    this.quantidade -= qtd;
  }

  estaAbaixoDoMinimo() {
    return this.quantidade <= this.estoqueMinimo;
  }

  #validarQuantidade(qtd) {
    if (!Number.isInteger(qtd) || qtd <= 0) throw new AppError('Quantidade deve ser um inteiro positivo');
  }
}

module.exports = Produto;
