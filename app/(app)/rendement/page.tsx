"use client"
import { useState, useEffect } from "react"
import { Plus, X, Trash2, TrendingUp, TrendingDown, Minus } from "lucide-react"

type Position = {
  id: number
  name: string
  sector?: string
  date_entree: string
  date_sortie?: string
  mise: number
  valeur?: number
  statut: "actif" | "réalisé" | "déprécié"
  note?: string
}

const EMPTY_FORM = {
  name: "", sector: "", date_entree: "", date_sortie: "",
  mise: "", valeur: "", statut: "actif", note: ""
}

function annees(entree: string, sortie?: string) {
  const d1 = new Date(entree)
  const d2 = sortie ? new Date(sortie) : new Date()
  return Math.max((d2.getTime() - d1.getTime()) / (365.25 * 24 * 3600 * 1000), 0.01)
}

function calcTRI(mise: number, valeur: number, ans: number) {
  if (mise <= 0 || valeur <= 0) return null
  return (Math.pow(valeur / mise, 1 / ans) - 1) * 100
}

function moic(mise: number, valeur?: number) {
  if (!valeur || mise <= 0) return null
  return valeur / mise
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)} M€`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} k€`
  return `${n.toFixed(0)} €`
}

function fmtPct(n: number | null) {
  return n != null ? `${n.toFixed(1)}%` : "—"
}

function fmtX(n: number | null) {
  return n != null ? `${n.toFixed(2)}x` : "—"
}

const STATUT_STYLE: Record<string, string> = {
  "actif":      "bg-blue-50 text-blue-600",
  "réalisé":   "bg-emerald-50 text-emerald-700",
  "déprécié":  "bg-red-50 text-red-500",
}

export default function Rendement() {
  const [positions, setPositions] = useState<Position[]>([])
  const [email, setEmail] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Position | null>(null)
  const [form, setForm] = useState<any>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem("valoris_user")
    const e = raw ? JSON.parse(raw).email : ""
    setEmail(e)
    if (e) load(e)
  }, [])

  async function load(e: string) {
    const res = await fetch(`/api/positions?email=${encodeURIComponent(e)}`)
    setPositions(await res.json())
  }

  function openAdd() { setEditing(null); setForm(EMPTY_FORM); setShowForm(true) }
  function openEdit(p: Position) {
    setEditing(p)
    setForm({
      name: p.name, sector: p.sector ?? "", date_entree: p.date_entree,
      date_sortie: p.date_sortie ?? "", mise: String(p.mise),
      valeur: p.valeur != null ? String(p.valeur) : "",
      statut: p.statut, note: p.note ?? ""
    })
    setShowForm(true)
  }

  async function save() {
    if (!form.name || !form.date_entree || !form.mise) return
    setSaving(true)
    const body = {
      ...form,
      mise: parseFloat(form.mise),
      valeur: form.valeur ? parseFloat(form.valeur) : null,
      date_sortie: form.date_sortie || null,
      owner_email: email,
    }
    if (editing) {
      await fetch("/api/positions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, id: editing.id }),
      })
    } else {
      await fetch("/api/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    }
    setShowForm(false)
    setSaving(false)
    load(email)
  }

  async function remove(id: number) {
    await fetch(`/api/positions?id=${id}`, { method: "DELETE" })
    load(email)
  }

  // Agrégats portefeuille
  const totalMise    = positions.reduce((s, p) => s + p.mise, 0)
  const totalValeur  = positions.reduce((s, p) => s + (p.valeur ?? p.mise), 0)
  const moicGlobal   = totalMise > 0 ? totalValeur / totalMise : null
  const actifs       = positions.filter(p => p.statut === "actif").length
  const realises     = positions.filter(p => p.statut === "réalisé").length
  const plusValue    = totalValeur - totalMise

  return (
    <main className="flex-1 bg-[#f4f7fb] p-8 overflow-y-auto">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Rendement</h1>
          <p className="text-slate-400 text-sm mt-1">Suivi des performances de votre portefeuille</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-[#1a3a5c] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#0f2a45] transition-all shadow-sm"
        >
          <Plus size={14} />
          Ajouter une position
        </button>
      </div>

      {/* KPIs PORTEFEUILLE */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Capital investi",  value: fmt(totalMise),   sub: `${positions.length} position${positions.length > 1 ? "s" : ""}`, color: "text-slate-900" },
          { label: "Valeur actuelle",  value: fmt(totalValeur), sub: plusValue >= 0 ? `+${fmt(plusValue)}` : `−${fmt(Math.abs(plusValue))}`, color: plusValue >= 0 ? "text-[#0d7a5f]" : "text-red-500" },
          { label: "MOIC global",      value: fmtX(moicGlobal), sub: moicGlobal != null && moicGlobal >= 1 ? "Performance positive" : "Sous la mise", color: moicGlobal != null && moicGlobal >= 1 ? "text-[#0d7a5f]" : "text-red-500" },
          { label: "Deals",            value: `${actifs} actifs`, sub: `${realises} réalisé${realises > 1 ? "s" : ""}`, color: "text-[#1a3a5c]" },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">{k.label}</p>
            <p className={`text-2xl font-bold tabular-nums mb-1 ${k.color}`}>{k.value}</p>
            <p className="text-xs text-slate-400">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* TABLEAU DES POSITIONS */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="px-6 py-5 border-b border-slate-50">
          <h2 className="text-sm font-semibold text-slate-900">Positions</h2>
          <p className="text-xs text-slate-400 mt-0.5">Cliquez sur une ligne pour modifier</p>
        </div>

        {positions.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4">
              <TrendingUp size={24} className="text-slate-300" />
            </div>
            <p className="text-sm font-semibold text-slate-700 mb-1">Aucune position</p>
            <p className="text-xs text-slate-400">Ajoutez vos investissements pour suivre leur performance</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/70">
                  {["Entreprise", "Entrée", "Mise", "Valeur actuelle", "MOIC", "TRI", "Durée", "Statut", ""].map(h => (
                    <th key={h} className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-5 py-3 first:pl-6">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {positions.map(p => {
                  const ans     = annees(p.date_entree, p.date_sortie)
                  const m       = moic(p.mise, p.valeur)
                  const tri     = p.valeur ? calcTRI(p.mise, p.valeur, ans) : null
                  const positif = m != null && m >= 1
                  const TrendIcon = m == null ? Minus : positif ? TrendingUp : TrendingDown

                  return (
                    <tr
                      key={p.id}
                      onClick={() => openEdit(p)}
                      className="border-t border-slate-50 hover:bg-slate-50/60 cursor-pointer transition-colors group"
                    >
                      <td className="pl-6 pr-5 py-4">
                        <p className="text-sm font-semibold text-slate-900">{p.name}</p>
                        {p.sector && <p className="text-xs text-slate-400 mt-0.5">{p.sector}</p>}
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-500 tabular-nums">
                        {new Date(p.date_entree).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-slate-900 tabular-nums">{fmt(p.mise)}</td>
                      <td className="px-5 py-4 text-sm font-semibold tabular-nums text-slate-900">
                        {p.valeur != null ? fmt(p.valeur) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <TrendIcon size={13} className={m == null ? "text-slate-300" : positif ? "text-[#0d7a5f]" : "text-red-400"} />
                          <span className={`text-sm font-bold tabular-nums ${m == null ? "text-slate-300" : positif ? "text-[#0d7a5f]" : "text-red-500"}`}>
                            {fmtX(m)}
                          </span>
                        </div>
                      </td>
                      <td className={`px-5 py-4 text-sm font-bold tabular-nums ${tri == null ? "text-slate-300" : tri >= 20 ? "text-[#0d7a5f]" : tri >= 10 ? "text-amber-600" : "text-red-400"}`}>
                        {fmtPct(tri)}
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-500 tabular-nums">
                        {ans.toFixed(1)} ans
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUT_STYLE[p.statut] ?? STATUT_STYLE.actif}`}>
                          {p.statut.charAt(0).toUpperCase() + p.statut.slice(1)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={e => { e.stopPropagation(); remove(p.id) }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 transition-all"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 sticky top-0 bg-white">
              <h2 className="text-sm font-semibold text-slate-900">
                {editing ? "Modifier la position" : "Nouvelle position"}
              </h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
                <X size={15} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { key: "name",        label: "Entreprise *",   placeholder: "Ex : Groupe Dupont", type: "text" },
                { key: "sector",      label: "Secteur",         placeholder: "Ex : Industrie",    type: "text" },
                { key: "date_entree", label: "Date d'entrée *", placeholder: "",                  type: "date" },
                { key: "date_sortie", label: "Date de sortie",  placeholder: "",                  type: "date" },
                { key: "mise",        label: "Capital investi (€) *", placeholder: "Ex : 500000", type: "number" },
                { key: "valeur",      label: "Valeur actuelle (€)", placeholder: "Ex : 850000",   type: "number" },
                { key: "note",        label: "Note",            placeholder: "Thèse, observations…", type: "text" },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 block">{f.label}</label>
                  <input
                    type={f.type}
                    value={form[f.key]}
                    onChange={e => setForm((prev: any) => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#1a3a5c] focus:ring-2 focus:ring-[#1a3a5c]/8 bg-slate-50 focus:bg-white transition-all"
                  />
                </div>
              ))}
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 block">Statut</label>
                <select
                  value={form.statut}
                  onChange={e => setForm((prev: any) => ({ ...prev, statut: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#1a3a5c] bg-slate-50 focus:bg-white transition-all"
                >
                  <option value="actif">Actif</option>
                  <option value="réalisé">Réalisé</option>
                  <option value="déprécié">Déprécié</option>
                </select>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3 sticky bottom-0 bg-white pt-2 border-t border-slate-50">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors">
                Annuler
              </button>
              <button
                onClick={save}
                disabled={saving || !form.name || !form.date_entree || !form.mise}
                className="flex-1 py-2.5 bg-[#1a3a5c] text-white text-sm font-medium rounded-xl hover:bg-[#0f2a45] transition-colors disabled:opacity-50"
              >
                {saving ? "Enregistrement…" : editing ? "Mettre à jour" : "Ajouter"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
