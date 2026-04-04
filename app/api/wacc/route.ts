import { NextResponse } from "next/server"
import db from "../../db"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const company_id = searchParams.get("company_id")
  const scenario = searchParams.get("scenario") ?? "base"

  const wacc = db.prepare(
    "SELECT * FROM WACCParameters WHERE company_id = ? AND scenario = ?"
  ).get(company_id, scenario)

  return NextResponse.json(wacc)
}

export async function POST(request: Request) {
  const body = await request.json()

  const stmt = db.prepare(`
    INSERT INTO WACCParameters 
    (company_id, beta_unlevered, beta_relevered, debt_equity_ratio, risk_free_rate, market_premium, size_premium, illiquidity_premium, ke, kd_gross, kd_net, wacc, scenario)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const result = stmt.run(
    body.company_id,
    body.beta_unlevered,
    body.beta_relevered,
    body.debt_equity_ratio,
    body.risk_free_rate,
    body.market_premium,
    body.size_premium,
    body.illiquidity_premium,
    body.ke,
    body.kd_gross,
    body.kd_net,
    body.wacc,
    body.scenario
  )

  return NextResponse.json({ id: result.lastInsertRowid, message: "WACC créé" })
}