export default function ESGPanel({ companyId }: { companyId?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 mt-6">

      {/* En-tête */}
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-[#1a3a5c]">Score ESG</h2>
        <p className="text-sm text-gray-400 mt-1">Impact sur FCF projetés</p>
      </div>

      <div className="p-6">

        {/* Score global */}
        <p className="text-5xl font-semibold text-gray-300 text-center">—</p>
        <p className="text-xs text-gray-400 text-center mt-1">Score global / 100</p>

        {/* Barres E / S / G */}
        <div className="mt-6 flex flex-col gap-3">
          {["Environnement", "Social", "Gouvernance"].map(pillar => (
            <div key={pillar} className="flex items-center gap-3">
              <p className="text-sm text-gray-600 w-24">{pillar}</p>
              <div className="flex-1 bg-gray-100 rounded-full h-2">
                <div className="bg-gray-200 h-2 rounded-full w-0"/>
              </div>
              <p className="text-sm text-gray-300 w-6">—</p>
            </div>
          ))}
        </div>

        {/* Message */}
        <div className="bg-gray-50 rounded-lg p-4 mt-6">
          <p className="text-sm text-gray-400 text-center">
            Données ESG non disponibles pour cette entreprise.
          </p>
        </div>

      </div>
    </div>
  )
}