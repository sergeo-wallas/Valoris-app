"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

type Step = 1 | 2 | 3

export default function Analyse() {
  const [step, setStep] = useState<Step>(1)
  const [siren, setSiren] = useState("")
  const [company, setCompany] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [wacc, setWacc] = useState("9.5")
  const [g, setG] = useState("2.0")
  const [years, setYears] = useState("5")
  const router = useRouter()

  // Recherche entreprise via API gouvernementale
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

  // Création entreprise en BDD
  const createCompany = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(company)
      })
      const data = await res.json()
      setCompany({ ...company, id: data.id })
      setStep(3)
    } catch {
      setError("Erreur lors de la création")
    } finally {
      setLoading(false)
    }
  }

  // Lancement analyse
  const launchAnalysis = async () => {
    setLoading(true)
    try {
      await fetch("/api/wacc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: company.id,
          wacc: parseFloat(wacc) / 100,
          terminal_growth_rate: parseFloat(g) / 100,
          beta_unlevered: 0.74,
          beta_relevered: 1.90,
          debt_equity_ratio: 2.07,
          risk_free_rate: 0.035,
          market_premium: 0.06,
          size_premium: 0.03,
          illiquidity_premium: 0.025,
          ke: 0.20,
          kd_gross: 0.057,
          kd_net: 0.043,
          scenario: "base"
        })
      })
      router.push(`/?company_id=${company.id}`)
    } catch {
      setError("Erreur lors du lancement")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex-1 bg-gray-50 min-h-screen p-8">

      {/* HEADER */}
      <div className="mb-10">
        <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">
          Nouvelle analyse
        </p>
        <h1 className="text-2xl font-serif text-[#1a3a5c]">
          Analyse d'entreprise
        </h1>
      </div>

      {/* STEPPER */}
      <div className="flex items-center gap-0 mb-10">
        {[
          { n: 1, label: "Identification" },
          { n: 2, label: "Vérification" },
          { n: 3, label: "Paramètres" },
        ].map((s, i) => (
          <div key={s.n} className="flex items-center">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition ${
                step === s.n ? "bg-[#1a3a5c] text-white" :
                step > s.n ? "bg-[#0d7a5f] text-white" :
                "bg-gray-200 text-gray-400"
              }`}>
                {step > s.n ? "✓" : s.n}
              </div>
              <span className={`text-sm ${step === s.n ? "text-[#1a3a5c] font-medium" : "text-gray-400"}`}>
                {s.label}
              </span>
            </div>
            {i < 2 && <div className="w-16 h-px bg-gray-200 mx-4"/>}
          </div>
        ))}
      </div>

      {/* ÉTAPE 1 — SIREN */}
      {step === 1 && (
        <div className="bg-white rounded-xl border border-gray-100 p-8 max-w-lg">
          <h2 className="text-lg font-serif text-[#1a3a5c] mb-1">Identification de l'entreprise</h2>
          <p className="text-sm text-gray-400 mb-6">Entrez le numéro SIREN pour récupérer automatiquement les informations</p>

          <div className="mb-4">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">
              Numéro SIREN
            </label>
            <input
              type="text"
              value={siren}
              onChange={e => setSiren(e.target.value.replace(/\D/g, "").slice(0, 9))}
              placeholder="123 456 789"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-lg font-mono tracking-widest text-[#1a3a5c] outline-none focus:border-[#1a3a5c] focus:ring-2 focus:ring-[#1a3a5c]/10 transition"
            />
            <p className="text-xs text-gray-400 mt-2">{siren.length}/9 chiffres</p>
          </div>

          {error && (
            <p className="text-red-500 text-sm mb-4 bg-red-50 px-4 py-2 rounded-lg">{error}</p>
          )}

          <div className="flex gap-3">
            <button
              onClick={searchCompany}
              disabled={loading || siren.length !== 9}
              className="flex-1 bg-[#1a3a5c] text-white py-3 rounded-xl text-sm font-medium hover:bg-[#0f2a45] transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "Recherche en cours..." : "Rechercher →"}
            </button>
            <button
              onClick={() => router.push("/workspace")}
              className="px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-500 hover:border-gray-300 transition"
            >
              Annuler
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-3">Ou saisissez manuellement</p>
            <button
              onClick={() => {
                setCompany({ siren: "", name: "", sector: "", legal_form: "SAS", naf_code: "", country: "France" })
                setStep(2)
              }}
              className="text-sm text-[#1a3a5c] font-medium hover:underline"
            >
              Saisie manuelle →
            </button>
          </div>
        </div>
      )}

      {/* ÉTAPE 2 — VÉRIFICATION */}
      {step === 2 && company && (
        <div className="bg-white rounded-xl border border-gray-100 p-8 max-w-lg">
          <h2 className="text-lg font-serif text-[#1a3a5c] mb-1">Vérification des données</h2>
          <p className="text-sm text-gray-400 mb-6">Vérifiez et complétez les informations de l'entreprise</p>

          <div className="space-y-4">
            {[
              { label: "Nom de l'entreprise", key: "name", placeholder: "CAP Cosmetiques" },
              { label: "SIREN", key: "siren", placeholder: "123456789" },
              { label: "Secteur", key: "sector", placeholder: "Cosmetique" },
              { label: "Code NAF", key: "naf_code", placeholder: "2042Z" },
              { label: "Forme juridique", key: "legal_form", placeholder: "SAS" },
            ].map(field => (
              <div key={field.key}>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">
                  {field.label}
                </label>
                <input
                  type="text"
                  value={company[field.key] ?? ""}
                  onChange={e => setCompany({ ...company, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 outline-none focus:border-[#1a3a5c] focus:ring-2 focus:ring-[#1a3a5c]/10 transition"
                />
              </div>
            ))}
          </div>

          {error && (
            <p className="text-red-500 text-sm mt-4 bg-red-50 px-4 py-2 rounded-lg">{error}</p>
          )}

          <div className="flex gap-3 mt-6">
            <button
              onClick={createCompany}
              disabled={loading || !company.name}
              className="flex-1 bg-[#1a3a5c] text-white py-3 rounded-xl text-sm font-medium hover:bg-[#0f2a45] transition disabled:opacity-40"
            >
              {loading ? "Enregistrement..." : "Confirmer →"}
            </button>
            <button
              onClick={() => setStep(1)}
              className="px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-500 hover:border-gray-300 transition"
            >
              Retour
            </button>
          </div>
        </div>
      )}

      {/* ÉTAPE 3 — PARAMÈTRES */}
      {step === 3 && (
        <div className="bg-white rounded-xl border border-gray-100 p-8 max-w-lg">
          <h2 className="text-lg font-serif text-[#1a3a5c] mb-1">Paramètres du modèle</h2>
          <p className="text-sm text-gray-400 mb-6">Définissez les hypothèses de votre modèle DCF</p>

          <div className="space-y-5">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">
                WACC (%)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="5" max="20" step="0.5"
                  value={wacc}
                  onChange={e => setWacc(e.target.value)}
                  className="flex-1"
                />
                <span className="text-lg font-bold text-[#1a3a5c] w-16 text-right">{wacc}%</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Taux d'actualisation · Recommandé : 8-12% pour PME</p>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">
                Taux de croissance terminal g (%)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0" max="5" step="0.5"
                  value={g}
                  onChange={e => setG(e.target.value)}
                  className="flex-1"
                />
                <span className="text-lg font-bold text-[#1a3a5c] w-16 text-right">{g}%</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Croissance perpétuelle · Recommandé : 1.5-2.5%</p>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">
                Années de projection
              </label>
              <div className="grid grid-cols-4 gap-2">
                {["3", "5", "7", "10"].map(y => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => setYears(y)}
                    className={`py-2 rounded-xl text-sm font-medium border transition ${
                      years === y
                        ? "bg-[#1a3a5c] text-white border-[#1a3a5c]"
                        : "bg-white text-gray-500 border-gray-200 hover:border-[#1a3a5c]/30"
                    }`}
                  >
                    {y} ans
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 mt-6">
            <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Récapitulatif</p>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Entreprise</span>
              <span className="font-medium text-[#1a3a5c]">{company?.name}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-600">WACC</span>
              <span className="font-medium text-[#1a3a5c]">{wacc}%</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-600">Croissance terminale</span>
              <span className="font-medium text-[#1a3a5c]">{g}%</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-600">Projection</span>
              <span className="font-medium text-[#1a3a5c]">{years} ans</span>
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-sm mt-4 bg-red-50 px-4 py-2 rounded-lg">{error}</p>
          )}

          <div className="flex gap-3 mt-6">
            <button
              onClick={launchAnalysis}
              disabled={loading}
              className="flex-1 bg-[#0d7a5f] text-white py-3 rounded-xl text-sm font-medium hover:bg-[#0a5f4a] transition disabled:opacity-40"
            >
              {loading ? "Génération en cours..." : "Lancer l'analyse →"}
            </button>
            <button
              onClick={() => setStep(2)}
              className="px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-500 hover:border-gray-300 transition"
            >
              Retour
            </button>
          </div>
        </div>
      )}

    </main>
  )
}