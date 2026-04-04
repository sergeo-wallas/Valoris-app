import { calculateDCF } from "../dcf"

async function getCompanies() {
  const res = await fetch("http://localhost:3000/api/companies", {
    cache: "no-store"
  })
  return res.json()
}

async function getFinancials() {
  const res = await fetch("http://localhost:3000/api/financials?company_id=1", {
    cache: "no-store"
  })
  return res.json()
}

export default async function Dashboard() {
  const companies = await getCompanies()
  const financials = await getFinancials()
  const company = companies[0]

  const dcf = calculateDCF(financials, {
    wacc: 0.095,
    terminal_growth_rate: 0.02,
    projection_years: 5
  })

  const formatM = (n: number) => `${(n / 1_000_000).toFixed(1)} M€`

  return (
    <main className="flex-1 bg-gray-50 p-8">

      <h1 className="text-2xl font-semibold text-[#1a3a5c]">Dashboard</h1>
      <p className="text-gray-400 mt-1 mb-8">{company?.name}</p>

      {/* Card entreprise */}
      <div className="bg-white rounded-xl p-6 border border-gray-100 mb-6">
        <p className="text-sm text-gray-400 mb-1">Entreprise</p>
        <p className="text-2xl font-semibold text-[#1a3a5c]">{company?.name}</p>
        <p className="text-sm text-gray-400 mt-2">
          SIREN {company?.siren} · {company?.sector} · {company?.legal_form}
        </p>
      </div>

      {/* Cards DCF */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <p className="text-sm text-gray-400">Valeur d'entreprise (DCF)</p>
          <p className="text-2xl font-semibold text-[#1a3a5c] mt-2">
            {formatM(dcf.enterpriseValue)}
          </p>
          <p className="text-xs text-gray-400 mt-1">WACC 9,5% · g 2%</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <p className="text-sm text-gray-400">Valeur des fonds propres</p>
          <p className="text-2xl font-semibold text-[#1a3a5c] mt-2">
            {formatM(dcf.equityValue)}
          </p>
          <p className="text-xs text-gray-400 mt-1">EV − Dette nette</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <p className="text-sm text-gray-400">Multiple implicite</p>
          <p className="text-2xl font-semibold text-[#1a3a5c] mt-2">
            {dcf.evEbitda}x
          </p>
          <p className="text-xs text-gray-400 mt-1">EV / EBITDA</p>
        </div>
      </div>

      {/* Détail DCF */}
      <div className="bg-white rounded-xl p-6 border border-gray-100 mb-6">
        <p className="text-sm text-gray-400 mb-4">Détail valorisation</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-400">FCF de référence (2024)</p>
            <p className="text-sm font-medium text-[#1a3a5c]">{formatM(dcf.baseFCF)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">CAGR CA historique</p>
            <p className="text-sm font-medium text-[#1a3a5c]">{dcf.cagr}%</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">PV des FCF projetés</p>
            <p className="text-sm font-medium text-[#1a3a5c]">{formatM(dcf.sumPVFCF)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">PV valeur terminale</p>
            <p className="text-sm font-medium text-[#1a3a5c]">{formatM(dcf.pvTerminalValue)}</p>
          </div>
        </div>
      </div>

    </main>
  )
}