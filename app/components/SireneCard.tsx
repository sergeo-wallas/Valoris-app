import { CheckCircle2, XCircle, Building2, Users, Calendar, Tag, WifiOff, MapPin, UserCircle } from "lucide-react"
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
  "5599": "SA",    "6540": "SA",    "6552": "SA",    "6530": "SE",
  "1000": "EI",    "1100": "EI",    "5306": "Coopérative",
  "5485": "SCOP",  "5308": "SCIC",  "9220": "Asso.", "9221": "Asso.",
}

const CAT_ENTREPRISE: Record<string, string> = {
  "GE":  "Grande entreprise",
  "ETI": "ETI",
  "PME": "PME",
  "MI":  "Micro-entreprise",
}

async function fetchSirene(siren: string) {
  try {
    const res = await fetch(
      `https://recherche-entreprises.api.gouv.fr/search?q=${siren}&page=1&per_page=1`,
      { headers: { "Accept": "application/json" }, next: { revalidate: 3600 } }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.results?.[0] ?? null
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

  const ul = await fetchSirene(company.siren)

  const isActive      = ul?.etat_administratif === "A"
  const dateCreation  = ul?.date_creation
    ? new Date(ul.date_creation).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : null
  const tranche       = TRANCHES[ul?.tranche_effectif_salarie ?? ""] ?? "NC"
  const anneeEffectif = ul?.annee_tranche_effectif_salarie ?? null
  const categorie     = CAT_ENTREPRISE[ul?.categorie_entreprise ?? ""] ?? ul?.categorie_entreprise ?? null
  const formeJuridique = CAT_JURIDIQUE[ul?.nature_juridique ?? ""] ?? ul?.nature_juridique ?? "NC"
  const estEmployeur  = ul?.siege?.caractere_employeur === "O"
  const adresse       = ul?.siege?.adresse ?? null

  // Dirigeant principal (premier de type "personne physique" avec qualité de direction)
  const dirigeants: any[] = ul?.dirigeants ?? []
  const dirigeantPrincipal = dirigeants.find(
    d => d.type_dirigeant === "personne physique" &&
      /directeur|président|gérant/i.test(d.qualite ?? "")
  ) ?? dirigeants.find(d => d.type_dirigeant === "personne physique")

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mt-6">
      <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Fiche légale INSEE</h2>
          <p className="text-xs text-slate-400 mt-0.5">Source : Annuaire Entreprises · SIREN {company.siren}</p>
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
        <div className="p-5 space-y-3">
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
              {anneeEffectif && (
                <p className="text-xs text-slate-400 mt-0.5">Réf. {anneeEffectif}</p>
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

          {/* Adresse siège */}
          {adresse && (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-start gap-2">
              <MapPin size={13} className="text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Siège social</p>
                <p className="text-sm font-medium text-slate-800">{adresse}</p>
              </div>
            </div>
          )}

          {/* Dirigeant principal */}
          {dirigeantPrincipal && (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-start gap-2">
              <UserCircle size={13} className="text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Dirigeant</p>
                <p className="text-sm font-bold text-slate-900">
                  {dirigeantPrincipal.prenoms} {dirigeantPrincipal.nom}
                </p>
                <p className="text-xs text-slate-400">{dirigeantPrincipal.qualite}</p>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
