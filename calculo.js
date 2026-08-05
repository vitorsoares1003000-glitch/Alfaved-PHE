// ============================================================
// CALCULO.JS — Motor de dimensionamento de PHE
// Método: balanço de energia + LMTD (contracorrente) +
// correlações de Nusselt e fator de atrito (placas chevron)
// ============================================================

const KW = 16;                // condutividade do aço da placa (W/m·K)
const ESP_PLACA = 0.0005;     // espessura da placa (m) ≈ 0,5 mm
const FATOR_ENLARG = 1.2;     // fator de encurvamento da corrugação (φ)

// ---------- Propriedades dos fluidos ----------
const TABELAS = {
  agua: {
    rho: 995, cp: 4186, k: 0.62,
    mu: [[0, 0.00179], [20, 0.00100], [40, 0.00065], [60, 0.00047], [80, 0.00035], [100, 0.00028], [120, 0.00023]]
  },
  glicol30: {
    rho: 1035, cp: 3750, k: 0.45,
    mu: [[0, 0.0042], [20, 0.0025], [40, 0.0016], [60, 0.0010], [80, 0.0007], [100, 0.0005]]
  },
  oleo: {
    rho: 870, cp: 2000, k: 0.14,
    mu: [[0, 0.30], [20, 0.10], [40, 0.045], [60, 0.022], [80, 0.012], [100, 0.007]]
  },
  leite: {
    rho: 1030, cp: 3900, k: 0.55,
    mu: [[0, 0.004], [20, 0.002], [40, 0.0012], [60, 0.0008], [80, 0.0006]]
  }
};

function interpolar(tabela, T) {
  if (T <= tabela[0][0]) return tabela[0][1];
  for (let i = 1; i < tabela.length; i++) {
    if (T <= tabela[i][0]) {
      const [t0, v0] = tabela[i - 1];
      const [t1, v1] = tabela[i];
      return v0 + (v1 - v0) * (T - t0) / (t1 - t0);
    }
  }
  return tabela[tabela.length - 1][1];
}

function propsFluido(id, T, personalizado) {
  if (id === 'personalizado') {
    if (personalizado) return { rho: personalizado.rho, cp: personalizado.cp, mu: personalizado.mu, k: personalizado.k };
    return { rho: TABELAS.agua.rho, cp: TABELAS.agua.cp, k: TABELAS.agua.k, mu: interpolar(TABELAS.agua.mu, T) };
  }
  const t = TABELAS[id] || TABELAS.agua;
  return { rho: t.rho, cp: t.cp, k: t.k, mu: interpolar(t.mu, T) };
}

// ---------- Correlações chevron (Kumar e similares) ----------
// Nu = C * Re^m * Pr^(1/3)      f = Kf / Re^z
const CORRELACOES = {
  30: { C: 0.348, m: 0.663, Kf: 0.90, z: 0.250 },
  45: { C: 0.257, m: 0.707, Kf: 1.20, z: 0.250 },
  60: { C: 0.148, m: 0.760, Kf: 1.90, z: 0.250 }
};

function calcLMTD(t_h1, t_h2, t_c1, t_c2) {
  const d1 = t_h1 - t_c2;
  const d2 = t_h2 - t_c1;
  if (d1 <= 0 || d2 <= 0) return -1;
  if (Math.abs(d1 - d2) < 1e-6) return d1;
  return (d1 - d2) / Math.log(d1 / d2);
}

// Dimensiona uma placa específica, testando 1 a 4 passos
function dimensionarPlaca(entrada, fab, placa, mh, mc, ph, pc, Q, LMTD) {
  const b = placa.gap_mm / 1000;          // folga do canal (m)
  const A_ch = placa.largura_m * b;       // área de escoamento por canal
  const Dh = 2 * b / FATOR_ENLARG;        // diâmetro hidráulico (m)
  const corr = CORRELACOES[placa.chevron] || CORRELACOES[45];
  const C = corr.C * fab.fator_desempenho;
  const Kf = corr.Kf * fab.fator_atrito;
  const margem = 1 + entrada.margem / 100;
  const A_porta = Math.PI * Math.pow(placa.porto_mm / 1000, 2) / 4;

  let melhor = null;

  for (const passos of [1, 2, 3, 4]) {
    let Ncanais = 40; // chute inicial
    let resultado = null;

    for (let it = 0; it < 15; it++) {
      Ncanais = Math.max(passos, Math.round(Ncanais / passos) * passos);
      const nch = Ncanais / passos; // canais por passo

      const Gq = mh / (nch * A_ch);
      const Gf = mc / (nch * A_ch);
      const Req = Gq * Dh / ph.mu;
      const Ref = Gf * Dh / pc.mu;
      const Prq = ph.cp * ph.mu / ph.k;
      const Prf = pc.cp * pc.mu / pc.k;

      const Nuq = C * Math.pow(Req, corr.m) * Math.pow(Prq, 1 / 3);
      const Nuf = C * Math.pow(Ref, corr.m) * Math.pow(Prf, 1 / 3);
      const hq = Nuq * ph.k / Dh;
      const hf = Nuf * pc.k / Dh;

      const U = 1 / (1 / hq + 1 / hf + entrada.rfQ + entrada.rfF + ESP_PLACA / KW);
      const A_nec = Q / (U * LMTD) * margem;
      const Ncanais_nec = Math.ceil(A_nec / placa.area);
      const Nc_arred = Math.max(passos, Math.round(Ncanais_nec / passos) * passos);

      if (Math.abs(Nc_arred - Ncanais) <= passos) {
        // Convergiu -> calcula perdas de carga
        const fq = Kf / Math.pow(Req, corr.z);
        const ff = Kf / Math.pow(Ref, corr.z);
        const dPq_canal = fq * (placa.comprimento_m * passos / Dh) * (Gq * Gq / (2 * ph.rho));
        const dPf_canal = ff * (placa.comprimento_m * passos / Dh) * (Gf * Gf / (2 * pc.rho));
        const Gq_porta = mh / (ph.rho * A_porta);
        const Gf_porta = mc / (pc.rho * A_porta);
        const dPq_porta = passos * 0.8 * (Gq_porta * Gq_porta / (2 * ph.rho));
        const dPf_porta = passos * 0.8 * (Gf_porta * Gf_porta / (2 * pc.rho));

        const dPq = (dPq_canal + dPq_porta) / 1000; // kPa
        const dPf = (dPf_canal + dPf_porta) / 1000;

        resultado = {
          placa: placa.modelo,
          chevron: placa.chevron,
          material: placa.material,
          passos,
          Nplacas: Nc_arred + 1,
          area: Nc_arred * placa.area,
          U, hq, hf, Req, Ref,
          dPq, dPf,
          okQ: dPq <= entrada.dPmaxQ,
          okF: dPf <= entrada.dPmaxF,
          excesso: Math.max(0, dPq - entrada.dPmaxQ) + Math.max(0, dPf - entrada.dPmaxF),
          custo: Nc_arred * placa.area * entrada.precoBase * fab.fator_custo
        };
        break;
      }
      Ncanais = Nc_arred;
    }

    if (resultado) {
      if (!melhor) { melhor = resultado; continue; }
      const melhorOk = melhor.okQ && melhor.okF;
      const resOk = resultado.okQ && resultado.okF;
      if (resOk && !melhorOk) melhor = resultado;
      else if (resOk === melhorOk && resultado.area < melhor.area) melhor = resultado;
      else if (resOk === melhorOk && resultado.area === melhor.area && resultado.excesso < melhor.excesso) melhor = resultado;
    }
  }
  return melhor;
}

// Dimensiona um fabricante inteiro (escolhe a melhor placa da linha)
function dimensionarFabricante(entrada, fab) {
  const ph_med = propsFluido(entrada.fh.id, (entrada.fh.t1 + entrada.fh.t2) / 2, entrada.pers.fh);
  const pc_med = propsFluido(entrada.fc.id, (entrada.fc.t1 + (entrada.fc.t2 || entrada.fc.t1)) / 2, entrada.pers.fc);

  const mh = entrada.fh.vazao * ph_med.rho / 3600; // kg/s
  const mc = entrada.fc.vazao * pc_med.rho / 3600;
  const Qh = mh * ph_med.cp * (entrada.fh.t1 - entrada.fh.t2);

  let tc2 = entrada.fc.t2;
  let Q = Qh;
  const alertas = [];

  if (tc2 == null || Number.isNaN(tc2)) {
    tc2 = entrada.fc.t1 + Q / (mc * pc_med.cp);
  } else {
    const Qc = mc * pc_med.cp * (tc2 - entrada.fc.t1);
    const dif = Math.abs(Qh - Qc) / Math.max(Qh, Qc);
    if (dif > 0.05) {
      alertas.push('Balanço de energia com diferença de ' + (dif * 100).toFixed(1) + '% — usando a média das cargas.');
      Q = (Qh + Qc) / 2;
    }
  }

  if (Q <= 0) return { erro: 'Carga térmica inválida (verifique temperaturas).' };

  const LMTD = calcLMTD(entrada.fh.t1, entrada.fh.t2, entrada.fc.t1, tc2);
  if (LMTD <= 0) return { erro: 'LMTD inválido — há cruzamento térmico. Verifique as temperaturas.' };

  const resultados = [];
  for (const placa of fab.placas) {
    const r = dimensionarPlaca(entrada, fab, placa, mh, mc, ph_med, pc_med, Q, LMTD);
    if (r) resultados.push(r);
  }
  if (resultados.length === 0) return { erro: 'Nenhuma placa do fabricante atendeu aos critérios.' };

  const ok = resultados.filter(r => r.okQ && r.okF);
  const escolhido = ok.length > 0
    ? ok.reduce((a, b) => a.area < b.area ? a : b)
    : resultados.reduce((a, b) => a.excesso < b.excesso ? a : b);

  return { ...escolhido, Q, LMTD, tc2, alertas };
}

// Roda o dimensionamento para todos os fabricantes selecionados
function compararFabricantes(entrada) {
  const resultados = [];
  for (const fab of FABRICANTES) {
    if (!entrada.fabricantes.includes(fab.id)) continue;
    const r = dimensionarFabricante(entrada, fab);
    resultados.push({ ...r, fabId: fab.id, nome: fab.nome, cor: fab.cor, destaque: fab.destaque });
  }
  return resultados;
}
