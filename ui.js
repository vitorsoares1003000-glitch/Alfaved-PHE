// ============================================================
// AlfaVed PHE v45 — CAMADA DE INTERFACE (UI)
// Wizard Multi-Seção: Etapa 1 → 2 → 3, modelo base reutilizado,
// com seleção manual se não atender.
// ============================================================

var ui = {};

// ---------- ESTADO DO WIZARD ----------
ui.multi = { step: 1, baseModel: null, r1: null, r2: null, r3: null, manual2: null, manual3: null };

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
  if (mi) mi.innerHTML = m === 'multi' ? '<b>Multi-Seção:</b> Wizard 3 etapas (Pasteurização → Regen → Resfr).'
                                        : '<b>Simples:</b> Martin+Kumar avg, f 30/70.';
  if (m === 'multi') ui.multi.step = 1;
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
// WIZARD MULTI-SEÇÃO
// ============================================================

// Injeta o painel do wizard no container de resultados
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
  h += '<div id="wizBody" style="font-size:13px;color:#334"></div>';
  p.innerHTML = h;
  ui.wizardBody();
};

ui.wizardBody = function(){
  var b = document.getElementById('wizBody');
  if (!b) return;
  var s = ui.multi.step, m = ui.multi;
  if (s === 1) {
    b.innerHTML =
      '<div style="margin-bottom:8px"><b>Etapa 1 — Pasteurização:</b> informe o produto (T.Ent/Sai) e o vapor.</div>' +
      '<div style="color:#1a3a5c;font-size:12px">Produto: ' + (m.r1 ? m.r1.mod + ' · ' + m.r1.n + ' placas · ' + m.r1.A.toFixed(2) + ' m²' : 'não calculado') + '</div>' +
      '<button onclick="ui.wCalc1()" style="margin-top:8px;padding:6px 14px;background:#2d9e4a;color:#fff;border:none;border-radius:6px;font-weight:700;cursor:pointer">Calcular Etapa 1</button>';
  } else if (s === 2) {
    var r2 = m.r2;
    var manualHtml = '';
    if (r2 && r2.manual) {
      manualHtml = '<div style="margin-top:8px;padding:8px;background:#fff3cd;border:1px solid #e0c200;border-radius:6px">' +
        '<b>Modelo base (' + m.baseModel + ') não atende a Regeneração.</b> Selecione manualmente:' +
        '<select id="selModel2" style="margin:6px 0;padding:4px;width:100%">' + ui.modelOptions() + '</select>' +
        '<button onclick="ui.wCalc2(true)" style="padding:5px 12px;background:#1a3a5c;color:#fff;border:none;border-radius:6px;cursor:pointer">Calcular com modelo escolhido</button></div>';
    }
    b.innerHTML =
      '<div style="margin-bottom:8px"><b>Etapa 2 — Regeneração:</b> produto quente vs produto frio. Modelo base: <b>' + (m.baseModel || '—') + '</b></div>' +
      '<div style="color:#1a3a5c;font-size:12px">' + (r2 ? 'Modelo: ' + r2.mod + ' · ' + r2.n + ' placas · dP ' + r2.dp1.toFixed(1) + ' kPa · ' + (r2.vi ? 'VIÁVEL' : 'NÃO VIÁVEL') : 'não calculado') + '</div>' +
      manualHtml +
      '<button onclick="ui.wCalc2(false)" style="margin-top:8px;padding:6px 14px;background:#2d9e4a;color:#fff;border:none;border-radius:6px;font-weight:700;cursor:pointer">Calcular Etapa 2</button>';
  } else if (s === 3) {
    var r3 = m.r3;
    var manualHtml = '';
    if (r3 && r3.manual) {
      manualHtml = '<div style="margin-top:8px;padding:8px;background:#fff3cd;border:1px solid #e0c200;border-radius:6px">' +
        '<b>Modelo base (' + m.baseModel + ') não atende o Resfriamento.</b> Selecione manualmente:' +
        '<select id="selModel3" style="margin:6px 0;padding:4px;width:100%">' + ui.modelOptions() + '</select>' +
        '<button onclick="ui.wCalc3(true)" style="padding:5px 12px;background:#1a3a5c;color:#fff;border:none;border-radius:6px;cursor:pointer">Calcular com modelo escolhido</button></div>';
    }
    b.innerHTML =
      '<div style="margin-bottom:8px"><b>Etapa 3 — Resfriamento:</b> produto + água gelada. Modelo base: <b>' + (m.baseModel || '—') + '</b></div>' +
      '<div style="color:#1a3a5c;font-size:12px">' + (r3 ? 'Modelo: ' + r3.mod + ' · ' + r3.n + ' placas · dP ' + r3.dp1.toFixed(1) + ' kPa · ' + (r3.vi ? 'VIÁVEL' : 'NÃO VIÁVEL') : 'não calculado') + '</div>' +
      manualHtml +
      '<button onclick="ui.wCalc3(false)" style="margin-top:8px;padding:6px 14px;background:#2d9e4a;color:#fff;border:none;border-radius:6px;font-weight:700;cursor:pointer">Calcular Etapa 3</button>';
  }
  // Navegação
  var nav = '<div style="margin-top:12px;display:flex;gap:8px">';
  if (s > 1) nav += '<button onclick="ui.wNav(-1)" style="padding:5px 12px;background:#e2e8f0;border:none;border-radius:6px;cursor:pointer">← Voltar</button>';
  if (s < 3 && m['r' + s]) nav += '<button onclick="ui.wNav(1)" style="padding:5px 12px;background:#1a3a5c;color:#fff;border:none;border-radius:6px;cursor:pointer">Avançar →</button>';
  if (s === 3) nav += '<button onclick="ui.wResumo()" style="padding:5px 12px;background:#2d9e4a;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:700">Ver Resumo Final</button>';
  nav += '</div>';
  b.innerHTML += nav;
};

ui.modelOptions = function(){
  var h = '';
  PLATES.forEach(function(m){ h += '<option value="' + m.n + '">' + m.n + ' (β' + m.be + ' · ' + m.ap + ' m²)</option>'; });
  return h;
};

ui.wNav = function(d){
  ui.multi.step += d;
  ui.wizardPanel();
};

ui.wCalc1 = function(){
  try {
    var inp = ui.readInput();
    if (!inp.vp || inp.vp <= 0) { alert('Vazão produto inválida'); return; }
    var r = wCalcPasteurizacao(inp);
    ui.multi.r1 = r;
    ui.multi.baseModel = r.mod; // modelo base = escolhido na Etapa 1
    ui.wizardPanel();
    ui.showMultiSection(r, 'Etapa 1 — Pasteurização');
  } catch (e) { alert('Erro: ' + e.message); }
};

ui.wCalc2 = function(manual){
  try {
    var inp = ui.readInput();
    var forced = manual ? document.getElementById('selModel2').value : null;
    var r = wCalcRegen(inp, ui.multi.baseModel, forced);
    ui.multi.r2 = r;
    ui.multi.manual2 = manual ? forced : null;
    ui.wizardPanel();
    ui.showMultiSection(r, 'Etapa 2 — Regeneração');
  } catch (e) { alert('Erro: ' + e.message); }
};

ui.wCalc3 = function(manual){
  try {
    var inp = ui.readInput();
    var forced = manual ? document.getElementById('selModel3').value : null;
    var r = wCalcResf(inp, ui.multi.baseModel, forced);
    ui.multi.r3 = r;
    ui.multi.manual3 = manual ? forced : null;
    ui.wizardPanel();
    ui.showMultiSection(r, 'Etapa 3 — Resfriamento');
  } catch (e) { alert('Erro: ' + e.message); }
};

// Exibe resultado de uma etapa no painel principal
ui.showMultiSection = function(r, titulo){
  var ph = document.getElementById('ph');
  var res = document.getElementById('res');
  if (ph) ph.style.display = 'none';
  if (res) res.style.display = 'block';
  var badge = document.getElementById('badge');
  if (r.vi) { badge.textContent = 'VIÁVEL'; badge.className = 'res-badge ok'; }
  else      { badge.textContent = 'NÃO VIÁVEL'; badge.className = 'res-badge notok'; }
  document.getElementById('selInfo').innerHTML =
    '<div style="font-size:16px;font-weight:800;color:#1a3a5c">' + titulo + '</div>' +
    '<div style="font-size:11px;color:#4a5568">' + r.mod + ' · ' + r.n + ' placas · ' + r.A.toFixed(2) + ' m² · Passes ' + r.passesUsado + '</div>';
  document.getElementById('cards').innerHTML =
    '<div class="mc"><div class="mc-val">' + r.Q.toFixed(1) + '</div><div class="mc-lbl">Carga kW</div></div>' +
    '<div class="mc"><div class="mc-val">' + r.U.toFixed(0) + '</div><div class="mc-lbl">U W/m²K</div></div>' +
    '<div class="mc"><div class="mc-val">' + r.dp1.toFixed(1) + '</div><div class="mc-lbl">dP Prod</div></div>' +
    '<div class="mc"><div class="mc-val">' + (r.tauP || 0).toFixed(0) + '</div><div class="mc-lbl">Shear Pa</div></div>';
  var h = '<table class="tbl"><thead><tr><th>Modelo</th><th>Pl</th><th>Área</th><th>U</th><th>dP P</th><th>Shear</th><th>Passes</th><th>OK</th></tr></thead><tbody>';
  (r.todosCalculados || []).slice(0, 10).forEach(function(x){
    h += '<tr><td>' + x.mod + '</td><td>' + x.n + '</td><td>' + x.A.toFixed(2) + '</td><td>' + x.U.toFixed(0) + '</td><td>' + x.dp1.toFixed(1) + '</td><td>' + (x.tauP||0).toFixed(0) + '</td><td>' + (x.passes||'') + '</td><td>' + (x.vi ? 'OK' : 'X') + '</td></tr>';
  });
  h += '</tbody></table>';
  document.getElementById('comp').innerHTML = h;
  var v = '<div class="ck"><span class="ck-ok">✓</span>LMTD: ' + r.lm.toFixed(1) + '°C F=' + r.F.toFixed(3) + '</div>';
  v += '<div class="ck"><span class="' + (r.dp1 <= (ui.readInput().dpp) ? 'ck-ok' : 'ck-err') + '">' + (r.dp1 <= (ui.readInput().dpp) ? '✓' : '✗') + '</span>dP: ' + r.dp1.toFixed(1) + ' kPa</div>';
  v += '<div class="ck"><span class="' + ((r.tauP||0) >= 35 ? 'ck-ok' : 'ck-err') + '">' + ((r.tauP||0) >= 35 ? '✓' : '✗') + '</span>Shear: ' + (r.tauP||0).toFixed(1) + ' Pa</div>';
  document.getElementById('ver').innerHTML = v;
};

// Resumo final das 3 etapas
ui.wResumo = function(){
  var m = ui.multi;
  if (!m.r1 || !m.r2 || !m.r3) { alert('Calcule as 3 etapas primeiro'); return; }
  var r1 = m.r1, r2 = m.r2, r3 = m.r3;
  var tA = r1.A + r2.A + r3.A;
  var tPl = r1.n + r2.n + r3.n;
  var tDP = r1.dp1 + r2.dp1 + r3.dp1;
  var tQ = r1.Q + r2.Q + r3.Q;
  var vi = r1.vi && r2.vi && r3.vi;
  var badge = document.getElementById('badge');
  if (vi) { badge.textContent = 'VIÁVEL'; badge.className = 'res-badge ok'; }
  else    { badge.textContent = 'NÃO VIÁVEL'; badge.className = 'res-badge notok'; }
  document.getElementById('selInfo').innerHTML =
    '<div style="font-size:16px;font-weight:800;color:#1a3a5c">Pasteurizador — Resumo Final (3 Seções)</div>' +
    '<div style="font-size:11px;color:#4a5568">' + tPl + ' placas · ' + tA.toFixed(2) + ' m² · dP total ' + tDP.toFixed(1) + ' kPa</div>';
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
  document.getElementById('ver').innerHTML = v;
};

// ---------- WIZARD ENTRY ----------
ui.wizard = function(){
  // Injeta o painel do wizard e mostra a Etapa 1
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
  ui.multi = { step: 1, baseModel: null, r1: null, r2: null, r3: null, manual2: null, manual3: null };
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
