async function getFinancials(companyId: string) {
  const res = await fetch(`http://localhost:3000/api/financials?company_id=${companyId}`, {
    cache: "no-store"
  })
  return res.json()
}

export default async function RatiosTable({ companyId }: { companyId: string }) {
  const financials = await getFinancials(companyId)

  const n = financials.find((f: any) => f.fiscal_year === 2024)
  const n1 = financials.find((f: any) => f.fiscal_year === 2023)

  const ebitdaMargin = n ? (n.ebitda / n.revenue * 100).toFixed(1) : "-"
  const grossMargin = n ? (n.gross_margin / n.revenue * 100).toFixed(1) : "-"
  const ebitMargin = n ? (n.ebit / n.revenue * 100).toFixed(1) : "-"
  const netMargin = n ? (n.net_income / n.revenue * 100).toFixed(1) : "-"
  const revenueGrowth = (n && n1) ? ((n.revenue - n1.revenue) / n1.revenue * 100).toFixed(1) : "-"

  return (
    <div className="bg-white rounded-xl border border-gray-100 mt-6">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-[#1a3a5c]">Ratios financiers</h2>
        <p className="text-sm text-gray-400 mt-1">Exercice 2024 · PCG</p>
      </div>
      <div className="divide-y divide-gray-50">
        <div className="flex items-center justify-between px-6 py-4">
          <p className="text-sm text-gray-600">Marge brute</p>
          <p className="text-sm font-medium text-[#1a3a5c]">{grossMargin}%</p>
        </div>
        <div className="flex items-center justify-between px-6 py-4">
          <p className="text-sm text-gray-600">Marge EBITDA</p>
          <p className="text-sm font-medium text-[#1a3a5c]">{ebitdaMargin}%</p>
        </div>
        <div className="flex items-center justify-between px-6 py-4">
          <p className="text-sm text-gray-600">Marge EBIT</p>
          <p className="text-sm font-medium text-[#1a3a5c]">{ebitMargin}%</p>
        </div>
        <div className="flex items-center justify-between px-6 py-4">
          <p className="text-sm text-gray-600">Marge nette</p>
          <p className="text-sm font-medium text-[#1a3a5c]">{netMargin}%</p>
        </div>
        <div className="flex items-center justify-between px-6 py-4">
          <p className="text-sm text-gray-600">Croissance CA (2023→2024)</p>
          <p className={`text-sm font-medium ${parseFloat(revenueGrowth) >= 0 ? "text-[#0d7a5f]" : "text-red-500"}`}>
            {revenueGrowth}%
          </p>
        </div>
      </div>
    </div>
  )
}