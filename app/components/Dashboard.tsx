import { calculateDCF } from "../dcf"

async function getCompany(companyId: string) {
  const res = await fetch("http://localhost:3000/api/companies", { cache: "no-store" })
  const companies = await res.json()
  return companies.find((c: any) => c.id === parseInt(companyId)) ?? companies[0]
}

async function getFinancials(companyId: string) {
  const res = await fetch(`http://localhost:3000/api/financials?company_id=${companyId}`, { cache: "no-store" })
  return res.json()
}

async function getWACC(companyId: string) {
  const res = await fetch(`http://localhost:3000/api/wacc?company_id=${companyId}&scenario=base`, { cache: "no-store" })
  return res.json()
}

async function getAllScenarios(companyId: string) {
  const scenarios = ["pessimiste", "base", "optimiste"]
  const results = await Promise.all(
    scenarios.map(s =>
      fetch(`http://localhost:3000/api/wacc?company_id=${companyId}&scenario=${s}`, { cache: "no-store" }).then(r => r.json())
    )
  )
  return results
}

export default async function Dashboard({ companyId }: { companyId: string }) {
  const company = await getCompany(companyId)
  const financials = await getFinancials(companyId)
  const waccData = await getWACC(companyId)
  const allScenarios = await getAllScenarios(companyId)
  const latest = financials[0]

  // Pas de données financières → message d'invitation
  if (!latest) {
    return (
      <main className="flex-1 bg-gray-50 p-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#1a3a5c]">{company?.name}</h1>
            <p className="text-gray-400 text-sm mt-1">SIREN {company?.siren}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center max-w-lg mx-auto mt-10">
          <p className="text-4xl mb-4">📊</p>
          <h2 className="text-xl font-serif text-[#1a3a5c] mb-2">Données financières manquantes</h2>
          <p className="text-gray-400 text-sm mb-6">
            Cette entreprise n'a pas encore d'états financiers.
            Ajoutez des données pour générer la valorisation.
          </p>
          
           <a href="/analyse"
  className="bg-[#1a3a5c] text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-[#0f2a45] transition inline-block"
>
  Compléter les données
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
  const revenueGrowth = financials[1] ? ((latest.revenue - financials[1].revenue) / financials[1].revenue * 100).toFixed(1) : "-"

  return (
    <main className="flex-1 bg-gray-50 p-8 overflow-y-auto">

      {/* HEADER */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-[#1a3a5c]">{company?.name}</h1>
            <span className="bg-[#1a3a5c]/10 text-[#1a3a5c] text-xs font-medium px-3 py-1 rounded-full">
              {company?.sector}
            </span>
            <span className="bg-gray-100 text-gray-500 text-xs font-medium px-3 py-1 rounded-full">
              {company?.legal_form}
            </span>
          </div>
          <p className="text-gray-400 text-sm">SIREN {company?.siren} · Exercice {latest?.fiscal_year}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Dernière mise à jour</p>
          <p className="text-sm font-medium text-[#1a3a5c]">{new Date().toLocaleDateString("fr-FR")}</p>
        </div>
      </div>

      {/* KPIs RAPIDES */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <p className="text-xs text-gray-400 mb-1">Chiffre d'affaires</p>
          <p className="text-xl font-bold text-[#1a3a5c]">{formatM(latest?.revenue)}</p>
          <p className={`text-xs mt-1 font-medium ${parseFloat(revenueGrowth) >= 0 ? "text-[#0d7a5f]" : "text-red-500"}`}>
            {revenueGrowth}% vs N-1
          </p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <p className="text-xs text-gray-400 mb-1">EBITDA</p>
          <p className="text-xl font-bold text-[#1a3a5c]">{formatM(latest?.ebitda)}</p>
          <p className="text-xs mt-1 text-gray-400">Marge {ebitdaMargin}%</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <p className="text-xs text-gray-400 mb-1">Dette nette</p>
          <p className="text-xl font-bold text-red-500">{formatM(latest?.net_debt)}</p>
          <p className="text-xs mt-1 text-gray-400">Gearing élevé</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <p className="text-xs text-gray-400 mb-1">Résultat net</p>
          <p className="text-xl font-bold text-[#0d7a5f]">{formatM(latest?.net_income)}</p>
          <p className="text-xs mt-1 text-gray-400">Exercice {latest?.fiscal_year}</p>
        </div>
      </div>

      {/* VALORISATION DCF */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-[#1a3a5c] rounded-xl p-6">
          <p className="text-white/60 text-xs mb-1">Valeur d'entreprise (DCF)</p>
          <p className="text-3xl font-bold text-white">{formatM(dcf.enterpriseValue)}</p>
          <p className="text-white/40 text-xs mt-2">WACC {formatPct(waccData.wacc)} · g 2%</p>
        </div>
        <div className="bg-[#0d7a5f] rounded-xl p-6">
          <p className="text-white/60 text-xs mb-1">Valeur des fonds propres</p>
          <p className="text-3xl font-bold text-white">{formatM(dcf.equityValue)}</p>
          <p className="text-white/40 text-xs mt-2">EV − Dette nette</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <p className="text-gray-400 text-xs mb-1">Multiple implicite</p>
          <p className="text-3xl font-bold text-[#1a3a5c]">{dcf.evEbitda}x</p>
          <p className="text-gray-400 text-xs mt-2">EV / EBITDA</p>
        </div>
      </div>

      {/* ANALYSE DE SENSIBILITÉ */}
      <div className="bg-white rounded-xl border border-gray-100 mb-8">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#1a3a5c]">Analyse de sensibilité</h2>
            <p className="text-xs text-gray-400 mt-0.5">Impact du WACC sur la valorisation</p>
          </div>
          <span className="text-xs text-gray-400 bg-gray-50 px-3 py-1 rounded-full">3 scénarios</span>
        </div>
        <div className="grid grid-cols-3 divide-x divide-gray-100">
          {scenarioDCFs.map((s: any) => (
            <div key={s.scenario} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{s.scenario}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  s.scenario === "optimiste" ? "bg-green-50 text-green-700" :
                  s.scenario === "pessimiste" ? "bg-red-50 text-red-700" :
                  "bg-blue-50 text-blue-700"
                }`}>
                  WACC {(s.wacc * 100).toFixed(1)}%
                </span>
              </div>
              <p className="text-xs text-gray-400 mb-1">Valeur entreprise</p>
              <p className="text-2xl font-bold text-[#1a3a5c] mb-3">{formatM(s.enterpriseValue)}</p>
              <p className="text-xs text-gray-400 mb-1">Equity Value</p>
              <p className={`text-base font-semibold ${s.equityValue >= 0 ? "text-[#0d7a5f]" : "text-red-500"}`}>
                {formatM(s.equityValue)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* DÉTAIL DCF */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-[#1a3a5c] mb-4">Détail valorisation</h2>
        <div className="grid grid-cols-4 gap-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-1">FCF référence</p>
            <p className="text-lg font-semibold text-[#1a3a5c]">{formatM(dcf.baseFCF)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-1">CAGR CA historique</p>
            <p className="text-lg font-semibold text-[#1a3a5c]">{dcf.cagr}%</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-1">PV FCF projetés</p>
            <p className="text-lg font-semibold text-[#1a3a5c]">{formatM(dcf.sumPVFCF)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-1">PV valeur terminale</p>
            <p className="text-lg font-semibold text-[#1a3a5c]">{formatM(dcf.pvTerminalValue)}</p>
          </div>
        </div>
      </div>

    </main>
  )
}