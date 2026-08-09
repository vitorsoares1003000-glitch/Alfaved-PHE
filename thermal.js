// ============================================================
// AlfaVed PHE v44.4 — MOTOR DE CÁLCULO (funções puras)
// FIX v44.4: Multi-Seção usa UM ÚNICO modelo de placa em todas as seções
// (pasteurizador = um equipamento, mesma placa em todas as seções)
// ============================================================

// ---------- DETECÇÃO QUENTE/FRIO ----------
function detectHotCold(inp){
  var tip = inp.tip, top = inp.top, tis = inp.tis, tos = inp.tos, fs = inp.fs;
  var vm = isVapor(fs, tis, tos);
  var pC = tip > top, sC = tis > tos;
  if (!vm && ((pC && sC) || (!pC && !sC))) {
    return { error: 'Impossível termodinâmico: ambos os lados ' + (pC ? 'resfriando' : 'aquecendo') };
  }
  var hot, cold;
  if (pC && !vm) {
    hot  = { in: tip, out: top, fluid: inp.fp, b: inp.bp, side: 'prod' };
    cold = { in: tis, out: tos, fluid: inp.fs, b: 0, side: 'serv' };
  } else {
    hot  = { in: tis, out: tos, fluid: inp.fs, b: 0, side: 'serv' };
    cold = { in: tip, out: top, fluid: inp.fp, b: inp.bp, side: 'prod' };
  }
  return { hot: hot, cold: cold, pCool: pC || vm, vm: vm, error: null };
}

// ---------- COEFICIENTE GLOBAL U (iterativo) ----------
function cU(p){
  var hc = detectHotCold({ tip: p.t2i, top: p.t2o, tis: p.t1i, tos: p.t1o, fs: p.f1, fp: p.f2, bp: p.b2 });
  var Th, Tc, Tw;
  if (hc.error) {
    Th = Math.max(p.t1i, p.t2i);
    Tc = Math.min(p.t1i, p.t2i);
    Tw = (Th + Tc) / 2;
  } else {
    Th = (hc.hot.in + hc.hot.out) / 2;
    Tc = (hc.cold.in + hc.cold.out) / 2;
    Tw = (Th + Tc) / 2;
  }
  var Ua = 0, r = {};
  var vm = hc.vm || isVapor(p.f1, p.t1i, p.t1o);
  var rf = p.rf || 0.0001;
  for (var i = 0; i < 50; i++) {
    var bh, bc, wh, wc;
    if (hc.hot) {
      bh = hc.hot.side === 'prod' ? gProd(hc.hot.fluid, Th, hc.hot.b) : gServ(hc.hot.fluid, Th);
      wh = hc.hot.side === 'prod' ? gProd(hc.hot.fluid, Tw, hc.hot.b) : gServ(hc.hot.fluid, Tw);
    } else { bh = gServ(p.f1, Th); wh = gServ(p.f1, Tw); }
    if (hc.cold) {
      bc = hc.cold.side === 'prod' ? gProd(hc.cold.fluid, Tc, hc.cold.b) : gServ(hc.cold.fluid, Tc);
      wc = hc.cold.side === 'prod' ? gProd(hc.cold.fluid, Tw, hc.cold.b) : gServ(hc.cold.fluid, Tw);
    } else { bc = gProd(p.f2, Tc, p.b2); wc = gProd(p.f2, Tw, p.b2); }
    var Nh, Nc, hh, hc2;
    if (vm) {
      hh = condHNusselt(p.pressure || 2, hc.hot.in, Tw, p.Lplate || 0.7);
      Nh = hh * p.Dh / Math.max(bh.k, 0.001);
    } else {
      Nh = nAvg(p.Re1, p.Pr1, p.be, bh.mu, wh.mu);
      hh = Nh * bh.k / Math.max(p.Dh, 1e-6);
    }
    Nc = nAvg(p.Re2, p.Pr2, p.be, bc.mu, wc.mu);
    hc2 = Nc * bc.k / Math.max(p.Dh, 1e-6);
    var kc = 1 / (1/hh + 1/hc2 + p.d / p.km);
    var kd = safeDiv(1, safeDiv(1, kc, 0) + rf, 0);
    var TwN = Tc + (hh / Math.max(hh + hc2, 0.001)) * (Th - Tc);
    Tw = Tw + 0.6 * (TwN - Tw);
    r = { U: kd, kc: kc, h1: hh, h2: hc2, Tw: Tw, vapor: vm };
    if (Math.abs(kd - Ua) < 0.5) break;
    Ua = kd;
  }
  return r;
}

// ---------- QUEDA DE PRESSÃO ----------
function cDp(m, r, D, L, phi, N, Ap, v, be, Re){
  var Cf = fAvg(Re, be);
  var Lr = L * phi;
  var dpc = 4 * Cf * (Lr * N / D) * (r * v * v / 2);
  var vp = safeDiv(m, r * Math.max(Ap, 1e-6), 0);
  var dpp = 1.4 * r * vp * vp / 2 * N;
  var t = safeDiv(dpc + dpp, 1000, 0);
  var fp = safeDiv(dpp / 1000, t, 0) * 100;
  var tau = wallShear(dpc, D, Lr * N);
  return { t: t, vp: vp, fracPorta: fp, tau: tau };
}

// ---------- CÁLCULO DE UMA SEÇÃO (com modelo forçado opcional) ----------
// forceModel: se definido, usa SOMENTE esse modelo de placa
function mCalcSingle(inp, hc, forceModel){
  var pb = gProd(inp.fp, (inp.tip + inp.top) / 2, inp.bp);
  var mp = inp.vp * pb.rho / 3600;
  var Q = mp * pb.cp * Math.abs(inp.top - inp.tip) / 1000;
  var sb = gServ(inp.fs, (inp.tis + inp.tos) / 2);
  var ms = inp.vs * sb.rho / 3600;
  var lm = cL(hc.hot.in, hc.hot.out, hc.cold.in, hc.cold.out);
  var Pv = safeDiv(hc.cold.out - hc.cold.in, Math.max(hc.hot.in - hc.cold.in, 0.001), 0);
  var Rv = safeDiv(hc.hot.in - hc.hot.out, Math.max(hc.cold.out - hc.cold.in, 0.001), 0);
  var F = fF(Pv, Rv, inp.ps);
  var lc = lm * F;
  var Np = parseInt(inp.ps.split('-')[0]);
  var Np2 = parseInt(inp.ps.split('-')[1]);
  var matK = inp.mat === 'auto' ? 'AISI316' : inp.mat;
  var vm = hc.vm, pr = inp.pressure || 2, rf = inp.rf || 0.0001;
  var dtP = Math.abs(inp.top - inp.tip);
  var aBe = thetaFilter(dtP, lm);
  var mods;
  if (forceModel) {
    mods = PLATES.filter(function(m){ return m.n === forceModel; });
  } else {
    mods = PLATES.filter(function(m){
      if (inp.tpl === 't') return true;
      if (inp.tpl === 's') return m.t === 's';
      return m.t === 'g';
    });
    mods = mods.filter(function(m){ return aBe.indexOf(m.be) >= 0; });
  }
  var rs = [];
  mods.forEach(function(m){
    var Dh = 2 * m.b;
    var Ac = m.b * m.w;
    var Ap = Math.PI * m.dp * m.dp / 4;
    var ne = Math.ceil(safeDiv(Q * 1000, 2000 * Math.max(lc, 0.1), 0) / m.ap * (1 + inp.mg / 100));
    for (var n = Math.max(4, ne - 8); n < ne + 50; n += 2) {
      var nc = Math.max(Math.floor((n - 1) / (2 * Np)), 1);
      var nc2 = Math.max(Math.floor((n - 1) / (2 * Np2)), 1);
      var mcp = mp / nc, mcs = ms / nc2;
      var vcP = safeDiv(mcp, pb.rho * Ac, 0);
      var vcS = safeDiv(mcs, sb.rho * Ac, 0);
      if (vcP < 0.1 || (!vm && vcS < 0.1)) continue;
      var Rep = safeDiv(mcp * Dh, Math.max(Ac, 1e-8) * Math.max(pb.mu, 1e-8), 0);
      var Res = safeDiv(mcs * Dh, Math.max(Ac, 1e-8) * Math.max(sb.mu, 1e-8), 0);
      var Prp = safeDiv(pb.cp * pb.mu, Math.max(pb.k, 0.001), 0);
      var Prs = safeDiv(sb.cp * sb.mu, Math.max(sb.k, 0.001), 0);
      var rU = cU({
        t1i: inp.tis, t1o: inp.tos, t2i: inp.tip, t2o: inp.top,
        f1: inp.fs, f2: inp.fp, pressure: pr, b2: inp.bp,
        Re1: Res, Pr1: Prs, Re2: Rep, Pr2: Prp,
        be: m.be, Dh: Dh, d: m.d, km: MATERIALS[matK].k, Lplate: m.l, rf: rf
      });
      var Ai = n * m.ap;
      var An = safeDiv(Q * 1000, Math.max(rU.U * lc, 0.1), 0);
      if (Ai >= An) {
        var dp1 = cDp(mp, pb.rho, Dh, m.l, m.ph, Np, Ap, vcP, m.be, Rep);
        var dp2;
        if (vm) { dp2 = { t: dp1.t * 0.3, vp: 0, fracPorta: 0, tau: 0 }; }
        else    { dp2 = cDp(ms, sb.rho, Dh, m.l, m.ph, Np2, Ap, vcS, m.be, Res); }
        var vi = true;
        if (dp1.t > inp.dpp) vi = false;
        if (!vm && dp2.t > inp.dps) vi = false;
        if (dp1.vp > 4.9) vi = false;
        if (!vm && dp2.vp > 4.9) vi = false;
        if (dp1.fracPorta > 30) vi = false;
        if (!vm && dp2.fracPorta > 30) vi = false;
        if (dp1.tau < 35) vi = false;
        rs.push({
          mod: m.n, n: n, A: Ai, U: rU.U, kc: rU.kc,
          dp1: dp1.t, dp2: dp2.t, Q: Q, v1: dp1.vp, v2: dp2.vp,
          vi: vi, vcP: vcP, vcS: vcS, tauP: dp1.tau, tauS: dp2.tau,
          fracPortaP: dp1.fracPorta, fracPortaS: dp2.fracPorta,
          Rep: Rep, Res: Res, lm: lc, F: F, pb: pb, sb: sb, rU: rU, m: m,
          lmtd: lm, passes: inp.ps, vaporMode: vm
        });
        if (vi) break;
      }
    }
  });
  return rs;
}

// ---------- SELEÇÃO DE PASSES (com modelo forçado opcional) ----------
function mCalcSec(inp, passesArr, hc, forceModel){
  var hc = hc || detectHotCold(inp);
  if (hc.error) {
    return { mod: 'N/A', n: 0, A: 0, U: 0, dp1: 999, dp2: 999, Q: 0, vi: false,
             passesUsado: '1-1', todosCalculados: [], todosViaveis: [], Rep: 0, Res: 0,
             lm: 0, F: 0, pb: gProd('agua', 20, 0), sb: gServ('agua', 20), rU: { kc: 0, Tw: 0 },
             m: null, lmtd: 0, tauP: 0, v1: 0, vaporMode: false };
  }
  var best = null, pt = passesArr || PASSOS;
  for (var pi = 0; pi < pt.length; pi++) {
    var ps = pt[pi];
    var inpC = Object.assign({}, inp, { ps: ps });
    var rs = mCalcSingle(inpC, hc, forceModel);
    var vs = rs.filter(function(r){ return r.vi; });
    if (vs.length > 0) {
      vs.sort(function(a, b){ return a.A - b.A; });
      var b = vs[0];
      if (!best || b.A < best.A) {
        best = b;
        best.passesUsado = ps;
        best.todosViaveis = vs;
        best.todosCalculados = rs;
      }
      break;
    }
  }
  if (best) return best;
  var rs2 = mCalcSingle(Object.assign({}, inp, { ps: pt[0] }), hc, forceModel);
  rs2.sort(function(a, b){ return (a.dp1 - b.dp1); });
  var fb = rs2[0];
  if (fb) {
    fb.vi = false;
    fb.passesUsado = pt[0];
    fb.todosCalculados = rs2;
    fb.todosViaveis = [];
    return fb;
  }
  return { mod: 'N/A', n: 0, A: 0, U: 0, dp1: 999, dp2: 999, Q: 0, vi: false,
           passesUsado: pt[0], todosViaveis: [], todosCalculados: rs2,
           Rep: 0, Res: 0, lm: 0, F: 0, pb: gProd('agua', 20, 0), sb: gServ('agua', 20),
           rU: { kc: 0, Tw: 0 }, m: null, lmtd: 0, tauP: 0, v1: 0, vaporMode: false };
}

// ============================================================
// MULTI-SEÇÃO (PASTEURIZADOR) — UM ÚNICO MODELO DE PLACA
// ============================================================

// ---------- U para REGENERAÇÃO (mesmo fluido ambos lados) ----------
function cURegen(p){
  var Th = (p.t1i + p.t1o) / 2, Tc = (p.t2i + p.t2o) / 2, Tw = (Th + Tc) / 2, Ua = 0, r = {};
  var matK = p.km || MATERIALS.AISI316.k;
  for (var i = 0; i < 50; i++) {
    var wh = gProd(p.fp, Tw, p.bp), wc = gProd(p.fp, Tw, p.bp);
    var bh = gProd(p.fp, Th, p.bp), bc = gProd(p.fp, Tc, p.bp);
    var Nh = nAvg(p.Re1, p.Pr1, p.be, bh.mu, wh.mu);
    var Nc = nAvg(p.Re2, p.Pr2, p.be, bc.mu, wc.mu);
    var hh = Nh * bh.k / Math.max(p.Dh, 1e-6);
    var hc = Nc * bc.k / Math.max(p.Dh, 1e-6);
    var kc = 1 / (1/hh + 1/hc + p.d / matK);
    var kd = kc;
    var TwN = Tc + (hh / Math.max(hh + hc, 0.001)) * (Th - Tc);
    Tw = Tw + 0.6 * (TwN - Tw);
    r = { U: kd, kc: kc, h1: hh, h2: hc, Tw: Tw, vapor: false };
    if (Math.abs(kd - Ua) < 0.5) break;
    Ua = kd;
  }
  return r;
}

// ---------- SEÇÃO DE REGENERAÇÃO (com modelo forçado) ----------
function mCalcSecRegen(inp, forceModel){
  var pt = PASSOS, best = null;
  var matK = inp.mat === 'auto' ? MATERIALS.AISI316.k : (MATERIALS[inp.mat] ? MATERIALS[inp.mat].k : MATERIALS.AISI316.k);
  for (var pi = 0; pi < pt.length; pi++) {
    var ps = pt[pi], inpC = Object.assign({}, inp, { ps: ps });
    var pb = gProd(inpC.fp, (inpC.tip + inpC.top) / 2, inpC.bp);
    var mp = inpC.vp * pb.rho / 3600;
    var Q = mp * pb.cp * Math.abs(inpC.top - inpC.tip) / 1000;
    var sb = pb, ms = mp;
    var lm = cL(inpC.tis, inpC.tos, inpC.tip, inpC.top);
    var Pv = safeDiv(inpC.top - inpC.tip, Math.max(inpC.tis - inpC.tip, 0.001), 0);
    var Rv = safeDiv(inpC.tis - inpC.tos, Math.max(inpC.top - inpC.tip, 0.001), 0);
    var F = fF(Pv, Rv, ps), lc = lm * F;
    var Np = parseInt(ps.split('-')[0]), Np2 = parseInt(ps.split('-')[1]);
    var aBe = thetaFilter(Math.abs(inpC.top - inpC.tip), lm);
    var mods;
    if (forceModel) {
      mods = PLATES.filter(function(m){ return m.n === forceModel; });
    } else {
      mods = PLATES.filter(function(m){
        if (inpC.tpl === 't') return true;
        if (inpC.tpl === 's') return m.t === 's';
        return m.t === 'g';
      });
      mods = mods.filter(function(m){ return aBe.indexOf(m.be) >= 0; });
    }
    var rs = [];
    mods.forEach(function(m){
      var Dh = 2 * m.b, Ac = m.b * m.w, Ap = Math.PI * m.dp * m.dp / 4;
      var ne = Math.ceil(safeDiv(Q * 1000, 2000 * Math.max(lc, 0.1), 0) / m.ap * (1 + inpC.mg / 100));
      for (var n = Math.max(4, ne - 8); n < ne + 50; n += 2) {
        var nc = Math.max(Math.floor((n - 1) / (2 * Np)), 1);
        var nc2 = Math.max(Math.floor((n - 1) / (2 * Np2)), 1);
        var mcp = mp / nc, mcs = ms / nc2;
        var vcP = safeDiv(mcp, pb.rho * Ac, 0);
        if (vcP < 0.1) continue;
        var Rep = safeDiv(mcp * Dh, Math.max(Ac, 1e-8) * Math.max(pb.mu, 1e-8), 0);
        var Res = Rep;
        var Prp = safeDiv(pb.cp * pb.mu, Math.max(pb.k, 0.001), 0);
        var Prs = Prp;
        var rU = cURegen({ t1i: inpC.tis, t1o: inpC.tos, t2i: inpC.tip, t2o: inpC.top, fp: inpC.fp, bp: inpC.bp, Re1: Res, Pr1: Prs, Re2: Rep, Pr2: Prp, be: m.be, Dh: Dh, d: m.d, km: matK });
        var Ai = n * m.ap;
        var An = safeDiv(Q * 1000, Math.max(rU.U * lc, 0.1), 0);
        if (Ai >= An) {
          var dp1 = cDp(mp, pb.rho, Dh, m.l, m.ph, Np, Ap, vcP, m.be, Rep);
          var dp2 = cDp(ms, sb.rho, Dh, m.l, m.ph, Np2, Ap, vcP, m.be, Res);
          var vi = dp1.t <= inpC.dpp && dp2.t <= inpC.dps && dp1.fracPorta <= 30 && dp2.fracPorta <= 30 && dp1.tau >= 35;
          rs.push({ mod: m.n, n: n, A: Ai, U: rU.U, kc: rU.kc, dp1: dp1.t, dp2: dp2.t, Q: Q, v1: dp1.vp, v2: dp2.vp, vi: vi, vcP: vcP, tauP: dp1.tau, fracPortaP: dp1.fracPorta, Rep: Rep, Res: Res, lm: lc, F: F, pb: pb, sb: sb, rU: rU, m: m, lmtd: lm, passes: ps, vaporMode: false });
          if (vi) break;
        }
      }
    });
    var vs = rs.filter(function(r){ return r.vi; });
    if (vs.length > 0) {
      vs.sort(function(a, b){ return a.A - b.A; });
      var b = vs[0];
      if (!best || b.A < best.A) { best = b; best.passesUsado = ps; best.todosViaveis = vs; best.todosCalculados = rs; }
      break;
    }
  }
  if (best) return best;
  // fallback: menor dP
  var rs2 = mCalcSingle(Object.assign({}, inp, { ps: pt[0] }), detectHotCold(inp), forceModel);
  rs2.sort(function(a, b){ return (a.dp1 - b.dp1); });
  var fb = rs2[0];
  if (fb) { fb.vi = false; fb.passesUsado = pt[0]; fb.todosCalculados = rs2; fb.todosViaveis = []; return fb; }
  return { mod: 'N/A', n: 0, A: 0, U: 0, dp1: 999, dp2: 999, Q: 0, vi: false, passesUsado: '1-1', Rep: 0, Res: 0, lm: 0, F: 0, pb: gProd('agua', 20, 0), sb: gProd('agua', 20, 0), rU: { kc: 0, Tw: 0 }, m: null, lmtd: 0, v1: 0, tauP: 0, vaporMode: false };
}

// ---------- TUBO DE RETENÇÃO ----------
function calcHoldingTube(vp, tp, fp, bp){
  var Q = vp / 3600;
  var HT = parseFloat(document.getElementById('t_reten') ? document.getElementById('t_reten').value : 15) || 15;
  var D = 0.0485;
  var pr = gProd(fp || 'agua', tp, bp || 0);
  var v = safeDiv(Q, Math.PI * D * D / 4, 0);
  var Re = safeDiv(pr.rho * v * D, pr.mu, 0);
  var eta = Re < 2300 ? 0.5 : Re < 4000 ? 0.75 : 0.85;
  var L = safeDiv(4 * Q * HT, Math.PI * D * D * eta, 0);
  return { diameter: (D * 1000).toFixed(1), length: L.toFixed(2), lengthStr: L.toFixed(2) + ' m', volume: (Math.PI * D * D / 4 * L * 1000).toFixed(1) + ' L', holdTime: HT + ' s', temp: tp + ' C', Re: Re.toFixed(0), eta: (eta * 100).toFixed(0) + '%' };
}

// ---------- CÁLCULO MULTI-SEÇÃO (UM ÚNICO MODELO DE PLACA) ----------
function mCalcMulti(inp){
  var ti = inp.tip;
  var tp = parseFloat(document.getElementById('tpast').value) || 72;
  var tr = parseFloat(document.getElementById('tregen').value) || 65;
  var tf = parseFloat(document.getElementById('tfinal').value) || 4;
  var vp = inp.vp, fp = inp.fp, bp = inp.bp, dppT = inp.dpp;
  var fsAq = document.getElementById('fs_aq').value;
  var fsRes = document.getElementById('fs_res').value;
  var tAQ = parseFloat(document.getElementById('t_agua_q').value) || 85;
  var tAG = parseFloat(document.getElementById('t_agua_g').value) || 2;
  var s4 = document.getElementById('sec4_on') ? document.getElementById('sec4_on').value === '1' : false;
  var tAA = parseFloat(document.getElementById('t_agua_amb') ? document.getElementById('t_agua_amb').value : 25) || 25;

  var fRegen = 0.40, fAq = 0.30, fRes = 0.30;

  // Perfis de temperatura das seções
  var tQSR = tp - (tr - ti);
  var tSA = tAQ - 20;
  var tSR = tAG + 8;

  // Definição das 3 seções (regen usa produto vs produto)
  var s1i = { fp: fp, bp: bp, vp: vp, tip: ti, top: tr, dpp: dppT * fRegen, fs: fp, vs: vp, tis: tp, tos: tQSR, dps: dppT * fRegen, tpl: inp.tpl, mat: inp.mat, ps: inp.ps, mg: inp.mg };
  var s2i = { fp: fp, bp: bp, vp: vp, tip: tr, top: tp, dpp: dppT * fAq, fs: fsAq === 'vapor' ? 'vapor' : 'agua', vs: vp * 1.5, tis: tAQ, tos: tSA, dps: dppT * fAq, tpl: inp.tpl, mat: inp.mat, ps: inp.ps, mg: inp.mg, pressure: 2 };
  var s3i = { fp: fp, bp: bp, vp: vp, tip: tp, top: tf, dpp: dppT * fRes, fs: fsRes, vs: vp * 1.5, tis: tAG, tos: tSR, dps: dppT * fRes, tpl: inp.tpl, mat: inp.mat, ps: inp.ps, mg: inp.mg };

  var s2hc = detectHotCold(s2i);
  var s3hc = detectHotCold(s3i);

  // Filtra modelos candidatos (mesmo tipo/ângulo para TODAS as seções)
  var aBe1 = thetaFilter(Math.abs(tr - ti), cL(tp, tQSR, ti, tr));
  var aBe2 = thetaFilter(Math.abs(tp - tr), cL(tAQ, tSA, tr, tp));
  var aBe3 = thetaFilter(Math.abs(tf - tp), cL(tAG, tSR, tp, tf));
  var candidatos = PLATES.filter(function(m){
    if (inp.tpl === 't') return true;
    if (inp.tpl === 's') return m.t === 's';
    return m.t === 'g';
  }).filter(function(m){
    return aBe1.indexOf(m.be) >= 0 && aBe2.indexOf(m.be) >= 0 && aBe3.indexOf(m.be) >= 0;
  });

  var melhor = null;
  candidatos.forEach(function(placa){
    // Calcula TODAS as seções com ESTE modelo de placa
    var s1 = mCalcSecRegen(s1i, placa.n);
    var s2 = mCalcSec(s2i, null, s2hc, placa.n);
    var s3 = mCalcSec(s3i, null, s3hc, placa.n);

    var dpTotal = s1.dp1 + s2.dp1 + s3.dp1;
    var ok = s1.vi && s2.vi && s3.vi && dpTotal <= dppT;
    var area = s1.A + s2.A + s3.A;

    if (ok && (!melhor || area < melhor.area)) {
      melhor = { placa: placa, s1: s1, s2: s2, s3: s3, dpTotal: dpTotal, area: area, ok: true };
    }
    // Se nenhum viável ainda, guarda o de menor dP como fallback
    if (!melhor && (!melhor || dpTotal < melhor.dpTotal)) {
      melhor = { placa: placa, s1: s1, s2: s2, s3: s3, dpTotal: dpTotal, area: area, ok: false };
    }
  });

  // Se nenhum modelo viável, usa o fallback de menor dP
  if (!melhor) {
    melhor = { placa: null, s1: mCalcSecRegen(s1i), s2: mCalcSec(s2i, null, s2hc), s3: mCalcSec(s3i, null, s3hc), dpTotal: 0, area: 0, ok: false };
    melhor.dpTotal = melhor.s1.dp1 + melhor.s2.dp1 + melhor.s3.dp1;
    melhor.area = melhor.s1.A + melhor.s2.A + melhor.s3.A;
  }

  var s1 = melhor.s1, s2 = melhor.s2, s3 = melhor.s3;
  var ht = calcHoldingTube(vp, tp, fp, bp);
  var re = safeDiv(tr - ti, Math.max(tp - ti, 0.001), 0) * 100;
  var tA = s1.A + s2.A + s3.A;
  var tDP = s1.dp1 + s2.dp1 + s3.dp1;
  var tPl = s1.n + s2.n + s3.n;
  var tQ = s2.Q + s3.Q;

  return {
    multi: true, sec1: s1, sec2: s2, sec3: s3, sec4: null, holdTube: ht, sec4On: false,
    regenEff: re, totalArea: tA, totalDpP: tDP, totalPlates: tPl, Qexterno: tQ, Qregen: s1.Q,
    mod: 'Multi: ' + s1.mod + '+' + s2.mod + '+' + s3.mod,
    n: tPl, A: tA, U: (s1.U + s2.U + s3.U) / 3, dp1: tDP, dp2: 0, Q: tQ,
    vi: melhor.ok,
    passesUsado: s1.passesUsado + ' / ' + s2.passesUsado + ' / ' + s3.passesUsado,
    todosCalculados: [], lmtd: 0, F: 1, Rep: s2.Rep, Res: s3.Res, pb: s2.pb, sb: s3.sb, rU: s2.rU, m: s2.m,
    temperaturas: { ti: ti, tr: tr, tp: tp, tf: tf, tQout: tQSR, tAqIn: tAQ, tAqOut: tSA, tGIn: tAG, tGOut: tSR, tPreResf: null, tAguaAmb: tAA }
  };
}
