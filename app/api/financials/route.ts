import { NextResponse } from "next/server"
import db from "../../db"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const company_id = searchParams.get("company_id")
  
  const financials = db.prepare(
    "SELECT * FROM FinancialStatement WHERE company_id = ? ORDER BY fiscal_year DESC"
  ).all(company_id)
  
  return NextResponse.json(financials)
}

export async function POST(request: Request) {
  const body = await request.json()
  
  const stmt = db.prepare(`
    INSERT INTO FinancialStatement 
    (company_id, fiscal_year, revenue, gross_margin, ebitda, ebit, net_income, tax_rate, equity, net_debt, working_capital, capex, delta_wc, fcf)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  
  const result = stmt.run(
    body.company_id,
    body.fiscal_year,
    body.revenue,
    body.gross_margin,
    body.ebitda,
    body.ebit,
    body.net_income,
    body.tax_rate ?? 0.25,
    body.equity,
    body.net_debt,
    body.working_capital,
    body.capex,
    body.delta_wc,
    body.fcf
  )
  
  return NextResponse.json({ id: result.lastInsertRowid, message: "État financier créé" })
}