// ===== DADOS DOS FABRICANTES =====
const FABRICANTES = {
    alfaved: {
        nome: 'Alfaved',
        logo: 'AF',
        proprio: true,
        C: 0.28, m: 0.65, n: 0.40,
        K: 0.55, p: 0.25,
        custoRel: 0.88,
        eficiencia: 1.05,
        maxTemp: 180, maxPressao: 25,
        descricao: 'Linha própria — otimizada para o seu processo',
        cor: '#e8731c'
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
        descricao: 'Referência global em PHE',
        cor: '#1d5aa8'
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
        descricao: 'Alta performance p/ grandes vazões',
        cor: '#123a6b'
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
        descricao: 'Soluções compactas para HVAC',
        cor: '#2f7fd1'
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
        descricao: 'Tradição em processos alimentícios',
        cor: '#c85e10'
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
    for (const [key, fab] of Object.entries(FABRICANTES)) {
        const Ubase = 2500;
        const U = Ubase * fab.eficiencia * (fQ.k / 0.62) * (fF.k / 0.62);
        const A = Q / (U * lmtd);
        const A_margem = A * (1 + dados.margem / 100);
        const areaPorPlaca = 0.5;
        const numPlacas = Math.ceil(A_margem / areaPorPlaca);
        const custo = A_margem * dados.preco * fab.custoRel;
        const dpCalc = 40 * (fab.K / 0.55);

        resultados.push({
            key, nome: fab.nome, logo: fab.logo, proprio: fab.proprio,
            descricao: fab.descricao, cor: fab.cor,
            area: A_margem, numPlacas, custo, dp: dpCalc, U,
            eficiencia: fab.eficiencia
        });
    }

    resultados.sort((a, b) => a.area - b.area);

    return { Q, lmtd, toutF, mQ, mF, resultados };
}
