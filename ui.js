// ============================================================
// AlfaVed PHE v46 — CAMADA DE INTERFACE (UI)
// Wizard Multi-Seção com MODELO ÚNICO GLOBAL:
// - seletor de modelo visível em todas as etapas
// - mudar o modelo recalcula TODAS as seções
// ============================================================

var ui = {};

// ---------- ESTADO DO WIZARD (modelo único global) ----------
ui.multi = { step: 1, modelo: 'auto', r1: null, r2: null, r3: null };

// ---------- LEITURA DOS CAMPOS ----------
ui.readInput = function(){
  var fs = document.getElementById('fs').value;
  var pv = document.getElementById('pvap') ? document.getElementById('pvap').value : 2;
  return {
    fp: document.getElementById('fp').value,
    bp: parseFloat(document.getElementById('bp').value) || 0,
    vp: parseFloat(document.getElementById('vp').value),
    tip: parseFloat(document.getElementById('tip').value),
    top: parseFloat(document.getElementById('top').value),
    dpp: parseFloat(document.getElementById('dpp').value),
    fs: fs,
    vs: parseFloat(document.getElementById('vs').value),
    tis: parseFloat(document.getElementById('tis').value),
    tos: parseFloat(document.getElementById('tos').value),
    dps: parseFloat(document.getElementById('dps').value),
    tpl: document.getElementById('tpl').value,
    mat: document.getElementById('mat').value,
    ps: document.getElementById('ps').value,
    mg: parseFloat(document.getElementById('mg').value),
    pressure: parseFloat(pv),
    rf: parseFloat(document.getElementById('rf').value) || 0.0001
  };
};

// ---------- MODO ----------
ui.setModo = function(m){
  ui.modo = m;
  var b1 = document.getElementById('btnSimples');
  var b2 = document.getElementById('btnMulti');
  var sm = document.getElementById('secMulti');
  var mi = document.getElementById('modoInfo');
  if (b1) b1.classList.toggle('act', m === 'simples');
  if (b2) b2.classList.toggle('act', m === 'multi');
  if (sm) sm.style.display = m === 'multi' ? 'block' : 'none';
  if (mi) mi.innerHTML = m === 'multi' ? '<b>Multi-Seção:</b> Wizard 3 etapas · modelo único global.'
                                        : '<b>Simples:</b> Martin+Kumar avg, f 30/70.';
  if (m === 'multi') ui.multi = { step: 1, modelo: 'auto', r1: null, r2: null, r3: null };
};
ui.modo = 'simples';

// ---------- SERVIÇO ----------
ui.tgServ = function(){
  var fs = document.getElementById('fs').value;
  var bx = document.getElementById('bx_vapor');
  if (bx) bx.style.display = fs === 'vapor' ? 'block' : 'none';
  var note = document.getElementById('vapor_note');
  if (note) note.style.display = fs === 'vapor' ? 'block' : 'none';
  if (fs === 'vapor') {
    var pv = document.getElementById('pvap').value;
    var tsat = { 2: 120, 3: 134, 6: 159, 10: 180 }[pv] || 120;
    document.getElementById('tis').value = tsat;
    document.getElementById('tos').value = tsat;
    document.getElementById('vs').value = 0.5;
  }
};

// ---------- CÁLCULO (Simples) ----------
ui.calc = function(){
  try {
    if (ui.modo === 'multi') { ui.wizard(); return; }
    var inp = ui.readInput();
    if (!inp.vp || inp.vp <= 0) { alert('Vazão produto inválida'); return; }
    var hc = detectHotCold(inp);
    if (hc.error) { alert(hc.error); return; }
    if (isVapor(inp.fs, inp.tis, inp.tos)) {
      var pb0 = gProd(inp.fp, (inp.tip + inp.top) / 2, inp.bp);
      var mp0 = inp.vp * pb0.rho / 3600;
      var Q0 = mp0 * pb0.cp * Math.abs(inp.top - inp.tip) / 1000;
      var vf = calcVaporFlow(Q0, inp.pressure || 2);
      inp.vs = vf.vCond;
      document.getElementById('vs').value = inp.vs.toFixed(2);
    }
    if (!inp.vs || inp.vs <= 0) { alert('Vazão serviço inválida'); return; }
    var dT1 = hc.hot.in - hc.cold.out, dT2 = hc.hot.out - hc.cold.in;
    if (dT1 <= 0 || dT2 <= 0) { alert('Programa térmico inválido: ΔT deve ser positivo.'); return; }
    var pt = inp.ps === 'auto' ? PASSOS : [inp.ps];
    var r = mCalcSec(inp, pt, hc);
    ui.showResult(r, inp, r.todosCalculados || []);
  } catch (e) { alert('Erro no cálculo: ' + e.message); }
};

// ============================================================
// WIZARD MULTI-SEÇÃO — MODELO ÚNICO GLOBAL
// ============================================================

ui.modelOptions = function(sel){
  var h = '<option value="auto">Auto (melhor modelo)</option>';
  PLATES.forEach(function(m){
    var s = (sel && sel === m.n) ? ' selected' : '';
    h += '<option value="' + m.n + '"' + s + '>' + m.n + ' (β' + m.be + ' · ' + m.ap + ' m²)</option>';
  });
  return h;
};

// Recalcula TODAS as seções com o modelo global atual
ui.recalcAll = function(){
  try {
    var inp = ui.readInput();
    if (!inp.vp || inp.vp <= 0) { alert('Vazão produto inválida'); return; }
    var modelo = ui.multi.modelo === 'auto' ? null : ui.multi.modelo;
    ui.multi.r1 = wCalcPasteurizacao(inp, modelo);
    ui.multi.r2 = wCalcRegen(inp, modelo);
    ui.multi.r3 = wCalcResf(inp, modelo);
    ui.wizardPanel();
    ui.showResumo();
  } catch (e) { alert('Erro: ' + e.message); }
};

// Quando o usuário muda o modelo global
ui.onModeloChange = function(){
  ui.multi.modelo = document.getElementById('selModeloGlobal').value;
  ui.recalcAll();
};

ui.wizardPanel = function(){
  var res = document.getElementById('res');
  if (!res) return;
  var p = document.getElementById('wizardPanel');
  if (!p) {
    p = document.createElement('div');
    p.id = 'wizardPanel';
    p.style.cssText = 'padding:12px;background:#f7f9fc;border:1px solid #d0d5dd;border-radius:8px;margin-bottom:12px;';
    res.insertBefore(p, res.firstChild);
  }
  var s = ui.multi.step;
  var nomes = ['1. Pasteurização', '2. Regeneração', '3. Resfriamento'];
  var h = '<div style="display:flex;gap:6px;margin-bottom:10px">';
  for (var i = 1; i <= 3; i++) {
    var at = i === s ? 'background:#1a3a5c;color:#fff' : 'background:#e2e8f0;color:#334';
    var done = (i < s) ? ' ✓' : '';
    h += '<div style="flex:1;text-align:center;padding:6px;border-radius:6px;font-size:12px;font-weight:700;' + at + '">' + nomes[i-1] + done + '</div>';
  }
  h += '</div>';
  // Seletor de modelo GLOBAL (visível em todas as etapas)
  h += '<div style="margin-bottom:10px;padding:8px;background:#e7f0fd;border:1px solid #b8d0ea;border-radius:6px">' +
       '<b>Modelo do equipamento (único para todas as seções):</b> ' +
       '<select id="selModeloGlobal" onchange="ui.onModeloChange()" style="margin-left:6px;padding:4px;min-width:200px">' +
       ui.modelOptions(ui.multi.modelo === 'auto' ? null : ui.multi.modelo) + '</select>' +
       '<button onclick="ui.recalcAll()" style="margin-left:8px;padding:5px 12px;background:#1a3a5c;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:700">Recalcular Tudo</button>' +
       '</div>';
  h += '<div id="wizBody" style="font-size:13px;color:#334"></div>';
  p.innerHTML = h;
  ui.wizardBody();
};

ui.wizardBody = function(){
  var b = document.getElementById('wizBody');
  if (!b) return;
  var s = ui.multi.step, m = ui.multi;
  var nomes = ['Pasteurização', 'Regeneração', 'Resfriamento'];
  var r = m['r' + s];
  var info = r ? 'Modelo: <b>' + r.mod + '</b> · ' + r.n + ' placas · ' + r.A.toFixed(2) + ' m² · dP ' + r.dp1.toFixed(1) + ' kPa · ' + (r.vi ? '<span style="color:#2d9e4a;font-weight:700">VIÁVEL</span>' : '<span style="color:#cc3300;font-weight:700">NÃO VIÁVEL</span>') : 'não calculado';
  b.innerHTML = '<div style="margin-bottom:8px"><b>Etapa ' + s + ' — ' + nomes[s-1] + ':</b></div>' +
                '<div style="color:#1a3a5c;font-size:12px">' + info + '</div>' +
                '<button onclick="ui.recalcAll()" style="margin-top:8px;padding:6px 14px;background:#2d9e4a;color:#fff;border:none;border-radius:6px;font-weight:700;cursor:pointer">Calcular</button>';
  var nav = '<div style="margin-top:12px;display:flex;gap:8px">';
  if (s > 1) nav += '<button onclick="ui.wNav(-1)" style="padding:5px 12px;background:#e2e8f0;border:none;border-radius:6px;cursor:pointer">← Voltar</button>';
  if (s < 3) nav += '<button onclick="ui.wNav(1)" style="padding:5px 12px;background:#1a3a5c;color:#fff;border:none;border-radius:6px;cursor:pointer">Avançar →</button>';
  if (s === 3) nav += '<button onclick="ui.wResumo()" style="padding:5px 12px;background:#2d9e4a;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:700">Ver Resumo Final</button>';
  nav += '</div>';
  b.innerHTML += nav;
};

ui.wNav = function(d){ ui.multi.step += d; ui.wizardPanel(); };

// Resumo final com o MESMO modelo nas 3 seções
ui.showResumo = function(){
  var m = ui.multi;
  if (!m.r1 || !m.r2 || !m.r3) { alert('Calcule primeiro'); return; }
  var r1 = m.r1, r2 = m.r2, r3 = m.r3;
  var tA = r1.A + r2.A + r3.A;
  var tPl = r1.n + r2.n + r3.n;
  var tDP = r1.dp1 + r2.dp1 + r3.dp1;
  var tQ = r1.Q + r2.Q + r3.Q;
  var vi = r1.vi && r2.vi && r3.vi && tDP <= ui.readInput().dpp;
  var badge = document.getElementById('badge');
  if (vi) { badge.textContent = 'VIÁVEL'; badge.className = 'res-badge ok'; }
  else    { badge.textContent = 'NÃO VIÁVEL'; badge.className = 'res-badge notok'; }
  document.getElementById('selInfo').innerHTML =
    '<div style="font-size:16px;font-weight:800;color:#1a3a5c">Pasteurizador — Resumo Final (3 Seções)</div>' +
    '<div style="font-size:11px;color:#4a5568">Modelo único: <b>' + r1.mod + '</b> · ' + tPl + ' placas · ' + tA.toFixed(2) + ' m² · dP total ' + tDP.toFixed(1) + ' kPa</div>';
  document.getElementById('cards').innerHTML =
    '<div class="mc"><div class="mc-val">' + tQ.toFixed(1) + '</div><div class="mc-lbl">Carga kW</div></div>' +
    '<div class="mc"><div class="mc-val">' + tA.toFixed(2) + '</div><div class="mc-lbl">Área m²</div></div>' +
    '<div class="mc"><div class="mc-val">' + tDP.toFixed(1) + '</div><div class="mc-lbl">dP Total</div></div>' +
    '<div class="mc"><div class="mc-val">' + tPl + '</div><div class="mc-lbl">Placas</div></div>';
  var h = '<table class="tbl"><thead><tr><th>Seção</th><th>Modelo</th><th>Pl</th><th>Área</th><th>U</th><th>dP P</th><th>Shear</th><th>Passes</th></tr></thead><tbody>';
  h += '<tr class="hl"><td>1 Pasteur</td><td>' + r1.mod + '</td><td>' + r1.n + '</td><td>' + r1.A.toFixed(2) + '</td><td>' + r1.U.toFixed(0) + '</td><td>' + r1.dp1.toFixed(1) + '</td><td>' + (r1.tauP||0).toFixed(0) + '</td><td>' + r1.passesUsado + '</td></tr>';
  h += '<tr><td>2 Regen</td><td>' + r2.mod + '</td><td>' + r2.n + '</td><td>' + r2.A.toFixed(2) + '</td><td>' + r2.U.toFixed(0) + '</td><td>' + r2.dp1.toFixed(1) + '</td><td>' + (r2.tauP||0).toFixed(0) + '</td><td>' + r2.passesUsado + '</td></tr>';
  h += '<tr><td>3 Resfr</td><td>' + r3.mod + '</td><td>' + r3.n + '</td><td>' + r3.A.toFixed(2) + '</td><td>' + r3.U.toFixed(0) + '</td><td>' + r3.dp1.toFixed(1) + '</td><td>' + (r3.tauP||0).toFixed(0) + '</td><td>' + r3.passesUsado + '</td></tr>';
  h += '<tr style="background:#e7f0fd;font-weight:bold"><td>TOTAL</td><td>-</td><td>' + tPl + '</td><td>' + tA.toFixed(2) + '</td><td>-</td><td>' + tDP.toFixed(1) + '</td><td>-</td><td>-</td></tr></tbody></table>';
  document.getElementById('comp').innerHTML = h;
  var v = '<div class="ck"><span class="' + (vi ? 'ck-ok' : 'ck-err') + '">' + (vi ? '✓' : '✗') + '</span>Status: ' + (vi ? 'VIÁVEL' : 'NÃO VIÁVEL') + '</div>';
  v += '<div class="ck"><span class="' + (tDP <= ui.readInput().dpp ? 'ck-ok' : 'ck-err') + '">' + (tDP <= ui.readInput().dpp ? '✓' : '✗') + '</span>dP Total: ' + tDP.toFixed(1) + '/' + ui.readInput().dpp + ' kPa</div>';
  v += '<div class="ck"><span class="' + (r1.mod === r2.mod && r2.mod === r3.mod ? 'ck-ok' : 'ck-err') + '">' + (r1.mod === r2.mod && r2.mod === r3.mod ? '✓' : '✗') + '</span>Modelo único: ' + r1.mod + ' em todas as seções</div>';
  document.getElementById('ver').innerHTML = v;
};

ui.wResumo = function(){ ui.showResumo(); };

ui.wizard = function(){
  var ph = document.getElementById('ph');
  var res = document.getElementById('res');
  if (ph) ph.style.display = 'none';
  if (res) res.style.display = 'block';
  ui.wizardPanel();
};

// ---------- LIMPAR ----------
ui.limpar = function(){
  var res = document.getElementById('res');
  var ph = document.getElementById('ph');
  if (res) res.style.display = 'none';
  if (ph) ph.style.display = 'block';
  ui.multi = { step: 1, modelo: 'auto', r1: null, r2: null, r3: null };
  var wp = document.getElementById('wizardPanel');
  if (wp) wp.remove();
};

// ---------- INICIALIZAÇÃO ----------
document.addEventListener('DOMContentLoaded', function(){
  try {
    var h = '';
    if (typeof PLATES !== 'undefined') {
      PLATES.forEach(function(m){
        h += '<tr><td><b>' + m.n + '</b></td><td>' + m.be + '</td><td>' + m.ap + '</td><td>' + (m.b * 2000).toFixed(1) + '</td></tr>';
      });
      document.getElementById('cat').innerHTML = h;
    } else {
      document.getElementById('cat').innerHTML = '<tr><td colspan="4" style="color:red">ERRO: PLATES não definido</td></tr>';
    }
    var btnC = document.getElementById('btnCalc');
    var btnL = document.getElementById('btnLimpar');
    if (btnC) btnC.addEventListener('click', ui.calc);
    if (btnL) btnL.addEventListener('click', ui.limpar);
    ui.setModo('simples');
    ui.tgServ();
  } catch (e) {
    alert('Erro na inicialização: ' + e.message);
  }
});
