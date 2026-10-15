/** Entidade Usuario (perfil guardado no Firestore, colecao "usuarios"). */
class Usuario {
  constructor({ id, nome, email, papel = 'operador', criadoEm = new Date() }) {
    this.id = id;
    this.nome = nome;
    this.email = email;
    this.papel = papel;
    this.criadoEm = criadoEm;
  }

  get ehAdmin() { return this.papel === 'admin'; }

  /** Formato salvo no Firestore (sem o id, que e o nome do documento). */
  paraFirestore() {
    return { nome: this.nome, email: this.email, papel: this.papel, criadoEm: this.criadoEm };
  }

  static deFirestore(doc) {
    const d = doc.data();
    return new Usuario({ id: doc.id, ...d, criadoEm: d.criadoEm?.toDate ? d.criadoEm.toDate() : d.criadoEm });
  }

  toJSON() {
    return { id: this.id, nome: this.nome, email: this.email, papel: this.papel, criadoEm: this.criadoEm };
  }
}

module.exports = Usuario;
