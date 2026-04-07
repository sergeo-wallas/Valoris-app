import { calculateDCF } from "../dcf"
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react"
import db from "../db"

const DEFAULT_WACC = {
  wacc: 0.095, beta_unlevered: 0.74, beta_relevered: 1.90,
  debt_equity_ratio: 2.07, risk_free_rate: 0.035, market_premium: 0.06,
  size_premium: 0.03, illiquidity_premium: 0.025, ke: 0.20,
  kd_gross: 0.057, kd_net: 0.043,
}

function getCompany(companyId: string) {
  const companies = db.prepare("SELECT * FROM Company").all() as any[]
  return companies.find((c: any) => c.id === parseInt(companyId)) ?? companies[0]
}

function getFinancials(companyId: string) {
  return db.prepare("SELECT * FROM FinancialStatement WHERE company_id = ? ORDER BY fiscal_year DESC").all(companyId) as any[]
}

function getWACC(companyId: string, scenario: string = "base"): any {
  return db.prepare("SELECT * FROM WACCParameters WHERE company_id = ? AND scenario = ?").get(companyId, scenario)
    ?? { ...DEFAULT_WACC, company_id: parseInt(companyId), scenario }
}

export default async function Dashboard({ companyId }: { companyId: string }) {
  const company = getCompany(companyId)
  const financials = getFinancials(companyId)
  const waccData = getWACC(companyId)
  const allScenarios = ["pessimiste", "base", "optimiste"].map(s => getWACC(companyId, s))
  const latest = financials[0]

  if (!latest) {
    return (
      <main className="flex-1 bg-[#f4f7fb] p-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{company?.name}</h1>
            <p className="text-slate-400 text-sm mt-1">SIREN {company?.siren}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center max-w-lg mx-auto mt-10">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-5">
            <span className="text-3xl">📊</span>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Données financières manquantes</h2>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            Cette entreprise n'a pas encore d'états financiers.
            Ajoutez des données pour générer la valorisation.
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

  const scenarioDCFs = allScenarios.map((w: any) => ({
    scenario: w.scenario,
    wacc: w.wacc,
    ...calculateDCF(financials, { wacc: w.wacc, terminal_growth_rate: 0.02, projection_years: 5 })
  }))

  const formatM = (n: number) => `${(n / 1_000_000).toFixed(1)} M€`
  const formatPct = (n: number) => `${(n * 100).toFixed(1)}%`
  const ebitdaMargin = latest ? (latest.ebitda / latest.revenue * 100).toFixed(1) : "-"
  const revenueGrowth = financials[1]
    ? ((latest.revenue - financials[1].revenue) / financials[1].revenue * 100).toFixed(1)
    : null

  const kpis = [
    {
      label: "Chiffre d'affaires",
      value: formatM(latest?.revenue),
      sub: revenueGrowth !== null ? `${revenueGrowth}% vs N-1` : "N-1 non disponible",
      trend: revenueGrowth !== null ? parseFloat(revenueGrowth) : 0,
      accent: "#1a3a5c",
    },
    {
      label: "EBITDA",
      value: formatM(latest?.ebitda),
      sub: `Marge ${ebitdaMargin}%`,
      trend: parseFloat(ebitdaMargin),
      accent: "#0d7a5f",
    },
    {
      label: "Résultat net",
      value: formatM(latest?.net_income),
      sub: `Exercice ${latest?.fiscal_year}`,
      trend: latest?.net_income >= 0 ? 1 : -1,
      accent: "#0d7a5f",
    },
    {
      label: "Dette nette",
      value: formatM(latest?.net_debt),
      sub: latest?.equity ? `Levier ${(latest.net_debt / latest.equity).toFixed(1)}x` : "—",
      trend: -1,
      accent: "#dc2626",
    },
  ]

  const scenarioMeta: Record<string, { label: string; bg: string; text: string; badge: string; badgeText: string }> = {
    pessimiste: {
      label: "Pessimiste",
      bg: "bg-red-50/60",
      text: "text-red-700",
      badge: "bg-red-100 text-red-600",
      badgeText: "WACC élevé",
    },
    base: {
      label: "Base",
      bg: "bg-blue-50/60",
      text: "text-blue-700",
      badge: "bg-blue-100 text-blue-600",
      badgeText: "Scénario central",
    },
    optimiste: {
      label: "Optimiste",
      bg: "bg-emerald-50/60",
      text: "text-emerald-700",
      badge: "bg-emerald-100 text-emerald-600",
      badgeText: "WACC bas",
    },
  }

  return (
    <main className="flex-1 bg-[#f4f7fb] p-8 overflow-y-auto">

      {/* HEADER */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <h1 className="text-2xl font-bold text-slate-900">{company?.name}</h1>
            <span className="bg-[#1a3a5c]/8 text-[#1a3a5c] text-xs font-medium px-3 py-1 rounded-full border border-[#1a3a5c]/10">
              {company?.sector}
            </span>
            <span className="bg-slate-100 text-slate-500 text-xs font-medium px-3 py-1 rounded-full">
              {company?.legal_form}
            </span>
          </div>
          <p className="text-slate-400 text-sm">SIREN {company?.siren} · Exercice {latest?.fiscal_year}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">Mis à jour le</p>
          <p className="text-sm font-medium text-slate-700 mt-0.5">{new Date().toLocaleDateString("fr-FR")}</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {kpis.map((kpi, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-200">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">{kpi.label}</p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums mb-2">{kpi.value}</p>
            <div className="flex items-center gap-1.5">
              {kpi.trend > 0 ? (
                <ArrowUpRight size={13} className="text-emerald-500 flex-shrink-0" />
              ) : kpi.trend < 0 ? (
                <ArrowDownRight size={13} className="text-red-400 flex-shrink-0" />
              ) : (
                <Minus size={13} className="text-slate-300 flex-shrink-0" />
              )}
              <p className={`text-xs font-medium ${
                kpi.trend > 0 ? "text-emerald-600" :
                kpi.trend < 0 ? "text-red-500" :
                "text-slate-400"
              }`}>
                {kpi.sub}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* VALORISATION DCF */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-[#0c1f35] to-[#1a3a5c] rounded-2xl p-6 shadow-lg">
          <p className="text-white/50 text-xs font-medium uppercase tracking-wide mb-3">Valeur d'entreprise</p>
          <p className="text-3xl font-bold text-white tabular-nums">{formatM(dcf.enterpriseValue)}</p>
          <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
            <p className="text-white/35 text-xs">Modèle DCF</p>
            <span className="text-white/50 text-xs bg-white/8 px-2 py-0.5 rounded-full">WACC {formatPct(waccData.wacc)}</span>
          </div>
        </div>
        <div className="bg-gradient-to-br from-[#0a5040] to-[#0d7a5f] rounded-2xl p-6 shadow-lg">
          <p className="text-white/50 text-xs font-medium uppercase tracking-wide mb-3">Equity Value</p>
          <p className="text-3xl font-bold text-white tabular-nums">{formatM(dcf.equityValue)}</p>
          <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
            <p className="text-white/35 text-xs">EV − Dette nette</p>
            <span className="text-white/50 text-xs bg-white/8 px-2 py-0.5 rounded-full">g = 2.0%</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-3">Multiple implicite</p>
          <p className="text-3xl font-bold text-slate-900 tabular-nums">{dcf.evEbitda}x</p>
          <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
            <p className="text-slate-400 text-xs">EV / EBITDA</p>
            <span className="text-slate-400 text-xs bg-slate-50 px-2 py-0.5 rounded-full">Scénario base</span>
          </div>
        </div>
      </div>

      {/* SENSIBILITÉ */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mb-6">
        <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Analyse de sensibilité</h2>
            <p className="text-xs text-slate-400 mt-0.5">Impact du WACC sur la valorisation</p>
          </div>
          <span className="text-xs text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">3 scénarios</span>
        </div>
        <div className="grid grid-cols-3 divide-x divide-slate-50">
          {scenarioDCFs.map((s: any) => {
            const meta = scenarioMeta[s.scenario] ?? scenarioMeta.base
            return (
              <div key={s.scenario} className={`p-6 ${meta.bg}`}>
                <div className="flex items-center justify-between mb-5">
                  <p className={`text-xs font-bold uppercase tracking-widest ${meta.text}`}>{meta.label}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${meta.badge}`}>
                    WACC {(s.wacc * 100).toFixed(1)}%
                  </span>
                </div>
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-1">Valeur entreprise</p>
                <p className="text-2xl font-bold text-slate-900 tabular-nums mb-4">{formatM(s.enterpriseValue)}</p>
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-1">Equity Value</p>
                <p className={`text-base font-bold tabular-nums ${s.equityValue >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {formatM(s.equityValue)}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* DÉTAIL DCF */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Détail de la valorisation</h2>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "FCF de référence",   value: formatM(dcf.baseFCF) },
            { label: "CAGR CA historique", value: `${dcf.cagr}%` },
            { label: "PV FCF projetés",    value: formatM(dcf.sumPVFCF) },
            { label: "PV valeur terminale",value: formatM(dcf.pvTerminalValue) },
          ].map(item => (
            <div key={item.label} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-2">{item.label}</p>
              <p className="text-lg font-bold text-slate-900 tabular-nums">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

    </main>
  )
}
