"use client"
import { useState, useEffect } from "react"
import { Plus, X, ChevronRight, ChevronLeft, Trash2, Euro } from "lucide-react"

const STAGES = [
  { id: "analyse",       label: "Analyse",       color: "border-blue-200",   badge: "bg-blue-50 text-blue-600",    dot: "bg-blue-400" },
  { id: "loi",           label: "LOI",            color: "border-amber-200",  badge: "bg-amber-50 text-amber-600",  dot: "bg-amber-400" },
  { id: "due-diligence", label: "Due Diligence",  color: "border-violet-200", badge: "bg-violet-50 text-violet-600",dot: "bg-violet-400" },
  { id: "closing",       label: "Closing",        color: "border-emerald-200",badge: "bg-emerald-50 text-emerald-600",dot:"bg-emerald-400" },
  { id: "portefeuille",  label: "Portefeuille",   color: "border-slate-200",  badge: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
]

type Deal = {
  id: number
  name: string
  siren?: string
  sector?: string
  stage: string
  ev_cible?: number
  note?: string
}

export default function Pipeline() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [email, setEmail] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: "", siren: "", sector: "", ev_cible: "", note: "" })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem("valoris_user")
    const e = raw ? JSON.parse(raw).email : ""
    setEmail(e)
    if (e) load(e)
  }, [])

  async function load(e: string) {
    const res = await fetch(`/api/deals?email=${encodeURIComponent(e)}`)
    setDeals(await res.json())
  }

  async function addDeal() {
    if (!form.name.trim()) return
    setSaving(true)
    await fetch("/api/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        ev_cible: form.ev_cible ? parseFloat(form.ev_cible) : null,
        owner_email: email,
        stage: "analyse",
      }),
    })
    setForm({ name: "", siren: "", sector: "", ev_cible: "", note: "" })
    setShowForm(false)
    setSaving(false)
    load(email)
  }

  async function moveStage(deal: Deal, direction: 1 | -1) {
    const idx = STAGES.findIndex(s => s.id === deal.stage)
    const next = STAGES[idx + direction]
    if (!next) return
    await fetch("/api/deals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...deal, stage: next.id }),
    })
    load(email)
  }

  async function removeDeal(id: number) {
    await fetch(`/api/deals?id=${id}`, { method: "DELETE" })
    load(email)
  }

  const byStage = (stageId: string) => deals.filter(d => d.stage === stageId)
  const formatEV = (v?: number) => v ? `${(v / 1_000_000).toFixed(1)} M€` : null

  return (
    <main className="flex-1 bg-[#f4f7fb] p-8 overflow-hidden flex flex-col">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-8 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pipeline</h1>
          <p className="text-slate-400 text-sm mt-1">Suivi de vos opportunités d'investissement</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-[#1a3a5c] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#0f2a45] transition-all shadow-sm"
        >
          <Plus size={14} />
          Ajouter un deal
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-5 gap-3 mb-6 flex-shrink-0">
        {STAGES.map(s => (
          <div key={s.id} className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${s.dot}`} />
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{s.label}</p>
            </div>
            <p className="text-2xl font-bold text-slate-900">{byStage(s.id).length}</p>
          </div>
        ))}
      </div>

      {/* KANBAN */}
      <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
        {STAGES.map((stage, si) => (
          <div key={stage.id} className={`flex-shrink-0 w-64 flex flex-col rounded-2xl border-2 ${stage.color} bg-white/60`}>
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${stage.dot}`} />
                <p className="text-xs font-semibold text-slate-700">{stage.label}</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stage.badge}`}>
                {byStage(stage.id).length}
              </span>
            </div>

            <div className="flex-1 p-3 space-y-2 overflow-y-auto">
              {byStage(stage.id).length === 0 && (
                <div className="text-center py-8">
                  <p className="text-xs text-slate-300">Aucun deal</p>
                </div>
              )}
              {byStage(stage.id).map(deal => (
                <div key={deal.id} className="bg-white rounded-xl p-3.5 border border-slate-100 shadow-sm group">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-semibold text-slate-900 leading-tight pr-2">{deal.name}</p>
                    <button
                      onClick={() => removeDeal(deal.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all flex-shrink-0"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>

                  {deal.sector && (
                    <p className="text-[11px] text-slate-400 mb-2">{deal.sector}</p>
                  )}

                  {deal.ev_cible && (
                    <div className="flex items-center gap-1 mb-3">
                      <Euro size={11} className="text-[#0d7a5f]" />
                      <p className="text-xs font-semibold text-[#0d7a5f]">{formatEV(deal.ev_cible)}</p>
                    </div>
                  )}

                  {deal.note && (
                    <p className="text-[11px] text-slate-400 italic mb-3 line-clamp-2">{deal.note}</p>
                  )}

                  <div className="flex items-center gap-1.5 mt-2">
                    <button
                      onClick={() => moveStage(deal, -1)}
                      disabled={si === 0}
                      className="flex-1 flex items-center justify-center gap-1 text-[10px] font-medium text-slate-400 hover:text-slate-600 hover:bg-slate-50 py-1 rounded-lg transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={11} /> Reculer
                    </button>
                    <button
                      onClick={() => moveStage(deal, 1)}
                      disabled={si === STAGES.length - 1}
                      className="flex-1 flex items-center justify-center gap-1 text-[10px] font-medium text-[#1a3a5c] hover:text-[#0f2a45] hover:bg-[#1a3a5c]/5 py-1 rounded-lg transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                    >
                      Avancer <ChevronRight size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* MODAL AJOUT */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">Nouveau deal</h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
                <X size={15} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { key: "name",     label: "Nom de l'entreprise *", placeholder: "Ex : Groupe Dupont", required: true },
                { key: "siren",    label: "SIREN",                  placeholder: "9 chiffres" },
                { key: "sector",   label: "Secteur",                placeholder: "Ex : Industrie, SaaS…" },
                { key: "ev_cible", label: "EV cible (€)",           placeholder: "Ex : 5000000" },
                { key: "note",     label: "Note",                   placeholder: "Contexte, thèse d'investissement…" },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 block">{f.label}</label>
                  {f.key === "note" ? (
                    <textarea
                      value={(form as any)[f.key]}
                      onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      rows={3}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#1a3a5c] focus:ring-2 focus:ring-[#1a3a5c]/8 bg-slate-50 focus:bg-white transition-all resize-none"
                    />
                  ) : (
                    <input
                      type={f.key === "ev_cible" ? "number" : "text"}
                      value={(form as any)[f.key]}
                      onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#1a3a5c] focus:ring-2 focus:ring-[#1a3a5c]/8 bg-slate-50 focus:bg-white transition-all"
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors">
                Annuler
              </button>
              <button
                onClick={addDeal}
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
