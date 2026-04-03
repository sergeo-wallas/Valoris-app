export default function Dashboard() {
    return (
      <main className="flex-1 bg-gray-50 p-8">
  
        {/* Titre de la page */}
        <h1 className="text-2xl font-semibold text-[#1a3a5c]">Dashboard</h1>
        <p className="text-gray-400 mt-1 mb-8">Groupe Leblanc SAS</p>
        {/* Card principale — valeur médiane */}
<div className="bg-white rounded-xl p-6 border border-gray-100 mb-6">
  <p className="text-sm text-gray-400 mb-1">Valeur d'entreprise estimée</p>
  <p className="text-4xl font-semibold text-[#1a3a5c]">6,8 M€</p>
  <p className="text-sm text-gray-400 mt-2">médiane pondérée · fourchette 5,2 M€ — 8,9 M€</p>
</div>
  
        {/* Grille de 3 cards côte à côte */}
        <div className="grid grid-cols-3 gap-4">
  
          {/* Card 1 */}
          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <p className="text-sm text-gray-400">DCF</p>
            <p className="text-2xl font-semibold text-[#1a3a5c] mt-2">6,4 M€</p>
            <p className="text-xs text-gray-400 mt-1">WACC 9,2% · g 2,5%</p>
          </div>
  
          {/* Card 2 */}
          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <p className="text-sm text-gray-400">Multiples</p>
            <p className="text-2xl font-semibold text-[#1a3a5c] mt-2">7,1 M€</p>
            <p className="text-xs text-gray-400 mt-1">EV/EBITDA x4,4</p>
          </div>
  
          {/* Card 3 */}
          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <p className="text-sm text-gray-400">Comparables</p>
            <p className="text-2xl font-semibold text-[#1a3a5c] mt-2">6,9 M€</p>
            <p className="text-xs text-gray-400 mt-1">12 pairs · médiane</p>
          </div>
  
        </div>
  
      </main>
    )
  }