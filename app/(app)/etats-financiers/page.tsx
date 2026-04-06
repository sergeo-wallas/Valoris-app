"use client"
import { useEffect, useState } from "react"
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from "recharts"

export default function EtatsFinanciers() {
  const [financials, setFinancials] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/financials?company_id=1")
      .then(r => r.json())
      .then(data => {
        const sorted = [...data].sort((a, b) => a.fiscal_year - b.fiscal_year)
        setFinancials(sorted)
        setLoading(false)
      })
  }, [])

  if (loading) return (
    <main className="flex-1 bg-gray-50 p-8">
      <p className="text-gray-400">Chargement...</p>
    </main>
  )

  const formatM = (v: number) => v ? `${(v / 1_000_000).toFixed(1)}M` : "0"
  const formatPct = (v: number) => v ? `${(v * 100).toFixed(1)}%` : "-"

  // Données pour les graphiques
  const chartData = financials.map(f => ({
    year: f.fiscal_year.toString(),
    CA: Math.round(f.revenue / 1_000_000),
    EBITDA: Math.round(f.ebitda / 1_000_000),
    EBIT: Math.round(f.ebit / 1_000_000),
    "Résultat net": Math.round(f.net_income / 1_000_000),
    "Marge EBITDA": f.ebitda && f.revenue ? parseFloat((f.ebitda / f.revenue * 100).toFixed(1)) : 0,
    "Marge nette": f.net_income && f.revenue ? parseFloat((f.net_income / f.revenue * 100).toFixed(1)) : 0,
    "Marge brute": f.gross_margin && f.revenue ? parseFloat((f.gross_margin / f.revenue * 100).toFixed(1)) : 0,
  }))

  const latest = financials[financials.length - 1]
  const prev = financials[financials.length - 2]

  return (
    <main className="flex-1 bg-gray-50 p-8">

      <h1 className="text-2xl font-semibold text-[#1a3a5c]">États financiers</h1>
      <p className="text-gray-400 mt-1 mb-8">CAP Cosmetiques · Historique N à N-3</p>

      {/* Tableau historique */}
      <div className="bg-white rounded-xl border border-gray-100 mb-6">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-[#1a3a5c]">Compte de résultat</h2>
          <p className="text-sm text-gray-400 mt-1">En millions d'euros</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs text-gray-400 font-medium p-4">Indicateur</th>
                {financials.map(f => (
                  <th key={f.fiscal_year} className="text-right text-xs text-gray-400 font-medium p-4">
                    {f.fiscal_year}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[
                { label: "Chiffre d'affaires", key: "revenue" },
                { label: "Marge brute", key: "gross_margin" },
                { label: "EBITDA", key: "ebitda" },
                { label: "EBIT", key: "ebit" },
                { label: "Résultat net", key: "net_income" },
              ].map(row => (
                <tr key={row.key}>
                  <td className="p-4 text-sm text-gray-600">{row.label}</td>
                  {financials.map(f => (
                    <td key={f.fiscal_year} className={`p-4 text-sm text-right font-medium ${
                      f[row.key] < 0 ? "text-red-500" : "text-[#1a3a5c]"
                    }`}>
                      {formatM(f[row.key])} M€
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="bg-gray-50">
                <td className="p-4 text-sm font-medium text-gray-600">Marge EBITDA</td>
                {financials.map(f => (
                  <td key={f.fiscal_year} className={`p-4 text-sm text-right font-medium ${
                    f.ebitda < 0 ? "text-red-500" : "text-[#0d7a5f]"
                  }`}>
                    {formatPct(f.ebitda / f.revenue)}
                  </td>
                ))}
              </tr>
              <tr className="bg-gray-50">
                <td className="p-4 text-sm font-medium text-gray-600">Marge nette</td>
                {financials.map(f => (
                  <td key={f.fiscal_year} className={`p-4 text-sm text-right font-medium text-[#0d7a5f]`}>
                    {formatPct(f.net_income / f.revenue)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-2 gap-6 mb-6">

        {/* Graphique CA + EBITDA */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="text-sm font-semibold text-[#1a3a5c] mb-4">CA & EBITDA (M€)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="CA" fill="#1a3a5c" radius={[4,4,0,0]} />
              <Bar dataKey="EBITDA" fill="#0d7a5f" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Graphique marges */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="text-sm font-semibold text-[#1a3a5c] mb-4">Évolution des marges (%)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="Marge brute" stroke="#1a3a5c" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="Marge EBITDA" stroke="#0d7a5f" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="Marge nette" stroke="#b45309" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* Ratios clés */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-[#1a3a5c] mb-4">Ratios clés · Exercice {latest?.fiscal_year}</h2>
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-1">Croissance CA</p>
            <p className={`text-xl font-semibold ${
              prev && latest.revenue > prev.revenue ? "text-[#0d7a5f]" : "text-red-500"
            }`}>
              {prev ? `${((latest.revenue - prev.revenue) / prev.revenue * 100).toFixed(1)}%` : "-"}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-1">Marge brute</p>
            <p className="text-xl font-semibold text-[#1a3a5c]">
              {formatPct(latest.gross_margin / latest.revenue)}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-1">Marge EBITDA</p>
            <p className="text-xl font-semibold text-[#1a3a5c]">
              {formatPct(latest.ebitda / latest.revenue)}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-1">Marge nette</p>
            <p className="text-xl font-semibold text-[#1a3a5c]">
              {formatPct(latest.net_income / latest.revenue)}
            </p>
          </div>
        </div>
      </div>

    </main>
  )
}