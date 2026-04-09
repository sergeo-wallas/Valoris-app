import { NextResponse } from "next/server"
import db from "../../db"

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const company_id = searchParams.get("company_id")
    const scenario = searchParams.get("scenario") ?? "base"
  
    const wacc = db.prepare(
      "SELECT * FROM WACCParameters WHERE company_id = ? AND scenario = ?"
    ).get(company_id, scenario)
  
    // Si pas de WACC pour cette entreprise, retourne des valeurs par défaut
    if (!wacc) {
      return NextResponse.json({
        company_id: parseInt(company_id ?? "1"),
        wacc: 0.095,
        scenario: scenario,
        beta_unlevered: 0.74,
        beta_relevered: 1.90,
        debt_equity_ratio: 2.07,
        risk_free_rate: 0.035,
        market_premium: 0.06,
        size_premium: 0.03,
        illiquidity_premium: 0.025,
        ke: 0.20,
        kd_gross: 0.057,
        kd_net: 0.043,
      })
    }
  
    return NextResponse.json(wacc)
  }

export async function POST(request: Request) {
  const body = await request.json()

  const stmt = db.prepare(`
    INSERT INTO WACCParameters
    (company_id, beta_unlevered, beta_relevered, debt_equity_ratio, risk_free_rate, market_premium, size_premium, illiquidity_premium, ke, kd_gross, kd_net, wacc, scenario)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(company_id, scenario) DO UPDATE SET
      beta_unlevered      = excluded.beta_unlevered,
      beta_relevered      = excluded.beta_relevered,
      debt_equity_ratio   = excluded.debt_equity_ratio,
      risk_free_rate      = excluded.risk_free_rate,
      market_premium      = excluded.market_premium,
      size_premium        = excluded.size_premium,
      illiquidity_premium = excluded.illiquidity_premium,
      ke                  = excluded.ke,
      kd_gross            = excluded.kd_gross,
      kd_net              = excluded.kd_net,
      wacc                = excluded.wacc
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
    body.scenario ?? "base"
  )

  return NextResponse.json({ id: result.lastInsertRowid, message: "WACC enregistré" })
}