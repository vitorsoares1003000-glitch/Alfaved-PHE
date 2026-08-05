// ===== BANCO DE DADOS DE MODELOS REAIS DE PLACAS =====
// Cada modelo contém: nome, área por placa (m²), ângulo chevron (°),
// profundidade de corrugação (mm), vazão máx. (m³/h), espessura da placa (mm)

const FABRICANTES = {
    alfaLaval: {
        nome: 'Alfa Laval',
        logo: 'AL',
        cor: '#1d5aa8',
        descricao: 'Referência global em PHE',
        modelos: [
            { nome: 'M3', area: 0.032, chevron: 60, profundidade: 2.0, vazaoMax: 5, espessura: 0.4 },
            { nome: 'M6', area: 0.061, chevron: 60, profundidade: 2.0, vazaoMax: 10, espessura: 0.4 },
            { nome: 'M10', area: 0.10, chevron: 60, profundidade: 2.5, vazaoMax: 20, espessura: 0.5 },
            { nome: 'M15', area: 0.16, chevron: 60, profundidade: 2.5, vazaoMax: 30, espessura: 0.5 },
            { nome: 'M20', area: 0.21, chevron: 60, profundidade: 3.0, vazaoMax: 50, espessura: 0.5 },
            { nome: 'T2', area: 0.03, chevron: 60, profundidade: 2.0, vazaoMax: 4, espessura: 0.4 },
            { nome: 'T5', area: 0.05, chevron: 60, profundidade: 2.0, vazaoMax: 8, espessura: 0.4 },
            { nome: 'T8', area: 0.08, chevron: 60, profundidade: 2.5, vazaoMax: 15, espessura: 0.5 },
            { nome: 'T20', area: 0.20, chevron: 60, profundidade: 3.0, vazaoMax: 45, espessura: 0.5 },
            { nome: 'T35', area: 0.35, chevron: 60, profundidade: 3.0, vazaoMax: 80, espessura: 0.6 },
            { nome: 'T50', area: 0.50, chevron: 60, profundidade: 3.5, vazaoMax: 120, espessura: 0.6 },
            { nome: 'A15', area: 0.15, chevron: 60, profundidade: 2.5, vazaoMax: 28, espessura: 0.5 },
            { nome: 'A20', area: 0.20, chevron: 60, profundidade: 3.0, vazaoMax: 40, espessura: 0.5 },
            { nome: 'A30', area: 0.30, chevron: 60, profundidade: 3.0, vazaoMax: 60, espessura: 0.6 }
        ]
    },
    gea: {
        nome: 'GEA',
        logo: 'GEA',
        cor: '#123a6b',
        descricao: 'Alta performance p/ grandes vazões',
        modelos: [
            { nome: 'VT04', area: 0.04, chevron: 60, profundidade: 2.0, vazaoMax: 6, espessura: 0.4 },
            { nome: 'VT08', area: 0.08, chevron: 60, profundidade: 2.5, vazaoMax: 14, espessura: 0.5 },
            { nome: 'VT10', area: 0.10, chevron: 60, profundidade: 2.5, vazaoMax: 18, espessura: 0.5 },
            { nome: 'VT20', area: 0.20, chevron: 60, profundidade: 3.0, vazaoMax: 40, espessura: 0.5 },
            { nome: 'VT30', area: 0.30, chevron: 60, profundidade: 3.0, vazaoMax: 60, espessura: 0.6 },
            { nome: 'VT40', area: 0.40, chevron: 60, profundidade: 3.5, vazaoMax: 90, espessura: 0.6 },
            { nome: 'VT50', area: 0.50, chevron: 60, profundidade: 3.5, vazaoMax: 120, espessura: 0.6 },
            { nome: 'VT60', area: 0.60, chevron: 60, profundidade: 3.5, vazaoMax: 150, espessura: 0.6 },
            { nome: 'TS20', area: 0.20, chevron: 60, profundidade: 3.0, vazaoMax: 42, espessura: 0.5 },
            { nome: 'TS30', area: 0.30, chevron: 60, profundidade: 3.0, vazaoMax: 65, espessura: 0.6 }
        ]
    },
    sondex: {
        nome: 'Sondex',
        logo: 'SX',
        cor: '#2f7fd1',
        descricao: 'Soluções robustas e versáteis',
        modelos: [
            { nome: 'S4', area: 0.04, chevron: 60, profundidade: 2.0, vazaoMax: 6, espessura: 0.4 },
            { nome: 'S8', area: 0.08, chevron: 60, profundidade: 2.5, vazaoMax: 14, espessura: 0.5 },
            { nome: 'S12', area: 0.12, chevron: 60, profundidade: 2.5, vazaoMax: 20, espessura: 0.5 },
            { nome: 'S20', area: 0.20, chevron: 60, profundidade: 3.0, vazaoMax: 40, espessura: 0.5 },
            { nome: 'S30', area: 0.30, chevron: 60, profundidade: 3.0, vazaoMax: 60, espessura: 0.6 },
            { nome: 'S40', area: 0.40, chevron: 60, profundidade: 3.5, vazaoMax: 90, espessura: 0.6 },
            { nome: 'S50', area: 0.50, chevron: 60, profundidade: 3.5, vazaoMax: 120, espessura: 0.6 },
            { nome: 'S65', area: 0.65, chevron: 60, profundidade: 3.5, vazaoMax: 160, espessura: 0.6 }
        ]
    },
    apv: {
        nome: 'APV',
        logo: 'APV',
        cor: '#c85e10',
        descricao: 'Tradição em processos alimentícios',
        modelos: [
            { nome: 'SR3', area: 0.03, chevron: 60, profundidade: 2.0, vazaoMax: 5, espessura: 0.4 },
            { nome: 'SR5', area: 0.05, chevron: 60, profundidade: 2.0, vazaoMax: 8, espessura: 0.4 },
            { nome: 'SR8', area: 0.08, chevron: 60, profundidade: 2.5, vazaoMax: 14, espessura: 0.5 },
            { nome: 'SR12', area: 0.12, chevron: 60, profundidade: 2.5, vazaoMax: 20, espessura: 0.5 },
            { nome: 'SR20', area: 0.20, chevron: 60, profundidade: 3.0, vazaoMax: 40, espessura: 0.5 },
            { nome: 'SR30', area: 0.30, chevron: 60, profundidade: 3.0, vazaoMax: 60, espessura: 0.6 },
            { nome: 'SR40', area: 0.40, chevron: 60, profundidade: 3.5, vazaoMax: 90, espessura: 0.6 }
        ]
    }
};

// ===== PROPRIEDADES DOS FLUIDOS =====
const FLUIDOS = {
    agua:   { rho: 995, cp: 4180, k: 0.62,  mu: 0.0008, nome: 'Água' },
    oleo:   { rho: 850, cp: 2100, k: 0.14,  mu: 0.010,  nome: 'Óleo térmico' },
    glicol: { rho: 1040, cp: 3600, k: 0.42, mu: 0.003,  nome: 'Glicol' },
    vapor:  { rho: 0.6, cp: 2010, k: 0.025, mu: 0.000012, nome: 'Vapor' }
};

// ===== FUNÇÃO PRINCIPAL =====
function dimensionar(dados) {
    const fQ = FLUIDOS[dados.fluidoQ];
    const fF = FLUIDOS[dados.fluidoF];

    const mQ = (dados.vazaoQ / 3600) * fQ.rho;
    const mF = (dados.vazaoF / 3600) * fF.rho;

    let toutF = dados.toutF;
    if (!toutF || isNaN(toutF)) {
        const Q = mQ * fQ.cp * (dados.tinQ - dados.toutQ);
        toutF = dados.tinF + Q / (mF * fF.cp);
    }

    const Q = mQ * fQ.cp * (dados.tinQ - dados.toutQ);

    const dT1 = dados.tinQ - toutF;
    const dT2 = dados.toutQ - dados.tinF;
    const lmtd = (dT1 - dT2) / Math.log(dT1 / dT2);

    const resultados = [];

    // Para cada fabricante selecionado
    for (const key of dados.fabricantes) {
        const fab = FABRICANTES[key];
        if (!fab) continue;

        // Coeficiente global base (W/m²·K)
        const Ubase = 2500 * dados.fatorU * (fQ.k / 0.62) * (fF.k / 0.62);

        // Área necessária (m²) SEM margem ainda
        const A = Q / (Ubase * lmtd);
        const A_margem = A * (1 + dados.margem / 100);

        // Selecionar o melhor modelo de placa
        // Critério: menor área por placa que atenda a vazão máx. e resulte em número razoável de placas
        let melhorModelo = null;
        let melhorPlacas = Infinity;

        for (const modelo of fab.modelos) {
            // Verificar se o modelo atende a vazão máxima (maior das duas vazões)
            const vazaoRequerida = Math.max(dados.vazaoQ, dados.vazaoF);
            if (modelo.vazaoMax < vazaoRequerida) continue;

            // Número de placas (área total / área por placa)
            const numPlacas = Math.ceil(A_margem / modelo.area);

            // Critério: preferir o modelo que dá o menor número de placas
            // (mas não tão poucas que fique ineficiente - mínimo 10 placas)
            if (numPlacas < melhorPlacas && numPlacas >= 10) {
                melhorPlacas = numPlacas;
                melhorModelo = modelo;
            }
        }

        // Se nenhum modelo atendeu (vazão muito alta), usar o maior modelo
        if (!melhorModelo) {
            melhorModelo = fab.modelos[fab.modelos.length - 1];
            melhorPlacas = Math.ceil(A_margem / melhorModelo.area);
        }

        resultados.push({
            key: key,
            nome: fab.nome,
            logo: fab.logo,
            cor: fab.cor,
            descricao: fab.descricao,
            area: A_margem,
            numPlacas: melhorPlacas,
            modelo: melhorModelo.nome,
            areaPorPlaca: melhorModelo.area,
            chevron: melhorModelo.chevron,
            profundidade: melhorModelo.profundidade,
            vazaoMax: melhorModelo.vazaoMax,
            espessura: melhorModelo.espessura,
            U: Ubase
        });
    }

    // Ordenar por área (menor = melhor)
    resultados.sort((a, b) => a.area - b.area);

    return { Q, lmtd, toutF, mQ, mF, resultados };
}
