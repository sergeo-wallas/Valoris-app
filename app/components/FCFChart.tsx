"use client"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from "recharts"

interface FCFChartProps {
  projectedFCFs: number[]
  pvFCFs: number[]
  years: number[]
}

export default function FCFChart({ projectedFCFs, pvFCFs, years }: FCFChartProps) {
  // Choisir l'unité selon la magnitude des valeurs
  const maxVal = Math.max(...projectedFCFs.map(Math.abs), ...pvFCFs.map(Math.abs), 1)
  const useMillions = maxVal >= 500_000
  const divisor = useMillions ? 1_000_000 : 1_000
  const unit    = useMillions ? "M€" : "k€"

  const toUnit = (n: number) => Math.round(n / divisor * 10) / 10

  const data = years.map((year, i) => ({
    year: year.toString(),
    "FCF projeté":   toUnit(projectedFCFs[i]),
    "FCF actualisé": toUnit(pvFCFs[i]),
  }))

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-white border border-slate-100 shadow-lg rounded-xl p-3 text-xs">
        <p className="font-semibold text-slate-700 mb-2">{label}</p>
        {payload.map((p: any) => (
          <div key={p.name} className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ background: p.fill }} />
            <span className="text-slate-500">{p.name}</span>
            <span className="font-bold text-slate-800 ml-auto pl-4">{p.value} {unit}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mb-6 p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">FCF projetés vs actualisés</h2>
          <p className="text-xs text-slate-400 mt-0.5">En {unit} · N+1 à N+{years.length}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-[#1a3a5c]" />
            <span className="text-xs text-slate-400">FCF projeté</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-[#0d7a5f]" />
            <span className="text-xs text-slate-400">FCF actualisé</span>
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} barGap={4} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="2 4" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            unit={` ${unit}`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />
          <ReferenceLine y={0} stroke="#e2e8f0" />
          <Bar dataKey="FCF projeté"   fill="#1a3a5c" radius={[5,5,0,0]} />
          <Bar dataKey="FCF actualisé" fill="#0d7a5f" radius={[5,5,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
