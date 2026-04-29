import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const siren = request.nextUrl.searchParams.get("siren")
  if (!siren || siren.length !== 9) {
    return NextResponse.json({ error: "SIREN invalide" }, { status: 400 })
  }

  const BASE = "https://bodacc.fr/api/explore/v2.1/catalog/datasets/annonces-commerciales/records"
  const opts = { headers: { "Accept": "application/json" }, next: { revalidate: 3600 } }

  try {
    // Essai 1 : filtre sur le champ registre (champ SIREN en API v2.1)
    const res1 = await fetch(
      `${BASE}?where=registre%3D%22${siren}%22&limit=10&order_by=dateparution%20desc`,
      opts
    )
    if (res1.ok) {
      const data = await res1.json()
      if ((data.results ?? []).length > 0) return NextResponse.json(data)
    }

    // Essai 2 : recherche texte libre sur le SIREN
    const res2 = await fetch(
      `${BASE}?q=${siren}&limit=10&order_by=dateparution%20desc`,
      opts
    )
    if (!res2.ok) return NextResponse.json({ total_count: 0, results: [] })
    return NextResponse.json(await res2.json())
  } catch {
    return NextResponse.json({ total_count: 0, results: [] })
  }
}
