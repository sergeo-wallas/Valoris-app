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

  // Vérifie si ce SIREN existe déjà (contrainte UNIQUE sur siren)
  const existing = db.prepare(
    "SELECT * FROM Company WHERE siren = ?"
  ).get(body.siren) as any

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

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id manquant" }, { status: 400 })

  // Supprime en cascade toutes les données liées
  db.prepare("DELETE FROM FinancialStatement WHERE company_id = ?").run(id)
  db.prepare("DELETE FROM WACCParameters    WHERE company_id = ?").run(id)
  db.prepare("DELETE FROM DCFModel          WHERE company_id = ?").run(id)
  db.prepare("DELETE FROM ESGCriteria       WHERE company_id = ?").run(id)
  db.prepare("DELETE FROM Company           WHERE id = ?").run(id)

  return NextResponse.json({ message: "Analyse supprimée" })
}
