export default function Loading() {
  return (
    <div className="h-full bg-[#f4f7fb] p-8 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-[#1a3a5c] border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Chargement…</p>
      </div>
    </div>
  )
}
