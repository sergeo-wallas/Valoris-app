export default function Sidebar() {
    return (
      <aside className="w-56 h-screen bg-[#1a3a5c] flex flex-col">
        <div className="p-6 border-b border-white/10">
  <h1 className="text-white text-xl font-semibold">Valoris</h1>
  <p className="text-white/40 text-xs mt-1">Valorisation · M&A</p>
</div>
<nav className="flex-1 p-3">
  <p className="text-white/30 text-xs px-2 py-2">Workspace</p>
  
  <a href="#" className="flex items-center px-3 py-2 rounded-lg bg-white/15 text-white text-sm mb-1">
    Dashboard
  </a>
  
  <a href="#" className="flex items-center px-3 py-2 rounded-lg text-white/60 text-sm mb-1">
    États financiers
  </a>
  
  <a href="#" className="flex items-center px-3 py-2 rounded-lg text-white/60 text-sm mb-1">
    Valorisation
  </a>
</nav>
<div className="p-4 border-t border-white/10">
  <div className="flex items-center gap-3">
    
    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs">
      JD
    </div>
    
    <div>
      <p className="text-white text-sm font-medium">Serge Onana</p>
      <p className="text-white/40 text-xs">Entrepreneur</p>
    </div>
    
  </div>
</div>
      </aside>
    )
  }