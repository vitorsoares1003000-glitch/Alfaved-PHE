// ===== DADOS DOS FABRICANTES =====
const FABRICANTES = {
    alfaved: {
        nome: 'Alfaved',
        logo: 'AF',
        proprio: true,
        // Coeficientes empíricos (correlação Nusselt: Nu = C * Re^m * Pr^n)
        C: 0.28, m: 0.65, n: 0.40,
        // Fator de atrito: f = K * Re^(-p)
        K: 0.55, p: 0.25,
        // Fator de custo relativo (menor = mais barato)
        custoRel: 0.88,
        // Eficiência térmica relativa
        eficiencia: 1.05,
        // Limites operacionais
        maxTemp: 180, maxPressao: 25,
        descricao: 'Linha própria Alfaved — otimizada para o seu processo'
    },
    alfaLaval: {
        nome: 'Alfa Laval',
        logo: 'AL',
        proprio: false,
        C: 0.30, m: 0.62, n: 0.40,
        K: 0.60, p: 0.25,
        custoRel: 1.00,
        eficiencia: 1.00,
        maxTemp: 200, maxPressao: 30,
        descricao: 'Referência global em trocadores de placas'
    },
    gea: {
        nome: 'GEA',
        logo: 'GEA',
        proprio: false,
        C: 0.29, m: 0.63, n: 0.40,
        K: 0.58, p: 0.25,
        custoRel: 1.05,
        eficiencia: 1.02,
        maxTemp: 180, maxPressao: 25,
        descricao: 'Alta performance para grandes vazões'
    },
    danfoss: {
        nome: 'Danfoss',
        logo: 'DF',
        proprio: false,
        C: 0.27, m: 0.64, n: 0.40,
        K: 0.52, p: 0.25,
        custoRel: 0.95,
        eficiencia: 0.98,
        maxTemp: 160, maxPressao: 20,
        descricao: 'Soluções compactas para HVAC'
    },
    apv: {
        nome: 'APV',
        logo: 'APV',
        proprio: false,
        C: 0.31, m: 0.61, n: 0.40,
        K: 0.62, p: 0.25,
        custoRel: 1.02,
        eficiencia: 1.01,
        maxTemp: 190, maxPressao: 28,
        descricao: 'Tradição em processos alimentícios e químicos'
    }
};

// ===== PROPRIEDADES DOS FLUIDOS (valores típicos) =====
const FLUIDOS = {
    agua:   { rho: 995, cp: 4180, k: 0.62,  mu: 0.0008, nome: 'Água' },
    oleo:   { rho: 850, cp: 2100, k: 0.14,  mu: 0.010,  nome: 'Óleo térmico' },
    glicol: { rho: 1040, cp: 3600, k: 0.42, mu: 0.003,  nome: 'Glicol' },
    vapor:  { rho: 0.6, cp: 2010, k: 0.025, mu: 0.000012, nome: 'Vapor' }
};

// ===== FUNÇÃO PRINCIPAL DE DIMENSIONAMENTO =====
function dimensionar(dados) {
    const fQ = FLUIDOS[dados.fluidoQ];
    const fF = FLUIDOS[dados.fluidoF];

    // Vazão mássica (kg/s)
    const mQ = (dados.vazaoQ / 3600) * fQ.rho;
    const mF = (dados.vazaoF / 3600) * fF.rho;

    // Temperatura do lado frio (se automática, usa balanço de energia)
    let toutF = dados.toutF;
    if (!toutF || isNaN(toutF)) {
        // Balanço: mQ*cpQ*(TinQ-ToutQ) = mF*cpF*(ToutF-TinF)
        const Q = mQ * fQ.cp * (dados.tinQ - dados.toutQ);
        toutF = dados.tinF + Q / (mF * fF.cp);
    }

    // Calor trocado (W)
    const Q = mQ * fQ.cp * (dados.tinQ - dados.toutQ);

    // Diferença de temperatura média logarítmica (LMTD)
    const dT1 = dados.tinQ - toutF;
    const dT2 = dados.toutQ - dados.tinF;
    const lmtd = (dT1 - dT2) / Math.log(dT1 / dT2);

    // Resultados por fabricante
    const resultados = [];
    for (const [key, fab] of Object.entries(FABRICANTES)) {
        // Coeficiente global de transferência (W/m²·K) — estimado por correlação
        // U = f(eficiência do fabricante, fluidos)
        const Ubase = 2500; // W/m²·K típico para PHE água-água
        const U = Ubase * fab.eficiencia * (fQ.k / 0.62) * (fF.k / 0.62);

        // Área necessária (m²)
        const A = Q / (U * lmtd);

        // Aplicar margem de segurança
        const A_margem = A * (1 + dados.margem / 100);

        // Número de placas (estimativa: área por placa ~0.5 m²)
        const areaPorPlaca = 0.5;
        const numPlacas = Math.ceil(A_margem / areaPorPlaca);

        // Custo estimado
        const custo = A_margem * dados.preco * fab.custoRel;

        // Perda de carga estimada
        const dpCalc = 40 * (fab.K / 0.55); // kPa aproximado

        resultados.push({
            key: key,
            nome: fab.nome,
            logo: fab.logo,
            proprio: fab.proprio,
            descricao: fab.descricao,
            area: A_margem,
            numPlacas: numPlacas,
            custo: custo,
            dp: dpCalc,
            U: U,
            eficiencia: fab.eficiencia
        });
    }

    // Ordenar por área (melhor = menor)
    resultados.sort((a, b) => a.area - b.area);

    return {
        Q: Q,
        lmtd: lmtd,
        toutF: toutF,
        mQ: mQ, mF: mF,
        resultados: resultados
    };
}
