"use client"
import { useState, useRef } from "react"
import { Sparkles, Save, Check, Loader2 } from "lucide-react"

interface Props {
  companyId: number
  initialCommentary: string
}

export default function CommentaryPanel({ companyId, initialCommentary }: Props) {
  const [text, setText]         = useState(initialCommentary)
  const [aiLoading, setAiLoad]  = useState(false)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [aiError, setAiError]   = useState("")
  const dirty = text !== initialCommentary && !saved
  const savedRef = useRef(text)

  const suggestAI = async () => {
    setAiLoad(true)
    setAiError("")
    try {
      const res = await fetch(`/api/ai/commentary?company_id=${companyId}`)
      const data = await res.json()
      if (!res.ok) {
        setAiError(data.error ?? "Erreur IA")
        return
      }
      setText(data.text ?? "")
      setSaved(false)
    } catch {
      setAiError("Impossible de joindre l'API")
    } finally {
      setAiLoad(false)
    }
  }

  const save = async () => {
    setSaving(true)
    try {
      await fetch("/api/commentary", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_id: companyId, commentary: text }),
      })
      savedRef.current = text
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mt-6">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Commentaires & Analyse</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Notes de l'analyste liées à cette entreprise
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Bouton suggérer IA */}
          <button
            onClick={suggestAI}
            disabled={aiLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {aiLoading
              ? <Loader2 size={12} className="animate-spin" />
              : <Sparkles size={12} />
            }
            {aiLoading ? "Génération…" : "Suggérer par IA"}
          </button>

          {/* Bouton enregistrer */}
          <button
            onClick={save}
            disabled={saving || (!dirty && !saved)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              saved
                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                : "bg-[#1a3a5c] text-white hover:bg-[#0f2a45]"
            }`}
          >
            {saved
              ? <><Check size={12} /> Enregistré</>
              : saving
                ? <><Loader2 size={12} className="animate-spin" /> Enregistrement…</>
                : <><Save size={12} /> Enregistrer</>
            }
          </button>
        </div>
      </div>

      {/* Zone de texte */}
      <div className="p-5">
        {aiError && (
          <p className="text-xs text-red-500 mb-3 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {aiError}
          </p>
        )}
        <textarea
          value={text}
          onChange={e => { setText(e.target.value); setSaved(false) }}
          placeholder={`Rédigez votre analyse ici…\n\nExemple : performance opérationnelle, structure financière, points d'attention, recommandations.\n\nUtilisez "Suggérer par IA" pour obtenir un commentaire généré automatiquement à partir des données financières.`}
          className="w-full min-h-[220px] text-sm text-slate-700 placeholder:text-slate-300 leading-relaxed resize-y border-0 outline-none bg-transparent"
        />
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
          <span className="text-[10px] text-slate-300">
            {text.length > 0 ? `${text.length} caractères` : ""}
          </span>
          {dirty && (
            <span className="text-[10px] text-amber-400">Modifications non enregistrées</span>
          )}
        </div>
      </div>
    </div>
  )
}
