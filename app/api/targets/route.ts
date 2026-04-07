import { NextResponse } from "next/server"
import db from "../../db"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get("email")

  const targets = email
    ? db.prepare("SELECT * FROM Target WHERE owner_email = ? ORDER BY createdAt DESC").all(email)
    : []

  return NextResponse.json(targets)
}

export async function POST(request: Request) {
  const body = await request.json()

  const existing = db.prepare(
    "SELECT id FROM Target WHERE siren = ? AND owner_email = ?"
  ).get(body.siren, body.owner_email ?? null)

  if (existing) {
    return NextResponse.json({ error: "Cible déjà dans votre sourcing" }, { status: 409 })
  }

  const result = db.prepare(`
    INSERT INTO Target (siren, name, sector, legal_form, naf_code, headcount, status, owner_email)
    VALUES (?, ?, ?, ?, ?, ?, 'prospect', ?)
  `).run(
    body.siren, body.name, body.sector ?? null,
    body.legal_form ?? null, body.naf_code ?? null,
    body.headcount ?? null, body.owner_email ?? null
  )

  return NextResponse.json({ id: result.lastInsertRowid })
}

export async function PATCH(request: Request) {
  const body = await request.json()

  db.prepare("UPDATE Target SET status = ?, note = ? WHERE id = ?")
    .run(body.status, body.note ?? null, body.id)

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")

  db.prepare("DELETE FROM Target WHERE id = ?").run(id)
  return NextResponse.json({ ok: true })
}
