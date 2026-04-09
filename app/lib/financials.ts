// ─── Les 10 champs clés pour le DCF ─────────────────────────────────────────
// Tout le reste est calculé automatiquement à partir de ces champs.

export const CORE_FIELDS: { key: string; label: string; unit: string }[] = [
  { key: "revenue",         label: "Chiffre d'affaires",  unit: "k€" },
  { key: "ebitda",          label: "EBITDA",              unit: "k€" },
  { key: "ebit",            label: "EBIT",                unit: "k€" },
  { key: "net_income",      label: "Résultat net",        unit: "k€" },
  { key: "capex",           label: "Capex",               unit: "k€" },
  { key: "net_debt",        label: "Dette nette",         unit: "k€" },
  { key: "equity",          label: "Capitaux propres",    unit: "k€" },
  { key: "working_capital", label: "BFR",                 unit: "k€" },
  { key: "delta_wc",        label: "Variation BFR",       unit: "k€" },
  { key: "tax_rate",        label: "Taux IS",             unit: "%" },
]

export interface CoreYear {
  fiscal_year:      number
  revenue:          number | null
  ebitda:           number | null
  ebit:             number | null
  net_income:       number | null
  capex:            number | null
  net_debt:         number | null
  equity:           number | null
  working_capital:  number | null
  delta_wc:         number | null
  tax_rate:         number | null
}

// ─── Calcul automatique des champs dérivés ───────────────────────────────────
export function computeDerived(y: CoreYear): Record<string, number | null> {
  const t  = y.tax_rate ?? 0.25
  const cap = y.capex ?? 0
  const dwc = y.delta_wc ?? 0

  // FCF = EBITDA - EBIT×t - Capex - ΔBFR  (formule complète, D&A tax shield inclus)
  // Si EBIT indisponible : EBITDA×(1-t) - Capex - ΔBFR (approximation conservative)
  // Si EBITDA indisponible : EBIT×(1-t) - Capex - ΔBFR (pas d'add-back D&A)
  let fcf: number | null = null
  if (y.ebitda != null && y.ebit != null)
    fcf = y.ebitda - y.ebit * t - cap - dwc
  else if (y.ebitda != null)
    fcf = y.ebitda * (1 - t) - cap - dwc
  else if (y.ebit != null)
    fcf = y.ebit * (1 - t) - cap - dwc

  // ROIC = EBIT*(1-t) / (Equity + Dette nette)
  let roic: number | null = null
  if (y.ebit != null && y.equity != null && y.net_debt != null) {
    const ce = y.equity + y.net_debt
    if (ce > 0) roic = (y.ebit * (1 - t)) / ce
  }

  // ROE = Résultat net / Capitaux propres
  let roe: number | null = null
  if (y.net_income != null && y.equity != null && y.equity > 0)
    roe = y.net_income / y.equity

  // Marges
  const ebitda_margin = (y.ebitda != null && y.revenue && y.revenue > 0)
    ? y.ebitda / y.revenue : null
  const ebit_margin   = (y.ebit   != null && y.revenue && y.revenue > 0)
    ? y.ebit   / y.revenue : null
  const net_margin    = (y.net_income != null && y.revenue && y.revenue > 0)
    ? y.net_income / y.revenue : null

  // Cash conversion = FCF / EBITDA
  const cash_conversion = (fcf != null && y.ebitda != null && y.ebitda > 0)
    ? fcf / y.ebitda : null

  // Capex intensity = Capex / CA
  const capex_intensity = (y.capex != null && y.revenue && y.revenue > 0)
    ? y.capex / y.revenue : null

  return { fcf, roic, roe, ebitda_margin, ebit_margin, net_margin, cash_conversion, capex_intensity }
}

// ─── Fusionne les champs core + dérivés en un seul objet prêt pour la DB ────
export function buildFullRecord(core: CoreYear): CoreYear & Record<string, number | null> {
  return { ...core, ...computeDerived(core) }
}
