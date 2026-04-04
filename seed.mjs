const baseUrl = "http://localhost:3000"

const years = [
  { fiscal_year: 2021, revenue: 464755617, gross_margin: 185294987, ebitda: 30924337, ebit: 16721349, net_income: 10351130, equity: null, net_debt: null, working_capital: null, capex: null, delta_wc: null, fcf: null },
  { fiscal_year: 2022, revenue: 488085031, gross_margin: 227570808, ebitda: -8353241, ebit: 18287916, net_income: 11353947, equity: null, net_debt: null, working_capital: null, capex: null, delta_wc: null, fcf: null },
  { fiscal_year: 2023, revenue: 692001521, gross_margin: 277151964, ebitda: 47940289, ebit: 28515480, net_income: 13755317, equity: null, net_debt: null, working_capital: null, capex: null, delta_wc: null, fcf: null },
  { fiscal_year: 2024, revenue: 668984681, gross_margin: 281433437, ebitda: 55266672, ebit: 36483005, net_income: 19478313, equity: 44496936, net_debt: 92197699, working_capital: null, capex: 17110811, delta_wc: -25784336, fcf: 1577917 }
]

for (const year of years) {
  const res = await fetch(`${baseUrl}/api/financials`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ company_id: 1, ...year })
  })
  const data = await res.json()
  console.log(`${year.fiscal_year}:`, data)
}