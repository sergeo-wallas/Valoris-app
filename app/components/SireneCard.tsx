import { CheckCircle2, XCircle, Building2, Users, Calendar, Tag, WifiOff } from "lucide-react"
import db from "../db"
import { cookies } from "next/headers"

const TRANCHES: Record<string, string> = {
  "NN": "Non employeur", "00": "0 salarié",  "01": "1–2",
  "02": "3–5",           "03": "6–9",         "11": "10–19",
  "12": "20–49",         "21": "50–99",        "22": "100–199",
  "31": "200–249",       "32": "250–499",      "41": "500–999",
  "42": "1 000–1 999",  "51": "2 000–4 999",  "52": "5 000–9 999",
  "53": "≥ 10 000",
}

const CAT_JURIDIQUE: Record<string, string> = {
  "5710": "SAS",   "5720": "SASU",  "5499": "SARL",  "5498": "EURL",
  "6540": "SA",    "6552": "SA",    "1000": "EI",     "5306": "Coopérative",
  "5485": "SCOP",  "9220": "Asso.",
}

async function fetchSirene(siren: string) {
  try {
    const res = await fetch(
      `https://entreprise.data.gouv.fr/api/sirene/v3/unites_legales/${siren}`,
      { headers: { "Accept": "application/json" }, next: { revalidate: 3600 } }
    )
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export default async function SireneCard({ companyId }: { companyId: string | null }) {
  if (!companyId) return null
  const cookieStore = await cookies()
  const apiEnabled = cookieStore.get("valoris_api_sirene")?.value !== "0"

  const company = db.prepare("SELECT * FROM Company WHERE id = ?").get(companyId) as any
  if (!company?.siren) return null

  if (!apiEnabled) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mt-6 p-8 flex flex-col items-center justify-center text-center">
        <WifiOff size={20} className="text-slate-300 mb-3" />
        <p className="text-sm font-semibold text-slate-500">API Sirene désactivée</p>
        <p className="text-xs text-slate-400 mt-1">Activez-la dans les réglages pour voir la fiche légale</p>
      </div>
    )
  }

  const data = await fetchSirene(company.siren)
  const ul = data?.unite_legale

  const isActive  = ul?.etat_administratif_unite_legale === "A"
  const dateCreation = ul?.date_creation_unite_legale
    ? new Date(ul.date_creation_unite_legale).toLocaleDateString("fr-FR", {
        day: "numeric", month: "long", year: "numeric"
      })
    : null
  const tranche  = TRANCHES[ul?.tranche_effectif_salaries_unite_legale ?? ""] ?? "NC"
  const categorie = ul?.categorie_entreprise ?? null
  const formeJuridique = CAT_JURIDIQUE[ul?.categorie_juridique_unite_legale ?? ""] ?? ul?.categorie_juridique_unite_legale ?? "NC"
  const estEmployeur = ul?.caractere_employeur_unite_legale === "O"

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mt-6">
      <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Fiche légale INSEE</h2>
          <p className="text-xs text-slate-400 mt-0.5">Source : API Sirene · SIREN {company.siren}</p>
        </div>
        {ul ? (
          <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${
            isActive
              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
              : "bg-red-50 text-red-600 border border-red-100"
          }`}>
            {isActive
              ? <><CheckCircle2 size={12} /> Active</>
              : <><XCircle size={12} /> Cessée</>
            }
          </div>
        ) : (
          <span className="text-xs text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">Indisponible</span>
        )}
      </div>

      {!ul ? (
        <div className="p-6 text-center">
          <p className="text-sm text-slate-400">Données Sirene non disponibles pour ce SIREN.</p>
        </div>
      ) : (
        <div className="p-5">
          <div className="grid grid-cols-2 gap-3">

            {dateCreation && (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar size={13} className="text-slate-400" />
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Création</p>
                </div>
                <p className="text-sm font-bold text-slate-900">{dateCreation}</p>
              </div>
            )}

            {categorie && (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 size={13} className="text-slate-400" />
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Catégorie</p>
                </div>
                <p className="text-sm font-bold text-slate-900">{categorie}</p>
              </div>
            )}

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <div className="flex items-center gap-2 mb-2">
                <Users size={13} className="text-slate-400" />
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Effectifs</p>
              </div>
              <p className="text-sm font-bold text-slate-900">{tranche}</p>
              {ul.annee_effectif_salaries_unite_legale && (
                <p className="text-xs text-slate-400 mt-0.5">Réf. {ul.annee_effectif_salaries_unite_legale}</p>
              )}
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <div className="flex items-center gap-2 mb-2">
                <Tag size={13} className="text-slate-400" />
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Forme juridique</p>
              </div>
              <p className="text-sm font-bold text-slate-900">{formeJuridique}</p>
              <p className="text-xs text-slate-400 mt-0.5">{estEmployeur ? "Employeur" : "Non employeur"}</p>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
