"use client"
import { usePathname, useRouter } from "next/navigation"
import { useCompany } from "../context/CompanyContext"
import { useEffect, useState } from "react"
import {
  LayoutGrid, Home, BarChart2, TrendingUp,
  LogOut, ChevronDown, Building2, Settings,
  Radar, GitMerge, Layers, Percent, Scale
} from "lucide-react"
import SettingsPanel from "./SettingsPanel"

type UserProfile = {
  email: string
  profile: "entrepreneur" | "investisseur" | "expert"
}

type NavLink = { href: string; label: string; icon: any }
type NavSection = { title: string; links: NavLink[] }

const PROFILE_CONFIG: Record<string, {
  label: string
  badge: string
  sections: NavSection[]
}> = {
  entrepreneur: {
    label: "Entrepreneur",
    badge: "bg-emerald-500",
    sections: [
      {
        title: "Navigation",
        links: [
          { href: "/workspace",        label: "Workspace",        icon: LayoutGrid },
          { href: "/",                 label: "Dashboard",        icon: Home },
          { href: "/valorisation",     label: "Valorisation",     icon: TrendingUp },
          { href: "/etats-financiers", label: "États financiers", icon: BarChart2 },
        ],
      },
    ],
  },
  investisseur: {
    label: "Investisseur M&A",
    badge: "bg-amber-500",
    sections: [
      {
        title: "Navigation",
        links: [
          { href: "/workspace", label: "Workspace", icon: LayoutGrid },
          { href: "/",          label: "Dashboard",  icon: Home },
        ],
      },
      {
        title: "Deal Flow",
        links: [
          { href: "/sourcing",  label: "Sourcing",  icon: Radar },
          { href: "/pipeline",  label: "Pipeline",  icon: GitMerge },
        ],
      },
      {
        title: "Analyse",
        links: [
          { href: "/etats-financiers", label: "États financiers", icon: BarChart2 },
          { href: "/valorisation",     label: "Valorisation",     icon: TrendingUp },
          { href: "/comparables",      label: "Comparables",      icon: Layers },
        ],
      },
      {
        title: "Investissement",
        links: [
          { href: "/structuration", label: "Structuration", icon: Scale },
          { href: "/rendement",     label: "Rendement",     icon: Percent },
        ],
      },
    ],
  },
  expert: {
    label: "Expert-comptable",
    badge: "bg-violet-500",
    sections: [
      {
        title: "Navigation",
        links: [
          { href: "/workspace",        label: "Workspace",        icon: LayoutGrid },
          { href: "/",                 label: "Dashboard",        icon: Home },
          { href: "/etats-financiers", label: "États financiers", icon: BarChart2 },
          { href: "/valorisation",     label: "Valorisation",     icon: TrendingUp },
        ],
      },
    ],
  },
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { companies, selectedCompany, setSelectedCompany } = useCompany()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem("valoris_user")
    if (raw) setUser(JSON.parse(raw))
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const companyId = params.get("company_id")
      if (companyId && companies.length > 0) {
        const company = companies.find(c => c.id === parseInt(companyId))
        if (company) setSelectedCompany(company)
      }
    }
  }, [companies])

  const handleLogout = () => {
    localStorage.removeItem("valoris_user")
    router.push("/login")
  }

  const profile = (user?.profile ?? "entrepreneur") as keyof typeof PROFILE_CONFIG
  const config = PROFILE_CONFIG[profile] ?? PROFILE_CONFIG.entrepreneur
  const initials = user?.email ? user.email[0].toUpperCase() : "?"
  const displayName = user?.email?.split("@")[0] ?? "Utilisateur"

  return (
    <>
    {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    <aside className="w-60 h-screen bg-[#0c1f35] flex flex-col border-r border-white/5">

      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#0d7a5f] to-[#0a5f4a] flex items-center justify-center">
            <TrendingUp size={14} className="text-white" />
          </div>
          <div>
            <h1 className="text-white text-sm font-semibold tracking-wide">Valoris</h1>
            <p className="text-white/30 text-[10px] leading-none mt-0.5">Valorisation · M&A</p>
          </div>
        </div>
      </div>

      {/* Sélecteur entreprise */}
      <div className="px-3 py-3 border-b border-white/5">
        <p className="text-white/25 text-[10px] uppercase tracking-widest px-2 mb-1.5">Entreprise</p>
        <div className="relative">
          <Building2 size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
          <select
            value={selectedCompany?.id ?? ""}
            onChange={e => {
              const company = companies.find(c => c.id === parseInt(e.target.value))
              if (company) {
                setSelectedCompany(company)
                window.location.href = `/?company_id=${company.id}`
              }
            }}
            className="w-full bg-white/5 text-white text-xs rounded-lg pl-8 pr-7 py-2.5 border border-white/10 outline-none cursor-pointer appearance-none hover:bg-white/8 transition-colors"
          >
            {companies.map(c => (
              <option key={c.id} value={c.id} className="bg-[#0c1f35]">
                {c.name}
              </option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
        {config.sections.map(section => (
          <div key={section.title}>
            <p className="text-white/25 text-[10px] uppercase tracking-widest px-2 mb-1.5">{section.title}</p>
            <div className="space-y-0.5">
              {section.links.map(link => {
                const Icon = link.icon
                const isActive = pathname === link.href || pathname === link.href.split("?")[0]
                const href = selectedCompany && link.href !== "/workspace" && link.href !== "/analyse"
                  ? `${link.href}?company_id=${selectedCompany.id}`
                  : link.href
                return (
                  <a
                    key={link.href}
                    href={href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 group ${
                      isActive
                        ? "bg-white/10 text-white"
                        : "text-white/45 hover:text-white/80 hover:bg-white/5"
                    }`}
                  >
                    <Icon
                      size={15}
                      className={`flex-shrink-0 transition-colors ${isActive ? "text-[#0d7a5f]" : "text-white/30 group-hover:text-white/60"}`}
                    />
                    <span className="font-medium text-[13px]">{link.label}</span>
                    {isActive && (
                      <div className="ml-auto w-1 h-1 rounded-full bg-[#0d7a5f]" />
                    )}
                  </a>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Profil + Déconnexion */}
      <div className="px-3 py-3 border-t border-white/5">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg mb-1">
          <div className={`w-8 h-8 rounded-lg ${config.badge} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-[13px] font-medium truncate">{displayName}</p>
            <p className="text-white/35 text-[11px] truncate">{config.label}</p>
          </div>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-white/35 hover:text-white/70 hover:bg-white/5 transition-all duration-150 text-[12px]"
        >
          <Settings size={13} />
          <span>Réglages</span>
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-white/35 hover:text-white/70 hover:bg-white/5 transition-all duration-150 text-[12px]"
        >
          <LogOut size={13} />
          <span>Déconnexion</span>
        </button>
      </div>

    </aside>
    </>
  )
}
