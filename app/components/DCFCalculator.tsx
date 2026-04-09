"use client"
import { useState } from "react"
import { calculateDCF } from "../dcf"
import type { FinancialStatement, DCFParams } from "../dcf"
import { RefreshCw, ChevronDown, ChevronUp } from "lucide-react"
import FCFChart from "./FCFChart"

interface Props {
  financials:    FinancialStatement[]
  params:        DCFParams
  initialResult: ReturnType<typeof calculateDCF>
  years:         number[]
  netDebt:       number | null
  esgGrowthAdj?: number   // ajustement CAGR issu du score ESG (ex: +0.005)
}

function fmt(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—"
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M€`
  if (abs >= 1_000)     return `${Math.round(n / 1_000)} k€`
  return `${Math.round(n)} €`
}

function pct(n: number | null | undefined): string {
  if (n == null) return "—"
  return `${(n * 100).toFixed(1)}%`
}

interface SliderProps {
  label:    string
  hint:     string
  value:    number
  min:      number
  max:      number
  step:     number
  format:   (v: number) => string
  onChange: (v: number) => void
}

function Slider({ label, hint, value, min, max, step, format, onChange }: SliderProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[12px] font-medium text-slate-700">{label}</p>
          <p className="text-[10px] text-slate-400">{hint}</p>
        </div>
        <span className="text-[13px] font-bold text-[#1a3a5c] tabular-nums w-16 text-right">
          {format(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[#0d7a5f]"
        style={{ background: `linear-gradient(to right, #0d7a5f ${((value - min) / (max - min)) * 100}%, #e2e8f0 0%)` }}
      />
      <div className="flex justify-between text-[9px] text-slate-300">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  )
}

export default function DCFCalculator({ financials, params, initialResult, years, netDebt, esgGrowthAdj = 0 }: Props) {
  const eff = initialResult.effectiveHyp

  // Le CAGR initial intègre l'ajustement ESG
  const [revenueGrowth, setRevenueGrowth] = useState(eff.revenueGrowth + esgGrowthAdj)
  const [ebitdaMargin,  setEbitdaMargin]  = useState(eff.ebitdaMargin  ?? 0.15)
  const [ebitMargin,    setEbitMargin]     = useState(eff.ebitMargin    ?? 0.10)
  const [capexRatio,    setCapexRatio]     = useState(eff.capexRatio)
  const [bfrRatio,      setBfrRatio]       = useState(eff.bfrRatio      ?? 0.10)
  const [taxRate,       setTaxRate]        = useState(eff.taxRate)
  const [open,          setOpen]           = useState(true)

  const dcf = calculateDCF(financials, params, {
    revenueGrowth,
    ebitdaMargin,
    ebitMargin,
    capexRatio,
    bfrRatio,
    taxRate,
  })

  const changed =
    Math.abs(revenueGrowth - eff.revenueGrowth)  > 0.0001 ||
    Math.abs(ebitdaMargin  - (eff.ebitdaMargin ?? 0.15)) > 0.0001 ||
    Math.abs(ebitMargin    - (eff.ebitMargin   ?? 0.10)) > 0.0001 ||
    Math.abs(capexRatio    - eff.capexRatio)     > 0.0001 ||
    Math.abs(bfrRatio      - (eff.bfrRatio     ?? 0.10)) > 0.0001 ||
    Math.abs(taxRate       - eff.taxRate)        > 0.0001

  const reset = () => {
    setRevenueGrowth(eff.revenueGrowth)
    setEbitdaMargin(eff.ebitdaMargin  ?? 0.15)
    setEbitMargin(eff.ebitMargin      ?? 0.10)
    setCapexRatio(eff.capexRatio)
    setBfrRatio(eff.bfrRatio          ?? 0.10)
    setTaxRate(eff.taxRate)
  }

  const deltaEV = dcf.enterpriseValue - initialResult.enterpriseValue
  const positiveEV = deltaEV >= 0

  return (
    <div className="space-y-6">

      {/* HYPOTHESES PANEL */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between px-6 py-4 border-b border-slate-50"
        >
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#0d7a5f]" />
            <h2 className="text-sm font-semibold text-slate-900">Hypothèses de projection</h2>
            {esgGrowthAdj !== 0 && (
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                esgGrowthAdj > 0
                  ? "text-emerald-600 bg-emerald-50 border-emerald-200"
                  : "text-red-600 bg-red-50 border-red-200"
              }`}>
                ESG {esgGrowthAdj > 0 ? "+" : ""}{(esgGrowthAdj * 100).toFixed(1)}% CAGR
              </span>
            )}
            {changed && (
              <span className="text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                Modifié
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {changed && (
              <button
                onClick={e => { e.stopPropagation(); reset() }}
                className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-700 transition-colors px-2 py-1 rounded-lg hover:bg-slate-50"
              >
                <RefreshCw size={11} />
                Réinitialiser
              </button>
            )}
            {open ? <ChevronUp size={15} className="text-slate-300" /> : <ChevronDown size={15} className="text-slate-300" />}
          </div>
        </button>

        {open && (
          <div className="px-6 py-5 grid grid-cols-2 gap-x-10 gap-y-6">
            <Slider
              label="Croissance du CA"
              hint="CAGR projeté"
              value={revenueGrowth}
              min={-0.10} max={0.30} step={0.005}
              format={v => `${(v * 100).toFixed(1)}%`}
              onChange={setRevenueGrowth}
            />
            <Slider
              label="Marge EBITDA"
              hint="EBITDA / CA cible"
              value={ebitdaMargin}
              min={0} max={0.50} step={0.005}
              format={v => `${(v * 100).toFixed(1)}%`}
              onChange={setEbitdaMargin}
            />
            <Slider
              label="Marge EBIT"
              hint="EBIT / CA cible"
              value={ebitMargin}
              min={0} max={0.40} step={0.005}
              format={v => `${(v * 100).toFixed(1)}%`}
              onChange={setEbitMargin}
            />
            <Slider
              label="Intensité Capex"
              hint="Capex / CA"
              value={capexRatio}
              min={0} max={0.20} step={0.005}
              format={v => `${(v * 100).toFixed(1)}%`}
              onChange={setCapexRatio}
            />
            <Slider
              label="BFR / CA"
              hint="Besoin en fonds de roulement"
              value={bfrRatio}
              min={0} max={0.40} step={0.005}
              format={v => `${(v * 100).toFixed(1)}%`}
              onChange={setBfrRatio}
            />
            <Slider
              label="Taux d'imposition"
              hint="IS appliqué au calcul FCF"
              value={taxRate}
              min={0.10} max={0.40} step={0.005}
              format={v => `${(v * 100).toFixed(1)}%`}
              onChange={setTaxRate}
            />
          </div>
        )}
      </div>

      {/* DELTA BADGE */}
      {changed && (
        <div className={`flex items-center justify-between px-5 py-3 rounded-xl border text-sm font-medium ${
          positiveEV
            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
            : "bg-red-50 border-red-200 text-red-600"
        }`}>
          <span>Impact sur l'Enterprise Value</span>
          <span className="font-bold tabular-nums">
            {positiveEV ? "+" : ""}{fmt(deltaEV)}
          </span>
        </div>
      )}

      {/* GRAPHIQUE */}
      <FCFChart projectedFCFs={dcf.projectedFCFs} pvFCFs={dcf.pvFCFs} years={years} />

      {/* TABLEAU FCF */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Projection des FCF</h2>
            <p className="text-xs text-slate-400 mt-0.5">N+1 à N+{years.length} · WACC {pct(params.wacc)}</p>
          </div>
          <span className="text-xs text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
            {years.length} années
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/70">
                <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-6 py-3">Ligne</th>
                {years.map(y => (
                  <th key={y} className="text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-4 py-3">{y}</th>
                ))}
                <th className="text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-6 py-3">Cumul</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-50 hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 text-sm text-slate-600">FCF projeté</td>
                {dcf.projectedFCFs.map((f, i) => (
                  <td key={i} className="px-4 py-4 text-sm text-right font-semibold text-slate-900 tabular-nums">{fmt(f)}</td>
                ))}
                <td className="px-6 py-4 text-sm text-right text-slate-400">—</td>
              </tr>
              <tr className="border-t border-slate-50 hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 text-sm text-slate-600">Facteur d'actualisation</td>
                {dcf.projectedFCFs.map((_, i) => (
                  <td key={i} className="px-4 py-4 text-sm text-right text-slate-400 tabular-nums font-mono">
                    {(1 / Math.pow(1 + params.wacc, i + 1)).toFixed(3)}
                  </td>
                ))}
                <td className="px-6 py-4 text-sm text-right text-slate-400">—</td>
              </tr>
              <tr className="border-t border-slate-100 bg-emerald-50/40">
                <td className="px-6 py-4 text-sm font-semibold text-slate-900">FCF actualisé</td>
                {dcf.pvFCFs.map((f, i) => (
                  <td key={i} className="px-4 py-4 text-sm text-right font-bold text-[#0d7a5f] tabular-nums">{fmt(f)}</td>
                ))}
                <td className="px-6 py-4 text-sm text-right font-bold text-[#0d7a5f] tabular-nums">{fmt(dcf.sumPVFCF)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* BRIDGE EV → EQUITY */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Réconciliation EV → Equity Value</h2>
            <p className="text-xs text-slate-400 mt-0.5">Passage de la valeur d'entreprise aux fonds propres</p>
          </div>
        </div>
        <div className="space-y-1">
          {[
            { label: `PV des FCF projetés (${years[0]}–${years[years.length - 1]})`, value: fmt(dcf.sumPVFCF) },
            { label: "PV de la valeur terminale",                                     value: fmt(dcf.pvTerminalValue) },
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-emerald-500 w-4">+</span>
                <p className="text-sm text-slate-600">{row.label}</p>
              </div>
              <p className="text-sm font-semibold text-slate-900 tabular-nums">{row.value}</p>
            </div>
          ))}

          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#1a3a5c]/5 border border-[#1a3a5c]/8 my-2">
            <div className="flex items-center gap-3">
              <div className="w-4 h-px bg-[#1a3a5c]/30" />
              <p className="text-sm font-semibold text-slate-900">Enterprise Value</p>
            </div>
            <p className="text-base font-bold text-[#1a3a5c] tabular-nums">{fmt(dcf.enterpriseValue)}</p>
          </div>

          <div className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-red-400 w-4">−</span>
              <p className="text-sm text-slate-600">Dette nette</p>
            </div>
            <p className="text-sm font-semibold text-red-500 tabular-nums">−{fmt(netDebt)}</p>
          </div>

          <div className="flex items-center justify-between px-4 py-4 rounded-xl bg-gradient-to-br from-[#0a5040] to-[#0d7a5f] mt-2">
            <p className="text-sm font-semibold text-white">Equity Value</p>
            <p className={`text-xl font-bold tabular-nums ${dcf.equityValue >= 0 ? "text-white" : "text-red-300"}`}>
              {fmt(dcf.equityValue)}
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}
