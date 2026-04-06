import { calculateDCF } from "../../dcf"
import FCFChart from "../../components/FCFChart"

async function getFinancials() {
  const res = await fetch("http://localhost:3000/api/financials?company_id=1", {
    cache: "no-store"
  })
  return res.json()
}

async function getWACC() {
  const res = await fetch("http://localhost:3000/api/wacc?company_id=1&scenario=base", {
    cache: "no-store"
  })
  return res.json()
}

export default async function Valorisation() {
  const financials = await getFinancials()
  const waccData = await getWACC()

  const dcf = calculateDCF(financials, {
    wacc: waccData.wacc,
    terminal_growth_rate: 0.02,
    projection_years: 5
  })

  const latest = financials[0]
  const formatM = (n: number) => `${(n / 1_000_000).toFixed(1)} M€`
  const formatPct = (n: number) => `${(n * 100).toFixed(1)}%`

  const years = [2025, 2026, 2027, 2028, 2029]

  return (
    <main className="flex-1 bg-gray-50 p-8">

      <h1 className="text-2xl font-semibold text-[#1a3a5c]">Valorisation</h1>
      <p className="text-gray-400 mt-1 mb-8">CAP Cosmetiques · Modèle DCF</p>

{/* Boutons export */}
<div className="flex gap-3 mb-8">
  
    <a href={`/api/pdf?company_id=1`}
    target="_blank"
    className="flex items-center gap-2 px-4 py-2 bg-[#1a3a5c] text-white text-sm rounded-lg hover:bg-[#0f2a45] transition"
  >
    📄 Télécharger PDF
  </a>
  
    <a href={`/api/export?company_id=1`}
    className="flex items-center gap-2 px-4 py-2 bg-[#0d7a5f] text-white text-sm rounded-lg hover:bg-[#0a5f4a] transition"
  >
    📊 Télécharger Excel
  </a>
</div>
      {/* Paramètres */}
      <div className="bg-white rounded-xl border border-gray-100 mb-6 p-6">
        <h2 className="text-lg font-semibold text-[#1a3a5c] mb-4">Paramètres du modèle</h2>
        <div className="grid grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-gray-400">WACC (base)</p>
            <p className="text-xl font-semibold text-[#1a3a5c]">{formatPct(waccData.wacc)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Croissance terminale</p>
            <p className="text-xl font-semibold text-[#1a3a5c]">2.0%</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">FCF de référence</p>
            <p className="text-xl font-semibold text-[#1a3a5c]">{formatM(dcf.baseFCF)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">CAGR historique</p>
            <p className="text-xl font-semibold text-[#1a3a5c]">{dcf.cagr}%</p>
          </div>
        </div>
      </div>

      <FCFChart
  projectedFCFs={dcf.projectedFCFs}
  pvFCFs={dcf.pvFCFs}
  years={[2025, 2026, 2027, 2028, 2029]}
/>
      {/* Tableau FCF projetés */}
      <div className="bg-white rounded-xl border border-gray-100 mb-6">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-[#1a3a5c]">Projection des FCF</h2>
          <p className="text-sm text-gray-400 mt-1">N+1 à N+5 · WACC {formatPct(waccData.wacc)}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs text-gray-400 font-medium p-4">Année</th>
                {years.map(y => (
                  <th key={y} className="text-right text-xs text-gray-400 font-medium p-4">{y}</th>
                ))}
                <th className="text-right text-xs text-gray-400 font-medium p-4">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <tr>
                <td className="p-4 text-sm text-gray-600">FCF projeté</td>
                {dcf.projectedFCFs.map((f, i) => (
                  <td key={i} className="p-4 text-sm text-right font-medium text-[#1a3a5c]">
                    {formatM(f)}
                  </td>
                ))}
                <td className="p-4 text-sm text-right font-medium text-[#1a3a5c]">—</td>
              </tr>
              <tr>
                <td className="p-4 text-sm text-gray-600">Facteur d'actualisation</td>
                {dcf.projectedFCFs.map((_, i) => (
                  <td key={i} className="p-4 text-sm text-right text-gray-500">
                    {(1 / Math.pow(1 + waccData.wacc, i + 1)).toFixed(3)}
                  </td>
                ))}
                <td className="p-4 text-sm text-right text-gray-500">—</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="p-4 text-sm font-medium text-[#1a3a5c]">FCF actualisé</td>
                {dcf.pvFCFs.map((f, i) => (
                  <td key={i} className="p-4 text-sm text-right font-semibold text-[#0d7a5f]">
                    {formatM(f)}
                  </td>
                ))}
                <td className="p-4 text-sm text-right font-semibold text-[#0d7a5f]">
                  {formatM(dcf.sumPVFCF)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Bridge EV → Equity */}
      <div className="bg-white rounded-xl border border-gray-100 mb-6 p-6">
        <h2 className="text-lg font-semibold text-[#1a3a5c] mb-4">Réconciliation EV → Equity</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-gray-50">
            <p className="text-sm text-gray-600">PV des FCF projetés (2025-2029)</p>
            <p className="text-sm font-medium text-[#1a3a5c]">{formatM(dcf.sumPVFCF)}</p>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-50">
            <p className="text-sm text-gray-600">PV de la valeur terminale</p>
            <p className="text-sm font-medium text-[#1a3a5c]">{formatM(dcf.pvTerminalValue)}</p>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <p className="text-sm font-semibold text-[#1a3a5c]">Enterprise Value</p>
            <p className="text-sm font-bold text-[#1a3a5c]">{formatM(dcf.enterpriseValue)}</p>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-50">
            <p className="text-sm text-gray-600">(-) Dette nette</p>
            <p className="text-sm font-medium text-red-500">-{formatM(latest.net_debt)}</p>
          </div>
          <div className="flex justify-between items-center py-2 bg-gray-50 rounded-lg px-3">
            <p className="text-sm font-semibold text-[#1a3a5c]">Equity Value</p>
            <p className={`text-lg font-bold ${dcf.equityValue >= 0 ? "text-[#0d7a5f]" : "text-red-500"}`}>
              {formatM(dcf.equityValue)}
            </p>
          </div>
        </div>
      </div>

    </main>
  )
}