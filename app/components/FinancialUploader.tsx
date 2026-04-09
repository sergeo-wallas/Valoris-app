"use client"
import { useState, useRef, DragEvent, ChangeEvent } from "react"
import { Upload, RotateCcw, CheckCircle, AlertCircle, Loader2, FileText } from "lucide-react"
import { CORE_FIELDS, buildFullRecord, type CoreYear } from "../lib/financials"

type Status = "idle" | "uploading" | "extracting" | "preview" | "saving" | "success" | "error"

function fmt(value: number | null, unit: string): string {
  if (value === null || value === undefined) return ""
  if (unit === "%") return String(Math.round(value * 100 * 10) / 10)
  return String(value)
}

interface Props {
  companyId: number
  onComplete?: () => void
}

export default function FinancialUploader({ companyId, onComplete }: Props) {
  const [status, setStatus] = useState<Status>("idle")
  const [years, setYears] = useState<CoreYear[]>([])
  const [errorMsg, setErrorMsg] = useState("")
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    const ext = file.name.toLowerCase()
    const allowed = ext.endsWith(".pdf") || ext.endsWith(".xlsx") || ext.endsWith(".xls")
    if (!allowed) {
      setErrorMsg("Format non supporté. Utilisez PDF ou Excel (.xlsx/.xls)")
      setStatus("error")
      return
    }

    setFileName(file.name)
    setStatus("extracting")

    const form = new FormData()
    form.append("file", file)
    form.append("company_id", String(companyId))

    try {
      const res = await fetch("/api/extract", { method: "POST", body: form })
      const data = await res.json()

      if (!res.ok || data.error) {
        setErrorMsg(data.detail ?? data.error ?? "Erreur d'extraction")
        setStatus("error")
        return
      }

      if (!data.years || data.years.length === 0) {
        setErrorMsg("Aucune donnée financière trouvée dans le document")
        setStatus("error")
        return
      }

      setYears(data.years)
      setStatus("preview")
    } catch {
      setErrorMsg("Erreur réseau lors de l'extraction")
      setStatus("error")
    }
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const updateCell = (yearIdx: number, key: keyof CoreYear, raw: string) => {
    setYears(prev => {
      const next = [...prev]
      let val: number | null = raw === "" ? null : parseFloat(raw.replace(",", "."))
      if (val !== null && isNaN(val)) val = null
      // Les % sont saisis en % mais stockés en décimal
      const field = CORE_FIELDS.find(f => f.key === key)
      if (field?.unit === "%" && val !== null) val = val / 100
      next[yearIdx] = { ...next[yearIdx], [key]: val }
      return next
    })
  }

  const validate = async () => {
    setStatus("saving")
    try {
      for (const year of years) {
        const full = buildFullRecord(year)
        const res = await fetch("/api/financials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...full, company_id: companyId }),
        })
        if (!res.ok) throw new Error("Erreur lors de l'import")
      }
      setStatus("success")
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "Erreur inconnue")
      setStatus("error")
    }
  }

  const reset = () => {
    setStatus("idle")
    setYears([])
    setErrorMsg("")
    setFileName("")
    if (inputRef.current) inputRef.current.value = ""
  }

  /* ─── IDLE ─── */
  if (status === "idle") {
    return (
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          dragOver ? "border-[#0d7a5f] bg-[#0d7a5f]/5" : "border-slate-200 hover:border-[#1a3a5c]/40 hover:bg-slate-50/50"
        }`}
      >
        <input ref={inputRef} type="file" accept=".pdf,.xlsx,.xls" className="hidden" onChange={onInputChange} />
        <Upload size={28} className="mx-auto mb-3 text-slate-400" />
        <p className="text-sm font-medium text-slate-700 mb-1">Glissez votre fichier ici ou cliquez pour sélectionner</p>
        <p className="text-xs text-slate-400">PDF liasse fiscale · Excel bilan — jusqu'à 10 Mo</p>
      </div>
    )
  }

  /* ─── EXTRACTING ─── */
  if (status === "uploading" || status === "extracting") {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-4">
        <Loader2 size={32} className="animate-spin text-[#0d7a5f]" />
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-800">Extraction par Claude en cours…</p>
          {fileName && (
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1 justify-center">
              <FileText size={12} /> {fileName}
            </p>
          )}
          <p className="text-xs text-slate-400 mt-2">L'analyse peut prendre 15 à 30 secondes</p>
        </div>
      </div>
    )
  }

  /* ─── ERROR ─── */
  if (status === "error") {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <AlertCircle size={32} className="text-red-500" />
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-800 mb-1">Extraction échouée</p>
          <p className="text-xs text-red-500">{errorMsg}</p>
        </div>
        <button onClick={reset} className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-all">
          <RotateCcw size={14} /> Recommencer
        </button>
      </div>
    )
  }

  /* ─── SUCCESS ─── */
  if (status === "success") {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <CheckCircle size={32} className="text-[#0d7a5f]" />
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-800 mb-1">
            {years.length} année{years.length > 1 ? "s" : ""} importée{years.length > 1 ? "s" : ""} avec succès
          </p>
          <p className="text-xs text-slate-400">Les ratios dérivés (FCF, ROIC, ROE…) ont été calculés automatiquement</p>
        </div>
        {onComplete && (
          <button onClick={onComplete} className="px-5 py-2.5 bg-[#1a3a5c] text-white rounded-xl text-sm font-medium hover:bg-[#0f2a45] transition-all">
            Continuer vers les paramètres
          </button>
        )}
      </div>
    )
  }

  /* ─── SAVING ─── */
  if (status === "saving") {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-4">
        <Loader2 size={32} className="animate-spin text-[#1a3a5c]" />
        <p className="text-sm font-semibold text-slate-800">Calcul des ratios et enregistrement…</p>
      </div>
    )
  }

  /* ─── PREVIEW — seulement les 10 champs clés ─── */
  const sortedYears = [...years].sort((a, b) => b.fiscal_year - a.fiscal_year)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-800">
            {sortedYears.length} année{sortedYears.length > 1 ? "s" : ""} extraite{sortedYears.length > 1 ? "s" : ""}
          </p>
          <p className="text-xs text-slate-400">Vérifiez les 10 champs clés — les ratios se calculent automatiquement</p>
        </div>
        <button onClick={reset} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors">
          <RotateCcw size={12} /> Recommencer
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-[#1a3a5c]">
              <th className="text-left px-3 py-2.5 text-white/70 font-medium w-44">Indicateur</th>
              {sortedYears.map(y => (
                <th key={y.fiscal_year} className="text-right px-3 py-2.5 text-white font-semibold min-w-[100px]">
                  {y.fiscal_year}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CORE_FIELDS.map((field, fi) => (
              <tr key={field.key} className={fi % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                <td className="px-3 py-1.5 text-slate-500 font-medium whitespace-nowrap">
                  {field.label}
                  <span className="ml-1 text-slate-300">({field.unit})</span>
                </td>
                {sortedYears.map((y, yi) => {
                  const raw = y[field.key as keyof CoreYear] as number | null
                  const displayVal = raw != null
                    ? field.unit === "%" ? String(Math.round(raw * 100 * 10) / 10) : String(raw)
                    : ""
                  return (
                    <td key={y.fiscal_year} className="px-2 py-1">
                      <input
                        type="text"
                        defaultValue={displayVal}
                        placeholder="—"
                        onBlur={e => updateCell(yi, field.key as keyof CoreYear, e.target.value)}
                        className="w-full text-right bg-transparent border border-transparent hover:border-slate-200 focus:border-[#1a3a5c] focus:bg-white rounded-lg px-2 py-1 outline-none text-slate-800 font-mono tabular-nums transition-all"
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Aperçu des ratios calculés */}
      {sortedYears.length > 0 && (() => {
        const derived = buildFullRecord(sortedYears[0])
        const items = [
          { label: "FCF estimé",       val: derived.fcf != null ? `${Math.round(derived.fcf as number).toLocaleString("fr-FR")} €` : "—" },
          { label: "ROIC",             val: derived.roic != null ? `${((derived.roic as number) * 100).toFixed(1)}%` : "—" },
          { label: "ROE",              val: derived.roe  != null ? `${((derived.roe  as number) * 100).toFixed(1)}%` : "—" },
          { label: "Marge EBITDA",     val: derived.ebitda_margin != null ? `${((derived.ebitda_margin as number) * 100).toFixed(1)}%` : "—" },
          { label: "Cash conversion",  val: derived.cash_conversion != null ? `${((derived.cash_conversion as number) * 100).toFixed(1)}%` : "—" },
          { label: "Intensité Capex",  val: derived.capex_intensity != null ? `${((derived.capex_intensity as number) * 100).toFixed(1)}%` : "—" },
        ]
        return (
          <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">
              Ratios calculés automatiquement ({sortedYears[0].fiscal_year})
            </p>
            <div className="grid grid-cols-3 gap-3">
              {items.map(item => (
                <div key={item.label}>
                  <p className="text-[10px] text-slate-400 mb-0.5">{item.label}</p>
                  <p className="text-sm font-bold text-slate-800 tabular-nums">{item.val}</p>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      <div className="flex gap-3 pt-1">
        <button
          onClick={validate}
          className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#0a5040] to-[#0d7a5f] text-white py-3 rounded-xl text-sm font-medium hover:from-[#095040] hover:to-[#0a6a52] transition-all shadow-sm"
        >
          <CheckCircle size={15} /> Valider et importer
        </button>
        <button onClick={reset} className="flex items-center gap-1.5 px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-500 hover:border-slate-300 hover:bg-slate-50 transition-all">
          <RotateCcw size={14} /> Recommencer
        </button>
      </div>
    </div>
  )
}
