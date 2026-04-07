"use client"
import { createContext, useContext, useState, useEffect } from "react"

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

  useEffect(() => {
    const raw = localStorage.getItem("valoris_user")
    const email = raw ? JSON.parse(raw).email : null
    const url = email ? `/api/companies?email=${encodeURIComponent(email)}` : "/api/companies"
    fetch(url)
      .then(r => r.json())
      .then(data => {
        setCompanies(data)
        if (data.length > 0) setSelectedCompany(data[0])
      })
  }, [])

  return (
    <CompanyContext.Provider value={{ selectedCompany, setSelectedCompany, companies }}>
      {children}
    </CompanyContext.Provider>
  )
}

export function useCompany() {
  return useContext(CompanyContext)
}