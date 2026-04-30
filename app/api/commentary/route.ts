import { NextRequest, NextResponse } from "next/server"
import db from "../../db"

export async function GET(request: NextRequest) {
  const company_id = request.nextUrl.searchParams.get("company_id")
  if (!company_id) return NextResponse.json({ commentary: "" })
  const row = db.prepare("SELECT commentary FROM Company WHERE id = ?").get(company_id) as any
  return NextResponse.json({ commentary: row?.commentary ?? "" })
}

export async function PATCH(request: NextRequest) {
  const { company_id, commentary } = await request.json()
  if (!company_id) return NextResponse.json({ error: "company_id requis" }, { status: 400 })
  db.prepare("UPDATE Company SET commentary = ? WHERE id = ?").run(commentary, company_id)
  return NextResponse.json({ ok: true })
}
