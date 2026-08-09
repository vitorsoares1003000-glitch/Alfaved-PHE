// ============================================================
// AlfaVed PHE v44 — PROPRIEDADES DOS FLUIDOS (BANCO COMPLETO)
// LADO PRODUTO: 18 fluidos | LADO SERVIÇO: 8 fluidos
// Cada função retorna {rho, cp, mu, k} na temperatura T (°C)
// ============================================================

// ================= LADO PRODUTO (18 fluidos) =================

// ---------- 1. ÁGUA ----------
function pAgua(T){
  var rho = 1000 * (1 - Math.pow(Math.abs(T - 4) / 622, 1.71));
  rho = Math.max(rho, 800);
  var cp = 4182 + (T - 20) * (0.06 + 0.0008 * (T - 20));
  cp = Math.max(cp, 3000);
  var mu = 1e-3 * (1.78 - 0.057 * T + 0.00106 * T * T - 8.5e-6 * T * T * T);
  mu = Math.max(mu, 1e-5);
  var k = 0.5706 + 0.00176 * T - 6.46e-6 * T * T;
  k = Math.max(k, 0.1);
  return { rho: rho, cp: cp, mu: mu, k: k };
}

// ---------- 2. SOLUÇÃO DE SACAROSE (calda de açúcar) ----------
function pSacarose(T, B){
  var w = (B || 0) / 100;
  var wt = pAgua(T);
  var dr = 3.8749 * w + 0.0174 * w * w - 0.0063 * w * T;
  var cp = wt.cp * (1 - w) + (1262 + 4.524 * T) * w;
  var lM = Math.log10(wt.mu);
  var lR = 3.2488 * w + 7.5 * w * w + 14.2 * w * w * w - 0.03 * w * T;
  return {
    rho: Math.max(wt.rho + dr, 800),
    cp: Math.max(cp, 1500),
    mu: Math.max(Math.pow(10, lM + lR), 1e-5),
    k: Math.max(wt.k - 0.424 * w + 0.001 * T, 0.15)
  };
}

// ---------- 3. SUCO DE CANA ----------
function pSucoCana(T, B){ return pSacarose(T, B || 16); }

// ---------- 4. VINHO DE CANA ----------
function pVinhoCana(T, B){
  var we = 0.1, w = pAgua(T), ba = pSacarose(T, Math.min(B || 6, 10));
  return {
    rho: w.rho * (1 - we) + (789 - 0.8 * (T - 20)) * we - 40 * we * (1 - we) + (ba.rho - w.rho) * 0.5,
    cp: w.cp * (1 - we) + (2430 + 5 * T) * we + (ba.cp - w.cp) * 0.3,
    mu: Math.max(Math.exp((1 - we) * Math.log(ba.mu) + we * Math.log(1.2e-3 * Math.exp(-0.018 * (T - 20)))), 1e-5),
    k: Math.max(w.k * (1 - we) + (0.171 - 0.0003 * (T - 20)) * we + (ba.k - w.k) * 0.3, 0.1)
  };
}

// ---------- 5. LEVEDURA DE CANA ----------
function pLeveduraCana(T, C){
  var w = (C || 25) / 100, wt = pAgua(T);
  return {
    rho: wt.rho * (1 + 0.35 * w),
    cp: wt.cp * (1 - 0.35 * w) + 1500 * w,
    mu: Math.max(wt.mu * Math.exp(4.5 * w), 1e-5),
    k: Math.max(wt.k * (1 - 0.25 * w), 0.2)
  };
}

// ---------- 6. LEVEDURA DE CERVEJA ----------
function pLeveduraCerveja(T, C){ return pLeveduraCana(T, C || 20); }

// ---------- 7. CERVEJA ----------
function pCerveja(T){
  var w = pAgua(T), we = 0.04;
  return {
    rho: w.rho * (1 - we) + (789 - 0.8 * (T - 20)) * we - 30 * we * (1 - we),
    cp: w.cp * (1 - we) + (2430 + 5 * T) * we,
    mu: Math.max(Math.exp((1 - we) * Math.log(w.mu) + we * Math.log(1.2e-3 * Math.exp(-0.018 * (T - 20)))) * 1.15, 1e-5),
    k: Math.max(w.k * (1 - we) + (0.171 - 0.0003 * (T - 20)) * we, 0.3)
  };
}

// ---------- 8. MOSTO ----------
function pMosto(T, B){ return pSacarose(T, B || 12); }

// ---------- 9. VINHO ----------
function pVinho(T){
  var w = pAgua(T), we = 0.096;
  return {
    rho: w.rho * (1 - we) + (789 - 0.8 * (T - 20)) * we - 35 * we * (1 - we),
    cp: w.cp * (1 - we) + (2430 + 5 * T) * we,
    mu: Math.max(Math.exp((1 - we) * Math.log(w.mu) + we * Math.log(1.2e-3 * Math.exp(-0.018 * (T - 20)))) * 1.1, 1e-5),
    k: Math.max(w.k * (1 - we) + (0.171 - 0.0003 * (T - 20)) * we, 0.25)
  };
}

// ---------- 10. SOFT DRINK ----------
function pSoftDrink(T, B){ return pSacarose(T, B || 6); }

// ---------- 11. LEITE ----------
function pLeite(T){
  var w = pAgua(T);
  return {
    rho: w.rho + 14 - 0.4 * (T - 20),
    cp: Math.max(w.cp - 250, 3500),
    mu: Math.max(w.mu * (1.5 + 0.01 * (20 - T)), 1e-5),
    k: Math.max(w.k - 0.02, 0.4)
  };
}

// ---------- 12. ETANOL ----------
function pEtanol(T, C){
  var w = (C || 50) / 100, wt = pAgua(T);
  return {
    rho: wt.rho * (1 - w) + (789 - 0.8 * (T - 20)) * w - 50 * w * (1 - w),
    cp: wt.cp * (1 - w) + (2430 + 5 * T) * w,
    mu: Math.max(Math.exp((1 - w) * Math.log(wt.mu) + w * Math.log(1.2e-3 * Math.exp(-0.018 * (T - 20))) + 0.375 * w * (1 - w)), 1e-5),
    k: Math.max(wt.k * (1 - w) + (0.171 - 0.0003 * (T - 20)) * w - 0.05 * w * (1 - w), 0.1)
  };
}

// ---------- 13. ÓLEO VEGETAL ----------
function pOleoVegetal(T){
  return {
    rho: Math.max(920 - 0.7 * (T - 20), 850),
    cp: 2000 + 2 * T,
    mu: Math.max(0.05 * Math.exp(-0.02 * (T - 20)), 0.001),
    k: Math.max(0.17 - 0.0001 * (T - 20), 0.1)
  };
}

// ---------- 14. SALMOURA (NaCl) ----------
function pSalmoura(T, c){
  var w = (c || 10) / 100, wt = pAgua(T);
  return {
    rho: wt.rho * (1 + 0.08 * w),
    cp: wt.cp * (1 - 0.08 * w),
    mu: Math.max(wt.mu * (1 + 0.15 * w), 1e-5),
    k: Math.max(wt.k * (1 - 0.05 * w), 0.45)
  };
}

// ---------- 15. ÓLEO SAE 10 ----------
function pSAE10(T){ return pSAE(T, 10); }

// ---------- 16. ÓLEO SAE 30 ----------
function pSAE30(T){ return pSAE(T, 30); }

function pSAE(T, g){
  var v = { 10: 0.05, 30: 0.1 }[g || 10];
  return {
    rho: Math.max(880 - 0.6 * (T - 20), 820),
    cp: 1880 + 2 * T,
    mu: Math.max(v * Math.exp(-0.025 * (T - 30)), 0.005),
    k: Math.max(0.14 - 0.0001 * (T - 20), 0.1)
  };
}

// ---------- 17. AMÔNIA AQUOSA ----------
function pAmoniaAq(T, C){
  var w = (C || 25) / 100, wt = pAgua(T);
  return {
    rho: wt.rho * (1 - 0.12 * w),
    cp: wt.cp * (1 - 0.1 * w) + 4700 * w,
    mu: Math.max(wt.mu * (1 + 0.2 * w), 1e-5),
    k: Math.max(wt.k * (1 + 0.15 * w), 0.4)
  };
}

// ---------- 18. PROPILENO GLICOL ----------
function pPropGlicol(T, c){
  var w = (c || 30) / 100, wt = pAgua(T);
  return {
    rho: wt.rho * (1 - w) + (1037 - 0.6 * (T - 20)) * w,
    cp: wt.cp * (1 - w) + (2400 + 3.5 * T) * w,
    mu: Math.max(Math.exp((1 - w) * Math.log(wt.mu) + w * Math.log(0.024 * Math.exp(-0.022 * (T - 20)))), 1e-5),
    k: Math.max(wt.k * (1 - w) + (0.225 - 0.0002 * (T - 20)) * w, 0.15)
  };
}

// ================= LADO SERVIÇO (8 fluidos) =================

// ---------- GLICOL ETILENO (10/20/30%) ----------
function pGlicol(T, c){
  var w = (c || 20) / 100, wt = pAgua(T);
  return {
    rho: wt.rho * (1 - w) + (1113 - 0.64 * (T - 20)) * w,
    cp: wt.cp * (1 - w) + (2350 + 3.8 * T) * w,
    mu: Math.max(Math.exp((1 - w) * Math.log(wt.mu) + w * Math.log(0.021 * Math.exp(-0.025 * (T - 20)))), 1e-5),
    k: Math.max(wt.k * (1 - w) + (0.252 - 0.0003 * (T - 20)) * w, 0.15)
  };
}

// ---------- REFRIGERANTE (R717, R134a, R22, R410A, R32, R404A) ----------
function pRefrigerante(g, T){
  var TB = {
    'R717':  { '-40':[682,3.46e-4,.628,4426], '-20':[662,2.93e-4,.596,4515], '0':[639,2.52e-4,.567,4610], '20':[610,2.2e-4,.540,4722], '40':[580,1.95e-4,.514,4852] },
    'R134a': { '-40':[1387,4.81e-4,.111,1247], '-20':[1332,3.71e-4,.1,1300], '0':[1273,2.97e-4,.09,1358], '20':[1210,2.43e-4,.08,1427], '40':[1142,2.02e-4,.071,1512] },
    'R22':   { '-40':[1406,4e-4,.114,1124], '-20':[1349,3.17e-4,.104,1173], '0':[1285,2.58e-4,.094,1230], '20':[1210,2.13e-4,.084,1299], '40':[1128,1.79e-4,.074,1383] },
    'R410A': { '-40':[1230,2.6e-4,.105,1421], '-20':[1172,2.09e-4,.097,1482], '0':[1106,1.72e-4,.089,1555], '20':[1028,1.44e-4,.081,1646], '40':[931,1.23e-4,.073,1765] },
    'R32':   { '-40':[1142,2.75e-4,.181,1730], '-20':[1090,2.19e-4,.169,1798], '0':[1027,1.78e-4,.158,1883], '20':[950,1.48e-4,.147,1992], '40':[851,1.26e-4,.136,2141] },
    'R404A': { '-40':[1234,3e-4,.089,1335], '-20':[1174,2.36e-4,.081,1398], '0':[1103,1.91e-4,.074,1474], '20':[1018,1.58e-4,.067,1570], '40':[911,1.34e-4,.059,1697] }
  };
  var tb = TB[g];
  if (!tb) return pAgua(T);
  var ks = Object.keys(tb).map(Number).sort(function(a, b){ return a - b; });
  var t1 = ks[0], t2 = ks[ks.length - 1];
  for (var i = 0; i < ks.length - 1; i++) {
    if (T >= ks[i] && T <= ks[i + 1]) { t1 = ks[i]; t2 = ks[i + 1]; break; }
  }
  if (T < ks[0]) { t1 = ks[0]; t2 = ks[1]; }
  if (T > ks[ks.length - 1]) { t1 = ks[ks.length - 2]; t2 = ks[ks.length - 1]; }
  var f = safeDiv(T - t1, Math.max(t2 - t1, 0.001), 0), d1 = tb[t1], d2 = tb[t2];
  return {
    rho: d1[0] + (d2[0] - d1[0]) * f,
    cp: d1[3] + (d2[3] - d1[3]) * f,
    mu: Math.max(d1[1] + (d2[1] - d1[1]) * f, 1e-5),
    k: Math.max(d1[2] + (d2[2] - d1[2]) * f, 0.04)
  };
}

// ================= DISPATCHER PRODUTO (16) =================
// gProd(f, T, brix) → {rho, cp, mu, k}
function gProd(f, T, brix){
  switch(f){
    case 'agua':            return pAgua(T);
    case 'sacarose':        return pSacarose(T, brix);
    case 'suco_cana':       return pSucoCana(T, brix);
    case 'vinho_cana':      return pVinhoCana(T, brix);
    case 'levedura_cana':   return pLeveduraCana(T, brix);
    case 'levedura_cerveja': return pLeveduraCerveja(T, brix);
    case 'cerveja':         return pCerveja(T);
    case 'mosto':           return pMosto(T, brix);
    case 'vinho':           return pVinho(T);
    case 'soft_drink':      return pSoftDrink(T, brix);
    case 'leite':           return pLeite(T);
    case 'etanol':          return pEtanol(T, brix);
    case 'oleo_vegetal':    return pOleoVegetal(T);
    case 'salmoura':        return pSalmoura(T, brix);
    case 'sae10':           return pSAE10(T);
    case 'sae30':           return pSAE30(T);
    default:                return pAgua(T);
  }
}

// ================= DISPATCHER SERVIÇO (8) =================
// gServ(fs, T, gas) → {rho, cp, mu, k}
function gServ(fs, T, gas){
  switch(fs){
    case 'agua':        return pAgua(T);
    case 'vapor':       return pAgua(T);          // condensado (aproximação)
    case 'glicol10':    return pGlicol(T, 10);
    case 'glicol20':    return pGlicol(T, 20);
    case 'glicol30':    return pGlicol(T, 30);
    case 'prop_glicol': return pPropGlicol(T, 30);
    case 'salmoura':    return pSalmoura(T, 10);
    case 'refrigerante': return pRefrigerante(gas || 'R717', T);
    default:            return pAgua(T);
  }
}
