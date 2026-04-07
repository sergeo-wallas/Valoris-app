"use client"
import { useState, useEffect } from "react"
import { Search, Plus, Trash2, ExternalLink, Building2, ChevronDown } from "lucide-react"

const STATUTS = [
  { value: "prospect",    label: "Prospect",   color: "bg-slate-100 text-slate-500" },
  { value: "contacté",   label: "Contacté",   color: "bg-blue-100 text-blue-600" },
  { value: "en analyse", label: "En analyse", color: "bg-amber-100 text-amber-600" },
  { value: "écarté",    label: "Écarté",     color: "bg-red-100 text-red-500" },
]

function statutStyle(s: string) {
  return STATUTS.find(x => x.value === s) ?? STATUTS[0]
}

export default function Sourcing() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<any[]>([])
  const [targets, setTargets] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [added, setAdded] = useState<Set<string>>(new Set())

  useEffect(() => {
    const raw = localStorage.getItem("valoris_user")
    const e = raw ? JSON.parse(raw).email : ""
    setEmail(e)
    if (e) loadTargets(e)
  }, [])

  async function loadTargets(e: string) {
    const res = await fetch(`/api/targets?email=${encodeURIComponent(e)}`)
    const data = await res.json()
    setTargets(data)
    setAdded(new Set(data.map((t: any) => t.siren)))
  }

  async function search() {
    if (!query.trim()) return
    setLoading(true)
    setResults([])
    try {
      const res = await fetch(
        `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(query)}&limite=10`
      )
      const data = await res.json()
      setResults(data.results ?? [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  async function addTarget(r: any) {
    const body = {
      siren: r.siren,
      name: r.nom_complet,
      sector: r.activite_principale,
      legal_form: r.nature_juridique,
      naf_code: r.activite_principale,
      owner_email: email,
    }
    const res = await fetch("/api/targets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      setAdded(prev => new Set([...prev, r.siren]))
      loadTargets(email)
    }
  }

  async function updateStatus(id: number, status: string, note: string) {
    await fetch("/api/targets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, note }),
    })
    loadTargets(email)
  }

  async function removeTarget(id: number, siren: string) {
    await fetch(`/api/targets?id=${id}`, { method: "DELETE" })
    setAdded(prev => { const s = new Set(prev); s.delete(siren); return s })
    loadTargets(email)
  }

  return (
    <main className="flex-1 bg-[#f4f7fb] p-8 overflow-y-auto">

      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Sourcing</h1>
        <p className="text-slate-400 text-sm mt-1">Identifiez et suivez vos cibles d'investissement</p>
      </div>

      {/* RECHERCHE */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Rechercher une entreprise</p>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && search()}
              placeholder="Nom, SIREN, secteur…"
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#1a3a5c] focus:ring-2 focus:ring-[#1a3a5c]/8 bg-slate-50 focus:bg-white transition-all"
            />
          </div>
          <button
            onClick={search}
            disabled={loading}
            className="px-5 py-2.5 bg-[#1a3a5c] text-white text-sm font-medium rounded-xl hover:bg-[#0f2a45] transition-all disabled:opacity-50"
          >
            {loading ? "Recherche…" : "Rechercher"}
          </button>
        </div>

        {results.length > 0 && (
          <div className="mt-4 divide-y divide-slate-50 border border-slate-100 rounded-xl overflow-hidden">
            {results.map((r: any) => (
              <div key={r.siren} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#1a3a5c]/8 flex items-center justify-center flex-shrink-0">
                    <Building2 size={14} className="text-[#1a3a5c]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{r.nom_complet}</p>
                    <p className="text-xs text-slate-400">
                      SIREN {r.siren}
                      {r.activite_principale && <span> · {r.activite_principale}</span>}
                      {r.siege?.commune && <span> · {r.siege.commune}</span>}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => addTarget(r)}
                  disabled={added.has(r.siren)}
                  className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
                    added.has(r.siren)
                      ? "bg-emerald-50 text-emerald-600 cursor-default"
                      : "bg-[#1a3a5c] text-white hover:bg-[#0f2a45]"
                  }`}
                >
                  {added.has(r.siren) ? "Ajouté" : <><Plus size={12} /> Ajouter</>}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* LISTE DES CIBLES */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Mes cibles</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {targets.length} entreprise{targets.length !== 1 ? "s" : ""} suivie{targets.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {targets.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4">
              <Search size={24} className="text-slate-300" />
            </div>
            <p className="text-sm font-semibold text-slate-700 mb-1">Aucune cible pour l'instant</p>
            <p className="text-xs text-slate-400">Recherchez des entreprises et ajoutez-les à votre liste</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {targets.map((t: any) => {
              const st = statutStyle(t.status)
              return (
                <div key={t.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/60 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                      <span className="text-amber-600 font-bold text-sm">{t.name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        SIREN {t.siren}
                        {t.sector && <span> · {t.sector}</span>}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <select
                        value={t.status}
                        onChange={e => updateStatus(t.id, e.target.value, t.note ?? "")}
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-full appearance-none cursor-pointer pr-6 ${st.color}`}
                      >
                        {STATUTS.map(s => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                      <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                    </div>

                    <a
                      href={`https://annuaire-entreprises.data.gouv.fr/entreprise/${t.siren}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-colors"
                    >
                      <ExternalLink size={13} />
                    </a>

                    <button
                      onClick={() => removeTarget(t.id, t.siren)}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
