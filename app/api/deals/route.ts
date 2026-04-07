import { NextResponse } from "next/server"
import db from "../../db"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get("email")

  const deals = email
    ? db.prepare("SELECT * FROM Deal WHERE owner_email = ? ORDER BY createdAt DESC").all(email)
    : []

  return NextResponse.json(deals)
}

export async function POST(request: Request) {
  const body = await request.json()

  const result = db.prepare(`
    INSERT INTO Deal (name, siren, sector, stage, ev_cible, note, owner_email)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    body.name,
    body.siren ?? null,
    body.sector ?? null,
    body.stage ?? "analyse",
    body.ev_cible ?? null,
    body.note ?? null,
    body.owner_email ?? null
  )

  return NextResponse.json({ id: result.lastInsertRowid })
}

export async function PATCH(request: Request) {
  const body = await request.json()

  db.prepare("UPDATE Deal SET stage = ?, ev_cible = ?, note = ? WHERE id = ?")
    .run(body.stage, body.ev_cible ?? null, body.note ?? null, body.id)

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")

  db.prepare("DELETE FROM Deal WHERE id = ?").run(id)
  return NextResponse.json({ ok: true })
}
