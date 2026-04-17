-- Tabla para historial de conversaciones del chatbot IA
CREATE TABLE IF NOT EXISTS chat_histories (
    id SERIAL PRIMARY KEY,
    session_id TEXT NOT NULL UNIQUE,
    platform TEXT NOT NULL CHECK (platform IN ('telegram', 'whatsapp', 'web')),
    user_id TEXT NOT NULL,
    negocio_id INTEGER,
    sucursal_id INTEGER,
    messages JSONB DEFAULT '[]'::jsonb,
    current_step TEXT DEFAULT 'welcome',
    booking_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_chat_histories_session ON chat_histories(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_histories_user ON chat_histories(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_histories_negocio ON chat_histories(negocio_id);
CREATE INDEX IF NOT EXISTS idx_chat_histories_sucursal ON chat_histories(sucursal_id);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_chat_histories_updated_at ON chat_histories;
CREATE TRIGGER update_chat_histories_updated_at
    BEFORE UPDATE ON chat_histories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Políticas RLS (opcional, para seguridad)
ALTER TABLE chat_histories ENABLE ROW LEVEL SECURITY;

-- Política: permitir todo desde edge functions
CREATE POLICY "Allow all from edge functions" ON chat_histories
    FOR ALL
    TO authenticated, anon
    USING (true)
    WITH CHECK (true);
