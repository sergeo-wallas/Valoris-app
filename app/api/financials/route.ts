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
    (company_id, fiscal_year, revenue, gross_margin, ebitda, ebit, net_income, tax_rate,
     total_assets, fixed_assets, current_assets, equity, net_debt,
     stocks, accounts_receivable, accounts_payable, working_capital,
     sga, fr, capex, delta_wc, fcf,
     dso, dpo, dio, roic, roe, roa, interest_coverage, cash_conversion, capex_intensity)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const result = stmt.run(
    body.company_id,
    body.fiscal_year,
    body.revenue        ?? null,
    body.gross_margin   ?? null,
    body.ebitda         ?? null,
    body.ebit           ?? null,
    body.net_income     ?? null,
    body.tax_rate       ?? 0.25,
    body.total_assets   ?? null,
    body.fixed_assets   ?? null,
    body.current_assets ?? null,
    body.equity         ?? null,
    body.net_debt       ?? null,
    body.stocks              ?? null,
    body.accounts_receivable ?? null,
    body.accounts_payable    ?? null,
    body.working_capital     ?? null,
    body.sga            ?? null,
    body.fr             ?? null,
    body.capex          ?? null,
    body.delta_wc       ?? null,
    body.fcf            ?? null,
    body.dso            ?? null,
    body.dpo            ?? null,
    body.dio            ?? null,
    body.roic           ?? null,
    body.roe            ?? null,
    body.roa            ?? null,
    body.interest_coverage  ?? null,
    body.cash_conversion    ?? null,
    body.capex_intensity    ?? null
  )

  return NextResponse.json({ id: result.lastInsertRowid, message: "État financier créé" })
}