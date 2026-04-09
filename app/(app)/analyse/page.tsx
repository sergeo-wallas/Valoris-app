"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, Check, SlidersHorizontal, ArrowRight, ArrowLeft, X, Upload, FileText, Info } from "lucide-react"
import FinancialUploader from "../../components/FinancialUploader"
import { SECTORS, MARKET_DEFAULTS, computeWACC, type WACCResult } from "../../lib/wacc"

type Step = 1 | 2 | 3

export default function Analyse() {
  const [step, setStep] = useState<Step>(1)
  const [siren, setSiren] = useState("")
  const [company, setCompany] = useState<any>(null)
  const [sireneData, setSireneData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showFinancials, setShowFinancials] = useState(false)
  const [showUploader, setShowUploader] = useState(false)
  const [g, setG] = useState("2.0")
  const [years, setYears] = useState("5")
  const router = useRouter()

  // WACC calculator state
  const [sectorKey, setSectorKey] = useState("autre")
  const [waccResult, setWaccResult] = useState<WACCResult | null>(null)
  const [deCible, setDeCible] = useState<number>(0.5) // D/E cible (depuis les financials ou défaut)
  const [rf, setRf] = useState(MARKET_DEFAULTS.rf * 100)
  const [erp, setErp] = useState(MARKET_DEFAULTS.erp * 100)
  const [sizePrem, setSizePrem] = useState(MARKET_DEFAULTS.size_premium * 100)
  const [illiqPrem, setIlliqPrem] = useState(MARKET_DEFAULTS.illiquidity_premium * 100)
  const [kdGross, setKdGross] = useState(MARKET_DEFAULTS.kd_gross * 100)

  // Recalcule le WACC chaque fois qu'un paramètre change
  useEffect(() => {
    const result = computeWACC({
      sector_key: sectorKey,
      de_cible: deCible,
      rf: rf / 100,
      erp: erp / 100,
      size_premium: sizePrem / 100,
      illiquidity_premium: illiqPrem / 100,
      kd_gross: kdGross / 100,
    })
    setWaccResult(result)
  }, [sectorKey, deCible, rf, erp, sizePrem, illiqPrem, kdGross])

  // Quand on passe à l'étape 3, on récupère les financials pour extraire D/E
  useEffect(() => {
    if (step !== 3 || !company?.id) return
    fetch(`/api/financials?company_id=${company.id}`)
      .then(r => r.json())
      .then((data: any[]) => {
        if (data && data.length > 0) {
          const latest = data[0]
          const equity = latest.equity
          const netDebt = latest.net_debt
          if (equity && equity > 0 && netDebt != null) {
            const de = Math.max(0, netDebt / equity)
            setDeCible(Math.round(de * 100) / 100)
          }
        }
      })
      .catch(() => {})
  }, [step, company?.id])

  const TRANCHES: Record<string, string> = {
    "NN": "Non employeur", "00": "0 salarié", "01": "1–2", "02": "3–5",
    "03": "6–9", "11": "10–19", "12": "20–49", "21": "50–99",
    "22": "100–199", "31": "200–249", "32": "250–499", "41": "500–999",
  }

  const searchCompany = async () => {
    if (!siren || siren.length < 9) {
      setError("Le SIREN doit contenir 9 chiffres")
      return
    }
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${siren}&limite=1`)
      const data = await res.json()
      if (data.results && data.results.length > 0) {
        const r = data.results[0]
        setCompany({
          siren: r.siren,
          name: r.nom_complet,
          sector: r.activite_principale,
          legal_form: r.nature_juridique,
          naf_code: r.activite_principale,
          country: "France",
        })
        // Enrichissement Sirene en parallèle (silencieux)
        fetch(`/api/sirene?siren=${r.siren}`)
          .then(res => res.ok ? res.json() : null)
          .then(d => { if (d?.unite_legale) setSireneData(d.unite_legale) })
          .catch(() => {})
        setStep(2)
      } else {
        setError("Aucune entreprise trouvée pour ce SIREN")
      }
    } catch {
      setError("Erreur lors de la recherche — vérifiez votre connexion")
    } finally {
      setLoading(false)
    }
  }

  const createCompany = async () => {
    setLoading(true)
    try {
      const raw = localStorage.getItem("valoris_user")
      const email = raw ? JSON.parse(raw).email : null
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...company, owner_email: email })
      })
      const data = await res.json()
      setCompany({ ...company, id: data.id })
      setShowFinancials(true)
    } catch {
      setError("Erreur lors de la création")
    } finally {
      setLoading(false)
    }
  }

  const launchAnalysis = async () => {
    if (!waccResult) return
    setLoading(true)
    try {
      // Sauvegarde les 3 scénarios : base, pessimiste (+2%), optimiste (-1.5%)
      const scenarios = [
        { scenario: "base",       wacc: waccResult.wacc },
        { scenario: "pessimiste", wacc: waccResult.wacc + 0.02 },
        { scenario: "optimiste",  wacc: Math.max(0.03, waccResult.wacc - 0.015) },
      ]
      for (const s of scenarios) {
        await fetch("/api/wacc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company_id:          company.id,
            wacc:                s.wacc,
            beta_unlevered:      waccResult.beta_unlevered,
            beta_relevered:      waccResult.beta_relevered,
            debt_equity_ratio:   waccResult.de_cible,
            risk_free_rate:      waccResult.rf,
            market_premium:      waccResult.erp,
            size_premium:        waccResult.size_premium,
            illiquidity_premium: waccResult.illiquidity_premium,
            ke:                  waccResult.ke,
            kd_gross:            waccResult.kd_gross,
            kd_net:              waccResult.kd_net,
            scenario:            s.scenario,
          })
        })
      }
      router.push(`/?company_id=${company.id}`)
    } catch {
      setError("Erreur lors du lancement")
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    { n: 1, label: "Identification", icon: Search },
    { n: 2, label: "Vérification",   icon: Check },
    { n: 3, label: "Paramètres",     icon: SlidersHorizontal },
  ]

  return (
    <main className="flex-1 bg-[#f4f7fb] min-h-screen p-8">

      {/* HEADER */}
      <div className="mb-8">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-2">Nouvelle analyse</p>
        <h1 className="text-2xl font-bold text-slate-900">Analyse d'entreprise</h1>
      </div>

      {/* STEPPER */}
      <div className="flex items-center mb-10">
        {steps.map((s, i) => {
          const Icon = s.icon
          const isActive = step === s.n
          const isDone = step > s.n
          return (
            <div key={s.n} className="flex items-center">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${
                  isDone  ? "bg-[#0d7a5f] shadow-sm shadow-[#0d7a5f]/30" :
                  isActive ? "bg-[#1a3a5c] shadow-sm shadow-[#1a3a5c]/30" :
                  "bg-white border border-slate-200"
                }`}>
                  {isDone
                    ? <Check size={15} className="text-white" />
                    : <Icon size={15} className={isActive ? "text-white" : "text-slate-400"} />
                  }
                </div>
                <span className={`text-sm font-medium transition-colors ${
                  isActive ? "text-slate-900" : isDone ? "text-[#0d7a5f]" : "text-slate-400"
                }`}>
                  {s.label}
                </span>
              </div>
              {i < 2 && (
                <div className={`h-px mx-5 w-20 transition-colors ${step > s.n ? "bg-[#0d7a5f]/40" : "bg-slate-200"}`} />
              )}
            </div>
          )
        })}
      </div>

      {/* STEP 1 — SIREN */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 max-w-lg">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Identification de l'entreprise</h2>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            Entrez le SIREN pour récupérer automatiquement les informations depuis le registre officiel
          </p>

          <div className="mb-5">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2 block">
              Numéro SIREN
            </label>
            <div className="relative">
              <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={siren}
                onChange={e => setSiren(e.target.value.replace(/\D/g, "").slice(0, 9))}
                placeholder="123 456 789"
                className="w-full border border-slate-200 rounded-xl pl-11 pr-4 py-3.5 text-lg font-mono tracking-widest text-slate-900 outline-none focus:border-[#1a3a5c] focus:ring-2 focus:ring-[#1a3a5c]/8 transition-all bg-slate-50 focus:bg-white"
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-slate-400">{siren.length}/9 chiffres</p>
              {siren.length === 9 && <span className="text-xs text-emerald-600 font-medium">✓ Format valide</span>}
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 text-red-600 text-sm mb-4 bg-red-50 border border-red-100 px-4 py-3 rounded-xl">
              <X size={14} className="flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={searchCompany}
              disabled={loading || siren.length !== 9}
              className="flex-1 flex items-center justify-center gap-2 bg-[#1a3a5c] text-white py-3 rounded-xl text-sm font-medium hover:bg-[#0f2a45] transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "Recherche en cours…" : <>Rechercher <ArrowRight size={14} /></>}
            </button>
            <button
              onClick={() => router.push("/workspace")}
              className="px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-500 hover:border-slate-300 hover:bg-slate-50 transition-all"
            >
              Annuler
            </button>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-xs text-slate-400 mb-2">Ou saisissez manuellement</p>
            <button
              onClick={() => {
                setCompany({ siren: "", name: "", sector: "", legal_form: "SAS", naf_code: "", country: "France" })
                setStep(2)
              }}
              className="text-sm text-[#1a3a5c] font-medium hover:underline flex items-center gap-1"
            >
              Saisie manuelle <ArrowRight size={13} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2 — VÉRIFICATION */}
      {step === 2 && company && (
        <div className="space-y-6 max-w-lg">

        {/* Bloc vérification entreprise */}
        {!showFinancials && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Vérification des données</h2>
          <p className="text-sm text-slate-400 mb-6">Vérifiez et complétez les informations de l'entreprise</p>

          <div className="space-y-4">
            {[
              { label: "Nom de l'entreprise", key: "name",       placeholder: "CAP Cosmetiques" },
              { label: "SIREN",               key: "siren",      placeholder: "123456789" },
              { label: "Secteur d'activité",  key: "sector",     placeholder: "Cosmetique" },
              { label: "Code NAF",            key: "naf_code",   placeholder: "2042Z" },
              { label: "Forme juridique",     key: "legal_form", placeholder: "SAS" },
            ].map(field => (
              <div key={field.key}>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 block">
                  {field.label}
                </label>
                <input
                  type="text"
                  value={company[field.key] ?? ""}
                  onChange={e => setCompany({ ...company, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#1a3a5c] focus:ring-2 focus:ring-[#1a3a5c]/8 transition-all bg-slate-50 focus:bg-white"
                />
              </div>
            ))}
          </div>

          {/* Enrichissement Sirene INSEE */}
          {sireneData && (
            <div className="mt-5 bg-[#1a3a5c]/4 border border-[#1a3a5c]/10 rounded-xl p-4">
              <p className="text-[10px] font-bold text-[#1a3a5c] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0d7a5f]" />
                Données officielles INSEE · Sirene
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    label: "Statut",
                    value: sireneData.etat_administratif_unite_legale === "A"
                      ? "✓ Active"
                      : "✗ Cessée",
                    color: sireneData.etat_administratif_unite_legale === "A"
                      ? "text-emerald-700"
                      : "text-red-600",
                  },
                  {
                    label: "Catégorie",
                    value: sireneData.categorie_entreprise ?? "NC",
                    color: "text-slate-900",
                  },
                  {
                    label: "Création",
                    value: sireneData.date_creation_unite_legale
                      ? new Date(sireneData.date_creation_unite_legale).toLocaleDateString("fr-FR")
                      : "NC",
                    color: "text-slate-900",
                  },
                  {
                    label: "Effectifs",
                    value: TRANCHES[sireneData.tranche_effectif_salaries_unite_legale ?? ""] ?? "NC",
                    color: "text-slate-900",
                  },
                ].map(item => (
                  <div key={item.label} className="bg-white rounded-lg px-3 py-2.5 border border-slate-100">
                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-0.5">{item.label}</p>
                    <p className={`text-sm font-semibold ${item.color}`}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2.5 text-red-600 text-sm mt-4 bg-red-50 border border-red-100 px-4 py-3 rounded-xl">
              <X size={14} className="flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button
              onClick={createCompany}
              disabled={loading || !company.name}
              className="flex-1 flex items-center justify-center gap-2 bg-[#1a3a5c] text-white py-3 rounded-xl text-sm font-medium hover:bg-[#0f2a45] transition-all shadow-sm disabled:opacity-40"
            >
              {loading ? "Enregistrement…" : <>Confirmer <ArrowRight size={14} /></>}
            </button>
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-1.5 px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-500 hover:border-slate-300 hover:bg-slate-50 transition-all"
            >
              <ArrowLeft size={14} /> Retour
            </button>
          </div>
        </div>
        )} {/* fin !showFinancials */}

        {/* Section États financiers — apparaît après confirmation entreprise */}
        {showFinancials && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">

            {/* En-tête section */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-xs font-semibold text-[#0d7a5f] uppercase tracking-widest mb-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0d7a5f]" />
                  {company.name}
                </p>
                <h2 className="text-lg font-semibold text-slate-900">États financiers</h2>
                <p className="text-sm text-slate-400 mt-0.5">
                  Formats acceptés : PDF liasse fiscale, Excel bilan
                </p>
              </div>
              <FileText size={20} className="text-slate-300 mt-1" />
            </div>

            {/* Uploader ou bouton import */}
            {showUploader ? (
              <FinancialUploader
                companyId={company.id}
                onComplete={() => setStep(3)}
              />
            ) : (
              <div className="space-y-3">
                <button
                  onClick={() => setShowUploader(true)}
                  className="w-full flex items-center justify-center gap-2.5 bg-[#1a3a5c] text-white py-3.5 rounded-xl text-sm font-medium hover:bg-[#0f2a45] transition-all shadow-sm"
                >
                  <Upload size={16} /> Importer un document
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="w-full flex items-center justify-center gap-1.5 text-sm text-slate-500 py-2.5 hover:text-slate-700 transition-colors"
                >
                  Saisie manuelle <ArrowRight size={13} />
                </button>
              </div>
            )}

          </div>
        )}

        </div>
      )}

      {/* STEP 3 — PARAMÈTRES WACC */}
      {step === 3 && (
        <div className="space-y-5 max-w-2xl">

          {/* WACC Calculator */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Calcul du WACC</h2>
            <p className="text-sm text-slate-400 mb-6">
              Le WACC est calculé automatiquement par la méthode Hamada (bêta Damodaran Europe 2025)
            </p>

            {/* Étape 1 — Secteur */}
            <div className="mb-6">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2 block">
                Étape 1 — Secteur d'activité (comparable coté)
              </label>
              <select
                value={sectorKey}
                onChange={e => setSectorKey(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#1a3a5c] bg-slate-50 focus:bg-white transition-all"
              >
                {Object.entries(SECTORS).map(([key, s]) => (
                  <option key={key} value={key}>{s.label}</option>
                ))}
              </select>
              {waccResult && (
                <p className="text-xs text-slate-400 mt-1.5">
                  β leviéré comparable : <strong>{waccResult.beta_levered_comparable}</strong> · D/E secteur : <strong>{(waccResult.de_comparable * 100).toFixed(0)}%</strong>
                </p>
              )}
            </div>

            {/* Étape 2+3 — Structure financière PME */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                  Étape 2+3 — D/E de la PME cible
                </label>
                <span className="text-sm font-bold text-[#1a3a5c] tabular-nums">{(deCible * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range" min="0" max="3" step="0.05"
                value={deCible}
                onChange={e => setDeCible(parseFloat(e.target.value))}
                className="w-full accent-[#1a3a5c]"
              />
              <div className="flex justify-between mt-1">
                <p className="text-xs text-slate-400">0% (0 dette)</p>
                <p className="text-xs text-slate-400">
                  {waccResult ? <>β unlevered : <strong>{waccResult.beta_unlevered}</strong> → β relevered : <strong>{waccResult.beta_relevered}</strong></> : ""}
                </p>
                <p className="text-xs text-slate-400">300%</p>
              </div>
            </div>

            {/* Paramètres de marché */}
            <div className="border-t border-slate-100 pt-5 mb-5">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                <Info size={11} /> Paramètres de marché (modifiables)
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Rf — Taux sans risque (OAT)", val: rf, set: setRf, min: 0, max: 8, step: 0.1 },
                  { label: "ERP — Prime de marché",        val: erp, set: setErp, min: 2, max: 10, step: 0.1 },
                  { label: "Prime taille PME",             val: sizePrem, set: setSizePrem, min: 0, max: 8, step: 0.5 },
                  { label: "Prime illiquidité",            val: illiqPrem, set: setIlliqPrem, min: 0, max: 6, step: 0.5 },
                  { label: "Kd brut (taux d'emprunt)",     val: kdGross, set: setKdGross, min: 1, max: 12, step: 0.25 },
                ].map(({ label, val, set, min, max, step }) => (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs text-slate-500">{label}</label>
                      <span className="text-xs font-bold text-slate-800 tabular-nums">{val.toFixed(2)}%</span>
                    </div>
                    <input
                      type="range" min={min} max={max} step={step}
                      value={val}
                      onChange={e => set(parseFloat(e.target.value))}
                      className="w-full accent-[#1a3a5c] h-1.5"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Résultat WACC */}
            {waccResult && (
              <div className="space-y-3">
                {/* Décomposition Ke / Kd */}
                <div className="bg-gradient-to-br from-[#0c1f35] to-[#1a3a5c] rounded-xl p-5">
                  <p className="text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-3">Décomposition du WACC</p>
                  <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                    {[
                      { label: "Ke (coût fonds propres)", val: `${(waccResult.ke * 100).toFixed(1)}%` },
                      { label: "Kd net (coût dette)",     val: `${(waccResult.kd_net * 100).toFixed(1)}%` },
                      { label: "Poids E/(D+E)",           val: `${(waccResult.weight_equity * 100).toFixed(0)}%` },
                      { label: "Poids D/(D+E)",           val: `${(waccResult.weight_debt * 100).toFixed(0)}%` },
                      { label: "Ke × E/(D+E)",            val: `${(waccResult.ke * waccResult.weight_equity * 100).toFixed(2)}%` },
                      { label: "Kd_net × D/(D+E)",        val: `${(waccResult.kd_net * waccResult.weight_debt * 100).toFixed(2)}%` },
                    ].map(row => (
                      <div key={row.label} className="flex justify-between text-white/60">
                        <span>{row.label}</span>
                        <span className="font-semibold text-white/80">{row.val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3 scénarios */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      scenario: "Pessimiste",
                      wacc: waccResult.wacc + 0.02,
                      delta: "+2%",
                      bg: "bg-red-50 border-red-100",
                      label: "text-red-600",
                      badge: "bg-red-100 text-red-500",
                    },
                    {
                      scenario: "Base",
                      wacc: waccResult.wacc,
                      delta: "référence",
                      bg: "bg-gradient-to-br from-[#0c1f35] to-[#1a3a5c]",
                      label: "text-white/60",
                      badge: "bg-white/10 text-white/70",
                      valueClass: "text-white",
                    },
                    {
                      scenario: "Optimiste",
                      wacc: Math.max(0.03, waccResult.wacc - 0.015),
                      delta: "-1.5%",
                      bg: "bg-emerald-50 border-emerald-100",
                      label: "text-emerald-600",
                      badge: "bg-emerald-100 text-emerald-600",
                    },
                  ].map(s => (
                    <div key={s.scenario} className={`rounded-xl p-4 border text-center ${s.bg}`}>
                      <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${s.label}`}>{s.scenario}</p>
                      <p className={`text-2xl font-bold tabular-nums mb-1 ${s.valueClass ?? "text-slate-900"}`}>
                        {(s.wacc * 100).toFixed(1)}%
                      </p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${s.badge}`}>
                        WACC {s.delta}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* DCF Params */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-5">Paramètres DCF</h2>
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Croissance terminale g</label>
                  <span className="text-lg font-bold text-[#1a3a5c] tabular-nums">{g}%</span>
                </div>
                <input type="range" min="0" max="5" step="0.5" value={g} onChange={e => setG(e.target.value)} className="w-full accent-[#1a3a5c]" />
                <div className="flex justify-between mt-1">
                  <p className="text-xs text-slate-400">0%</p>
                  <p className="text-xs text-slate-400">Recommandé : 1.5–2.5%</p>
                  <p className="text-xs text-slate-400">5%</p>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3 block">Années de projection</label>
                <div className="grid grid-cols-4 gap-2">
                  {["3", "5", "7", "10"].map(y => (
                    <button key={y} type="button" onClick={() => setYears(y)}
                      className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                        years === y ? "bg-[#1a3a5c] text-white border-[#1a3a5c] shadow-sm" : "bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-white"
                      }`}
                    >
                      {y} ans
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 text-red-600 text-sm bg-red-50 border border-red-100 px-4 py-3 rounded-xl">
              <X size={14} className="flex-shrink-0 mt-0.5" /> {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={launchAnalysis}
              disabled={loading || !waccResult}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#0a5040] to-[#0d7a5f] text-white py-3.5 rounded-xl text-sm font-medium hover:from-[#095040] hover:to-[#0a6a52] transition-all shadow-sm disabled:opacity-40"
            >
              {loading ? "Génération en cours…" : <>Lancer l'analyse · WACC {waccResult ? `${(waccResult.wacc * 100).toFixed(1)}%` : "…"} <ArrowRight size={14} /></>}
            </button>
            <button onClick={() => setStep(2)}
              className="flex items-center gap-1.5 px-4 py-3.5 border border-slate-200 rounded-xl text-sm text-slate-500 hover:border-slate-300 hover:bg-slate-50 transition-all"
            >
              <ArrowLeft size={14} /> Retour
            </button>
          </div>
        </div>
      )}

    </main>
  )
}
