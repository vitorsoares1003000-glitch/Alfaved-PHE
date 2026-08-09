// ============================================================
// AlfaVed PHE v44 — CAMADA DE INTERFACE (UI)
// Conecta o DOM ao motor de cálculo (thermal.js)
// Inclui: Simples + Multi-Seção
// ============================================================

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
  if (mi) mi.innerHTML = m === 'multi' ? '<b>Multi-Seção:</b> 3/4 seções + tubo retenção.'
                                        : '<b>Simples:</b> Martin+Kumar avg, f 30/70.';
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

// ---------- CÁLCULO ----------
ui.calc = function(){
  try {
    var inp = ui.readInput();
    if (!inp.vp || inp.vp <= 0) { alert('Vazão produto inválida'); return; }
    if (!inp.dpp || inp.dpp <= 0) { alert('ΔP produto deve ser > 0'); return; }
    if (!inp.dps || inp.dps <= 0) { alert('ΔP serviço deve ser > 0'); return; }

    var hc = detectHotCold(inp);
    var tw = document.getElementById('thermalWarn');
    if (hc.error) {
      if (tw) { tw.style.display = 'block'; tw.textContent = hc.error; }
      alert(hc.error); return;
    }
    if (tw) tw.style.display = 'none';

    if (isVapor(inp.fs, inp.tis, inp.tos)) {
      var pb0 = gProd(inp.fp, (inp.tip + inp.top) / 2, inp.bp);
      var mp0 = inp.vp * pb0.rho / 3600;
      var Q0 = mp0 * pb0.cp * Math.abs(inp.top - inp.tip) / 1000;
      var vf = calcVaporFlow(Q0, inp.pressure || 2);
      inp.vs = vf.vCond;
      document.getElementById('vs').value = inp.vs.toFixed(2);
    }

    if (!inp.vs || inp.vs <= 0) { alert('Vazão serviço inválida'); return; }

    var dT1 = hc.hot.in - hc.cold.out;
    var dT2 = hc.hot.out - hc.cold.in;
    if (dT1 <= 0 || dT2 <= 0) {
      alert('Programa térmico inválido: ΔT deve ser positivo.\nΔT1=' + dT1.toFixed(1) + ' ΔT2=' + dT2.toFixed(1));
      return;
    }

    var pt = inp.ps === 'auto' ? PASSOS : [inp.ps];
    if (ui.modo === 'multi') {
      var rm = mCalcMulti(inp);
      ui.showMulti(rm, inp);
      return;
    }
    var r = mCalcSec(inp, pt, hc);
    ui.showResult(r, inp, r.todosCalculados || []);
  } catch (e) {
    alert('Erro no cálculo: ' + e.message);
  }
};

// ---------- EXIBIR RESULTADO (Simples) ----------
ui.showResult = function(m, inp, todos){
  var ph = document.getElementById('ph');
  var res = document.getElementById('res');
  if (ph) ph.style.display = 'none';
  if (res) res.style.display = 'block';

  var badge = document.getElementById('badge');
  if (m.vi) { badge.textContent = 'VIÁVEL'; badge.className = 'res-badge ok'; }
  else      { badge.textContent = 'NÃO VIÁVEL'; badge.className = 'res-badge notok'; }

  document.getElementById('selInfo').innerHTML =
    '<div style="font-size:18px;font-weight:800;color:#1a3a5c">' + m.mod + '</div>' +
    '<div style="font-size:11px;color:#4a5568">' + m.n + ' placas · ' + m.A.toFixed(2) + ' m² · Passes ' + m.passesUsado +
    ' · ' + (m.vaporMode ? 'NUSSELT COND' : 'Martin+Kumar') + '</div>';

  var q = m.vi ? m.Q.toFixed(1) : '—';
  var u = m.vi ? m.U.toFixed(0) : '—';
  var dp = m.vi ? m.dp1.toFixed(1) : '—';
  var tau = m.vi ? (m.tauP || 0).toFixed(0) : '—';
  document.getElementById('cards').innerHTML =
    '<div class="mc"><div class="mc-val">' + q + '</div><div class="mc-lbl">Carga kW</div></div>' +
    '<div class="mc"><div class="mc-val">' + u + '</div><div class="mc-lbl">U W/m²K</div></div>' +
    '<div class="mc"><div class="mc-val">' + dp + '</div><div class="mc-lbl">dP Prod</div></div>' +
    '<div class="mc"><div class="mc-val">' + tau + '</div><div class="mc-lbl">Shear Pa</div></div>';

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

  var v = '<div class="ck"><span class="ck-ok">✓</span>LMTD: ' + m.lm.toFixed(1) + '°C F=' + m.F.toFixed(3) + '</div>';
  v += '<div class="ck"><span class="ck-ok">✓</span>Re Prod: ' + m.Rep.toFixed(0) + '</div>';
  v += '<div class="ck"><span class="' + (m.tauP >= 35 ? 'ck-ok' : 'ck-err') + '">' + (m.tauP >= 35 ? '✓' : '✗') + '</span>Wall Shear: ' + (m.tauP || 0).toFixed(1) + 'Pa</div>';
  v += '<div class="ck"><span class="' + (m.v1 <= 4.9 ? 'ck-ok' : 'ck-err') + '">' + (m.v1 <= 4.9 ? '✓' : '✗') + '</span>Vel Bocal: ' + (m.v1 || 0).toFixed(2) + '</div>';
  document.getElementById('ver').innerHTML = v;

  setTimeout(function(){ ui.drawDiagram(inp, m); }, 50);
};

// ---------- DIAGRAMA (Simples) ----------
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

  ctx.strokeStyle = '#cc3300'; ctx.lineWidth = 2.5; ctx.beginPath();
  for (var i = 0; i <= 50; i++) {
    var f = i / 50, t = hi + (ho - hi) * f;
    if (i === 0) ctx.moveTo(xS(f), yS(t)); else ctx.lineTo(xS(f), yS(t));
  }
  ctx.stroke();

  ctx.strokeStyle = '#0099ff'; ctx.lineWidth = 2.5; ctx.beginPath();
  for (var i = 0; i <= 50; i++) {
    var f = i / 50, t = ci + (co - ci) * f;
    if (i === 0) ctx.moveTo(xS(f), yS(t)); else ctx.lineTo(xS(f), yS(t));
  }
  ctx.stroke();

  ctx.font = 'bold 11px Segoe UI';
  ctx.fillStyle = '#cc3300';
  ctx.fillText(hi.toFixed(1) + '°C', pL + 8, yS(hi) - 8);
  ctx.fillStyle = '#0099ff';
  ctx.fillText(ci.toFixed(1) + '°C', pL + 8, yS(ci) + 14);
  ctx.fillStyle = '#2d9e4a';
  ctx.textAlign = 'center';
  ctx.fillText('LMTD=' + (m.lm || 0).toFixed(1) + '°C', w / 2, pT + 12);
};

// ---------- EXIBIR RESULTADO (Multi-Seção) ----------
ui.showMulti = function(m, inp){
  document.getElementById('ph').style.display = 'none';
  document.getElementById('res').style.display = 'block';
  var badge = document.getElementById('badge');
  if (m.vi) { badge.textContent = 'VIÁVEL'; badge.className = 'res-badge ok'; }
  else      { badge.textContent = 'NÃO VIÁVEL'; badge.className = 'res-badge notok'; }
  var sc = m.sec4On ? '4 Seções' : '3 Seções';
  document.getElementById('selInfo').innerHTML =
    '<div style="font-size:16px;font-weight:800;color:#1a3a5c">Pasteurizador ' + sc + '</div>' +
    '<div style="font-size:11px;color:#4a5568">' + m.totalPlates + ' placas · ' + m.totalArea.toFixed(2) + ' m² · Regen: ' + m.regenEff.toFixed(0) + '%</div>';
  document.getElementById('cards').innerHTML =
    '<div class="mc"><div class="mc-val">' + m.regenEff.toFixed(0) + '%</div><div class="mc-lbl">Regen</div></div>' +
    '<div class="mc"><div class="mc-val">' + m.Qexterno.toFixed(1) + '</div><div class="mc-lbl">Carga kW</div></div>' +
    '<div class="mc"><div class="mc-val">' + m.totalDpP.toFixed(1) + '</div><div class="mc-lbl">dP Total</div></div>' +
    '<div class="mc"><div class="mc-val">' + m.holdTube.holdTime + '</div><div class="mc-lbl">Retenção</div></div>';

  var h = '<table class="tbl"><thead><tr><th>Seção</th><th>Modelo</th><th>Pl</th><th>Área</th><th>U</th><th>dP P</th><th>Shear</th><th>Passes</th></tr></thead><tbody>';
  h += '<tr class="hl"><td>1 Regen</td><td>' + m.sec1.mod + '</td><td>' + m.sec1.n + '</td><td>' + m.sec1.A.toFixed(2) + '</td><td>' + m.sec1.U.toFixed(0) + '</td><td>' + m.sec1.dp1.toFixed(1) + '</td><td>' + (m.sec1.tauP || 0).toFixed(0) + '</td><td>' + m.sec1.passesUsado + '</td></tr>';
  h += '<tr><td>2 Aquec</td><td>' + m.sec2.mod + '</td><td>' + m.sec2.n + '</td><td>' + m.sec2.A.toFixed(2) + '</td><td>' + m.sec2.U.toFixed(0) + '</td><td>' + m.sec2.dp1.toFixed(1) + '</td><td>' + (m.sec2.tauP || 0).toFixed(0) + '</td><td>' + m.sec2.passesUsado + '</td></tr>';
  if (m.sec4On) {
    h += '<tr><td>3 Pré</td><td>' + m.sec3.mod + '</td><td>' + m.sec3.n + '</td><td>' + m.sec3.A.toFixed(2) + '</td><td>' + m.sec3.U.toFixed(0) + '</td><td>' + m.sec3.dp1.toFixed(1) + '</td><td>' + (m.sec3.tauP || 0).toFixed(0) + '</td><td>' + m.sec3.passesUsado + '</td></tr>';
    h += '<tr><td>4 Resfr</td><td>' + m.sec4.mod + '</td><td>' + m.sec4.n + '</td><td>' + m.sec4.A.toFixed(2) + '</td><td>' + m.sec4.U.toFixed(0) + '</td><td>' + m.sec4.dp1.toFixed(1) + '</td><td>' + (m.sec4.tauP || 0).toFixed(0) + '</td><td>' + m.sec4.passesUsado + '</td></tr>';
  } else {
    h += '<tr><td>3 Resfr</td><td>' + m.sec3.mod + '</td><td>' + m.sec3.n + '</td><td>' + m.sec3.A.toFixed(2) + '</td><td>' + m.sec3.U.toFixed(0) + '</td><td>' + m.sec3.dp1.toFixed(1) + '</td><td>' + (m.sec3.tauP || 0).toFixed(0) + '</td><td>' + m.sec3.passesUsado + '</td></tr>';
  }
  h += '<tr style="background:#e7f0fd;font-weight:bold"><td>TOTAL</td><td>-</td><td>' + m.totalPlates + '</td><td>' + m.totalArea.toFixed(2) + '</td><td>-</td><td>' + m.totalDpP.toFixed(1) + '</td><td>-</td><td>-</td></tr></tbody></table>';
  document.getElementById('comp').innerHTML = h;

  var v = '<div class="ck"><span class="' + (m.regenEff >= 70 ? 'ck-ok' : 'ck-w') + '">' + (m.regenEff >= 70 ? '✓' : '!') + '</span>Regen: ' + m.regenEff.toFixed(1) + '%</div>';
  v += '<div class="ck"><span class="' + (m.totalDpP <= inp.dpp ? 'ck-ok' : 'ck-err') + '">' + (m.totalDpP <= inp.dpp ? '✓' : '✗') + '</span>dP: ' + m.totalDpP.toFixed(1) + '/' + inp.dpp + '</div>';
  v += '<div class="ck"><span class="ck-ok">✓</span>Retenção: ' + m.holdTube.holdTime + ' @ ' + m.holdTube.temp + '</div>';
  v += '<div class="ck"><span class="ck-ok">✓</span>Tubo: D=' + m.holdTube.diameter + 'mm L=' + m.holdTube.lengthStr + '</div>';
  document.getElementById('ver').innerHTML = v;

  setTimeout(function(){ ui.drawMultiDiagram(m); }, 50);
};

// ---------- DIAGRAMA (Multi-Seção) ----------
ui.drawMultiDiagram = function(m){
  var c = document.getElementById('tcanvas');
  if (!c) return;
  var ctx = c.getContext('2d');
  var w = c.offsetWidth, h = c.offsetHeight;
  c.width = w; c.height = h;
  ctx.clearRect(0, 0, w, h);
  var t = m.temperaturas;
  var aT = [t.ti, t.tr, t.tp, t.tf, t.tQout, t.tAqIn, t.tAqOut, t.tGIn, t.tGOut];
  if (m.sec4On && t.tPreResf) aT.push(t.tPreResf, t.tAguaAmb);
  var tMin = Math.min.apply(null, aT) - 5, tMax = Math.max.apply(null, aT) + 5;
  var pL = 55, pR = 15, pT = 30, pB = 40, pW = w - pL - pR, pH = h - pT - pB;
  var nS = m.sec4On ? 4 : 3, sW = pW / nS;
  var xS = function(s, f){ return pL + s * sW + f * sW; };
  var yS = function(T){ return pT + (tMax - T) / (tMax - tMin) * pH; };
  ctx.strokeStyle = '#d0d5dd'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
  for (var s = 1; s < nS; s++) { var x = pL + s * sW; ctx.beginPath(); ctx.moveTo(x, pT); ctx.lineTo(x, h - pB); ctx.stroke(); }
  ctx.setLineDash([]);
  ui.drawSecCurve(ctx, xS, yS, 0, t.tp, t.tQout, t.ti, t.tr, '#cc3300', '#0099ff', 50);
  ui.drawSecCurve(ctx, xS, yS, 1, t.tAqIn, t.tAqOut, t.tr, t.tp, '#cc3300', '#0099ff', 50);
  if (m.sec4On) {
    ui.drawSecCurve(ctx, xS, yS, 2, t.tp, t.tPreResf, t.tAguaAmb, t.tAguaAmb + 10, '#cc3300', '#0099ff', 50);
    ui.drawSecCurve(ctx, xS, yS, 3, t.tPreResf, t.tf, t.tGIn, t.tGOut, '#cc3300', '#0099ff', 50);
  } else {
    ui.drawSecCurve(ctx, xS, yS, 2, t.tp, t.tf, t.tGIn, t.tGOut, '#cc3300', '#0099ff', 50);
  }
  ctx.font = 'bold 10px Segoe UI'; ctx.textAlign = 'center';
  ctx.fillStyle = '#9933cc'; ctx.fillText('REGEN', pL + sW * 0.5, h - 15);
  ctx.fillStyle = '#cc3300'; ctx.fillText('AQUEC', pL + sW * 1.5, h - 15);
  if (m.sec4On) { ctx.fillStyle = '#0099ff'; ctx.fillText('PRÉ', pL + sW * 2.5, h - 15); ctx.fillText('RESFR', pL + sW * 3.5, h - 15); }
  else { ctx.fillStyle = '#0099ff'; ctx.fillText('RESFR', pL + sW * 2.5, h - 15); }
  ctx.fillStyle = '#1a3a5c'; ctx.font = 'bold 11px Segoe UI'; ctx.textAlign = 'left';
  ctx.fillText('Perfil Composto (' + nS + ' Sec)', pL, pT - 6);
  ctx.fillStyle = '#9933cc'; ctx.textAlign = 'center'; ctx.font = 'bold 11px Segoe UI';
  ctx.fillText('Regen: ' + m.regenEff.toFixed(0) + '%', pL + sW * 0.5, pT + 12);
};

ui.drawSecCurve = function(ctx, xS, yS, s, hI, hO, cI, cO, hC, cC, st){
  ctx.strokeStyle = hC; ctx.lineWidth = 2.5; ctx.beginPath();
  for (var i = 0; i <= st; i++) { var f = i / st, t = hI + (hO - hI) * f; if (i === 0) ctx.moveTo(xS(s, f), yS(t)); else ctx.lineTo(xS(s, f), yS(t)); }
  ctx.stroke();
  ctx.strokeStyle = cC; ctx.lineWidth = 2.5; ctx.beginPath();
  for (var i = 0; i <= st; i++) { var f = i / st, t = cO + (cI - cO) * f; if (i === 0) ctx.moveTo(xS(s, f), yS(t)); else ctx.lineTo(xS(s, f), yS(t)); }
  ctx.stroke();
  ctx.fillStyle = hC; ctx.beginPath(); ctx.arc(xS(s, 0), yS(hI), 3, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(xS(s, 1), yS(hO), 3, 0, 7); ctx.fill();
  ctx.fillStyle = cC; ctx.beginPath(); ctx.arc(xS(s, 0), yS(cO), 3, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(xS(s, 1), yS(cI), 3, 0, 7); ctx.fill();
  ctx.font = '8px Segoe UI'; ctx.fillStyle = hC; ctx.textAlign = 'left';
  ctx.fillText(hI.toFixed(0) + '°C', xS(s, 0) + 4, yS(hI) - 5);
  ctx.textAlign = 'right'; ctx.fillText(hO.toFixed(0) + '°C', xS(s, 1) - 4, yS(hO) - 5);
  ctx.fillStyle = cC; ctx.textAlign = 'left'; ctx.fillText(cI.toFixed(0) + '°C', xS(s, 0) + 4, yS(cI) + 12);
  ctx.textAlign = 'right'; ctx.fillText(cO.toFixed(0) + '°C', xS(s, 1) - 4, yS(cO) - 5);
};

// ---------- LIMPAR ----------
ui.limpar = function(){
  var res = document.getElementById('res');
  var ph = document.getElementById('ph');
  if (res) res.style.display = 'none';
  if (ph) ph.style.display = 'block';
  var tw = document.getElementById('thermalWarn');
  if (tw) tw.style.display = 'none';
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
