const fs = require('fs');
const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2NTg3M2E4YS1hOTg1LTQzNzQtODE1YS00Y2UxMGYxY2QwZTMiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYzMzYWMxMTMtOGFlNC00ZTg0LThiMjItZGFiZGRhNjIzNzBmIiwiaWF0IjoxNzc1NTQwMDg1fQ.vS6bHPg0Th08fHkzAbG-bsNfifwHQG9esXFDhS97fjY";
const workflowId = "VSANZLzae78jmgVi";
const jsonPath = "c:\\Users\\emonc\\Downloads\\🤖 Kyros Chatbot - Gemini + Supabase Memoria (4).json";

try {
  let fileContent = fs.readFileSync(jsonPath, 'utf8');
  let workflowData = JSON.parse(fileContent);
  
  fetch(`https://n8n-v4ps.onrender.com/api/v1/workflows/${workflowId}`, {
    method: 'PUT',
    headers: { 
      "X-N8N-API-KEY": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(workflowData)
  }).then(async res => {
    const text = await res.text();
    try {
        const json = JSON.parse(text);
        console.log("UPDATE_RESPONSE:", json.id ? "SUCCESS" : text);
    } catch(e) {
        console.log("UPDATE_RESPONSE_TEXT:", text);
    }
  }).catch(e => console.error("FETCH_ERROR:", e));
} catch (e) {
  console.log("FS_ERROR:", e);
}
