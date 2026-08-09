// ============================================================
// AlfaVed PHE v44 — MOTOR DE CÁLCULO (funções puras) — CORRIGIDO
// FIX: break condicional no loop de placas
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

// ---------- COEFICIENTE GLOBAL U (iterativo, Th/Tc dinâmico) ----------
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
    } else {
      bh = gServ(p.f1, Th); wh = gServ(p.f1, Tw);
    }
    if (hc.cold) {
      bc = hc.cold.side === 'prod' ? gProd(hc.cold.fluid, Tc, hc.cold.b) : gServ(hc.cold.fluid, Tc);
      wc = hc.cold.side === 'prod' ? gProd(hc.cold.fluid, Tw, hc.cold.b) : gServ(hc.cold.fluid, Tw);
    } else {
      bc = gProd(p.f2, Tc, p.b2); wc = gProd(p.f2, Tw, p.b2);
    }

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

// ---------- QUEDA DE PRESSÃO (com wall shear N² corrigido) ----------
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

// ---------- CÁLCULO DE UMA SEÇÃO (seleção de placas) ----------
// FIX: break condicional — só sai do loop quando VIÁVEL
function mCalcSingle(inp, hc){
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

  var mods = PLATES.filter(function(m){
    if (inp.tpl === 't') return true;
    if (inp.tpl === 's') return m.t === 's';
    return m.t === 'g';
  });
  mods = mods.filter(function(m){ return aBe.indexOf(m.be) >= 0; });

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
        if (vi) break;   // ← FIX: só sai do loop se VIÁVEL
      }
    }
  });
  return rs;
}

// ---------- SELEÇÃO DE PASSES ----------
function mCalcSec(inp, passesArr, hc){
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
    var rs = mCalcSingle(inpC, hc);
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
  var rs2 = mCalcSingle(Object.assign({}, inp, { ps: pt[0] }), hc);
  rs2.sort(function(a, b){ return a.A - b.A; });
  return { mod: rs2[0] ? rs2[0].mod : 'N/A', n: 0, A: 0, U: 0, dp1: 999, dp2: 999, Q: 0,
           vi: false, passesUsado: pt[0], todosViaveis: [], todosCalculados: rs2,
           Rep: 0, Res: 0, lm: 0, F: 0, pb: gProd('agua', 20, 0), sb: gServ('agua', 20),
           rU: { kc: 0, Tw: 0 }, m: rs2[0] ? rs2[0].m : null, lmtd: 0, tauP: 0, v1: 0, vaporMode: false };
}
