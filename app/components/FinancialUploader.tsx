"use client"
import { useState, useRef, DragEvent, ChangeEvent } from "react"
import { Upload, RotateCcw, CheckCircle, AlertCircle, Loader2, FileText } from "lucide-react"

type Status = "idle" | "uploading" | "extracting" | "preview" | "saving" | "success" | "error"

type YearData = {
  fiscal_year: number
  revenue: number | null
  gross_margin: number | null
  sga: number | null
  ebitda: number | null
  ebit: number | null
  net_income: number | null
  tax_rate: number | null
  total_assets: number | null
  fixed_assets: number | null
  current_assets: number | null
  equity: number | null
  net_debt: number | null
  stocks: number | null
  accounts_receivable: number | null
  accounts_payable: number | null
  working_capital: number | null
  fr: number | null
  capex: number | null
  delta_wc: number | null
  fcf: number | null
  dso: number | null
  dpo: number | null
  dio: number | null
  roic: number | null
  roe: number | null
  roa: number | null
  interest_coverage: number | null
  cash_conversion: number | null
  capex_intensity: number | null
}

const FIELDS: { key: keyof Omit<YearData, "fiscal_year">; label: string; unit: string }[] = [
  { key: "revenue",           label: "Chiffre d'affaires",     unit: "k€" },
  { key: "gross_margin",      label: "Marge brute",            unit: "k€" },
  { key: "sga",               label: "Frais généraux (SGA)",   unit: "k€" },
  { key: "ebitda",            label: "EBITDA",                 unit: "k€" },
  { key: "ebit",              label: "EBIT",                   unit: "k€" },
  { key: "net_income",        label: "Résultat net",           unit: "k€" },
  { key: "tax_rate",          label: "Taux IS",                unit: "%" },
  { key: "total_assets",      label: "Total actif",            unit: "k€" },
  { key: "fixed_assets",      label: "Immobilisations nettes", unit: "k€" },
  { key: "current_assets",    label: "Actif circulant",        unit: "k€" },
  { key: "equity",            label: "Capitaux propres",       unit: "k€" },
  { key: "net_debt",          label: "Dette nette",            unit: "k€" },
  { key: "stocks",            label: "Stocks",                 unit: "k€" },
  { key: "accounts_receivable",label: "Créances clients",      unit: "k€" },
  { key: "accounts_payable",  label: "Dettes fournisseurs",    unit: "k€" },
  { key: "working_capital",   label: "BFR",                    unit: "k€" },
  { key: "fr",                label: "Fonds de roulement",     unit: "k€" },
  { key: "capex",             label: "Capex",                  unit: "k€" },
  { key: "delta_wc",          label: "Variation BFR",          unit: "k€" },
  { key: "fcf",               label: "Free Cash Flow",         unit: "k€" },
  { key: "dso",               label: "DSO (délai client)",     unit: "j" },
  { key: "dpo",               label: "DPO (délai fourn.)",     unit: "j" },
  { key: "dio",               label: "DIO (délai stock)",      unit: "j" },
  { key: "roic",              label: "ROIC",                   unit: "%" },
  { key: "roe",               label: "ROE",                    unit: "%" },
  { key: "roa",               label: "ROA",                    unit: "%" },
  { key: "interest_coverage", label: "Couverture intérêts",    unit: "x" },
  { key: "cash_conversion",   label: "Cash conversion",        unit: "%" },
  { key: "capex_intensity",   label: "Intensité Capex",        unit: "%" },
]

function fmt(value: number | null, unit: string): string {
  if (value === null || value === undefined) return "—"
  if (unit === "%") return `${(value * 100).toFixed(1)}%`
  if (unit === "x") return `${value.toFixed(1)}x`
  if (unit === "j") return `${Math.round(value)}j`
  return value.toLocaleString("fr-FR")
}

interface Props {
  companyId: number
  onComplete?: () => void
}

export default function FinancialUploader({ companyId, onComplete }: Props) {
  const [status, setStatus] = useState<Status>("idle")
  const [years, setYears] = useState<YearData[]>([])
  const [errorMsg, setErrorMsg] = useState("")
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    const allowed = ["application/pdf", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel"]
    const ext = file.name.toLowerCase()
    if (!allowed.includes(file.type) && !ext.endsWith(".xlsx") && !ext.endsWith(".xls") && !ext.endsWith(".pdf")) {
      setErrorMsg("Format non supporté. Utilisez PDF ou Excel (.xlsx/.xls)")
      setStatus("error")
      return
    }

    setFileName(file.name)
    setStatus("uploading")

    const form = new FormData()
    form.append("file", file)
    form.append("company_id", String(companyId))

    setStatus("extracting")

    try {
      const res = await fetch("/api/extract", { method: "POST", body: form })
      const data = await res.json()

      if (!res.ok || data.error) {
        setErrorMsg(data.error ?? "Erreur d'extraction")
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

  const updateCell = (yearIdx: number, key: keyof YearData, raw: string) => {
    const val = raw === "" ? null : parseFloat(raw.replace(",", "."))
    setYears(prev => {
      const next = [...prev]
      next[yearIdx] = { ...next[yearIdx], [key]: isNaN(val as number) ? null : val }
      return next
    })
  }

  const validate = async () => {
    setStatus("saving")
    try {
      for (const year of years) {
        const res = await fetch("/api/financials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...year, company_id: companyId }),
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
          dragOver
            ? "border-[#0d7a5f] bg-[#0d7a5f]/5"
            : "border-slate-200 hover:border-[#1a3a5c]/40 hover:bg-slate-50/50"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.xlsx,.xls"
          className="hidden"
          onChange={onInputChange}
        />
        <Upload size={28} className="mx-auto mb-3 text-slate-400" />
        <p className="text-sm font-medium text-slate-700 mb-1">
          Glissez votre fichier ici ou cliquez pour sélectionner
        </p>
        <p className="text-xs text-slate-400">PDF liasse fiscale · Excel bilan — jusqu'à 10 Mo</p>
      </div>
    )
  }

  /* ─── UPLOADING / EXTRACTING ─── */
  if (status === "uploading" || status === "extracting") {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-4">
        <Loader2 size={32} className="animate-spin text-[#0d7a5f]" />
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-800">
            {status === "uploading" ? "Envoi du fichier…" : "Extraction par Claude en cours…"}
          </p>
          {fileName && (
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1 justify-center">
              <FileText size={12} /> {fileName}
            </p>
          )}
          {status === "extracting" && (
            <p className="text-xs text-slate-400 mt-2">
              L'analyse peut prendre 15 à 30 secondes
            </p>
          )}
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
        <button
          onClick={reset}
          className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-all"
        >
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
          <p className="text-xs text-slate-400">Les données sont enregistrées et utilisables dans l'analyse</p>
        </div>
        {onComplete && (
          <button
            onClick={onComplete}
            className="px-5 py-2.5 bg-[#1a3a5c] text-white rounded-xl text-sm font-medium hover:bg-[#0f2a45] transition-all"
          >
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
        <p className="text-sm font-semibold text-slate-800">Enregistrement en base…</p>
      </div>
    )
  }

  /* ─── PREVIEW ─── */
  const sortedYears = [...years].sort((a, b) => b.fiscal_year - a.fiscal_year)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-800">
            {sortedYears.length} année{sortedYears.length > 1 ? "s" : ""} extraite{sortedYears.length > 1 ? "s" : ""}
          </p>
          <p className="text-xs text-slate-400">Vérifiez et corrigez si nécessaire avant d'importer</p>
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
        >
          <RotateCcw size={12} /> Recommencer
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-[#1a3a5c]">
              <th className="text-left px-3 py-2.5 text-white/70 font-medium w-40">Indicateur</th>
              {sortedYears.map(y => (
                <th key={y.fiscal_year} className="text-right px-3 py-2.5 text-white font-semibold min-w-[90px]">
                  {y.fiscal_year}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FIELDS.map((field, fi) => (
              <tr
                key={field.key}
                className={fi % 2 === 0 ? "bg-white" : "bg-slate-50/50"}
              >
                <td className="px-3 py-1.5 text-slate-500 font-medium whitespace-nowrap">
                  {field.label}
                  <span className="ml-1 text-slate-300">({field.unit})</span>
                </td>
                {sortedYears.map((y, yi) => {
                  const raw = y[field.key as keyof YearData]
                  let displayVal = ""
                  if (raw !== null && raw !== undefined) {
                    displayVal = field.unit === "%" ? String((raw as number) * 100) : String(raw)
                  }
                  return (
                    <td key={y.fiscal_year} className="px-2 py-1">
                      <input
                        type="text"
                        defaultValue={displayVal}
                        placeholder="—"
                        onBlur={e => {
                          let val = e.target.value
                          if (field.unit === "%" && val !== "") {
                            const n = parseFloat(val.replace(",", "."))
                            val = isNaN(n) ? "" : String(n / 100)
                          }
                          updateCell(yi, field.key as keyof YearData, val)
                        }}
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

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          onClick={validate}
          className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#0a5040] to-[#0d7a5f] text-white py-3 rounded-xl text-sm font-medium hover:from-[#095040] hover:to-[#0a6a52] transition-all shadow-sm"
        >
          <CheckCircle size={15} /> Valider et importer
        </button>
        <button
          onClick={reset}
          className="flex items-center gap-1.5 px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-500 hover:border-slate-300 hover:bg-slate-50 transition-all"
        >
          <RotateCcw size={14} /> Recommencer
        </button>
      </div>
    </div>
  )
}
