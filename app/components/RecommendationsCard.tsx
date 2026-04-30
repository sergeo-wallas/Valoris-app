import { Sparkles, TrendingUp, Shield, Target, Building2, AlertTriangle } from "lucide-react"
import db from "../db"
import { calculateDCF } from "../dcf"

type Recommendation = {
  category: string
  title: string
  body: string
  priority: "haute" | "moyenne" | "faible"
}

const CATEGORY_STYLE: Record<string, {
  color: string; border: string; bg: string; badge: string; icon: React.ElementType
}> = {
  "Opérationnel": {
    color: "text-[#1a3a5c]", border: "border-[#1a3a5c]/15",
    bg: "bg-[#1a3a5c]/[0.03]", badge: "bg-[#1a3a5c]/10 text-[#1a3a5c]", icon: TrendingUp,
  },
  "Financier": {
    color: "text-[#0d7a5f]", border: "border-[#0d7a5f]/15",
    bg: "bg-[#0d7a5f]/[0.03]", badge: "bg-[#0d7a5f]/10 text-[#0d7a5f]", icon: Building2,
  },
  "Stratégique": {
    color: "text-violet-700", border: "border-violet-100",
    bg: "bg-violet-50/50", badge: "bg-violet-100 text-violet-700", icon: Target,
  },
  "Risques": {
    color: "text-red-600", border: "border-red-100",
    bg: "bg-red-50/50", badge: "bg-red-100 text-red-600", icon: AlertTriangle,
  },
}

const PRIORITY_BADGE: Record<string, string> = {
  haute:   "bg-red-50 text-red-600 border border-red-100",
  moyenne: "bg-amber-50 text-amber-600 border border-amber-100",
  faible:  "bg-emerald-50 text-emerald-700 border border-emerald-100",
}

async function getRecommendations(
  companyId: number
): Promise<{ recs: Recommendation[]; isAI: boolean }> {
  const company    = db.prepare("SELECT * FROM Company WHERE id = ?").get(companyId) as any
  const financials = db.prepare(
    "SELECT * FROM FinancialStatement WHERE company_id = ? ORDER BY fiscal_year ASC"
  ).all(companyId) as any[]
  const wacc = db.prepare(
    "SELECT * FROM WACCParameters WHERE company_id = ? AND scenario = 'base'"
  ).get(companyId) as any

  if (!financials.length) return { recs: [], isAI: false }

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

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const Anthropic = (await import("@anthropic-ai/sdk")).default
      const client    = new Anthropic()

      const historique = financials.map((f: any) => {
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
- Ke : ${fmtPct(wacc?.ke)} | Kd net : ${fmtPct(wacc?.kd_net)} | WACC : ${fmtPct(waccRate)}

═══ VALORISATION DCF ═══
- Enterprise Value : ${fmtM(dcf.enterpriseValue)}
- Equity Value : ${fmtM(dcf.equityValue)}
- Multiple implicite EV/EBITDA : ${latest?.ebitda ? (dcf.enterpriseValue / latest.ebitda).toFixed(1) + "x" : "N/D"}
- CAGR CA historique : ${fmtPct(dcf.effectiveHyp.revenueGrowth)}
- FCF projetés N+1→N+5 : ${dcf.projectedFCFs.map(fmtM).join(" → ")}

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
        messages: [{ role: "user", content: prompt }],
      })

      const text = message.content[0].type === "text" ? message.content[0].text : ""
      const json = JSON.parse(text)
      return { recs: json.recommendations ?? [], isAI: true }
    } catch {
      // fall through to placeholder
    }
  }

  // ── Placeholder sans clé IA ────────────────────────────────
  const ebitdaMargin = latest?.revenue
    ? (latest.ebitda / latest.revenue * 100).toFixed(1) : null
  const leverage = latest?.equity && latest?.equity > 0 && latest?.net_debt != null
    ? (latest.net_debt / latest.equity).toFixed(1) : null

  const placeholder: Recommendation[] = [
    {
      category: "Opérationnel",
      title: "Optimisation de la marge EBITDA",
      body: ebitdaMargin
        ? `La marge EBITDA de ${ebitdaMargin}% présente un potentiel d'amélioration. Une revue des coûts fixes et un meilleur mix produit/service pourraient dégager 1 à 2 points de marge supplémentaires à horizon 18 mois.`
        : "Une analyse approfondie des coûts opérationnels permettrait d'identifier des leviers de marge.",
      priority: "haute",
    },
    {
      category: "Financier",
      title: "Structure de financement",
      body: leverage
        ? `Avec un levier D/E de ${leverage}x, la structure financière ${parseFloat(leverage) > 2 ? "présente un endettement élevé. Un désendettement progressif renforcerait la capacité d'investissement." : "est saine et offre une capacité d'emprunt pour financer la croissance."}`
        : "La structure de financement doit être optimisée selon les objectifs de croissance.",
      priority: parseFloat(leverage ?? "0") > 2 ? "haute" : "moyenne",
    },
    {
      category: "Stratégique",
      title: "Axes de croissance à prioriser",
      body: `Dans le secteur ${company?.sector ?? "d'activité"}, les relais de croissance prioritaires sont : développement commercial sur les segments à forte valeur ajoutée, investissements en productivité, et exploration de la croissance externe.`,
      priority: "moyenne",
    },
    {
      category: "Risques",
      title: "Facteurs de risque à monitorer",
      body: `Les principaux risques identifiés : concentration client, sensibilité du WACC (${fmtPct(waccRate)}) aux variations de taux, et dépendance aux conditions de marché du secteur ${company?.sector ?? ""}. Un plan de mitigation formalisé est recommandé.`,
      priority: "haute",
    },
    {
      category: "Stratégique",
      title: "Valorisation et transmission",
      body: `L'Enterprise Value implicite de ${fmtM(dcf.enterpriseValue)} positionne l'entreprise dans une fourchette de marché. Une préparation à la transmission (data room, normalisation des comptes) permettrait d'optimiser le prix de cession.`,
      priority: "moyenne",
    },
    {
      category: "Opérationnel",
      title: "Pilotage du cash et du BFR",
      body: "Une amélioration du délai de recouvrement clients (DSO) et une optimisation des stocks contribueraient à libérer du cash opérationnel et à améliorer le FCF sans investissement supplémentaire.",
      priority: "faible",
    },
  ]

  return { recs: placeholder, isAI: false }
}

export default async function RecommendationsCard({ companyId }: { companyId: number }) {
  const { recs, isAI } = await getRecommendations(companyId)

  if (!recs.length) return null

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mt-6">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Analyse & Recommandations</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {isAI
              ? "Générées par l'agent IA Valoris · Claude Opus"
              : "Mode standard · Configurez ANTHROPIC_API_KEY pour une analyse IA personnalisée"}
          </p>
        </div>
        <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${
          isAI
            ? "bg-violet-50 text-violet-700 border-violet-100"
            : "bg-slate-50 text-slate-500 border-slate-100"
        }`}>
          <Sparkles size={11} />
          {isAI ? "IA" : "Standard"}
        </div>
      </div>

      {/* Grid recommandations */}
      <div className="p-5 grid grid-cols-2 gap-3">
        {recs.map((rec, i) => {
          const style = CATEGORY_STYLE[rec.category] ?? CATEGORY_STYLE["Opérationnel"]
          const Icon  = style.icon
          return (
            <div key={i} className={`rounded-xl border p-4 ${style.bg} ${style.border}`}>
              <div className="flex items-center justify-between mb-2.5">
                <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide ${style.color}`}>
                  <Icon size={11} />
                  {rec.category}
                </div>
                <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${PRIORITY_BADGE[rec.priority] ?? PRIORITY_BADGE.faible}`}>
                  {rec.priority}
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-900 mb-1.5 leading-snug">{rec.title}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{rec.body}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function RecommendationsCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mt-6">
      <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="h-4 w-52 bg-slate-100 rounded-lg animate-pulse" />
          <div className="h-3 w-72 bg-slate-50 rounded animate-pulse" />
        </div>
        <div className="h-6 w-20 bg-violet-50 rounded-full animate-pulse" />
      </div>
      <div className="p-5 grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="h-3 w-24 bg-slate-200 rounded animate-pulse" />
              <div className="h-4 w-14 bg-slate-100 rounded-full animate-pulse" />
            </div>
            <div className="h-4 w-3/4 bg-slate-200 rounded animate-pulse mb-2" />
            <div className="space-y-1.5">
              <div className="h-3 w-full bg-slate-100 rounded animate-pulse" />
              <div className="h-3 w-5/6 bg-slate-100 rounded animate-pulse" />
              <div className="h-3 w-4/6 bg-slate-100 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
