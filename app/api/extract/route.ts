import { NextResponse } from "next/server"
import * as XLSX from "xlsx"
import { PDFDocument } from "pdf-lib"

const MAX_PAGES = 30

const SYSTEM_PROMPT = `Tu es un expert-comptable français spécialisé en analyse financière PCG.
Analyse ce document financier et extrait les 10 indicateurs clés pour chaque année fiscale disponible (N, N-1, N-2, N-3).

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

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "Fichier manquant" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const isPdf =
      file.name.toLowerCase().endsWith(".pdf") ||
      file.type === "application/pdf"

    let messages: object[]

    if (isPdf) {
      // Charge le PDF et tronque si nécessaire
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true })
      const totalPages = pdfDoc.getPageCount()

      let pdfBuffer = buffer
      if (totalPages > MAX_PAGES) {
        const trimmed = await PDFDocument.create()
        const pagesToCopy = await trimmed.copyPages(pdfDoc, Array.from({ length: MAX_PAGES }, (_, i) => i))
        pagesToCopy.forEach((p: import("pdf-lib").PDFPage) => trimmed.addPage(p))
        const trimmedBytes = await trimmed.save()
        pdfBuffer = Buffer.from(trimmedBytes)
      }

      const base64 = pdfBuffer.toString("base64")
      messages = [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64,
              },
            },
            {
              type: "text",
              text: "Extrais toutes les données financières disponibles dans ce document.",
            },
          ],
        },
      ]
    } else {
      const workbook = XLSX.read(buffer, { type: "buffer" })
      const parts: string[] = []
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName]
        const csv = XLSX.utils.sheet_to_csv(sheet)
        if (csv.trim()) parts.push(`=== Feuille : ${sheetName} ===\n${csv}`)
      }
      messages = [
        {
          role: "user",
          content: parts.join("\n\n") || "Document vide.",
        },
      ]
    }

    const apiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages,
      }),
    })

    if (!apiRes.ok) {
      const detail = await apiRes.text()
      return NextResponse.json({ error: "Erreur Claude API", detail }, { status: 500 })
    }

    const apiData = await apiRes.json()
    const text: string = apiData.content?.[0]?.text ?? ""

    // Extract JSON from response (in case there's surrounding text)
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) {
      return NextResponse.json(
        { error: "Réponse Claude non parseable", raw: text },
        { status: 500 }
      )
    }

    const parsed = JSON.parse(match[0])
    return NextResponse.json(parsed)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Erreur inconnue"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
