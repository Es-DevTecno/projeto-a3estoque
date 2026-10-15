const Usuario = require('../models/Usuario');

/**
 * Acesso ao Firestore (banco NoSQL na nuvem, separado do banco do estoque).
 *   usuarios/{uid}         -> perfil (nome, email, papel)
 *   sistema/contadores     -> { usuarios: N } para saber quem e o primeiro
 */
class UsuarioRepository {
  constructor(firestore) {
    this.db = firestore;
    this.colecao = firestore.collection('usuarios');
    this.contador = firestore.collection('sistema').doc('contadores');
  }

  /**
   * Cria o perfil numa TRANSACAO: le o contador e grava o usuario juntos.
   * Se dois cadastros chegarem ao mesmo tempo, o Firestore repete um deles,
   * entao so existe UM admin (concorrencia tratada tambem aqui).
   */
  async criarPerfil({ id, nome, email }) {
    return this.db.runTransaction(async (t) => {
      const snap = await t.get(this.contador);
      const total = snap.exists ? snap.data().usuarios || 0 : 0;
      const usuario = new Usuario({ id, nome, email, papel: total === 0 ? 'admin' : 'operador' });
      t.set(this.contador, { usuarios: total + 1 }, { merge: true });
      t.set(this.colecao.doc(id), usuario.paraFirestore());
      return usuario;
    });
  }

  async buscarPorId(id) {
    const doc = await this.colecao.doc(id).get();
    return doc.exists ? Usuario.deFirestore(doc) : null;
  }

  async listar() {
    const snap = await this.colecao.orderBy('criadoEm').get();
    return snap.docs.map(Usuario.deFirestore);
  }

  async alterarPapel(id, papel) {
    await this.colecao.doc(id).update({ papel });
    return this.buscarPorId(id);
  }
}

module.exports = UsuarioRepository;
