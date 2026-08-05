document.addEventListener('DOMContentLoaded', () => {
    montarFabricantes();
    configurarNavegacao();
    configurarCalcular();
    configurarImprimir();
    configurarMenuMobile();
});

// ===== MENU MOBILE =====
function configurarMenuMobile() {
    const toggle = document.getElementById('menuToggle');
    const nav = document.getElementById('navMenu');
    toggle.addEventListener('click', () => nav.classList.toggle('open'));
}

// ===== MONTAR FABRICANTES (com checkbox) =====
function montarFabricantes() {
    const grid = document.getElementById('fabGrid');
    grid.innerHTML = '';
    Object.entries(FABRICANTES).forEach(([key, fab]) => {
        const card = document.createElement('div');
        card.className = 'fab-card selected';
        card.dataset.key = key;
        card.innerHTML = `
            <label class="checkbox-label">
                <input type="checkbox" class="fab-checkbox" checked>
                <span class="checkmark"></span>
            </label>
            <div class="fab-logo" style="color:${fab.cor}">${fab.logo}</div>
            <div class="fab-nome">${fab.nome}</div>
            <div class="fab-desc">${fab.descricao}</div>
            <div class="fab-modelos">${fab.modelos.length} modelos</div>
        `;
        card.addEventListener('click', (e) => {
            // Não alternar se clicou no checkbox diretamente
            if (e.target.classList.contains('fab-checkbox')) {
                card.classList.toggle('selected', e.target.checked);
                return;
            }
            const checkbox = card.querySelector('.fab-checkbox');
            checkbox.checked = !checkbox.checked;
            card.classList.toggle('selected', checkbox.checked);
        });
        grid.appendChild(card);
    });
}

// ===== NAVEGAÇÃO =====
function configurarNavegacao() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.querySelector(link.getAttribute('href'));
            if (target) target.scrollIntoView({ behavior: 'smooth' });
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            document.getElementById('navMenu').classList.remove('open');
        });
    });
}

// ===== CALCULAR =====
function configurarCalcular() {
    document.getElementById('btnCalcular').addEventListener('click', () => {
        // Coletar fabricantes selecionados
        const fabricantes = [];
        document.querySelectorAll('.fab-checkbox').forEach(cb => {
            if (cb.checked) {
                fabricantes.push(cb.closest('.fab-card').dataset.key);
            }
        });

        if (fabricantes.length === 0) {
            alert('Selecione pelo menos um fabricante.');
            return;
        }

        const dados = {
            fluidoQ: document.getElementById('fluidoQ').value,
            vazaoQ: parseFloat(document.getElementById('vazaoQ').value),
            tinQ: parseFloat(document.getElementById('tinQ').value),
            toutQ: parseFloat(document.getElementById('toutQ').value),
            fluidoF: document.getElementById('fluidoF').value,
            vazaoF: parseFloat(document.getElementById('vazaoF').value),
            tinF: parseFloat(document.getElementById('tinF').value),
            toutF: parseFloat(document.getElementById('toutF').value) || null,
            dpQ: parseFloat(document.getElementById('dpQ').value),
            dpF: parseFloat(document.getElementById('dpF').value),
            incQ: parseFloat(document.getElementById('incQ').value),
            incF: parseFloat(document.getElementById('incF').value),
            margem: parseFloat(document.getElementById('margem').value),
            fatorU: parseFloat(document.getElementById('fatorU').value) || 1.0,
            fabricantes: fabricantes
        };

        if (!dados.vazaoQ || !dados.tinQ || !dados.toutQ) {
            alert('Preencha os dados do lado quente.');
            return;
        }

        const resultado = dimensionar(dados);
        exibirResultado(resultado);
    });
}

// ===== EXIBIR RESULTADO =====
function exibirResultado(r) {
    const sec = document.getElementById('resultado');
    const conteudo = document.getElementById('resultadoConteudo');

    let html = `
        <div class="resultado-resumo">
            <h4>📊 Resumo do processo</h4>
            <p><strong>Calor trocado:</strong> ${formatarNum(r.Q / 1000)} kW</p>
            <p><strong>LMTD:</strong> ${r.lmtd.toFixed(1)} °C</p>
            <p><strong>Temperatura saída lado frio:</strong> ${r.toutF.toFixed(1)} °C</p>
        </div>
    `;

    html += `<h4 style="margin:20px 0 10px;">Modelo recomendado por fabricante</h4>`;
    html += `<table class="tabela-comp">
        <thead><tr>
            <th>Fabricante</th>
            <th>Modelo</th>
            <th>Área (m²)</th>
            <th>Placas</th>
            <th>Área/placa (m²)</th>
            <th>Chevron (°)</th>
            <th>Vazão máx. (m³/h)</th>
        </tr></thead>
        <tbody>`;
    r.resultados.forEach(f => {
        html += `<tr>
            <td>${f.nome}</td>
            <td><strong>${f.modelo}</strong></td>
            <td>${f.area.toFixed(1)}</td>
            <td>${f.numPlacas}</td>
            <td>${f.areaPorPlaca.toFixed(3)}</td>
            <td>${f.chevron}</td>
            <td>${f.vazaoMax}</td>
        </tr>`;
    });
    html += `</tbody></table>`;
    html += `<div class="chart-container"><canvas id="graficoArea"></canvas></div>`;

    conteudo.innerHTML = html;
    sec.style.display = 'block';
    gerarGrafico(r);
    sec.scrollIntoView({ behavior: 'smooth' });
}

// ===== GRÁFICO =====
function gerarGrafico(r) {
    const ctx = document.getElementById('graficoArea');
    if (!ctx) return;
    if (window.graficoAtual) window.graficoAtual.destroy();
    const labels = r.resultados.map(f => f.nome + ' (' + f.modelo + ')');
    const areas = r.resultados.map(f => parseFloat(f.area.toFixed(1)));
    const cores = r.resultados.map(f => f.cor);
    window.graficoAtual = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Área necessária (m²)',
                data: areas,
                backgroundColor: cores,
                borderRadius: 8,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                title: { display: true, text: 'Comparativo de área entre fabricantes', font: { size: 16, weight: 'bold' } }
            },
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Área (m²)' }, grid: { color: '#e2e8f0' } },
                x: { grid: { display: false } }
            }
        }
    });
}

// ===== IMPRIMIR =====
function configurarImprimir() {
    document.getElementById('btnImprimir').addEventListener('click', () => window.print());
}

// ===== UTILITÁRIOS =====
function formatarNum(n) { return n.toLocaleString('pt-BR', { maximumFractionDigits: 1 }); }
