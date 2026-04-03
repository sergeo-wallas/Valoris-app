export default function ESGPanel() {
    return (
      <div className="bg-white rounded-xl border border-gray-100 mt-6">
  
        {/* En-tête */}
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-[#1a3a5c]">Score ESG</h2>
          <p className="text-sm text-gray-400 mt-1">Impact sur FCF projetés</p>
        </div>
  
        <div className="p-6">
  
          {/* Score global */}
          <p className="text-5xl font-semibold text-[#0d7a5f] text-center">74</p>
          <p className="text-xs text-gray-400 text-center mt-1">Score global / 100</p>
  
          {/* Barres E / S / G */}
          <div className="mt-6 flex flex-col gap-3">
  
            <div className="flex items-center gap-3">
              <p className="text-sm text-gray-600 w-24">Environnement</p>
              <div className="flex-1 bg-gray-100 rounded-full h-2">
                <div className="bg-[#0d7a5f] h-2 rounded-full w-[68%]"></div>
              </div>
              <p className="text-sm text-gray-600 w-6">68</p>
            </div>
  
            <div className="flex items-center gap-3">
              <p className="text-sm text-gray-600 w-24">Social</p>
              <div className="flex-1 bg-gray-100 rounded-full h-2">
                <div className="bg-[#1a3a5c] h-2 rounded-full w-[81%]"></div>
              </div>
              <p className="text-sm text-gray-600 w-6">81</p>
            </div>
  
            <div className="flex items-center gap-3">
              <p className="text-sm text-gray-600 w-24">Gouvernance</p>
              <div className="flex-1 bg-gray-100 rounded-full h-2">
                <div className="bg-[#b45309] h-2 rounded-full w-[73%]"></div>
              </div>
              <p className="text-sm text-gray-600 w-6">73</p>
            </div>
  
          </div>
  
          {/* Impact sur FCF */}
          <div className="bg-[#e4f5f0] rounded-lg p-4 mt-6">
            <p className="text-sm text-[#0d7a5f]">
              <span className="font-medium">Impact valorisation :</span> le score ESG de 74/100 applique un multiplicateur de +3,2% sur les FCF projetés N+1 à N+5.
            </p>
          </div>
  
        </div>
      </div>
    )
  }