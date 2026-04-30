import { NextRequest, NextResponse } from "next/server"
import db from "../../../db"
import { calculateDCF } from "../../../dcf"

export async function GET(request: NextRequest) {
  const company_id = request.nextUrl.searchParams.get("company_id")
  if (!company_id) return NextResponse.json({ error: "company_id requis" }, { status: 400 })

  const company    = db.prepare("SELECT * FROM Company WHERE id = ?").get(company_id) as any
  const financials = db.prepare(
    "SELECT * FROM FinancialStatement WHERE company_id = ? ORDER BY fiscal_year ASC"
  ).all(company_id) as any[]
  const wacc = db.prepare(
    "SELECT * FROM WACCParameters WHERE company_id = ? AND scenario = 'base'"
  ).get(company_id) as any

  if (!financials.length) return NextResponse.json({ error: "Aucune donnée financière" }, { status: 404 })
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY non configurée" }, { status: 503 })
  }

  const latest   = financials[financials.length - 1]
  const waccRate = wacc?.wacc ?? 0.095
  const dcf      = calculateDCF(financials, { wacc: waccRate, terminal_growth_rate: 0.02, projection_years: 5 })

  const fmtM = (n: number | null | undefined): string => {
    if (n == null) return "N/D"
    const abs = Math.abs(n)
    if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M€`
    if (abs >= 1_000)     return `${Math.round(n / 1_000)} k€`
    return `${Math.round(n)} €`
  }
  const fmtPct = (n: number | null | undefined) =>
    n != null ? `${(n * 100).toFixed(1)}%` : "N/D"

  const historique = financials.map((f: any) => {
    const mb = f.revenue ? ((f.ebitda ?? 0) / f.revenue * 100).toFixed(1) : "?"
    const mn = f.revenue ? ((f.net_income ?? 0) / f.revenue * 100).toFixed(1) : "?"
    return `  • ${f.fiscal_year} : CA ${fmtM(f.revenue)}, EBITDA ${fmtM(f.ebitda)} (marge ${mb}%), RN ${fmtM(f.net_income)}, Dette nette ${fmtM(f.net_debt)}`
  }).join("\n")

  const prompt = `Tu es un analyste M&A spécialisé dans la valorisation de PME françaises non cotées.
Rédige un commentaire d'analyste structuré et professionnel sur la situation de l'entreprise suivante, en te basant sur les données financières et les résultats de la valorisation DCF.

ENTREPRISE : ${company?.name} — ${company?.sector}

HISTORIQUE FINANCIER :
${historique}

VALORISATION DCF (WACC ${fmtPct(waccRate)}, g terminal 2.0%) :
- Enterprise Value : ${fmtM(dcf.enterpriseValue)}
- Equity Value : ${fmtM(dcf.equityValue)}
- Multiple implicite EV/EBITDA : ${latest?.ebitda ? (dcf.enterpriseValue / latest.ebitda).toFixed(1) + "x" : "N/D"}
- CAGR CA historique : ${fmtPct(dcf.effectiveHyp.revenueGrowth)}
- FCF projetés N+1→N+5 : ${dcf.projectedFCFs.map(fmtM).join(" → ")}

WACC : β_R=${wacc?.beta_relevered?.toFixed(3) ?? "N/D"} | Ke=${fmtPct(wacc?.ke)} | Kd net=${fmtPct(wacc?.kd_net)}

Rédige un commentaire en TEXTE BRUT (pas de markdown, pas de JSON), structuré en 4 paragraphes courts :
1. Performance opérationnelle — tendances, points forts et points de vigilance
2. Structure financière — endettement, coût du capital, capacité de remboursement
3. Valorisation — lecture du DCF, multiple implicite, positionnement de marché
4. Points d'attention & recommandations — risques identifiés, leviers de création de valeur

Ton : professionnel, factuel, concis. Cite les chiffres clés. Maximum 300 mots.`

  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default
    const client = new Anthropic()
    const message = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    })
    const text = message.content[0].type === "text" ? message.content[0].text : ""
    return NextResponse.json({ text })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Erreur IA" }, { status: 500 })
  }
}
