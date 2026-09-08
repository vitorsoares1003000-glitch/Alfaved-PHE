/**
 * CONFIGURAÇÃO GLOBAL - AlfaVed PHE Dimensionador v2.0
 * Constantes, limites, correlações e padrões industriais
 * Baseado em: Martin (1996), Kumar (1984), API 662, TEMA
 * Referências: Alfa Laval, GEA, Sondex, SPX, APV
 */

const CONFIG = {
  // =====================
  // VERSÃO E METADADOS
  // =====================
  app: {
    name: 'AlfaVed PHE',
    version: '2.0.0',
    description: 'Dimensionador Profissional de Trocadores de Calor a Placas',
    author: 'AlfaVed Solucoes Industriais',
    storageVersion: '2.0'
  },

  // =====================
  // LIMITES OPERACIONAIS
  // =====================
  limits: {
    maxPlates: 400,
    minPlates: 2,
    maxChannels: 150,
    maxNozzleVelocity: 4.9,
    minChannelVelocity: 0.03,
    maxChannelVelocity: 1.0,
    maxPressureDropProduct: 80,
    maxPressureDropService: 100,
    minPressureDrop: 0.5,
    minFlow: 0.1,
    maxFlow: 5000,
    minTemp: -100,
    maxTemp: 300,
    minApproach: 2,
    maxApproach: 200
  },

  // =====================
  // CORRELAÇÕES THERMOFÍSICAS
  // =====================
  correlations: {
    martin: {
      45: {
        nu: { a: 0.122, b: 0.634, pr: 0.333 },
        f: { k: 24, m: -0.3 }
      },
      67: {
        nu: { a: 0.158, b: 0.620, pr: 0.333 },
        f: { k: 32, m: -0.35 }
      }
    },
    kumar: {
      nu: { C: 0.3, m: 0.65, n: 0.33 },
      f: { K: 1.8, m: -0.25 }
    },
    lowRe: {
      minNusselt: 20,
      reTransition: 2300
    },
    condensation: {
      minHeatTransfer: 500
    }
  },

  // =====================
  // FOULING (INCRUSTAÇÃO) - API 662
  // =====================
  fouling: {
    resistances: {
      agua: 0.0001,
      etanol: 0.00005,
      glicol20: 0.00008,
      glicol30: 0.00008,
      oleo_vegetal: 0.0001,
      sae10: 0.00015,
      sae30: 0.0002,
      hydrodrive32: 0.00012,
      cerveja: 0.0003,
      leite: 0.0004,
      vinho: 0.00025,
      soft_drink: 0.0003,
      sacarose: 0.0005,
      suco_cana: 0.0006,
      levedura_cana: 0.0008,
      levedura_cerveja: 0.0008,
      salmoura: 0.0002,
      ammonia: 0.00001,
      r134a: 0.00001,
      r410a: 0.00001,
      refrigerante: 0.00001,
      vapor: 0.0
    },
    designMargin: 10,
    minMargin: 5,
    maxMargin: 30
  },

  // =====================
  // PROPRIEDADES VAPOR
  // =====================
  steam: {
    saturation: {
      2: { Tsat: 120.2, hfg: 2202.0, rhoL: 943, kL: 0.686, muL: 2.32e-4 },
      3: { Tsat: 133.5, hfg: 2164.0, rhoL: 931, kL: 0.685, muL: 2.11e-4 },
      6: { Tsat: 158.8, hfg: 2088.0, rhoL: 908, kL: 0.683, muL: 1.78e-4 },
      10: { Tsat: 179.9, hfg: 2014.0, rhoL: 880, kL: 0.681, muL: 1.52e-4 }
    }
  },

  // =====================
  // REFRIGERANTES
  // =====================
  refrigerants: {
    R717: {
      name: 'Amônia (R-717)',
      props: {
        '-40': { rho: 682.1, mu: 1.944e-4, k: 0.628, cp: 4426 },
        '-20': { rho: 662.2, mu: 2.93e-4, k: 0.596, cp: 4515 },
        '0': { rho: 639.4, mu: 2.52e-4, k: 0.567, cp: 4610 },
        '20': { rho: 610.3, mu: 2.2e-4, k: 0.540, cp: 4722 },
        '40': { rho: 580.2, mu: 1.95e-4, k: 0.514, cp: 4852 }
      }
    },
    R134a: {
      name: 'R-134a',
      props: {
        '-40': { rho: 1387.0, mu: 4.81e-4, k: 0.111, cp: 1247 },
        '-20': { rho: 1332.0, mu: 3.71e-4, k: 0.100, cp: 1300 },
        '0': { rho: 1273.0, mu: 2.97e-4, k: 0.090, cp: 1358 },
        '20': { rho: 1210.0, mu: 2.43e-4, k: 0.080, cp: 1427 },
        '40': { rho: 1142.0, mu: 2.02e-4, k: 0.071, cp: 1512 }
      }
    },
    R410A: {
      name: 'R-410A',
      props: {
        '-40': { rho: 1230.0, mu: 2.6e-4, k: 0.105, cp: 1421 },
        '-20': { rho: 1172.0, mu: 2.09e-4, k: 0.097, cp: 1482 },
        '0': { rho: 1106.0, mu: 1.72e-4, k: 0.089, cp: 1555 },
        '20': { rho: 1028.0, mu: 1.44e-4, k: 0.081, cp: 1646 },
        '40': { rho: 931.0, mu: 1.23e-4, k: 0.073, cp: 1765 }
      }
    }
  },

  refrigerantEfficiency: {
    ammonia: 0.85,
    refrigerante: 0.85,
    r134a: 0.90,
    r410a: 0.88
  },

  // =====================
  // WALL SHEAR
  // =====================
  wallShear: {
    fluoLimpo: 0,
    fluoIncrustante: 50,
    vaporLimpo: 0,
    fluoIncrustantes: [
      'leite', 'cerveja', 'mosto', 'vinho', 'vinho_cana',
      'soft_drink', 'sacarose', 'suco_cana', 'levedura_cana',
      'levedura_cerveja', 'oleo_vegetal'
    ]
  },

  // =====================
  // SEGURANÇA HIDRÁULICA
  // =====================
  hydraulic: {
    waterFlowFactor: 1.2,
    minVelForNusselt: 0.005,
    portLossFactor: 1.3
  },

  // =====================
  // PASSES AUTOMÁTICOS
  // =====================
  autoPassConfigurations: [
    { prod: 1, serv: 1 },
    { prod: 2, serv: 2 },
    { prod: 1, serv: 2 },
    { prod: 2, serv: 1 },
    { prod: 3, serv: 3 }
  ],

  // =====================
  // CORES DE INTERFACE
  // =====================
  colors: {
    primary: '#1a3a5c',
    success: '#2d9e4a',
    warning: '#f0a830',
    danger: '#cc3300',
    info: '#38bdf8',
    servicos: {
      vapor: '#f59e0b',
      agua: '#3b82f6',
      glicol20: '#06b6d4',
      glicol30: '#0891b2',
      salmoura: '#0ea5e9',
      refrigerante: '#8b5cf6',
      ammonia: '#8b5cf6',
      r134a: '#a855f7',
      r410a: '#d946ef'
    }
  },

  // =====================
  // MODO DIAGNÓSTICO
  // =====================
  diagnostics: {
    enabled: true,
    maxLogEntries: 1000,
    logLevels: ['DEBUG', 'INFO', 'WARN', 'ERROR']
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
