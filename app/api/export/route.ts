import { NextResponse } from "next/server"
import ExcelJS from "exceljs"
import db from "../../db"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const company_id = searchParams.get("company_id") ?? "1"

  const company = db.prepare("SELECT * FROM Company WHERE id = ?").get(company_id) as any
  const financials = db.prepare(
    "SELECT * FROM FinancialStatement WHERE company_id = ? ORDER BY fiscal_year ASC"
  ).all(company_id) as any[]
  const wacc = db.prepare(
    "SELECT * FROM WACCParameters WHERE company_id = ? AND scenario = 'base'"
  ).get(company_id) as any

  const wb = new ExcelJS.Workbook()
  wb.creator = "Valoris"
  wb.created = new Date()

  // ─── COULEURS ───────────────────────────────────────────────
  const NAVY  = "1a3a5c"
  const TEAL  = "0d7a5f"
  const AMBER = "b45309"
  const LIGHT = "f8fafc"
  const WHITE = "ffffff"

  // ─── HELPERS ────────────────────────────────────────────────
  const headerStyle = (color = NAVY): Partial<ExcelJS.Style> => ({
    font: { bold: true, color: { argb: `FF${WHITE}` }, size: 11 },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: `FF${color}` } },
    alignment: { horizontal: "center", vertical: "middle" },
    border: {
      bottom: { style: "thin", color: { argb: `FF${color}` } }
    }
  })

  const titleStyle = (): Partial<ExcelJS.Style> => ({
    font: { bold: true, color: { argb: `FF${NAVY}` }, size: 14 },
    alignment: { horizontal: "left", vertical: "middle" }
  })

  const subStyle = (): Partial<ExcelJS.Style> => ({
    font: { color: { argb: "FF64748b" }, size: 10 },
    alignment: { horizontal: "left" }
  })

  const numStyle = (color = NAVY): Partial<ExcelJS.Style> => ({
    font: { color: { argb: `FF${color}` }, size: 10 },
    numFmt: '#,##0',
    alignment: { horizontal: "right" }
  })

  const pctStyle = (): Partial<ExcelJS.Style> => ({
    font: { color: { argb: `FF${TEAL}` }, size: 10 },
    numFmt: '0.0%',
    alignment: { horizontal: "right" }
  })

  const labelStyle = (): Partial<ExcelJS.Style> => ({
    font: { color: { argb: `FF${NAVY}` }, size: 10 },
    alignment: { horizontal: "left" }
  })

  const totalStyle = (): Partial<ExcelJS.Style> => ({
    font: { bold: true, color: { argb: `FF${WHITE}` }, size: 11 },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: `FF${TEAL}` } },
    numFmt: '#,##0',
    alignment: { horizontal: "right" },
    border: { top: { style: "thin", color: { argb: `FF${TEAL}` } } }
  })

  // ═══════════════════════════════════════════════════════════
  // ONGLET 1 — ÉTATS FINANCIERS
  // ═══════════════════════════════════════════════════════════
  const ws1 = wb.addWorksheet("États financiers", {
    properties: { tabColor: { argb: `FF${NAVY}` } }
  })

  ws1.columns = [
    { width: 30 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
  ]

  // Titre
  ws1.mergeCells("A1:E1")
  const t1 = ws1.getCell("A1")
  t1.value = `${company?.name ?? "Entreprise"} — États financiers historiques`
  Object.assign(t1, titleStyle())
  ws1.getRow(1).height = 30

  ws1.mergeCells("A2:E2")
  const s1 = ws1.getCell("A2")
  s1.value = `SIREN ${company?.siren} · ${company?.sector} · Valoris ${new Date().getFullYear()}`
  Object.assign(s1, subStyle())
  ws1.getRow(2).height = 16

  ws1.addRow([])

  // En-têtes
  const h1 = ws1.addRow(["Indicateur", ...financials.map(f => f.fiscal_year)])
  h1.eachCell(cell => Object.assign(cell, headerStyle()))
  ws1.getRow(h1.number).height = 22

  // Données
  const rows = [
    { label: "Chiffre d'affaires", key: "revenue" },
    { label: "Marge brute", key: "gross_margin" },
    { label: "EBITDA", key: "ebitda" },
    { label: "EBIT", key: "ebit" },
    { label: "Résultat net", key: "net_income" },
    { label: "Capex", key: "capex" },
    { label: "FCF", key: "fcf" },
  ]

  rows.forEach((row, idx) => {
    const r = ws1.addRow([row.label, ...financials.map(f => f[row.key])])
    r.getCell(1).style = labelStyle()
    for (let i = 2; i <= financials.length + 1; i++) {
      const cell = r.getCell(i)
      const val = financials[i - 2][row.key]
      cell.style = {
        ...numStyle(val < 0 ? "ef4444" : NAVY),
        fill: idx % 2 === 0
          ? { type: "pattern", pattern: "solid", fgColor: { argb: `FF${LIGHT}` } }
          : { type: "pattern", pattern: "solid", fgColor: { argb: `FF${WHITE}` } }
      }
    }
  })

  ws1.addRow([])

  // Ratios
  const rHeader = ws1.addRow(["Ratios", ...financials.map(f => f.fiscal_year)])
  rHeader.eachCell(cell => Object.assign(cell, headerStyle(TEAL)))
  ws1.getRow(rHeader.number).height = 22

  const ratioRows = [
    { label: "Marge brute", num: "gross_margin", den: "revenue" },
    { label: "Marge EBITDA", num: "ebitda", den: "revenue" },
    { label: "Marge EBIT", num: "ebit", den: "revenue" },
    { label: "Marge nette", num: "net_income", den: "revenue" },
  ]

  ratioRows.forEach(row => {
    const r = ws1.addRow([
      row.label,
      ...financials.map(f => f[row.den] ? f[row.num] / f[row.den] : null)
    ])
    r.getCell(1).style = labelStyle()
    for (let i = 2; i <= financials.length + 1; i++) {
      r.getCell(i).style = pctStyle()
    }
  })

  // ═══════════════════════════════════════════════════════════
  // ONGLET 2 — WACC
  // ═══════════════════════════════════════════════════════════
  const ws2 = wb.addWorksheet("WACC", {
    properties: { tabColor: { argb: `FF${AMBER}` } }
  })

  ws2.columns = [{ width: 35 }, { width: 20 }, { width: 35 }]

  ws2.mergeCells("A1:C1")
  const t2 = ws2.getCell("A1")
  t2.value = "Paramètres WACC — Scénario Base"
  Object.assign(t2, titleStyle())
  ws2.getRow(1).height = 30

  ws2.addRow([])

  const sections = [
    { title: "1. Structure du capital", color: NAVY, items: [
      ["Dette nette (D)", wacc?.debt_equity_ratio ? null : null, "€"],
      ["Fonds propres (E)", null, "€"],
      ["Ratio D/E", wacc?.debt_equity_ratio, "x"],
    ]},
    { title: "2. Coût des fonds propres (CAPM)", color: TEAL, items: [
      ["Taux sans risque (Rf)", wacc?.risk_free_rate, "%"],
      ["Prime de marché (ERP)", wacc?.market_premium, "%"],
      ["Bêta désendetté", wacc?.beta_unlevered, "x"],
      ["Bêta réendetté", wacc?.beta_relevered, "x"],
      ["Prime de taille (Small Cap)", wacc?.size_premium, "%"],
      ["Prime d'illiquidité", wacc?.illiquidity_premium, "%"],
      ["Coût fonds propres (Ke)", wacc?.ke, "%"],
    ]},
    { title: "3. Coût de la dette", color: AMBER, items: [
      ["Coût dette brut (Kd)", wacc?.kd_gross, "%"],
      ["Taux IS", 0.25, "%"],
      ["Coût dette net (Kd × (1-t))", wacc?.kd_net, "%"],
    ]},
  ]

  sections.forEach(section => {
    const sh = ws2.addRow([section.title])
    sh.getCell(1).style = { ...headerStyle(section.color), alignment: { horizontal: "left" } }
    ws2.getRow(sh.number).height = 22

    section.items.forEach(([label, value, unit]) => {
      const r = ws2.addRow([label, value, unit])
      r.getCell(1).style = labelStyle()
      r.getCell(2).style = unit === "%" ? pctStyle() : numStyle()
      r.getCell(3).style = { font: { color: { argb: "FF94a3b8" }, size: 9 } }
    })
    ws2.addRow([])
  })

  // WACC Final
  const wfRow = ws2.addRow(["WACC FINAL", wacc?.wacc, "%"])
  wfRow.getCell(1).style = {
    font: { bold: true, color: { argb: `FF${WHITE}` }, size: 12 },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: `FF${NAVY}` } },
  }
  wfRow.getCell(2).style = {
    ...totalStyle(),
    numFmt: "0.00%",
  }
  ws2.getRow(wfRow.number).height = 28

  // ═══════════════════════════════════════════════════════════
  // ONGLET 3 — MODÈLE DCF
  // ═══════════════════════════════════════════════════════════
  const ws3 = wb.addWorksheet("Modèle DCF", {
    properties: { tabColor: { argb: `FF${TEAL}` } }
  })

  ws3.columns = [
    { width: 32 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
  ]

  ws3.mergeCells("A1:H1")
  const t3 = ws3.getCell("A1")
  t3.value = `${company?.name ?? "Entreprise"} — Modèle DCF`
  Object.assign(t3, titleStyle())
  ws3.getRow(1).height = 30

  ws3.addRow([])

  const waccRate = wacc?.wacc ?? 0.095
  const g = 0.02
  const years = [2025, 2026, 2027, 2028, 2029]
  const latest = financials[financials.length - 1]
  const oldest = financials[0]
  const nYears = latest.fiscal_year - oldest.fiscal_year
  const cagr = Math.pow(latest.revenue / oldest.revenue, 1 / nYears) - 1

  // En-têtes années
  const yHeader = ws3.addRow(["", "Hypothèses", "2024A", ...years.map(y => `${y}F`)])
  yHeader.eachCell(cell => Object.assign(cell, headerStyle()))
  ws3.getRow(yHeader.number).height = 22

  // Ligne n
  const nRow = ws3.addRow(["n", "", 0, ...years.map((_, i) => i + 1)])
  nRow.eachCell((cell, col) => {
    cell.style = { font: { color: { argb: "FF94a3b8" }, size: 9 }, alignment: { horizontal: "center" } }
  })

  ws3.addRow([])

  // WACC et g en cellules référençables
  const waccRow = ws3.addRow(["WACC", "", waccRate])
  waccRow.getCell(1).style = labelStyle()
  waccRow.getCell(3).style = pctStyle()
  const waccCell = `C${waccRow.number}`

  const gRow = ws3.addRow(["Taux de croissance terminal (g)", "", g])
  gRow.getCell(1).style = labelStyle()
  gRow.getCell(3).style = pctStyle()
  const gCell = `C${gRow.number}`

  const cagrRow = ws3.addRow(["CAGR CA historique", "", cagr])
  cagrRow.getCell(1).style = labelStyle()
  cagrRow.getCell(3).style = pctStyle()

  ws3.addRow([])

  // FCF de base
  const baseFCFRow = ws3.addRow(["FCF de référence (2024A)", "", latest.fcf])
  baseFCFRow.getCell(1).style = labelStyle()
  baseFCFRow.getCell(3).style = numStyle()
  const baseFCFCell = `C${baseFCFRow.number}`

  // FCF projetés avec formules
  const fcfRow = ws3.addRow(["FCF projeté", ""])
  fcfRow.getCell(1).style = labelStyle()
  years.forEach((_, i) => {
    const col = i + 3
    const cell = fcfRow.getCell(col)
    if (i === 0) {
      cell.value = { formula: `${baseFCFCell}*(1+${cagrRow.getCell(3).address ?? waccCell})` }
    } else {
      const prevCol = String.fromCharCode(65 + col - 2)
      cell.value = { formula: `${prevCol}${fcfRow.number}*(1+C${cagrRow.number})` }
    }
    cell.style = numStyle()
  })

  // Facteurs d'actualisation avec formules
  const discRow = ws3.addRow(["Facteur d'actualisation", ""])
  discRow.getCell(1).style = labelStyle()
  years.forEach((_, i) => {
    const col = i + 3
    const cell = discRow.getCell(col)
    cell.value = { formula: `1/(1+${waccCell})^${i + 1}` }
    cell.style = { ...numStyle(), numFmt: "0.000" }
  })

  // FCF actualisés avec formules
  const pvRow = ws3.addRow(["FCF actualisé (PV)", ""])
  pvRow.getCell(1).style = { ...labelStyle(), font: { bold: true, color: { argb: `FF${TEAL}` }, size: 10 } }
  years.forEach((_, i) => {
    const col = i + 3
    const colLetter = String.fromCharCode(65 + col - 1)
    const cell = pvRow.getCell(col)
    cell.value = { formula: `${colLetter}${fcfRow.number}*${colLetter}${discRow.number}` }
    cell.style = { ...numStyle(TEAL), font: { bold: true, color: { argb: `FF${TEAL}` }, size: 10 } }
  })

  ws3.addRow([])

  // Somme PV FCFs
  const sumRow = ws3.addRow(["Somme PV FCFs", ""])
  sumRow.getCell(1).style = labelStyle()
  const firstCol = String.fromCharCode(65 + 2)
  const lastCol = String.fromCharCode(65 + years.length + 1)
  sumRow.getCell(3).value = { formula: `SUM(${firstCol}${pvRow.number}:${lastCol}${pvRow.number})` }
  sumRow.getCell(3).style = numStyle()
  const sumCell = `C${sumRow.number}`

  // Valeur terminale
  const tvRow = ws3.addRow(["Valeur terminale", ""])
  tvRow.getCell(1).style = labelStyle()
  tvRow.getCell(3).value = { formula: `${lastCol}${fcfRow.number}*(1+${gCell})/(${waccCell}-${gCell})` }
  tvRow.getCell(3).style = numStyle()
  const tvCell = `C${tvRow.number}`

  // PV valeur terminale
  const pvtvRow = ws3.addRow(["PV Valeur terminale", ""])
  pvtvRow.getCell(1).style = labelStyle()
  pvtvRow.getCell(3).value = { formula: `${tvCell}/(1+${waccCell})^${years.length}` }
  pvtvRow.getCell(3).style = numStyle()
  const pvtvCell = `C${pvtvRow.number}`

  ws3.addRow([])

  // Enterprise Value
  const evRow = ws3.addRow(["Enterprise Value (EV)", ""])
  evRow.getCell(1).style = { font: { bold: true, color: { argb: `FF${NAVY}` }, size: 11 } }
  evRow.getCell(3).value = { formula: `${sumCell}+${pvtvCell}` }
  evRow.getCell(3).style = totalStyle()
  ws3.getRow(evRow.number).height = 24
  const evCell = `C${evRow.number}`

  // Dette nette
  const debtRow = ws3.addRow(["(-) Dette nette", "", -(latest.net_debt ?? 0)])
  debtRow.getCell(1).style = labelStyle()
  debtRow.getCell(3).style = numStyle("ef4444")

  // Equity Value
  const eqRow = ws3.addRow(["Equity Value", ""])
  eqRow.getCell(1).style = { font: { bold: true, color: { argb: `FF${WHITE}` }, size: 12 } }
  eqRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${NAVY}` } }
  eqRow.getCell(3).value = { formula: `${evCell}+C${debtRow.number}` }
  eqRow.getCell(3).style = {
    ...totalStyle(),
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: `FF${NAVY}` } }
  }
  ws3.getRow(eqRow.number).height = 28

  // Génération
  const buffer = await wb.xlsx.writeBuffer()

  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Valoris_${company?.name?.replace(/ /g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx"`,
    }
  })
}