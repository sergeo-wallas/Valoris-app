import Dashboard   from "../components/Dashboard"
import RatiosTable from "../components/RatiosTable"
import ESGPanel    from "../components/ESGPanel"
import SireneCard  from "../components/SireneCard"
import BodaccCard  from "../components/BodaccCard"
import { cookies } from "next/headers"
import db from "../db"
import { Building2, Plus } from "lucide-react"

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ company_id?: string }>
}) {
  const cookieStore = await cookies()
  const email = decodeURIComponent(cookieStore.get("valoris_email")?.value ?? "")

  const userCompanies = email
    ? (db.prepare("SELECT * FROM Company WHERE owner_email = ?").all(email) as any[])
    : []

  if (userCompanies.length === 0) {
    return (
      <main className="flex-1 bg-[#f4f7fb] p-8 flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center max-w-lg">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-5">
            <Building2 size={28} className="text-slate-300" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Aucune entreprise</h2>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            Commencez par ajouter une entreprise depuis votre espace de travail.
          </p>
          <a
            href="/workspace"
            className="inline-flex items-center gap-2 bg-[#1a3a5c] text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-[#0f2a45] transition-all shadow-sm"
          >
            <Plus size={15} />
            Aller au workspace
          </a>
        </div>
      </main>
    )
  }

  const params = await searchParams
  const requestedId = params.company_id ? parseInt(params.company_id) : null
  const company = (requestedId && userCompanies.find((c: any) => c.id === requestedId))
    ?? userCompanies[0]
  const companyId = String(company.id)

  return (
    <div className="pb-8">
      <Dashboard companyId={companyId} />

      {/* Ratios + ESG */}
      <div className="grid grid-cols-2 gap-6 px-8">
        <RatiosTable companyId={companyId} />
        <ESGPanel />
      </div>

      {/* Sirene INSEE + BODACC */}
      <div className="grid grid-cols-2 gap-6 px-8">
        <SireneCard companyId={companyId} />
        <BodaccCard companyId={companyId} />
      </div>
    </div>
  )
}
