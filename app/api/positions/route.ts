import { NextResponse } from "next/server"
import db from "../../db"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get("email")

  const positions = email
    ? db.prepare("SELECT * FROM Position WHERE owner_email = ? ORDER BY date_entree DESC").all(email)
    : []

  return NextResponse.json(positions)
}

export async function POST(request: Request) {
  const body = await request.json()

  const result = db.prepare(`
    INSERT INTO Position (name, sector, date_entree, date_sortie, mise, valeur, statut, note, owner_email)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    body.name, body.sector ?? null,
    body.date_entree, body.date_sortie ?? null,
    body.mise, body.valeur ?? null,
    body.statut ?? "actif",
    body.note ?? null, body.owner_email ?? null
  )

  return NextResponse.json({ id: result.lastInsertRowid })
}

export async function PATCH(request: Request) {
  const body = await request.json()

  db.prepare(`
    UPDATE Position SET name=?, sector=?, date_sortie=?, valeur=?, statut=?, note=? WHERE id=?
  `).run(body.name, body.sector ?? null, body.date_sortie ?? null,
    body.valeur ?? null, body.statut, body.note ?? null, body.id)

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  db.prepare("DELETE FROM Position WHERE id = ?").run(id)
  return NextResponse.json({ ok: true })
}
