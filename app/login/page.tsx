"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [profile, setProfile] = useState("entrepreneur")
  const router = useRouter()

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    localStorage.setItem("valoris_user", JSON.stringify({ email, profile }))
    router.push("/workspace")
  }

  const profiles = [
    { id: "entrepreneur", label: "Entrepreneur", desc: "Valorisez votre entreprise" },
    { id: "investisseur", label: "Investisseur M&A", desc: "Analysez vos cibles" },
    { id: "expert", label: "Expert-comptable", desc: "Conseillez vos clients" },
  ]

  return (
    <div className="min-h-screen bg-[#0f2a45] flex">

      {/* LEFT — Branding */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-12">
        <div>
          <h1 className="text-white text-3xl font-serif mb-2">Valoris</h1>
          <p className="text-white/40 text-sm">Valorisation · M&A · PME non cotées</p>
        </div>
        <div>
          <p className="text-white/70 text-2xl font-serif leading-relaxed mb-6">
            "La vraie valeur d'une entreprise ne se lit pas dans ses chiffres — elle se calcule."
          </p>
          <div className="flex gap-8">
            <div>
              <p className="text-white text-2xl font-bold">DCF</p>
              <p className="text-white/40 text-xs">Moteur de valorisation</p>
            </div>
            <div>
              <p className="text-white text-2xl font-bold">ESG</p>
              <p className="text-white/40 text-xs">Impact sur les FCF</p>
            </div>
            <div>
              <p className="text-white text-2xl font-bold">3</p>
              <p className="text-white/40 text-xs">Scénarios WACC</p>
            </div>
          </div>
        </div>
        <p className="text-white/20 text-xs">© 2026 Valoris · Tous droits réservés</p>
      </div>

      {/* RIGHT — Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">

          <div className="mb-8">
            <h2 className="text-2xl font-serif text-[#1a3a5c] mb-1">Bon retour</h2>
            <p className="text-gray-400 text-sm">Connectez-vous à votre espace Valoris</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block uppercase tracking-wide">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="vous@cabinet.fr"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 outline-none focus:border-[#1a3a5c] focus:ring-2 focus:ring-[#1a3a5c]/10 transition bg-white"
                required
              />
            </div>

            <div>
              <div className="flex justify-between mb-1.5">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
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
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 outline-none focus:border-[#1a3a5c] focus:ring-2 focus:ring-[#1a3a5c]/10 transition bg-white"
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-2 block uppercase tracking-wide">
                Votre profil
              </label>
              <div className="grid grid-cols-3 gap-2">
                {profiles.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setProfile(p.id)}
                    className={`py-3 px-3 rounded-xl text-left border transition ${
                      profile === p.id
                        ? "bg-[#1a3a5c] text-white border-[#1a3a5c]"
                        : "bg-white text-gray-600 border-gray-200 hover:border-[#1a3a5c]/30"
                    }`}
                  >
                    <p className="text-xs font-semibold mb-0.5">{p.label}</p>
                    <p className={`text-xs ${profile === p.id ? "text-white/60" : "text-gray-400"}`}>
                      {p.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-[#1a3a5c] text-white py-3.5 rounded-xl text-sm font-medium hover:bg-[#0f2a45] transition mt-2"
            >
              Se connecter →
            </button>

          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-gray-200"/>
            <p className="text-xs text-gray-400">ou</p>
            <div className="flex-1 h-px bg-gray-200"/>
          </div>

          <p className="text-center text-xs text-gray-400">
            Pas encore de compte ?{" "}
            <span className="text-[#1a3a5c] font-medium cursor-pointer hover:underline">
              Demander un accès
            </span>
          </p>

        </div>
      </div>
    </div>
  )
}