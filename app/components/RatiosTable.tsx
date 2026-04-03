export default function RatiosTable() {
    return (
      <div className="bg-white rounded-xl border border-gray-100 mt-6">
  
        {/* En-tête du tableau */}
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-[#1a3a5c]">Ratios financiers</h2>
          <p className="text-sm text-gray-400 mt-1">Exercice N · PCG</p>
        </div>
  
        {/* Lignes du tableau */}
        <div className="divide-y divide-gray-50">
  
          <div className="flex items-center justify-between px-6 py-4">
            <p className="text-sm text-gray-600">Current ratio (liquidité)</p>
            <p className="text-sm font-medium text-[#1a3a5c]">1,8x</p>
          </div>
  
          <div className="flex items-center justify-between px-6 py-4">
            <p className="text-sm text-gray-600">Marge EBITDA</p>
            <p className="text-sm font-medium text-[#1a3a5c]">19,2%</p>
          </div>
  
          <div className="flex items-center justify-between px-6 py-4">
            <p className="text-sm text-gray-600">Gearing (endettement)</p>
            <p className="text-sm font-medium text-[#1a3a5c]">0,42</p>
          </div>
  
          <div className="flex items-center justify-between px-6 py-4">
            <p className="text-sm text-gray-600">ROCE</p>
            <p className="text-sm font-medium text-[#1a3a5c]">14,1%</p>
          </div>
  
          <div className="flex items-center justify-between px-6 py-4">
            <p className="text-sm text-gray-600">Taux de croissance CA</p>
            <p className="text-sm font-medium text-[#0d7a5f]">+11,4%</p>
          </div>
  
        </div>
      </div>
    )
  }