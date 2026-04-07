import db from "../db"

export default async function RatiosTable({ companyId }: { companyId: string }) {
  const financials = db.prepare(
    "SELECT * FROM FinancialStatement WHERE company_id = ? ORDER BY fiscal_year DESC"
  ).all(companyId) as any[]

  const n  = financials.find((f: any) => f.fiscal_year === 2024)
  const n1 = financials.find((f: any) => f.fiscal_year === 2023)

  const ebitdaMargin  = n ? (n.ebitda      / n.revenue * 100).toFixed(1) : null
  const grossMargin   = n ? (n.gross_margin / n.revenue * 100).toFixed(1) : null
  const ebitMargin    = n ? (n.ebit        / n.revenue * 100).toFixed(1) : null
  const netMargin     = n ? (n.net_income  / n.revenue * 100).toFixed(1) : null
  const revenueGrowth = (n && n1)
    ? ((n.revenue - n1.revenue) / n1.revenue * 100).toFixed(1)
    : null

  const rows = [
    { label: "Marge brute",                value: grossMargin,   suffix: "%", positive: true },
    { label: "Marge EBITDA",               value: ebitdaMargin,  suffix: "%", positive: true },
    { label: "Marge EBIT",                 value: ebitMargin,    suffix: "%", positive: true },
    { label: "Marge nette",                value: netMargin,     suffix: "%", positive: true },
    { label: "Croissance CA (2023→2024)",  value: revenueGrowth, suffix: "%", positive: null },
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
          <p className="text-xs text-slate-400 mt-0.5">Exercice 2024 · PCG</p>
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
