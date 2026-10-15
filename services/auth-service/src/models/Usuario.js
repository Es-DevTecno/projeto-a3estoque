/**
 * Entidade Usuario (modelo de dominio).
 * Encapsulamento: o hash da senha fica num campo privado (#senhaHash)
 * e nunca sai no JSON da resposta.
 */
class Usuario {
  #senhaHash;

  constructor({ id, nome, email, senha_hash, papel, criado_em }) {
    this.id = id;
    this.nome = nome;
    this.email = email;
    this.papel = papel;
    this.criadoEm = criado_em;
    this.#senhaHash = senha_hash;
  }

  get senhaHash() { return this.#senhaHash; }

  ehAdmin() { return this.papel === 'admin'; }

  toJSON() {
    return { id: this.id, nome: this.nome, email: this.email, papel: this.papel };
  }
}

module.exports = Usuario;
