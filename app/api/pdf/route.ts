import { NextResponse } from "next/server"
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

  const latest = financials[financials.length - 1]
  const prev = financials[financials.length - 2]
  const waccRate = wacc?.wacc ?? 0.095
  const g = 0.02

  // Calculs
  const oldest = financials[0]
  const nYears = latest.fiscal_year - oldest.fiscal_year
  const cagr = Math.pow(latest.revenue / oldest.revenue, 1 / nYears) - 1
  let fcf = latest.fcf ?? 0
  const years = [2025, 2026, 2027, 2028, 2029]
  const projectedFCFs = years.map(() => { fcf = fcf * (1 + cagr); return Math.round(fcf) })
  const pvFCFs = projectedFCFs.map((f, i) => Math.round(f / Math.pow(1 + waccRate, i + 1)))
  const sumPVFCF = pvFCFs.reduce((a, b) => a + b, 0)
  const terminalValue = Math.round(projectedFCFs[4] * (1 + g) / (waccRate - g))
  const pvTV = Math.round(terminalValue / Math.pow(1 + waccRate, 5))
  const ev = sumPVFCF + pvTV
  const equityValue = ev - (latest.net_debt ?? 0)

  const fmt = (n: number) => n ? new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n) + " €" : "-"
  const fmtM = (n: number) => n ? `${(n / 1_000_000).toFixed(1)} M€` : "-"
  const fmtPct = (n: number) => n ? `${(n * 100).toFixed(1)}%` : "-"
  const date = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; background: white; }
  
  /* COVER */
  .cover { background: #1a3a5c; color: white; padding: 60px 50px; min-height: 200px; }
  .cover-logo { font-size: 28px; font-weight: 700; letter-spacing: -0.5px; margin-bottom: 4px; }
  .cover-tagline { font-size: 12px; color: rgba(255,255,255,0.5); margin-bottom: 40px; }
  .cover-title { font-size: 22px; font-weight: 300; color: rgba(255,255,255,0.8); margin-bottom: 8px; }
  .cover-company { font-size: 36px; font-weight: 700; margin-bottom: 8px; }
  .cover-meta { font-size: 12px; color: rgba(255,255,255,0.5); }
  .cover-bar { height: 4px; background: #0d7a5f; margin-top: 30px; border-radius: 2px; }

  /* LAYOUT */
  .page { padding: 40px 50px; }
  .section { margin-bottom: 28px; }
  .section-title { font-size: 13px; font-weight: 700; color: #1a3a5c; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #1a3a5c; padding-bottom: 6px; margin-bottom: 14px; }

  /* CARDS */
  .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
  .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
  .card-label { font-size: 10px; color: #64748b; margin-bottom: 4px; }
  .card-value { font-size: 20px; font-weight: 700; color: #1a3a5c; }
  .card-sub { font-size: 9px; color: #94a3b8; margin-top: 2px; }
  .card.highlight { background: #1a3a5c; border-color: #1a3a5c; }
  .card.highlight .card-label { color: rgba(255,255,255,0.6); }
  .card.highlight .card-value { color: white; }
  .card.highlight .card-sub { color: rgba(255,255,255,0.4); }
  .card.teal { background: #0d7a5f; border-color: #0d7a5f; }
  .card.teal .card-label { color: rgba(255,255,255,0.6); }
  .card.teal .card-value { color: white; }

  /* TABLE */
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th { background: #1a3a5c; color: white; padding: 8px 10px; text-align: right; font-weight: 600; font-size: 10px; }
  th:first-child { text-align: left; }
  td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; text-align: right; }
  td:first-child { text-align: left; color: #475569; }
  tr:nth-child(even) td { background: #f8fafc; }
  tr.total td { background: #0d7a5f; color: white; font-weight: 700; }
  tr.subtotal td { background: #1a3a5c; color: white; font-weight: 600; }
  .negative { color: #ef4444 !important; }
  .positive { color: #0d7a5f !important; }

  /* WACC */
  .wacc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .wacc-item { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-size: 10px; }
  .wacc-label { color: #475569; }
  .wacc-value { font-weight: 600; color: #1a3a5c; }
  .wacc-final { background: #1a3a5c; color: white; padding: 10px 16px; border-radius: 6px; display: flex; justify-content: space-between; margin-top: 12px; font-weight: 700; font-size: 14px; }

  /* SENSIBILITÉ */
  .scenarios { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .scenario { border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; }
  .scenario-name { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 8px; }
  .scenario-wacc { font-size: 11px; color: #475569; margin-bottom: 4px; }
  .scenario-ev { font-size: 18px; font-weight: 700; color: #1a3a5c; }
  .scenario.base { border-color: #1a3a5c; background: #f8fafc; }

  /* FOOTER */
  .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 50px; display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8; margin-top: 20px; }
  .confidential { color: #ef4444; font-weight: 600; }
</style>
</head>
<body>

<!-- COVER -->
<div class="cover">
  <div class="cover-logo">Valoris</div>
  <div class="cover-tagline">Valorisation · M&A · PME Non cotées</div>
  <div class="cover-title">Rapport de valorisation</div>
  <div class="cover-company">${company?.name ?? "Entreprise"}</div>
  <div class="cover-meta">SIREN ${company?.siren} · ${company?.sector} · ${company?.legal_form} · ${date}</div>
  <div class="cover-bar"></div>
</div>

<div class="page">

  <!-- SYNTHÈSE -->
  <div class="section">
    <div class="section-title">Synthèse de la valorisation</div>
    <div class="cards">
      <div class="card highlight">
        <div class="card-label">Valeur d'entreprise (DCF)</div>
        <div class="card-value">${fmtM(ev)}</div>
        <div class="card-sub">WACC ${fmtPct(waccRate)} · g ${fmtPct(g)}</div>
      </div>
      <div class="card teal">
        <div class="card-label">Valeur des fonds propres</div>
        <div class="card-value">${fmtM(equityValue)}</div>
        <div class="card-sub">EV − Dette nette</div>
      </div>
      <div class="card">
        <div class="card-label">Multiple implicite EV/EBITDA</div>
        <div class="card-value">${latest.ebitda ? (ev / latest.ebitda).toFixed(1) + "x" : "-"}</div>
        <div class="card-sub">Exercice ${latest.fiscal_year}</div>
      </div>
    </div>
  </div>

  <!-- ÉTATS FINANCIERS -->
  <div class="section">
    <div class="section-title">États financiers historiques (M€)</div>
    <table>
      <thead>
        <tr>
          <th>Indicateur</th>
          ${financials.map(f => `<th>${f.fiscal_year}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Chiffre d'affaires</td>
          ${financials.map(f => `<td>${fmtM(f.revenue)}</td>`).join("")}
        </tr>
        <tr>
          <td>Marge brute</td>
          ${financials.map(f => `<td>${fmtM(f.gross_margin)}</td>`).join("")}
        </tr>
        <tr>
          <td>EBITDA</td>
          ${financials.map(f => `<td class="${f.ebitda < 0 ? 'negative' : ''}">${fmtM(f.ebitda)}</td>`).join("")}
        </tr>
        <tr>
          <td>EBIT</td>
          ${financials.map(f => `<td>${fmtM(f.ebit)}</td>`).join("")}
        </tr>
        <tr>
          <td>Résultat net</td>
          ${financials.map(f => `<td>${fmtM(f.net_income)}</td>`).join("")}
        </tr>
        <tr class="subtotal">
          <td>Marge EBITDA</td>
          ${financials.map(f => `<td>${fmtPct(f.ebitda / f.revenue)}</td>`).join("")}
        </tr>
        <tr class="subtotal">
          <td>Marge nette</td>
          ${financials.map(f => `<td>${fmtPct(f.net_income / f.revenue)}</td>`).join("")}
        </tr>
      </tbody>
    </table>
  </div>

  <!-- WACC -->
  <div class="section">
    <div class="section-title">Paramètres WACC</div>
    <div class="wacc-grid">
      <div>
        <div class="wacc-item"><span class="wacc-label">Bêta désendetté</span><span class="wacc-value">${wacc?.beta_unlevered?.toFixed(4) ?? "-"}</span></div>
        <div class="wacc-item"><span class="wacc-label">Bêta réendetté</span><span class="wacc-value">${wacc?.beta_relevered?.toFixed(4) ?? "-"}</span></div>
        <div class="wacc-item"><span class="wacc-label">Taux sans risque (Rf)</span><span class="wacc-value">${fmtPct(wacc?.risk_free_rate)}</span></div>
        <div class="wacc-item"><span class="wacc-label">Prime de marché</span><span class="wacc-value">${fmtPct(wacc?.market_premium)}</span></div>
      </div>
      <div>
        <div class="wacc-item"><span class="wacc-label">Prime de taille</span><span class="wacc-value">${fmtPct(wacc?.size_premium)}</span></div>
        <div class="wacc-item"><span class="wacc-label">Prime d'illiquidité</span><span class="wacc-value">${fmtPct(wacc?.illiquidity_premium)}</span></div>
        <div class="wacc-item"><span class="wacc-label">Coût fonds propres (Ke)</span><span class="wacc-value">${fmtPct(wacc?.ke)}</span></div>
        <div class="wacc-item"><span class="wacc-label">Coût de la dette (Kd net)</span><span class="wacc-value">${fmtPct(wacc?.kd_net)}</span></div>
      </div>
    </div>
    <div class="wacc-final">
      <span>WACC Final — Scénario Base</span>
      <span>${fmtPct(waccRate)}</span>
    </div>
  </div>

  <!-- DCF -->
  <div class="section">
    <div class="section-title">Modèle DCF — Projection des FCF</div>
    <table>
      <thead>
        <tr>
          <th>Année</th>
          ${years.map(y => `<th>${y}F</th>`).join("")}
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>FCF projeté</td>
          ${projectedFCFs.map(f => `<td>${fmtM(f)}</td>`).join("")}
          <td>—</td>
        </tr>
        <tr>
          <td>Facteur d'actualisation</td>
          ${years.map((_, i) => `<td>${(1 / Math.pow(1 + waccRate, i + 1)).toFixed(3)}</td>`).join("")}
          <td>—</td>
        </tr>
        <tr class="total">
          <td>FCF actualisé</td>
          ${pvFCFs.map(f => `<td>${fmtM(f)}</td>`).join("")}
          <td>${fmtM(sumPVFCF)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- BRIDGE EV → EQUITY -->
  <div class="section">
    <div class="section-title">Réconciliation EV → Equity Value</div>
    <table>
      <tbody>
        <tr><td>PV des FCF projetés (2025-2029)</td><td>${fmtM(sumPVFCF)}</td></tr>
        <tr><td>PV de la valeur terminale</td><td>${fmtM(pvTV)}</td></tr>
        <tr class="subtotal"><td>Enterprise Value</td><td>${fmtM(ev)}</td></tr>
        <tr><td class="negative">(-) Dette nette</td><td class="negative">-${fmtM(latest.net_debt)}</td></tr>
        <tr class="total"><td>Equity Value</td><td class="${equityValue >= 0 ? 'positive' : 'negative'}">${fmtM(equityValue)}</td></tr>
      </tbody>
    </table>
  </div>

  <!-- SENSIBILITÉ -->
  <div class="section">
    <div class="section-title">Analyse de sensibilité — 3 scénarios WACC</div>
    <div class="scenarios">
      ${[
        { name: "Pessimiste", wacc: 0.0999, cls: "" },
        { name: "Base", wacc: 0.095, cls: "base" },
        { name: "Optimiste", wacc: 0.0901, cls: "" },
      ].map(s => {
        let f = latest.fcf ?? 0
        const pFCFs = years.map(() => { f = f * (1 + cagr); return f })
        const pvs = pFCFs.map((fcf, i) => fcf / Math.pow(1 + s.wacc, i + 1))
        const sum = pvs.reduce((a, b) => a + b, 0)
        const tv = pFCFs[4] * (1 + g) / (s.wacc - g)
        const pvt = tv / Math.pow(1 + s.wacc, 5)
        const evS = sum + pvt
        return `
          <div class="scenario ${s.cls}">
            <div class="scenario-name">${s.name}</div>
            <div class="scenario-wacc">WACC ${(s.wacc * 100).toFixed(1)}%</div>
            <div class="scenario-ev">${fmtM(evS)}</div>
          </div>
        `
      }).join("")}
    </div>
  </div>

</div>

<!-- FOOTER -->
<div class="footer">
  <span class="confidential">CONFIDENTIEL</span>
  <span>Rapport généré par Valoris · ${date}</span>
  <span>Les projections sont basées sur des hypothèses et ne constituent pas une garantie de performance future.</span>
</div>

</body>
</html>
`

  // Génération PDF avec Puppeteer
  const puppeteer = await import("puppeteer")
  const browser = await puppeteer.default.launch({ 
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  })
  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: "networkidle0" })
  const pdf = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "0", right: "0", bottom: "0", left: "0" }
  })
  await browser.close()

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Valoris_${company?.name?.replace(/ /g, "_")}_${new Date().toISOString().split("T")[0]}.pdf"`,
    }
  })
}