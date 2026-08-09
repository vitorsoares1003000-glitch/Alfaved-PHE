// ============================================================
// AlfaVed PHE v44 — CAMADA DE INTERFACE (UI)
// Conecta o DOM ao motor de cálculo (thermal.js)
// ============================================================

// ---------- NAMESPACE ----------
var ui = {};

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

// ---------- MODO (Simples/Multi) ----------
ui.setModo = function(m){
  ui.modo = m;
  document.getElementById('btnSimples').classList.toggle('act', m === 'simples');
  document.getElementById('btnMulti').classList.toggle('act', m === 'multi');
  document.getElementById('secMulti').style.display = m === 'multi' ? 'block' : 'none';
  document.getElementById('modoInfo').innerHTML =
    m === 'multi' ? '<b>Multi-Seção:</b> 3/4 seções + tubo retenção.'
                  : '<b>Simples:</b> Martin+Kumar avg, f 30/70.';
};
ui.modo = 'simples';

// ---------- SERVIÇO (vapor/água) ----------
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

// ---------- CÁLCULO PRINCIPAL ----------
ui.calc = function(){
  var inp = ui.readInput();

  // Validações básicas
  if (!inp.vp || inp.vp <= 0) { alert('Vazão produto inválida'); return; }
  if (!inp.dpp || inp.dpp <= 0) { alert('ΔP produto deve ser > 0'); return; }
  if (!inp.dps || inp.dps <= 0) { alert('ΔP serviço deve ser > 0'); return; }

  // Detecção quente/frio
  var hc = detectHotCold(inp);
  var tw = document.getElementById('thermalWarn');
  if (hc.error) {
    if (tw) { tw.style.display = 'block'; tw.textContent = hc.error; }
    alert(hc.error); return;
  }
  if (tw) tw.style.display = 'none';

  // Vapor: calcula vazão automaticamente
  if (isVapor(inp.fs, inp.tis, inp.tos)) {
    var pb0 = gProd(inp.fp, (inp.tip + inp.top) / 2, inp.bp);
    var mp0 = inp.vp * pb0.rho / 3600;
    var Q0 = mp0 * pb0.cp * Math.abs(inp.top - inp.tip) / 1000;
    var vf = calcVaporFlow(Q0, inp.pressure || 2);
    inp.vs = vf.vCond;
    document.getElementById('vs').value = inp.vs.toFixed(2);
  }

  if (!inp.vs || inp.vs <= 0) { alert('Vazão serviço inválida'); return; }

  // Validação do programa térmico (ΔT positivo nas extremidades)
  var dT1 = hc.hot.in - hc.cold.out;
  var dT2 = hc.hot.out - hc.cold.in;
  if (dT1 <= 0 || dT2 <= 0) {
    alert('Programa térmico inválido: ΔT deve ser positivo.\nΔT1=' + dT1.toFixed(1) + ' ΔT2=' + dT2.toFixed(1));
    return;
  }

  // Executa cálculo
  var pt = inp.ps === 'auto' ? PASSOS : [inp.ps];
  var r = mCalcSec(inp, pt, hc);
  ui.showResult(r, inp, r.todosCalculados || []);
};

// ---------- EXIBIR RESULTADO ----------
ui.showResult = function(m, inp, todos){
  document.getElementById('ph').style.display = 'none';
  document.getElementById('res').style.display = 'block';

  // Badge
  var badge = document.getElementById('badge');
  if (m.vi) { badge.textContent = 'VIÁVEL'; badge.className = 'res-badge ok'; }
  else      { badge.textContent = 'NÃO VIÁVEL'; badge.className = 'res-badge notok'; }

  // Info do modelo selecionado
  document.getElementById('selInfo').innerHTML =
    '<div style="font-size:18px;font-weight:800;color:#1a3a5c">' + m.mod + '</div>' +
    '<div style="font-size:11px;color:#4a5568">' + m.n + ' placas · ' + m.A.toFixed(2) + ' m² · Passes ' + m.passesUsado +
    ' · ' + (m.vaporMode ? 'NUSSELT COND' : 'Martin+Kumar') + '</div>';

  // Cards
  var q = m.vi ? m.Q.toFixed(1) : '—';
  var u = m.vi ? m.U.toFixed(0) : '—';
  var dp = m.vi ? m.dp1.toFixed(1) : '—';
  var tau = m.vi ? (m.tauP || 0).toFixed(0) : '—';
  document.getElementById('cards').innerHTML =
    '<div class="mc"><div class="mc-val">' + q + '</div><div class="mc-lbl">Carga kW</div></div>' +
    '<div class="mc"><div class="mc-val">' + u + '</div><div class="mc-lbl">U W/m²K</div></div>' +
    '<div class="mc"><div class="mc-val">' + dp + '</div><div class="mc-lbl">dP Prod</div></div>' +
    '<div class="mc"><div class="mc-val">' + tau + '</div><div class="mc-lbl">Shear Pa</div></div>';

  // Comparativo
  var h = '<table class="tbl"><thead><tr><th>Modelo</th><th>Pl</th><th>Área</th><th>U</th><th>dP P</th><th>Shear</th><th>F</th><th>Passes</th><th>OK</th></tr></thead><tbody>';
  (todos || []).slice(0, 12).forEach(function(r, i){
    h += '<tr class="' + (i === 0 && r.vi ? 'hl' : '') + '">' +
         '<td>' + r.mod + '</td><td>' + r.n + '</td><td>' + r.A.toFixed(2) + '</td>' +
         '<td>' + r.U.toFixed(0) + '</td><td>' + r.dp1.toFixed(1) + '</td>' +
         '<td>' + (r.tauP || 0).toFixed(0) + '</td><td>' + r.F.toFixed(2) + '</td>' +
         '<td>' + (r.passes || '') + '</td><td>' + (r.vi ? 'OK' : 'X') + '</td></tr>';
  });
  h += '</tbody></table>';
  document.getElementById('comp').innerHTML = h;

  // Verificações
  var v = '<div class="ck"><span class="ck-ok">✓</span>LMTD: ' + m.lm.toFixed(1) + '°C F=' + m.F.toFixed(3) + '</div>';
  v += '<div class="ck"><span class="ck-ok">✓</span>Re Prod: ' + m.Rep.toFixed(0) + '</div>';
  v += '<div class="ck"><span class="' + (m.tauP >= 35 ? 'ck-ok' : 'ck-err') + '">' + (m.tauP >= 35 ? '✓' : '✗') + '</span>Wall Shear: ' + (m.tauP || 0).toFixed(1) + 'Pa</div>';
  v += '<div class="ck"><span class="' + (m.v1 <= 4.9 ? 'ck-ok' : 'ck-err') + '">' + (m.v1 <= 4.9 ? '✓' : '✗') + '</span>Vel Bocal: ' + (m.v1 || 0).toFixed(2) + '</div>';
  document.getElementById('ver').innerHTML = v;

  // Diagrama
  setTimeout(function(){ ui.drawDiagram(inp, m); }, 50);
};

// ---------- DIAGRAMA DE TEMPERATURA ----------
ui.drawDiagram = function(inp, m){
  var c = document.getElementById('tcanvas');
  if (!c) return;
  var ctx = c.getContext('2d');
  var w = c.offsetWidth, h = c.offsetHeight;
  c.width = w; c.height = h;
  ctx.clearRect(0, 0, w, h);

  var hi = inp.tis, ho = inp.tos, ci = inp.tip, co = inp.top;
  if (inp.tip > inp.tis) { hi = inp.tip; ho = inp.top; ci = inp.tis; co = inp.tos; }

  var aT = [hi, ho, ci, co];
  var tMin = Math.min.apply(null, aT) - 5;
  var tMax = Math.max.apply(null, aT) + 5;
  var pL = 50, pR = 20, pT = 30, pB = 30;
  var pW = w - pL - pR, pH = h - pT - pB;
  var xS = function(f){ return pL + f * pW; };
  var yS = function(T){ return pT + (tMax - T) / (tMax - tMin) * pH; };

  // Linha quente (vermelho)
  ctx.strokeStyle = '#cc3300'; ctx.lineWidth = 2.5; ctx.beginPath();
  for (var i = 0; i <= 50; i++) {
    var f = i / 50, t = hi + (ho - hi) * f;
    if (i === 0) ctx.moveTo(xS(f), yS(t)); else ctx.lineTo(xS(f), yS(t));
  }
  ctx.stroke();

  // Linha fria (azul)
  ctx.strokeStyle = '#0099ff'; ctx.lineWidth = 2.5; ctx.beginPath();
  for (var i = 0; i <= 50; i++) {
    var f = i / 50, t = ci + (co - ci) * f;
    if (i === 0) ctx.moveTo(xS(f), yS(t)); else ctx.lineTo(xS(f), yS(t));
  }
  ctx.stroke();

  // Rótulos
  ctx.font = 'bold 11px Segoe UI';
  ctx.fillStyle = '#cc3300';
  ctx.fillText(hi.toFixed(1) + '°C', pL + 8, yS(hi) - 8);
  ctx.fillStyle = '#0099ff';
  ctx.fillText(ci.toFixed(1) + '°C', pL + 8, yS(ci) + 14);
  ctx.fillStyle = '#2d9e4a';
  ctx.textAlign = 'center';
  ctx.fillText('LMTD=' + (m.lm || 0).toFixed(1) + '°C', w / 2, pT + 12);
};

// ---------- LIMPAR ----------
ui.limpar = function(){
  document.getElementById('res').style.display = 'none';
  document.getElementById('ph').style.display = 'block';
  var tw = document.getElementById('thermalWarn');
  if (tw) tw.style.display = 'none';
};

// ---------- INICIALIZAÇÃO ----------
window.addEventListener('DOMContentLoaded', function(){
  // Popula catálogo
  var h = '';
  PLATES.forEach(function(m){
    h += '<tr><td><b>' + m.n + '</b></td><td>' + m.be + '</td><td>' + m.ap + '</td><td>' + (m.b * 2000).toFixed(1) + '</td></tr>';
  });
  document.getElementById('cat').innerHTML = h;

  // Eventos dos botões
  document.getElementById('btnCalc').addEventListener('click', ui.calc);
  document.getElementById('btnLimpar').addEventListener('click', ui.limpar);

  // Estado inicial
  ui.setModo('simples');
  ui.tgServ();
});
