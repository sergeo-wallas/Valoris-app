"use client"
import { usePathname } from "next/navigation"
import { useCompany } from "../context/CompanyContext"

export default function Sidebar() {
  const pathname = usePathname()
  const { companies, selectedCompany, setSelectedCompany } = useCompany()

  const links = [
    { href: "/", label: "Dashboard" },
    { href: "/etats-financiers", label: "États financiers" },
    { href: "/valorisation", label: "Valorisation" },
  ]

  return (
    <aside className="w-56 h-screen bg-[#1a3a5c] flex flex-col">
      <div className="p-6 border-b border-white/10">
        <h1 className="text-white text-xl font-semibold">Valoris</h1>
        <p className="text-white/40 text-xs mt-1">Valorisation · M&A</p>
      </div>

      {/* Sélecteur entreprise */}
      <div className="p-3 border-b border-white/10">
        <p className="text-white/30 text-xs px-2 mb-2">Entreprise</p>
        <select
          value={selectedCompany?.id ?? ""}
          onChange={e => {
            const company = companies.find(c => c.id === parseInt(e.target.value))
            if (company) {
              setSelectedCompany(company)
              window.location.href = `${window.location.pathname}?company_id=${company.id}`
            }
          }}
          className="w-full bg-white/10 text-white text-xs rounded-lg px-3 py-2 border border-white/20 outline-none cursor-pointer"
        >
          {companies.map(c => (
            <option key={c.id} value={c.id} className="bg-[#1a3a5c]">
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <nav className="flex-1 p-3">
        <p className="text-white/30 text-xs px-2 py-2">Workspace</p>
        {links.map(link => (
          
            <a key={link.href}
            href={link.href}
            className={`flex items-center px-3 py-2 rounded-lg text-sm mb-1 ${
              pathname === link.href
                ? "bg-white/15 text-white"
                : "text-white/60 hover:text-white hover:bg-white/10"
            }`}
          >
            {link.label}
          </a>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs">
            N
          </div>
          <div>
            <p className="text-white text-sm font-medium">Serge Onana</p>
            <p className="text-white/40 text-xs">Entrepreneur</p>
          </div>
        </div>
      </div>
    </aside>
  )
}