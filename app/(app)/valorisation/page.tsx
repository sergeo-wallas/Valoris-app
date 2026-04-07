import { calculateDCF } from "../../dcf"
import FCFChart from "../../components/FCFChart"
import { Download, FileSpreadsheet, Building2, Plus, Presentation } from "lucide-react"
import db from "../../db"
import { cookies } from "next/headers"

const DEFAULT_WACC = { wacc: 0.095, scenario: "base" }

export default async function Valorisation({
  searchParams,
}: {
  searchParams: Promise<{ company_id?: string }>
}) {
  const cookieStore = await cookies()
  const email = decodeURIComponent(cookieStore.get("valoris_email")?.value ?? "")

  const userCompanies = email
    ? (db.prepare("SELECT * FROM Company WHERE owner_email = ?").all(email) as any[])
    : []

  if (userCompanies.length === 0) {
    return (
      <main className="flex-1 bg-[#f4f7fb] p-8 flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center max-w-lg">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-5">
            <Building2 size={28} className="text-slate-300" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Aucune entreprise</h2>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            Ajoutez une entreprise depuis le workspace pour générer une valorisation.
          </p>
          <a
            href="/workspace"
            className="inline-flex items-center gap-2 bg-[#1a3a5c] text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-[#0f2a45] transition-all shadow-sm"
          >
            <Plus size={15} />
            Aller au workspace
          </a>
        </div>
      </main>
    )
  }

  const sp = await searchParams
  const requestedId = sp.company_id ? parseInt(sp.company_id) : null
  const company = (requestedId && userCompanies.find((c: any) => c.id === requestedId))
    ?? userCompanies[0]
  const companyId = company.id

  const financials = db.prepare(
    "SELECT * FROM FinancialStatement WHERE company_id = ? ORDER BY fiscal_year DESC"
  ).all(companyId) as any[]

  const waccData: any = db.prepare(
    "SELECT * FROM WACCParameters WHERE company_id = ? AND scenario = 'base'"
  ).get(companyId) ?? { ...DEFAULT_WACC, company_id: companyId }

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

  const dcf = calculateDCF(financials, {
    wacc: waccData.wacc,
    terminal_growth_rate: 0.02,
    projection_years: 5
  })

  const latest = financials[0]
  const formatM = (n: number) => `${(n / 1_000_000).toFixed(1)} M€`
  const formatPct = (n: number) => `${(n * 100).toFixed(1)}%`
  const years = [2025, 2026, 2027, 2028, 2029]

  const displayParams = [
    { label: "WACC base",           value: formatPct(waccData.wacc),  sub: "Taux d'actualisation" },
    { label: "Croissance terminale", value: "2.0%",                    sub: "Taux perpetuel g" },
    { label: "FCF de référence",    value: formatM(dcf.baseFCF),       sub: "Free Cash Flow N" },
    { label: "CAGR historique",     value: `${dcf.cagr}%`,             sub: "Croissance observée" },
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
        {displayParams.map((p: { label: string; value: string; sub: string }) => (
          <div key={p.label} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-2">{p.label}</p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">{p.value}</p>
            <p className="text-xs text-slate-400 mt-1.5">{p.sub}</p>
          </div>
        ))}
      </div>

      {/* GRAPHIQUE */}
      <FCFChart
        projectedFCFs={dcf.projectedFCFs}
        pvFCFs={dcf.pvFCFs}
        years={years}
      />

      {/* TABLEAU FCF */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mb-6">
        <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Projection des FCF</h2>
            <p className="text-xs text-slate-400 mt-0.5">N+1 à N+5 · WACC {formatPct(waccData.wacc)}</p>
          </div>
          <span className="text-xs text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
            5 années
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/70">
                <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-6 py-3">Ligne</th>
                {years.map(y => (
                  <th key={y} className="text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-4 py-3">{y}</th>
                ))}
                <th className="text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-6 py-3">Cumul</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-50 hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 text-sm text-slate-600">FCF projeté</td>
                {dcf.projectedFCFs.map((f, i) => (
                  <td key={i} className="px-4 py-4 text-sm text-right font-semibold text-slate-900 tabular-nums">
                    {formatM(f)}
                  </td>
                ))}
                <td className="px-6 py-4 text-sm text-right text-slate-400">—</td>
              </tr>
              <tr className="border-t border-slate-50 hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 text-sm text-slate-600">Facteur d'actualisation</td>
                {dcf.projectedFCFs.map((_, i) => (
                  <td key={i} className="px-4 py-4 text-sm text-right text-slate-400 tabular-nums font-mono">
                    {(1 / Math.pow(1 + waccData.wacc, i + 1)).toFixed(3)}
                  </td>
                ))}
                <td className="px-6 py-4 text-sm text-right text-slate-400">—</td>
              </tr>
              <tr className="border-t border-slate-100 bg-emerald-50/40">
                <td className="px-6 py-4 text-sm font-semibold text-slate-900">FCF actualisé</td>
                {dcf.pvFCFs.map((f, i) => (
                  <td key={i} className="px-4 py-4 text-sm text-right font-bold text-[#0d7a5f] tabular-nums">
                    {formatM(f)}
                  </td>
                ))}
                <td className="px-6 py-4 text-sm text-right font-bold text-[#0d7a5f] tabular-nums">
                  {formatM(dcf.sumPVFCF)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* BRIDGE EV → EQUITY */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Réconciliation EV → Equity Value</h2>
            <p className="text-xs text-slate-400 mt-0.5">Passage de la valeur d'entreprise aux fonds propres</p>
          </div>
        </div>
        <div className="space-y-1">
          {[
            { label: "PV des FCF projetés (2025–2029)", value: formatM(dcf.sumPVFCF), type: "add" },
            { label: "PV de la valeur terminale",        value: formatM(dcf.pvTerminalValue), type: "add" },
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-emerald-500 w-4">+</span>
                <p className="text-sm text-slate-600">{row.label}</p>
              </div>
              <p className="text-sm font-semibold text-slate-900 tabular-nums">{row.value}</p>
            </div>
          ))}

          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#1a3a5c]/5 border border-[#1a3a5c]/8 my-2">
            <div className="flex items-center gap-3">
              <div className="w-4 h-px bg-[#1a3a5c]/30" />
              <p className="text-sm font-semibold text-slate-900">Enterprise Value</p>
            </div>
            <p className="text-base font-bold text-[#1a3a5c] tabular-nums">{formatM(dcf.enterpriseValue)}</p>
          </div>

          <div className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-red-400 w-4">−</span>
              <p className="text-sm text-slate-600">Dette nette</p>
            </div>
            <p className="text-sm font-semibold text-red-500 tabular-nums">−{formatM(latest?.net_debt)}</p>
          </div>

          <div className="flex items-center justify-between px-4 py-4 rounded-xl bg-gradient-to-br from-[#0a5040] to-[#0d7a5f] mt-2">
            <p className="text-sm font-semibold text-white">Equity Value</p>
            <p className={`text-xl font-bold tabular-nums ${dcf.equityValue >= 0 ? "text-white" : "text-red-300"}`}>
              {formatM(dcf.equityValue)}
            </p>
          </div>
        </div>
      </div>

    </main>
  )
}
