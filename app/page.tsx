import Dashboard from "./components/Dashboard"
import RatiosTable from "./components/RatiosTable"
import ESGPanel from "./components/ESGPanel"
export default function Home() {
  return (
    <div>
      <Dashboard />
      <div className="grid grid-cols-2 gap-6 px-8">
      <RatiosTable />
      <ESGPanel />
      </div>
    </div>
  )
}