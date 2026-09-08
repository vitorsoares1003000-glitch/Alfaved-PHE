/**
 * BANCO DE DADOS DE FLUIDOS - Propriedades Thermofísicas
 * Correlações empíricas e tabelas de referência
 * Fontes: NIST, Engineering Toolbox, Perry's Handbook, Fabricantes
 */

const FLUID_DATABASE = {
  agua: {
    name: 'Água Destilada',
    group: 'Base',
    density: (T) => {
      const rho0 = 1000 * (1 - Math.pow(Math.abs(T - 4) / 622, 1.71));
      return Math.max(rho0, 800);
    },
    cp: (T) => 4182 + (T - 20) * (0.06 + 0.0008 * (T - 20)),
    mu: (T) => 2.414e-5 * Math.pow(10, 247.8 / (T + 273.15 - 140)),
    k: (T) => 0.57 + 0.0017 * (T - 20),
    defaultBrix: 0
  },

  etanol: {
    name: 'Etanol Puro',
    group: 'Álcool',
    concentration: 100,
    density: (T, C) => {
      const w = (C || 100) / 100;
      return 1000 * (1 - w) + 789 * w - 50 * w * (1 - w) - 0.8 * (T - 20);
    },
    cp: (T, C) => {
      const w = (C || 100) / 100;
      return 4182 * (1 - w) + 2430 * w + 5 * T;
    },
    mu: (T, C) => {
      const w = (C || 100) / 100;
      return Math.max(1e-3 * (1 + 2.2 * w) * Math.exp(-0.018 * (T - 20)), 1e-5);
    },
    k: (T, C) => {
      const w = (C || 100) / 100;
      return Math.max(0.57 * (1 - w) + 0.18 * w - 0.0001 * (T - 20), 0.15);
    },
    defaultBrix: 50
  },

  cerveja: {
    name: 'Cerveja',
    group: 'Bebida',
    density: (T) => 1010 - 0.3 * (T - 20),
    cp: (T) => 3950,
    mu: (T) => Math.max(1.6e-3 * Math.exp(-0.014 * (T - 20)), 1e-4),
    k: (T) => Math.max(0.57 + 0.0017 * (T - 20) - 0.03, 0.35),
    defaultBrix: 12
  },

  leite: {
    name: 'Leite Integral',
    group: 'Bebida',
    density: (T) => 1030 - 0.4 * (T - 20),
    cp: (T) => 3930,
    mu: (T) => Math.max(1.8e-3 * Math.exp(-0.012 * (T - 20)), 1e-4),
    k: (T) => Math.max(0.57 + 0.0017 * (T - 20) - 0.04, 0.4),
    defaultBrix: 0
  },

  vinho: {
    name: 'Vinho',
    group: 'Bebida',
    density: (T) => 990 - 0.5 * (T - 20),
    cp: (T) => 3880,
    mu: (T) => Math.max(1.4e-3 * Math.exp(-0.014 * (T - 20)), 1e-4),
    k: (T) => Math.max(0.57 + 0.0017 * (T - 20) - 0.02, 0.3),
    defaultBrix: 0
  },

  sacarose: {
    name: 'Calda de Açúcar (Sacarose)',
    group: 'Açúcar',
    density: (T, B) => {
      const b = (B || 0);
      return 1000 + 3.87 * b + 0.017 * b * b - 0.0063 * b * T;
    },
    cp: (T, B) => {
      const b = (B || 0);
      return Math.max(4182 - 45 * b + 0.5 * T, 2500);
    },
    mu: (T, B) => {
      const b = (B || 0);
      return 1e-3 * Math.pow(10, 0.05 * b) * Math.exp(-0.02 * (T - 20));
    },
    k: (T, B) => {
      const b = (B || 0);
      return Math.max(0.57 + 0.0017 * (T - 20) * (1 - 0.003 * b), 0.35);
    },
    defaultBrix: 20
  },

  suco_cana: {
    name: 'Suco de Cana',
    group: 'Açúcar',
    density: (T, B) => FLUID_DATABASE.sacarose.density(T, B || 16),
    cp: (T, B) => FLUID_DATABASE.sacarose.cp(T, B || 16),
    mu: (T, B) => FLUID_DATABASE.sacarose.mu(T, B || 16),
    k: (T, B) => FLUID_DATABASE.sacarose.k(T, B || 16),
    defaultBrix: 16
  },

  levedura_cana: {
    name: 'Levedura de Cana',
    group: 'Fermentação',
    density: (T, C) => {
      const w = (C || 25) / 100;
      const wt = FLUID_DATABASE.agua.density(T);
      return wt * (1 + 0.35 * w);
    },
    cp: (T, C) => {
      const w = (C || 25) / 100;
      const wt = FLUID_DATABASE.agua.cp(T);
      return wt * (1 - 0.35 * w) + 1500 * w;
    },
    mu: (T, C) => {
      const w = (C || 25) / 100;
      const wt = FLUID_DATABASE.agua.mu(T);
      return Math.max(wt * Math.exp(4.5 * w), 1e-4);
    },
    k: (T, C) => {
      const w = (C || 25) / 100;
      const wt = FLUID_DATABASE.agua.k(T);
      return Math.max(wt * (1 - 0.25 * w), 0.3);
    },
    defaultBrix: 25
  },

  oleo_vegetal: {
    name: 'Óleo Vegetal',
    group: 'Óleo',
    density: (T) => Math.max(920 - 0.7 * (T - 20), 850),
    cp: (T) => 2000 + 2 * T,
    mu: (T) => Math.max(0.05 * Math.exp(-0.02 * (T - 20)), 0.001),
    k: (T) => Math.max(0.17 - 0.0001 * (T - 20), 0.1),
    defaultBrix: 0
  },

  sae10: {
    name: 'Óleo SAE 10',
    group: 'Óleo',
    density: (T) => Math.max(880 - 0.6 * (T - 20), 820),
    cp: (T) => 1880 + 2 * T,
    mu: (T) => Math.max(0.05 * Math.exp(-0.025 * (T - 40)), 0.005),
    k: (T) => Math.max(0.14 - 0.0001 * (T - 20), 0.1),
    defaultBrix: 0
  },

  sae30: {
    name: 'Óleo SAE 30',
    group: 'Óleo',
    density: (T) => Math.max(880 - 0.6 * (T - 20), 820),
    cp: (T) => 1880 + 2 * T,
    mu: (T) => Math.max(0.095 * Math.exp(-0.025 * (T - 40)), 0.005),
    k: (T) => Math.max(0.14 - 0.0001 * (T - 20), 0.1),
    defaultBrix: 0
  },

  hydrodrive32: {
    name: 'Hydro Drive NS32',
    group: 'Óleo Hidráulico',
    density: (T) => Math.max(875 - 0.6 * (T - 15), 820),
    cp: (T) => 1880 + 2 * T,
    mu: (T) => Math.max(0.028 * Math.exp(-0.025 * (T - 40)), 0.004),
    k: (T) => Math.max(0.14 - 0.0001 * (T - 20), 0.1),
    defaultBrix: 0
  },

  glicol20: {
    name: 'Glicol 20%',
    group: 'Anticongelante',
    concentration: 20,
    density: (T, C) => {
      const w = (C || 20) / 100;
      const wt = FLUID_DATABASE.agua.density(T);
      return wt * (1 - w) + (1113 - 0.64 * (T - 20)) * w;
    },
    cp: (T, C) => {
      const w = (C || 20) / 100;
      const wt = FLUID_DATABASE.agua.cp(T);
      return wt * (1 - w) + (2350 + 3.8 * T) * w;
    },
    mu: (T, C) => {
      const w = (C || 20) / 100;
      const wt = FLUID_DATABASE.agua.mu(T);
      const muGl = 0.021 * Math.exp(-(T - 20) / 25);
      return Math.max(Math.exp((1 - w) * Math.log(wt) + w * Math.log(muGl)), 1e-4);
    },
    k: (T, C) => {
      const w = (C || 20) / 100;
      const wt = FLUID_DATABASE.agua.k(T);
      return Math.max(wt * (1 - 0.2 * w), 0.35);
    },
    defaultBrix: 0
  },

  glicol30: {
    name: 'Glicol 30%',
    group: 'Anticongelante',
    concentration: 30,
    density: (T, C) => FLUID_DATABASE.glicol20.density(T, C || 30),
    cp: (T, C) => FLUID_DATABASE.glicol20.cp(T, C || 30),
    mu: (T, C) => FLUID_DATABASE.glicol20.mu(T, C || 30),
    k: (T, C) => FLUID_DATABASE.glicol20.k(T, C || 30),
    defaultBrix: 0
  },

  salmoura: {
    name: 'Salmoura (NaCl)',
    group: 'Salina',
    concentration: 10,
    density: (T, c) => 1000 + 700 * ((c || 10) / 100) - 0.5 * (T - 20),
    cp: (T, c) => 4182 - 480 * ((c || 10) / 100) + 0.3 * T,
    mu: (T, c) => {
      const w = (c || 10) / 100;
      return Math.max(1e-3 * (1 + 3 * w) * Math.exp(-0.02 * (T - 20)), 1e-5);
    },
    k: (T, c) => Math.max(0.57 - 0.15 * ((c || 10) / 100), 0.45),
    defaultBrix: 0
  }
};

const BRIX_DEFAULTS = {
  cerveja: 12, mosto: 12, vinho: 0, vinho_cana: 6, soft_drink: 6,
  leite: 0, oleo_vegetal: 0, sacarose: 20, suco_cana: 16,
  levedura_cana: 25, levedura_cerveja: 20, agua: 0, etanol: 50,
  salmoura: 10, sae10: 0, sae30: 0, hydrodrive32: 0, glicol20: 0, glicol30: 0
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FLUID_DATABASE, BRIX_DEFAULTS };
}
