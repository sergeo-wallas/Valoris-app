export interface FinancialStatement {
  fiscal_year:     number
  revenue:         number | null
  ebitda:          number | null
  ebit:            number | null
  net_income:      number | null
  tax_rate:        number | null
  equity:          number | null
  net_debt:        number | null
  capex:           number | null
  delta_wc:        number | null
  working_capital: number | null
  fcf:             number | null
}

export interface DCFParams {
  wacc:                 number
  terminal_growth_rate: number
  projection_years:     number
}

/** Hypothèses de projection — si fournies, overrident les moyennes historiques */
export interface DCFHypotheses {
  revenueGrowth?: number   // CAGR CA projeté (ex: 0.05 = 5%)
  ebitdaMargin?:  number   // Marge EBITDA cible (ex: 0.15 = 15%)
  ebitMargin?:    number   // Marge EBIT cible (ex: 0.10 = 10%)
  capexRatio?:    number   // Capex / CA (ex: 0.03 = 3%)
  bfrRatio?:      number   // BFR / CA (ex: 0.20 = 20%)
  taxRate?:       number   // Taux IS (ex: 0.25 = 25%)
}

/** Calcule le FCF historique depuis les données d'un exercice
 *  Formule : EBITDA - EBIT×t - Capex - ΔBFR  (D&A tax shield inclus)
 *  Fallback : EBITDA×(1-t) ou EBIT×(1-t) si données partielles */
function computeBaseFCF(f: FinancialStatement): number {
  // FCF déjà calculé et sauvegardé → priorité
  if (f.fcf != null) return f.fcf

  const t    = f.tax_rate ?? 0.25
  const capex = f.capex    ?? 0
  const dwc   = f.delta_wc ?? 0

  if (f.ebitda != null && f.ebit != null)
    return f.ebitda - f.ebit * t - capex - dwc

  if (f.ebitda != null)
    return f.ebitda * (1 - t) - capex - dwc

  if (f.ebit != null)
    return f.ebit * (1 - t) - capex - dwc

  return 0
}

export function calculateDCF(financials: FinancialStatement[], params: DCFParams, hyp?: DCFHypotheses) {
  const sorted = [...financials].sort((a, b) => a.fiscal_year - b.fiscal_year)
  const latest = sorted[sorted.length - 1]
  const oldest = sorted[0]

  const t = latest.tax_rate ?? 0.25

  // ── 1. FCF de référence (dernière année) ────────────────────────────────
  const baseFCF = computeBaseFCF(latest)

  // ── 2. CAGR du chiffre d'affaires (historique) ──────────────────────────
  const nYears = latest.fiscal_year - oldest.fiscal_year
  const cagr = nYears > 0 && oldest.revenue && latest.revenue && oldest.revenue > 0
    ? Math.pow(latest.revenue / oldest.revenue, 1 / nYears) - 1
    : 0.05  // défaut 5% si une seule année

  // ── 3. Marges moyennes sur l'historique (pour projeter de façon stable) ─
  const yearsWithData = sorted.filter(f => f.revenue && f.revenue > 0)

  const avgEbitdaMargin = yearsWithData.length > 0 && yearsWithData.every(f => f.ebitda != null)
    ? yearsWithData.reduce((s, f) => s + f.ebitda! / f.revenue!, 0) / yearsWithData.length
    : (latest.ebitda && latest.revenue ? latest.ebitda / latest.revenue : null)

  const avgEbitMargin = yearsWithData.length > 0 && yearsWithData.every(f => f.ebit != null)
    ? yearsWithData.reduce((s, f) => s + f.ebit! / f.revenue!, 0) / yearsWithData.length
    : (latest.ebit && latest.revenue ? latest.ebit / latest.revenue : null)

  const avgCapexRatio = yearsWithData.length > 0 && yearsWithData.every(f => f.capex != null)
    ? yearsWithData.reduce((s, f) => s + f.capex! / f.revenue!, 0) / yearsWithData.length
    : (latest.capex && latest.revenue ? latest.capex / latest.revenue : 0)

  const avgBfrRatio = yearsWithData.length > 0 && yearsWithData.every(f => f.working_capital != null)
    ? yearsWithData.reduce((s, f) => s + f.working_capital! / f.revenue!, 0) / yearsWithData.length
    : null

  // ── 4. Hypothèses finales (override si fournies) ────────────────────────
  const growthRate    = hyp?.revenueGrowth  ?? cagr
  const ebitdaMargin  = hyp?.ebitdaMargin   ?? avgEbitdaMargin
  const ebitMargin    = hyp?.ebitMargin     ?? avgEbitMargin
  const capexRatio    = hyp?.capexRatio     ?? avgCapexRatio
  const bfrRatio      = hyp?.bfrRatio       ?? avgBfrRatio
  const taxRateHyp    = hyp?.taxRate        ?? t

  // ── 5. Projection des FCF sur N années ──────────────────────────────────
  const projectedFCFs: number[] = []
  let prevBfr = latest.working_capital ?? null

  for (let i = 1; i <= params.projection_years; i++) {
    const projRevenue = (latest.revenue ?? 0) * Math.pow(1 + growthRate, i)

    const projEbitda = ebitdaMargin != null
      ? projRevenue * ebitdaMargin
      : baseFCF * Math.pow(1 + growthRate, i) / (1 - taxRateHyp)

    const projEbit = ebitMargin != null ? projRevenue * ebitMargin : null

    const projCapex = projRevenue * capexRatio

    let projDeltaWc = 0
    if (bfrRatio != null) {
      const projBfr = projRevenue * bfrRatio
      projDeltaWc = prevBfr != null ? projBfr - prevBfr : 0
      prevBfr = projBfr
    }

    let fcf: number
    if (projEbitda != null && projEbit != null)
      fcf = projEbitda - projEbit * taxRateHyp - projCapex - projDeltaWc
    else if (projEbitda != null)
      fcf = projEbitda * (1 - taxRateHyp) - projCapex - projDeltaWc
    else
      fcf = baseFCF * Math.pow(1 + growthRate, i)

    projectedFCFs.push(fcf)
  }

  // ── 6. Actualisation des FCF au WACC ────────────────────────────────────
  const pvFCFs = projectedFCFs.map((fcf, i) =>
    fcf / Math.pow(1 + params.wacc, i + 1)
  )
  const sumPVFCF = pvFCFs.reduce((a, b) => a + b, 0)

  // ── 7. Valeur terminale (Gordon-Shapiro) ────────────────────────────────
  const lastFCF = projectedFCFs[projectedFCFs.length - 1]
  const terminalValue = lastFCF * (1 + params.terminal_growth_rate)
    / (params.wacc - params.terminal_growth_rate)

  // ── 8. Actualisation de la valeur terminale ─────────────────────────────
  const pvTerminalValue = terminalValue
    / Math.pow(1 + params.wacc, params.projection_years)

  // ── 9. Enterprise Value = PV FCFs + PV Valeur terminale ─────────────────
  const enterpriseValue = sumPVFCF + pvTerminalValue

  // ── 10. Equity Value = EV - Dette nette ─────────────────────────────────
  const equityValue = enterpriseValue - (latest.net_debt ?? 0)

  // ── 11. Multiple EV/EBITDA ──────────────────────────────────────────────
  const evEbitda = latest.ebitda && latest.ebitda > 0
    ? Math.round(enterpriseValue / latest.ebitda * 10) / 10
    : null

  const r = (n: number) => Math.round(n)

  return {
    baseFCF:         r(baseFCF),
    cagr:            Math.round(cagr * 1000) / 10,   // en %
    avgEbitdaMargin: avgEbitdaMargin != null ? Math.round(avgEbitdaMargin * 1000) / 10 : null,
    projectedFCFs:   projectedFCFs.map(r),
    pvFCFs:          pvFCFs.map(r),
    sumPVFCF:        r(sumPVFCF),
    terminalValue:   r(terminalValue),
    pvTerminalValue: r(pvTerminalValue),
    enterpriseValue: r(enterpriseValue),
    equityValue:     r(equityValue),
    evEbitda,
    // Hypothèses effectives (pour pré-remplir les sliders)
    effectiveHyp: {
      revenueGrowth: growthRate,
      ebitdaMargin:  ebitdaMargin,
      ebitMargin:    ebitMargin,
      capexRatio:    capexRatio,
      bfrRatio:      bfrRatio,
      taxRate:       taxRateHyp,
    },
  }
}
