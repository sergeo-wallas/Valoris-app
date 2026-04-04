async function getCompanies() {
  const res = await fetch("http://localhost:3000/api/companies", {
    cache: "no-store"
  })
  return res.json()
}

export default async function Dashboard() {
  const companies = await getCompanies()
  const company = companies[0]

  return (
    <main className="flex-1 bg-gray-50 p-8">

      <h1 className="text-2xl font-semibold text-[#1a3a5c]">Dashboard</h1>
      <p className="text-gray-400 mt-1 mb-8">
        {company ? company.name : "Aucune entreprise"}
      </p>

      <div className="bg-white rounded-xl p-6 border border-gray-100 mb-6">
        <p className="text-sm text-gray-400 mb-1">Entreprise</p>
        <p className="text-2xl font-semibold text-[#1a3a5c]">{company?.name}</p>
        <p className="text-sm text-gray-400 mt-2">
          SIREN {company?.siren} · {company?.sector} · {company?.legal_form}
        </p>
      </div>

    </main>
  )
}