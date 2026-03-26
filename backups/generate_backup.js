const fs = require('fs');
const path = require('path');
const basePath = path.join('C:\\Users\\emonc\\.gemini\\antigravity\\brain\\539d6cdc-e1bd-4711-8610-9b67f1af7b76\\.system_generated\\steps');

function readStep(stepId) {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(basePath, stepId, 'output.txt'), 'utf8'));
    const m = raw.result.match(/\[\{.*\}\]/s);
    if (!m) return [];
    return JSON.parse(m[0]);
  } catch(e) { console.error('Error reading step ' + stepId + ':', e.message); return []; }
}

function readDataStep(stepId) {
  const rows = readStep(stepId);
  if (rows.length === 0) return [];
  // Handle both formats: with row_to_json wrapper and without
  if (rows[0].row_to_json) return rows.map(r => r.row_to_json);
  return rows;
}

function esc(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'number') {
    if (val === 1e+72) return '1e+72';
    return String(val);
  }
  if (Array.isArray(val)) {
    return "ARRAY[" + val.map(v => typeof v === 'string' ? "'" + v.replace(/'/g, "''") + "'" : v).join(', ') + "]";
  }
  if (typeof val === 'object') return "'" + JSON.stringify(val).replace(/'/g, "''") + "'::jsonb";
  return "'" + String(val).replace(/'/g, "''") + "'";
}

// Read DDL
const ddlData = readStep('819');

// Read constraints
const constraints = readStep('826');

// Read all table data
const tableData = {
  negocios: readDataStep('827'),
  planes: [
    {id:3,codigo:'regular',nombre:'Plan Avanzado',precio_mxn:499,limite_sucursales:6,limite_empleados_por_sucursal:8,descripcion:'Negocios en crecimiento',activo:true},
    {id:2,codigo:'basic',nombre:'Plan Básico',precio_mxn:219,limite_sucursales:2,limite_empleados_por_sucursal:4,descripcion:'Emprendedores',activo:true},
    {id:1,codigo:'free',nombre:'Plan Gratuito',precio_mxn:0,limite_sucursales:1,limite_empleados_por_sucursal:2,descripcion:'Prueba gratuita de 7 días',activo:true}
  ],
  sucursales: readDataStep('832'),
  usuarios_perfiles: readDataStep('833'),
  empleados: readDataStep('834'),
  servicios: readDataStep('835'),
  negocio_suscripciones: readDataStep('836'),
  clientes_bot: readDataStep('840'),
  citas: readDataStep('841'),
  citas_servicios: [
    {id:70,cita_id:65,servicio_id:13,precio_actual:60},{id:71,cita_id:65,servicio_id:17,precio_actual:20},
    {id:72,cita_id:66,servicio_id:13,precio_actual:60},{id:73,cita_id:66,servicio_id:15,precio_actual:50},
    {id:74,cita_id:70,servicio_id:13,precio_actual:60},{id:75,cita_id:70,servicio_id:17,precio_actual:20},
    {id:76,cita_id:71,servicio_id:13,precio_actual:60},{id:77,cita_id:72,servicio_id:13,precio_actual:60},
    {id:78,cita_id:73,servicio_id:13,precio_actual:60},{id:80,cita_id:74,servicio_id:23,precio_actual:85},
    {id:81,cita_id:75,servicio_id:15,precio_actual:50},{id:82,cita_id:76,servicio_id:25,precio_actual:50},
    {id:83,cita_id:79,servicio_id:17,precio_actual:20},{id:84,cita_id:80,servicio_id:13,precio_actual:60},
    {id:85,cita_id:81,servicio_id:26,precio_actual:180},{id:86,cita_id:82,servicio_id:26,precio_actual:180},
    {id:87,cita_id:83,servicio_id:27,precio_actual:100},{id:88,cita_id:89,servicio_id:13,precio_actual:200},
    {id:89,cita_id:90,servicio_id:29,precio_actual:1e+72},{id:90,cita_id:91,servicio_id:29,precio_actual:2},
    {id:91,cita_id:92,servicio_id:29,precio_actual:2},{id:92,cita_id:93,servicio_id:30,precio_actual:250},
    {id:93,cita_id:94,servicio_id:31,precio_actual:120},{id:94,cita_id:95,servicio_id:14,precio_actual:150},
    {id:95,cita_id:95,servicio_id:16,precio_actual:50},{id:96,cita_id:96,servicio_id:14,precio_actual:150},
    {id:97,cita_id:97,servicio_id:13,precio_actual:200},{id:98,cita_id:98,servicio_id:15,precio_actual:50},
    {id:99,cita_id:100,servicio_id:13,precio_actual:200},{id:100,cita_id:101,servicio_id:13,precio_actual:200},
    {id:101,cita_id:102,servicio_id:13,precio_actual:200},{id:102,cita_id:103,servicio_id:13,precio_actual:200}
  ],
  empleado_servicios: [
    {id:6,empleado_id:11,servicio_id:16},{id:9,empleado_id:10,servicio_id:15},
    {id:18,empleado_id:18,servicio_id:23},{id:20,empleado_id:20,servicio_id:25},
    {id:21,empleado_id:21,servicio_id:26},{id:22,empleado_id:23,servicio_id:28},
    {id:23,empleado_id:24,servicio_id:29},{id:24,empleado_id:25,servicio_id:30},
    {id:25,empleado_id:26,servicio_id:31},{id:26,empleado_id:27,servicio_id:13},
    {id:27,empleado_id:28,servicio_id:14},{id:34,empleado_id:9,servicio_id:13},
    {id:35,empleado_id:9,servicio_id:14}
  ],
  horarios_sucursal: [
    {id:37,sucursal_id:42,dia_semana:1,hora_inicio:'09:00:00',hora_fin:'20:00:00',created_at:'2026-02-20T15:32:39.497176+00:00',activo:true,hora_descanso_inicio:'14:00:00',duracion_descanso_minutos:60},
    {id:38,sucursal_id:42,dia_semana:2,hora_inicio:'09:00:00',hora_fin:'20:00:00',created_at:'2026-02-20T15:32:39.497176+00:00',activo:true,hora_descanso_inicio:'14:00:00',duracion_descanso_minutos:60},
    {id:39,sucursal_id:42,dia_semana:3,hora_inicio:'09:00:00',hora_fin:'20:00:00',created_at:'2026-02-20T15:32:39.497176+00:00',activo:true,hora_descanso_inicio:'14:00:00',duracion_descanso_minutos:60},
    {id:40,sucursal_id:42,dia_semana:5,hora_inicio:'09:00:00',hora_fin:'20:00:00',created_at:'2026-02-20T15:32:39.497176+00:00',activo:true,hora_descanso_inicio:'14:00:00',duracion_descanso_minutos:60},
    {id:41,sucursal_id:42,dia_semana:6,hora_inicio:'10:00:00',hora_fin:'18:00:00',created_at:'2026-02-20T15:32:39.497176+00:00',activo:true,hora_descanso_inicio:'14:00:00',duracion_descanso_minutos:0},
    {id:42,sucursal_id:43,dia_semana:1,hora_inicio:'09:00:00',hora_fin:'18:00:00',created_at:'2026-02-28T01:02:46.55101+00:00',activo:true,hora_descanso_inicio:null,duracion_descanso_minutos:60},
    {id:49,sucursal_id:32,dia_semana:1,hora_inicio:'09:00:00',hora_fin:'20:00:00',created_at:'2026-03-11T06:12:35.532933+00:00',activo:true,hora_descanso_inicio:'14:00:00',duracion_descanso_minutos:60},
    {id:50,sucursal_id:32,dia_semana:2,hora_inicio:'09:00:00',hora_fin:'20:00:00',created_at:'2026-03-11T06:12:35.532933+00:00',activo:true,hora_descanso_inicio:'14:00:00',duracion_descanso_minutos:60},
    {id:51,sucursal_id:32,dia_semana:3,hora_inicio:'09:00:00',hora_fin:'20:00:00',created_at:'2026-03-11T06:12:35.532933+00:00',activo:true,hora_descanso_inicio:'14:00:00',duracion_descanso_minutos:60},
    {id:52,sucursal_id:32,dia_semana:4,hora_inicio:'09:00:00',hora_fin:'20:00:00',created_at:'2026-03-11T06:12:35.532933+00:00',activo:true,hora_descanso_inicio:'14:00:00',duracion_descanso_minutos:60},
    {id:53,sucursal_id:32,dia_semana:5,hora_inicio:'09:00:00',hora_fin:'20:00:00',created_at:'2026-03-11T06:12:35.532933+00:00',activo:true,hora_descanso_inicio:'14:00:00',duracion_descanso_minutos:60}
  ]
};

let sql = '';
sql += '-- ===========================================\n';
sql += '-- KyrosBarber Database Backup\n';
sql += '-- Generated: 2026-03-24\n';
sql += '-- Project: qyyhembukflbxjbctuav\n';
sql += '-- ===========================================\n\n';
sql += 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";\n\n';

// DDL
sql += '-- ===========================================\n';
sql += '-- SCHEMA (DDL)\n';
sql += '-- ===========================================\n\n';

const tableOrder = ['negocios','planes','sucursales','usuarios_perfiles','empleados','servicios',
  'clientes_bot','negocio_suscripciones','citas','citas_servicios','empleado_servicios',
  'horarios_sucursal','chat_histories','chat_actividad','inbox_telegram','bot_sessions','n8n_chat_histories'];

for (const tn of tableOrder) {
  const tbl = ddlData.find(d => d.table_name === tn);
  if (tbl) {
    sql += 'DROP TABLE IF EXISTS public.' + tn + ' CASCADE;\n';
    sql += 'CREATE TABLE public.' + tn + ' (\n' + tbl.columns_ddl + '\n);\n\n';
  }
}

// Primary keys
sql += '-- PRIMARY KEYS\n';
const pks = constraints.filter(c => c.constraint_type === 'PRIMARY KEY');
for (const pk of pks) {
  sql += 'ALTER TABLE public.' + pk.table_name + ' ADD CONSTRAINT ' + pk.constraint_name + ' PRIMARY KEY (' + pk.constraint_detail + ');\n';
}
sql += '\n';

// Unique constraints
sql += '-- UNIQUE CONSTRAINTS\n';
const uqs = constraints.filter(c => c.constraint_type === 'UNIQUE');
for (const uq of uqs) {
  sql += 'ALTER TABLE public.' + uq.table_name + ' ADD CONSTRAINT ' + uq.constraint_name + ' UNIQUE (' + uq.constraint_detail + ');\n';
}
sql += '\n';

// Foreign keys
sql += '-- FOREIGN KEYS\n';
const fks = constraints.filter(c => c.constraint_type === 'FOREIGN KEY');
for (const fk of fks) {
  sql += 'ALTER TABLE public.' + fk.table_name + ' ADD CONSTRAINT ' + fk.constraint_name + ' FOREIGN KEY (' + fk.constraint_detail + ');\n';
}
sql += '\n';

// DATA
sql += '-- ===========================================\n';
sql += '-- DATA (INSERT STATEMENTS)\n';
sql += '-- ===========================================\n\n';

const dataOrder = ['negocios','planes','sucursales','usuarios_perfiles','empleados','servicios',
  'clientes_bot','negocio_suscripciones','citas','citas_servicios','empleado_servicios','horarios_sucursal'];

for (const tn of dataOrder) {
  const rows = tableData[tn];
  if (!rows || rows.length === 0) continue;

  sql += '-- ' + tn + ' (' + rows.length + ' rows)\n';
  for (const row of rows) {
    const cols = Object.keys(row);
    const vals = cols.map(c => esc(row[c]));
    sql += 'INSERT INTO public.' + tn + ' (' + cols.join(', ') + ') VALUES (' + vals.join(', ') + ');\n';
  }
  sql += '\n';
}

// Reset sequences
sql += '-- RESET SEQUENCES\n';
const seqTables = ['sucursales','empleados','servicios','clientes_bot','citas','citas_servicios','empleado_servicios','horarios_sucursal','n8n_chat_histories'];
for (const st of seqTables) {
  sql += "SELECT setval(pg_get_serial_sequence('public." + st + "', 'id'), COALESCE((SELECT MAX(id) FROM public." + st + "), 1));\n";
}

const outPath = path.join(__dirname, 'kyrosbarber_backup_2026-03-24.sql');
fs.writeFileSync(outPath, sql);
console.log('Backup SQL generated: ' + outPath);
console.log('File size: ' + (fs.statSync(outPath).size / 1024).toFixed(1) + ' KB');
console.log('Total tables with DDL: ' + tableOrder.length);
console.log('Tables with data: ' + dataOrder.filter(t => tableData[t] && tableData[t].length > 0).length);
dataOrder.forEach(t => { if (tableData[t] && tableData[t].length > 0) console.log('  ' + t + ': ' + tableData[t].length + ' rows'); });
