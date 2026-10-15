const admin = require('firebase-admin');

/**
 * Singleton do Firebase Admin.
 * - Credencial: arquivo da "conta de servico" (GOOGLE_APPLICATION_CREDENTIALS).
 * - Em modo emulador (FIREBASE_AUTH_EMULATOR_HOST) nao precisa de credencial.
 */
class Firebase {
  static #app = null;

  static app() {
    if (!Firebase.#app) {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      if (!projectId) throw new Error('Defina FIREBASE_PROJECT_ID no arquivo .env');
      const usaEmulador = !!process.env.FIREBASE_AUTH_EMULATOR_HOST;
      const opcoes = { projectId };
      if (!usaEmulador) opcoes.credential = admin.credential.applicationDefault();
      Firebase.#app = admin.initializeApp(opcoes);
    }
    return Firebase.#app;
  }

  static auth() { return Firebase.app().auth(); }
  static firestore() { return Firebase.app().firestore(); }
}

module.exports = Firebase;
