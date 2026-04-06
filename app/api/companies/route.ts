import { NextResponse } from "next/server"
import db from "../../db"

export async function GET() {
  const companies = db.prepare("SELECT * FROM Company").all()
  return NextResponse.json(companies)
}

export async function POST(request: Request) {
  const body = await request.json()

  // Vérifie si le SIREN existe déjà
  const existing = db.prepare(
    "SELECT * FROM Company WHERE siren = ?"
  ).get(body.siren) as any

  if (existing) {
    return NextResponse.json({ id: existing.id, message: "Entreprise déjà existante" })
  }

  const stmt = db.prepare(`
    INSERT INTO Company (siren, name, type, sector, naf_code, country, headcount, legal_form)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const result = stmt.run(
    body.siren,
    body.name,
    body.type,
    body.sector,
    body.naf_code,
    body.country ?? "France",
    body.headcount,
    body.legal_form
  )

  return NextResponse.json({ id: result.lastInsertRowid, message: "Entreprise créée" })
}
