"use client"
import { useState, useRef, DragEvent, ChangeEvent } from "react"
import { Upload, RotateCcw, CheckCircle, AlertCircle, Loader2, FileText, ChevronRight, Info, AlertTriangle } from "lucide-react"
import { CORE_FIELDS, buildFullRecord, type CoreYear } from "../lib/financials"

type Status = "idle" | "qualifying" | "extracting" | "preview" | "saving" | "success" | "error"
type Divergence = { field: string; claude: number; regex: number }
type DivergenceMap = Record<number, Divergence[]>

const DOC_TYPES = [
  { value: "liasse",   label: "Liasse fiscale",       pages: "1-30", hint: "États financiers généralement pages 5–20" },
  { value: "cr",       label: "Compte de résultat",   pages: "1-5",  hint: "Document généralement court (1–5 pages)" },
  { value: "bilan",    label: "Bilan",                pages: "1-5",  hint: "Document généralement court (1–5 pages)" },
  { value: "flux",     label: "Tableau des flux",     pages: "1-5",  hint: "Document généralement court (1–5 pages)" },
  { value: "rapport",  label: "Rapport annuel",       pages: "1-30", hint: "Les états financiers sont souvent en fin de document" },
  { value: "autre",    label: "Autre",                pages: "1-30", hint: "" },
]

interface Props {
  companyId: number
  onComplete?: () => void
}

export default function FinancialUploader({ companyId, onComplete }: Props) {
  const [status, setStatus]     = useState<Status>("idle")
  const [years, setYears]       = useState<CoreYear[]>([])
  const [errorMsg, setErrorMsg] = useState("")
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState("")
  const [isPdf, setIsPdf]       = useState(false)
  const [docType, setDocType]   = useState("liasse")
  const [docName, setDocName]   = useState("")
  const [pageRange, setPageRange]     = useState("1-30")
  const [divergences, setDivergences] = useState<DivergenceMap>({})
  const inputRef    = useRef<HTMLInputElement>(null)
  const pendingFile = useRef<File | null>(null)

  const handleFile = (file: File) => {
    const ext = file.name.toLowerCase()
    const allowed = ext.endsWith(".pdf") || ext.endsWith(".xlsx") || ext.endsWith(".xls")
    if (!allowed) {
      setErrorMsg("Format non supporté. Utilisez PDF ou Excel (.xlsx/.xls)")
      setStatus("error")
      return
    }
    const pdf = ext.endsWith(".pdf")
    setIsPdf(pdf)
    setFileName(file.name)
    setDocName(file.name.replace(/\.[^.]+$/, ""))
    pendingFile.current = file
    setStatus("qualifying")
  }

  const handleDocTypeChange = (val: string) => {
    setDocType(val)
    const found = DOC_TYPES.find(d => d.value === val)
    if (found) setPageRange(found.pages)
  }

  const startExtraction = async () => {
    const file = pendingFile.current
    if (!file) return
    setStatus("extracting")

    const form = new FormData()
    form.append("file", file)
    form.append("company_id", String(companyId))
    form.append("doc_type", docType)
    form.append("doc_name", docName || fileName)
    if (isPdf) form.append("page_range", pageRange)

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
      setDivergences(data.divergences ?? {})
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

  const reset = () => {
    setStatus("idle")
    setYears([])
    setErrorMsg("")
    setFileName("")
    setDocType("liasse")
    setDocName("")
    setPageRange("1-30")
    setDivergences({})
    pendingFile.current = null
    if (inputRef.current) inputRef.current.value = ""
  }

  const resolveDivergence = (fy: number, field: string, value: number) => {
    setYears(prev => prev.map(y => y.fiscal_year === fy ? { ...y, [field]: value } : y))
    setDivergences(prev => {
      const remaining = (prev[fy] ?? []).filter(d => d.field !== field)
      if (remaining.length === 0) {
        const next = { ...prev }
        delete next[fy]
        return next
      }
      return { ...prev, [fy]: remaining }
    })
  }

  const fmtDivVal = (field: string, val: number): string => {
    const f = CORE_FIELDS.find(f => f.key === field)
    if (f?.unit === "%") return `${(val * 100).toFixed(1)} %`
    return val.toLocaleString("fr-FR") + " €"
  }

  const totalDivergences = Object.values(divergences).reduce((sum, arr) => sum + arr.length, 0)

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

  /* ─── QUALIFYING ─── */
  if (status === "qualifying") {
    const currentType = DOC_TYPES.find(d => d.value === docType)!
    return (
      <div className="space-y-5">

        {/* Fichier sélectionné */}
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
          <FileText size={16} className="text-[#1a3a5c] flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">{fileName}</p>
            <p className="text-xs text-slate-400">{isPdf ? "PDF" : "Excel"} · sélectionné</p>
          </div>
          <button onClick={reset} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
            Changer
          </button>
        </div>

        {/* Type de document */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2">
            Type de document
          </label>
          <div className="grid grid-cols-3 gap-2">
            {DOC_TYPES.map(d => (
              <button
                key={d.value}
                onClick={() => handleDocTypeChange(d.value)}
                className={`text-[12px] font-medium px-3 py-2 rounded-xl border transition-all text-left ${
                  docType === d.value
                    ? "bg-[#1a3a5c] text-white border-[#1a3a5c]"
                    : "bg-white text-slate-600 border-slate-200 hover:border-[#1a3a5c]/40"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
          {currentType.hint && (
            <p className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-2">
              <Info size={11} /> {currentType.hint}
            </p>
          )}
        </div>

        {/* Nom du document */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2">
            Nom du document
          </label>
          <input
            type="text"
            value={docName}
            onChange={e => setDocName(e.target.value)}
            placeholder="ex : Bilan 2023, Liasse fiscale N-1…"
            className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-[#1a3a5c] bg-white text-slate-800 placeholder:text-slate-300 transition-colors"
          />
        </div>

        {/* Plage de pages — PDF uniquement */}
        {isPdf && (
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2">
              Pages à analyser
            </label>
            <input
              type="text"
              value={pageRange}
              onChange={e => setPageRange(e.target.value)}
              placeholder="ex : 5-15"
              className="w-40 text-sm border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-[#1a3a5c] bg-white text-slate-800 placeholder:text-slate-300 transition-colors font-mono"
            />
            <p className="text-[11px] text-slate-400 mt-1.5">Format : "5-15" ou "1-30". Max 30 pages envoyées à Claude.</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={startExtraction}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#0a5040] to-[#0d7a5f] text-white py-3 rounded-xl text-sm font-medium hover:from-[#095040] hover:to-[#0a6a52] transition-all shadow-sm"
          >
            Extraire les données <ChevronRight size={15} />
          </button>
          <button onClick={reset} className="flex items-center gap-1.5 px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-500 hover:border-slate-300 hover:bg-slate-50 transition-all">
            <RotateCcw size={14} />
          </button>
        </div>
      </div>
    )
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
  if (status === "extracting") {
    const label = docName || fileName
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-4">
        <Loader2 size={32} className="animate-spin text-[#0d7a5f]" />
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-800">Extraction par Claude en cours…</p>
          {label && (
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1 justify-center">
              <FileText size={12} /> {label}
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
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-slate-800">
              {sortedYears.length} année{sortedYears.length > 1 ? "s" : ""} extraite{sortedYears.length > 1 ? "s" : ""}
            </p>
            {totalDivergences > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                <AlertTriangle size={10} /> {totalDivergences} divergence{totalDivergences > 1 ? "s" : ""}
              </span>
            )}
          </div>
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
                  const isDivergent = (divergences[y.fiscal_year] ?? []).some(d => d.field === field.key)
                  return (
                    <td key={y.fiscal_year} className="px-2 py-1">
                      <input
                        type="text"
                        defaultValue={displayVal}
                        placeholder="—"
                        onBlur={e => updateCell(yi, field.key as keyof CoreYear, e.target.value)}
                        className={`w-full text-right bg-transparent rounded-lg px-2 py-1 outline-none text-slate-800 font-mono tabular-nums transition-all border ${
                          isDivergent
                            ? "border-amber-300 bg-amber-50/60 focus:border-amber-500"
                            : "border-transparent hover:border-slate-200 focus:border-[#1a3a5c] focus:bg-white"
                        }`}
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

      {/* ─── PANNEAU DIVERGENCES ─── */}
      {totalDivergences > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-100">
            <AlertTriangle size={13} className="text-amber-500" />
            <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-widest">
              Divergences Claude vs Regex — choisissez la valeur correcte
            </p>
          </div>
          <div className="divide-y divide-amber-100">
            {Object.entries(divergences).map(([fy, divs]) =>
              divs.map(div => {
                const fieldLabel = CORE_FIELDS.find(f => f.key === div.field)?.label ?? div.field
                return (
                  <div key={`${fy}-${div.field}`} className="flex items-center gap-3 px-4 py-3 flex-wrap">
                    <p className="text-[12px] font-medium text-slate-700 w-36 shrink-0">
                      {fieldLabel} <span className="text-slate-400 font-normal">({fy})</span>
                    </p>
                    <button
                      onClick={() => resolveDivergence(Number(fy), div.field, div.claude)}
                      className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-[#1a3a5c] text-white hover:bg-[#0f2a45] transition-colors"
                    >
                      Claude : {fmtDivVal(div.field, div.claude)}
                    </button>
                    <button
                      onClick={() => resolveDivergence(Number(fy), div.field, div.regex)}
                      className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-amber-700 hover:bg-amber-50 transition-colors"
                    >
                      Regex : {fmtDivVal(div.field, div.regex)}
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

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
