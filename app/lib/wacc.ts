// ─── Table de référence Damodaran Europe Jan 2025 ───────────────────────────
// Source : pages.stern.nyu.edu/~adamodar/
// β_levered = bêta leviéré moyen du secteur coté européen
// de_ratio  = D/E moyen du secteur (dette nette / capitaux propres)

export interface SectorData {
  label: string
  beta_levered: number
  de_ratio: number
}

export const SECTORS: Record<string, SectorData> = {
  agroalimentaire:  { label: "Agroalimentaire",            beta_levered: 0.58, de_ratio: 0.22 },
  cosmetique:       { label: "Cosmétique / Beauté",         beta_levered: 0.82, de_ratio: 0.14 },
  btp:              { label: "Construction / BTP",          beta_levered: 1.02, de_ratio: 0.44 },
  distribution:     { label: "Distribution / Commerce",     beta_levered: 0.72, de_ratio: 0.38 },
  energie:          { label: "Énergie / Utilities",         beta_levered: 0.78, de_ratio: 0.52 },
  hotellerie:       { label: "Hôtellerie / Restauration",   beta_levered: 1.08, de_ratio: 0.62 },
  immobilier:       { label: "Immobilier",                  beta_levered: 0.68, de_ratio: 0.85 },
  industrie:        { label: "Industrie manufacturière",    beta_levered: 0.92, de_ratio: 0.32 },
  tech:             { label: "Logiciels / Tech",            beta_levered: 1.18, de_ratio: 0.06 },
  sante:            { label: "Santé / Pharmacie",           beta_levered: 0.78, de_ratio: 0.16 },
  services:         { label: "Services aux entreprises",    beta_levered: 0.88, de_ratio: 0.22 },
  transport:        { label: "Transport / Logistique",      beta_levered: 0.88, de_ratio: 0.42 },
  media:            { label: "Médias / Communication",      beta_levered: 0.98, de_ratio: 0.28 },
  telecom:          { label: "Télécommunications",          beta_levered: 0.72, de_ratio: 0.58 },
  autre:            { label: "Autre / Diversifié",          beta_levered: 0.90, de_ratio: 0.30 },
}

// ─── Constantes de marché France 2025 ───────────────────────────────────────
export const MARKET_DEFAULTS = {
  rf: 0.035,              // OAT 10 ans
  erp: 0.060,             // Prime de risque marché Europe (Damodaran)
  size_premium: 0.030,    // Prime taille PME non cotée
  illiquidity_premium: 0.025, // Prime d'illiquidité
  kd_gross: 0.055,        // Taux d'emprunt moyen PME France (Euribor + spread)
  tax_rate: 0.25,
}

// ─── Formules ────────────────────────────────────────────────────────────────

/** Étape 2 : Deslever le bêta comparable (Hamada) */
export function deleveredBeta(beta_levered: number, de_ratio: number, tax_rate: number): number {
  return beta_levered / (1 + (1 - tax_rate) * de_ratio)
}

/** Étape 3 : Relever avec la structure financière de la PME cible */
export function releveredBeta(beta_unlevered: number, de_cible: number, tax_rate: number): number {
  return beta_unlevered * (1 + (1 - tax_rate) * de_cible)
}

export interface WACCInputs {
  sector_key: string
  de_cible: number            // net_debt / equity de la PME cible
  tax_rate?: number
  rf?: number
  erp?: number
  size_premium?: number
  illiquidity_premium?: number
  kd_gross?: number
}

export interface WACCResult {
  // Intermédiaires utiles pour le breakdown
  sector_label: string
  beta_levered_comparable: number
  de_comparable: number
  beta_unlevered: number
  beta_relevered: number
  weight_equity: number
  weight_debt: number
  // Inputs utilisés
  rf: number
  erp: number
  size_premium: number
  illiquidity_premium: number
  kd_gross: number
  tax_rate: number
  de_cible: number
  // Résultats finaux
  ke: number
  kd_net: number
  wacc: number
}

export function computeWACC(inputs: WACCInputs): WACCResult {
  const sector = SECTORS[inputs.sector_key] ?? SECTORS.autre
  const t    = inputs.tax_rate            ?? MARKET_DEFAULTS.tax_rate
  const rf   = inputs.rf                  ?? MARKET_DEFAULTS.rf
  const erp  = inputs.erp                 ?? MARKET_DEFAULTS.erp
  const sp   = inputs.size_premium        ?? MARKET_DEFAULTS.size_premium
  const ip   = inputs.illiquidity_premium ?? MARKET_DEFAULTS.illiquidity_premium
  const kd   = inputs.kd_gross            ?? MARKET_DEFAULTS.kd_gross
  const de   = inputs.de_cible

  // Étape 2 : β_unlevered
  const beta_u = deleveredBeta(sector.beta_levered, sector.de_ratio, t)

  // Étape 3 : β_relevered
  const beta_r = releveredBeta(beta_u, de, t)

  // Ke = Rf + β_relevered × ERP + prime_taille + prime_illiquidité
  const ke = rf + beta_r * erp + sp + ip

  // Kd net d'IS
  const kd_net = kd * (1 - t)

  // Pondérations : D/E → E/(D+E) et D/(D+E)
  const w_e = 1 / (1 + de)
  const w_d = de / (1 + de)

  const wacc = ke * w_e + kd_net * w_d

  const r = (n: number, decimals = 4) => Math.round(n * Math.pow(10, decimals)) / Math.pow(10, decimals)

  return {
    sector_label: sector.label,
    beta_levered_comparable: sector.beta_levered,
    de_comparable: sector.de_ratio,
    beta_unlevered: r(beta_u, 3),
    beta_relevered: r(beta_r, 3),
    weight_equity:  r(w_e, 3),
    weight_debt:    r(w_d, 3),
    rf, erp,
    size_premium: sp,
    illiquidity_premium: ip,
    kd_gross: kd,
    tax_rate: t,
    de_cible: r(de, 3),
    ke:      r(ke, 4),
    kd_net:  r(kd_net, 4),
    wacc:    r(wacc, 4),
  }
}
