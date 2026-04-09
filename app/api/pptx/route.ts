import { NextResponse } from "next/server"
import db from "../../db"
import PptxGenJS from "pptxgenjs"
import { calculateDCF } from "../../dcf"

const NAVY  = "1A3A5C"
const TEAL  = "0D7A5F"
const LIGHT = "F4F7FB"
const WHITE = "FFFFFF"
const SLATE = "64748B"
const DARK  = "1E293B"

function fmtM(n: number | null | undefined) {
  if (n == null) return "N/A"
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M€`
  if (abs >= 1_000)     return `${Math.round(n / 1_000)} k€`
  return `${Math.round(n)} €`
}
function fmtPct(n: number | null | undefined) {
  if (!n) return "N/A"
  return `${(n * 100).toFixed(1)}%`
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const company_id = searchParams.get("company_id") ?? "1"

  const company    = db.prepare("SELECT * FROM Company WHERE id = ?").get(company_id) as any
  const financials = db.prepare(
    "SELECT * FROM FinancialStatement WHERE company_id = ? ORDER BY fiscal_year DESC"
  ).all(company_id) as any[]
  const wacc = db.prepare(
    "SELECT * FROM WACCParameters WHERE company_id = ? AND scenario = 'base'"
  ).get(company_id) as any

  const latest = financials[0]
  const prev   = financials[1]
  const date   = new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" })

  // ── Récupération du contenu IA (ou placeholder) ─────────────
  let pitchSlides: any[] = []
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
    const res = await fetch(
      `${baseUrl}/api/ai/pitch?company_id=${company_id}`,
      { signal: AbortSignal.timeout(15000) }
    )
    if (res.ok) {
      const data = await res.json()
      pitchSlides = data.slides ?? []
    }
  } catch { /* fallback silencieux */ }

  // ── Construction du PPTX ─────────────────────────────────────
  const pptx = new PptxGenJS()
  pptx.layout  = "LAYOUT_WIDE"
  pptx.author  = "Valoris"
  pptx.company = "Valoris"
  pptx.title   = `${company?.name ?? "Entreprise"} — Pitch Deck`

  // Helper : fond coloré pleine slide
  function addBg(slide: any, color: string) {
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: "100%", fill: { color } })
  }

  // ── SLIDE 1 : COVER ─────────────────────────────────────────
  const s1 = pptx.addSlide()
  addBg(s1, NAVY)

  // Bande teal en bas
  s1.addShape(pptx.ShapeType.rect, { x: 0, y: 5.5, w: "100%", h: 0.08, fill: { color: TEAL } })

  // Logo / nom app
  s1.addText("VALORIS", {
    x: 0.5, y: 0.3, w: 3, h: 0.4,
    fontSize: 13, bold: true, color: WHITE, transparency: 40,
    fontFace: "Helvetica Neue",
  })

  // Nom entreprise
  s1.addText(company?.name ?? "Entreprise", {
    x: 0.5, y: 1.4, w: 9, h: 1.2,
    fontSize: 44, bold: true, color: WHITE,
    fontFace: "Helvetica Neue",
  })

  // Secteur + forme juridique
  s1.addText(`${company?.sector ?? ""} · ${company?.legal_form ?? ""}`, {
    x: 0.5, y: 2.7, w: 9, h: 0.4,
    fontSize: 16, color: WHITE, transparency: 40,
  })

  // Type de document
  s1.addText("Pitch Deck · Valorisation M&A", {
    x: 0.5, y: 3.4, w: 6, h: 0.35,
    fontSize: 13, color: TEAL, bold: true,
  })

  // Date + SIREN
  s1.addText(`${date}  ·  SIREN ${company?.siren ?? ""}`, {
    x: 0.5, y: 5.2, w: 9, h: 0.3,
    fontSize: 10, color: WHITE, transparency: 55,
  })

  // ── SLIDE 2 : RÉSUMÉ EXÉCUTIF ────────────────────────────────
  const s2 = pptx.addSlide()
  addBg(s2, LIGHT)
  s2.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.08, h: "100%", fill: { color: NAVY } })

  s2.addText("Résumé exécutif", {
    x: 0.4, y: 0.3, w: 12, h: 0.5,
    fontSize: 22, bold: true, color: NAVY,
  })

  // Bullets depuis le contenu IA
  const execSlide = pitchSlides.find((s: any) => s.id === "executive-summary")
  const execBullets = execSlide?.bullets ?? [
    `${company?.name} — ${company?.sector}`,
    `CA : ${fmtM(latest?.revenue)}`,
    `EBITDA : ${fmtM(latest?.ebitda)}`,
    "Opportunité d'investissement à préciser",
  ]

  s2.addText(execBullets.map((b: string) => ({ text: b, options: { bullet: { type: "bullet" } } })), {
    x: 0.5, y: 1.1, w: 5.5, h: 4,
    fontSize: 13, color: DARK, lineSpacingMultiple: 1.6,
  })

  // KPI box droite
  const kpis = [
    { label: "Chiffre d'affaires", value: fmtM(latest?.revenue) },
    { label: "EBITDA",             value: fmtM(latest?.ebitda) },
    { label: "Marge EBITDA",       value: latest?.revenue ? fmtPct(latest.ebitda / latest.revenue) : "N/A" },
    { label: "WACC",               value: fmtPct(wacc?.wacc) },
  ]

  kpis.forEach((kpi, i) => {
    const yPos = 1.1 + i * 1.1
    s2.addShape(pptx.ShapeType.roundRect, {
      x: 6.5, y: yPos, w: 5.5, h: 0.9,
      fill: { color: WHITE },
      line: { color: "E2E8F0", width: 1 },
      rectRadius: 0.1,
    })
    s2.addText(kpi.label, { x: 6.8, y: yPos + 0.07, w: 3, h: 0.3, fontSize: 9, color: SLATE })
    s2.addText(kpi.value, { x: 6.8, y: yPos + 0.37, w: 4.8, h: 0.45, fontSize: 20, bold: true, color: NAVY })
  })

  // ── SLIDE 3 : PERFORMANCE FINANCIÈRE ────────────────────────
  const s3 = pptx.addSlide()
  addBg(s3, WHITE)
  s3.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 1.1, fill: { color: NAVY } })

  s3.addText("Performance financière", {
    x: 0.5, y: 0.25, w: 12, h: 0.6,
    fontSize: 22, bold: true, color: WHITE,
  })
  s3.addText(`Exercice ${latest?.fiscal_year}`, {
    x: 0.5, y: 0.72, w: 12, h: 0.3,
    fontSize: 11, color: WHITE, transparency: 40,
  })

  // Tableau financier
  const tableData = [
    [{ text: "Indicateur", options: { bold: true, color: WHITE, fill: NAVY } },
     ...financials.slice(0, 3).reverse().map((f: any) => ({
       text: String(f.fiscal_year), options: { bold: true, color: WHITE, fill: NAVY, align: "center" }
     }))],
    ...([
      { label: "Chiffre d'affaires", key: "revenue" },
      { label: "EBITDA",             key: "ebitda" },
      { label: "Marge EBITDA",       key: null },
      { label: "Résultat net",       key: "net_income" },
      { label: "FCF",                key: "fcf" },
      { label: "Dette nette",        key: "net_debt" },
    ].map((row, i) => [
      { text: row.label, options: { color: DARK, fill: i % 2 === 0 ? "F8FAFC" : WHITE } },
      ...financials.slice(0, 3).reverse().map((f: any) => {
        const val = row.key === null
          ? (f.revenue ? `${((f.ebitda / f.revenue) * 100).toFixed(1)}%` : "—")
          : fmtM(f[row.key])
        return { text: val, options: { align: "right", color: DARK, fill: i % 2 === 0 ? "F8FAFC" : WHITE } }
      }),
    ]))
  ]

  s3.addTable(tableData as any, {
    x: 0.5, y: 1.3, w: 11.5,
    fontSize: 11,
    border: { type: "solid", color: "E2E8F0", pt: 0.5 },
    rowH: 0.48,
  })

  // ── SLIDE 4 : VALORISATION DCF ──────────────────────────────
  const s4 = pptx.addSlide()
  addBg(s4, LIGHT)
  s4.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 1.1, fill: { color: TEAL } })

  s4.addText("Valorisation DCF", {
    x: 0.5, y: 0.25, w: 12, h: 0.6,
    fontSize: 22, bold: true, color: WHITE,
  })
  s4.addText(`WACC ${fmtPct(wacc?.wacc)}  ·  g = 2.0%  ·  Horizon 5 ans`, {
    x: 0.5, y: 0.72, w: 12, h: 0.3,
    fontSize: 11, color: WHITE, transparency: 30,
  })

  const waccRate = wacc?.wacc ?? 0.095
  const g = 0.02
  const dcf = calculateDCF(financials, { wacc: waccRate, terminal_growth_rate: g, projection_years: 5 })
  const { sumPVFCF: sumPV, pvTerminalValue: pvTV, enterpriseValue: ev, equityValue } = dcf

  const dcfKpis = [
    { label: "PV FCFs projetés",   value: fmtM(sumPV),       color: NAVY },
    { label: "PV Valeur terminale",value: fmtM(pvTV),        color: NAVY },
    { label: "Enterprise Value",   value: fmtM(ev),          color: NAVY },
    { label: "Equity Value",       value: fmtM(equityValue), color: TEAL },
  ]

  dcfKpis.forEach((kpi, i) => {
    const isTotalEV = i === 2
    const isEquity  = i === 3
    s4.addShape(pptx.ShapeType.roundRect, {
      x: 0.4 + i * 3.05, y: 1.3, w: 2.9, h: 1.4,
      fill: { color: isTotalEV ? NAVY : isEquity ? TEAL : WHITE },
      line: { color: isTotalEV || isEquity ? "transparent" : "E2E8F0", width: 1 },
      rectRadius: 0.12,
    })
    s4.addText(kpi.label, {
      x: 0.5 + i * 3.05, y: 1.45, w: 2.7, h: 0.35,
      fontSize: 9, color: isTotalEV || isEquity ? WHITE : SLATE, transparency: isTotalEV || isEquity ? 30 : 0,
    })
    s4.addText(kpi.value, {
      x: 0.5 + i * 3.05, y: 1.85, w: 2.7, h: 0.7,
      fontSize: 22, bold: true, color: isTotalEV || isEquity ? WHITE : NAVY,
    })
  })

  // Scénarios WACC depuis la DB
  const getScenarioWacc = (scenario: string, fallbackDelta: number) => {
    const sc: any = db.prepare(
      "SELECT wacc FROM WACCParameters WHERE company_id = ? AND scenario = ?"
    ).get(company_id, scenario)
    return sc?.wacc ?? (waccRate + fallbackDelta)
  }
  const scenarios = [
    { label: "Pessimiste", wacc: getScenarioWacc("pessimiste", 0.02) },
    { label: "Base",       wacc: getScenarioWacc("base", 0) },
    { label: "Optimiste",  wacc: getScenarioWacc("optimiste", -0.015) },
  ]

  s4.addText("Analyse de sensibilité WACC", {
    x: 0.4, y: 3.0, w: 12, h: 0.35,
    fontSize: 12, bold: true, color: NAVY,
  })

  scenarios.forEach((sc, i) => {
    const scDcf = calculateDCF(financials, { wacc: sc.wacc, terminal_growth_rate: g, projection_years: 5 })
    const ev2 = scDcf.enterpriseValue

    const isBase = i === 1
    s4.addShape(pptx.ShapeType.roundRect, {
      x: 0.4 + i * 4.0, y: 3.5, w: 3.8, h: 1.8,
      fill: { color: isBase ? NAVY : WHITE },
      line: { color: isBase ? NAVY : "E2E8F0", width: isBase ? 0 : 1 },
      rectRadius: 0.1,
    })
    s4.addText(sc.label, {
      x: 0.5 + i * 4.0, y: 3.65, w: 3.6, h: 0.35,
      fontSize: 10, bold: true, color: isBase ? WHITE : SLATE, transparency: isBase ? 30 : 0,
    })
    s4.addText(`WACC ${(sc.wacc * 100).toFixed(1)}%`, {
      x: 0.5 + i * 4.0, y: 3.95, w: 3.6, h: 0.3,
      fontSize: 10, color: isBase ? WHITE : SLATE, transparency: isBase ? 40 : 0,
    })
    s4.addText(fmtM(ev2), {
      x: 0.5 + i * 4.0, y: 4.3, w: 3.6, h: 0.7,
      fontSize: 24, bold: true, color: isBase ? WHITE : NAVY,
    })
  })

  // ── SLIDE 5 : RECOMMANDATIONS IA ────────────────────────────
  const s5 = pptx.addSlide()
  addBg(s5, WHITE)
  s5.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 1.1, fill: { color: "0A1929" } })

  s5.addText("Recommandations stratégiques", {
    x: 0.5, y: 0.22, w: 10, h: 0.55,
    fontSize: 22, bold: true, color: WHITE,
  })
  s5.addText("Générées par l'agent IA Valoris", {
    x: 0.5, y: 0.72, w: 10, h: 0.3,
    fontSize: 11, color: TEAL,
  })

  // Fetch recommandations
  let recos: any[] = []
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
    const recoRes = await fetch(
      `${baseUrl}/api/ai/recommendations?company_id=${company_id}`,
      { signal: AbortSignal.timeout(10000) }
    )
    if (recoRes.ok) {
      const d = await recoRes.json()
      recos = d.recommendations ?? []
    }
  } catch { /* silencieux */ }

  const catColors: Record<string, string> = {
    "Opérationnel": NAVY, "Financier": TEAL, "Stratégique": "7C3AED", "Risques": "DC2626"
  }
  const priorityColors: Record<string, string> = {
    haute: "EF4444", moyenne: "F59E0B", faible: TEAL
  }

  recos.slice(0, 4).forEach((r: any, i: number) => {
    const col = i % 2
    const row = Math.floor(i / 2)
    const x = 0.4 + col * 6.2
    const y = 1.3 + row * 2.5

    s5.addShape(pptx.ShapeType.roundRect, {
      x, y, w: 6.0, h: 2.3,
      fill: { color: "F8FAFC" },
      line: { color: "E2E8F0", width: 1 },
      rectRadius: 0.1,
    })
    // Bande couleur catégorie
    s5.addShape(pptx.ShapeType.rect, {
      x, y, w: 6.0, h: 0.06,
      fill: { color: catColors[r.category] ?? NAVY },
    })
    s5.addText(r.category, {
      x: x + 0.2, y: y + 0.12, w: 3, h: 0.3,
      fontSize: 8, bold: true, color: catColors[r.category] ?? NAVY,
    })
    s5.addText(`● ${r.priority}`, {
      x: x + 3.5, y: y + 0.12, w: 2.3, h: 0.3,
      fontSize: 8, color: priorityColors[r.priority] ?? SLATE, align: "right",
    })
    s5.addText(r.title, {
      x: x + 0.2, y: y + 0.5, w: 5.6, h: 0.45,
      fontSize: 12, bold: true, color: DARK,
    })
    s5.addText(r.body, {
      x: x + 0.2, y: y + 1.0, w: 5.6, h: 1.2,
      fontSize: 9, color: SLATE, wrap: true,
    })
  })

  // ── SLIDE 6 : PROCHAINES ÉTAPES ─────────────────────────────
  const s6 = pptx.addSlide()
  addBg(s6, NAVY)
  s6.addShape(pptx.ShapeType.rect, { x: 0, y: 5.5, w: "100%", h: 0.08, fill: { color: TEAL } })

  s6.addText("Prochaines étapes", {
    x: 0.5, y: 0.8, w: 12, h: 0.8,
    fontSize: 32, bold: true, color: WHITE,
  })

  const nextStepSlide = pitchSlides.find((s: any) => s.id === "investment")
  const steps = nextStepSlide?.bullets ?? [
    "Signature de la NDA",
    "Remise du mémorandum d'information",
    "Phase de due diligence",
    "Remise des offres indicatives (LOI)",
    "Négociation et closing",
  ]

  steps.forEach((step: string, i: number) => {
    s6.addShape(pptx.ShapeType.ellipse, {
      x: 0.5, y: 1.9 + i * 0.72, w: 0.35, h: 0.35,
      fill: { color: TEAL },
    })
    s6.addText(String(i + 1), {
      x: 0.5, y: 1.88 + i * 0.72, w: 0.35, h: 0.35,
      fontSize: 10, bold: true, color: WHITE, align: "center",
    })
    s6.addText(step, {
      x: 1.1, y: 1.9 + i * 0.72, w: 11, h: 0.35,
      fontSize: 14, color: WHITE,
    })
  })

  s6.addText(`${company?.name ?? ""}  ·  Confidentiel  ·  ${date}`, {
    x: 0.5, y: 5.55, w: 12, h: 0.3,
    fontSize: 9, color: WHITE, transparency: 55, align: "center",
  })

  // ── Export buffer ────────────────────────────────────────────
  const buffer = await pptx.write({ outputType: "nodebuffer" })
  const blob = new Blob([buffer as unknown as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  })

  return new NextResponse(blob, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="Valoris_${(company?.name ?? "pitch").replace(/ /g, "_")}_${new Date().toISOString().split("T")[0]}.pptx"`,
    },
  })
}
