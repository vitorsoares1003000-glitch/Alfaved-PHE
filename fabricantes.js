// ============================================================
// FABRICANTES.JS — Banco de dados de fabricantes e placas
// ------------------------------------------------------------
// ATENÇÃO: os valores abaixo são REPRESENTATIVOS (baseados em
// correlações públicas de trocadores de placas chevron).
// Calibre com os catálogos oficiais de cada fabricante antes
// de uso comercial.
// ============================================================

const FABRICANTES = [
  {
    id: 'alfaved',
    nome: 'Alfaved',
    destaque: true,
    cor: '#e05a2b',
    fator_desempenho: 1.00, // multiplicador do coeficiente de convecção (Nu)
    fator_atrito: 1.00,     // multiplicador do fator de atrito
    fator_custo: 1.00,      // multiplicador do custo por m²
    placas: [
      { modelo: 'AV-08', area: 0.08, gap_mm: 2.6, largura_m: 0.14, comprimento_m: 0.56, chevron: 45, porto_mm: 50, material: 'AISI 316L' },
      { modelo: 'AV-15', area: 0.15, gap_mm: 3.0, largura_m: 0.19, comprimento_m: 0.78, chevron: 45, porto_mm: 65, material: 'AISI 316L' },
      { modelo: 'AV-25', area: 0.25, gap_mm: 3.2, largura_m: 0.25, comprimento_m: 1.00, chevron: 60, porto_mm: 80, material: 'AISI 316L' },
      { modelo: 'AV-50', area: 0.50, gap_mm: 3.6, largura_m: 0.35, comprimento_m: 1.40, chevron: 60, porto_mm: 100, material: 'AISI 316L' }
    ]
  },
  {
    id: 'alfalaval',
    nome: 'Alfa Laval',
    destaque: false,
    cor: '#1a5fa8',
    fator_desempenho: 1.04,
    fator_atrito: 1.06,
    fator_custo: 1.10,
    placas: [
      { modelo: 'M6',  area: 0.06, gap_mm: 2.6, largura_m: 0.13, comprimento_m: 0.50, chevron: 45, porto_mm: 50, material: 'AISI 316L' },
      { modelo: 'M10', area: 0.10, gap_mm: 2.8, largura_m: 0.16, comprimento_m: 0.66, chevron: 45, porto_mm: 60, material: 'AISI 316L' },
      { modelo: 'M15', area: 0.15, gap_mm: 3.0, largura_m: 0.19, comprimento_m: 0.78, chevron: 45, porto_mm: 65, material: 'AISI 316L' },
      { modelo: 'M20', area: 0.20, gap_mm: 3.2, largura_m: 0.22, comprimento_m: 0.90, chevron: 60, porto_mm: 80, material: 'AISI 316L' }
    ]
  },
  {
    id: 'gea',
    nome: 'GEA',
    destaque: false,
    cor: '#0f7a5f',
    fator_desempenho: 0.98,
    fator_atrito: 1.08,
    fator_custo: 1.12,
    placas: [
      { modelo: 'NT50X',  area: 0.05, gap_mm: 2.6, largura_m: 0.13, comprimento_m: 0.44, chevron: 45, porto_mm: 50, material: 'AISI 316L' },
      { modelo: 'NT100X', area: 0.10, gap_mm: 2.8, largura_m: 0.16, comprimento_m: 0.66, chevron: 45, porto_mm: 60, material: 'AISI 316L' },
      { modelo: 'NT250X', area: 0.25, gap_mm: 3.2, largura_m: 0.25, comprimento_m: 1.00, chevron: 60, porto_mm: 80, material: 'AISI 316L' },
      { modelo: 'NT500X', area: 0.50, gap_mm: 3.6, largura_m: 0.35, comprimento_m: 1.40, chevron: 60, porto_mm: 100, material: 'AISI 316L' }
    ]
  },
  {
    id: 'danfoss',
    nome: 'Danfoss',
    destaque: false,
    cor: '#c0392b',
    fator_desempenho: 0.95,
    fator_atrito: 0.95,
    fator_custo: 0.92,
    placas: [
      { modelo: 'XB12', area: 0.12, gap_mm: 2.8, largura_m: 0.17, comprimento_m: 0.70, chevron: 45, porto_mm: 60, material: 'AISI 304' },
      { modelo: 'XB37', area: 0.37, gap_mm: 3.2, largura_m: 0.29, comprimento_m: 1.27, chevron: 60, porto_mm: 90, material: 'AISI 304' },
      { modelo: 'XB60', area: 0.60, gap_mm: 3.6, largura_m: 0.36, comprimento_m: 1.60, chevron: 60, porto_mm: 100, material: 'AISI 304' }
    ]
  },
  {
    id: 'apv',
    nome: 'APV',
    destaque: false,
    cor: '#6c4fa1',
    fator_desempenho: 0.99,
    fator_atrito: 1.02,
    fator_custo: 1.05,
    placas: [
      { modelo: 'SR3', area: 0.06, gap_mm: 2.6, largura_m: 0.13, comprimento_m: 0.50, chevron: 45, porto_mm: 50, material: 'AISI 316L' },
      { modelo: 'SR5', area: 0.10, gap_mm: 2.8, largura_m: 0.16, comprimento_m: 0.66, chevron: 45, porto_mm: 60, material: 'AISI 316L' },
      { modelo: 'HX7',  area: 0.20, gap_mm: 3.2, largura_m: 0.22, comprimento_m: 0.90, chevron: 60, porto_mm: 80, material: 'AISI 316L' }
    ]
  }
];
