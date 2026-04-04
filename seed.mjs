const baseUrl = "http://localhost:3000"

const scenarios = [
  { scenario: "pessimiste", wacc: 0.0999, risk_free_rate: 0.05 },
  { scenario: "optimiste", wacc: 0.0901, risk_free_rate: 0.02 }
]

for (const s of scenarios) {
  const res = await fetch(`${baseUrl}/api/wacc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      company_id: 1,
      beta_unlevered: 0.7424,
      beta_relevered: 1.8961,
      debt_equity_ratio: 2.072,
      risk_free_rate: s.risk_free_rate,
      market_premium: 0.06,
      size_premium: 0.03,
      illiquidity_premium: 0.025,
      ke: 0.2038,
      kd_gross: 0.0566,
      kd_net: 0.0425,
      wacc: s.wacc,
      scenario: s.scenario
    })
  })
  const data = await res.json()
  console.log(`${s.scenario}:`, data)
}