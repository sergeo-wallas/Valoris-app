import { AlertTriangle, Shield, FileText, Info, WifiOff } from "lucide-react"
import db from "../db"
import { cookies } from "next/headers"

type BodaccRecord = {
  dateparution?: string
  typeavis_lib?: string
  familleavis_lib?: string
  tribunal?: string
  ville?: string
  publicationavis?: string
  registre?: string
}

const RISK_LEVEL: Record<string, { level: "danger" | "warning" | "info" | "neutral"; label: string }> = {
  "procédure collective":   { level: "danger",  label: "Procédure collective" },
  "liquidation":            { level: "danger",  label: "Liquidation" },
  "radiation":              { level: "warning", label: "Radiation RCS" },
  "vente":                  { level: "warning", label: "Vente / Cession" },
  "modification":           { level: "neutral", label: "Modification" },
  "création":               { level: "info",    label: "Création" },
}

function getRisk(type: string) {
  const t = type?.toLowerCase() ?? ""
  for (const [key, val] of Object.entries(RISK_LEVEL)) {
    if (t.includes(key)) return val
  }
  return { level: "neutral" as const, label: type || "Avis divers" }
}

const STYLE = {
  danger:  { bg: "bg-red-50 border-red-100",     text: "text-red-700",    badge: "bg-red-100 text-red-600",     icon: AlertTriangle },
  warning: { bg: "bg-amber-50 border-amber-100", text: "text-amber-700",  badge: "bg-amber-100 text-amber-600", icon: AlertTriangle },
  info:    { bg: "bg-blue-50 border-blue-100",   text: "text-blue-700",   badge: "bg-blue-100 text-blue-600",   icon: Info },
  neutral: { bg: "bg-slate-50 border-slate-100", text: "text-slate-700",  badge: "bg-slate-100 text-slate-500", icon: FileText },
}

async function fetchBodacc(siren: string): Promise<BodaccRecord[]> {
  try {
    const res = await fetch(
      `https://bodacc.fr/api/explore/v2.1/catalog/datasets/annonces-commerciales/records?where=siren%3D%22${siren}%22&limit=8&order_by=dateparution%20desc`,
      { headers: { "Accept": "application/json" }, next: { revalidate: 3600 } }
    )
    if (!res.ok) return []
    const data = await res.json()
    return (data.results ?? data.records?.map((r: any) => r.fields) ?? []) as BodaccRecord[]
  } catch {
    return []
  }
}

function getCompany(companyId: string) {
  const companies = db.prepare("SELECT * FROM Company").all() as any[]
  return companies.find((c: any) => c.id === parseInt(companyId)) ?? companies[0]
}

export default async function BodaccCard({ companyId }: { companyId: string }) {
  const cookieStore = await cookies()
  const apiEnabled = cookieStore.get("valoris_api_bodacc")?.value !== "0"

  const company = getCompany(companyId)
  if (!company?.siren) return null

  if (!apiEnabled) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mt-6 p-8 flex flex-col items-center justify-center text-center">
        <WifiOff size={20} className="text-slate-300 mb-3" />
        <p className="text-sm font-semibold text-slate-500">API BODACC désactivée</p>
        <p className="text-xs text-slate-400 mt-1">Activez-la dans les réglages pour voir les annonces légales</p>
      </div>
    )
  }

  const records = await fetchBodacc(company.siren)

  const hasDanger  = records.some(r => getRisk(r.typeavis_lib ?? "").level === "danger")
  const hasWarning = records.some(r => getRisk(r.typeavis_lib ?? "").level === "warning")

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mt-6">
      <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Veille BODACC</h2>
          <p className="text-xs text-slate-400 mt-0.5">Bulletin Officiel des Annonces Civiles et Commerciales</p>
        </div>
        <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${
          hasDanger  ? "bg-red-50 text-red-600 border-red-100" :
          hasWarning ? "bg-amber-50 text-amber-600 border-amber-100" :
          records.length > 0
            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
            : "bg-slate-50 text-slate-400 border-slate-100"
        }`}>
          {hasDanger  ? <><AlertTriangle size={11} /> Alerte</> :
           hasWarning ? <><AlertTriangle size={11} /> Attention</> :
           records.length > 0
             ? <><Shield size={11} /> OK</>
             : "Aucune annonce"
          }
        </div>
      </div>

      {records.length === 0 ? (
        <div className="p-8 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-3">
            <Shield size={18} className="text-emerald-500" />
          </div>
          <p className="text-sm font-semibold text-slate-700">Aucune annonce BODACC</p>
          <p className="text-xs text-slate-400 mt-1">Aucune procédure, radiation ou cession détectée</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-50">
          {records.map((record, i) => {
            const risk = getRisk(record.typeavis_lib ?? "")
            const style = STYLE[risk.level]
            const Icon = style.icon
            const date = record.dateparution
              ? new Date(record.dateparution).toLocaleDateString("fr-FR", {
                  day: "numeric", month: "short", year: "numeric"
                })
              : "—"

            return (
              <div key={i} className="px-5 py-4 flex items-start gap-3 hover:bg-slate-50/60 transition-colors">
                <div className={`w-7 h-7 rounded-lg ${style.bg} border flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  <Icon size={13} className={style.text} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${style.badge}`}>
                      {risk.label}
                    </span>
                    <span className="text-[10px] text-slate-400">{date}</span>
                  </div>
                  {record.tribunal && (
                    <p className="text-xs text-slate-500 truncate">{record.tribunal}</p>
                  )}
                  {record.publicationavis && (
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                      {record.publicationavis}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
