/**
 * App Vue 3 + Quasar. Toda chamada HTTP passa pela classe ApiClient.
 * Telas: login, painel, produtos, movimentações e alertas.
 */
const { createApp, ref, reactive, computed, onMounted } = Vue;
const api = new ApiClient();

const app = createApp({
  setup() {
    // ---------- estado ----------
    const logado = ref(api.logado);
    const usuario = ref(api.usuario || {});
    const aba = ref('entrar');
    const verSenha = ref(false);
    const carregando = ref(false);
    const form = reactive({ nome: '', email: '', senha: '' });

    const menu = ref(false);
    const pagina = ref('painel');
    const busca = ref('');
    const produtos = ref([]);
    const movimentacoes = ref([]);
    const notificacoes = ref([]);
    const instancia = ref('-');
    const usuarios = ref([]);

    const dialogProduto = ref(false);
    const novo = reactive({ nome: '', sku: '', quantidade: 0, estoqueMinimo: 5 });
    const dialogMov = reactive({ aberto: false, produto: null, tipo: 'ENTRADA', quantidade: 1 });

    const navegacao = [
      { id: 'painel', nome: 'Painel', icone: 'space_dashboard' },
      { id: 'produtos', nome: 'Produtos', icone: 'inventory_2' },
      { id: 'movimentacoes', nome: 'Movimentações', icone: 'swap_horiz' },
      { id: 'alertas', nome: 'Alertas', icone: 'notifications_none' },
      { id: 'usuarios', nome: 'Usuários', icone: 'group', soAdmin: true },
    ];
    const titulos = { painel: 'Painel', produtos: 'Produtos', movimentacoes: 'Movimentações', alertas: 'Alertas', usuarios: 'Usuários' };

    const colunasProdutos = [
      { name: 'nome', label: 'Produto', field: 'nome', align: 'left', sortable: true },
      { name: 'sku', label: 'SKU', field: 'sku', align: 'left', sortable: true },
      { name: 'quantidade', label: 'Quantidade', field: 'quantidade', align: 'right', sortable: true },
      { name: 'estoqueMinimo', label: 'Mínimo', field: 'estoqueMinimo', align: 'right' },
      { name: 'status', label: 'Situação', field: 'quantidade', align: 'left' },
      { name: 'acoes', label: 'Ações', field: 'id', align: 'center' },
    ];
    const colunasMov = [
      { name: 'criadoEm', label: 'Data', field: 'criadoEm', align: 'left', format: v => formatarData(v), sortable: true },
      { name: 'produto', label: 'Produto', field: 'produto', align: 'left', sortable: true },
      { name: 'sku', label: 'SKU', field: 'sku', align: 'left' },
      { name: 'tipo', label: 'Tipo', field: 'tipo', align: 'left' },
      { name: 'quantidade', label: 'Quantidade', field: 'quantidade', align: 'right' },
      { name: 'usuarioNome', label: 'Responsável', field: 'usuarioNome', align: 'left' },
    ];
    const colunasUsuarios = [
      { name: 'nome', label: 'Nome', field: 'nome', align: 'left', sortable: true },
      { name: 'email', label: 'E-mail', field: 'email', align: 'left', sortable: true },
      { name: 'criadoEm', label: 'Cadastro', field: 'criadoEm', align: 'left', format: v => formatarData(v) },
      { name: 'papel', label: 'Perfil', field: 'papel', align: 'left' },
    ];

    // ---------- derivados ----------
    const ehAdmin = computed(() => usuario.value.papel === 'admin');
    const menuVisivel = computed(() => navegacao.filter(i => !i.soAdmin || ehAdmin.value));
    const primeiroNome = computed(() => (usuario.value.nome || '').split(' ')[0]);
    const iniciais = computed(() => (usuario.value.nome || '?').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase());
    const abaixoMinimo = computed(() => produtos.value.filter(p => p.quantidade <= p.estoqueMinimo));
    const kpis = computed(() => {
      const hoje = new Date().toDateString();
      return [
        { titulo: 'Produtos cadastrados', valor: produtos.value.length, icone: 'inventory_2', cor: 'k-azul' },
        { titulo: 'Unidades em estoque', valor: produtos.value.reduce((s, p) => s + p.quantidade, 0).toLocaleString('pt-BR'), icone: 'widgets', cor: 'k-verde' },
        { titulo: 'Abaixo do mínimo', valor: abaixoMinimo.value.length, icone: 'warning_amber', cor: 'k-laranja' },
        { titulo: 'Movimentações hoje', valor: movimentacoes.value.filter(m => new Date(m.criadoEm).toDateString() === hoje).length, icone: 'swap_horiz', cor: 'k-roxo' },
      ];
    });

    // ---------- utilitários ----------
    function avisar(mensagem, tipo = 'positive') {
      Quasar.Notify.create({ message: mensagem, type: tipo, position: 'top-right', timeout: 2500 });
    }
    function formatarData(v) {
      return v ? new Date(v).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '';
    }

    // ---------- ações ----------
    async function entrar() {
      carregando.value = true;
      try {
        api.salvarSessao(await api.login(form.email, form.senha));
        usuario.value = api.usuario;
        logado.value = true;
        form.senha = '';
        carregarTudo();
      } catch (e) { avisar(e.message, 'negative'); }
      finally { carregando.value = false; }
    }

    async function registrar() {
      carregando.value = true;
      try {
        await api.registrar({ nome: form.nome, email: form.email, senha: form.senha });
        avisar('Conta criada! Agora é só entrar.');
        aba.value = 'entrar';
      } catch (e) { avisar(e.message, 'negative'); }
      finally { carregando.value = false; }
    }

    function sair() {
      api.sair();
      logado.value = false;
      usuario.value = {};
    }

    async function carregarTudo() {
      try {
        const [p, m, n] = await Promise.all([api.listarProdutos(), api.listarMovimentacoes(), api.listarNotificacoes()]);
        produtos.value = p; movimentacoes.value = m; notificacoes.value = n;
        instancia.value = api.ultimaInstancia || '-';
        if (ehAdmin.value) usuarios.value = await api.listarUsuarios();
      } catch (e) {
        avisar(e.message, 'negative');
        if (!api.logado) sair();
      }
    }

    function abrirMovimento(produto, tipo) {
      Object.assign(dialogMov, { aberto: true, produto, tipo, quantidade: 1 });
    }

    async function confirmarMovimento() {
      carregando.value = true;
      try {
        await api.movimentar(dialogMov.produto.id, dialogMov.tipo, Number(dialogMov.quantidade));
        avisar(dialogMov.tipo === 'ENTRADA' ? 'Entrada registrada' : 'Saída registrada');
        dialogMov.aberto = false;
        await carregarTudo();
        setTimeout(carregarTudo, 1500); // o worker leva ~1s para gerar o alerta
      } catch (e) { avisar(e.message, 'negative'); }
      finally { carregando.value = false; }
    }

    async function criarProduto() {
      carregando.value = true;
      try {
        await api.criarProduto({ ...novo, quantidade: Number(novo.quantidade || 0), estoqueMinimo: Number(novo.estoqueMinimo || 0) });
        avisar('Produto cadastrado');
        dialogProduto.value = false;
        Object.assign(novo, { nome: '', sku: '', quantidade: 0, estoqueMinimo: 5 });
        carregarTudo();
      } catch (e) { avisar(e.message, 'negative'); }
      finally { carregando.value = false; }
    }

    async function mudarPapel(u, papel) {
      try {
        await api.alterarPapel(u.id, papel);
        u.papel = papel;
        avisar(`${u.nome} agora é ${papel === 'admin' ? 'administrador' : 'operador'} (vale no próximo login)`);
      } catch (e) { avisar(e.message, 'negative'); }
    }

    onMounted(() => { if (logado.value) carregarTudo(); });

    return {
      logado, usuario, aba, verSenha, carregando, form, menu, pagina, busca,
      produtos, movimentacoes, notificacoes, instancia, usuarios, colunasUsuarios, menuVisivel, mudarPapel, dialogProduto, novo, dialogMov,
      navegacao, titulos, colunasProdutos, colunasMov,
      ehAdmin, primeiroNome, iniciais, abaixoMinimo, kpis,
      formatarData, entrar, registrar, sair, carregarTudo, abrirMovimento, confirmarMovimento, criarProduto,
    };
  },
});

app.use(Quasar, {
  plugins: { Notify: Quasar.Notify },
  config: {
    brand: {
      primary: '#0B2545',   // azul-marinho institucional
      secondary: '#EC6A00', // laranja de destaque (botões principais)
      positive: '#12805C',
      negative: '#C62828',
      warning: '#F2A900',
      dark: '#1B2430',
    },
  },
});
Quasar.Lang.set(Quasar.Lang.ptBR);
app.mount('#q-app');
