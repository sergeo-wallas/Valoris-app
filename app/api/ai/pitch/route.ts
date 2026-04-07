import { NextResponse } from "next/server"
import db from "../../../db"

/**
 * Endpoint AI — Génération de contenu pitch deck
 *
 * Connexion IA / service externe :
 *   Option A : Définir ANTHROPIC_API_KEY → génération via Claude
 *   Option B : Définir PITCH_SERVICE_URL + PITCH_SERVICE_KEY → service tiers (Gamma, Beautiful.ai, etc.)
 *   Sans clé → retourne du contenu placeholder structuré.
 *
 * Format de sortie attendu par le PPTX :
 *   { slides: Slide[] }
 *
 * Slide: {
 *   id: string
 *   title: string
 *   bullets?: string[]
 *   highlight?: string     // chiffre clé mis en avant
 *   note?: string          // note speaker
 * }
 */

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
  const fmtM = (n: number) => n ? `${(n / 1_000_000).toFixed(1)} M€` : "N/A"
  const fmtPct = (n: number) => n ? `${(n * 100).toFixed(1)}%` : "N/A"

  // ── Option B : Service externe (Gamma, Beautiful.ai, etc.) ──
  if (process.env.PITCH_SERVICE_URL && process.env.PITCH_SERVICE_KEY) {
    try {
      const res = await fetch(process.env.PITCH_SERVICE_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.PITCH_SERVICE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ company, financials, wacc }),
      })
      if (res.ok) return NextResponse.json(await res.json())
    } catch (err) {
      console.error("[AI pitch] Service externe inaccessible, fallback :", err)
    }
  }

  // ── Option A : Génération via Claude ────────────────────────
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const Anthropic = (await import("@anthropic-ai/sdk")).default
      const client = new Anthropic()

      const prompt = `Tu es un expert en pitch M&A. Génère le contenu d'un pitch deck en JSON pour :
Entreprise : ${company?.name} (${company?.sector})
CA : ${fmtM(latest?.revenue)} | EBITDA : ${fmtM(latest?.ebitda)} | EV estimée : N/A | WACC : ${fmtPct(wacc?.wacc)}

Format JSON strict :
{
  "slides": [
    { "id": "string", "title": "string", "bullets": ["string"], "highlight": "string", "note": "string" }
  ]
}
Génère 6 slides : résumé exécutif, entreprise, marché, performance financière, valorisation, investissement.`

      const message = await client.messages.create({
        model: "claude-opus-4-6",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }]
      })

      const text = message.content[0].type === "text" ? message.content[0].text : ""
      return NextResponse.json(JSON.parse(text))
    } catch (err) {
      console.error("[AI pitch] Erreur Claude, fallback placeholder :", err)
    }
  }

  // ── Placeholder structuré ────────────────────────────────────
  return NextResponse.json({
    source: "placeholder",
    note: "Définir ANTHROPIC_API_KEY ou PITCH_SERVICE_URL/PITCH_SERVICE_KEY pour activer la génération IA.",
    slides: [
      {
        id: "executive-summary",
        title: "Résumé exécutif",
        bullets: [
          `${company?.name} — ${company?.sector}`,
          `Chiffre d'affaires : ${fmtM(latest?.revenue)}`,
          `EBITDA : ${fmtM(latest?.ebitda)} (marge ${latest?.revenue ? ((latest.ebitda / latest.revenue) * 100).toFixed(1) : "?"}%)`,
          "Opportunité d'investissement attractive dans un secteur en croissance",
        ],
        highlight: fmtM(latest?.revenue),
        note: "Présenter le contexte de la transaction et la thèse d'investissement en 2 minutes.",
      },
      {
        id: "company",
        title: "Présentation de l'entreprise",
        bullets: [
          `Secteur : ${company?.sector ?? "N/A"}`,
          `Forme juridique : ${company?.legal_form ?? "N/A"}`,
          `SIREN : ${company?.siren}`,
          "Positionnement différenciant à compléter",
          "Équipe dirigeante à présenter",
        ],
        note: "Détailler le modèle économique, les clients clés et le positionnement concurrentiel.",
      },
      {
        id: "market",
        title: "Marché & opportunité",
        bullets: [
          "Taille du marché adressable (TAM) à renseigner",
          "Croissance annuelle du marché à renseigner",
          "Parts de marché cibles",
          "Tendances structurelles favorables",
          "Barrières à l'entrée",
        ],
        note: "Sourcer les données de marché auprès de rapports sectoriels (INSEE, Xerfi, etc.).",
      },
      {
        id: "financials",
        title: "Performance financière",
        bullets: [
          `CA ${latest?.fiscal_year} : ${fmtM(latest?.revenue)}`,
          `EBITDA : ${fmtM(latest?.ebitda)} — Marge ${latest?.revenue ? ((latest.ebitda / latest.revenue) * 100).toFixed(1) : "?"}%`,
          `Résultat net : ${fmtM(latest?.net_income)}`,
          `FCF : ${fmtM(latest?.fcf)}`,
          `Dette nette : ${fmtM(latest?.net_debt)}`,
        ],
        highlight: `Marge EBITDA ${latest?.revenue ? ((latest.ebitda / latest.revenue) * 100).toFixed(1) : "?"}%`,
        note: "Insister sur la récurrence et la qualité des revenus.",
      },
      {
        id: "valuation",
        title: "Valorisation",
        bullets: [
          `Méthode : DCF (Discounted Cash Flows)`,
          `WACC : ${fmtPct(wacc?.wacc)}`,
          `Taux de croissance terminal : 2.0%`,
          "Sensibilité ±100 bps WACC à présenter",
          "Comparaison avec les multiples sectoriels",
        ],
        note: "Présenter la fourchette de valorisation et les hypothèses clés.",
      },
      {
        id: "investment",
        title: "Opportunité d'investissement",
        bullets: [
          "Structure de la transaction à définir",
          "Equity / Debt split",
          "TRI cible et durée de détention",
          "Valeur créée : plan de croissance 3-5 ans",
          "Stratégie de sortie",
        ],
        note: "Conclure sur la thèse d'investissement et les prochaines étapes (LOI, DD).",
      },
    ],
  })
}
