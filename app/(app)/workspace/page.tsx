"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface Company {
  id: number
  name: string
  siren: string
  sector: string
  legal_form: string
  createdAt: string
}

export default function Workspace() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    const stored = localStorage.getItem("valoris_user")
    if (stored) setUser(JSON.parse(stored))

    fetch("/api/companies")
      .then(r => r.json())
      .then(data => setCompanies(data))
  }, [])

  return (
    <main className="flex-1 bg-gray-50 min-h-screen p-8">

{/* HEADER */}
<div className="flex items-center justify-between mb-10">
  <div>
    <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">
      {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
    </p>
    <h1 className="text-2xl font-serif text-[#1a3a5c]">
      Espace de travail
    </h1>
    <p className="text-gray-400 text-sm mt-1">
      {user?.profile === "investisseur" ? "Investisseur M&A" :
       user?.profile === "expert" ? "Expert-comptable" :
       "Entrepreneur"} · {user?.email}
    </p>
  </div>
  <button
    onClick={() => router.push("/analyse")}
    className="bg-[#1a3a5c] text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-[#0f2a45] transition"
  >
    + Nouvelle analyse
  </button>
</div>

      {/* STATS RAPIDES */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Entreprises analysées</p>
          <p className="text-3xl font-bold text-[#1a3a5c]">{companies.length}</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Rapports générés</p>
          <p className="text-3xl font-bold text-[#1a3a5c]">{companies.length * 2}</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Dernière analyse</p>
          <p className="text-lg font-bold text-[#1a3a5c]">
            {companies[0] ? new Date(companies[0].createdAt).toLocaleDateString("fr-FR") : "—"}
          </p>
        </div>
      </div>

      {/* LISTE ENTREPRISES */}
      <div className="bg-white rounded-xl border border-gray-100">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#1a3a5c]">Mes analyses</h2>
            <p className="text-xs text-gray-400 mt-0.5">{companies.length} entreprise{companies.length > 1 ? "s" : ""}</p>
          </div>
          <button
            onClick={() => router.push("/analyse")}
            className="text-xs text-[#1a3a5c] font-medium hover:underline"
          >
            + Ajouter
          </button>
        </div>

        {companies.length === 0 ? (
          <div className="p-16 text-center">
            <p className="text-4xl mb-4">📊</p>
            <p className="text-gray-500 font-medium mb-2">Aucune analyse pour le moment</p>
            <p className="text-gray-400 text-sm mb-6">Commencez par analyser une entreprise</p>
            <button
              onClick={() => router.push("/analyse")}
              className="bg-[#1a3a5c] text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-[#0f2a45] transition"
            >
              Lancer ma première analyse
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {companies.map(company => (
              <div
                key={company.id}
                onClick={() => router.push(`/?company_id=${company.id}`)}
                className="flex items-center justify-between p-5 hover:bg-gray-50 cursor-pointer transition"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#1a3a5c]/10 flex items-center justify-center">
                    <span className="text-[#1a3a5c] font-bold text-sm">
                      {company.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#1a3a5c]">{company.name}</p>
                    <p className="text-xs text-gray-400">SIREN {company.siren} · {company.sector}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded-full">
                    {company.legal_form}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(company.createdAt).toLocaleDateString("fr-FR")}
                  </span>
                  <span className="text-gray-300">→</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </main>
  )
}