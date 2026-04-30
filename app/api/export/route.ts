import { NextResponse } from "next/server"
import ExcelJS from "exceljs"
import db from "../../db"
import { calculateDCF } from "../../dcf"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const company_id = searchParams.get("company_id") ?? "1"

  const company    = db.prepare("SELECT * FROM Company WHERE id = ?").get(company_id) as any
  const financials = db.prepare(
    "SELECT * FROM FinancialStatement WHERE company_id = ? ORDER BY fiscal_year ASC"
  ).all(company_id) as any[]
  const wacc = db.prepare(
    "SELECT * FROM WACCParameters WHERE company_id = ? AND scenario = 'base'"
  ).get(company_id) as any

  if (!financials.length) {
    return NextResponse.json({ error: "Aucune donnée financière" }, { status: 404 })
  }

  const wb = new ExcelJS.Workbook()
  wb.creator = "Valoris"
  wb.created = new Date()

  // ─── Palette ─────────────────────────────────────────────────────────────────
  const NAVY  = "1a3a5c"
  const TEAL  = "0d7a5f"
  const AMBER = "b45309"
  const LIGHT = "f8fafc"
  const WHITE = "ffffff"
  const RED   = "ef4444"

  // ─── Helpers style ────────────────────────────────────────────────────────────
  const colLetter = (n: number): string => {
    if (n <= 26) return String.fromCharCode(64 + n)
    return String.fromCharCode(64 + Math.floor((n - 1) / 26)) +
           String.fromCharCode(64 + ((n - 1) % 26) + 1)
  }

  const titleStyle   = (): Partial<ExcelJS.Style> => ({ font: { bold: true, color: { argb: `FF${NAVY}` }, size: 14 } })
  const subStyle     = (): Partial<ExcelJS.Style> => ({ font: { color: { argb: "FF64748b" }, size: 9 } })
  const labelStyle   = (): Partial<ExcelJS.Style> => ({ font: { color: { argb: `FF${NAVY}` }, size: 10 } })
  const boldLabel    = (): Partial<ExcelJS.Style> => ({ font: { bold: true, color: { argb: `FF${NAVY}` }, size: 10 } })
  const sectionStyle = (color = NAVY): Partial<ExcelJS.Style> => ({
    font: { bold: true, color: { argb: `FF${WHITE}` }, size: 10 },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: `FF${color}` } },
    alignment: { horizontal: "left", vertical: "middle" },
  })
  const hdrStyle = (color = NAVY): Partial<ExcelJS.Style> => ({
    font: { bold: true, color: { argb: `FF${WHITE}` }, size: 10 },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: `FF${color}` } },
    alignment: { horizontal: "center", vertical: "middle" },
  })
  const numStyle = (color = NAVY): Partial<ExcelJS.Style> => ({
    font: { color: { argb: `FF${color}` }, size: 10 },
    numFmt: "#,##0", alignment: { horizontal: "right" },
  })
  const pctStyle = (color = TEAL): Partial<ExcelJS.Style> => ({
    font: { color: { argb: `FF${color}` }, size: 10 },
    numFmt: "0.0%", alignment: { horizontal: "right" },
  })
  const decStyle = (color = TEAL): Partial<ExcelJS.Style> => ({
    font: { color: { argb: `FF${color}` }, size: 10 },
    numFmt: "0.000", alignment: { horizontal: "right" },
  })
  const totalStyle = (color = NAVY): Partial<ExcelJS.Style> => ({
    font: { bold: true, color: { argb: `FF${WHITE}` }, size: 11 },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: `FF${color}` } },
    numFmt: "#,##0", alignment: { horizontal: "right" },
  })

  const setVal = (
    ws: ExcelJS.Worksheet, row: number, col: number,
    value: ExcelJS.CellValue | { formula: string; result: number },
    style: Partial<ExcelJS.Style>
  ) => {
    const cell = ws.getCell(row, col)
    cell.value = value as ExcelJS.CellValue
    cell.style = style
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // ONGLET 1 — ÉTATS FINANCIERS
  // ═══════════════════════════════════════════════════════════════════════════════
  const ws1 = wb.addWorksheet("États financiers", { properties: { tabColor: { argb: `FF${NAVY}` } } })
  const nYrs = financials.length
  const nCols1 = nYrs + 1  // label + data cols
  ws1.columns = [{ width: 28 }, ...Array(nYrs).fill(null).map(() => ({ width: 15 }))]

  // R1 titre, R2 sous-titre
  ws1.mergeCells(`A1:${colLetter(nCols1)}1`)
  Object.assign(ws1.getCell("A1"), titleStyle())
  ws1.getCell("A1").value = `${company?.name ?? "Entreprise"} — États financiers historiques`
  ws1.getRow(1).height = 30

  ws1.mergeCells(`A2:${colLetter(nCols1)}2`)
  Object.assign(ws1.getCell("A2"), subStyle())
  ws1.getCell("A2").value = `SIREN ${company?.siren ?? "—"} · ${company?.sector ?? "—"} · Valoris ${new Date().getFullYear()}`

  ws1.addRow([])

  // R4 en-têtes colonnes
  const hRow1 = ws1.addRow(["Indicateur", ...financials.map((f: any) => f.fiscal_year)])
  hRow1.eachCell(cell => Object.assign(cell, hdrStyle(NAVY)))
  ws1.getRow(hRow1.number).height = 22

  // R5–R11 données brutes — on mémorise les row numbers pour les formules de ratio
  const DATA_META = [
    { label: "Chiffre d'affaires", key: "revenue"      },
    { label: "Marge brute",        key: "gross_margin"  },
    { label: "EBITDA",             key: "ebitda"        },
    { label: "EBIT",               key: "ebit"          },
    { label: "Résultat net",       key: "net_income"    },
    { label: "Capex",              key: "capex"         },
    { label: "FCF",                key: "fcf"           },
  ]
  const ROW: Record<string, number> = {}
  DATA_META.forEach((dm, idx) => {
    const r = ws1.addRow([dm.label, ...financials.map((f: any) => f[dm.key] ?? null)])
    ROW[dm.key] = r.number
    r.getCell(1).style = labelStyle()
    for (let c = 2; c <= nCols1; c++) {
      const val = financials[c - 2]?.[dm.key]
      r.getCell(c).style = {
        ...numStyle(val != null && val < 0 ? RED : NAVY),
        fill: { type: "pattern", pattern: "solid",
          fgColor: { argb: idx % 2 === 0 ? `FF${LIGHT}` : `FF${WHITE}` } },
      }
    }
  })

  // R12 vide
  ws1.addRow([])

  // R13 contrôles de cohérence
  const cohHdr = ws1.addRow(["Contrôles de cohérence"])
  ws1.mergeCells(`A${cohHdr.number}:${colLetter(nCols1)}${cohHdr.number}`)
  Object.assign(cohHdr.getCell(1), sectionStyle(AMBER))
  ws1.getRow(cohHdr.number).height = 20

  const CHECKS = [
    { label: "CA > EBITDA",         a: "revenue",      b: "ebitda"     },
    { label: "EBITDA > EBIT",       a: "ebitda",       b: "ebit"       },
    { label: "EBIT > Résultat net", a: "ebit",         b: "net_income" },
  ]
  CHECKS.forEach(({ label, a, b }) => {
    const r = ws1.addRow([label])
    r.getCell(1).style = labelStyle()
    for (let c = 2; c <= nCols1; c++) {
      const col = colLetter(c)
      const cell = r.getCell(c)
      const fa = financials[c - 2]?.[a] ?? 0
      const fb = financials[c - 2]?.[b] ?? 0
      cell.value = { formula: `=IF(${col}${ROW[a]}>${col}${ROW[b]},"✓","⚠")`, result: fa > fb ? "✓" : "⚠" }
      cell.style = { font: { size: 11 }, alignment: { horizontal: "center" } }
    }
  })

  // R vide
  ws1.addRow([])

  // Ratios — formules Excel pointant sur les cellules de données
  const ratioHdr = ws1.addRow(["Ratios"])
  ws1.mergeCells(`A${ratioHdr.number}:${colLetter(nCols1)}${ratioHdr.number}`)
  Object.assign(ratioHdr.getCell(1), sectionStyle(TEAL))
  ws1.getRow(ratioHdr.number).height = 20

  const RATIOS = [
    { label: "Marge brute",   num: "gross_margin", den: "revenue" },
    { label: "Marge EBITDA",  num: "ebitda",       den: "revenue" },
    { label: "Marge EBIT",    num: "ebit",         den: "revenue" },
    { label: "Marge nette",   num: "net_income",   den: "revenue" },
  ]
  RATIOS.forEach(rr => {
    const r = ws1.addRow([rr.label])
    r.getCell(1).style = labelStyle()
    for (let c = 2; c <= nCols1; c++) {
      const col = colLetter(c)
      const n = financials[c - 2]?.[rr.num] ?? 0
      const d = financials[c - 2]?.[rr.den] ?? 0
      r.getCell(c).value = {
        formula: `=IF(${col}${ROW[rr.den]}<>0,${col}${ROW[rr.num]}/${col}${ROW[rr.den]},0)`,
        result: d !== 0 ? n / d : 0,
      }
      r.getCell(c).style = pctStyle()
    }
  })

  // ═══════════════════════════════════════════════════════════════════════════════
  // ONGLET 2 — WACC
  // ═══════════════════════════════════════════════════════════════════════════════
  const ws2 = wb.addWorksheet("WACC", { properties: { tabColor: { argb: `FF${AMBER}` } } })
  ws2.columns = [{ width: 40 }, { width: 14 }, { width: 22 }]

  ws2.mergeCells("A1:C1")
  Object.assign(ws2.getCell("A1"), titleStyle())
  ws2.getCell("A1").value = "WACC — Paramètres et calcul"
  ws2.getRow(1).height = 30

  ws2.mergeCells("A2:C2")
  Object.assign(ws2.getCell("A2"), subStyle())
  ws2.getCell("A2").value = "Méthodologie Hamada · Damodaran Europe Jan 2025 · modifiable"

  ws2.addRow([])

  // Helper : ajoute une ligne section
  const ws2Section = (label: string, color: string) => {
    const r = ws2.addRow([label])
    ws2.mergeCells(`A${r.number}:C${r.number}`)
    Object.assign(r.getCell(1), sectionStyle(color))
    ws2.getRow(r.number).height = 20
  }

  // Helper : ligne paramètre (valeur saisie)
  const ws2Input = (label: string, val: number, fmt: "pct" | "dec" | "num", note = ""): number => {
    const r = ws2.addRow([label, val, note])
    r.getCell(1).style = labelStyle()
    r.getCell(2).style = fmt === "pct" ? pctStyle(AMBER) : fmt === "dec" ? decStyle(AMBER) : numStyle(AMBER)
    r.getCell(3).style = { font: { color: { argb: "FF94a3b8" }, size: 9 } }
    return r.number
  }

  // Helper : ligne formule calculée
  const ws2Formula = (label: string, formula: string, result: number, fmt: "pct" | "dec" | "num", note = ""): number => {
    const r = ws2.addRow([label, null, note])
    r.getCell(1).style = boldLabel()
    r.getCell(2).value = { formula, result }
    r.getCell(2).style = fmt === "pct" ? pctStyle(TEAL) : fmt === "dec" ? decStyle(TEAL) : numStyle(TEAL)
    r.getCell(3).style = { font: { color: { argb: "FF94a3b8" }, size: 9 } }
    return r.number
  }

  // Section 1 — Données secteur
  ws2Section("1 · Données secteur comparable (Damodaran Europe 2025)", NAVY)
  const rBetaL   = ws2Input("β levered comparable", wacc?.beta_levered_comparable ?? 0.90, "dec", wacc?.sector_label ?? "Autre")
  const rDeComp  = ws2Input("D/E comparable (ratio sectoriel)", wacc?.de_comparable ?? 0.30, "dec", "source Damodaran")
  ws2.addRow([])

  // Section 2 — PME cible
  ws2Section("2 · Structure financière — PME cible", NAVY)
  const rDeCible = ws2Input("D/E cible (Dette nette / Fonds propres)", wacc?.de_cible ?? 0.30, "dec", "→ modifiable")
  const rTax     = ws2Input("Taux IS", wacc?.tax_rate ?? 0.25, "pct", "France 2025")
  ws2.addRow([])

  // Section 3 — Beta Hamada
  ws2Section("3 · β Hamada — délevier / relelever", TEAL)
  const rBetaU = ws2Formula(
    "β unlevered  =  β_L / (1 + (1−IS) × D/E_comp)",
    `=B${rBetaL}/(1+(1-B${rTax})*B${rDeComp})`,
    wacc?.beta_unlevered ?? 0.75, "dec", "β sectoriel désendetté"
  )
  const rBetaR = ws2Formula(
    "β relevered  =  β_U × (1 + (1−IS) × D/E_cible)",
    `=B${rBetaU}*(1+(1-B${rTax})*B${rDeCible})`,
    wacc?.beta_relevered ?? 0.90, "dec", "β adapté à la PME"
  )
  ws2.addRow([])

  // Section 4 — Pondérations
  ws2Section("4 · Pondérations capital", TEAL)
  const rWe = ws2Formula("Poids equity  We = 1 / (1 + D/E)", `=1/(1+B${rDeCible})`, wacc?.weight_equity ?? 0.77, "pct")
  const rWd = ws2Formula("Poids dette   Wd = D/E / (1 + D/E)", `=B${rDeCible}/(1+B${rDeCible})`, wacc?.weight_debt ?? 0.23, "pct")
  ws2.addRow([])

  // Section 5 — CAPM
  ws2Section("5 · Coût des fonds propres — CAPM", AMBER)
  const rRf  = ws2Input("Taux sans risque Rf — OAT 10 ans", wacc?.rf ?? 0.035, "pct", "→ modifiable")
  const rErp = ws2Input("Prime de risque marché ERP", wacc?.erp ?? 0.060, "pct", "Damodaran Europe")
  const rSp  = ws2Input("Prime de taille (Small Cap)", wacc?.size_premium ?? 0.030, "pct", "→ modifiable")
  const rIp  = ws2Input("Prime d'illiquidité", wacc?.illiquidity_premium ?? 0.025, "pct", "→ modifiable")
  const rKe  = ws2Formula(
    "Ke  =  Rf + β_R × ERP + Ps + Pi",
    `=B${rRf}+B${rBetaR}*B${rErp}+B${rSp}+B${rIp}`,
    wacc?.ke ?? 0.165, "pct", "coût fonds propres"
  )
  ws2.addRow([])

  // Section 6 — Kd
  ws2Section("6 · Coût de la dette", AMBER)
  const rKdBrut = ws2Input("Kd brut", wacc?.kd_gross ?? 0.055, "pct", "Euribor + spread PME · → modifiable")
  const rKdNet  = ws2Formula(
    "Kd net  =  Kd × (1 − IS)",
    `=B${rKdBrut}*(1-B${rTax})`,
    wacc?.kd_net ?? 0.041, "pct"
  )
  ws2.addRow([])

  // WACC FINAL
  const wfRow = ws2.addRow(["WACC FINAL"])
  wfRow.getCell(1).style = {
    font: { bold: true, color: { argb: `FF${WHITE}` }, size: 12 },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: `FF${NAVY}` } },
    alignment: { horizontal: "left", vertical: "middle" },
  }
  wfRow.getCell(2).value = {
    formula: `=B${rKe}*B${rWe}+B${rKdNet}*B${rWd}`,
    result: wacc?.wacc ?? 0.14,
  }
  wfRow.getCell(2).style = {
    font: { bold: true, color: { argb: `FF${WHITE}` }, size: 13 },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: `FF${NAVY}` } },
    numFmt: "0.00%", alignment: { horizontal: "right" },
  }
  ws2.mergeCells(`A${wfRow.number}:A${wfRow.number}`)
  ws2.getRow(wfRow.number).height = 28
  const rWacc = wfRow.number

  // ═══════════════════════════════════════════════════════════════════════════════
  // ONGLET 3 — MODÈLE DCF
  // ═══════════════════════════════════════════════════════════════════════════════
  const ws3 = wb.addWorksheet("Modèle DCF", { properties: { tabColor: { argb: `FF${TEAL}` } } })
  ws3.columns = [
    { width: 34 }, { width: 15 },
    { width: 13 }, { width: 13 }, { width: 13 }, { width: 13 }, { width: 13 },
  ]

  const latest   = financials[financials.length - 1]
  const waccRate = wacc?.wacc ?? 0.095
  const G_TERM   = 0.02
  const projN    = 5
  const baseYear = latest.fiscal_year ?? new Date().getFullYear()
  const projYears = Array.from({ length: projN }, (_, i) => baseYear + i + 1)

  const dcf = calculateDCF(financials, { wacc: waccRate, terminal_growth_rate: G_TERM, projection_years: projN })

  const hyp = dcf.effectiveHyp
  const hasEbitMargin = hyp.ebitMargin != null
  const ws1LastCol = colLetter(nYrs + 1)  // dernière colonne de données dans ws1

  // R1 titre
  ws3.mergeCells("A1:G1")
  Object.assign(ws3.getCell("A1"), titleStyle())
  ws3.getCell("A1").value = `${company?.name ?? "Entreprise"} — Modèle DCF`
  ws3.getRow(1).height = 30

  ws3.mergeCells("A2:G2")
  Object.assign(ws3.getCell("A2"), subStyle())
  ws3.getCell("A2").value = `Gordon-Shapiro · ${projN} ans · g terminal = ${(G_TERM * 100).toFixed(1)}% · WACC lié à l'onglet WACC`

  ws3.addRow([])

  // ── Hypothèses (R4–R11) ──────────────────────────────────────────────────────
  const hypHdr = ws3.addRow(["Hypothèses de projection"])
  ws3.mergeCells(`A${hypHdr.number}:G${hypHdr.number}`)
  Object.assign(hypHdr.getCell(1), sectionStyle(NAVY))
  ws3.getRow(hypHdr.number).height = 20

  // R5: WACC (lié à onglet WACC)
  const rW3Wacc = ws3.addRow(["WACC"])
  rW3Wacc.getCell(1).style = labelStyle()
  rW3Wacc.getCell(2).value = { formula: `=WACC!B${rWacc}`, result: waccRate }
  rW3Wacc.getCell(2).style = pctStyle(AMBER)
  const W3_WACC = rW3Wacc.number

  // R6: g terminal
  const rW3G = ws3.addRow(["Taux croissance terminal (g)"])
  rW3G.getCell(1).style = labelStyle()
  rW3G.getCell(2).value = G_TERM
  rW3G.getCell(2).style = pctStyle(AMBER)
  const W3_G = rW3G.number

  // R7: CAGR CA
  const rW3Cagr = ws3.addRow(["CAGR CA projeté"])
  rW3Cagr.getCell(1).style = labelStyle()
  rW3Cagr.getCell(2).value = hyp.revenueGrowth ?? 0.05
  rW3Cagr.getCell(2).style = pctStyle(AMBER)
  const W3_CAGR = rW3Cagr.number

  // R8: Marge EBITDA
  const rW3EbitdaM = ws3.addRow(["Marge EBITDA cible"])
  rW3EbitdaM.getCell(1).style = labelStyle()
  rW3EbitdaM.getCell(2).value = hyp.ebitdaMargin ?? 0
  rW3EbitdaM.getCell(2).style = pctStyle(AMBER)
  const W3_EBITDA_M = rW3EbitdaM.number

  // R9: Marge EBIT (nullable — on met la valeur ou 0)
  const rW3EbitM = ws3.addRow(["Marge EBIT cible"])
  rW3EbitM.getCell(1).style = labelStyle()
  rW3EbitM.getCell(2).value = hyp.ebitMargin ?? null
  rW3EbitM.getCell(2).style = pctStyle(AMBER)
  const W3_EBIT_M = rW3EbitM.number

  // R10: Capex / CA
  const rW3Capex = ws3.addRow(["Capex / CA"])
  rW3Capex.getCell(1).style = labelStyle()
  rW3Capex.getCell(2).value = hyp.capexRatio ?? 0
  rW3Capex.getCell(2).style = pctStyle(AMBER)
  const W3_CAPEX_R = rW3Capex.number

  // R11: Taux IS (lié à onglet WACC)
  const rW3Tax = ws3.addRow(["Taux IS"])
  rW3Tax.getCell(1).style = labelStyle()
  rW3Tax.getCell(2).value = { formula: `=WACC!B${rTax}`, result: wacc?.tax_rate ?? 0.25 }
  rW3Tax.getCell(2).style = pctStyle(AMBER)
  const W3_TAX = rW3Tax.number

  ws3.addRow([])

  // ── Données de base (R13–R16) ────────────────────────────────────────────────
  const baseHdr = ws3.addRow(["Données de base (dernière année historique)"])
  ws3.mergeCells(`A${baseHdr.number}:G${baseHdr.number}`)
  Object.assign(baseHdr.getCell(1), sectionStyle(TEAL))
  ws3.getRow(baseHdr.number).height = 20

  // CA base — lié à onglet États financiers
  const rW3CaBase = ws3.addRow([`CA base (${baseYear})`])
  rW3CaBase.getCell(1).style = labelStyle()
  rW3CaBase.getCell(2).value = {
    formula: `='États financiers'!${ws1LastCol}${ROW["revenue"]}`,
    result: latest.revenue ?? 0,
  }
  rW3CaBase.getCell(2).style = numStyle()
  const W3_CA_BASE = rW3CaBase.number

  // FCF base (calculé par le moteur, non directement dans ws1 si fcf=null)
  const rW3FcfBase = ws3.addRow([`FCF base (${baseYear})`])
  rW3FcfBase.getCell(1).style = labelStyle()
  rW3FcfBase.getCell(2).value = dcf.baseFCF
  rW3FcfBase.getCell(2).style = numStyle()
  const W3_FCF_BASE = rW3FcfBase.number

  // Dette nette
  const rW3Debt = ws3.addRow(["Dette nette (N)"])
  rW3Debt.getCell(1).style = labelStyle()
  rW3Debt.getCell(2).value = latest.net_debt ?? 0
  rW3Debt.getCell(2).style = numStyle(latest.net_debt && latest.net_debt < 0 ? RED : NAVY)
  const W3_NET_DEBT = rW3Debt.number

  ws3.addRow([])

  // ── Tableau de projection (R18+) ─────────────────────────────────────────────
  const projHdr = ws3.addRow(["", "", ...projYears.map(y => `${y}F`)])
  Object.assign(projHdr.getCell(1), sectionStyle(TEAL))
  projHdr.getCell(2).style = sectionStyle(TEAL)
  for (let c = 3; c <= 7; c++) Object.assign(projHdr.getCell(c), hdrStyle(TEAL))
  ws3.getRow(projHdr.number).height = 22
  projHdr.getCell(1).value = "Projection FCF"

  // Ligne n (helper invisible)
  const nRow = ws3.addRow(["", "", ...Array.from({ length: projN }, (_, i) => i + 1)])
  nRow.eachCell(cell => {
    cell.style = { font: { color: { argb: "FF94a3b8" }, size: 9 }, alignment: { horizontal: "center" } }
  })

  // Pré-calcule les valeurs projetées pour hints
  const projRevs    = projYears.map((_, i) => (latest.revenue ?? 0) * Math.pow(1 + (hyp.revenueGrowth ?? 0.05), i + 1))
  const projEbitdas = projRevs.map(r => r * (hyp.ebitdaMargin ?? 0))
  const projEbits   = hasEbitMargin ? projRevs.map(r => r * hyp.ebitMargin!) : null
  const projCapexes = projRevs.map(r => r * (hyp.capexRatio ?? 0))
  const t0          = hyp.taxRate ?? 0.25
  const projFCFs    = projYears.map((_, i) => {
    const ebitda = projEbitdas[i]
    const ebit   = projEbits?.[i] ?? null
    const capex  = projCapexes[i]
    if (ebitda != null && ebit != null) return ebitda - ebit * t0 - capex
    if (ebitda != null) return ebitda * (1 - t0) - capex
    return dcf.baseFCF * Math.pow(1 + (hyp.revenueGrowth ?? 0.05), i + 1)
  })
  const discFactors = projYears.map((_, i) => 1 / Math.pow(1 + waccRate, i + 1))
  const pvFCFs      = projFCFs.map((f, i) => f * discFactors[i])

  // Lignes de projection — colonnes C=3 à G=7
  const addProjRow = (
    label: string,
    formulaFn: (col: string, n: number) => string,
    results: number[],
    style: Partial<ExcelJS.Style>
  ) => {
    const r = ws3.addRow([label])
    r.getCell(1).style = labelStyle()
    for (let c = 3; c <= 7; c++) {
      const col = colLetter(c)
      const n   = c - 2
      const cell = r.getCell(c)
      cell.value = { formula: formulaFn(col, n), result: results[n - 1] ?? 0 }
      cell.style = style
    }
    return r.number
  }

  const rProjCA = addProjRow(
    "CA projeté",
    (_, n) => `=$B$${W3_CA_BASE}*(1+$B$${W3_CAGR})^${n}`,
    projRevs, numStyle()
  )

  const rProjEBITDA = addProjRow(
    "EBITDA projeté",
    (col) => `=${col}${rProjCA}*$B$${W3_EBITDA_M}`,
    projEbitdas, numStyle()
  )

  const rProjEBIT = hasEbitMargin
    ? addProjRow(
        "EBIT projeté",
        (col) => `=${col}${rProjCA}*$B$${W3_EBIT_M}`,
        projEbits ?? projEbitdas, numStyle()
      )
    : null

  const rProjCapex = addProjRow(
    "Capex projeté",
    (col) => `=${col}${rProjCA}*$B$${W3_CAPEX_R}`,
    projCapexes, numStyle()
  )

  // FCF projeté — formule varie selon disponibilité de la marge EBIT
  const rProjFCF = addProjRow(
    "FCF projeté",
    (col) => hasEbitMargin && rProjEBIT
      ? `=${col}${rProjEBITDA}-${col}${rProjEBIT}*$B$${W3_TAX}-${col}${rProjCapex}`
      : `=${col}${rProjEBITDA}*(1-$B$${W3_TAX})-${col}${rProjCapex}`,
    projFCFs, { ...numStyle(TEAL), font: { bold: true, color: { argb: `FF${TEAL}` }, size: 10 } }
  )

  const rDisc = addProjRow(
    "Facteur d'actualisation",
    (_, n) => `=1/(1+$B$${W3_WACC})^${n}`,
    discFactors, { ...numStyle(), numFmt: "0.000", alignment: { horizontal: "right" } }
  )

  const rPV = addProjRow(
    "FCF actualisé (PV)",
    (col) => `=${col}${rProjFCF}*${col}${rDisc}`,
    pvFCFs, { ...numStyle(NAVY), font: { bold: true, color: { argb: `FF${NAVY}` }, size: 10 } }
  )

  ws3.addRow([])

  // ── Valorisation (R28+) ──────────────────────────────────────────────────────
  const valHdr = ws3.addRow(["Valorisation"])
  ws3.mergeCells(`A${valHdr.number}:G${valHdr.number}`)
  Object.assign(valHdr.getCell(1), sectionStyle(NAVY))
  ws3.getRow(valHdr.number).height = 20

  const addValRow = (
    label: string, col: number,
    formula: string, result: number,
    style: Partial<ExcelJS.Style>
  ) => {
    const r = ws3.addRow([label])
    r.getCell(1).style = labelStyle()
    r.getCell(col).value = { formula, result }
    r.getCell(col).style = style
    return r.number
  }

  const rSumPV = addValRow(
    "Σ PV FCFs", 2,
    `=SUM(C${rPV}:G${rPV})`, dcf.sumPVFCF, numStyle()
  )

  const rTV = addValRow(
    "Valeur terminale (Gordon-Shapiro)  FCF_N × (1+g) / (WACC−g)", 2,
    `=G${rProjFCF}*(1+$B$${W3_G})/($B$${W3_WACC}-$B$${W3_G})`,
    dcf.terminalValue, numStyle()
  )

  const rPVTV = addValRow(
    "PV Valeur terminale", 2,
    `=B${rTV}/(1+$B$${W3_WACC})^${projN}`,
    dcf.pvTerminalValue, numStyle()
  )

  ws3.addRow([])

  // EV
  const evRow = ws3.addRow(["Enterprise Value (EV)"])
  evRow.getCell(1).style = boldLabel()
  evRow.getCell(2).value = { formula: `=B${rSumPV}+B${rPVTV}`, result: dcf.enterpriseValue }
  evRow.getCell(2).style = totalStyle(TEAL)
  ws3.getRow(evRow.number).height = 24
  const rEV = evRow.number

  // Dette nette
  const debtRow = ws3.addRow(["(−) Dette nette"])
  debtRow.getCell(1).style = labelStyle()
  debtRow.getCell(2).value = { formula: `=-B${W3_NET_DEBT}`, result: -(latest.net_debt ?? 0) }
  debtRow.getCell(2).style = numStyle(latest.net_debt && latest.net_debt > 0 ? RED : NAVY)
  const rDebt = debtRow.number

  // Equity Value
  const eqRow = ws3.addRow(["Equity Value"])
  eqRow.getCell(1).style = {
    font: { bold: true, color: { argb: `FF${WHITE}` }, size: 12 },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: `FF${NAVY}` } },
    alignment: { horizontal: "left", vertical: "middle" },
  }
  eqRow.getCell(2).value = { formula: `=B${rEV}+B${rDebt}`, result: dcf.equityValue }
  eqRow.getCell(2).style = totalStyle(NAVY)
  ws3.getRow(eqRow.number).height = 28

  // ── Génération ───────────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer()

  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Valoris_${(company?.name ?? "export").replace(/ /g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx"`,
    },
  })
}
