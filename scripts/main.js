const STORAGE_KEY = 'siscoaf_comunicacoes';
let codigosCOAF = [
    [1159, "Saque em espécie de valor igual ou superior a R$50.000,00 (cinquenta mil reais). Banco Central do Brasil - Circular nº 3.978/2020, art. 49-I"],
    [1160, "Aporte em espécie de valor igual ou superior a R$50.000,00 (cinquenta mil reais). Banco Central do Brasil - Circular nº 3.978/2020, art. 49-I"],
    [1161, "Depósito em espécie de valor igual ou superior a R$50.000,00 (cinquenta mil reais). Banco Central do Brasil - Circular nº 3.978/2020, art. 49-I"],
    [1162, "As operações relativas a pagamentos, recebimentos e transferências de recursos, por meio de qualquer instrumento, contra pagamento em espécie, de valor igual ou superior a R$50.000,00 (cinquenta mil reais). Banco Central do Brasil - Circular nº 3.978/2020, art. 49-II"],
    [1163, "Solicitação de provisionamento de saques em espécie de valor igual ou superior a R$50.000,00 (cinquenta mil reais) de que trata o art. 36. Banco Central do Brasil - Circular nº 3.978/2020, art. 49-III"]
];

let tiposEnvolvido = [
    [1, "Titular"],
    [2, "Responsável"],
    [3, "Depositante"],
    [4, "Sócio"],
    [5, "Gerente/Diretor"],
    [6, "Sacador"],
    [7, "Procurador/Representante Legal"],
    [8, "Outros"],
    [9, "Beneficiário"],
    [19, "Remetente"],
    [33, "Instituição Depositária"],
    [34, "Instituição Pagadora"],
    [35, "Instituição Recebedora"]
];

let comunicacoes = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let envolvidos = [];
let formularioAlterado = false;
let comunicacaoEditandoIndex = null;

const tabContents = document.querySelectorAll('.tab-content');
const tabs = document.querySelectorAll('.tab');
const registrarSection = document.getElementById('registrar');
const visualizarSection = document.getElementById('visualizar');
const comunicacoesTable = document.getElementById('comunicacoes-table').querySelector('tbody');
const gerarXmlBtn = document.getElementById('gerar-xml');

document.addEventListener('DOMContentLoaded', initApp);

function formatarDataHoraLocal() {
    const now = new Date();
    return [
        String(now.getDate()).padStart(2, '0'),
        String(now.getMonth() + 1).padStart(2, '0'),
        now.getFullYear(),
        String(now.getHours()).padStart(2, '0'),
        String(now.getMinutes()).padStart(2, '0'),
        String(now.getSeconds()).padStart(2, '0')
    ].join('');
}

function formatarDataParaXML(data) {
    if (!data) return '';
    const partes = data.split('-');
    if (partes.length !== 3) return data;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function initApp() {
    // Config abas
    setupTabs();
    
    // Constroe formulario
    buildComunicacaoForm();
    
    // Config eventos
    gerarXmlBtn.addEventListener('click', gerarXmlLote);
    
    // Carrega comunicações
    loadComunicacoes();
    monitorarAlteracoes();
    
    // Config evento de confirmacao
    window.addEventListener('beforeunload', (e) => {
        if (formularioAlterado) {
            e.preventDefault();
            e.returnValue = 'Você tem alterações não salvas. Tem certeza que deseja sair?';
            return 'Você tem alterações não salvas. Tem certeza que deseja sair?';
        }
    });
}

function setupTabs() {
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remover classe active de todas as abas
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Adicionar classe active na aba clicada
            tab.classList.add('active');
            
            // Mostrar o conteudo correspondente
            const target = tab.dataset.target;
            document.getElementById(target).classList.add('active');
            
            // Recarregar dados
            if (target === 'visualizar') {
                loadComunicacoes();
            }
        });
    });
}

function buildComunicacaoForm() {
    registrarSection.innerHTML = '';
    
    // Cria formulario
    const form = document.createElement('form');
    form.id = 'comunicacao-form';
    
    // Dados Básicos
    const basicSection = document.createElement('div');
    basicSection.className = 'form-section';
    
    const basicTitle = document.createElement('h2');
    basicTitle.className = 'section-title';
    basicTitle.textContent = 'Dados da Comunicação';
    basicSection.appendChild(basicTitle);
    
    const basicFieldsContainer = document.createElement('div');
    basicFieldsContainer.className = 'form-grid';
    basicFieldsContainer.id = 'basic-fields';
    basicSection.appendChild(basicFieldsContainer);
    
    const detGroup = document.createElement('div');
    detGroup.className = 'form-group';
    
    const detLabel = document.createElement('label');
    detLabel.textContent = 'Informações Adicionais (Det):';
    detLabel.htmlFor = 'det';
    detGroup.appendChild(detLabel);
    
    const detTextarea = document.createElement('textarea');
    detTextarea.id = 'det';
    detTextarea.name = 'det';
    detGroup.appendChild(detTextarea);
    
    basicSection.appendChild(detGroup);
    form.appendChild(basicSection);
    
    // Adiciona campos
    const basicFields = [
        { label: "Número Origem (NumOcorrencia):", name: "NumOcorrencia", type: "number" },
        { label: "Data Início (DtInicio):", name: "DtInicio", type: "date" },
        { label: "Data Final (DtFim):", name: "DtFim", type: "date" },
        { label: "Número da Agência (AgNum):", name: "AgNum", type: "text" },
        { label: "Nome da Agência (AgNome):", name: "AgNome", type: "text" },
        { label: "Cidade (AgMun):", name: "AgMun", type: "text" },
        { label: "UF (AgUF):", name: "AgUF", type: "select", options: [
            "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", 
            "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", 
            "RS", "RO", "RR", "SC", "SP", "SE", "TO"
        ]},
        { label: "Valor do Crédito (VlCred):", name: "VlCred", type: "number" },
        { label: "Valor do Débito (VlDeb):", name: "VlDeb", type: "number" },
        { label: "Valor do Provisionamento (VlProv):", name: "VlProv", type: "number" },
        { label: "Valor da Proposta (VlProp):", name: "VlProp", type: "number" }
    ];
    
    basicFields.forEach(field => {
        const fieldElement = createFormField(field);
        basicFieldsContainer.appendChild(fieldElement);
    });
    
    // Enquadramento
    const enquadSection = document.createElement('div');
    enquadSection.className = 'form-section';
    
    const enquadTitle = document.createElement('h2');
    enquadTitle.className = 'section-title';
    enquadTitle.textContent = 'Enquadramento';
    enquadSection.appendChild(enquadTitle);
    
    const enquadCard = document.createElement('div');
    enquadCard.className = 'card';
    
    const cardTitle = document.createElement('h3');
    cardTitle.textContent = 'Selecione os códigos COAF';
    enquadCard.appendChild(cardTitle);
    
    const codigosContainer = document.createElement('div');
    codigosContainer.className = 'codigos-container';
    
    // Adiciona cada codigo COAF
    codigosCOAF.forEach(cod => {
        const codigoItem = document.createElement('div');
        codigoItem.className = 'codigo-item';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `cod-${cod[0]}`;
        checkbox.value = cod[0];
        checkbox.className = 'codigo-checkbox';
        
        const label = document.createElement('label');
        label.htmlFor = `cod-${cod[0]}`;
        
        const numeroSpan = document.createElement('span');
        numeroSpan.className = 'codigo-numero';
        numeroSpan.textContent = cod[0];
        
        const descricaoSpan = document.createElement('span');
        descricaoSpan.className = 'codigo-descricao';
        descricaoSpan.textContent = cod[1];
        
        label.appendChild(checkbox);
        label.appendChild(numeroSpan);
        label.appendChild(descricaoSpan);
        
        codigoItem.appendChild(label);
        codigosContainer.appendChild(codigoItem);
    });
    
    enquadCard.appendChild(codigosContainer);
    enquadSection.appendChild(enquadCard);
    form.appendChild(enquadSection);
    
    // Envolvidos
    const envSection = document.createElement('div');
    envSection.className = 'form-section';
    
    const envTitle = document.createElement('h2');
    envTitle.className = 'section-title';
    envTitle.textContent = 'Envolvidos';
    envSection.appendChild(envTitle);
    
    const envFieldsContainer = document.createElement('div');
    envFieldsContainer.className = 'env-fields-grid';
    envSection.appendChild(envFieldsContainer);
    
    // Campos de envolvido
    const envFields = [
        { label: "CPF/CNPJ (CPFCNPJEnv):", name: "CPFCNPJEnv", type: "text" },
        { label: "Nome (NmEnv):", name: "NmEnv", type: "text" },
        { 
            label: "Tipo Envolvido (TpEnv):", 
            name: "TpEnv", 
            type: "select", 
            options: tiposEnvolvido.map(t => `${t[0]} - ${t[1]}`) 
        },
        { label: "Agência Número (AgNumEnv):", name: "AgNumEnv", type: "text" },
        { label: "Agência Nome (AgNomeEnv):", name: "AgNomeEnv", type: "text" },
        { label: "Número Conta (NumConta):", name: "NumConta", type: "text" },
        { label: "Data Abertura (DtAbConta):", name: "DtAbConta", type: "date" },
        { label: "Data Atualização (DtAtualCad):", name: "DtAtualCad", type: "date" }
    ];
    
    envFields.forEach(field => {
        const fieldElement = createFormField(field);
        envFieldsContainer.appendChild(fieldElement);
    });
    
    // Informações Adicionais
    const checkboxGroup = document.createElement('div');
    checkboxGroup.className = 'field-group';
    
    const checkboxTitle = document.createElement('div');
    checkboxTitle.className = 'field-group-title';
    checkboxTitle.textContent = 'Informações Adicionais:';
    checkboxGroup.appendChild(checkboxTitle);
    
    const checkboxContainer = document.createElement('div');
    checkboxContainer.className = 'checkbox-group';
    
    // Pessoa Obrigada
    const obrigadaItem = createCheckboxItem('PObrigada', 'Pessoa Obrigada');
    checkboxContainer.appendChild(obrigadaItem);
    
    // PEP
    const pepItem = createCheckboxItem('PEP', 'PEP (Pessoa Exposta Politicamente)');
    checkboxContainer.appendChild(pepItem);
    
    // Servidor Publico
    const servPubItem = createCheckboxItem('ServPub', 'Servidor Público');
    checkboxContainer.appendChild(servPubItem);
    
    checkboxGroup.appendChild(checkboxContainer);
    envFieldsContainer.appendChild(checkboxGroup);
    
    // Botoes para envolvidos
    const envButtons = document.createElement('div');
    envButtons.className = 'form-group';
    envButtons.style.display = 'flex';
    envButtons.style.gap = '10px';

    envButtons.style.marginTop = '1rem';
    
    const addEnvolvidoBtn = document.createElement('button');
    addEnvolvidoBtn.type = 'button';
    addEnvolvidoBtn.id = 'add-envolvido';
    addEnvolvidoBtn.className = 'btn btn-primary';
    addEnvolvidoBtn.textContent = 'Adicionar Envolvido';
    envButtons.appendChild(addEnvolvidoBtn);
    
    const limparEnvBtn = document.createElement('button');
    limparEnvBtn.type = 'button';
    limparEnvBtn.id = 'limpar-envolvido';
    limparEnvBtn.className = 'btn btn-outline';
    limparEnvBtn.textContent = 'Limpar Campos';
    envButtons.appendChild(limparEnvBtn);
    
    envSection.appendChild(envButtons);
    
    const envCard = document.createElement('div');
    envCard.className = 'card';
    
    const envCardTitle = document.createElement('h3');
    envCardTitle.textContent = 'Envolvidos Adicionados';
    envCard.appendChild(envCardTitle);
    
    const envTableContainer = document.createElement('div');
    envTableContainer.className = 'table-container';
    
    const envolvidosTable = document.createElement('table');
    envolvidosTable.id = 'envolvidos-table';
    
    const envolvidosThead = document.createElement('thead');
    envolvidosThead.innerHTML = `
        <tr>
            <th>CPF/CNPJ</th>
            <th>Nome</th>
            <th>Tipo</th>
            <th>Ag. Núm.</th>
            <th>Ag. Nome</th>
            <th>Conta</th>
            <th>P. Obrigada</th>
            <th>PEP</th>
            <th>Serv. Público</th>
            <th>Ações</th>
        </tr>
    `;
    envolvidosTable.appendChild(envolvidosThead);
    
    const envolvidosTbody = document.createElement('tbody');
    envolvidosTable.appendChild(envolvidosTbody);
    
    envTableContainer.appendChild(envolvidosTable);
    envCard.appendChild(envTableContainer);
    
    const removeEnvBtn = document.createElement('button');
    removeEnvBtn.type = 'button';
    removeEnvBtn.id = 'remove-envolvido';
    removeEnvBtn.className = 'btn btn-danger';
    removeEnvBtn.textContent = 'Remover Selecionado';
    envCard.appendChild(removeEnvBtn);
    
    envSection.appendChild(envCard);
    form.appendChild(envSection);
    
    // Botoes de acao
    const actionSection = document.createElement('div');
    actionSection.className = 'form-section';
    actionSection.style.display = 'flex';
    actionSection.style.justifyContent = 'space-between';
    actionSection.style.flexWrap = 'wrap';
    actionSection.style.gap = '10px';
    
    const addComBtn = document.createElement('button');
    addComBtn.type = 'button';
    addComBtn.id = 'add-comunicacao';
    addComBtn.className = 'btn btn-primary';
    addComBtn.textContent = 'Adicionar à Lista';
    
    const limparBtn = document.createElement('button');
    limparBtn.type = 'button';
    limparBtn.id = 'limpar-campos';
    limparBtn.className = 'btn btn-outline';
    limparBtn.textContent = 'Limpar Todos os Campos';
    
    const gerarXmlBtn = document.createElement('button');
    gerarXmlBtn.type = 'button';
    gerarXmlBtn.id = 'gerar-xml-individual';
    gerarXmlBtn.className = 'btn btn-primary';
    gerarXmlBtn.textContent = 'Gerar XML Individual';
    
    actionSection.appendChild(addComBtn);
    actionSection.appendChild(limparBtn);
    actionSection.appendChild(gerarXmlBtn);
    form.appendChild(actionSection);
    
    registrarSection.appendChild(form);

    const editingNotice = document.createElement('div');
    editingNotice.id = 'editing-notice';
    editingNotice.className = 'editing-notice';
    editingNotice.style.display = 'none';
    editingNotice.innerHTML = `
        <i class="material-icons" style="color: #ffc107;">warning</i>
        <strong>Modo Edição:</strong> Você está editando uma comunicação existente.
        Ao salvar, a versão original será substituída.
    `;
    registrarSection.insertBefore(editingNotice, form);
    
    
    // Config eventos
    setupFormEvents();
}

function createFormField(field) {
    const container = document.createElement('div');
    container.className = 'form-group';
    
    const label = document.createElement('label');
    label.textContent = field.label;
    label.htmlFor = field.name;
    
    let input;
    if (field.type === 'select') {
        input = document.createElement('select');
        input.id = field.name;
        input.name = field.name;
        if (field.options) {
            field.options.forEach(opt => {
                const option = document.createElement('option');
                const [value, text] = opt.split(' - ');
                option.value = value || opt;
                option.textContent = opt;
                input.appendChild(option);
            });
        }
    } else {
        input = document.createElement('input');
        input.type = field.type;
        input.id = field.name;
        input.name = field.name;
    }
    
    container.appendChild(label);
    container.appendChild(input);
    return container;
}

function createCheckboxItem(name, labelText) {
    const item = document.createElement('div');
    item.className = 'checkbox-item';
    
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = name;
    input.name = name;
    input.value = '1'; // Valor quando marcado
    
    const span = document.createElement('span');
    span.className = 'checkmark';
    
    const label = document.createElement('label');
    label.className = 'checkbox-label';
    label.textContent = labelText;
    label.htmlFor = name;
    
    item.appendChild(input);
    item.appendChild(span);
    item.appendChild(label);
    
    return item;
}

function setupFormEvents() {
    // Envolvidos
    document.getElementById('add-envolvido').addEventListener('click', addEnvolvido);
    document.getElementById('limpar-envolvido').addEventListener('click', limparCamposEnv);
    document.getElementById('remove-envolvido').addEventListener('click', removeEnvolvido);
    
    // Acoes
    document.getElementById('add-comunicacao').addEventListener('click', addComunicacao);
    document.getElementById('limpar-campos').addEventListener('click', limparCampos);
    document.getElementById('gerar-xml-individual').addEventListener('click', gerarXmlIndividual);
    
    // Selecao de linhas
    document.addEventListener('click', (e) => {
        if (e.target.closest('#envolvidos-table tbody tr')) {
            const row = e.target.closest('tr');
            row.classList.toggle('selected');
        }
    });
}

function addEnvolvido() {

    const envData = {}
    // Coleta dados
    const envFields = [
        'CPFCNPJEnv', 'NmEnv', 'TpEnv', 'AgNumEnv', 'AgNomeEnv', 
        'NumConta', 'DtAbConta', 'DtAtualCad'
    ];
    
    // Coleta campos
    envFields.forEach(field => {
        const element = document.getElementById(field);
        if (element) {
            envData[field] = element.value;
        }
    });
    
    // Coleta checkboxes
    const checkboxFields = ['PObrigada', 'PEP', 'ServPub'];
    checkboxFields.forEach(field => {
        const checkbox = document.getElementById(field);
        envData[field] = checkbox.checked ? '1' : '0';
    });
    
    // Valida campos
    if (!envData.CPFCNPJEnv || !envData.NmEnv || !envData.TpEnv) {
        alert('Preencha os campos obrigatórios: CPF/CNPJ, Nome e Tipo Envolvido');
        return;
    }
    
    // Adiciona lista de envolvidos
    envolvidos.push(envData);
    
    // Adiciona tabela
    const envolvidosTable = document.getElementById('envolvidos-table').querySelector('tbody');
    const row = document.createElement('tr');
    
    // Mapea para exibicao
    const displayData = {
        TpEnv: tiposEnvolvido.find(t => t[0] == envData.TpEnv)?.[1] || envData.TpEnv,
    };
    
    row.innerHTML = `
        <td>${envData.CPFCNPJEnv}</td>
        <td>${envData.NmEnv}</td>
        <td>${displayData.TpEnv}</td>
        <td>${envData.AgNumEnv}</td>
        <td>${envData.AgNomeEnv}</td>
        <td>${envData.NumConta}</td>
        <td>${envData.PObrigada === '1' ? 'Sim' : 'Não'}</td>
        <td>${envData.PEP === '1' ? 'Sim' : 'Não'}</td>
        <td>${envData.ServPub === '1' ? 'Sim' : 'Não'}</td>
        <td class="action-buttons">
            <button class="btn-remove-env">
                <i class="material-icons">delete</i>
            </button>
        </td>
    `;
    
    envolvidosTable.appendChild(row);
    
    // Evento para remover
    row.querySelector('.btn-remove-env').addEventListener('click', () => {
        const index = [...envolvidosTable.rows].indexOf(row);
        if (index !== -1) {
            envolvidos.splice(index, 1);
            row.remove();
        }
    });

}

function limparCamposEnv() {
    const envFields = [
        'CPFCNPJEnv', 'NmEnv', 'TpEnv', 'AgNumEnv', 'AgNomeEnv', 
        'NumConta', 'DtAbConta', 'DtAtualCad'
    ];
    
    envFields.forEach(field => {
        const element = document.getElementById(field);
        if (element) {
            element.value = '';
        }
    });
    
    // Limpa checkboxes
    const checkboxFields = ['PObrigada', 'PEP', 'ServPub'];
    checkboxFields.forEach(field => {
        const checkbox = document.getElementById(field);
        if (checkbox) {
            checkbox.checked = false;
        }
    });
    formularioAlterado = false;
}

function removeEnvolvido() {
    const envolvidosTable = document.getElementById('envolvidos-table').querySelector('tbody');
    const selectedRows = envolvidosTable.querySelectorAll('tr.selected');
    
    if (selectedRows.length === 0) {
        alert('Selecione pelo menos um envolvido para remover!');
        return;
    }
    
    selectedRows.forEach(row => {
        const index = [...envolvidosTable.rows].indexOf(row);
        if (index !== -1) {
            envolvidos.splice(index, 1);
            row.remove();
        }
    });
}

function limparCampos() {
    // Limpa campos basicos
    const basicFields = [
        'NumOcorrencia', 'DtInicio', 'DtFim', 'AgNum', 'AgNome', 'AgMun', 'AgUF',
        'VlCred', 'VlDeb', 'VlProv', 'VlProp'
    ];
    
    basicFields.forEach(field => {
        const element = document.getElementById(field);
        if (element) {
            element.value = '';
        }
    });
    
    // Limpa det
    document.getElementById('det').value = '';
    
    // Limpa enquadramentos
    document.querySelectorAll('.codigo-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Limpa envolvidos
    envolvidos = [];
    const envolvidosTable = document.getElementById('envolvidos-table').querySelector('tbody');
    envolvidosTable.innerHTML = '';
    
    // Limpa campos de envolvidos
    limparCamposEnv();
    comunicacaoEditandoIndex = null;
    document.getElementById('editing-notice').style.display = 'none';
}

function addComunicacao() {
    // Coleta dados basicos
    const campos = {};
    const basicFields = [
        'NumOcorrencia', 'DtInicio', 'DtFim', 'AgNum', 'AgNome', 
        'AgMun', 'AgUF', 'VlCred', 'VlDeb', 'VlProv', 'VlProp'
    ];
    
    basicFields.forEach(field => {
        const element = document.getElementById(field);
        if (element) {
            campos[field] = element.value;
        }
    });
    
    const det = document.getElementById('det').value;
    
    // Coleta codigos selecionados
    const codigosSelecionados = [];
    document.querySelectorAll('.codigo-checkbox:checked').forEach(checkbox => {
        codigosSelecionados.push(checkbox.value);
    });

    console.log(comunicacaoEditandoIndex);
    if (comunicacaoEditandoIndex !== null) {
        comunicacoes.splice(comunicacaoEditandoIndex, 1);
        comunicacaoEditandoIndex = null;
    }
    
    // Valida campos
    if (!campos.NumOcorrencia || !campos.DtInicio || !campos.AgNum || !campos.AgNome) {
        alert('Preencha os campos obrigatórios: Número Origem, Data Início, Número e Nome da Agência');
        return;
    }
    
    if (codigosSelecionados.length === 0) {
        alert('Selecione pelo menos um código de enquadramento!');
        return;
    }
    
    if (envolvidos.length === 0) {
        alert('Adicione pelo menos um envolvido!');
        return;
    }
    
    // Criar objeto de comunicacao
    const comunicacao = {
        campos,
        det,
        enquadramentos: codigosSelecionados,
        envolvidos: [...envolvidos]
    };
    
    // Adiciona lista de comunicacoes
    comunicacoes.push(comunicacao);
    
    // Salva no localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(comunicacoes));
    
    alert('Comunicação adicionada com sucesso!');
    formularioAlterado = false;
    limparCampos();
    
    // Mudarpara a aba de visualizacao
    document.querySelector('.tab[data-target="visualizar"]').click();

    
}

function loadComunicacoes() {
    // Carrega do localStorage
    comunicacoes = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    renderComunicacoesTable();
}

function renderComunicacoesTable() {
    const tbody = comunicacoesTable;
    tbody.innerHTML = '';
    
    comunicacoes.forEach((com, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${com.campos.NumOcorrencia || ''}</td>
            <td>${com.campos.DtInicio || ''}</td>
            <td>${com.campos.DtFim || ''}</td>
            <td>${com.campos.AgNum || ''} - ${com.campos.AgNome || ''}</td>
            <td>${com.campos.AgMun || ''}</td>
            <td>${com.campos.AgUF || ''}</td>
            <td>${com.envolvidos ? com.envolvidos.length : 0}</td>
            <td class="action-buttons">
                <button class="btn-edit" data-id="${index}">
                    <i class="material-icons">edit</i>
                </button>
                <button class="btn-delete" data-id="${index}">
                    <i class="material-icons">delete</i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // Adiciona eventos de edicao/exclusao
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', () => editarComunicacao(parseInt(btn.dataset.id)));
    });
    
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', () => removerComunicacao(parseInt(btn.dataset.id)));
    });
}

function removerComunicacao(id) {
    if (confirm('Tem certeza que deseja remover esta comunicação?')) {
        // Remove da lista
        comunicacoes.splice(id, 1);
        
        // Atualiza localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(comunicacoes));
        
        // Recarrega tabela
        renderComunicacoesTable();
    }
}

function editarComunicacao(id) {
    // Verifica se ha alteracoes n salvas
    if (formularioAlterado) {
        const confirmar = confirm('Há alterações não salvas no formulário de registro. Deseja descartá-las para editar esta comunicação?');
        if (!confirmar) {
            return;
        }
    }
    limparCampos();
    // Obter a comunicacao selecionada
    const comunicacao = comunicacoes[id];
    comunicacaoEditandoIndex = id;
    document.getElementById('editing-notice').style.display = 'flex';
    
    // Preenche campos
    const campos = comunicacao.campos;
    for (const [key, value] of Object.entries(campos)) {
        const element = document.getElementById(key);
        if (element) element.value = value;
    }
    
    // Preenche det
    document.getElementById('det').value = comunicacao.det || '';
    
    // Preenche enquadramentos
    document.querySelectorAll('.codigo-checkbox').forEach(checkbox => {
        checkbox.checked = comunicacao.enquadramentos.includes(checkbox.value);
    });
    
    // Preenche envolvidos
    envolvidos = [...comunicacao.envolvidos];
    const envolvidosTable = document.getElementById('envolvidos-table').querySelector('tbody');
    envolvidosTable.innerHTML = '';
    
    envolvidos.forEach(env => {
        const row = document.createElement('tr');
        const displayTipo = tiposEnvolvido.find(t => t[0] == env.TpEnv)?.[1] || env.TpEnv;
        
        row.innerHTML = `
            <td>${env.CPFCNPJEnv}</td>
            <td>${env.NmEnv}</td>
            <td>${displayTipo}</td>
            <td>${env.AgNumEnv}</td>
            <td>${env.AgNomeEnv}</td>
            <td>${env.NumConta}</td>
            <td>${env.PObrigada === '1' ? 'Sim' : 'Não'}</td>
            <td>${env.PEP === '1' ? 'Sim' : 'Não'}</td>
            <td>${env.ServPub === '1' ? 'Sim' : 'Não'}</td>
            <td class="action-buttons">
                <button class="btn-remove-env">
                    <i class="material-icons">delete</i>
                </button>
            </td>
        `;
        envolvidosTable.appendChild(row);
        
        // Adiciona evento para remover envolvido
        row.querySelector('.btn-remove-env').addEventListener('click', () => {
            const index = [...envolvidosTable.rows].indexOf(row);
            envolvidos.splice(index, 1);
            row.remove();
        });
    });

    // Muda para a aba de registro
    tabs.forEach(t => t.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    
    const tabRegistrar = document.querySelector('[data-target="registrar"]');
    tabRegistrar.classList.add('active');
    registrarSection.classList.add('active');
    
    // Reseta flag de alteracoes
    formularioAlterado = false;
}

function gerarXmlLote() {
    if (comunicacoes.length === 0) {
        alert('Não há comunicações para gerar XML!');
        return;
    }
    
    try {
        const xmlContent = generateXmlLote(comunicacoes);
        const blob = new Blob([xmlContent], { type: 'application/xml;charset=iso-8859-1' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `lote_comunicacoes_${new Date().toISOString().slice(0, 19).replace(/[:T-]/g, '')}.xml`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Erro ao gerar XML:', error);
        alert('Erro ao gerar XML. Verifique o console para detalhes.');
    }
}

function generateXmlLote(comunicacoes) {
    let xml = '<?xml version="1.0" encoding="ISO-8859-1"?>\n';
    xml += '<LOTE>\n';
    const idOcorrencias = `SISCOAF${formatarDataHoraLocal()}`;
    xml += `  <OCORRENCIAS ID="${idOcorrencias}">\n`;
    
    for (const com of comunicacoes) {
        xml += '    <OCORRENCIA>\n';
        xml += '      <CPFCNPJCom>13009717000146</CPFCNPJCom>\n';
        
        // Campos com formatacao de data
        const camposFormatados = { ...com.campos };
        camposFormatados.DtInicio = formatarDataParaXML(camposFormatados.DtInicio);
        camposFormatados.DtFim = formatarDataParaXML(camposFormatados.DtFim);
        
        for (const [tag, value] of Object.entries(camposFormatados)) {
            // Incluir campo mesmo se vazio
            xml += `      <${tag}>${escapeXml(value || '')}</${tag}>\n`;
        }
        
        // Det
        xml += `      <Det>${escapeXml(com.det || '')}</Det>\n`;
        
        // Enquadramentos
        if (com.enquadramentos.length > 0) {
            xml += '      <ENQUADRAMENTOS>\n';
            for (const cod of com.enquadramentos) {
                xml += `        <CodEng>${escapeXml(cod)}</CodEng>\n`;
            }
            xml += '      </ENQUADRAMENTOS>\n';
        }
        
        // Envolvidos
        if (com.envolvidos.length > 0) {
            xml += '      <ENVOLVIDOS>\n';
            for (const env of com.envolvidos) {
                xml += '        <ENVOLVIDO>\n';
                for (const [key, value] of Object.entries(env)) {
                    if (value) {
                        xml += `          <${key}>${escapeXml(value)}</${key}>\n`;
                    }
                }
                xml += '        </ENVOLVIDO>\n';
            }
            xml += '      </ENVOLVIDOS>\n';
        }
        
        xml += '    </OCORRENCIA>\n';
    }
    
    xml += '  </OCORRENCIAS>\n';
    xml += '</LOTE>';
    
    return prettifyXml(xml);
}

function gerarXmlIndividual() {
    // Coleta dados do form
    const campos = {};
    const basicFields = [
        'NumOcorrencia', 'DtInicio', 'DtFim', 'AgNum', 'AgNome', 
        'AgMun', 'AgUF', 'VlCred', 'VlDeb', 'VlProv', 'VlProp'
    ];
    
    basicFields.forEach(field => {
        const element = document.getElementById(field);
        if (element) {
            campos[field] = element.value;
        }
    });
    
    const det = document.getElementById('det').value;
    
    const codigosSelecionados = [];
    document.querySelectorAll('.codigo-checkbox:checked').forEach(checkbox => {
        codigosSelecionados.push(checkbox.value);
    });
    
    // Valida campos
    if (!campos.NumOcorrencia || !campos.DtInicio || !campos.AgNum || !campos.AgNome) {
        alert('Preencha os campos obrigatórios: Número Origem, Data Início, Número e Nome da Agência');
        return;
    }
    
    if (codigosSelecionados.length === 0) {
        alert('Selecione pelo menos um código de enquadramento!');
        return;
    }
    
    if (envolvidos.length === 0) {
        alert('Adicione pelo menos um envolvido!');
        return;
    }
    
    // Cria objeto de comunicacao
    const comunicacao = {
        campos,
        det,
        enquadramentos: codigosSelecionados,
        envolvidos: [...envolvidos]
    };
    
    try {
        const xmlContent = generateXmlIndividual(comunicacao);
        const blob = new Blob([xmlContent], { type: 'application/xml;charset=iso-8859-1' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `comunicacao_${campos.NumOcorrencia || 'individual'}.xml`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Erro ao gerar XML individual:', error);
        alert('Erro ao gerar XML individual. Verifique o console para detalhes.');
    }
}

function generateXmlIndividual(comunicacao) {
    let xml = '<?xml version="1.0" encoding="ISO-8859-1"?>\n';
    xml += '<LOTE>\n';
    const idOcorrencias = `SISCOAF${formatarDataHoraLocal()}`;
    xml += `  <OCORRENCIAS ID="${idOcorrencias}">\n`;
    
    xml += '    <OCORRENCIA>\n';
    xml += '      <CPFCNPJCom>13009717000146</CPFCNPJCom>\n';
    
    // Formata data
    const camposFormatados = { ...comunicacao.campos };
    camposFormatados.DtInicio = formatarDataParaXML(camposFormatados.DtInicio);
    camposFormatados.DtFim = formatarDataParaXML(camposFormatados.DtFim);
    
    // Campos
    for (const [tag, value] of Object.entries(camposFormatados)) {
        xml += `      <${tag}>${escapeXml(value || '')}</${tag}>\n`;
    }
    
    // Det
    xml += `      <Det>${escapeXml(comunicacao.det || '')}</Det>\n`;
    
    // Enquadramentos
    if (comunicacao.enquadramentos.length > 0) {
        xml += '      <ENQUADRAMENTOS>\n';
        for (const cod of comunicacao.enquadramentos) {
            xml += `        <CodEng>${escapeXml(cod)}</CodEng>\n`;
        }
        xml += '      </ENQUADRAMENTOS>\n';
    }
    
    // Envolvidos
    if (comunicacao.envolvidos.length > 0) {
        xml += '      <ENVOLVIDOS>\n';
        for (const env of comunicacao.envolvidos) {
            xml += '        <ENVOLVIDO>\n';
            
            // Formata datas de envolvidos
            const envFormatado = { ...env };
            envFormatado.DtAbConta = formatarDataParaXML(envFormatado.DtAbConta);
            envFormatado.DtAtualCad = formatarDataParaXML(envFormatado.DtAtualCad);
            
            for (const [key, value] of Object.entries(envFormatado)) {
                xml += `          <${key}>${escapeXml(value || '')}</${key}>\n`;
            }
            xml += '        </ENVOLVIDO>\n';
        }
        xml += '      </ENVOLVIDOS>\n';
    }
    
    xml += '    </OCORRENCIA>\n';
    xml += '  </OCORRENCIAS>\n';
    xml += '</LOTE>';
    
    return prettifyXml(xml);
}

function escapeXml(unsafe) {
    return unsafe.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
        .replace(/[^\x00-\x7F]/g, function(char) {
            // Preserva caracteres latinos
            return '&#' + char.charCodeAt(0) + ';';
        });
}

function prettifyXml(xml) {
    const reg = /(>)(<)(\/*)/g;
    xml = xml.replace(reg, '$1\r\n$2$3');
    let pad = 0;
    return xml.split('\r\n').map(node => {
        let indent = 0;
        if (node.match(/.+<\/\w[^>]*>$/)) {
            indent = 0;
        } else if (node.match(/^<\/\w/)) {
            if (pad !== 0) pad -= 1;
        } else if (node.match(/^<\w[^>]*[^/]>.*$/)) {
            indent = 1;
        } else {
            indent = 0;
        }
        const padding = '  '.repeat(pad);
        pad += indent;
        return padding + node;
    }).join('\r\n');
}

function monitorarAlteracoes() {
    const campos = [
        'NumOcorrencia', 'DtInicio', 'DtFim', 'AgNum', 'AgNome', 'AgMun', 'AgUF',
        'VlCred', 'VlDeb', 'VlProv', 'VlProp', 'det', 'CPFCNPJEnv', 'NmEnv', 'TpEnv',
        'AgNumEnv', 'AgNomeEnv', 'NumConta', 'DtAbConta', 'DtAtualCad'
    ];
    
    campos.forEach(campo => {
        const element = document.getElementById(campo);
        if (element) {
            element.addEventListener('input', () => {
                formularioAlterado = true;
            });
        }
    });
    
    // Monitora checkboxes
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            formularioAlterado = true;
        });
    });
    
    // Monitora adicao de envolvidos
    document.getElementById('add-envolvido')?.addEventListener('click', () => {
        formularioAlterado = true;
    });
}
