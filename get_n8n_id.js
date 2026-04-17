const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2NTg3M2E4YS1hOTg1LTQzNzQtODE1YS00Y2UxMGYxY2QwZTMiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYzMzYWMxMTMtOGFlNC00ZTg0LThiMjItZGFiZGRhNjIzNzBmIiwiaWF0IjoxNzc1NTQwMDg1fQ.vS6bHPg0Th08fHkzAbG-bsNfifwHQG9esXFDhS97fjY";
fetch("https://n8n-v4ps.onrender.com/api/v1/workflows", {
  headers: { "X-N8N-API-KEY": apiKey }
}).then(res => res.json()).then(data => {
  const kyros = data.data.find(w => w.name.includes("Kyros"));
  if (kyros) {
    console.log(`FOUND_ID: ${kyros.id}`);
  } else {
    console.log("NOT_FOUND", data.data.map(d => d.name));
  }
}).catch(console.error);
