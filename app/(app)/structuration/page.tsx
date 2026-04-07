"use client"
import { useState } from "react"

const MULTIPLES_SORTIE = [1.0, 1.5, 2.0, 2.5, 3.0, 4.0]
const DUREES = [3, 4, 5, 7]

function calcTRI(mise: number, retour: number, annees: number): number {
  if (mise <= 0 || retour <= 0) return 0
  return (Math.pow(retour / mise, 1 / annees) - 1) * 100
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M€`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} k€`
  return `${n.toFixed(0)} €`
}

function pct(n: number) { return `${n.toFixed(1)}%` }

type CapRow = { label: string; pct: number; color: string }

export default function Structuration() {
  // Paramètres deal
  const [ev, setEv] = useState(10_000_000)
  const [equityPct, setEquityPct] = useState(40)
  const [detteSeniorPct, setDetteSeniorPct] = useState(45)
  const [detteMezzPct, setDetteMezzPct] = useState(15)

  // Cap table
  const [capRows, setCapRows] = useState<CapRow[]>([
    { label: "Investisseur lead", pct: 60, color: "bg-[#1a3a5c]" },
    { label: "Management",        pct: 25, color: "bg-[#0d7a5f]" },
    { label: "Co-investisseurs",  pct: 15, color: "bg-amber-400" },
  ])

  const equity      = ev * (equityPct / 100)
  const detteSenior = ev * (detteSeniorPct / 100)
  const detteMezz   = ev * (detteMezzPct / 100)
  const totalDebt   = detteSenior + detteMezz
  const leverage    = equity > 0 ? totalDebt / equity : 0

  const totalCapPct = capRows.reduce((s, r) => s + r.pct, 0)

  function updateCapRow(i: number, field: keyof CapRow, value: any) {
    setCapRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r))
  }

  function addCapRow() {
    const remaining = Math.max(0, 100 - totalCapPct)
    setCapRows(prev => [...prev, { label: "Nouvel actionnaire", pct: remaining, color: "bg-violet-400" }])
  }

  function removeCapRow(i: number) {
    setCapRows(prev => prev.filter((_, idx) => idx !== i))
  }

  // Waterfall exit : on rembourse la dette d'abord, puis on distribue l'equity
  function waterfallAtMultiple(multiple: number) {
    const evSortie = ev * multiple
    const remboursementDette = Math.min(evSortie, totalDebt)
    const proceedsEquity = Math.max(0, evSortie - remboursementDette)
    const moic = equity > 0 ? proceedsEquity / equity : 0

    const distribution = capRows.map(r => ({
      label: r.label,
      pct: r.pct,
      montant: proceedsEquity * (r.pct / 100),
    }))

    return { evSortie, remboursementDette, proceedsEquity, moic, distribution }
  }

  const COLORS = ["bg-[#1a3a5c]", "bg-[#0d7a5f]", "bg-amber-400", "bg-violet-400", "bg-rose-400", "bg-cyan-500"]

  return (
    <main className="flex-1 bg-[#f4f7fb] p-8 overflow-y-auto">

      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Structuration</h1>
        <p className="text-slate-400 text-sm mt-1">Structure financière, table de capitalisation et simulation de sortie</p>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">

        {/* PARAMÈTRES DEAL */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-5">Paramètres du deal</h2>

          <div className="space-y-5">
            {/* EV */}
            <div>
              <div className="flex justify-between mb-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Valeur d'entreprise (EV)</label>
                <span className="text-xs font-bold text-slate-900">{fmt(ev)}</span>
              </div>
              <input type="range" min={500_000} max={100_000_000} step={500_000}
                value={ev} onChange={e => setEv(+e.target.value)}
                className="w-full accent-[#1a3a5c]" />
              <div className="flex justify-between text-[10px] text-slate-300 mt-0.5">
                <span>0.5 M€</span><span>100 M€</span>
              </div>
            </div>

            {/* Equity */}
            <div>
              <div className="flex justify-between mb-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Equity</label>
                <span className="text-xs font-bold text-[#1a3a5c]">{pct(equityPct)} · {fmt(equity)}</span>
              </div>
              <input type="range" min={0} max={100} step={1}
                value={equityPct} onChange={e => setEquityPct(+e.target.value)}
                className="w-full accent-[#1a3a5c]" />
            </div>

            {/* Dette senior */}
            <div>
              <div className="flex justify-between mb-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Dette senior</label>
                <span className="text-xs font-bold text-slate-600">{pct(detteSeniorPct)} · {fmt(detteSenior)}</span>
              </div>
              <input type="range" min={0} max={100} step={1}
                value={detteSeniorPct} onChange={e => setDetteSeniorPct(+e.target.value)}
                className="w-full accent-slate-500" />
            </div>

            {/* Mezzanine */}
            <div>
              <div className="flex justify-between mb-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Mezzanine</label>
                <span className="text-xs font-bold text-amber-600">{pct(detteMezzPct)} · {fmt(detteMezz)}</span>
              </div>
              <input type="range" min={0} max={100} step={1}
                value={detteMezzPct} onChange={e => setDetteMezzPct(+e.target.value)}
                className="w-full accent-amber-500" />
            </div>
          </div>

          {/* Résumé structure */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            {[
              { label: "Equity",   value: fmt(equity),      sub: pct(equityPct),      color: "text-[#1a3a5c]" },
              { label: "Dette",    value: fmt(totalDebt),   sub: pct(detteSeniorPct + detteMezzPct), color: "text-slate-600" },
              { label: "Leverage", value: `${leverage.toFixed(1)}x`, sub: "D/E ratio", color: leverage > 4 ? "text-red-500" : "text-emerald-600" },
            ].map(k => (
              <div key={k.label} className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">{k.label}</p>
                <p className={`text-base font-bold tabular-nums ${k.color}`}>{k.value}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{k.sub}</p>
              </div>
            ))}
          </div>

          {/* Barre de structure */}
          <div className="mt-4 h-3 rounded-full overflow-hidden flex">
            <div className="bg-[#1a3a5c] transition-all" style={{ width: `${equityPct}%` }} />
            <div className="bg-slate-400 transition-all" style={{ width: `${detteSeniorPct}%` }} />
            <div className="bg-amber-400 transition-all" style={{ width: `${detteMezzPct}%` }} />
          </div>
          <div className="flex gap-4 mt-2">
            {[
              { label: "Equity", color: "bg-[#1a3a5c]" },
              { label: "Senior", color: "bg-slate-400" },
              { label: "Mezz",   color: "bg-amber-400" },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${l.color}`} />
                <span className="text-[10px] text-slate-400">{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CAP TABLE */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-slate-900">Table de capitalisation</h2>
            <button onClick={addCapRow} className="text-[11px] text-[#1a3a5c] font-medium hover:underline">+ Ajouter</button>
          </div>

          {/* Donut simplifié */}
          <div className="flex gap-2 mb-5">
            {capRows.map((r, i) => (
              <div key={i} title={`${r.label} ${r.pct}%`}
                className={`h-3 rounded-full transition-all ${COLORS[i % COLORS.length]}`}
                style={{ width: `${(r.pct / Math.max(totalCapPct, 1)) * 100}%` }}
              />
            ))}
          </div>

          <div className="space-y-3">
            {capRows.map((r, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${COLORS[i % COLORS.length]}`} />
                <input
                  type="text"
                  value={r.label}
                  onChange={e => updateCapRow(i, "label", e.target.value)}
                  className="flex-1 text-sm text-slate-700 border-none outline-none bg-transparent font-medium"
                />
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={r.pct}
                    onChange={e => updateCapRow(i, "pct", parseFloat(e.target.value) || 0)}
                    className="w-14 text-sm font-bold text-right text-slate-900 border border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-[#1a3a5c]"
                  />
                  <span className="text-xs text-slate-400">%</span>
                </div>
                {capRows.length > 1 && (
                  <button onClick={() => removeCapRow(i)} className="text-slate-300 hover:text-red-400 transition-colors text-xs">✕</button>
                )}
              </div>
            ))}
          </div>

          {totalCapPct !== 100 && (
            <p className={`text-xs mt-3 font-medium ${totalCapPct > 100 ? "text-red-500" : "text-amber-500"}`}>
              Total : {pct(totalCapPct)} {totalCapPct > 100 ? "(dépasse 100%)" : `(manque ${pct(100 - totalCapPct)})`}
            </p>
          )}

          {/* Montants equity par actionnaire */}
          <div className="mt-5 pt-4 border-t border-slate-50 space-y-2">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Mise de fonds</p>
            {capRows.map((r, i) => (
              <div key={i} className="flex justify-between items-center">
                <p className="text-xs text-slate-600">{r.label}</p>
                <p className="text-xs font-bold text-slate-900 tabular-nums">{fmt(equity * r.pct / 100)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SIMULATION DE SORTIE */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="px-6 py-5 border-b border-slate-50">
          <h2 className="text-sm font-semibold text-slate-900">Simulation de sortie</h2>
          <p className="text-xs text-slate-400 mt-0.5">Waterfall de distribution selon le multiple de sortie</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/70">
                <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-6 py-3">Indicateur</th>
                {MULTIPLES_SORTIE.map(m => (
                  <th key={m} className="text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-4 py-3">
                    {m}x EV
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* EV de sortie */}
              <tr className="border-t border-slate-50">
                <td className="px-6 py-3 text-xs text-slate-500">EV de sortie</td>
                {MULTIPLES_SORTIE.map(m => {
                  const w = waterfallAtMultiple(m)
                  return <td key={m} className="px-4 py-3 text-xs text-right text-slate-700 font-semibold tabular-nums">{fmt(w.evSortie)}</td>
                })}
              </tr>
              {/* Remboursement dette */}
              <tr className="border-t border-slate-50">
                <td className="px-6 py-3 text-xs text-slate-500">Remboursement dette</td>
                {MULTIPLES_SORTIE.map(m => {
                  const w = waterfallAtMultiple(m)
                  return <td key={m} className="px-4 py-3 text-xs text-right text-red-400 font-semibold tabular-nums">−{fmt(w.remboursementDette)}</td>
                })}
              </tr>
              {/* Proceeds equity */}
              <tr className="border-t border-slate-100 bg-blue-50/30">
                <td className="px-6 py-3 text-xs font-semibold text-[#1a3a5c]">Proceeds equity</td>
                {MULTIPLES_SORTIE.map(m => {
                  const w = waterfallAtMultiple(m)
                  return <td key={m} className="px-4 py-3 text-xs text-right font-bold text-[#1a3a5c] tabular-nums">{fmt(w.proceedsEquity)}</td>
                })}
              </tr>
              {/* MOIC */}
              <tr className="border-t border-slate-50 bg-emerald-50/30">
                <td className="px-6 py-3 text-xs font-semibold text-[#0d7a5f]">MOIC</td>
                {MULTIPLES_SORTIE.map(m => {
                  const w = waterfallAtMultiple(m)
                  return (
                    <td key={m} className={`px-4 py-3 text-xs text-right font-bold tabular-nums ${w.moic >= 2 ? "text-[#0d7a5f]" : w.moic >= 1 ? "text-amber-600" : "text-red-500"}`}>
                      {w.moic.toFixed(2)}x
                    </td>
                  )
                })}
              </tr>
              {/* TRI par durée */}
              {DUREES.map(dur => (
                <tr key={dur} className="border-t border-slate-50">
                  <td className="px-6 py-3 text-xs text-slate-500">TRI ({dur} ans)</td>
                  {MULTIPLES_SORTIE.map(m => {
                    const w = waterfallAtMultiple(m)
                    const tri = calcTRI(equity, w.proceedsEquity, dur)
                    return (
                      <td key={m} className={`px-4 py-3 text-xs text-right font-semibold tabular-nums ${tri >= 20 ? "text-[#0d7a5f]" : tri >= 10 ? "text-amber-600" : "text-red-400"}`}>
                        {tri > 0 ? pct(tri) : "—"}
                      </td>
                    )
                  })}
                </tr>
              ))}
              {/* Distribution par actionnaire au 2x */}
              <tr className="border-t border-slate-100">
                <td colSpan={MULTIPLES_SORTIE.length + 1} className="px-6 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                  Distribution à 2x EV
                </td>
              </tr>
              {waterfallAtMultiple(2).distribution.map((d, i) => (
                <tr key={i} className="border-t border-slate-50">
                  <td className="px-6 py-3 text-xs text-slate-500">{d.label} ({pct(d.pct)})</td>
                  <td colSpan={MULTIPLES_SORTIE.length} className="px-4 py-3 text-xs font-bold text-slate-900 tabular-nums">
                    {fmt(d.montant)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
