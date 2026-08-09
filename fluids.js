// ============================================================
// AlfaVed PHE v44 — PROPRIEDADES DOS FLUIDOS
// Cada função retorna {rho, cp, mu, k} na temperatura T (°C)
// ============================================================

// ---------- ÁGUA ----------
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

// ---------- SOLUÇÃO DE SACAROSE (calda de açúcar) ----------
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

// ---------- CERVEJA ----------
function pCerveja(T){
  var w = pAgua(T), we = 0.04;
  return {
    rho: w.rho * (1 - we) + (789 - 0.8 * (T - 20)) * we - 30 * we * (1 - we),
    cp: w.cp * (1 - we) + (2430 + 5 * T) * we,
    mu: Math.max(Math.exp((1 - we) * Math.log(w.mu) + we * Math.log(1.2e-3 * Math.exp(-0.018 * (T - 20)))) * 1.15, 1e-5),
    k: Math.max(w.k * (1 - we) + (0.171 - 0.0003 * (T - 20)) * we, 0.3)
  };
}

// ---------- MOSTO ----------
function pMosto(T, B){ return pSacarose(T, B || 12); }

// ---------- VINHO ----------
function pVinho(T){
  var w = pAgua(T), we = 0.096;
  return {
    rho: w.rho * (1 - we) + (789 - 0.8 * (T - 20)) * we - 35 * we * (1 - we),
    cp: w.cp * (1 - we) + (2430 + 5 * T) * we,
    mu: Math.max(Math.exp((1 - we) * Math.log(w.mu) + we * Math.log(1.2e-3 * Math.exp(-0.018 * (T - 20)))) * 1.1, 1e-5),
    k: Math.max(w.k * (1 - we) + (0.171 - 0.0003 * (T - 20)) * we, 0.25)
  };
}

// ---------- LEITE ----------
function pLeite(T){
  var w = pAgua(T);
  return {
    rho: w.rho + 14 - 0.4 * (T - 20),
    cp: Math.max(w.cp - 250, 3500),
    mu: Math.max(w.mu * (1.5 + 0.01 * (20 - T)), 1e-5),
    k: Math.max(w.k - 0.02, 0.4)
  };
}

// ---------- GLICOL ETILENO ----------
function pGlicol(T, c){
  var w = (c || 20) / 100, wt = pAgua(T);
  return {
    rho: wt.rho * (1 - w) + (1113 - 0.64 * (T - 20)) * w,
    cp: wt.cp * (1 - w) + (2350 + 3.8 * T) * w,
    mu: Math.max(Math.exp((1 - w) * Math.log(wt.mu) + w * Math.log(0.021 * Math.exp(-0.025 * (T - 20)))), 1e-5),
    k: Math.max(wt.k * (1 - w) + (0.252 - 0.0003 * (T - 20)) * w, 0.15)
  };
}

// ---------- PROPILENO GLICOL ----------
function pPropGlicol(T, c){
  var w = (c || 30) / 100, wt = pAgua(T);
  return {
    rho: wt.rho * (1 - w) + (1037 - 0.6 * (T - 20)) * w,
    cp: wt.cp * (1 - w) + (2400 + 3.5 * T) * w,
    mu: Math.max(Math.exp((1 - w) * Math.log(wt.mu) + w * Math.log(0.024 * Math.exp(-0.022 * (T - 20)))), 1e-5),
    k: Math.max(wt.k * (1 - w) + (0.225 - 0.0002 * (T - 20)) * w, 0.15)
  };
}

// ---------- SALMOURA (NaCl) ----------
function pSalmoura(T, c){
  var w = (c || 10) / 100, wt = pAgua(T);
  return {
    rho: wt.rho * (1 + 0.08 * w),
    cp: wt.cp * (1 - 0.08 * w),
    mu: Math.max(wt.mu * (1 + 0.15 * w), 1e-5),
    k: Math.max(wt.k * (1 - 0.05 * w), 0.45)
  };
}

// ---------- DISPATCHER PRODUTO ----------
// gProd(f, T, brix) → {rho, cp, mu, k}
function gProd(f, T, brix){
  switch(f){
    case 'agua':        return pAgua(T);
    case 'sacarose':    return pSacarose(T, brix);
    case 'cerveja':     return pCerveja(T);
    case 'mosto':       return pMosto(T, brix);
    case 'vinho':       return pVinho(T);
    case 'leite':       return pLeite(T);
    case 'glicol20':    return pGlicol(T, 20);
    case 'glicol30':    return pGlicol(T, 30);
    case 'prop_glicol': return pPropGlicol(T, 30);
    case 'salmoura':    return pSalmoura(T, 10);
    default:            return pAgua(T);
  }
}

// ---------- DISPATCHER SERVIÇO ----------
// gServ(fs, T) → {rho, cp, mu, k}
function gServ(fs, T){
  switch(fs){
    case 'agua':        return pAgua(T);
    case 'vapor':       return pAgua(T); // condensado (aproximação)
    case 'glicol20':    return pGlicol(T, 20);
    case 'glicol30':    return pGlicol(T, 30);
    case 'prop_glicol': return pPropGlicol(T, 30);
    case 'salmoura':    return pSalmoura(T, 10);
    default:            return pAgua(T);
  }
}
