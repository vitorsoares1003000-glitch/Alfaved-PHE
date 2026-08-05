// ============================================================
// APP.JS — Interface do Dimensionador PHE
// ============================================================

const FLUIDOS = [
  { id: 'agua', nome: 'Água' },
  { id: 'glicol30', nome: 'Água glicolada 30%' },
  { id: 'oleo', nome: 'Óleo mineral' },
  { id: 'leite', nome: 'Leite integral' },
  { id: 'personalizado', nome: 'Personalizado' }
];

const $ = (id) => document.getElementById(id);
const fmt = (n, d = 1) => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: d });
const moeda = (n) => 'R$ ' + Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 0 });

function nomeFluido(id) {
  const f = FLUIDOS.find(f => f.id === id);
  return f ? f.nome : id;
}

function montarFluidos(selId, persId) {
  const sel = $(selId);
  FLUIDOS.forEach(f => {
    const op = document.createElement('option');
    op.value = f.id;
    op.textContent = f.nome;
    sel.appendChild(op);
  });
  sel.addEventListener('change', () => {
    $(persId).style.display = sel.value === 'personalizado' ? 'grid' : 'none';
  });
}

function montarFabricantes() {
  const cont = $('fabricantesLista');
  FABRICANTES.forEach(fab => {
    const lab = document.createElement('label');
    lab.className = 'check-fab' + (fab.destaque ? ' destaque' : '');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = fab.id;
    cb.checked = fab.destaque;
    lab.appendChild(cb);
    lab.appendChild(document.createTextNode(' ' + fab.nome + (fab.destaque ? ' ★' : '')));
    cont.appendChild(lab);
  });
}

function lerNumero(id) {
  const raw = ($(id).value || '').trim().replace(',', '.');
  const v = parseFloat(raw);
  return isNaN(v) ? NaN : v;
}

function lerPersonalizado(prefixo) {
  const rho = lerNumero(prefixo + '_rho');
  if (isNaN(rho)) return null;
  return { rho, cp: lerNumero(prefixo + '_cp'), mu: lerNumero(prefixo + '_mu'), k: lerNumero(prefixo + '_k') };
}

function calcular() {
  const erros = [];

  const fh = { id: $('fluidoQ').value, vazao: lerNumero('vazaoQ'), t1: lerNumero('tq1'), t2: lerNumero('tq2') };
  const tf2raw = ($('tf2').value || '').trim();
  const fc = { id: $('fluidoF').value, vazao: lerNumero('vazaoF'), t1: lerNumero('tf1'), t2: tf2raw === '' ? null : lerNumero('tf2') };

  if (isNaN(fh.vazao) || fh.vazao <= 0) erros.push('Informe a vazão do lado quente.');
  if (isNaN(fc.vazao) || fc.vazao <= 0) erros.push('Informe a vazão do lado frio.');
  if (isNaN(fh.t1) || isNaN(fh.t2)) erros.push('Informe as temperaturas do lado quente.');
  if (fh.t2 >= fh.t1) erros.push('No lado quente, a temperatura de saída deve ser menor que a de entrada.');
  if (isNaN(fc.t1)) erros.push('Informe a temperatura de entrada do lado frio.');
  if (fc.t2 != null && !isNaN(fc.t2) && fc.t2 <= fc.t1) erros.push('No lado frio, a saída deve ser maior que a entrada.');
  if (fc.t2 != null && !isNaN(fc.t2) && fc.t2 >= fh.t1) erros.push('Cruzamento térmico: saída do frio maior que entrada do quente.');

  const dPmaxQ = lerNumero('dPmaxQ');
  const dPmaxF = lerNumero('dPmaxF');
  if (isNaN(dPmaxQ) || dPmaxQ <= 0) erros.push('Informe o ΔP máximo do lado quente.');
  if (isNaN(dPmaxF) || dPmaxF <= 0) erros.push('Informe o ΔP máximo do lado frio.');

  if (erros.length) {
    $('errosEntrada').innerHTML = erros.map(e => `<div class="erro">${e}</div>`).join('');
    return;
  }
  $('errosEntrada').innerHTML = '';

  const selecionados = [...document.querySelectorAll('#fabricantesLista input:checked')].map(i => i.value);
  if (selecionados.length === 0) {
    $('errosEntrada').innerHTML = '<div class="erro">Selecione ao menos um fabricante.</div>';
    return;
  }

  const rfQ = lerNumero('rfQ');
  const rfF = lerNumero('rfF');
  const margem = lerNumero('margem');
  const precoBase = lerNumero('precoBase');

  const entrada = {
    fh, fc,
    pers: { fh: lerPersonalizado('pq'), fc: lerPersonalizado('pf') },
    dPmaxQ, dPmaxF,
    rfQ: isNaN(rfQ) ? 0.00005 : rfQ,
    rfF: isNaN(rfF) ? 0.0001 : rfF,
    margem: isNaN(margem) ? 10 : margem,
    precoBase: isNaN(precoBase) ? 1500 : precoBase,
    fabricantes: selecionados
  };

  const resultados = compararFabricantes(entrada);
  renderResultado(entrada, resultados);
}

function renderResultado(entrada, resultados) {
  const painel = $('painelResultado');
  painel.classList.remove('oculto');

  const validos = resultados.filter(r => !r.erro);
  if (validos.length === 0) {
    $('resumoCarga').innerHTML = '<div class="erro">Nenhum fabricante conseguiu dimensionar com os dados informados. Revise as restrições (ΔP, temperaturas).</div>';
    $('economiaAlfaved').innerHTML = '';
    $('comparativo').innerHTML = '';
    $('detalhes').innerHTML = '';
    return;
  }

  const primeiro = validos[0];
  const avisos = [...(primeiro.alertas || [])];
  if (entrada.fh.id === 'personalizado' && !entrada.pers.fh) avisos.push('Fluido quente personalizado: propriedades não informadas — usando valores padrão de água.');
  if (entrada.fc.id === 'personalizado' && !entrada.pers.fc) avisos.push('Fluido frio personalizado: propriedades não informadas — usando valores padrão de água.');

  $('resumoCarga').innerHTML = `
    <div class="cartao-resumo">
      <div class="kpi"><div class="rotulo">Carga térmica</div><div class="valor">${fmt(primeiro.Q / 1000, 1)} kW</div></div>
      <div class="kpi"><div class="rotulo">LMTD</div><div class="valor">${fmt(primeiro.LMTD, 1)} °C</div></div>
      <div class="kpi"><div class="rotulo">Saída lado frio</div><div class="valor">${fmt(primeiro.tc2, 1)} °C</div></div>
      <div class="kpi"><div class="rotulo">Lado quente</div><div class="valor" style="font-size:.9rem">${nomeFluido(entrada.fh.id)}</div></div>
      <div class="kpi"><div class="rotulo">Lado frio</div><div class="valor" style="font-size:.9rem">${nomeFluido(entrada.fc.id)}</div></div>
    </div>
    ${avisos.map(a => `<div class="aviso">${a}</div>`).join('')}`;

  renderEconomia(resultados);
  renderComparativo(resultados);
  renderDetalhes(resultados);
}

function renderEconomia(resultados) {
  const alf = resultados.find(r => r.destaque && !r.erro);
  const outros = resultados.filter(r => !r.destaque && !r.erro);
  if (!alf || outros.length === 0) { $('economiaAlfaved').innerHTML = ''; return; }

  const melhorOutro = outros.reduce((a, b) => a.area < b.area ? a : b);
  const economiaArea = (1 - alf.area / melhorOutro.area) * 100;
  const economiaCusto = (1 - alf.custo / melhorOutro.custo) * 100;

  $('economiaAlfaved').innerHTML = `<div class="economia">
    <strong>★ Vantagem Alfaved:</strong> neste caso a Alfaved dimensiona com
    <strong>${fmt(Math.abs(economiaArea), 1)}% ${economiaArea >= 0 ? 'menos' : 'mais'} área</strong> e
    <strong>${fmt(Math.abs(economiaCusto), 1)}% ${economiaCusto >= 0 ? 'menor' : 'maior'} custo estimado</strong>
    em relação à melhor alternativa (${melhorOutro.nome}, placa ${melhorOutro.placa}).</div>`;
}

function renderComparativo(resultados) {
  const ordenados = resultados.filter(r => !r.erro).sort((a, b) => a.area - b.area);
  let html = '<h3>Comparativo entre fabricantes</h3><table class="tabela"><thead><tr>' +
    '<th>Fabricante</th><th>Placa</th><th>Área (m²)</th><th>Nº placas</th><th>Passos</th>' +
    '<th>U (W/m²K)</th><th>ΔP Q (kPa)</th><th>ΔP F (kPa)</th><th>Custo (R$)</th><th>Atende</th>' +
    '</tr></thead><tbody>';

  for (const r of ordenados) {
    const atende = r.okQ && r.okF ? '<span class="ok">Sim</span>' : '<span class="nao">Não</span>';
    html += `<tr class="${r.destaque ? 'destaque-row' : ''}">` +
      `<td>${r.destaque ? '★ ' : ''}${r.nome}</td><td>${r.placa}</td><td>${fmt(r.area, 2)}</td>` +
      `<td>${r.Nplacas}</td><td>${r.passos}</td><td>${fmt(r.U, 0)}</td>` +
      `<td>${fmt(r.dPq, 1)}</td><td>${fmt(r.dPf, 1)}</td><td>${moeda(r.custo)}</td><td>${atende}</td></tr>`;
  }
  for (const r of resultados) {
    if (r.erro) html += `<tr><td>${r.nome}</td><td colspan="9" class="nao">${r.erro}</td></tr>`;
  }
  html += '</tbody></table>';
  $('comparativo').innerHTML = html;
}

function renderDetalhes(resultados) {
  let html = '<div class="detalhes-fab"><h3>Parâmetros de cálculo por fabricante</h3>';
  for (const r of resultados) {
    if (r.erro) continue;
    html += `<div class="detalhe-cartao" style="border-top:3px solid ${r.cor}">` +
      `<span><b>Fabricante</b>${r.nome}</span>` +
      `<span><b>Placa</b>${r.placa} (chevron ${r.chevron}°)</span>` +
      `<span><b>Material</b>${r.material}</span>` +
      `<span><b>h quente</b>${fmt(r.hq, 0)} W/m²K</span>` +
      `<span><b>h frio</b>${fmt(r.hf, 0)} W/m²K</span>` +
      `<span><b>U global</b>${fmt(r.U, 0)} W/m²K</span>` +
      `<span><b>Re quente</b>${fmt(r.Req, 0)}</span>` +
      `<span><b>Re frio</b>${fmt(r.Ref, 0)}</span>` +
      `<span><b>ΔP quente</b>${fmt(r.dPq, 1)} kPa</span>` +
      `<span><b>ΔP frio</b>${fmt(r.dPf, 1)} kPa</span>` +
      `<span><b>Custo estimado</b>${moeda(r.custo)}</span>` +
      `</div>`;
  }
  html += '</div>';
  $('detalhes').innerHTML = html;
}

document.addEventListener('DOMContentLoaded', () => {
  montarFluidos('fluidoQ', 'persQ');
  montarFluidos('fluidoF', 'persF');
  montarFabricantes();
  $('btnCalcular').addEventListener('click', calcular);
  $('btnImprimir').addEventListener('click', () => window.print());
});
