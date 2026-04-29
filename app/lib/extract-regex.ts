// Extracteur PCG par regex — méthode secondaire pour cross-validation avec Claude.
// Fonctionne uniquement sur les PDFs avec texte sélectionnable (pas les scannés).

import type { CoreYear } from "./financials"

export type RegexYear = Partial<CoreYear> & { fiscal_year: number }

export type RegexResult = {
  years: RegexYear[]
  text_found: boolean
  confidence: "high" | "medium" | "low"
}

// Parse un nombre au format français : "1 234 567" → 1234567, "(1 234)" → -1234
function parseFrNum(s: string): number | null {
  if (!s?.trim()) return null
  const neg = s.includes("(") && s.includes(")")
  const clean = s
    .replace(/[()]/g, "")
    .replace(/[\s ]/g, "")   // espaces normaux + insécables
    .replace(/\./g, "")            // séparateur milliers parfois un point
    .replace(",", ".")
  const n = parseFloat(clean)
  if (isNaN(n)) return null
  return neg ? -n : n
}

// Pattern d'un nombre en format français (positif ou négatif entre parenthèses)
const NUM_PATTERN = /\(?\s*\d[\d\s ]*(?:,\d{1,2})?\s*\)?/

// Cherche jusqu'à 2 nombres après un label (colonne N et N-1)
function findValuesAfterLabel(
  text: string,
  patterns: RegExp[]
): [number | null, number | null] {
  for (const p of patterns) {
    const match = text.match(p)
    if (!match || match.index === undefined) continue

    const window = text.slice(
      match.index + match[0].length,
      match.index + match[0].length + 200
    )
    const nums: number[] = []
    let remaining = window

    for (let i = 0; i < 2; i++) {
      const nm = remaining.match(NUM_PATTERN)
      if (!nm || nm.index === undefined) break
      const val = parseFrNum(nm[0])
      // Filtre les petits nombres qui ressemblent à des codes ou numéros de ligne
      if (val !== null && Math.abs(val) >= 100) nums.push(val)
      remaining = remaining.slice(nm.index + nm[0].length)
    }

    if (nums.length > 0) return [nums[0] ?? null, nums[1] ?? null]
  }
  return [null, null]
}

// Détecte les années fiscales mentionnées dans le document
function detectFiscalYears(text: string): number[] {
  const years = new Set<number>()

  // "Exercice clos le 31/12/2023" ou "au 31 décembre 2023"
  for (const m of text.matchAll(
    /(?:exercice|clos\s+le|au)\s+(?:\d{2}[/\-]\d{2}[/\-])?(\d{4})/gi
  )) {
    const y = parseInt(m[1])
    if (y >= 2010 && y <= 2030) years.add(y)
  }

  // Les années qui apparaissent fréquemment sont probablement des exercices fiscaux
  const counts: Record<number, number> = {}
  for (const m of text.matchAll(/\b(20[12]\d)\b/g)) {
    const y = parseInt(m[1])
    counts[y] = (counts[y] ?? 0) + 1
  }
  for (const [y, c] of Object.entries(counts)) {
    if (c >= 4) years.add(parseInt(y))
  }

  return [...years].sort((a, b) => b - a).slice(0, 2) // max 2 ans, plus récent en premier
}

// Labels PCG par champ — patterns adaptés aux libellés standards des liasses françaises
const FIELDS: Record<string, { patterns: RegExp[]; docTypes: string[] }> = {
  revenue: {
    patterns: [
      /chiffre\s+d.affaires\s+net/i,
      /chiffre\s+d.affaires\b/i,
      /total\s+des?\s+produits\s+d.exploitation/i,
    ],
    docTypes: ["liasse", "cr", "rapport", "autre"],
  },
  ebit: {
    patterns: [
      /r[ée]sultat\s+d.exploitation/i,
      /r[ée]sultat\s+op[ée]rationnel\s+courant/i,
      /r[ée]sultat\s+op[ée]rationnel/i,
    ],
    docTypes: ["liasse", "cr", "rapport", "autre"],
  },
  net_income: {
    patterns: [
      /r[ée]sultat\s+de\s+l.exercice/i,
      /b[ée]n[ée]fice\s+ou\s+perte/i,
      /r[ée]sultat\s+net\b/i,
    ],
    docTypes: ["liasse", "cr", "rapport", "autre"],
  },
  equity: {
    patterns: [
      /total\s+des?\s+capitaux\s+propres/i,
      /capitaux\s+propres(?!\s+(?:et|du|de\s+l))/i,
      /situation\s+nette/i,
    ],
    docTypes: ["liasse", "bilan", "rapport", "autre"],
  },
  net_debt: {
    patterns: [
      /emprunts?\s+et\s+dettes?\s+(?:aupr[eè]s|[àa]\s+(?:plus|long))/i,
      /dettes?\s+financi[eè]res?\b/i,
    ],
    docTypes: ["liasse", "bilan", "rapport", "autre"],
  },
  capex: {
    patterns: [
      /acquisitions?\s+d.immobilisations/i,
      /investissements?\s+(?:en\s+)?immobilisations/i,
      /d[ée]caissements?\s+pour\s+acquisition/i,
    ],
    docTypes: ["liasse", "flux", "rapport", "autre"],
  },
  ebitda: {
    patterns: [
      /ebitda/i,
      /r[ée]sultat\s+brut\s+d.exploitation/i,
    ],
    docTypes: ["liasse", "cr", "rapport", "autre"],
  },
  working_capital: {
    patterns: [
      /besoin\s+en\s+fonds?\s+de\s+roulement/i,
      /\bbfr\b/i,
    ],
    docTypes: ["liasse", "bilan", "flux", "rapport", "autre"],
  },
}

export async function extractWithRegex(
  buffer: Buffer,
  docType: string
): Promise<RegexResult> {
  let text = ""

  try {
    // pdf-parse/lib/pdf-parse.js évite l'initialisation du test runner de v1
    const pdfParse = (await import("pdf-parse/lib/pdf-parse.js" as any)).default
    const data = await pdfParse(buffer)
    text = data.text ?? ""
  } catch {
    return { years: [], text_found: false, confidence: "low" }
  }

  if (text.trim().length < 200) {
    // PDF scanné ou protégé — aucun texte extractible
    return { years: [], text_found: false, confidence: "low" }
  }

  const detectedYears = detectFiscalYears(text)
  const yearN  = detectedYears[0] ?? new Date().getFullYear() - 1
  const yearN1 = detectedYears[1] ?? yearN - 1

  const resultN:  RegexYear = { fiscal_year: yearN }
  const resultN1: RegexYear = { fiscal_year: yearN1 }
  let foundCount = 0

  for (const [field, config] of Object.entries(FIELDS)) {
    if (!config.docTypes.includes(docType)) continue

    const [valN, valN1] = findValuesAfterLabel(text, config.patterns)

    if (valN !== null) {
      (resultN as any)[field] = valN
      foundCount++
    }
    if (valN1 !== null) {
      (resultN1 as any)[field] = valN1
    }
  }

  const confidence: RegexResult["confidence"] =
    foundCount >= 3 ? "high" : foundCount >= 1 ? "medium" : "low"

  // N-1 inclus uniquement si on a trouvé des données au-delà de l'année
  const years: RegexYear[] = [resultN]
  if (Object.keys(resultN1).length > 1) years.push(resultN1)

  return { years, text_found: true, confidence }
}
