export default function ESGPanel({ companyId }: { companyId?: string }) {
  const pillars = [
    { label: "Environnement", color: "bg-emerald-400" },
    { label: "Social",        color: "bg-blue-400" },
    { label: "Gouvernance",   color: "bg-violet-400" },
  ]

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mt-6">
      <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Score ESG</h2>
          <p className="text-xs text-slate-400 mt-0.5">Impact sur les FCF projetés</p>
        </div>
        <span className="text-[10px] font-medium text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100 uppercase tracking-wide">
          Non disponible
        </span>
      </div>

      <div className="p-6">
        {/* Score global */}
        <div className="flex items-center justify-center mb-6">
          <div className="relative w-24 h-24">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f1f5f9" strokeWidth="2.5" />
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="2.5"
                strokeDasharray="0 100" strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-slate-200">—</span>
              <span className="text-[10px] text-slate-300">/100</span>
            </div>
          </div>
        </div>

        {/* Barres */}
        <div className="space-y-3 mb-5">
          {pillars.map(p => (
            <div key={p.label} className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${p.color} opacity-30`} />
              <p className="text-sm text-slate-500 w-28">{p.label}</p>
              <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                <div className="bg-slate-200 h-1.5 rounded-full w-0" />
              </div>
              <p className="text-sm text-slate-300 w-5 text-right">—</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-center">
          <p className="text-xs text-slate-400 leading-relaxed">
            Données ESG non disponibles pour cette entreprise.
            <br />
            <span className="text-slate-300">Disponible dans une version ultérieure.</span>
          </p>
        </div>
      </div>
    </div>
  )
}
