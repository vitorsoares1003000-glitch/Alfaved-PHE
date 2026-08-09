// ============================================================
// AlfaVed PHE v44 — CORRELAÇÕES DE TRANSFERÊNCIA DE CALOR
// Martin (1996) + Kumar (1984) — média ponderada
// ============================================================

// ---------- NÚMERO DE NUSSELT — MARTIN ----------
function nMartin(Re, Pr, be, mu, muw){
  var b = be * Math.PI / 180;
  var g = (Math.cos(b) * Math.cos(b)) / (0.045 * Math.tan(b) + 3.7 * Math.sin(b))
        + (Math.sin(b) * Math.sin(b)) / (2.25 / Math.tan(b) + 0.125 * Math.cos(b));
  var z = Math.pow(1 / Math.max(Re, 1), 0.25) * Math.pow(Math.max(g, 0.001), -1/6);
  var nu = 0.122 * Math.pow(Math.max(Pr, 0.1), 1/3)
         * Math.pow(Math.max(z / 2, 0.001), 1/6)
         * Math.pow(Math.max(Re, 1), 0.75)
         * Math.pow(Math.max(mu / muw, 0.1), 0.14);
  return Math.max(nu, 1);
}

// ---------- FATOR DE ATRITO — MARTIN ----------
function fMartin(Re, be){
  var b = be * Math.PI / 180;
  var g = (Math.cos(b) * Math.cos(b)) / (0.045 * Math.tan(b) + 3.7 * Math.sin(b))
        + (Math.sin(b) * Math.sin(b)) / (2.25 / Math.tan(b) + 0.125 * Math.cos(b));
  var f = 0.5 * Math.pow(1 / Math.max(Re, 1), 0.25) * Math.pow(Math.max(g, 0.001), -1/6);
  return Math.max(f, 0.001);
}

// ---------- NÚMERO DE NUSSELT — KUMAR (com troca de regime) ----------
function nKumar(Re, Pr, be, mu, muw){
  var Ch, n;
  if (be <= 30) {
    if (Re <= 10) { Ch = 0.718; n = 0.349; }
    else          { Ch = 0.348; n = 0.663; }
  } else if (be <= 45) {
    if (Re < 10)      { Ch = 0.718; n = 0.349; }
    else if (Re < 100){ Ch = 0.400; n = 0.503; }
    else              { Ch = 0.348; n = 0.663; }
  } else {
    if (Re < 10) { Ch = 0.718; n = 0.349; }
    else         { Ch = 0.481; n = 0.663; }
  }
  var nu = Ch * Math.pow(Math.max(Re, 1), n)
         * Math.pow(Math.max(Pr, 0.1), 1/3)
         * Math.pow(Math.max(mu / muw, 0.1), 0.17);
  return Math.max(nu, 1);
}

// ---------- FATOR DE ATRITO — KUMAR ----------
function fKumar(Re, be){
  var Kp, m;
  if (be <= 30) {
    if (Re <= 10)     { Kp = 50;    m = 1.0;   }
    else if (Re <= 100){ Kp = 19.4;  m = 0.589; }
    else              { Kp = 2.99;  m = 0.183; }
  } else if (be <= 45) {
    if (Re < 15)      { Kp = 47;    m = 1.0;   }
    else if (Re < 100){ Kp = 18.29; m = 0.65;  }
    else              { Kp = 2.99;  m = 0.183; }
  } else {
    if (Re < 10) { Kp = 50; m = 1.0; }
    else         { Kp = 3.0; m = 0.183; }
  }
  return Math.max(Kp / Math.pow(Math.max(Re, 1), m), 0.001);
}

// ---------- MÉDIAS (Nu 50/50, f 30/70) ----------
function nAvg(Re, Pr, be, mu, muw){
  return (nMartin(Re, Pr, be, mu, muw) + nKumar(Re, Pr, be, mu, muw)) / 2;
}
function fAvg(Re, be){
  return 0.3 * fMartin(Re, be) + 0.7 * fKumar(Re, be);
}

// ---------- TENSÃO DE CISALHAMENTO NA PAREDE ----------
// tau = dp * De / (4 * L_total)  — L_total = Lr * N (comprimento percorrido)
function wallShear(dp, De, L){
  return Math.abs(safeDiv(dp * De, 4 * Math.max(L, 0.001), 0));
}

// ---------- FILTRO DE ÂNGULO (theta) ----------
// Seleciona ângulos de placa conforme a razão ΔT/LMTD
function thetaFilter(dt, lmtd){
  var th = safeDiv(Math.abs(dt), Math.max(lmtd, 0.01), 1);
  if (th > 1.5) return [60];        // ΔT alto → placas de alto ângulo
  if (th > 0.8) return [45, 60];
  return [30, 45, 60];              // padrão
}

// ---------- CONDENSAÇÃO — NUSSELT (filme) ----------
function condHNusselt(p, Ts, Tw, Lp){
  var kl = 0.686;            // condutividade condensado (W/mK)
  var rhol = 943;            // densidade líquido (kg/m³)
  var rhov = 1.12;           // densidade vapor (kg/m³)
  var g = 9.81;
  var hfg = (HFG[p || 2] || 2202) * 1000;  // J/kg
  var mul = 0.000231;        // viscosidade condensado (Pa·s)
  var dT = Math.max(Math.abs(Ts - Tw), 1);
  var h = 0.943 * Math.pow(kl * kl * kl * rhol * (rhol - rhov) * g * hfg / (mul * Lp * dT), 0.25);
  h = 1.5 * h;               // fator de segurança
  return Math.max(Math.min(h, 20000), 5000);
}

// ---------- DETECÇÃO VAPOR ----------
function isVapor(fs, tis, tos){
  return fs === 'vapor' || Math.abs(tis - tos) < 0.1;
}

// ---------- VAZÃO DE VAPOR (CORRETA — sem ×1000) ----------
// Qkw em kW (= kJ/s), hfg em kJ/kg → mV = Qkw / hfg (kg/s)
function calcVaporFlow(Qkw, p){
  var hfg = HFG[p || 2] || 2202;
  var mV = safeDiv(Qkw, hfg, 0);          // kg/s
  var vCond = safeDiv(mV, 943, 0) * 3600; // m³/h (condensado líquido)
  return { mVapor: mV, vCond: vCond, hfg: hfg };
}

// ---------- LMTD (média logarítmica) ----------
function cL(a, b, c, d){
  var d1 = a - d, d2 = b - c;
  if (Math.abs(d1) < 0.001 && Math.abs(d2) < 0.001) return 0.001;
  if (Math.abs(d1 - d2) < 0.01) return Math.abs(d1);  // caso degenerado → média aritmética
  d1 = Math.abs(d1); d2 = Math.abs(d2);
  if (d1 < 0.001) return d2;
  if (d2 < 0.001) return d1;
  return Math.abs((d1 - d2) / Math.log(d1 / d2));
}

// ---------- FATOR DE CORREÇÃO F (Pignotti-Shah) ----------
function fF(P, R, a){
  if (a === '1-1') return 1;  // contracorrente pura
  if (Math.abs(R - 1) < 0.001) R = 1.001;
  if (Math.abs(1 - P * R) < 0.001) P = 0.999 / Math.max(R, 0.001);
  var s = Math.sqrt(R * R + 1);
  var num = s * Math.log(Math.abs((1 - P) / (1 - P * R)));
  var den = (R - 1) * Math.log(Math.abs((2 - P * (R + 1 - s)) / (2 - P * (R + 1 + s))));
  if (Math.abs(den) < 1e-10) return 0.75;
  return Math.max(Math.min(num / den, 1), 0);
}

// ---------- DIVISÃO SEGURA (proteção contra zero) ----------
function safeDiv(a, b, fb){
  var d = Math.abs(b);
  if (!isFinite(d) || d < 1e-12) return (fb !== undefined) ? fb : 0;
  return a / b;
}
