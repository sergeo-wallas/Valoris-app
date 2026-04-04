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
  const data = years.map((year, i) => ({
    year: year.toString(),
    "FCF projeté": Math.round(projectedFCFs[i] / 1_000_000 * 10) / 10,
    "FCF actualisé": Math.round(pvFCFs[i] / 1_000_000 * 10) / 10,
  }))

  return (
    <div className="bg-white rounded-xl border border-gray-100 mb-6 p-6">
      <h2 className="text-lg font-semibold text-[#1a3a5c] mb-1">FCF projetés vs actualisés</h2>
      <p className="text-sm text-gray-400 mb-4">En millions d'euros · N+1 à N+5</p>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="year" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} unit=" M€" />
          <Tooltip formatter={(value) => `${value} M€`} />
          <Legend />
          <ReferenceLine y={0} stroke="#e5e7eb" />
          <Bar dataKey="FCF projeté" fill="#1a3a5c" radius={[4,4,0,0]} />
          <Bar dataKey="FCF actualisé" fill="#0d7a5f" radius={[4,4,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}