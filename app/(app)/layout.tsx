import Sidebar from "../components/Sidebar"
import { CompanyProvider } from "../context/CompanyContext"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <CompanyProvider>
      <div className="flex">
        <Sidebar />
        {children}
      </div>
    </CompanyProvider>
  )
}