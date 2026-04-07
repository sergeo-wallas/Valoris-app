import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const siren = request.nextUrl.searchParams.get("siren")
  if (!siren || siren.length !== 9) {
    return NextResponse.json({ error: "SIREN invalide (9 chiffres requis)" }, { status: 400 })
  }

  try {
    const res = await fetch(
      `https://entreprise.data.gouv.fr/api/sirene/v3/unites_legales/${siren}`,
      {
        headers: { "Accept": "application/json" },
        next: { revalidate: 3600 },
      }
    )
    if (res.status === 404) {
      return NextResponse.json({ error: "SIREN non trouvé dans la base Sirene" }, { status: 404 })
    }
    if (!res.ok) {
      return NextResponse.json({ error: "Erreur API Sirene INSEE" }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Impossible de joindre l'API Sirene INSEE" }, { status: 503 })
  }
}
