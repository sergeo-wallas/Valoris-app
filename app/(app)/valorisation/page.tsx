import { calculateDCF } from "../../dcf"
import { computeESGResult } from "../../lib/esg"
import DCFCalculator from "../../components/DCFCalculator"
import { Download, FileSpreadsheet, Building2, Presentation } from "lucide-react"
import db from "../../db"

export default async function Valorisation({
  searchParams,
}: {
  searchParams: Promise<{ company_id?: string }>
}) {
  const sp = await searchParams
  const companyId = sp.company_id ? parseInt(sp.company_id) : null

  const company: any = companyId
    ? db.prepare("SELECT * FROM Company WHERE id = ?").get(companyId)
    : null

  if (!company) {
    return (
      <main className="flex-1 bg-[#f4f7fb] p-8 flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center max-w-lg">
          <Building2 size={28} className="text-slate-300 mx-auto mb-5" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Entreprise introuvable</h2>
          <p className="text-slate-400 text-sm mb-6">Sélectionnez une entreprise depuis le workspace.</p>
          <a href="/workspace" className="inline-flex items-center gap-2 bg-[#1a3a5c] text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-[#0f2a45] transition-all shadow-sm">
            Aller au workspace
          </a>
        </div>
      </main>
    )
  }

  const financials = db.prepare(
    "SELECT * FROM FinancialStatement WHERE company_id = ? ORDER BY fiscal_year DESC"
  ).all(companyId) as any[]

  const waccData: any = db.prepare(
    "SELECT * FROM WACCParameters WHERE company_id = ? AND scenario = 'base'"
  ).get(companyId) ?? { wacc: 0.095, scenario: "base" }

  if (financials.length === 0) {
    return (
      <main className="flex-1 bg-[#f4f7fb] p-8 flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center max-w-lg">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-5">
            <span className="text-3xl">📊</span>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Données financières manquantes</h2>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            Ajoutez des états financiers pour générer la valorisation de {company.name}.
          </p>
          <a href="/analyse" className="inline-flex items-center gap-2 bg-[#1a3a5c] text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-[#0f2a45] transition-all shadow-sm">
            Compléter les données →
          </a>
        </div>
      </main>
    )
  }

  // ── Score ESG → ajustement CAGR ──────────────────────────────────────────
  const fiscalYear = new Date().getFullYear()
  const esgCriteria: any[] = db.prepare(
    "SELECT * FROM ESGCriteria WHERE company_id = ? AND fiscal_year = ?"
  ).all(companyId, fiscalYear)
  const { growthAdj: esgGrowthAdj } = computeESGResult(esgCriteria)

  const params = {
    wacc: waccData.wacc,
    terminal_growth_rate: 0.02,
    projection_years: 5,
  }

  const dcf = calculateDCF(financials, params)

  const latest = financials[0]
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: params.projection_years }, (_, i) => currentYear + i + 1)

  const formatPct = (n: number) => `${(n * 100).toFixed(1)}%`
  const formatM = (n: number | null | undefined): string => {
    if (n == null || isNaN(n)) return "—"
    const abs = Math.abs(n)
    if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M€`
    if (abs >= 1_000)     return `${Math.round(n / 1_000)} k€`
    return `${Math.round(n)} €`
  }

  const displayParams = [
    { label: "WACC base",           value: formatPct(waccData.wacc), sub: "Taux d'actualisation" },
    { label: "Croissance terminale", value: "2.0%",                   sub: "Taux perpétuel g" },
    { label: "FCF de référence",    value: formatM(dcf.baseFCF),      sub: "Free Cash Flow N" },
    { label: "CAGR historique",     value: `${dcf.cagr}%`,            sub: "Croissance observée" },
  ]

  return (
    <main className="flex-1 bg-[#f4f7fb] p-8">

      {/* HEADER */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Valorisation</h1>
          <p className="text-slate-400 text-sm mt-1">{company.name} · Modèle DCF · Scénario base</p>
        </div>
        <div className="flex gap-2">
          <a
            href={`/api/pdf?company_id=${companyId}`}
            target="_blank"
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1a3a5c] text-white text-sm font-medium rounded-xl hover:bg-[#0f2a45] transition-all shadow-sm hover:shadow-md"
          >
            <Download size={14} />
            Rapport PDF
          </a>
          <a
            href={`/api/export?company_id=${companyId}`}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-[#0d7a5f] text-sm font-medium rounded-xl hover:bg-slate-50 transition-all shadow-sm border border-[#0d7a5f]/20 hover:border-[#0d7a5f]/40"
          >
            <FileSpreadsheet size={14} />
            Export Excel
          </a>
          <a
            href={`/api/pptx?company_id=${companyId}`}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-violet-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-all shadow-sm border border-violet-200 hover:border-violet-400"
          >
            <Presentation size={14} />
            Pitch Deck
          </a>
        </div>
      </div>

      {/* PARAMÈTRES */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {displayParams.map((p) => (
          <div key={p.label} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-2">{p.label}</p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">{p.value}</p>
            <p className="text-xs text-slate-400 mt-1.5">{p.sub}</p>
          </div>
        ))}
      </div>

      {/* CALCULATEUR INTERACTIF */}
      <DCFCalculator
        financials={financials}
        params={params}
        initialResult={dcf}
        years={years}
        netDebt={latest?.net_debt ?? null}
        esgGrowthAdj={esgGrowthAdj}
      />

    </main>
  )
}
