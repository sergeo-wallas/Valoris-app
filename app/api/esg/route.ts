import { NextResponse } from "next/server"
import db from "../../db"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const company_id = searchParams.get("company_id")
  const fiscal_year = searchParams.get("fiscal_year") ?? new Date().getFullYear()

  if (!company_id) return NextResponse.json([])

  const rows = db.prepare(
    "SELECT * FROM ESGCriteria WHERE company_id = ? AND fiscal_year = ? ORDER BY id"
  ).all(company_id, fiscal_year)

  return NextResponse.json(rows)
}

export async function POST(request: Request) {
  const body = await request.json()

  db.prepare(`
    INSERT INTO ESGCriteria
      (company_id, fiscal_year, pillar, criterion_code, criterion_name, score, max_score, is_risk)
    VALUES (?, ?, ?, ?, ?, ?, 2, ?)
    ON CONFLICT(company_id, fiscal_year, criterion_code) DO UPDATE SET
      score          = excluded.score,
      criterion_name = excluded.criterion_name,
      is_risk        = excluded.is_risk
  `).run(
    body.company_id,
    body.fiscal_year,
    body.pillar,
    body.criterion_code,
    body.criterion_name,
    body.score ?? 0,
    body.is_risk ?? 0
  )

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id manquant" }, { status: 400 })

  db.prepare("DELETE FROM ESGCriteria WHERE id = ?").run(id)
  return NextResponse.json({ ok: true })
}
