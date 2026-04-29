import { NextResponse } from "next/server"
import * as XLSX from "xlsx"
import { PDFDocument } from "pdf-lib"
import { extractWithRegex } from "../../lib/extract-regex"

const MAX_PAGES = 30

// System prompt adapté selon le type de document
function buildSystemPrompt(docType: string): string {
  const focus: Record<string, string> = {
    cr:      "Concentre-toi sur : chiffre d'affaires, EBITDA, EBIT, résultat net, taux IS.",
    bilan:   "Concentre-toi sur : capitaux propres, dettes financières nettes, BFR.",
    flux:    "Concentre-toi sur : capex (acquisitions d'immobilisations), variation du BFR.",
    liasse:  "Extrais les 10 indicateurs : CA, EBITDA, EBIT, résultat net, capex, dette nette, capitaux propres, BFR, variation BFR, taux IS.",
    rapport: "Extrais tous les indicateurs financiers disponibles.",
    autre:   "Extrais tous les indicateurs financiers disponibles.",
  }

  return `Tu es un expert-comptable français spécialisé en analyse financière PCG.
Analyse ce document financier et extrait les indicateurs clés pour chaque année fiscale disponible (N, N-1, N-2, N-3).
${focus[docType] ?? focus.autre}

RÈGLES :
- Toutes les valeurs monétaires en EUROS entiers (si k€ dans le doc → multiplier par 1000, si M€ → par 1 000 000)
- tax_rate en décimal (ex: 0.25 pour 25%). Si non trouvé, mettre 0.25
- delta_wc = BFR(N) - BFR(N-1). Si une seule année disponible, mettre 0
- Laisser null si la valeur est introuvable dans le document

Réponds UNIQUEMENT en JSON valide, sans aucun texte avant ou après :
{
  "years": [
    {
      "fiscal_year": 2024,
      "revenue": null,
      "ebitda": null,
      "ebit": null,
      "net_income": null,
      "capex": null,
      "net_debt": null,
      "equity": null,
      "working_capital": null,
      "delta_wc": null,
      "tax_rate": 0.25
    }
  ]
}`
}

// Parse la plage de pages "5-15" → [4, 15] (indices 0-based, end exclusif)
function parsePageRange(range: string, totalPages: number): [number, number] {
  const parts = range.split("-").map(s => parseInt(s.trim(), 10))
  const start = Math.max(0, (isNaN(parts[0]) ? 1 : parts[0]) - 1)
  const end   = Math.min(totalPages, isNaN(parts[1]) ? MAX_PAGES : parts[1])
  return [start, Math.min(end, start + MAX_PAGES)] // cap à MAX_PAGES pages
}

// Compare deux valeurs avec une tolérance en %
function valuesAgree(a: number | null, b: number | null, tol = 0.05): boolean {
  if (a == null || b == null) return true // pas de contradiction si l'un est null
  if (a === 0 && b === 0) return true
  const avg = (Math.abs(a) + Math.abs(b)) / 2
  if (avg === 0) return false
  return Math.abs(a - b) / avg <= tol
}

const COMPARABLE_FIELDS = [
  "revenue", "ebitda", "ebit", "net_income",
  "capex", "net_debt", "equity", "working_capital",
]

export async function POST(request: Request) {
  try {
    const formData  = await request.formData()
    const file      = formData.get("file") as File | null
    const docType   = (formData.get("doc_type")  as string | null) ?? "autre"
    const pageRangeRaw = (formData.get("page_range") as string | null) ?? "1-30"

    if (!file) {
      return NextResponse.json({ error: "Fichier manquant" }, { status: 400 })
    }

    const bytes  = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const isPdf  = file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf"

    // ── Préparation des messages pour Claude ──────────────────────────────────
    let messages: object[]
    let pdfBuffer = buffer // sera potentiellement tronqué

    if (isPdf) {
      const pdfDoc     = await PDFDocument.load(buffer, { ignoreEncryption: true })
      const totalPages = pdfDoc.getPageCount()
      const [startIdx, endIdx] = parsePageRange(pageRangeRaw, totalPages)

      if (startIdx > 0 || endIdx < totalPages) {
        const trimmed   = await PDFDocument.create()
        const pageCount = Math.min(endIdx - startIdx, MAX_PAGES)
        const indices   = Array.from({ length: pageCount }, (_, i) => startIdx + i)
          .filter(i => i < totalPages)
        const copied = await trimmed.copyPages(pdfDoc, indices)
        copied.forEach((p: import("pdf-lib").PDFPage) => trimmed.addPage(p))
        pdfBuffer = Buffer.from(await trimmed.save())
      }

      messages = [{
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: pdfBuffer.toString("base64") },
          },
          { type: "text", text: "Extrais toutes les données financières disponibles dans ce document." },
        ],
      }]
    } else {
      const workbook = XLSX.read(buffer, { type: "buffer" })
      const parts: string[] = []
      for (const sheetName of workbook.SheetNames) {
        const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName])
        if (csv.trim()) parts.push(`=== Feuille : ${sheetName} ===\n${csv}`)
      }
      messages = [{ role: "user", content: parts.join("\n\n") || "Document vide." }]
    }

    // ── Lancement en parallèle : Claude + regex (PDF uniquement) ─────────────
    const claudePromise = fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key":        process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
        "content-type":     "application/json",
      },
      body: JSON.stringify({
        model:      "claude-sonnet-4-20250514",
        max_tokens: 2000,
        system:     buildSystemPrompt(docType),
        messages,
      }),
    })

    const regexPromise = isPdf
      ? extractWithRegex(pdfBuffer, docType)
      : Promise.resolve(null)

    const [claudeSettled, regexSettled] = await Promise.allSettled([
      claudePromise,
      regexPromise,
    ])

    // ── Traitement résultat Claude ────────────────────────────────────────────
    if (claudeSettled.status === "rejected") {
      return NextResponse.json({ error: "Erreur réseau vers Claude API" }, { status: 502 })
    }

    const claudeRes = claudeSettled.value
    if (!claudeRes.ok) {
      const detail = await claudeRes.text()
      const status = claudeRes.status === 401
        ? "Clé API Anthropic invalide ou absente"
        : claudeRes.status === 529
          ? "Claude API temporairement surchargée — réessayez dans quelques instants"
          : "Erreur Claude API"
      return NextResponse.json({ error: status, detail }, { status: 500 })
    }

    const claudeData = await claudeRes.json()
    const rawText: string = claudeData.content?.[0]?.text ?? ""
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Réponse Claude non parseable", raw: rawText },
        { status: 500 }
      )
    }

    const claudeParsed = JSON.parse(jsonMatch[0])
    const claudeYears: any[] = claudeParsed.years ?? []

    if (claudeYears.length === 0) {
      return NextResponse.json(
        { error: "Aucune donnée financière trouvée dans le document" },
        { status: 422 }
      )
    }

    // ── Traitement résultat regex ─────────────────────────────────────────────
    const regexResult = regexSettled.status === "fulfilled" ? regexSettled.value : null
    const regexYears  = regexResult?.years ?? []

    // ── Comparaison champ par champ ───────────────────────────────────────────
    const divergences: Record<number, { field: string; claude: number; regex: number }[]> = {}

    for (const claudeYear of claudeYears) {
      const fy = claudeYear.fiscal_year
      const regexYear = regexYears.find((r: any) => r.fiscal_year === fy) as any
      if (!regexYear) continue

      const yearDivs: { field: string; claude: number; regex: number }[] = []
      for (const field of COMPARABLE_FIELDS) {
        const cv = claudeYear[field]
        const rv = regexYear[field]
        if (cv != null && rv != null && !valuesAgree(cv, rv)) {
          yearDivs.push({ field, claude: cv, regex: rv })
        }
      }
      if (yearDivs.length > 0) divergences[fy] = yearDivs
    }

    return NextResponse.json({
      years:            claudeYears,           // valeurs Claude (référence)
      divergences,                             // champs qui divergent entre Claude et regex
      regex_confidence: regexResult?.confidence ?? "unavailable",
      text_found:       regexResult?.text_found ?? false,
    })

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Erreur inconnue"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
