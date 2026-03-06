# 🔑 Credenciales para el Compañero de Equipo

> **DOCUMENTO CONFIDENCIAL - NO COMPARTIR PÚBLICAMENTE**
> 
> Emir: Completa este documento con las credenciales y envíaselo a tu compañero por un canal seguro (mensaje directo, no en repositorio público).

---

## Supabase

### URL del Proyecto
```
https://qyyhembukflbxjbctuav.supabase.co
```

### Anon Key (Pública)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5eWhlbWJ1a2ZsYnhqYmN0dWF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMzQ1MDQsImV4cCI6MjA4MzkxMDUwNH0.KEJi03-gJfE5g9Y5XFRZRoDsM4ZVpc8qlarqWFyxIEQ
```

### Service Role Key (⚠️ SECRETA - Solo para backend/n8n)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5eWhlbWJ1a2ZsYnhqYmN0dWF2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMzNDUwNCwiZXhwIjoyMDgzOTEwNTA0fQ.PEwJs8XqL0X92rZTzFrcsxfN7iN7e824JqzpNJBOr_0
```

> [!CAUTION]
> La `service_role` key tiene acceso TOTAL a la base de datos. 
> NUNCA debe exponerse en frontend o repositorios públicos.

---

## Invitación a Supabase Dashboard

1. Ve a: https://supabase.com/dashboard/project/qyyhembukflbxjbctuav/settings/general
2. Click en "Team" en el menú lateral
3. Click "Invite" y agrega el email de tu compañero
4. Selecciona rol "Developer" (no Owner)

---

## WhatsApp Business API (Meta)

> Si ya tienes configurada la cuenta Meta Business, completa estos campos:

### Phone Number ID
```
[Tu Phone Number ID de WhatsApp Business]
```

### WhatsApp Business Account ID
```
[Tu WABA ID]
```

### Access Token (Permanente recomendado)
```
[Token de acceso generado en Meta for Developers]
```

### Verify Token (Para Webhook)
```
kyros_verify_token_2026
```

---

## Información de Sucursales para Pruebas

| Sucursal | Teléfono WhatsApp | Negocio ID |
|----------|-------------------|------------|
| Sucursal Centro | 1111111111 | cdaaf6b6-c7db-4968-aa93-8f1dfb75a78c |

---

## Datos de Prueba

Para que tu compañero pueda probar, asegúrate de que exista:

- [x] Al menos 1 sucursal con teléfono registrado ✅
- [x] Al menos 2 servicios en esa sucursal ✅ (5 servicios)
- [x] Al menos 1 empleado en esa sucursal ✅ (3 empleados)
- [x] Horarios configurados para esa sucursal ✅ (Lun-Vie)

---

## Cómo obtener las credenciales

### Supabase Keys:
1. Ve a https://supabase.com/dashboard/project/qyyhembukflbxjbctuav
2. Click en "Project Settings" (ícono de engranaje)
3. Click en "API" en el menú lateral
4. Copia los valores de `anon` y `service_role`

### WhatsApp/Meta:
1. Ve a https://developers.facebook.com
2. Selecciona tu app (si ya existe)
3. Ve a WhatsApp > API Setup
4. Allí encontrarás Phone Number ID y Access Token
