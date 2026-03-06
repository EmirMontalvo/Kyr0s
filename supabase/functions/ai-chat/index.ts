import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
        if (!geminiApiKey) {
            throw new Error('La API Key de Gemini no está configurada.');
        }

        const body = await req.json();
        const { message, negocio_id, sucursal_id } = body;

        if (!message || !negocio_id) {
            throw new Error('Faltan parámetros requeridos (message, negocio_id).');
        }

        // Initialize Supabase client
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const supabaseClient = createClient(supabaseUrl, supabaseKey);

        // 1. Resolve Time & Date Context
        const mxDate = new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City", hour12: true });

        // Calculate date ranges: 45 days ago to 45 days in the future for wider context
        const now = new Date();
        const pastDateObj = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000);
        const futureDateObj = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);

        // Format to YYYY-MM-DD to avoid timezone offset issues in the basic >= <= string comparison
        const formatYMD = (d: Date) => d.toISOString().split('T')[0];
        const pastDate = formatYMD(pastDateObj);
        const futureDate = formatYMD(futureDateObj);

        // 2. Query Recent and Upcoming Appointments (To give the bot context)
        let query = supabaseClient
            .from('citas')
            .select(`
                id, fecha_hora_inicio, estado, total_pagado, servicio,
                clientes_bot(nombre, telefono), 
                empleados(nombre),
                sucursales(nombre)
            `)
            .eq('negocio_id', negocio_id)
            .gte('fecha_hora_inicio', pastDate)
            .lte('fecha_hora_inicio', futureDate)
            .order('fecha_hora_inicio', { ascending: true })
            .limit(300); // Allow up to 300 appointments to control token usage but allow better reporting

        if (sucursal_id) {
            query = query.eq('sucursal_id', sucursal_id);
        }

        const { data: citas, error: citasError } = await query;
        if (citasError) console.error("Error fetching citas:", citasError);

        console.log(`Query parameters -> negocio_id: ${negocio_id}, sucursal_id: ${sucursal_id}`);
        console.log(`Query dates -> ${pastDate} to ${futureDate}`);
        console.log(`Appointments fetched: ${citas?.length || 0}`);

        // Convert the appointments to a readable string for the AI
        const citasText = citas && citas.length > 0
            ? citas.map((c: any) => `- [Cita ID ${c.id}] Fecha: ${new Date(c.fecha_hora_inicio).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })} | Cliente: ${c.clientes_bot?.nombre} | Servicio: ${c.servicio} | Profesional: ${c.empleados?.nombre} | Sucursal: ${c.sucursales?.nombre} | Estado: ${c.estado} | Pagado: $${c.total_pagado || 0}`).join('\n')
            : 'No se encontraron citas recientes o próximas.';

        // 2.5 Query all existing branches for the business so the AI knows they exist even without appointments
        // SECURITY FIX: If the user is a branch user (sucursal_id is provided), ONLY show their specific branch
        let sucursalesQuery = supabaseClient
            .from('sucursales')
            .select('nombre, direccion')
            .eq('negocio_id', negocio_id);

        if (sucursal_id) {
            sucursalesQuery = sucursalesQuery.eq('id', sucursal_id);
        }

        const { data: sucursales } = await sucursalesQuery;

        const sucursalesText = sucursales && sucursales.length > 0
            ? sucursales.map((s: any) => `- ${s.nombre} (${s.direccion || 'Sin dirección'})`).join('\n')
            : 'No se encontraron sucursales registradas.';

        // 3. Build the prompt for Gemini
        const systemPrompt = `
Eres un Analista y Asistente Virtual Avanzado de Inteligencia Artificial (basado en Gemini) integrado en el panel de control administrativo (Dashboard) de las barberías/salones Kyros.
Tu trabajo es asistir a los dueños, administradores o recepcionistas respondiendo a sus consultas usando ÚNICAMENTE la información de su base de datos provista. Eres capaz de hacer reportes, analizar ganancias y rendimiento de empleados.

=== CONTEXTO DEL SISTEMA (CRÍTICO) ===
FECHA Y HORA ACTUAL DEL SISTEMA (Hora de Ciudad de México): ${mxDate}
Toda referencia a "hoy", "mañana", "ayer", "la semana pasada", "este mes" o "hace X días" debe calcularse matemáticamente hacia atrás o adelante usando la fecha actual del sistema.

=== SUCURSALES REGISTRADAS ===
Estas son TODAS las sucursales que pertenecen al negocio (incluso si no tienen citas recientes):
${sucursalesText}

=== DATOS DE LA AGENDA Y FINANZAS GLOABLES (ÚLTIMOS 45 DÍAS Y PRÓXIMOS 45 DÍAS) ===
A continuación, un extracto en tiempo real de la base de datos de los últimos 45 días y próximos 45 días (Hasta de 300 citas):
${citasText}

=== INSTRUCCIONES ESTRICTAS ===
1. Responde de forma muy profesional, analítica, clara y concisa (ideal para administradores con prisa). Usa markdown para negritas y listas. Puedes usar emojis gerenciales (📊, 💰, 📅, 💇‍♂️) sin exagerar.
2. Si el usuario pide "un reporte de ganancias" o "cuánto gané", suma matemáticamente la columna "Pagado:" de todas las citas suministradas en el extracto que tengan el estado 'completada' (o las fechas que pidan) y dale el total en pesos MXN y un desglose de qué empleado o sucursal generó más dinero. No desgloses cita por cita a menos que te lo pidan.
3. Si el usuario pide el rendimiento de las sucursales, cuenta el número de citas y los ingresos totales divididos por "Sucursal".
4. Eres capaz de identificar a los mejores clientes, los servicios más populares y al mejor barbero sumando frecuencias en los datos. No digas "no tengo acceso", haz los cálculos tú mismo con el extracto de arriba.
5. Si preguntan si un cliente en específico tiene citas, busca su nombre en el extracto y diles el resultado.
6. Si preguntan cosas fuera del lapso de 45 días al pasado/futuro, infórmales educadamente que tu memoria abarca los últimos y próximos 45 días (o un tope de 300 citas en pantalla) para optimizar rendimiento.
7. OMITIR ACLARACIONES INNECESARIAS. Simplemente entrega los cálculos de forma segura y directa como si fueras un sistema contable. No digas "Según los datos que me proporcionaste".
        `.trim();

        // 4. Send request to Gemini API
        const contents = [
            { role: 'user', parts: [{ text: systemPrompt }] },
            { role: 'model', parts: [{ text: 'Entendido. Estoy listo para asistir al administrador usando solo los datos provistos y la fecha y hora indicadas.' }] },
            { role: 'user', parts: [{ text: message }] }
        ];

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents,
                    generationConfig: {
                        temperature: 0.3, // Low temperature for administrative facts
                        maxOutputTokens: 8192
                    }
                })
            }
        );

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Gemini API Error: ${errText}`);
        }

        const data = await response.json();
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No pude generar una respuesta.';

        return new Response(
            JSON.stringify({ reply: responseText }), // Match expected format in ai-chat.ts
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );

    } catch (error: any) {
        console.error('AI Chat Error:', error);
        return new Response(
            JSON.stringify({ reply: `ERROR INTERNO: ${error.message || error}` }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
    }
});
