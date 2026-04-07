import { NextResponse } from "next/server"
import * as XLSX from "xlsx"

const SYSTEM_PROMPT = `Tu es un expert-comptable français spécialisé en analyse financière PCG.
Analyse ce document financier et extrait toutes les données disponibles
pour chaque année fiscale (N, N-1, N-2, N-3 si disponibles).

Réponds UNIQUEMENT en JSON valide :
{
  "years": [
    {
      "fiscal_year": 2024,
      "revenue": null,
      "gross_margin": null,
      "sga": null,
      "ebitda": null,
      "ebit": null,
      "net_income": null,
      "tax_rate": 0.25,
      "total_assets": null,
      "fixed_assets": null,
      "current_assets": null,
      "equity": null,
      "net_debt": null,
      "stocks": null,
      "accounts_receivable": null,
      "accounts_payable": null,
      "working_capital": null,
      "fr": null,
      "capex": null,
      "delta_wc": null,
      "fcf": null,
      "dso": null,
      "dpo": null,
      "dio": null,
      "roic": null,
      "roe": null,
      "roa": null,
      "interest_coverage": null,
      "cash_conversion": null,
      "capex_intensity": null
    }
  ]
}
Remplace null par les vraies valeurs trouvées dans le document.
Ne mets AUCUN texte avant ou après le JSON.`

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
      const base64 = buffer.toString("base64")
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
