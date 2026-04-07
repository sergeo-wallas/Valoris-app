"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Sidebar from "../components/Sidebar"
import { CompanyProvider } from "../context/CompanyContext"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()

  useEffect(() => {
    const user = localStorage.getItem("valoris_user")
    if (!user) {
      router.push("/login")
    }
  }, [router])

  return (
    <CompanyProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </CompanyProvider>
  )
}