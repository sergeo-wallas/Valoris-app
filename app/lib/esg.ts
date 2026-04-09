export type ESGCriterion = {
  pillar: string
  criterion_code: string
  criterion_name: string
  score: number
  max_score: number
  is_risk: number
}

export function computeESGResult(criteria: ESGCriterion[]) {
  const positive = criteria.filter(c => !c.is_risk)
  const risks    = criteria.filter(c => c.is_risk)

  const posScore  = positive.reduce((s, c) => s + c.score, 0)
  const posMax    = positive.length * 2
  const riskScore = risks.reduce((s, c) => s + c.score, 0)
  const riskMax   = risks.length * 2

  const totalScore = (posMax + riskMax) > 0
    ? Math.round(((posScore + (riskMax - riskScore)) / (posMax + riskMax)) * 100)
    : null

  let growthAdj = 0
  if (totalScore !== null) {
    if      (totalScore >= 80) growthAdj =  0.01
    else if (totalScore >= 60) growthAdj =  0.005
    else if (totalScore >= 40) growthAdj =  0
    else if (totalScore >= 20) growthAdj = -0.005
    else                       growthAdj = -0.01
  }

  const pillarScores: Record<string, number | null> = {}
  for (const p of ["E", "S", "G"]) {
    const pc    = criteria.filter(c => c.pillar === p)
    const pr    = pc.filter(c => !c.is_risk)
    const prisk = pc.filter(c => c.is_risk)
    const pscore = pr.reduce((s, c) => s + c.score, 0)
    const pmax   = pr.length * 2
    const rscore = prisk.reduce((s, c) => s + c.score, 0)
    const rmax   = prisk.length * 2
    pillarScores[p] = (pmax + rmax) > 0
      ? Math.round(((pscore + (rmax - rscore)) / (pmax + rmax)) * 100)
      : null
  }

  return { totalScore, growthAdj, pillarScores }
}
