const response = await fetch("http://localhost:3000/api/companies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      siren: "123456789",
      name: "CAP Cosmetiques",
      type: "Commerciale",
      sector: "Cosmetique",
      naf_code: "2042Z",
      country: "France",
      headcount: 500,
      legal_form: "SAS"
    })
  })
  
  const data = await response.json()
  console.log("Résultat:", data)