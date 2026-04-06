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
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-[#1a3a5c] flex items-center justify-center p-8">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-2">Valoris</h1>
          <p className="text-white/50 text-sm">Valorisation · M&A · PME non cotées</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-8 shadow-xl">
          <h2 className="text-xl font-semibold text-[#1a3a5c] mb-1">Connexion</h2>
          <p className="text-gray-400 text-sm mb-6">Accédez à votre espace de valorisation</p>

          <form onSubmit={handleLogin} className="space-y-4">

            {/* Email */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="serge@valoris.fr"
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-800 outline-none focus:border-[#1a3a5c] transition"
                required
              />
            </div>

            {/* Mot de passe */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-800 outline-none focus:border-[#1a3a5c] transition"
                required
              />
            </div>

            {/* Profil */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-2 block">Votre profil</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "entrepreneur", label: "Entrepreneur" },
                  { id: "investisseur", label: "Investisseur" },
                  { id: "expert", label: "Expert-comptable" },
                ].map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setProfile(p.id)}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border transition ${
                      profile === p.id
                        ? "bg-[#1a3a5c] text-white border-[#1a3a5c]"
                        : "bg-white text-gray-500 border-gray-200 hover:border-[#1a3a5c]"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full bg-[#1a3a5c] text-white py-3 rounded-lg text-sm font-medium hover:bg-[#0f2a45] transition mt-2"
            >
              Se connecter
            </button>

          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            Pas encore de compte ?{" "}
            <span className="text-[#1a3a5c] font-medium cursor-pointer hover:underline">
              Contactez-nous
            </span>
          </p>
        </div>

        <p className="text-center text-white/30 text-xs mt-6">
          © 2026 Valoris · Tous droits réservés
        </p>
      </div>
    </div>
  )
}