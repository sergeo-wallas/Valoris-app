"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, ArrowRight, Building2, Calendar, FileText, Download, Sheet, Presentation, Trash2 } from "lucide-react"

interface Company {
  id: number
  name: string
  siren: string
  sector: string
  legal_form: string
  createdAt: string
}

const SECTOR_COLORS = [
  "bg-blue-500", "bg-emerald-500", "bg-violet-500",
  "bg-amber-500", "bg-rose-500", "bg-cyan-500",
]

export default function Workspace() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [user, setUser] = useState<any>(null)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const router = useRouter()

  const deleteCompany = async (id: number) => {
    await fetch(`/api/companies?id=${id}`, { method: "DELETE" })
    setCompanies(prev => prev.filter(c => c.id !== id))
    setConfirmDelete(null)
  }

  useEffect(() => {
    const stored = localStorage.getItem("valoris_user")
    const parsed = stored ? JSON.parse(stored) : null
    if (parsed) setUser(parsed)
    const email = parsed?.email
    const url = email ? `/api/companies?email=${encodeURIComponent(email)}` : "/api/companies"
    fetch(url)
      .then(r => r.json())
      .then(data => setCompanies(data))
  }, [])

  const profileLabel =
    user?.profile === "investisseur" ? "Investisseur M&A" :
    user?.profile === "expert" ? "Expert-comptable" :
    "Entrepreneur"

  return (
    <main className="flex-1 bg-[#f4f7fb] min-h-screen p-8">

      {/* HEADER */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-2">
            {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
          <h1 className="text-2xl font-bold text-slate-900">Espace de travail</h1>
          <p className="text-slate-400 text-sm mt-1">
            {profileLabel}
            {user?.email && <span className="text-slate-300"> · {user.email}</span>}
          </p>
        </div>
        <button
          onClick={() => router.push("/analyse")}
          className="flex items-center gap-2 bg-[#1a3a5c] text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-[#0f2a45] transition-all shadow-sm hover:shadow-md"
        >
          <Plus size={15} />
          Nouvelle analyse
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          {
            label: "Entreprises analysées",
            value: companies.length,
            icon: Building2,
            color: "text-[#1a3a5c]",
            bg: "bg-[#1a3a5c]/5",
          },
          {
            label: "Rapports générés",
            value: companies.length * 2,
            icon: FileText,
            color: "text-[#0d7a5f]",
            bg: "bg-[#0d7a5f]/5",
          },
          {
            label: "Dernière analyse",
            value: companies[0]
              ? new Date(companies[0].createdAt).toLocaleDateString("fr-FR")
              : "—",
            icon: Calendar,
            color: "text-violet-600",
            bg: "bg-violet-50",
            small: true,
          },
        ].map((stat, i) => {
          const Icon = stat.icon
          return (
            <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{stat.label}</p>
                <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center`}>
                  <Icon size={15} className={stat.color} />
                </div>
              </div>
              <p className={`font-bold text-slate-900 tabular-nums ${stat.small ? "text-xl" : "text-3xl"}`}>
                {stat.value}
              </p>
            </div>
          )
        })}
      </div>

      {/* LISTE ENTREPRISES */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Mes analyses</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {companies.length} entreprise{companies.length > 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={() => router.push("/analyse")}
            className="flex items-center gap-1.5 text-xs text-[#1a3a5c] font-medium hover:text-[#0f2a45] transition-colors bg-[#1a3a5c]/5 px-3 py-1.5 rounded-lg"
          >
            <Plus size={12} />
            Ajouter
          </button>
        </div>

        {companies.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-5">
              <Building2 size={28} className="text-slate-300" />
            </div>
            <p className="text-slate-700 font-semibold mb-1.5">Aucune analyse pour le moment</p>
            <p className="text-slate-400 text-sm mb-6">Commencez par analyser une entreprise</p>
            <button
              onClick={() => router.push("/analyse")}
              className="inline-flex items-center gap-2 bg-[#1a3a5c] text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-[#0f2a45] transition-all shadow-sm"
            >
              <Plus size={15} />
              Lancer ma première analyse
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {companies.map((company, i) => (
              <div
                key={company.id}
                className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/80 transition-colors group"
              >
                {/* Infos entreprise — cliquable vers dashboard */}
                <div
                  className="flex items-center gap-4 flex-1 cursor-pointer"
                  onClick={() => router.push(`/?company_id=${company.id}`)}
                >
                  <div className={`w-10 h-10 rounded-xl ${SECTOR_COLORS[i % SECTOR_COLORS.length]} flex items-center justify-center shadow-sm flex-shrink-0`}>
                    <span className="text-white font-bold text-sm">
                      {company.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{company.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      SIREN {company.siren}
                      {company.sector && <span> · {company.sector}</span>}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {company.legal_form && (
                    <span className="text-xs bg-slate-100 text-slate-500 px-2.5 py-1 rounded-lg font-medium">
                      {company.legal_form}
                    </span>
                  )}
                  <span className="text-xs text-slate-400">
                    {new Date(company.createdAt).toLocaleDateString("fr-FR")}
                  </span>

                  {/* Boutons export — visibles au survol */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a
                      href={`/api/pdf?company_id=${company.id}`}
                      target="_blank"
                      onClick={e => e.stopPropagation()}
                      title="Rapport PDF"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-[#1a3a5c] bg-[#1a3a5c]/8 hover:bg-[#1a3a5c]/15 transition-colors"
                    >
                      <Download size={12} />
                      PDF
                    </a>
                    <a
                      href={`/api/export?company_id=${company.id}`}
                      onClick={e => e.stopPropagation()}
                      title="Export Excel"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-[#0d7a5f] bg-[#0d7a5f]/8 hover:bg-[#0d7a5f]/15 transition-colors"
                    >
                      <Sheet size={12} />
                      Excel
                    </a>
                    <a
                      href={`/api/pptx?company_id=${company.id}`}
                      onClick={e => e.stopPropagation()}
                      title="Pitch Deck PowerPoint"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-violet-600 bg-violet-50 hover:bg-violet-100 transition-colors"
                    >
                      <Presentation size={12} />
                      Pitch
                    </a>
                  </div>

                  {/* Bouton supprimer */}
                  {confirmDelete === company.id ? (
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-xs text-red-500 font-medium">Confirmer ?</span>
                      <button
                        onClick={e => { e.stopPropagation(); deleteCompany(company.id) }}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
                      >
                        Oui, supprimer
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setConfirmDelete(null) }}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
                      >
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={e => { e.stopPropagation(); setConfirmDelete(company.id) }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                      title="Supprimer l'analyse"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}

                  <ArrowRight
                    size={15}
                    className="text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all cursor-pointer"
                    onClick={() => router.push(`/?company_id=${company.id}`)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </main>
  )
}
