"use client"
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { BarChart2 } from "lucide-react"
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from "recharts"

type Tab = "cr" | "bilan" | "flux" | "annexes"

const TABS: { id: Tab; label: string }[] = [
  { id: "cr",      label: "Compte de résultat" },
  { id: "bilan",   label: "Bilan" },
  { id: "flux",    label: "Flux de trésorerie" },
  { id: "annexes", label: "Annexes" },
]

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-100 shadow-lg rounded-xl p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ background: p.fill ?? p.stroke }} />
          <span className="text-slate-500">{p.name}</span>
          <span className="font-bold text-slate-800 ml-auto pl-4">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function EtatsFinanciers() {
  const [financials, setFinancials] = useState<any[]>([])
  const [companyName, setCompanyName] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [noCompany, setNoCompany] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>("cr")
  const searchParams = useSearchParams()

  useEffect(() => {
    const companyIdParam = searchParams.get("company_id")
    const raw = localStorage.getItem("valoris_user")
    const email = raw ? JSON.parse(raw).email : null
    const companiesUrl = email ? `/api/companies?email=${encodeURIComponent(email)}` : "/api/companies"

    fetch(companiesUrl)
      .then(r => r.json())
      .then(companies => {
        if (!companies || companies.length === 0) {
          setNoCompany(true)
          setLoading(false)
          return
        }
        const company = (companyIdParam && companies.find((c: any) => c.id === parseInt(companyIdParam)))
          ?? companies[0]
        setCompanyName(company.name)
        return fetch(`/api/financials?company_id=${company.id}`)
          .then(r => r.json())
          .then(data => {
            const sorted = [...data].sort((a: any, b: any) => a.fiscal_year - b.fiscal_year)
            setFinancials(sorted)
            setLoading(false)
          })
      })
  }, [searchParams])

  if (loading) return (
    <main className="flex-1 bg-[#f4f7fb] p-8">
      <div className="flex items-center gap-3 text-slate-400">
        <div className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-[#1a3a5c] animate-spin" />
        Chargement…
      </div>
    </main>
  )

  if (noCompany) return (
    <main className="flex-1 bg-[#f4f7fb] p-8 flex items-center justify-center">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center max-w-lg">
        <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-5">
          <BarChart2 size={28} className="text-slate-300" />
        </div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Aucune entreprise</h2>
        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
          Ajoutez une entreprise depuis le workspace pour consulter ses états financiers.
        </p>
        <a
          href="/workspace"
          className="inline-flex items-center gap-2 bg-[#1a3a5c] text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-[#0f2a45] transition-all shadow-sm"
        >
          Aller au workspace →
        </a>
      </div>
    </main>
  )

  if (financials.length === 0) return (
    <main className="flex-1 bg-[#f4f7fb] p-8 flex items-center justify-center">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center max-w-lg">
        <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-5">
          <span className="text-3xl">📊</span>
        </div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Aucune donnée financière</h2>
        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
          Complétez les états financiers de cette entreprise pour afficher les graphiques et ratios.
        </p>
        <a
          href="/analyse"
          className="inline-flex items-center gap-2 bg-[#1a3a5c] text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-[#0f2a45] transition-all shadow-sm"
        >
          Compléter les données →
        </a>
      </div>
    </main>
  )

  const formatM   = (v: number) => v ? `${(v / 1_000_000).toFixed(1)}M` : "0"
  const formatPct = (v: number) => v ? `${(v * 100).toFixed(1)}%` : "—"

  const latest = financials[financials.length - 1]
  const prev   = financials[financials.length - 2]

  const chartDataCR = financials.map(f => ({
    year: f.fiscal_year.toString(),
    CA: Math.round(f.revenue / 1_000_000),
    EBITDA: Math.round(f.ebitda / 1_000_000),
    "Marge EBITDA": f.ebitda && f.revenue ? parseFloat((f.ebitda / f.revenue * 100).toFixed(1)) : 0,
    "Marge nette":  f.net_income && f.revenue ? parseFloat((f.net_income / f.revenue * 100).toFixed(1)) : 0,
    "Marge brute":  f.gross_margin && f.revenue ? parseFloat((f.gross_margin / f.revenue * 100).toFixed(1)) : 0,
  }))

  const chartDataFlux = financials.map(f => ({
    year: f.fiscal_year.toString(),
    FCF:   Math.round((f.fcf   ?? 0) / 1_000_000),
    Capex: Math.round((f.capex ?? 0) / 1_000_000),
    ΔBFr:  Math.round((f.delta_wc ?? 0) / 1_000_000),
  }))

  return (
    <main className="flex-1 bg-[#f4f7fb] p-8">

      {/* HEADER */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">États financiers</h1>
          <p className="text-slate-400 text-sm mt-1">{companyName} · Historique {financials.length} exercice{financials.length > 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* ONGLETS */}
      <div className="flex gap-1 mb-6 bg-white rounded-xl border border-slate-100 shadow-sm p-1 w-fit">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
              activeTab === tab.id
                ? "bg-[#1a3a5c] text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── COMPTE DE RÉSULTAT ── */}
      {activeTab === "cr" && (
        <>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mb-5">
            <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Compte de résultat</h2>
                <p className="text-xs text-slate-400 mt-0.5">En millions d'euros</p>
              </div>
              <span className="text-xs text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                {financials.length} exercices
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/70">
                    <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-6 py-3">Indicateur</th>
                    {financials.map(f => (
                      <th key={f.fiscal_year} className="text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-4 py-3">
                        {f.fiscal_year}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "Chiffre d'affaires", key: "revenue" },
                    { label: "Marge brute",        key: "gross_margin" },
                    { label: "EBITDA",             key: "ebitda" },
                    { label: "EBIT",               key: "ebit" },
                    { label: "Résultat net",       key: "net_income" },
                  ].map((row, ri) => (
                    <tr key={row.key} className={`border-t border-slate-50 hover:bg-slate-50/50 transition-colors ${ri === 0 ? "font-semibold" : ""}`}>
                      <td className="px-6 py-3.5 text-sm text-slate-600">{row.label}</td>
                      {financials.map(f => (
                        <td key={f.fiscal_year} className={`px-4 py-3.5 text-sm text-right tabular-nums font-semibold ${
                          f[row.key] < 0 ? "text-red-500" : "text-slate-900"
                        }`}>
                          {formatM(f[row.key])} M€
                        </td>
                      ))}
                    </tr>
                  ))}
                  {[
                    { label: "Marge EBITDA", fn: (f: any) => formatPct(f.ebitda / f.revenue) },
                    { label: "Marge nette",  fn: (f: any) => formatPct(f.net_income / f.revenue) },
                  ].map(row => (
                    <tr key={row.label} className="border-t border-slate-100 bg-slate-50/40">
                      <td className="px-6 py-3 text-sm font-medium text-slate-500">{row.label}</td>
                      {financials.map(f => (
                        <td key={f.fiscal_year} className="px-4 py-3 text-sm text-right font-bold text-[#0d7a5f] tabular-nums">
                          {row.fn(f)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5 mb-5">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-slate-900 mb-4">CA & EBITDA (M€)</h2>
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={chartDataCR} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="2 4" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />
                  <Bar dataKey="CA"     fill="#1a3a5c" radius={[5,5,0,0]} />
                  <Bar dataKey="EBITDA" fill="#0d7a5f" radius={[5,5,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-slate-900 mb-4">Évolution des marges (%)</h2>
              <ResponsiveContainer width="100%" height={210}>
                <LineChart data={chartDataCR}>
                  <CartesianGrid strokeDasharray="2 4" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="Marge brute"  stroke="#1a3a5c" strokeWidth={2.5} dot={{ r: 4, fill: "#1a3a5c" }} />
                  <Line type="monotone" dataKey="Marge EBITDA" stroke="#0d7a5f" strokeWidth={2.5} dot={{ r: 4, fill: "#0d7a5f" }} />
                  <Line type="monotone" dataKey="Marge nette"  stroke="#d97706" strokeWidth={2.5} dot={{ r: 4, fill: "#d97706" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Ratios KPI */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Ratios clés · Exercice {latest?.fiscal_year}</h2>
            <div className="grid grid-cols-4 gap-3">
              {[
                {
                  label: "Croissance CA",
                  value: prev
                    ? `${((latest.revenue - prev.revenue) / prev.revenue * 100).toFixed(1)}%`
                    : "—",
                  positive: prev ? latest.revenue >= prev.revenue : null,
                },
                {
                  label: "Marge brute",
                  value: formatPct(latest.gross_margin / latest.revenue),
                  positive: true,
                },
                {
                  label: "Marge EBITDA",
                  value: formatPct(latest.ebitda / latest.revenue),
                  positive: true,
                },
                {
                  label: "Marge nette",
                  value: formatPct(latest.net_income / latest.revenue),
                  positive: latest?.net_income >= 0,
                },
              ].map(kpi => (
                <div key={kpi.label} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-2">{kpi.label}</p>
                  <p className={`text-xl font-bold tabular-nums ${
                    kpi.positive === true ? "text-[#0d7a5f]" :
                    kpi.positive === false ? "text-red-500" :
                    "text-slate-900"
                  }`}>
                    {kpi.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── BILAN ── */}
      {activeTab === "bilan" && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="px-6 py-5 border-b border-slate-50">
            <h2 className="text-sm font-semibold text-slate-900">Bilan simplifié</h2>
            <p className="text-xs text-slate-400 mt-0.5">En millions d'euros</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/70">
                  <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-6 py-3">Poste</th>
                  {financials.map(f => (
                    <th key={f.fiscal_year} className="text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-4 py-3">
                      {f.fiscal_year}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={financials.length + 1} className="px-6 pt-4 pb-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Actif</span>
                  </td>
                </tr>
                {[
                  { label: "Total actif",               key: "total_assets" },
                  { label: "Besoin en fonds de roulement", key: "working_capital" },
                ].map(row => (
                  <tr key={row.key} className="border-t border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3.5 text-sm text-slate-600">{row.label}</td>
                    {financials.map(f => (
                      <td key={f.fiscal_year} className="px-4 py-3.5 text-sm text-right font-semibold text-slate-900 tabular-nums">
                        {formatM(f[row.key])} M€
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td colSpan={financials.length + 1} className="px-6 pt-5 pb-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Passif</span>
                  </td>
                </tr>
                {[
                  { label: "Capitaux propres", key: "equity" },
                  { label: "Dette nette",      key: "net_debt" },
                ].map(row => (
                  <tr key={row.key} className="border-t border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3.5 text-sm text-slate-600">{row.label}</td>
                    {financials.map(f => (
                      <td key={f.fiscal_year} className={`px-4 py-3.5 text-sm text-right font-semibold tabular-nums ${
                        f[row.key] < 0 ? "text-red-500" : "text-slate-900"
                      }`}>
                        {formatM(f[row.key])} M€
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="border-t border-slate-100 bg-slate-50/40">
                  <td className="px-6 py-3 text-sm font-medium text-slate-500">Levier (Dette / CP)</td>
                  {financials.map(f => (
                    <td key={f.fiscal_year} className="px-4 py-3 text-sm text-right font-bold text-[#0d7a5f] tabular-nums">
                      {f.equity ? `${(f.net_debt / f.equity).toFixed(2)}x` : "—"}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── FLUX ── */}
      {activeTab === "flux" && (
        <>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mb-5">
            <div className="px-6 py-5 border-b border-slate-50">
              <h2 className="text-sm font-semibold text-slate-900">Flux de trésorerie</h2>
              <p className="text-xs text-slate-400 mt-0.5">En millions d'euros</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/70">
                    <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-6 py-3">Poste</th>
                    {financials.map(f => (
                      <th key={f.fiscal_year} className="text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-4 py-3">
                        {f.fiscal_year}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "EBITDA",           key: "ebitda",   bold: false },
                    { label: "Variation du BFR", key: "delta_wc", bold: false },
                    { label: "Capex",            key: "capex",    bold: false },
                    { label: "Free Cash Flow",   key: "fcf",      bold: true },
                  ].map(row => (
                    <tr key={row.key} className={`border-t border-slate-50 hover:bg-slate-50/50 transition-colors ${row.bold ? "bg-emerald-50/40" : ""}`}>
                      <td className={`px-6 py-3.5 text-sm ${row.bold ? "font-semibold text-slate-900" : "text-slate-600"}`}>
                        {row.label}
                      </td>
                      {financials.map(f => (
                        <td key={f.fiscal_year} className={`px-4 py-3.5 text-sm text-right tabular-nums ${
                          row.bold ? "font-bold text-[#0d7a5f]" :
                          (f[row.key] ?? 0) < 0 ? "font-semibold text-red-500" :
                          "font-semibold text-slate-900"
                        }`}>
                          {formatM(f[row.key] ?? 0)} M€
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="border-t border-slate-100 bg-slate-50/40">
                    <td className="px-6 py-3 text-sm font-medium text-slate-500">Taux de conversion FCF</td>
                    {financials.map(f => (
                      <td key={f.fiscal_year} className="px-4 py-3 text-sm text-right font-bold text-[#0d7a5f] tabular-nums">
                        {f.ebitda ? formatPct(f.fcf / f.ebitda) : "—"}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">FCF & Capex (M€)</h2>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={chartDataFlux} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="2 4" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />
                <Bar dataKey="FCF"   fill="#0d7a5f" radius={[5,5,0,0]} />
                <Bar dataKey="Capex" fill="#1a3a5c" radius={[5,5,0,0]} />
                <Bar dataKey="ΔBFr"  fill="#d97706" radius={[5,5,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* ── ANNEXES ── */}
      {activeTab === "annexes" && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-5">
            <span className="text-2xl">📎</span>
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Annexes aux états financiers</h2>
          <p className="text-slate-400 text-sm max-w-sm leading-relaxed">
            Notes annexes, méthodes comptables, engagements hors bilan, détail des provisions et dépréciations.
          </p>
          <span className="mt-5 text-xs font-medium text-[#1a3a5c] bg-[#1a3a5c]/8 px-4 py-1.5 rounded-full border border-[#1a3a5c]/10">
            En développement
          </span>
        </div>
      )}

    </main>
  )
}
