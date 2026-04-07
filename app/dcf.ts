export interface FinancialStatement {
    fiscal_year: number
    revenue: number
    ebitda: number
    ebit: number
    net_income: number
    tax_rate: number
    equity: number
    net_debt: number
    capex: number
    delta_wc: number
    fcf: number
  }
  
  export interface DCFParams {
    wacc: number
    terminal_growth_rate: number
    projection_years: number
  }
  
  export function calculateDCF(financials: FinancialStatement[], params: DCFParams) {
    
    // 1. On prend le dernier bilan disponible (2024)
    const latest = financials[0]
    
    // 2. On calcule le FCF historique de référence
    // Priorité : FCF direct → EBITDA*(1-t)-Capex-ΔBFR → EBIT*(1-t)-Capex-ΔBFR → 0
    const t = latest.tax_rate ?? 0.25
    const capex = latest.capex ?? 0
    const dwc = latest.delta_wc ?? 0
    const baseFCF = latest.fcf != null
      ? latest.fcf
      : latest.ebitda != null
        ? latest.ebitda * (1 - t) - capex - dwc
        : latest.ebit != null
          ? latest.ebit * (1 - t) - capex - dwc
          : 0

    // 3. On calcule le taux de croissance historique du CA
    const sorted = [...financials].sort((a, b) => a.fiscal_year - b.fiscal_year)
    const oldest = sorted[0]
    const years = latest.fiscal_year - oldest.fiscal_year
    const cagr = years > 0 && oldest.revenue && latest.revenue
      ? Math.pow(latest.revenue / oldest.revenue, 1 / years) - 1
      : 0.05
  
    // 4. On projette les FCF sur N années
    const projectedFCFs: number[] = []
    let fcf = baseFCF
    
    for (let i = 1; i <= params.projection_years; i++) {
      fcf = fcf * (1 + cagr)
      projectedFCFs.push(fcf)
    }
  
    // 5. On actualise les FCF au WACC
    const pvFCFs = projectedFCFs.map((fcf, i) => {
      return fcf / Math.pow(1 + params.wacc, i + 1)
    })
    const sumPVFCF = pvFCFs.reduce((a, b) => a + b, 0)
  
    // 6. On calcule la valeur terminale
    const lastFCF = projectedFCFs[projectedFCFs.length - 1]
    const terminalValue = lastFCF * (1 + params.terminal_growth_rate) 
      / (params.wacc - params.terminal_growth_rate)
    
    // 7. On actualise la valeur terminale
    const pvTerminalValue = terminalValue 
      / Math.pow(1 + params.wacc, params.projection_years)
  
    // 8. Enterprise Value = PV FCFs + PV Terminal Value
    const enterpriseValue = sumPVFCF + pvTerminalValue
  
    // 9. Equity Value = EV - Dette nette
    const equityValue = enterpriseValue - (latest.net_debt ?? 0)
  
    return {
      baseFCF: Math.round(baseFCF),
      cagr: Math.round(cagr * 1000) / 10,
      projectedFCFs: projectedFCFs.map(f => Math.round(f)),
      pvFCFs: pvFCFs.map(f => Math.round(f)),
      sumPVFCF: Math.round(sumPVFCF),
      terminalValue: Math.round(terminalValue),
      pvTerminalValue: Math.round(pvTerminalValue),
      enterpriseValue: Math.round(enterpriseValue),
      equityValue: Math.round(equityValue),
      evEbitda: Math.round(enterpriseValue / latest.ebitda * 10) / 10
    }
  }