import { NextResponse } from "next/server"
import db from "../../db"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get("email")

  const companies = email
    ? db.prepare("SELECT * FROM Company WHERE owner_email = ?").all(email)
    : db.prepare("SELECT * FROM Company").all()

  return NextResponse.json(companies)
}

export async function POST(request: Request) {
  const body = await request.json()

  // Vérifie si ce SIREN appartient déjà à cet utilisateur
  const existing = db.prepare(
    "SELECT * FROM Company WHERE siren = ? AND owner_email = ?"
  ).get(body.siren, body.owner_email ?? null) as any

  if (existing) {
    return NextResponse.json({ id: existing.id, message: "Entreprise déjà existante" })
  }

  const stmt = db.prepare(`
    INSERT INTO Company (siren, name, type, sector, naf_code, country, headcount, legal_form, owner_email)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const result = stmt.run(
    body.siren,
    body.name,
    body.type,
    body.sector,
    body.naf_code,
    body.country ?? "France",
    body.headcount,
    body.legal_form,
    body.owner_email ?? null
  )

  return NextResponse.json({ id: result.lastInsertRowid, message: "Entreprise créée" })
}
