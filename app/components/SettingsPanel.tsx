"use client"
import { useState, useEffect } from "react"
import { X, Globe, ToggleLeft, ToggleRight, AlertCircle } from "lucide-react"

type ApiKey = "sirene" | "bodacc"

const APIS: { key: ApiKey; label: string; description: string; source: string }[] = [
  {
    key: "sirene",
    label: "INSEE Sirene",
    description: "Fiche légale de l'entreprise (statut, effectifs, forme juridique)",
    source: "entreprise.data.gouv.fr",
  },
  {
    key: "bodacc",
    label: "BODACC",
    description: "Veille des annonces légales (procédures, cessions, radiations)",
    source: "bodacc.fr",
  },
]

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=${60 * 60 * 24 * 365}`
}

export default function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [enabled, setEnabled] = useState<Record<ApiKey, boolean>>({
    sirene: true,
    bodacc: true,
  })

  useEffect(() => {
    setEnabled({
      sirene: getCookie("valoris_api_sirene") !== "0",
      bodacc: getCookie("valoris_api_bodacc") !== "0",
    })
  }, [])

  function toggle(key: ApiKey) {
    const next = !enabled[key]
    setEnabled(prev => ({ ...prev, [key]: next }))
    setCookie(`valoris_api_${key}`, next ? "1" : "0")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Réglages</h2>
            <p className="text-xs text-slate-400 mt-0.5">Gérer les sources de données externes</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* API list */}
        <div className="p-4 space-y-2">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-2 mb-3">
            APIs externes
          </p>
          {APIS.map(api => (
            <div
              key={api.key}
              className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                enabled[api.key]
                  ? "bg-slate-50 border-slate-100"
                  : "bg-white border-slate-100 opacity-60"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  enabled[api.key] ? "bg-[#1a3a5c]/8" : "bg-slate-100"
                }`}>
                  <Globe size={14} className={enabled[api.key] ? "text-[#1a3a5c]" : "text-slate-400"} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{api.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{api.description}</p>
                  <p className="text-[10px] text-slate-300 mt-1 font-mono">{api.source}</p>
                </div>
              </div>
              <button onClick={() => toggle(api.key)} className="flex-shrink-0 ml-4">
                {enabled[api.key]
                  ? <ToggleRight size={28} className="text-[#0d7a5f]" />
                  : <ToggleLeft size={28} className="text-slate-300" />
                }
              </button>
            </div>
          ))}
        </div>

        {/* Notice */}
        <div className="mx-4 mb-4 flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          <AlertCircle size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 leading-relaxed">
            Les APIs désactivées n'afficheront aucune donnée. Rechargez la page pour appliquer les changements.
          </p>
        </div>

        <div className="px-4 pb-4">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-[#1a3a5c] text-white text-sm font-medium rounded-xl hover:bg-[#0f2a45] transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
