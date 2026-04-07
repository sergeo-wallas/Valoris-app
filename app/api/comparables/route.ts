import { NextResponse } from "next/server"
import db from "../../db"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get("email")

  const comparables = email
    ? db.prepare("SELECT * FROM Comparable WHERE owner_email = ? ORDER BY createdAt DESC").all(email)
    : []

  return NextResponse.json(comparables)
}

export async function POST(request: Request) {
  const body = await request.json()

  const result = db.prepare(`
    INSERT INTO Comparable (name, sector, ev_ebitda, ev_revenue, pe, ev_ebit, note, owner_email)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    body.name, body.sector ?? null,
    body.ev_ebitda ?? null, body.ev_revenue ?? null,
    body.pe ?? null, body.ev_ebit ?? null,
    body.note ?? null, body.owner_email ?? null
  )

  return NextResponse.json({ id: result.lastInsertRowid })
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  db.prepare("DELETE FROM Comparable WHERE id = ?").run(id)
  return NextResponse.json({ ok: true })
}
