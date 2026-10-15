/**
 * Classe que centraliza as chamadas a API (tambem orientada a objetos no front).
 * Guarda os tokens e renova o access token sozinha quando ele expira.
 */
class ApiClient {
  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl;
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
    this.ultimaInstancia = null;
  }

  get logado() { return !!this.accessToken; }

  salvarSessao({ accessToken, refreshToken, usuario }) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    if (usuario) localStorage.setItem('usuario', JSON.stringify(usuario));
  }

  sair() {
    this.accessToken = this.refreshToken = null;
    localStorage.clear();
  }

  get usuario() { return JSON.parse(localStorage.getItem('usuario') || 'null'); }

  async requisitar(caminho, { metodo = 'GET', corpo, auth = true } = {}, jaRenovou = false) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth && this.accessToken) headers.Authorization = `Bearer ${this.accessToken}`;

    const resp = await fetch(this.baseUrl + caminho, {
      method: metodo, headers, body: corpo ? JSON.stringify(corpo) : undefined,
    });
    this.ultimaInstancia = resp.headers.get('X-Instancia') || this.ultimaInstancia;

    if (resp.status === 401 && auth && !jaRenovou && this.refreshToken) {
      await this.renovar();
      return this.requisitar(caminho, { metodo, corpo, auth }, true);
    }
    const dados = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(dados.erro || `Erro ${resp.status}`);
    return dados;
  }

  async renovar() {
    try {
      const dados = await this.requisitar('/auth/renovar', { metodo: 'POST', corpo: { refreshToken: this.refreshToken }, auth: false }, true);
      this.salvarSessao(dados);
    } catch (e) { this.sair(); throw e; }
  }

  // Atalhos
  login(email, senha)      { return this.requisitar('/auth/login', { metodo: 'POST', corpo: { email, senha }, auth: false }); }
  registrar(dados)         { return this.requisitar('/auth/registrar', { metodo: 'POST', corpo: dados, auth: false }); }
  listarProdutos()         { return this.requisitar('/estoque/produtos'); }
  criarProduto(dados)      { return this.requisitar('/estoque/produtos', { metodo: 'POST', corpo: dados }); }
  listarMovimentacoes()    { return this.requisitar('/estoque/movimentacoes'); }
  listarNotificacoes()     { return this.requisitar('/estoque/notificacoes'); }
  movimentar(id, tipo, qtd){ return this.requisitar(`/estoque/produtos/${id}/movimentacoes`, { metodo: 'POST', corpo: { tipo, quantidade: qtd } }); }
}
