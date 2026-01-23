/* --- PROTEÇÃO DE ACESSO --- */
if (localStorage.getItem('logado') !== 'true') {
    window.location.href = 'login.html';
}

/* --- LOGOUT --- */
const btnLogout = document.getElementById('btn-logout');
if (btnLogout) {
    btnLogout.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm("Deseja realmente sair do sistema?")) {
            localStorage.removeItem('logado');
            window.location.href = 'login.html';
        }
    });
}

/* --- ESTADO E ELEMENTOS --- */
let todosOsLivros = [];
let todosOsAlunos = []; 
let todosOsEmprestimos = []; 
let listaAlunosCacheModal = []; 
let livroSelecionadoId = null;

const listaLivrosElemento = document.getElementById('listaLivros');
const listaAlunosCorpo = document.getElementById('listaAlunosCorpo');
const corpoConsultas = document.getElementById('listaConsultas');

// Elementos de Busca
const inputBuscaLivros = document.getElementById('inputBusca'); 
const inputBuscaAlunos = document.getElementById('inputBuscaAlunos'); 
const btnPesquisarAlunos = document.getElementById('btnPesquisarAlunos');
const btnLimparBusca = document.getElementById('btnLimparBusca');
const inputBuscaConsultas = document.getElementById('inputBuscaConsultas');

/* --- INICIALIZAÇÃO --- */
document.addEventListener('DOMContentLoaded', () => {
    if (listaLivrosElemento) carregarLivros();
    if (listaAlunosCorpo) carregarAlunos();
    if (corpoConsultas) carregarRelatorio();
    
    // Busca automática de CEP (Edição e Cadastro)
    const cepInputs = ['editAlunoCEP', 'novoCEP'];
    cepInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('blur', () => buscarCEP(id));
    });

    // Busca em Tempo Real
    if (inputBuscaLivros) inputBuscaLivros.addEventListener('input', filtrarLivros);
    if (inputBuscaAlunos) inputBuscaAlunos.addEventListener('input', filtrarAlunos);
    if (inputBuscaConsultas) inputBuscaConsultas.addEventListener('input', filtrarConsultas);

    // --- Listeners de Formulários ---
    
    // Cadastro e Edição de Livro
    const formNovoLivro = document.getElementById('formNovoLivro');
    if (formNovoLivro) formNovoLivro.addEventListener('submit', salvarNovoLivro);

    const formEditarLivro = document.getElementById('formEditarLivro');
    if (formEditarLivro) formEditarLivro.addEventListener('submit', salvarEdicaoLivro);

    // Cadastro e Edição de Aluno
    const formNovoAluno = document.getElementById('formNovoAluno');
    if (formNovoAluno) formNovoAluno.addEventListener('submit', salvarNovoAluno);

    const formEditarAluno = document.getElementById('formEditarAluno');
    if (formEditarAluno) {
        formEditarAluno.addEventListener('submit', (e) => {
            e.preventDefault();
            salvarEdicaoAluno();
        });
    }
});

/* --- FUNÇÕES DE CARGA --- */
async function carregarLivros() {
    try {
        const resposta = await fetch('api.php');
        todosOsLivros = await resposta.json();
        renderizarTabela(todosOsLivros);
    } catch (erro) { console.error("Erro ao carregar livros:", erro); }
}

async function carregarAlunos() {
    try {
        const resp = await fetch('api.php?tipo=alunos');
        todosOsAlunos = await resp.json();
        renderizarTabelaAlunos(todosOsAlunos);
    } catch (e) { console.error("Erro ao carregar alunos", e); }
}

async function carregarRelatorio() {
    try {
        const resp = await fetch('api.php?tipo=consultas');
        todosOsEmprestimos = await resp.json();
        renderizarTabelaConsultas(todosOsEmprestimos);
    } catch (error) { console.error("Erro ao carregar relatório:", error); }
}

/* --- RENDERIZAÇÃO --- */

function renderizarTabela(dados) {
    if (!listaLivrosElemento) return;
    listaLivrosElemento.innerHTML = ""; 

    dados.forEach((livro) => {
        const tr = document.createElement('tr');
        const statusLower = livro.status.toLowerCase();
        const classeBadge = (statusLower === 'disponível' || statusLower === 'disponivel') ? 'badge-success' : 'badge-warning';
        const livroJson = JSON.stringify(livro).replace(/'/g, "&apos;").replace(/"/g, "&quot;");

        tr.innerHTML = `
            <td><strong>${livro.titulo}</strong><br><small>ISBN: ${livro.isbn || 'N/A'}</small></td>
            <td>${livro.autor}</td>
            <td>${livro.editora || '-'}<br><small>${livro.ano_publicacao || '-'}</small></td>
            <td>${livro.genero || '-'}</td>
            <td><span class="badge ${classeBadge}">${livro.status}</span></td>
            <td>
                ${(statusLower === 'disponível' || statusLower === 'disponivel') ? 
                    `<button onclick="abrirModalEmprestimo(${livro.id}, '${livro.titulo}')" class="btn-icon" title="Emprestar"><i class="fas fa-hand-holding"></i></button>` : 
                    `<button onclick="devolverLivro(${livro.id})" class="btn-icon" title="Devolver" style="color: #e67e22"><i class="fas fa-undo"></i></button>`
                }
                <button onclick='abrirModalEditarLivro(${livroJson})' class="btn-icon" title="Editar" style="color: #3498db"><i class="fas fa-edit"></i></button>
                <button onclick="removerLivro(${livro.id})" class="btn-icon" title="Excluir"><i class="fas fa-trash" style="color: #e74c3c"></i></button>
            </td>
        `;
        listaLivrosElemento.appendChild(tr);
    });
    atualizarContadores(todosOsLivros); 
}

function renderizarTabelaAlunos(dados) {
    if (!listaAlunosCorpo) return;
    listaAlunosCorpo.innerHTML = "";
    dados.forEach(aluno => {
        const tr = document.createElement('tr');
        const alunoJson = JSON.stringify(aluno).replace(/'/g, "&apos;").replace(/"/g, "&quot;");
        tr.innerHTML = `
            <td><strong>${aluno.ra}</strong></td>
            <td>${aluno.nome}</td>
            <td>${aluno.email}</td>
            <td>${aluno.telefone}</td>
            <td>
                <button class="btn-icon" title="Editar" onclick='abrirModalEditarAluno(${alunoJson})'><i class="fas fa-edit"></i></button>
                <button class="btn-icon" style="color:#e74c3c" title="Remover" onclick="removerAluno(${aluno.id})"><i class="fas fa-trash"></i></button>
            </td>
        `;
        listaAlunosCorpo.appendChild(tr);
    });
}

function renderizarTabelaConsultas(dados) {
    if (!corpoConsultas) return;
    corpoConsultas.innerHTML = "";
    if (dados.length === 0) {
        corpoConsultas.innerHTML = "<tr><td colspan='5' style='text-align:center;'>Nenhum registro encontrado.</td></tr>";
        return;
    }
    const hoje = new Date();
    hoje.setHours(0,0,0,0);
    dados.forEach(item => {
        const dataPrevista = new Date(item.data_devolucao_prevista + 'T12:00:00');
        const atrasado = dataPrevista < hoje;
        corpoConsultas.innerHTML += `
            <tr>
                <td><strong>${item.titulo}</strong></td>
                <td>${item.aluno_nome} <br> <small>RA: ${item.ra}</small></td>
                <td>${new Date(item.data_emprestimo + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                <td>${dataPrevista.toLocaleDateString('pt-BR')}</td>
                <td><span class="badge" style="background-color: ${atrasado ? '#ff4d4d' : '#2ecc71'}; color: white; padding: 5px 10px; border-radius: 4px;">${atrasado ? 'EM ATRASO' : 'NO PRAZO'}</span></td>
            </tr>`;
    });
}

/* --- LÓGICA DE PESQUISA --- */
function filtrarLivros() {
    const termo = inputBuscaLivros.value.toLowerCase();
    renderizarTabela(todosOsLivros.filter(l => l.titulo.toLowerCase().includes(termo) || l.autor.toLowerCase().includes(termo)));
}

function filtrarAlunos() {
    const termo = inputBuscaAlunos.value.toLowerCase();
    renderizarTabelaAlunos(todosOsAlunos.filter(a => a.nome.toLowerCase().includes(termo) || a.ra.toLowerCase().includes(termo) || a.email.toLowerCase().includes(termo) || a.telefone.toLowerCase().includes(termo)));
}

function filtrarConsultas() {
    const termo = inputBuscaConsultas.value.toLowerCase();
    renderizarTabelaConsultas(todosOsEmprestimos.filter(i => i.titulo.toLowerCase().includes(termo) || i.aluno_nome.toLowerCase().includes(termo) || i.ra.toLowerCase().includes(termo)));
}

/* --- MODAIS DE LIVRO --- */
function abrirModalLivro() { document.getElementById('modalNovoLivro').style.display = 'flex'; }
function fecharModalLivro() { document.getElementById('modalNovoLivro').style.display = 'none'; document.getElementById('formNovoLivro').reset(); }

async function salvarNovoLivro(e) {
    e.preventDefault();
    const res = await enviarRequisicao({
        acao: 'cadastrar_livro',
        titulo: document.getElementById('novoTitulo').value,
        autor: document.getElementById('novoAutor').value,
        isbn: document.getElementById('novoIsbn').value,
        editora: document.getElementById('novoEditora').value,
        genero: document.getElementById('novoGenero').value,
        ano_publicacao: document.getElementById('novoAno').value,
        edicao: document.getElementById('novoEdicao').value,
        sinopse: document.getElementById('novoSinopse').value
    });
    if (res.sucesso) { alert("Livro cadastrado!"); fecharModalLivro(); carregarLivros(); }
    else { alert(res.erro); }
}

function abrirModalEditarLivro(livro) {
    const campos = ['Id', 'Titulo', 'Autor', 'Isbn', 'Editora', 'Genero', 'Ano', 'Edicao', 'Sinopse'];
    campos.forEach(c => {
        const val = c === 'Ano' ? livro.ano_publicacao : (c === 'Id' ? livro.id : livro[c.toLowerCase()]);
        document.getElementById('editLivro' + c).value = val || '';
    });
    document.getElementById('modalEditarLivro').style.display = 'flex';
}

function fecharModalEditarLivro() { document.getElementById('modalEditarLivro').style.display = 'none'; }

async function salvarEdicaoLivro(e) {
    e.preventDefault();
    const res = await enviarRequisicao({
        acao: 'editar_livro',
        id: document.getElementById('editLivroId').value,
        titulo: document.getElementById('editLivroTitulo').value,
        autor: document.getElementById('editLivroAutor').value,
        isbn: document.getElementById('editLivroIsbn').value,
        editora: document.getElementById('editLivroEditora').value,
        genero: document.getElementById('editLivroGenero').value,
        ano_publicacao: document.getElementById('editLivroAno').value,
        edicao: document.getElementById('editLivroEdicao').value,
        sinopse: document.getElementById('editLivroSinopse').value
    });
    if (res.sucesso) { alert("Livro atualizado!"); fecharModalEditarLivro(); carregarLivros(); }
    else { alert(res.erro); }
}

/* --- MODAIS DE ALUNO --- */
function abrirModalAluno() { document.getElementById('modalNovoAluno').style.display = 'flex'; }
function fecharModalAluno() { document.getElementById('modalNovoAluno').style.display = 'none'; document.getElementById('formNovoAluno').reset(); }

async function salvarNovoAluno(e) {
    e.preventDefault();
    const res = await enviarRequisicao({
        acao: 'cadastrar_aluno',
        nome: document.getElementById('novoNome').value,
        ra: document.getElementById('novoRA').value,
        email: document.getElementById('novoEmail').value,
        telefone: document.getElementById('novoTelefone').value,
        cep: document.getElementById('novoCEP').value,
        rua: document.getElementById('novoRua').value,
        numero: document.getElementById('novoNumero').value,
        bairro: document.getElementById('novoBairro').value,
        cidade: document.getElementById('novoCidade').value,
        estado: document.getElementById('novoEstado').value
    });
    if (res.sucesso) { alert("Aluno cadastrado!"); fecharModalAluno(); carregarAlunos(); }
    else { alert(res.erro); }
}

function abrirModalEditarAluno(aluno) {
    const campos = ['Id', 'Nome', 'RA', 'Email', 'Telefone', 'CEP', 'Rua', 'Numero', 'Bairro', 'Cidade', 'Estado'];
    campos.forEach(c => {
        document.getElementById('editAluno' + c).value = aluno[c.toLowerCase()] || '';
    });
    document.getElementById('modalEditarAluno').style.display = 'flex';
}

async function salvarEdicaoAluno() {
    const res = await enviarRequisicao({
        acao: 'editar_aluno',
        id: document.getElementById('editAlunoId').value,
        nome: document.getElementById('editAlunoNome').value,
        ra: document.getElementById('editAlunoRA').value,
        email: document.getElementById('editAlunoEmail').value,
        telefone: document.getElementById('editAlunoTelefone').value,
        cep: document.getElementById('editAlunoCEP').value,
        rua: document.getElementById('editAlunoRua').value,
        numero: document.getElementById('editAlunoNumero').value,
        bairro: document.getElementById('editAlunoBairro').value,
        cidade: document.getElementById('editAlunoCidade').value,
        estado: document.getElementById('editAlunoEstado').value
    });
    if (res.sucesso) { alert("Aluno atualizado!"); fecharModalEdicao(); carregarAlunos(); }
    else { alert(res.erro); }
}

/* --- CEP E REMOÇÃO --- */
async function buscarCEP(inputId) {
    const cep = document.getElementById(inputId).value.replace(/\D/g, '');
    if (cep.length === 8) {
        try {
            const resp = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const d = await resp.json();
            if (!d.erro) {
                const prefix = inputId.startsWith('novo') ? 'novo' : 'editAluno';
                document.getElementById(prefix + 'Rua').value = d.logradouro;
                document.getElementById(prefix + 'Bairro').value = d.bairro;
                document.getElementById(prefix + 'Cidade').value = d.localidade;
                document.getElementById(prefix + 'Estado').value = d.uf;
            }
        } catch (e) { console.error("CEP não encontrado"); }
    }
}

async function removerAluno(id) {
    if (confirm("Excluir aluno?")) {
        const res = await enviarRequisicao({ acao: 'eliminar_aluno', id });
        if (res.sucesso) carregarAlunos(); else alert(res.erro);
    }
}

async function removerLivro(id) {
    if (confirm("Excluir livro?")) {
        const res = await enviarRequisicao({ acao: 'eliminar', id });
        if (res.sucesso) carregarLivros(); else alert(res.erro);
    }
}

/* --- EMPRÉSTIMO --- */
async function abrirModalEmprestimo(id, titulo) {
    livroSelecionadoId = id;
    document.getElementById('nomeLivroEmprestimo').innerText = "Livro: " + titulo;
    const resp = await fetch('api.php?tipo=alunos');
    const alunos = await resp.json();
    document.getElementById('selectAlunos').innerHTML = alunos.map(a => `<option value="${a.id}">${a.nome} (RA: ${a.ra})</option>`).join('');
    document.getElementById('modalEmprestimo').style.display = 'flex';
}

async function confirmarEmprestimo() {
    const hoje = new Date();
    const dev = new Date(); dev.setDate(hoje.getDate() + 15);
    const res = await enviarRequisicao({
        acao: 'vincular_emprestimo',
        livro_id: livroSelecionadoId,
        aluno_id: document.getElementById('selectAlunos').value,
        data_emprestimo: hoje.toISOString().split('T')[0],
        data_devolucao: dev.toISOString().split('T')[0]
    });
    if (res.sucesso) { alert("Emprestado!"); fecharModal(); carregarLivros(); } else { alert(res.erro); }
}

async function devolverLivro(id) {
    if (confirm("Confirmar devolução?")) {
        await enviarRequisicao({ acao: 'atualizar', id, status: 'Disponível' });
        carregarLivros();
        if (corpoConsultas) carregarRelatorio();
    }
}

/* --- AUXILIARES --- */
function fecharModal() { document.getElementById('modalEmprestimo').style.display = 'none'; }
function fecharModalEdicao() { document.getElementById('modalEditarAluno').style.display = 'none'; }

async function enviarRequisicao(dados) {
    try {
        const resp = await fetch('api.php', { method: 'POST', body: JSON.stringify(dados) });
        return await resp.json();
    } catch (e) { return { sucesso: false, erro: "Erro de conexão." }; }
}

function atualizarContadores(dados) {
    const disp = dados.filter(l => l.status.toLowerCase().includes('dispon')).length;
    if(document.getElementById('totalLivros')) document.getElementById('totalLivros').innerText = dados.length;
    if(document.getElementById('totalEmprestados')) document.getElementById('totalEmprestados').innerText = dados.length - disp;
    if(document.getElementById('totalDisponiveis')) document.getElementById('totalDisponiveis').innerText = disp;
}