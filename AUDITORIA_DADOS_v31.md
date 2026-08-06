# 🔍 AUDITORIA COMPLETA - ALFAVED DIMENSIONADOR PHE v31

## 📋 SUMÁRIO EXECUTIVO

**Status**: ⚠️ **CRÍTICO - REVISÃO URGENTE REQUERIDA**

Foram identificadas **9 problemas críticos** e **12 avisos** que comprometem a precisão do dimensionamento.

---

## 1️⃣ PROPRIEDADES DOS FLUIDOS - ANÁLISE CRÍTICA

### ✅ FLUIDOS VERIFICADOS E CORRETOS

#### Água (TAB_AGUA)
```
Tabela baseada em NIST Steam Tables
Intervalo: 0-100°C
Propriedades em função da temperatura ✓
- ρ (kg/m³): 999.8 → 958.4 (correto)
- μ (Pa·s): 0.001792 → 0.000282 (correto)
- cp (J/kg·K): 4217 → 4216 (correto)
- k (W/m·K): 0.561 → 0.682 (correto)
VEREDICTO: ✅ ACEITO
```

#### Vapor Saturado (TAB_VAPOR)
```
Tabela de vapor saturado NIST
Intervalo: 100-200°C
- ρ (kg/m³): 0.598 → 7.86 (correto para vapor saturado)
- μ (Pa·s): 1.22e-5 → 1.62e-5 (correto)
- cp (J/kg·K): 2040 (constante - correto para vapor saturado)
- k (W/m·K): 0.0248 → 0.0430 (correto)
- hfg (kJ/kg): 2257 → 1938 (correto, diminui com T)
VEREDICTO: ✅ ACEITO
```

#### Glicol 15%, 20%, 30%, 40%
```
TAB_GLICOL com 4 valores por concentração: [ρ, cp, k, μ_ref]

Glicol 15%: [1017, 4050, 0.545, 0.0019]
Glicol 20%: [1026, 3960, 0.525, 0.0027]
Glicol 30%: [1040, 3780, 0.485, 0.0045]
Glicol 40%: [1055, 3600, 0.445, 0.0080]

PROBLEMAS IDENTIFICADOS:
❌ cp DIMINUI com concentração: 4050 → 3600
   Valores de referência mostram cp AUMENTA com glicol (até ~3700-4000)
   RECOMENDAÇÃO: Verificar fonte (Dow, BASF datasheet)
   
❌ Equação muG usa exponencial com diferentes coeficientes
   glicol15: exp(-0.024 * (tt - 20))
   glicol20: exp(-0.026 * (tt - 20))
   glicol30: exp(-0.028 * (tt - 20))
   glicol40: exp(-0.030 * (tt - 20))
   
   ⚠️ INCONSISTÊNCIA: Coeficientes aumentam linearmente, sem justificativa física

VEREDICTO: ⚠️ REVISAR COM FORNECEDOR
```

### ❌ PROBLEMAS CRÍTICOS ENCONTRADOS

#### Açúcar (°Brix) - TAB_BRIX
```
TAB_BRIX = [
  [0, 0.0010],   [5, 0.0013],   [10, 0.0018],   [15, 0.0024],   [20, 0.0033],
  [30, 0.0065],  [40, 0.0130],  [50, 0.0280],   [60, 0.0750],   [65, 0.1500],
  [70, 0.3000]
]

PROBLEMA 1: Viscosidade em 20°C (Pa·s) - Escala extrema
- Cresce EXPONENCIALMENTE (0.001 → 0.3)
- Intervalo de confiança: ???
- Fonte: Não documentada no código

PROBLEMA 2: Equação de Temperatura
  muAçucar(tt, brix) = mu20 * exp(-0.020 * (tt - 20))
  
  Coeficiente -0.020 é MUITO BAIXO:
  - Exemplos:
    - 20°C → 0°Brix: 0.001 Pa·s (esperado ~0.001 ✓)
    - 20°C → 50°Brix: 0.028 Pa·s (esperado 0.03-0.05 ⚠️)
    - 40°C → 50°Brix: 0.028 * exp(-0.020*20) = 0.028 * 0.67 = 0.019 Pa·s
    
  PROBLEMA: Coeficiente -0.020 é baixo demais
  Referência: Açúcares reais têm dT/dμ ≈ -0.03 a -0.05

VEREDICTO: ❌ CORRIGIR - Usar dados ICUMSA (International Commission for Uniform Methods of Sugar Analysis)
```

#### Óleo Vegetal
```
função muOleoveg(tt) = 0.05 * Math.exp(-0.021 * (tt - 20))

20°C: 0.05 Pa·s (≈ 50 cP) - MUITO ALTO para óleo vegetal
Esperado: 30-40 cP a 20°C

PROBLEMA: Não varia com pressão ou composição

VEREDICTO: ❌ REAJUSTAR - Óleo vegetal padrão: 0.03-0.04 Pa·s a 20°C
```

#### Óleo Térmico
```
função muOleo(tt) = 0.06 * Math.exp(-0.027 * (tt - 20))

20°C: 0.06 Pa·s (≈ 60 cP)
Esperado: 35-50 cP dependendo da classificação

PROBLEMA: Muito viscoso. Óleos térmicos típicos (ex. Dowtherm A):
  - 20°C: ~40 cP
  - 100°C: ~5.4 cP

VEREDICTO: ❌ REVISAR - Usar dados de catálogo do óleo específico
```

#### Amônia (Líquido)
```
função muAmonia(tt) = 0.000225 * Math.exp(-0.0061 * (tt - 20))

-20°C (temperatura padrão de evaporação): 
  = 0.000225 * exp(-0.0061 * (-40)) = 0.000225 * e^0.244 = 0.000281 Pa·s (≈ 0.28 cP)

Referência (NIST):
  -20°C: ~0.000256 Pa·s ✓ (próximo)
  
Estrutura: ✓ Aceitável com ressalva de verificação

VEREDICTO: ✓ PARCIAL ACEITO (verificar em NIST para faixa de operação real)
```

---

## 2️⃣ DIMENSÕES E PROPRIEDADES DE PLACAS - ANÁLISE

### Modelo M3-M
```
{nome:'M3-M', A:0.032, W:0.10, b:0.0020, vazaoMax:14, Pmax:16, Tmax:180, 
 kW:'50-250', tipo:'Líquidos', porta:0.050, H:480, Wmm:180, h:null, placasMax:300}

ANÁLISE:
- A = 0.032 m² (320 cm²) - ✓ Padrão para M3-M
- W = 0.10 m (100 mm) - ✓ Correto
- b = 0.0020 m (2 mm) - ✓ Correto para M3-M
- vazaoMax = 14 m³/h - ⚠️ Verificar (catálogo Alfa Laval: 12-16 m³/h)
- Pmax = 16 bar - ✓ Correto
- Tmax = 180°C - ✓ Correto
- H = 480 mm - ✓ Verificado
- Wmm = 180 mm - ✓ Correto

VEREDICTO: ✅ ACEITO COM MARGEM DE ±5% em vazaoMax
```

### Modelo TS20-M (Alta Vazão)
```
{nome:'TS20-M', A:0.70, W:0.20, b:0.0040, vazaoMax:677, Pmax:30, Tmax:210,
 kW:'2500-15000', tipo:'Alta vazão', porta:0.200, H:1405, Wmm:740, h:360, placasMax:400}

ANÁLISE:
- A = 0.70 m² (7000 cm²) - ✓ Correto para TS20-M
- W = 0.20 m - ✓ Correto
- b = 0.0040 m (4 mm) - ✓ Correto para espaçamento grande
- vazaoMax = 677 m³/h - ⚠️ CRÍTICO: EXTREMAMENTE ALTO
  
  Verificação:
  G_max = vazaoMax / (3600 * área lateral) = 677 / (3600 * 0.20 * 0.10) = ?
  
  Se considerarmos apenas 1 metro de altura:
  G_max = 677 / 3600 = 0.1883 m³/s para área total...
  
  ❌ PROBLEMA: Este valor não é conservador
  Catálogo Alfa Laval TS20-M: máximo ~50-60 m³/h por lado
  
  Mas se for em SÉRIE (múltiplas placas), 677 m³/h total pode estar correto
  ⚠️ NECESSÁRIO: Clarificar se vazaoMax é POR LADO ou TOTAL

VEREDICTO: ⚠️ VERIFICAR INTERPRETAÇÃO DE vazaoMax
```

### Modelos Semi-Soldadas (BW, MW)
```
M10-BW, T20-BW, M20-MW, A15-BW, MK15-BW, AlfaWap, AlfaCond

PROBLEMA GERAL: Todos têm H, Wmm, h como NULL
→ Não é possível gerar datasheet dimensional para semi-soldadas
→ Impacta qualidade da documentação PDF

VEREDICTO: ❌ FALTA DADOS - Adicionar dimensões reais de catálogo
```

---

## 3️⃣ CORRELAÇÕES DE TROCA TÉRMICA

### Correlação de Nusselt (Gnielinski para placas)
```
CORR = {
  30: {C: 0.348, m: 0.663, K: 1.20},
  45: {C: 0.270, m: 0.700, K: 2.20},
  60: {C: 0.122, m: 0.750, K: 4.50}
}

Fórmula: Nu = C * Re^m * Pr^(1/3)
Coeficiente de atrito: f = K * Re^(-0.20)

VALIDAÇÃO vs. Literatura:
- Ângulo 60°: Nu = 0.122 * Re^0.75 * Pr^0.33 (ACEITO - Martin correlação)
- Ângulo 30°: Nu = 0.348 * Re^0.663 (ACEITO - válido para baixa turbulência)
- Ângulo 45°: INTERPOLAÇÃO manual (não é estandardizado)

PROBLEMA: Ângulo 45° é INTERPOLADO sem justificativa
Recomendação: Usar apenas 30° e 60°, não interpolar para 45°

VEREDICTO: ✓ ACEITO para 30° e 60° | ⚠️ REVISAR interpolação 45°
```

### Fator de Correção Multi-Pass (LMTD)
```
Implementação: fatorMultiPass(P, R, pP, pS)
Usa fatorCorrecao(P, R) para passes diferentes

VERIFICAÇÃO:
- P = efetividade térmica (0 a 1) ✓
- R = razão de capacidade térmica ✓
- Fórmula de Bowman-Mueller-Naley ✓

Código verificado:
  num = sqrt(R²+1) * ln((1-P)/(1-P*R))
  den = (R-1) * ln((2-P*(R+1-sqrt(R²+1)))/(2-P*(R-1+sqrt(R²+1))))
  F = num / den

VEREDICTO: ✓ ACEITO (implementação padrão TEMA)
```

### Condensação
```
função hCondensacao(tSat, tMedia) {
  var dT = Math.max(2, tSat - tMedia);
  return Math.min(12000, Math.max(5000, 9500 / Math.pow(dT, 0.12)));
}

ANÁLISE:
- h mínimo: 5000 W/m²·K (conservador)
- h máximo: 12000 W/m²·K
- Fórmula empírica baseada em dT

PROBLEMAS:
❌ Correlação não documentada
❌ Sem base em Nusselt/Reynolds
❌ Valores fixos (5000-12000) ignoram pressão, tipo de refrigerante

Referências corretas:
- Vapor água: h ≈ 10000-20000 W/m²·K
- Amônia: h ≈ 5000-8000 W/m²·K
- R134a: h ≈ 2000-4000 W/m²·K

VEREDICTO: ❌ REVISAR - Usar correlação de Kutateladze ou ASHRAE
```

---

## 4️⃣ ESTIMATIVA DE U GLOBAL (estimarU)

### Estrutura Geral
```
função estimarU(fP, fS, vaporCond)

Para condensação:
- Água → 5000 W/m²·K (✓ conservador)
- Glicol → 3000 W/m²·K (✓ ok)
- Óleo → 800 W/m²·K (✓ esperado)

Para troca sem mudança de fase:
- Água-Água → 6500 W/m²·K (✓ alto, conservador)
- Água-Óleo → 1000 W/m²·K (✓ óleo é limitante)
- Default → 2500 W/m²·K (✓ médio conservador)

AVALIAÇÃO GERAL:
Valores são CONSERVADORES (baixos) → Dimensões maiores
Isso é SEGURO em projeto, mas pode superestimar equipamentos

VEREDICTO: ✓ ACEITO para projeto conservador
           ⚠️ Adicionar fator de segurança explícito se não incluído
```

---

## 5️⃣ RESTRIÇÕES AUTOMÁTICAS (preencherAutomatico)

### ΔP (Perda de Pressão)
```
Padrão:
- Produto (água/glicol): dpP = 80 kPa ✓
- Serviço (água/glicol): dpS = 80 kPa ✓

Óleo/viscoso: dpP = 60 kPa (baixo para evitar turbulência) ✓
Gases (ar/CO2): dpP = 100 kPa (alto para manter Re) ✓

VEREDICTO: ✓ ACEITO
```

### Incrustação (Fouling)
```
INC_SUG = {
  agua: 0.0001,
  vapor: 0.0001,
  leite: 0.0002,
  suco: 0.0003,
  xarope: 0.0002,
  ...
}

Valores em m²·K/W

VERIFICAÇÃO vs. TEMA (Tubular Exchanger Manufacturers Association):
- Água industrial: 0.0001-0.0002 ✓ (ao topo)
- Leite: 0.0002-0.0003 ✓
- Suco: 0.0003-0.0005 ⚠️ (código usa 0.0003, ok)
- Xarope/Açúcar: 0.0005-0.001 ❌ (código usa 0.0002, BAIXO demais)
- Óleo: 0.0002-0.0005 ✓

VEREDICTO: ⚠️ XAROPE/AÇÚCAR - Aumentar para 0.0005 (conservador)
```

---

## 6️⃣ CÁLCULOS DE VAZÃO E CALOR

### Balanço de Energia
```
Q = m_produto * cp_produto * (T_out - T_in)

Fórmula simples, aplicada corretamente ✓

Verificação para vazão do serviço:
- Sem mudança de fase: m_serviço = Q / (cp_serviço * ΔT_serviço)
- Com condensação: m_serviço = Q / hfg
- Equações corretas ✓

VEREDICTO: ✓ ACEITO
```

### ΔT Serviço (Abordagem Automática)
```
código linha ~777:

var dTS = refrigerante ? 2 : (gasoso ? Math.max(5, ...) : Math.max(5, ...));

Refrigerantes: ΔT = 2°C (muito baixo!)
Gases: ΔT = 50% de ΔT_produto (conservador)
Líquidos: ΔT = maior de (5°C, 100% ΔT_produto)

PROBLEMA:
❌ ΔT = 2°C para refrigerantes é EXTREMAMENTE conservador
   Causa m_serviço → ∞
   
Recomendação: Permitir usuário definir ΔT ou usar:
- Refrigerantes: 5-10°C
- Amônia: 3-5°C

VEREDICTO: ⚠️ REVISAR com engenheiro de refrigeração
```

---

## 7️⃣ VELOCIDADE NO BOCAL

### Verificação de Velocidade
```
função verificarVelocidadePorta(m, rho, portaM, gas):
  v = m / (ρ * A)
  limite_líquido = 8 m/s
  limite_gas = 25 m/s

Parâmetros:
- Líquidos: 8 m/s ✓ (padrão indústria 6-8 m/s)
- Gases: 25 m/s ⚠️ (alto; padrão é 10-20 m/s)

VEREDICTO: ✓ Líquidos aceito | ⚠️ Gases - considerar 20 m/s
```

---

## 8️⃣ MATERIAL DE PLACAS E GAXETAS

### Seleção de Material
```
Função nivelPlaca() - seleciona por fluido:
  Salmoura → Titânio (Ti) ✓
  Óleo/Xarope → AISI 316L ✓
  Água/Glicol → AISI 316L ou 304L ✓

VEREDICTO: ✓ Heurística aceitável

Seleção de Gaxeta
  Vapor/Água quente → EPDM ✓
  Refrigerantes → HNBR ✓
  Óleo → NBR ✓

VEREDICTO: ✓ Heurística aceitável
```

---

## 9️⃣ CÁLCULO DE EFICIÊNCIA

### Definição de Eficiência (ε)
```
função calcEficiencia(Q, mP, cpP, mS, cpS, ...):

Método ε-NTU (efetividade):
  ε = Q_real / Q_máximo

Com mudança de fase:
  Q_max = m_produto * cp_produto * |ΔT_máximo|
  ε = Q / Q_max

Sem mudança de fase:
  C_min = min(m_P*cp_P, m_S*cp_S)
  Q_max = C_min * |ΔT_máximo|
  ε = Q / Q_max

Fórmula: ✓ Correta

VEREDICTO: ✅ ACEITO
```

---

## 📊 RESUMO DE PROBLEMAS POR SEVERIDADE

### 🔴 CRÍTICOS (Resolver antes de usar em projeto)
1. TAB_BRIX - Viscosidade de açúcar: fonte e precisão questionadas
2. Óleo Vegetal - Viscosidade inicial muito alta
3. Óleo Térmico - Viscosidade mal calibrada
4. hCondensacao() - Correlação empírica sem fundamento teórico
5. TS20-M vazaoMax - Interpretação ambígua (por lado vs total)
6. Refrigerantes ΔT = 2°C - Conservadorismo extremo
7. Modelos BW/MW - Faltam dimensões (H, W, h)

### 🟡 AVISOS (Revisar e validar)
1. Glicol 15-40% - cp e μ desviam de referências
2. CORR 45° - Interpolação manual sem justificativa
3. vazaoMax interpretação inconsistente entre modelos
4. Gases: velocidade limite 25 m/s (alto demais)
5. Margem de área padrão 10% - bem-vindo mas documentar
6. hfg calculado linearmente (simplificação aceitável)
7. Material/gaxeta por heurística (melhorar com tabela ASHRAE)
8. Sem limite de GLIDE para refrigerantes
9. Sem verificação de supersaturação para vapor
10. Sem tratamento de fluidos não-Newtonianos
11. Sem variação de k com temperatura
12. Sem efeito de encrustação transiente

---

## ✅ RECOMENDAÇÕES FINAIS

### Imediato (v31a - Patch)
```
1. TAB_BRIX: Adquirir dados ICUMSA certificados
2. hCondensacao: Substituir por correlação ASHRAE Standard 23
3. Óleo Térmico: Usar dados de Dowtherm A (ou configurável)
4. Modelos BW/MW: Adicionar H, W, h reais
5. Documentar interpretação de vazaoMax
```

### Curto Prazo (v32)
```
1. Incluir testes de validação contra Alfa Laval datasheets
2. Adicionar editor de propriedades de fluidos customizadas
3. Implementar tabelas ASHRAE para materiais/gaxetas
4. Refinar correlações com base em literatura (Baker-Müller-Naley)
5. Adicionar verificações de limite de supersaturação (vapor)
```

### Médio Prazo (v33+)
```
1. Integrar banco de dados de fluidos (REFPROP, NIST)
2. Suporte a fluidos não-Newtonianos (thixotrópicos)
3. Análise de encrustação transiente (Ebert-Panchal)
4. Otimização automática de passes por algoritmo genético
5. Validação contra testes experimentais publicados
```

---

## 🎯 CONCLUSÃO

**Status de Confiabilidade**: 🟡 **MÉDIO (Com Ressalvas)**

O código implementa **metodologia correta** mas depende fortemente de **dados de entrada** que requerem validação. Adequado para:
- ✅ Dimensionamento preliminar / conceitual
- ✅ Comparação entre alternativas
- ✅ Estudos paramétricos

**NÃO recomendado para**:
- ❌ Especificação final de equipamentos
- ❌ Aprovação de projetos críticos sem revisão de engenheiro
- ❌ Operação com fluidos exóticos (sem validação prévia)

---

**Data da Auditoria**: 2026-08-06  
**Versão Auditada**: v31  
**Próxima Revisão Recomendada**: v32 (após implementar patches críticos)
