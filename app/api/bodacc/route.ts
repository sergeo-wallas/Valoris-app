import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const siren = request.nextUrl.searchParams.get("siren")
  if (!siren || siren.length !== 9) {
    return NextResponse.json({ error: "SIREN invalide" }, { status: 400 })
  }

  try {
    // API BODACC via Open Data Soft (données officielles du Journal Officiel)
    const url = `https://bodacc.fr/api/explore/v2.1/catalog/datasets/annonces-commerciales/records?where=siren%3D%22${siren}%22&limit=10&order_by=dateparution%20desc`

    const res = await fetch(url, {
      headers: { "Accept": "application/json" },
      next: { revalidate: 3600 },
    })

    if (!res.ok) {
      // Fallback: recherche texte libre
      const fallback = await fetch(
        `https://bodacc.fr/api/explore/v2.1/catalog/datasets/annonces-commerciales/records?q=${siren}&limit=10&order_by=dateparution%20desc`,
        { headers: { "Accept": "application/json" }, next: { revalidate: 3600 } }
      )
      if (!fallback.ok) {
        return NextResponse.json({ total_count: 0, results: [] })
      }
      const data = await fallback.json()
      return NextResponse.json(data)
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ total_count: 0, results: [] })
  }
}
