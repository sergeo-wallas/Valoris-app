import { NextResponse } from "next/server"
import db from "../../../db"

/**
 * Endpoint AI — Recommandations stratégiques
 *
 * Connexion IA :
 *   Définir ANTHROPIC_API_KEY (ou AI_RECOMMENDATIONS_URL pour un service custom)
 *   dans .env.local pour activer la génération réelle.
 *   Sans clé → retourne des recommandations placeholder structurées.
 *
 * Format de sortie attendu par le PDF et le PPTX :
 *   { recommendations: Recommendation[] }
 *
 * Recommendation: {
 *   category: string      // "Opérationnel" | "Financier" | "Stratégique" | "Risques"
 *   title: string
 *   body: string
 *   priority: "haute" | "moyenne" | "faible"
 * }
 */

type Recommendation = {
  category: string
  title: string
  body: string
  priority: "haute" | "moyenne" | "faible"
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

  // ── Connexion IA réelle (si clé disponible) ─────────────────
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const Anthropic = (await import("@anthropic-ai/sdk")).default
      const client = new Anthropic()

      const { calculateDCF } = await import("../../../dcf")
      const sorted = [...financials].sort((a: any, b: any) => a.fiscal_year - b.fiscal_year)
      const latest = sorted[sorted.length - 1]
      const waccRate = wacc?.wacc ?? 0.095
      const dcf = calculateDCF(sorted, { wacc: waccRate, terminal_growth_rate: 0.02, projection_years: 5 })

      const fmtM = (n: number | null | undefined): string => {
        if (n == null) return "N/D"
        const abs = Math.abs(n)
        if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M€`
        if (abs >= 1_000)     return `${Math.round(n / 1_000)} k€`
        return `${Math.round(n)} €`
      }
      const fmtPct = (n: number | null | undefined): string =>
        n != null ? `${(n * 100).toFixed(1)}%` : "N/D"

      const historique = sorted.map((f: any) => {
        const mb = f.revenue ? ((f.ebitda ?? 0) / f.revenue * 100).toFixed(1) : "?"
        const mn = f.revenue ? ((f.net_income ?? 0) / f.revenue * 100).toFixed(1) : "?"
        return `  • ${f.fiscal_year} : CA ${fmtM(f.revenue)}, EBITDA ${fmtM(f.ebitda)} (marge ${mb}%), RN ${fmtM(f.net_income)} (marge ${mn}%), Dette nette ${fmtM(f.net_debt)}`
      }).join("\n")

      const prompt = `Tu es un expert en M&A et valorisation de PME françaises non cotées.
Analyse les données financières et de valorisation suivantes, puis génère 6 recommandations stratégiques pertinentes et personnalisées.

═══ ENTREPRISE ═══
Nom : ${company?.name}
Secteur : ${company?.sector}
Forme juridique : ${company?.legal_form ?? "N/D"}
SIREN : ${company?.siren ?? "N/D"}

═══ HISTORIQUE FINANCIER ═══
${historique}

═══ WACC (scénario base) ═══
- β désendetté : ${wacc?.beta_unlevered?.toFixed(3) ?? "N/D"} | β réendetté : ${wacc?.beta_relevered?.toFixed(3) ?? "N/D"}
- Rf : ${fmtPct(wacc?.rf)} | ERP : ${fmtPct(wacc?.erp)} | Prime taille : ${fmtPct(wacc?.size_premium)} | Prime illiquidité : ${fmtPct(wacc?.illiquidity_premium)}
- Ke : ${fmtPct(wacc?.ke)} | Kd net : ${fmtPct(wacc?.kd_net)}
- WACC final : ${fmtPct(waccRate)}

═══ VALORISATION DCF ═══
- Enterprise Value (EV) : ${fmtM(dcf.enterpriseValue)}
- Equity Value : ${fmtM(dcf.equityValue)}
- Multiple implicite EV/EBITDA : ${latest?.ebitda ? (dcf.enterpriseValue / latest.ebitda).toFixed(1) + "x" : "N/D"}
- CAGR CA historique : ${fmtPct(dcf.effectiveHyp.revenueGrowth)}
- Marge EBITDA projetée : ${fmtPct(dcf.effectiveHyp.ebitdaMargin)}
- FCF projetés (N+1 à N+5) : ${dcf.projectedFCFs.map(fmtM).join(" → ")}
- PV FCFs : ${fmtM(dcf.sumPVFCF)} | PV Valeur terminale : ${fmtM(dcf.pvTerminalValue)}

═══ INSTRUCTIONS ═══
Génère exactement 6 recommandations couvrant : performance opérationnelle, structure financière, création de valeur, risques, gouvernance/transmission, axes de croissance.
Chaque recommandation doit être concrète, chiffrée si possible, et directement liée aux données fournies.
Évite les formulations génériques — cite les chiffres spécifiques de l'entreprise.

Réponds UNIQUEMENT en JSON valide, sans texte avant ou après :
{
  "recommendations": [
    { "category": "Opérationnel|Financier|Stratégique|Risques", "title": "...", "body": "...", "priority": "haute|moyenne|faible" }
  ]
}`

      const message = await client.messages.create({
        model: "claude-opus-4-6",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }]
      })

      const text = message.content[0].type === "text" ? message.content[0].text : ""
      const json = JSON.parse(text)
      return NextResponse.json(json)
    } catch (err) {
      console.error("[AI recommendations] Erreur IA, fallback placeholder :", err)
    }
  }

  // ── Placeholder (sans clé IA) ────────────────────────────────
  const latest = financials[0]
  const ebitdaMargin = latest?.revenue ? (latest.ebitda / latest.revenue * 100).toFixed(1) : null
  const leverage = latest?.equity && latest?.net_debt ? (latest.net_debt / latest.equity).toFixed(1) : null

  const placeholder: Recommendation[] = [
    {
      category: "Opérationnel",
      title: "Optimisation de la marge EBITDA",
      body: ebitdaMargin
        ? `La marge EBITDA de ${ebitdaMargin}% présente un potentiel d'optimisation. Une revue des coûts fixes et une amélioration du mix produit/service pourraient dégager 1 à 2 points de marge supplémentaires à horizon 18 mois.`
        : "Une analyse approfondie des coûts opérationnels permettrait d'identifier des leviers d'optimisation de la marge.",
      priority: "haute",
    },
    {
      category: "Financier",
      title: "Structure de financement et levier",
      body: leverage
        ? `Avec un levier D/E de ${leverage}x, la structure financière ${parseFloat(leverage) > 2 ? "présente un niveau d'endettement à surveiller. Un désendettement progressif ou une recapitalisation partielle renforcerait la capacité d'investissement." : "est saine et offre une capacité d'endettement pour financer la croissance externe."}`
        : "La structure de financement devrait être optimisée en fonction des objectifs de croissance et de la capacité de remboursement.",
      priority: parseFloat(leverage ?? "0") > 2 ? "haute" : "moyenne",
    },
    {
      category: "Stratégique",
      title: "Axes de croissance à prioriser",
      body: `Dans le secteur ${company?.sector ?? "d'activité"}, les relais de croissance prioritaires sont : (1) le développement commercial sur les segments à forte valeur ajoutée, (2) l'accélération des investissements dans les outils de productivité, (3) l'exploration d'opportunités de croissance externe complémentaires.`,
      priority: "moyenne",
    },
    {
      category: "Risques",
      title: "Facteurs de risque à monitorer",
      body: `Les principaux risques identifiés sont : la concentration client (à évaluer), la dépendance aux conditions de marché du secteur ${company?.sector ?? ""}, et la sensibilité du WACC (${wacc ? (wacc.wacc * 100).toFixed(1) + "%" : "?"}) aux variations de taux d'intérêt. Un plan de mitigation formalisé est recommandé.`,
      priority: "haute",
    },
  ]

  return NextResponse.json({
    recommendations: placeholder,
    source: "placeholder",
    note: "Définir ANTHROPIC_API_KEY dans .env.local pour activer la génération IA réelle.",
  })
}
