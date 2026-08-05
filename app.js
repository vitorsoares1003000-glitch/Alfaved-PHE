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

// ===== MONTAR FABRICANTES =====
function montarFabricantes() {
    const grid = document.getElementById('fabGrid');
    grid.innerHTML = '';
    Object.entries(FABRICANTES).forEach(([key, fab]) => {
        const card = document.createElement('div');
        card.className = 'fab-card' + (fab.proprio ? ' alfaved' : '') + ' selected';
        card.dataset.key = key;
        card.innerHTML = `
            <div class="fab-logo" style="color:${fab.cor}">${fab.logo}</div>
            <div class="fab-nome">${fab.nome}</div>
            <div class="fab-desc">${fab.descricao}</div>
            ${fab.proprio ? '<span class="fab-badge">⭐ Linha própria</span>' : ''}
            <div class="fab-check">✓ Selecionado</div>
        `;
        card.addEventListener('click', () => {
            card.classList.toggle('selected');
            const check = card.querySelector('.fab-check');
            check.style.display = card.classList.contains('selected') ? 'block' : 'none';
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
            preco: parseFloat(document.getElementById('preco').value)
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
    const alfaved = r.resultados.find(x => x.proprio);
    const melhor = r.resultados[0];

    let html = `
        <div class="resultado-resumo">
            <h4>📊 Resumo do processo</h4>
            <p><strong>Calor trocado:</strong> ${formatarNum(r.Q / 1000)} kW</p>
            <p><strong>LMTD:</strong> ${r.lmtd.toFixed(1)} °C</p>
            <p><strong>Temperatura saída lado frio:</strong> ${r.toutF.toFixed(1)} °C</p>
            <p><strong>Vazão mássica quente:</strong> ${r.mQ.toFixed(1)} kg/s | <strong>Frio:</strong> ${r.mF.toFixed(1)} kg/s</p>
        </div>
    `;

    if (alfaved && melhor) {
        const economia = ((melhor.area - alfaved.area) / melhor.area * 100).toFixed(1);
        html += `
            <div class="destaque-alfaved">
                <h4>⭐ ALFAVED — Solução recomendada</h4>
                <p><strong>Área:</strong> ${alfaved.area.toFixed(1)} m² | <strong>Placas:</strong> ${alfaved.numPlacas} | <strong>Custo:</strong> ${formatarMoeda(alfaved.custo)}</p>
                <p><strong>Economia vs. concorrente mais próximo:</strong> ${economia}% de área</p>
            </div>
        `;
    }

    html += `<h4 style="margin:20px 0 10px;">Comparativo entre fabricantes</h4>`;
    html += `<table class="tabela-comp">
        <thead><tr><th>Fabricante</th><th>Área (m²)</th><th>Placas</th><th>Custo (R$)</th><th>ΔP (kPa)</th><th>U (W/m²·K)</th></tr></thead>
        <tbody>`;
    r.resultados.forEach(f => {
        html += `<tr class="${f.proprio ? 'alfaved-row' : ''}">
            <td>${f.proprio ? '⭐ ' : ''}${f.nome}</td>
            <td>${f.area.toFixed(1)}</td><td>${f.numPlacas}</td>
            <td>${formatarMoeda(f.custo)}</td><td>${f.dp.toFixed(0)}</td><td>${f.U.toFixed(0)}</td>
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
    const labels = r.resultados.map(f => f.proprio ? f.nome + ' ⭐' : f.nome);
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
function formatarMoeda(n) { return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
