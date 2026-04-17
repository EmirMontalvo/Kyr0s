#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const { parseArgs } = require('util');

async function main() {
  try {
    // 1. Obtener la ruta del archivo que queremos subir
    const { values } = parseArgs({
      options: {
        file: { type: 'string', short: 'f' },
      },
      strict: false
    });

    if (!values.file) {
      console.error('Por favor provee un archivo JSON con la opcion -f, ej: node deploy-n8n.js -f ../n8n_kyros_chatbot.json');
      process.exit(1);
    }
    const filePath = path.resolve(values.file);
    if (!fs.existsSync(filePath)) {
      console.error(`No existe el archivo: ${filePath}`);
      process.exit(1);
    }

    // 2. Extraer las credenciales (API y Host) del mcp_config.json
    const mcpConfigPath = path.join(os.homedir(), '.gemini', 'antigravity', 'mcp_config.json');
    if (!fs.existsSync(mcpConfigPath)) {
      console.error('Falta el mcp_config.json de antigravity.');
      process.exit(1);
    }
    
    const mcpConfig = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf8'));
    const n8nEnv = mcpConfig.mcpServers?.["n8n-mcp"]?.env || {};
    const host = n8nEnv.N8N_API_URL;
    const apiKey = n8nEnv.N8N_API_KEY;

    if (!host || !apiKey) {
      console.error('El mcp_config.json existe pero no tiene N8N_HOST o N8N_API_KEY configurado en n8n-mcp');
      process.exit(1);
    }

    const apiUrl = host.replace(/\/$/, '') + '/api/v1/workflows';
    const jsonContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const workflowName = jsonContent.name;

    console.log(`📡 Conectando a instancia n8n: ${host}...`);

    // 3. Buscar si el workflow ya existe (por nombre) en la nube
    const listRes = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-N8N-API-KEY': apiKey
      }
    });

    if (!listRes.ok) {
      console.error('Error listando flujos', await listRes.text());
      process.exit(1);
    }

    const { data: workflows } = await listRes.json();
    const existingWorkflow = workflows.find(wf => wf.name === workflowName);

    // 4. Hacer POST o PUT dependiendo de si existe
    let response;
    if (existingWorkflow) {
      console.log(`🔄 Encontrado workflow existente: "${workflowName}" (ID: ${existingWorkflow.id}). Actualizando...`);
      // Update
      response = await fetch(`${apiUrl}/${existingWorkflow.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-N8N-API-KEY': apiKey
        },
        body: JSON.stringify(jsonContent)
      });
    } else {
      console.log(`✨ Workflow no encontrado, creando uno completamente nuevo: "${workflowName}"...`);
      // Create
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-N8N-API-KEY': apiKey
        },
        body: JSON.stringify(jsonContent)
      });
    }

    if (!response.ok) {
      console.error('❌ Falló la carga del workflow');
      console.error(await response.text());
      process.exit(1);
    }

    const result = await response.json();
    console.log(`✅ ¡Despliegue exitoso! Tu flujo ahora está sincronizado en tu Render (\n   ID: ${result.id}\n   Nombre: ${result.name}\n   Status Activo: ${result.active}\n)`);

  } catch (err) {
    console.error('❌ Ocurrió un error inesperado al subir a n8n:', err.message);
    process.exit(1);
  }
}

main();
