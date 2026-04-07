"use client"
import { useState, useEffect } from "react"
import { Plus, X, Trash2, Info } from "lucide-react"

// Multiples sectoriels de référence — marché France/Europe, PME non cotées
const BENCHMARKS = [
  { sector: "SaaS / Logiciel",       ev_ebitda: 14.0, ev_revenue: 3.5, pe: 28.0, ev_ebit: 18.0 },
  { sector: "Industrie / Mfg",       ev_ebitda: 7.5,  ev_revenue: 0.9, pe: 14.0, ev_ebit: 9.5  },
  { sector: "Distribution / Négoce", ev_ebitda: 6.0,  ev_revenue: 0.4, pe: 12.0, ev_ebit: 7.5  },
  { sector: "Services B2B",          ev_ebitda: 9.0,  ev_revenue: 1.2, pe: 16.0, ev_ebit: 11.0 },
  { sector: "Santé / Medtech",       ev_ebitda: 13.0, ev_revenue: 2.8, pe: 24.0, ev_ebit: 16.0 },
  { sector: "BTP / Construction",    ev_ebitda: 5.5,  ev_revenue: 0.4, pe: 10.0, ev_ebit: 7.0  },
  { sector: "Agroalimentaire",       ev_ebitda: 8.0,  ev_revenue: 0.8, pe: 14.0, ev_ebit: 10.0 },
  { sector: "Retail / Commerce",     ev_ebitda: 7.0,  ev_revenue: 0.5, pe: 13.0, ev_ebit: 9.0  },
  { sector: "Transport / Logistique",ev_ebitda: 6.5,  ev_revenue: 0.6, pe: 12.0, ev_ebit: 8.0  },
  { sector: "Hôtellerie / Restau.",  ev_ebitda: 8.5,  ev_revenue: 1.0, pe: 18.0, ev_ebit: 11.0 },
  { sector: "Énergie / EnR",         ev_ebitda: 10.0, ev_revenue: 2.0, pe: 20.0, ev_ebit: 13.0 },
  { sector: "Conseil / ESN",         ev_ebitda: 9.5,  ev_revenue: 1.1, pe: 17.0, ev_ebit: 12.0 },
]

const COLS = [
  { key: "ev_ebitda",  label: "EV / EBITDA", tooltip: "Multiple le plus utilisé en M&A PME" },
  { key: "ev_revenue", label: "EV / CA",      tooltip: "Utile quand l'EBITDA est faible ou négatif" },
  { key: "pe",         label: "P / E",         tooltip: "Price / Earnings — valorisation par le résultat net" },
  { key: "ev_ebit",    label: "EV / EBIT",    tooltip: "Exclut D&A — pertinent pour asset-light" },
]

const EMPTY_FORM = { name: "", sector: "", ev_ebitda: "", ev_revenue: "", pe: "", ev_ebit: "", note: "" }

export default function Comparables() {
  const [custom, setCustom] = useState<any[]>([])
  const [email, setEmail] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState("")
  const [tooltip, setTooltip] = useState<string | null>(null)

  useEffect(() => {
    const raw = localStorage.getItem("valoris_user")
    const e = raw ? JSON.parse(raw).email : ""
    setEmail(e)
    if (e) load(e)
  }, [])

  async function load(e: string) {
    const res = await fetch(`/api/comparables?email=${encodeURIComponent(e)}`)
    setCustom(await res.json())
  }

  async function save() {
    if (!form.name.trim()) return
    setSaving(true)
    await fetch("/api/comparables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        ev_ebitda:  form.ev_ebitda  ? parseFloat(form.ev_ebitda)  : null,
        ev_revenue: form.ev_revenue ? parseFloat(form.ev_revenue) : null,
        pe:         form.pe         ? parseFloat(form.pe)         : null,
        ev_ebit:    form.ev_ebit    ? parseFloat(form.ev_ebit)    : null,
        owner_email: email,
      }),
    })
    setForm(EMPTY_FORM)
    setShowForm(false)
    setSaving(false)
    load(email)
  }

  async function remove(id: number) {
    await fetch(`/api/comparables?id=${id}`, { method: "DELETE" })
    load(email)
  }

  const benchmarks = filter
    ? BENCHMARKS.filter(b => b.sector.toLowerCase().includes(filter.toLowerCase()))
    : BENCHMARKS

  const fmt = (v: number | null | undefined) =>
    v != null ? `${v.toFixed(1)}x` : "—"

  return (
    <main className="flex-1 bg-[#f4f7fb] p-8 overflow-y-auto">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Comparables</h1>
          <p className="text-slate-400 text-sm mt-1">Multiples sectoriels de référence · Marché France / Europe PME</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-[#1a3a5c] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#0f2a45] transition-all shadow-sm"
        >
          <Plus size={14} />
          Ajouter un comparable
        </button>
      </div>

      {/* BENCHMARKS SECTORIELS */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mb-6">
        <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Benchmarks sectoriels</h2>
            <p className="text-xs text-slate-400 mt-0.5">Médiane transactions M&A — PME non cotées · 2023–2024</p>
          </div>
          <input
            type="text"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filtrer un secteur…"
            className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-[#1a3a5c] bg-slate-50 focus:bg-white transition-all w-48"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/70">
                <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-6 py-3">Secteur</th>
                {COLS.map(c => (
                  <th key={c.key} className="text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-5 py-3">
                    <button
                      className="flex items-center gap-1 ml-auto"
                      onMouseEnter={() => setTooltip(c.key)}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      {c.label}
                      <Info size={10} className="text-slate-300" />
                    </button>
                    {tooltip === c.key && (
                      <div className="absolute mt-1 right-0 bg-slate-800 text-white text-[10px] px-2.5 py-1.5 rounded-lg shadow-lg z-10 w-48 text-left font-normal normal-case tracking-normal">
                        {c.tooltip}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {benchmarks.map((b, i) => (
                <tr key={i} className="border-t border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-3.5 text-sm text-slate-700 font-medium">{b.sector}</td>
                  {COLS.map(c => (
                    <td key={c.key} className="px-5 py-3.5 text-sm text-right font-bold text-slate-900 tabular-nums">
                      {fmt((b as any)[c.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* COMPARABLES PERSONNALISÉS */}
      {custom.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="px-6 py-5 border-b border-slate-50">
            <h2 className="text-sm font-semibold text-slate-900">Mes comparables</h2>
            <p className="text-xs text-slate-400 mt-0.5">{custom.length} société{custom.length > 1 ? "s" : ""} ajoutée{custom.length > 1 ? "s" : ""}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/70">
                  <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-6 py-3">Société</th>
                  <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-4 py-3">Secteur</th>
                  {COLS.map(c => (
                    <th key={c.key} className="text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-5 py-3">{c.label}</th>
                  ))}
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {custom.map((c: any) => (
                  <tr key={c.id} className="border-t border-slate-50 hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-3.5 text-sm font-semibold text-slate-900">{c.name}</td>
                    <td className="px-4 py-3.5 text-xs text-slate-400">{c.sector ?? "—"}</td>
                    {COLS.map(col => (
                      <td key={col.key} className="px-5 py-3.5 text-sm text-right font-bold text-[#1a3a5c] tabular-nums">
                        {fmt(c[col.key])}
                      </td>
                    ))}
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => remove(c.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 transition-all"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">Ajouter un comparable</h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
                <X size={15} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { key: "name",       label: "Nom *",         placeholder: "Ex : Elis SA",   type: "text" },
                { key: "sector",     label: "Secteur",        placeholder: "Ex : Services B2B", type: "text" },
                { key: "ev_ebitda",  label: "EV / EBITDA",   placeholder: "Ex : 8.5",       type: "number" },
                { key: "ev_revenue", label: "EV / CA",       placeholder: "Ex : 1.2",       type: "number" },
                { key: "pe",         label: "P / E",          placeholder: "Ex : 16.0",      type: "number" },
                { key: "ev_ebit",    label: "EV / EBIT",     placeholder: "Ex : 11.0",      type: "number" },
                { key: "note",       label: "Note",           placeholder: "Source, date…",  type: "text" },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 block">{f.label}</label>
                  <input
                    type={f.type}
                    value={(form as any)[f.key]}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#1a3a5c] focus:ring-2 focus:ring-[#1a3a5c]/8 bg-slate-50 focus:bg-white transition-all"
                  />
                </div>
              ))}
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors">
                Annuler
              </button>
              <button
                onClick={save}
                disabled={saving || !form.name.trim()}
                className="flex-1 py-2.5 bg-[#1a3a5c] text-white text-sm font-medium rounded-xl hover:bg-[#0f2a45] transition-colors disabled:opacity-50"
              >
                {saving ? "Enregistrement…" : "Ajouter"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
