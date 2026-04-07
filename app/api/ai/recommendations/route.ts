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

      const latest = financials[0]
      const prompt = `Tu es un expert en M&A et valorisation de PME françaises.
Analyse les données suivantes et génère 4 recommandations stratégiques structurées.

Entreprise : ${company?.name} (${company?.sector})
SIREN : ${company?.siren}
Dernier exercice (${latest?.fiscal_year}) :
- CA : ${latest?.revenue?.toLocaleString("fr-FR")} €
- EBITDA : ${latest?.ebitda?.toLocaleString("fr-FR")} € (marge ${latest?.revenue ? ((latest.ebitda / latest.revenue) * 100).toFixed(1) : "?"}%)
- Résultat net : ${latest?.net_income?.toLocaleString("fr-FR")} €
- Dette nette : ${latest?.net_debt?.toLocaleString("fr-FR")} €
- WACC : ${wacc ? (wacc.wacc * 100).toFixed(1) : "?"}%

Réponds UNIQUEMENT en JSON valide avec ce format exact :
{
  "recommendations": [
    { "category": "Opérationnel|Financier|Stratégique|Risques", "title": "...", "body": "...", "priority": "haute|moyenne|faible" }
  ]
}`

      const message = await client.messages.create({
        model: "claude-opus-4-6",
        max_tokens: 1024,
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
