"use client"
import { useEffect, useState } from "react"
import { Plus, Trash2, AlertTriangle, Leaf, Users, Scale, ChevronDown, ChevronUp } from "lucide-react"
import { computeESGResult } from "../lib/esg"
import type { ESGCriterion } from "../lib/esg"

// ─── Critères fixes par pilier ─────────────────────────────────────────────
const BASE_CRITERIA = [
  { pillar: "E", code: "E1", name: "Politique réduction CO₂",       is_risk: 0 },
  { pillar: "E", code: "E2", name: "Gestion des déchets / recyclage", is_risk: 0 },
  { pillar: "E", code: "E3", name: "Efficience énergétique",          is_risk: 0 },
  { pillar: "S", code: "S1", name: "Conditions de travail & sécurité", is_risk: 0 },
  { pillar: "S", code: "S2", name: "Formation & développement RH",    is_risk: 0 },
  { pillar: "S", code: "S3", name: "Diversité & inclusion",           is_risk: 0 },
  { pillar: "G", code: "G1", name: "Transparence & reporting",        is_risk: 0 },
  { pillar: "G", code: "G2", name: "Gestion des risques internes",    is_risk: 0 },
  { pillar: "G", code: "G3", name: "Éthique & conformité",            is_risk: 0 },
] as const

type Criterion = ESGCriterion & { id?: number }

const PILLAR_CONFIG = {
  E: { label: "Environnement", icon: Leaf,  color: "emerald", border: "border-emerald-200", bg: "bg-emerald-50", text: "text-emerald-700" },
  S: { label: "Social",        icon: Users, color: "blue",    border: "border-blue-200",    bg: "bg-blue-50",    text: "text-blue-700" },
  G: { label: "Gouvernance",   icon: Scale, color: "violet",  border: "border-violet-200",  bg: "bg-violet-50",  text: "text-violet-700" },
}

// ─── Composant principal ───────────────────────────────────────────────────
export default function ESGPanel({ companyId }: { companyId: string | null }) {
  const fiscalYear = new Date().getFullYear()

  // Initialiser immédiatement avec les critères de base à score 0
  const defaultCriteria: Criterion[] = BASE_CRITERIA.map(b => ({
    pillar: b.pillar, criterion_code: b.code, criterion_name: b.name,
    score: 0, max_score: 2, is_risk: b.is_risk,
  }))

  const [criteria,   setCriteria]   = useState<Criterion[]>(defaultCriteria)
  const [saving,     setSaving]     = useState<string | null>(null)
  const [openPillar, setOpenPillar] = useState<string | null>(null)
  const [addForm,    setAddForm]    = useState<{ pillar: string; name: string; is_risk: number } | null>(null)

  // ── Chargement des scores sauvegardés ─────────────────────────────────
  useEffect(() => {
    if (!companyId) return
    fetch(`/api/esg?company_id=${companyId}&fiscal_year=${fiscalYear}`)
      .then(r => r.json())
      .then((saved: Criterion[]) => {
        if (!Array.isArray(saved) || saved.length === 0) return
        // Fusionner scores DB sur les critères de base
        const merged: Criterion[] = BASE_CRITERIA.map(b => {
          const found = saved.find(s => s.criterion_code === b.code)
          return found ?? { pillar: b.pillar, criterion_code: b.code, criterion_name: b.name, score: 0, max_score: 2, is_risk: b.is_risk }
        })
        // Ajouter les critères custom
        const customs = saved.filter(s => !BASE_CRITERIA.some(b => b.code === s.criterion_code))
        setCriteria([...merged, ...customs])
      })
      .catch(() => { /* silencieux */ })
  }, [companyId, fiscalYear])

  // ── Sauvegarde d'un score ──────────────────────────────────────────────
  const saveScore = async (c: Criterion, newScore: number) => {
    if (!companyId) return
    setSaving(c.criterion_code)
    const updated = criteria.map(x => x.criterion_code === c.criterion_code ? { ...x, score: newScore } : x)
    setCriteria(updated)

    await fetch("/api/esg", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company_id: companyId, fiscal_year: fiscalYear,
        pillar: c.pillar, criterion_code: c.criterion_code,
        criterion_name: c.criterion_name, score: newScore, is_risk: c.is_risk,
      }),
    })
    setSaving(null)
  }

  // ── Ajout d'un critère custom ──────────────────────────────────────────
  const addCriterion = async () => {
    if (!addForm || !companyId || !addForm.name.trim()) return
    const code = `${addForm.pillar}_custom_${Date.now()}`
    const newC: Criterion = {
      pillar: addForm.pillar, criterion_code: code,
      criterion_name: addForm.name.trim(), score: 0, max_score: 2, is_risk: addForm.is_risk,
    }
    await fetch("/api/esg", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company_id: companyId, fiscal_year: fiscalYear, ...newC }),
    })
    setCriteria(prev => [...prev, newC])
    setAddForm(null)
  }

  // ── Suppression d'un critère custom ───────────────────────────────────
  const deleteCriterion = async (c: Criterion) => {
    if (!c.id) {
      setCriteria(prev => prev.filter(x => x.criterion_code !== c.criterion_code))
      return
    }
    await fetch(`/api/esg?id=${c.id}`, { method: "DELETE" })
    setCriteria(prev => prev.filter(x => x.criterion_code !== c.criterion_code))
  }

  const { totalScore, growthAdj, pillarScores } = computeESGResult(criteria)

  const adjLabel = growthAdj > 0 ? `+${(growthAdj * 100).toFixed(1)}%`
                 : growthAdj < 0 ? `${(growthAdj * 100).toFixed(1)}%`
                 : "Neutre"
  const adjColor = growthAdj > 0 ? "text-emerald-600 bg-emerald-50 border-emerald-200"
                 : growthAdj < 0 ? "text-red-600 bg-red-50 border-red-200"
                 : "text-slate-500 bg-slate-50 border-slate-200"

  if (!companyId) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mt-6 p-8 text-center">
        <p className="text-sm text-slate-400">Sélectionnez une entreprise</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mt-6">

      {/* HEADER */}
      <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Score ESG</h2>
          <p className="text-xs text-slate-400 mt-0.5">Impact sur la croissance des FCF projetés</p>
        </div>
        <div className="flex items-center gap-2">
          {totalScore !== null && (
            <span className="text-sm font-bold text-slate-800 tabular-nums">{totalScore}/100</span>
          )}
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${adjColor}`}>
            CAGR {adjLabel}
          </span>
        </div>
      </div>

      {/* SCORE GLOBAL (anneau) */}
      <div className="flex items-center justify-center pt-6 pb-2">
        <div className="relative w-20 h-20">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f1f5f9" strokeWidth="2.5" />
            {totalScore !== null && (
              <circle cx="18" cy="18" r="15.9" fill="none"
                stroke={totalScore >= 70 ? "#0d7a5f" : totalScore >= 45 ? "#f59e0b" : "#ef4444"}
                strokeWidth="2.5"
                strokeDasharray={`${totalScore} ${100 - totalScore}`}
                strokeLinecap="round"
              />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-xl font-bold ${totalScore === null ? "text-slate-200" : totalScore >= 70 ? "text-[#0d7a5f]" : totalScore >= 45 ? "text-amber-500" : "text-red-500"}`}>
              {totalScore ?? "—"}
            </span>
            <span className="text-[9px] text-slate-400">/100</span>
          </div>
        </div>
      </div>

      {/* PILIERS */}
      <div className="px-5 pb-5 pt-2 space-y-2">
        {(["E", "S", "G"] as const).map(pillarKey => {
          const cfg = PILLAR_CONFIG[pillarKey]
          const Icon = cfg.icon
          const pillarCriteria = criteria.filter(c => c.pillar === pillarKey)
          const isOpen = openPillar === pillarKey
          const pscore = pillarScores[pillarKey]
          const isAddingHere = addForm?.pillar === pillarKey

          return (
            <div key={pillarKey} className={`rounded-xl border ${cfg.border} overflow-hidden`}>
              {/* Pillar header */}
              <button
                onClick={() => setOpenPillar(isOpen ? null : pillarKey)}
                className={`w-full flex items-center justify-between px-4 py-3 ${cfg.bg} hover:opacity-90 transition-opacity`}
              >
                <div className="flex items-center gap-2">
                  <Icon size={14} className={cfg.text} />
                  <span className={`text-[12px] font-semibold ${cfg.text}`}>{cfg.label}</span>
                  {pillarCriteria.filter(c => c.is_risk).length > 0 && (
                    <span className="text-[10px] text-red-500 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                      <AlertTriangle size={9} />
                      {pillarCriteria.filter(c => c.is_risk).length} risque{pillarCriteria.filter(c => c.is_risk).length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {pscore !== null && (
                    <span className={`text-[11px] font-bold ${cfg.text}`}>{pscore}/100</span>
                  )}
                  {isOpen ? <ChevronUp size={13} className={cfg.text} /> : <ChevronDown size={13} className={cfg.text} />}
                </div>
              </button>

              {isOpen && (
                <div className="divide-y divide-slate-50">
                  {pillarCriteria.map(c => {
                    const isRisk = !!c.is_risk
                    const isCustom = !BASE_CRITERIA.some(b => b.code === c.criterion_code)
                    return (
                      <div key={c.criterion_code} className="flex items-center gap-3 px-4 py-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] text-slate-700 truncate">{c.criterion_name}</p>
                          {isRisk && (
                            <span className="text-[9px] font-semibold text-red-500 uppercase tracking-wide">Facteur de risque</span>
                          )}
                        </div>

                        {/* Score selector */}
                        <div className="flex items-center gap-1">
                          {[0, 1, 2].map(val => {
                            const active = c.score === val
                            const isSaving = saving === c.criterion_code
                            let bg = "bg-slate-100 text-slate-400"
                            if (active) {
                              if (isRisk) {
                                bg = val === 0 ? "bg-emerald-100 text-emerald-700" : val === 1 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                              } else {
                                bg = val === 0 ? "bg-slate-200 text-slate-500" : val === 1 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                              }
                            }
                            const label = isRisk
                              ? ["Aucun", "Modéré", "Élevé"][val]
                              : ["Faible", "Moyen", "Bon"][val]
                            return (
                              <button
                                key={val}
                                onClick={() => saveScore(c, val)}
                                disabled={isSaving}
                                title={label}
                                className={`w-7 h-7 rounded-lg text-[11px] font-bold transition-all ${bg} hover:opacity-80`}
                              >
                                {val}
                              </button>
                            )
                          })}
                        </div>

                        {/* Supprimer custom */}
                        {isCustom && (
                          <button
                            onClick={() => deleteCriterion(c)}
                            className="text-slate-300 hover:text-red-400 transition-colors ml-1"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    )
                  })}

                  {/* Formulaire d'ajout inline */}
                  {isAddingHere ? (
                    <div className="px-4 py-3 bg-slate-50 space-y-2">
                      <input
                        autoFocus
                        placeholder="Nom du critère (ex : Risque fournisseur)"
                        value={addForm.name}
                        onChange={e => setAddForm(f => f ? { ...f, name: e.target.value } : f)}
                        onKeyDown={e => { if (e.key === "Enter") addCriterion(); if (e.key === "Escape") setAddForm(null) }}
                        className="w-full text-[12px] border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-[#1a3a5c] bg-white"
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500">Type :</span>
                        {[
                          { value: 0, label: "Critère ESG", color: "bg-emerald-50 border-emerald-300 text-emerald-700" },
                          { value: 1, label: "Facteur de risque", color: "bg-red-50 border-red-300 text-red-700" },
                        ].map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => setAddForm(f => f ? { ...f, is_risk: opt.value } : f)}
                            className={`text-[11px] font-medium px-2.5 py-1 rounded-full border transition-all ${
                              addForm.is_risk === opt.value ? opt.color : "bg-white border-slate-200 text-slate-400"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={addCriterion}
                          className="text-[11px] font-semibold bg-[#1a3a5c] text-white px-3 py-1.5 rounded-lg hover:bg-[#0f2a45] transition-colors"
                        >
                          Ajouter
                        </button>
                        <button
                          onClick={() => setAddForm(null)}
                          className="text-[11px] text-slate-400 hover:text-slate-600 px-2 py-1.5"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddForm({ pillar: pillarKey, name: "", is_risk: 1 })}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-[11px] text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <Plus size={12} />
                      Ajouter un critère ou facteur de risque
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* LÉGENDE */}
      <div className="px-5 pb-5">
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-start gap-2">
          <AlertTriangle size={13} className="text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-[10px] text-slate-500 leading-relaxed">
            Les <strong>facteurs de risque</strong> (risque juridique, fournisseur, client…) pénalisent le score ESG et réduisent la croissance projetée des FCF.
            Score 0 = aucun risque identifié · 1 = risque modéré · 2 = risque élevé.
          </p>
        </div>
      </div>

    </div>
  )
}
