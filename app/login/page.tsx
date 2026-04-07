"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { TrendingUp, ArrowRight } from "lucide-react"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [profile, setProfile] = useState("entrepreneur")
  const router = useRouter()

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    localStorage.setItem("valoris_user", JSON.stringify({ email, profile }))
    document.cookie = `valoris_email=${encodeURIComponent(email)}; path=/; max-age=${60 * 60 * 24 * 365}`
    router.push("/workspace")
  }

  const profiles = [
    {
      id: "entrepreneur",
      label: "Entrepreneur",
      desc: "Valorisez votre entreprise",
      color: "bg-emerald-500",
    },
    {
      id: "investisseur",
      label: "Investisseur M&A",
      desc: "Analysez vos cibles",
      color: "bg-amber-500",
    },
    {
      id: "expert",
      label: "Expert-comptable",
      desc: "Conseillez vos clients",
      color: "bg-violet-500",
    },
  ]

  return (
    <div className="min-h-screen bg-[#0a1929] flex">

      {/* LEFT — Branding */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-14 relative overflow-hidden">

        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0c1f35] via-[#0f2a45] to-[#0a1929] pointer-events-none" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#0d7a5f]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#1a3a5c]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0d7a5f] to-[#0a5040] flex items-center justify-center shadow-lg">
              <TrendingUp size={16} className="text-white" />
            </div>
            <h1 className="text-white text-xl font-semibold tracking-wide">Valoris</h1>
          </div>
          <p className="text-white/30 text-xs ml-10">Valorisation · M&A · PME non cotées</p>
        </div>

        <div className="relative z-10">
          <p className="text-white/70 text-2xl font-serif leading-relaxed mb-10 max-w-sm">
            "La vraie valeur d'une entreprise ne se lit pas dans ses chiffres — elle se calcule."
          </p>

          <div className="flex gap-8">
            {[
              { label: "DCF", sub: "Moteur de valorisation" },
              { label: "ESG", sub: "Impact sur les FCF" },
              { label: "3",   sub: "Scénarios WACC" },
            ].map(item => (
              <div key={item.label}>
                <p className="text-white text-2xl font-bold">{item.label}</p>
                <p className="text-white/30 text-xs mt-0.5">{item.sub}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/15 text-xs relative z-10">© 2026 Valoris · Tous droits réservés</p>
      </div>

      {/* RIGHT — Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">

          <div className="mb-8">
            <h2 className="text-2xl font-serif text-slate-900 mb-1">Bon retour</h2>
            <p className="text-slate-400 text-sm">Connectez-vous à votre espace Valoris</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">

            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 block">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="vous@cabinet.fr"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#1a3a5c] focus:ring-2 focus:ring-[#1a3a5c]/8 transition-all bg-slate-50 focus:bg-white"
                required
              />
            </div>

            <div>
              <div className="flex justify-between mb-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                  Mot de passe
                </label>
                <span className="text-xs text-[#1a3a5c] cursor-pointer hover:underline">
                  Mot de passe oublié ?
                </span>
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#1a3a5c] focus:ring-2 focus:ring-[#1a3a5c]/8 transition-all bg-slate-50 focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2.5 block">
                Votre profil
              </label>
              <div className="grid grid-cols-3 gap-2">
                {profiles.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setProfile(p.id)}
                    className={`py-3 px-3 rounded-xl text-left border transition-all ${
                      profile === p.id
                        ? "bg-[#0c1f35] text-white border-[#0c1f35] shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${p.color} mb-2 ${profile !== p.id ? "opacity-40" : ""}`} />
                    <p className="text-xs font-semibold mb-0.5">{p.label}</p>
                    <p className={`text-[10px] leading-tight ${profile === p.id ? "text-white/50" : "text-slate-400"}`}>
                      {p.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-[#0c1f35] text-white py-3.5 rounded-xl text-sm font-medium hover:bg-[#1a3a5c] transition-all shadow-sm hover:shadow-md mt-2"
            >
              Se connecter
              <ArrowRight size={15} />
            </button>

          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-slate-100" />
            <p className="text-xs text-slate-300">ou</p>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          <p className="text-center text-xs text-slate-400">
            Pas encore de compte ?{" "}
            <span className="text-[#1a3a5c] font-semibold cursor-pointer hover:underline">
              Demander un accès
            </span>
          </p>

        </div>
      </div>
    </div>
  )
}
