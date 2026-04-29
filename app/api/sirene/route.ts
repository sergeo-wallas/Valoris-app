import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const siren = request.nextUrl.searchParams.get("siren")
  if (!siren || siren.length !== 9) {
    return NextResponse.json({ error: "SIREN invalide (9 chiffres requis)" }, { status: 400 })
  }

  try {
    const res = await fetch(
      `https://recherche-entreprises.api.gouv.fr/search?q=${siren}&page=1&per_page=1`,
      { headers: { "Accept": "application/json" }, next: { revalidate: 3600 } }
    )
    if (!res.ok) {
      return NextResponse.json({ error: "Erreur API Annuaire Entreprises" }, { status: res.status })
    }
    const data = await res.json()
    const result = data.results?.[0] ?? null
    if (!result) {
      return NextResponse.json({ error: "SIREN non trouvé" }, { status: 404 })
    }
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: "Impossible de joindre l'API Annuaire Entreprises" }, { status: 503 })
  }
}
