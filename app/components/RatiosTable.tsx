import db from "../db"

export default async function RatiosTable({ companyId }: { companyId: string | null }) {
  if (!companyId) return null
  const financials = db.prepare(
    "SELECT * FROM FinancialStatement WHERE company_id = ? ORDER BY fiscal_year DESC"
  ).all(companyId) as any[]

  // Utiliser les deux années les plus récentes disponibles
  const n  = financials[0]  // plus récente (ORDER BY fiscal_year DESC)
  const n1 = financials[1]  // année précédente

  const ratio = (num: number | null, den: number | null) =>
    num != null && den && den > 0 ? (num / den * 100).toFixed(1) : null

  const ebitdaMargin  = ratio(n?.ebitda, n?.revenue)
  const grossMargin   = ratio(n?.gross_margin, n?.revenue)
  const ebitMargin    = ratio(n?.ebit, n?.revenue)
  const netMargin     = ratio(n?.net_income, n?.revenue)
  const revenueGrowth = (n?.revenue && n1?.revenue && n1.revenue > 0)
    ? ((n.revenue - n1.revenue) / n1.revenue * 100).toFixed(1)
    : null

  const growthLabel = (n && n1)
    ? `Croissance CA (${n1.fiscal_year}→${n.fiscal_year})`
    : "Croissance CA"

  const rows = [
    { label: "Marge brute",    value: grossMargin,   suffix: "%", positive: true },
    { label: "Marge EBITDA",   value: ebitdaMargin,  suffix: "%", positive: true },
    { label: "Marge EBIT",     value: ebitMargin,    suffix: "%", positive: true },
    { label: "Marge nette",    value: netMargin,     suffix: "%", positive: true },
    { label: growthLabel,      value: revenueGrowth, suffix: "%", positive: null },
  ]

  const getColor = (value: string | null, positive: boolean | null) => {
    if (value === null) return "text-slate-400"
    if (positive === null) {
      return parseFloat(value) >= 0 ? "text-emerald-600" : "text-red-500"
    }
    return parseFloat(value) >= 0 ? "text-[#0d7a5f]" : "text-red-500"
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mt-6">
      <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Ratios financiers</h2>
          <p className="text-xs text-slate-400 mt-0.5">Exercice {n?.fiscal_year ?? "—"} · PCG</p>
        </div>
        <span className="text-xs text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
          5 ratios
        </span>
      </div>
      <div className="divide-y divide-slate-50">
        {rows.map(row => (
          <div key={row.label} className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50/50 transition-colors">
            <p className="text-sm text-slate-600">{row.label}</p>
            <p className={`text-sm font-bold tabular-nums ${getColor(row.value, row.positive)}`}>
              {row.value !== null ? `${row.value}${row.suffix}` : "—"}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
