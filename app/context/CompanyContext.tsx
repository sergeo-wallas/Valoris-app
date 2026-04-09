"use client"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"

interface Company {
  id: number
  siren: string
  name: string
  sector: string
  legal_form: string
}

interface CompanyContextType {
  selectedCompany: Company | null
  setSelectedCompany: (company: Company) => void
  companies: Company[]
}

const CompanyContext = createContext<CompanyContextType>({
  selectedCompany: null,
  setSelectedCompany: () => {},
  companies: []
})

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const searchParams = useSearchParams()

  // Charge les entreprises au montage
  useEffect(() => {
    const raw = localStorage.getItem("valoris_user")
    const email = raw ? JSON.parse(raw).email : null
    const url = email ? `/api/companies?email=${encodeURIComponent(email)}` : "/api/companies"
    fetch(url)
      .then(r => r.json())
      .then(data => setCompanies(data))
  }, [])

  // Sélectionne la bonne entreprise dès que l'URL ou la liste change
  useEffect(() => {
    if (companies.length === 0) return
    const idFromUrl = searchParams.get("company_id")
    if (idFromUrl) {
      const found = companies.find(c => c.id === parseInt(idFromUrl))
      if (found) { setSelectedCompany(found); return }
    }
    // Pas de company_id dans l'URL → garde la sélection actuelle ou prend la première
    setSelectedCompany(prev => prev ?? companies[0])
  }, [companies, searchParams])

  return (
    <CompanyContext.Provider value={{ selectedCompany, setSelectedCompany, companies }}>
      {children}
    </CompanyContext.Provider>
  )
}

export function useCompany() {
  return useContext(CompanyContext)
}