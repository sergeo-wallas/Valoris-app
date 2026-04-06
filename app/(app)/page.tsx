import Dashboard from "../components/Dashboard"
import RatiosTable from "../components/RatiosTable"
import ESGPanel from "../components/ESGPanel"

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ company_id?: string }>
}) {
  const params = await searchParams
  const companyId = params.company_id ?? "1"

  return (
    <div>
      <Dashboard companyId={companyId} />
      <div className="grid grid-cols-2 gap-6 px-8">
        <RatiosTable companyId={companyId} />
        <ESGPanel />
      </div>
    </div>
  )
}