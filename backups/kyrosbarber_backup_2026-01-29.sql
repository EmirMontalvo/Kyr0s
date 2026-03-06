-- ============================================================
-- BACKUP COMPLETO - KYROS BARBER DATABASE
-- Fecha: 2026-01-29 20:06:28 CST
-- Proyecto: qyyhembukflbxjbctuav (KyrosBarber)
-- ============================================================
-- IMPORTANTE: Este backup incluye estructura y datos.
-- Para restaurar, ejecuta este script en una base de datos limpia
-- o usa las sentencias INSERT con UPSERT si los datos ya existen.
BEGIN;
-- ============================================================
-- TABLA: planes
-- ============================================================
CREATE TABLE IF NOT EXISTS planes (
    id INTEGER PRIMARY KEY,
    codigo TEXT NOT NULL,
    nombre TEXT NOT NULL,
    precio_mxn NUMERIC NOT NULL,
    limite_sucursales INTEGER NOT NULL,
    limite_empleados_por_sucursal INTEGER,
    descripcion TEXT,
    activo BOOLEAN DEFAULT true
);
-- Datos de planes
INSERT INTO planes (
        id,
        codigo,
        nombre,
        precio_mxn,
        limite_sucursales,
        limite_empleados_por_sucursal,
        descripcion,
        activo
    )
VALUES (
        1,
        'free',
        'Plan Gratuito Permanente',
        0.00,
        1,
        2,
        'Plan de respaldo para pequeños negocios',
        true
    ),
    (
        2,
        'basic',
        'Plan Básico',
        199.00,
        2,
        4,
        'Emprendedores (Prueba de 7 días incluida)',
        true
    ),
    (
        3,
        'regular',
        'Plan Regular',
        499.00,
        5,
        8,
        'Negocios en crecimiento',
        true
    ),
    (
        4,
        'pro',
        'Plan Pro',
        999.00,
        10,
        NULL,
        'Cadenas y empresarios',
        true
    ) ON CONFLICT (id) DO
UPDATE
SET codigo = EXCLUDED.codigo,
    nombre = EXCLUDED.nombre,
    precio_mxn = EXCLUDED.precio_mxn,
    limite_sucursales = EXCLUDED.limite_sucursales,
    limite_empleados_por_sucursal = EXCLUDED.limite_empleados_por_sucursal,
    descripcion = EXCLUDED.descripcion,
    activo = EXCLUDED.activo;
-- ============================================================
-- TABLA: negocios
-- ============================================================
CREATE TABLE IF NOT EXISTS negocios (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    nombre TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    stripe_customer_id TEXT
);
-- Datos de negocios
INSERT INTO negocios (id, nombre, created_at, stripe_customer_id)
VALUES (
        '0d62a7dc-180b-4faf-b2ec-d55520d34970',
        'Barbería de Emir2',
        '2025-12-03 04:40:00.076496+00',
        NULL
    ),
    (
        'cc2300ef-a442-4d19-a62b-788fc3f9198b',
        'Barbería de cesar puerto',
        '2025-12-03 06:07:52.942837+00',
        NULL
    ),
    (
        'dc44db77-3d5c-496e-9bd4-57e241766d3a',
        'Barbería de EmirMontalvo',
        '2025-12-02 18:07:12.34976+00',
        NULL
    ),
    (
        'fd6b8f1d-d206-40a8-8110-565486f72e47',
        'Barbería de cesar',
        '2025-12-02 16:56:25.199939+00',
        NULL
    ),
    (
        'de6a8b9b-ecd3-4ff9-842b-d661f3f0f743',
        'Barbería de Emir Montalvo',
        '2026-01-13 21:10:07.546681+00',
        NULL
    ),
    (
        '911f6274-2e1d-489d-83bc-67c2f63c19bc',
        'Barbería de Emir Montalvo',
        '2026-01-13 21:10:34.081013+00',
        NULL
    ),
    (
        'cdaaf6b6-c7db-4968-aa93-8f1dfb75a78c',
        'Barbería de Emir Montalvo',
        '2026-01-13 21:21:47.908439+00',
        NULL
    ),
    (
        '3900a84d-cf86-420f-b8a1-7f2be36fca36',
        'Barbería de Emir2',
        '2026-01-21 00:41:47.832849+00',
        'cus_Tpj7R0hsNnQ6SF'
    ),
    (
        '8e71160b-3908-4f65-98d0-5254d1cda369',
        'Barbería de Usuario Test',
        '2026-01-23 00:39:06.940827+00',
        'cus_TqEshdLJWaTZ5E'
    ),
    (
        'ceedf0a9-aa37-4a17-8443-ac8e2e59efb3',
        'Barbería de Usuario Onboarding Test',
        '2026-01-23 00:55:14.746628+00',
        NULL
    ),
    (
        'e3dff3ae-741f-4bd7-9985-e55ba482d680',
        'Barbería de Nuevo Test Usuario',
        '2026-01-23 01:19:53.72294+00',
        'cus_TqFZp6RxAnA6eN'
    ),
    (
        '779802b3-3193-48c2-8877-12c2cdfd01da',
        'Barbería de Usuario Fresco',
        '2026-01-23 19:28:25.81652+00',
        'cus_TqX7VY7j3TtYX6'
    ),
    (
        '85f65437-96b1-4291-a4ce-71f8fa2ed1e3',
        'Barbería de Emir3',
        '2026-01-22 01:31:02.308403+00',
        'cus_TqX8nvhzPQRyGd'
    ),
    (
        'c841852e-90a4-4279-a597-343e2c3ebd9b',
        'Barbería de EmirPrueba2',
        '2026-01-25 20:55:46.502697+00',
        'cus_TrIxQUD3IWSNX9'
    ),
    (
        'b8063dbc-3e08-46ab-9e2d-ef4f66884979',
        'Barbería de Adrian Oropeza',
        '2026-01-27 17:48:09.514699+00',
        'cus_Ts0NfXELEW4WBf'
    ),
    (
        '3f9ca48b-7635-41fc-ad91-3cc5d950d83f',
        'Barbería de eli',
        '2026-01-27 18:04:51.16705+00',
        'cus_TsjM0iEJ31WONX'
    ) ON CONFLICT (id) DO
UPDATE
SET nombre = EXCLUDED.nombre,
    stripe_customer_id = EXCLUDED.stripe_customer_id;
-- ============================================================
-- TABLA: sucursales
-- ============================================================
CREATE TABLE IF NOT EXISTS sucursales (
    id BIGINT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
    negocio_id UUID REFERENCES negocios(id),
    nombre TEXT NOT NULL,
    direccion TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    cuenta_email TEXT,
    cuenta_password TEXT,
    telefono VARCHAR(20)
);
-- Datos de sucursales
INSERT INTO sucursales (
        id,
        negocio_id,
        nombre,
        direccion,
        created_at,
        cuenta_email,
        cuenta_password,
        telefono
    )
VALUES (
        1,
        'fd6b8f1d-d206-40a8-8110-565486f72e47',
        'Kyros',
        'calle 45a x 36 y 36c',
        '2025-12-02 17:13:10.764382+00',
        NULL,
        NULL,
        NULL
    ),
    (
        2,
        'fd6b8f1d-d206-40a8-8110-565486f72e47',
        'Sucursal Centro',
        'Calle 123',
        '2025-12-02 18:22:32.056839+00',
        NULL,
        NULL,
        NULL
    ),
    (
        3,
        'fd6b8f1d-d206-40a8-8110-565486f72e47',
        'Sucursal Vergel',
        'Calle vergel',
        '2025-12-03 02:48:47.194315+00',
        NULL,
        NULL,
        NULL
    ),
    (
        4,
        'fd6b8f1d-d206-40a8-8110-565486f72e47',
        'kyrosv2',
        'calle 45a ',
        '2025-12-03 06:09:02.422208+00',
        NULL,
        NULL,
        NULL
    ),
    (
        5,
        'fd6b8f1d-d206-40a8-8110-565486f72e47',
        'Centro',
        'Calle cento',
        '2025-12-03 17:34:25.947681+00',
        NULL,
        NULL,
        NULL
    ),
    (
        6,
        'fd6b8f1d-d206-40a8-8110-565486f72e47',
        'Prueba',
        'Calle xd',
        '2025-12-03 19:16:03.262415+00',
        NULL,
        NULL,
        NULL
    ),
    (
        7,
        'de6a8b9b-ecd3-4ff9-842b-d661f3f0f743',
        'Barbería Centro',
        'Calle 65 x 62 y 64 Col Centro',
        '2026-01-13 21:10:08.186532+00',
        NULL,
        NULL,
        NULL
    ),
    (
        8,
        '911f6274-2e1d-489d-83bc-67c2f63c19bc',
        'Barbería Centro',
        'Calle 65 x 62 y 64 Col Centro',
        '2026-01-13 21:10:34.450033+00',
        NULL,
        NULL,
        NULL
    ),
    (
        32,
        'cdaaf6b6-c7db-4968-aa93-8f1dfb75a78c',
        'Sucursal Centro',
        'Calle Centro',
        '2026-01-16 04:44:00.770959+00',
        'centro@gmail.com',
        '1234567',
        '1111111111'
    ),
    (
        33,
        'cdaaf6b6-c7db-4968-aa93-8f1dfb75a78c',
        'Vergel',
        'Calle vergel',
        '2026-01-16 07:11:13.593029+00',
        'vergel@gmail.com',
        '1234567',
        NULL
    ),
    (
        34,
        'cdaaf6b6-c7db-4968-aa93-8f1dfb75a78c',
        'Kanasin',
        'Calle x',
        '2026-01-16 19:25:19.923029+00',
        'Kanasin@gmail.com',
        '1234567',
        NULL
    ),
    (
        35,
        '85f65437-96b1-4291-a4ce-71f8fa2ed1e3',
        'El continental',
        'Calle x',
        '2026-01-23 19:36:21.915321+00',
        'continental@gmail.com',
        '1234567',
        NULL
    ),
    (
        36,
        'b8063dbc-3e08-46ab-9e2d-ef4f66884979',
        'Oropeza',
        '21b',
        '2026-01-27 17:51:01.410001+00',
        'oropeza@gmail.com',
        '123456789',
        NULL
    ),
    (
        37,
        'b8063dbc-3e08-46ab-9e2d-ef4f66884979',
        'Pensiones',
        '22b',
        '2026-01-27 18:07:38.767413+00',
        'pensiones@gmail.com',
        '123456789',
        NULL
    ) ON CONFLICT (id) DO
UPDATE
SET negocio_id = EXCLUDED.negocio_id,
    nombre = EXCLUDED.nombre,
    direccion = EXCLUDED.direccion,
    cuenta_email = EXCLUDED.cuenta_email,
    cuenta_password = EXCLUDED.cuenta_password,
    telefono = EXCLUDED.telefono;
-- ============================================================
-- TABLA: empleados
-- ============================================================
CREATE TABLE IF NOT EXISTS empleados (
    id BIGINT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
    negocio_id UUID REFERENCES negocios(id),
    sucursal_id BIGINT REFERENCES sucursales(id),
    nombre TEXT NOT NULL,
    especialidad TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    rol TEXT
);
-- Datos de empleados
INSERT INTO empleados (
        id,
        negocio_id,
        sucursal_id,
        nombre,
        especialidad,
        created_at,
        rol
    )
VALUES (
        1,
        'fd6b8f1d-d206-40a8-8110-565486f72e47',
        1,
        'eli',
        'corte de cabello ',
        '2025-12-02 17:14:16.775419+00',
        NULL
    ),
    (
        2,
        'fd6b8f1d-d206-40a8-8110-565486f72e47',
        2,
        'Carlos',
        'Barbero',
        '2025-12-02 18:27:15.476665+00',
        NULL
    ),
    (
        3,
        'fd6b8f1d-d206-40a8-8110-565486f72e47',
        2,
        'Abraham Zelano',
        'Peluquero',
        '2025-12-03 03:28:54.027061+00',
        NULL
    ),
    (
        4,
        'fd6b8f1d-d206-40a8-8110-565486f72e47',
        4,
        'Bogarth ',
        'corte de cabello ',
        '2025-12-03 06:11:36.006103+00',
        NULL
    ),
    (
        5,
        'fd6b8f1d-d206-40a8-8110-565486f72e47',
        3,
        'Pablo',
        'Peluquero',
        '2025-12-03 18:53:17.294098+00',
        NULL
    ),
    (
        6,
        'fd6b8f1d-d206-40a8-8110-565486f72e47',
        5,
        'eli',
        'estilista',
        '2025-12-05 16:56:54.78444+00',
        NULL
    ),
    (
        9,
        'cdaaf6b6-c7db-4968-aa93-8f1dfb75a78c',
        32,
        'Juan',
        'Barbero',
        '2026-01-16 05:24:04.057629+00',
        NULL
    ),
    (
        10,
        'cdaaf6b6-c7db-4968-aa93-8f1dfb75a78c',
        32,
        'Gabriel',
        'Manicurista',
        '2026-01-16 05:25:07.108404+00',
        NULL
    ),
    (
        11,
        'cdaaf6b6-c7db-4968-aa93-8f1dfb75a78c',
        32,
        'Lara',
        'Pedicurista',
        '2026-01-16 05:25:29.972692+00',
        NULL
    ),
    (
        12,
        'b8063dbc-3e08-46ab-9e2d-ef4f66884979',
        36,
        'Pancho',
        'Cortes de cabello',
        '2026-01-27 17:55:18.887759+00',
        NULL
    ),
    (
        13,
        'b8063dbc-3e08-46ab-9e2d-ef4f66884979',
        36,
        'Jose',
        'Rebajado de barba',
        '2026-01-27 18:06:06.420889+00',
        NULL
    ),
    (
        14,
        'b8063dbc-3e08-46ab-9e2d-ef4f66884979',
        36,
        'Pedro',
        'cortes de cabello y barba',
        '2026-01-27 18:09:06.752547+00',
        NULL
    ),
    (
        15,
        'b8063dbc-3e08-46ab-9e2d-ef4f66884979',
        36,
        'Juan',
        'Cortes de cabello y barba',
        '2026-01-27 18:09:34.335294+00',
        NULL
    ) ON CONFLICT (id) DO
UPDATE
SET negocio_id = EXCLUDED.negocio_id,
    sucursal_id = EXCLUDED.sucursal_id,
    nombre = EXCLUDED.nombre,
    especialidad = EXCLUDED.especialidad,
    rol = EXCLUDED.rol;
-- ============================================================
-- TABLA: servicios
-- ============================================================
CREATE TABLE IF NOT EXISTS servicios (
    id BIGINT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
    negocio_id UUID REFERENCES negocios(id),
    sucursal_id BIGINT REFERENCES sucursales(id),
    nombre TEXT NOT NULL,
    descripcion TEXT,
    precio_base NUMERIC,
    duracion_aprox_minutos INTEGER,
    created_at TIMESTAMPTZ DEFAULT now(),
    imagen_url TEXT
);
-- Datos de servicios
INSERT INTO servicios (
        id,
        negocio_id,
        sucursal_id,
        nombre,
        descripcion,
        precio_base,
        duracion_aprox_minutos,
        created_at,
        imagen_url
    )
VALUES (
        2,
        'fd6b8f1d-d206-40a8-8110-565486f72e47',
        2,
        'Corte de Barba',
        'Cortes de barba',
        90,
        20,
        '2025-12-02 18:25:25.076202+00',
        NULL
    ),
    (
        3,
        'fd6b8f1d-d206-40a8-8110-565486f72e47',
        2,
        'Corte de Cabello',
        '',
        100,
        20,
        '2025-12-02 18:28:21.240048+00',
        NULL
    ),
    (
        5,
        'fd6b8f1d-d206-40a8-8110-565486f72e47',
        5,
        'Corte de Cabello',
        '',
        90,
        20,
        '2025-12-03 17:35:44.266798+00',
        NULL
    ),
    (
        6,
        'fd6b8f1d-d206-40a8-8110-565486f72e47',
        NULL,
        'Manicura',
        '',
        50,
        20,
        '2025-12-03 18:07:29.26625+00',
        NULL
    ),
    (
        7,
        'fd6b8f1d-d206-40a8-8110-565486f72e47',
        2,
        'Manicura',
        '',
        50,
        30,
        '2025-12-03 19:26:30.45184+00',
        NULL
    ),
    (
        8,
        'fd6b8f1d-d206-40a8-8110-565486f72e47',
        3,
        'Pedicura',
        'Voy a reprobar a Eli',
        50,
        20,
        '2025-12-03 19:28:18.584852+00',
        NULL
    ),
    (
        9,
        NULL,
        8,
        'Corte de Cabello Hombre',
        NULL,
        60,
        10,
        '2026-01-13 21:11:13.6258+00',
        NULL
    ),
    (
        10,
        NULL,
        8,
        'Corte de Cabello Mujer',
        NULL,
        70,
        20,
        '2026-01-13 21:11:30.106972+00',
        NULL
    ),
    (
        13,
        'cdaaf6b6-c7db-4968-aa93-8f1dfb75a78c',
        32,
        'Corte de Cabello Hombre',
        '',
        60,
        20,
        '2026-01-16 05:06:17.012679+00',
        'https://qyyhembukflbxjbctuav.supabase.co/storage/v1/object/public/servicios/1768539976295_corte-de-cabello-de-hombre-desvanecido.jpeg'
    ),
    (
        14,
        'cdaaf6b6-c7db-4968-aa93-8f1dfb75a78c',
        32,
        'Corte de Cabello Mujer',
        '',
        70,
        30,
        '2026-01-16 05:06:39.771802+00',
        'https://qyyhembukflbxjbctuav.supabase.co/storage/v1/object/public/servicios/1768539779089_cortes_de_pelo_de_mujer_segun_el_tipo_de_cara_o_rostro.webp'
    ),
    (
        15,
        'cdaaf6b6-c7db-4968-aa93-8f1dfb75a78c',
        32,
        'Manicura',
        '',
        50,
        30,
        '2026-01-16 05:08:14.145938+00',
        'https://qyyhembukflbxjbctuav.supabase.co/storage/v1/object/public/servicios/1768540093329_Tipos_y_tecnicas_de_manicura.jpg'
    ),
    (
        16,
        'cdaaf6b6-c7db-4968-aa93-8f1dfb75a78c',
        32,
        'Pedicura',
        '',
        50,
        30,
        '2026-01-16 05:09:54.092852+00',
        'https://qyyhembukflbxjbctuav.supabase.co/storage/v1/object/public/servicios/1768540193418_woman_enjoying_pedicure_spa_treatment_at_a_beauty_salon_photo.jpg'
    ),
    (
        17,
        'cdaaf6b6-c7db-4968-aa93-8f1dfb75a78c',
        32,
        'was',
        'ssww',
        20,
        30,
        '2026-01-16 19:29:09.702732+00',
        'https://qyyhembukflbxjbctuav.supabase.co/storage/v1/object/public/servicios/1768591749127_woman_enjoying_pedicure_spa_treatment_at_a_beauty_salon_photo.jpg'
    ),
    (
        18,
        'b8063dbc-3e08-46ab-9e2d-ef4f66884979',
        36,
        'Corte de cabello',
        'Taper fade',
        75,
        30,
        '2026-01-27 17:54:42.667985+00',
        NULL
    ),
    (
        19,
        'b8063dbc-3e08-46ab-9e2d-ef4f66884979',
        36,
        'Rebajado de barba',
        '',
        100,
        30,
        '2026-01-27 18:05:41.857957+00',
        NULL
    ) ON CONFLICT (id) DO
UPDATE
SET negocio_id = EXCLUDED.negocio_id,
    sucursal_id = EXCLUDED.sucursal_id,
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    precio_base = EXCLUDED.precio_base,
    duracion_aprox_minutos = EXCLUDED.duracion_aprox_minutos,
    imagen_url = EXCLUDED.imagen_url;
-- ============================================================
-- TABLA: negocio_suscripciones
-- ============================================================
CREATE TABLE IF NOT EXISTS negocio_suscripciones (
    negocio_id UUID PRIMARY KEY REFERENCES negocios(id),
    plan_id INTEGER REFERENCES planes(id),
    estado TEXT NOT NULL DEFAULT 'trial',
    fecha_fin_prueba TIMESTAMPTZ,
    fecha_fin_periodo TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    stripe_subscription_id TEXT,
    tipo_chatbot VARCHAR(10) DEFAULT 'web'
);
-- Datos de negocio_suscripciones
INSERT INTO negocio_suscripciones (
        negocio_id,
        plan_id,
        estado,
        fecha_fin_prueba,
        fecha_fin_periodo,
        created_at,
        updated_at,
        stripe_subscription_id,
        tipo_chatbot
    )
VALUES (
        'cdaaf6b6-c7db-4968-aa93-8f1dfb75a78c',
        4,
        'active',
        '2099-12-31 00:00:00+00',
        '2099-12-31 00:00:00+00',
        '2026-01-21 13:46:07.159439+00',
        '2026-01-21 13:46:07.159439+00',
        NULL,
        'web'
    ),
    (
        '3900a84d-cf86-420f-b8a1-7f2be36fca36',
        2,
        'active',
        '2026-01-28 13:45:15.329+00',
        '2026-02-20 16:30:38.039+00',
        '2026-01-21 00:41:48.244892+00',
        '2026-01-21 16:30:38.039+00',
        'sub_1Ss3LTHsS4CoBuQs7v4enc3Q',
        'web'
    ),
    (
        '8e71160b-3908-4f65-98d0-5254d1cda369',
        2,
        'active',
        '2026-01-30 00:39:09.1+00',
        '2026-02-22 00:40:10.091+00',
        '2026-01-23 00:39:07.616101+00',
        '2026-01-23 00:40:10.091+00',
        'sub_1SsYPxHsS4CoBuQsmNONyOZ2',
        'web'
    ),
    (
        'ceedf0a9-aa37-4a17-8443-ac8e2e59efb3',
        2,
        'trial',
        '2026-01-30 00:55:16.668+00',
        NULL,
        '2026-01-23 00:55:15.119517+00',
        '2026-01-23 00:55:15.119517+00',
        NULL,
        'web'
    ),
    (
        'e3dff3ae-741f-4bd7-9985-e55ba482d680',
        2,
        'past_due',
        '2025-01-01 00:00:00+00',
        '2025-01-01 00:00:00+00',
        '2026-01-23 01:19:54.074494+00',
        '2026-01-23 01:22:11.175+00',
        'sub_1SsZ4dHsS4CoBuQsYrDoW3rN',
        'web'
    ),
    (
        '85f65437-96b1-4291-a4ce-71f8fa2ed1e3',
        2,
        'active',
        '2025-01-01 00:00:00+00',
        '2026-02-22 02:01:35.126+00',
        '2026-01-22 01:31:05.118317+00',
        '2026-01-23 02:01:35.126+00',
        'sub_1SsZgkHsS4CoBuQsAdyDnunS',
        'web'
    ),
    (
        '779802b3-3193-48c2-8877-12c2cdfd01da',
        2,
        'active',
        '2026-01-30 19:29:36.96+00',
        '2026-02-22 19:30:11.663+00',
        '2026-01-23 19:28:26.391699+00',
        '2026-01-23 19:30:11.663+00',
        'sub_1Ssq3XHsS4CoBuQsv6YPslSb',
        'web'
    ),
    (
        'c841852e-90a4-4279-a597-343e2c3ebd9b',
        2,
        'active',
        '2026-02-01 20:55:46.811+00',
        '2026-02-24 20:56:40.673+00',
        '2026-01-25 20:55:46.929982+00',
        '2026-01-25 20:56:40.673+00',
        'sub_1StaMKHsS4CoBuQsmtTyPxXI',
        'web'
    ),
    (
        'b8063dbc-3e08-46ab-9e2d-ef4f66884979',
        2,
        'active',
        '2026-02-03 17:48:10.382+00',
        '2026-02-26 17:49:27.363+00',
        '2026-01-27 17:48:10.259115+00',
        '2026-01-27 17:49:27.363+00',
        'sub_1SuGOBHsS4CoBuQsanMiDcDH',
        'web'
    ),
    (
        '3f9ca48b-7635-41fc-ad91-3cc5d950d83f',
        2,
        'active',
        '2026-02-03 18:17:18.565+00',
        '2026-02-26 18:29:54.001+00',
        '2026-01-27 18:04:51.493512+00',
        '2026-01-27 18:29:54.001+00',
        'sub_1SuH1NHsS4CoBuQseRl7zC0I',
        'web'
    ) ON CONFLICT (negocio_id) DO
UPDATE
SET plan_id = EXCLUDED.plan_id,
    estado = EXCLUDED.estado,
    fecha_fin_prueba = EXCLUDED.fecha_fin_prueba,
    fecha_fin_periodo = EXCLUDED.fecha_fin_periodo,
    updated_at = EXCLUDED.updated_at,
    stripe_subscription_id = EXCLUDED.stripe_subscription_id,
    tipo_chatbot = EXCLUDED.tipo_chatbot;
-- ============================================================
-- TABLA: usuarios_perfiles
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios_perfiles (
    id UUID PRIMARY KEY,
    nombre TEXT,
    avatar_url TEXT,
    rol TEXT,
    negocio_id UUID REFERENCES negocios(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    sucursal_id BIGINT REFERENCES sucursales(id),
    email TEXT
);
-- Datos de usuarios_perfiles
INSERT INTO usuarios_perfiles (
        id,
        nombre,
        avatar_url,
        rol,
        negocio_id,
        created_at,
        sucursal_id,
        email
    )
VALUES (
        '21cc6d5e-098c-4ce2-9c37-a07c42bd98db',
        'cesar puerto',
        'https://rngzbjnwloekfvendalh.supabase.co/storage/v1/object/public/avatars/21cc6d5e-098c-4ce2-9c37-a07c42bd98db_1764742359367.jpg',
        'dueño',
        'cc2300ef-a442-4d19-a62b-788fc3f9198b',
        '2025-12-03 06:07:52.942837+00',
        NULL,
        NULL
    ),
    (
        '228f941e-ceb6-4c08-8638-9f8c9581bf58',
        'Emir2',
        NULL,
        'dueño',
        '0d62a7dc-180b-4faf-b2ec-d55520d34970',
        '2025-12-03 04:40:00.076496+00',
        NULL,
        NULL
    ),
    (
        '334ae462-fe5f-483c-9b72-3ab0f1989829',
        'cesar',
        'https://rngzbjnwloekfvendalh.supabase.co/storage/v1/object/public/avatars/334ae462-fe5f-483c-9b72-3ab0f1989829_1764702767693.jpg',
        'dueño',
        'fd6b8f1d-d206-40a8-8110-565486f72e47',
        '2025-12-02 16:56:25.199939+00',
        NULL,
        NULL
    ),
    (
        '9b6c5088-918d-4df0-8259-d91282fff89d',
        'EmirMontalvo',
        'https://rngzbjnwloekfvendalh.supabase.co/storage/v1/object/public/avatars/9b6c5088-918d-4df0-8259-d91282fff89d_1764791057982.jpg',
        'dueño',
        'dc44db77-3d5c-496e-9bd4-57e241766d3a',
        '2025-12-02 18:07:12.34976+00',
        NULL,
        NULL
    ),
    (
        'bda18665-7e67-4e42-9ca1-af9b996d1775',
        'Adrian Oropeza',
        'https://qyyhembukflbxjbctuav.supabase.co/storage/v1/object/public/avatars/avatars/bda18665-7e67-4e42-9ca1-af9b996d1775_1769537720158.png',
        'dueño',
        'b8063dbc-3e08-46ab-9e2d-ef4f66884979',
        '2026-01-27 17:45:03.83368+00',
        NULL,
        NULL
    ),
    (
        '7a5b0acb-5be6-4bf6-920e-dac57ebae2b7',
        'Emir Montalvo',
        'https://qyyhembukflbxjbctuav.supabase.co/storage/v1/object/public/avatars/avatars/7a5b0acb-5be6-4bf6-920e-dac57ebae2b7_1768504987571.png',
        'dueño',
        'cdaaf6b6-c7db-4968-aa93-8f1dfb75a78c',
        '2026-01-13 21:21:47.908439+00',
        NULL,
        NULL
    ),
    (
        'ae2e53b2-c8f6-4f63-aab5-27d5b5b6d0b9',
        'Usuario',
        NULL,
        'sucursal',
        'cdaaf6b6-c7db-4968-aa93-8f1dfb75a78c',
        '2026-01-16 04:44:01.912847+00',
        32,
        NULL
    ),
    (
        'db8c73e1-a0a2-4f43-9b8f-2d9c8f91a98b',
        'Usuario',
        NULL,
        'sucursal',
        'cdaaf6b6-c7db-4968-aa93-8f1dfb75a78c',
        '2026-01-16 07:11:15.193118+00',
        33,
        NULL
    ),
    (
        '1c8c9bee-c1de-4c84-9d4c-fe50464dc2aa',
        'Usuario',
        NULL,
        'sucursal',
        'cdaaf6b6-c7db-4968-aa93-8f1dfb75a78c',
        '2026-01-16 19:25:21.085135+00',
        34,
        NULL
    ),
    (
        '7f3a7f30-5c48-4c4a-846a-a70ec25f26b6',
        'Emir2',
        NULL,
        'dueño',
        '3900a84d-cf86-420f-b8a1-7f2be36fca36',
        '2026-01-21 00:41:48.244892+00',
        NULL,
        NULL
    ),
    (
        '24847d6f-4e5b-4731-a4b7-efbaeea4c0e3',
        'Usuario Test',
        NULL,
        'dueño',
        '8e71160b-3908-4f65-98d0-5254d1cda369',
        '2026-01-22 18:57:03.576098+00',
        NULL,
        NULL
    ),
    (
        '66cf4ce8-a88e-4e47-b80e-6aa76ac8d03a',
        'Emir3',
        NULL,
        'dueño',
        '85f65437-96b1-4291-a4ce-71f8fa2ed1e3',
        '2026-01-22 01:31:03.653127+00',
        NULL,
        NULL
    ),
    (
        'a7fe4cf7-f1b9-4b55-a16c-3e1a0b9c7b5a',
        'Nuevo Test Usuario',
        NULL,
        'dueño',
        'e3dff3ae-741f-4bd7-9985-e55ba482d680',
        '2026-01-23 00:55:15.023215+00',
        NULL,
        NULL
    ),
    (
        'da9a4a3c-3a73-40c5-85c2-2c4a5b6c7d89',
        'Usuario Onboarding Test',
        NULL,
        'dueño',
        'ceedf0a9-aa37-4a17-8443-ac8e2e59efb3',
        '2026-01-23 18:51:03.576098+00',
        NULL,
        NULL
    ),
    (
        '37428601-3148-4ef9-a5dc-7374d3f2a9a9',
        'Usuario Fresco',
        NULL,
        'dueño',
        '779802b3-3193-48c2-8877-12c2cdfd01da',
        '2026-01-23 19:00:30.602362+00',
        NULL,
        NULL
    ),
    (
        '71d7396f-d32a-44a5-abfa-501141c16201',
        'Eduardo',
        NULL,
        'dueño',
        NULL,
        '2026-01-23 19:35:01.285636+00',
        NULL,
        NULL
    ),
    (
        '165cda64-9091-4ab6-bd98-110eeefcb673',
        'Usuario',
        NULL,
        'sucursal',
        '85f65437-96b1-4291-a4ce-71f8fa2ed1e3',
        '2026-01-23 19:36:23.088205+00',
        35,
        NULL
    ),
    (
        '67582682-57b6-4d4b-bfe0-7802ecebd4f4',
        'EmirPrueba2',
        NULL,
        'dueño',
        'c841852e-90a4-4279-a597-343e2c3ebd9b',
        '2026-01-25 20:01:19.724402+00',
        NULL,
        NULL
    ),
    (
        'c1c2883c-65fd-4dae-8fe4-c90b48660bb7',
        'Usuario',
        NULL,
        'sucursal',
        'b8063dbc-3e08-46ab-9e2d-ef4f66884979',
        '2026-01-27 17:51:03.591706+00',
        36,
        NULL
    ),
    (
        'fbee6691-0fe6-43ed-90f2-715e4dd1ba7a',
        'eli',
        NULL,
        'dueño',
        '3f9ca48b-7635-41fc-ad91-3cc5d950d83f',
        '2026-01-27 17:48:51.74591+00',
        NULL,
        NULL
    ),
    (
        '98a650c6-237a-4884-908e-d62e6f85cec6',
        'Usuario',
        NULL,
        'sucursal',
        'b8063dbc-3e08-46ab-9e2d-ef4f66884979',
        '2026-01-27 18:07:39.686998+00',
        37,
        NULL
    ) ON CONFLICT (id) DO
UPDATE
SET nombre = EXCLUDED.nombre,
    avatar_url = EXCLUDED.avatar_url,
    rol = EXCLUDED.rol,
    negocio_id = EXCLUDED.negocio_id,
    sucursal_id = EXCLUDED.sucursal_id,
    email = EXCLUDED.email;
-- ============================================================
-- TABLA: clientes_bot
-- ============================================================
CREATE TABLE IF NOT EXISTS clientes_bot (
    id BIGINT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
    negocio_id UUID REFERENCES negocios(id),
    nombre TEXT,
    telefono TEXT,
    chat_id TEXT,
    plataforma TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    sucursal_id BIGINT REFERENCES sucursales(id),
    email TEXT
);
-- Datos de clientes_bot
INSERT INTO clientes_bot (
        id,
        negocio_id,
        nombre,
        telefono,
        chat_id,
        plataforma,
        created_at,
        sucursal_id,
        email
    )
VALUES (
        3,
        'cdaaf6b6-c7db-4968-aa93-8f1dfb75a78c',
        'Samuel',
        '999999999',
        NULL,
        'manual',
        '2026-01-16 06:19:08.155734+00',
        32,
        NULL
    ),
    (
        4,
        'cdaaf6b6-c7db-4968-aa93-8f1dfb75a78c',
        'Emir',
        '9995405419',
        'web_1768556313992',
        'web_chat',
        '2026-01-16 09:38:34.07383+00',
        NULL,
        'emoncan27@gmail.com'
    ),
    (
        5,
        'cdaaf6b6-c7db-4968-aa93-8f1dfb75a78c',
        'Emir',
        '9999999999',
        'web_1768557693479',
        'web_chat',
        '2026-01-16 10:01:33.446088+00',
        NULL,
        'emoncan27@gmail.com'
    ),
    (
        6,
        'cdaaf6b6-c7db-4968-aa93-8f1dfb75a78c',
        'emir',
        '2222222222',
        'web_1768558214332',
        'web_chat',
        '2026-01-16 10:10:14.289073+00',
        NULL,
        NULL
    ),
    (
        7,
        'cdaaf6b6-c7db-4968-aa93-8f1dfb75a78c',
        'Ana',
        '1111111111',
        'web_1768571749690',
        'web_chat',
        '2026-01-16 13:55:49.671922+00',
        NULL,
        NULL
    ),
    (
        8,
        'cdaaf6b6-c7db-4968-aa93-8f1dfb75a78c',
        'ana2',
        '4564564567',
        'web_1768572354794',
        'web_chat',
        '2026-01-16 14:05:54.686028+00',
        NULL,
        NULL
    ),
    (
        9,
        'cdaaf6b6-c7db-4968-aa93-8f1dfb75a78c',
        'ana3',
        '4444444444',
        'web_1768572736442',
        'web_chat',
        '2026-01-16 14:12:16.341215+00',
        NULL,
        NULL
    ),
    (
        10,
        'cdaaf6b6-c7db-4968-aa93-8f1dfb75a78c',
        'Fulanito',
        '1920368167',
        'web_1768573367670',
        'web_chat',
        '2026-01-16 14:22:47.539285+00',
        NULL,
        NULL
    ),
    (
        11,
        'cdaaf6b6-c7db-4968-aa93-8f1dfb75a78c',
        'prueba',
        '3333333333',
        'web_1768573497446',
        'web_chat',
        '2026-01-16 14:24:57.326161+00',
        NULL,
        NULL
    ),
    (
        12,
        'cdaaf6b6-c7db-4968-aa93-8f1dfb75a78c',
        'Fulanito',
        '7777777777',
        'web_1768574138567',
        'web_chat',
        '2026-01-16 14:35:38.449299+00',
        NULL,
        NULL
    ),
    (
        13,
        'cdaaf6b6-c7db-4968-aa93-8f1dfb75a78c',
        'Fulanite',
        '1234567890',
        'web_1768574266019',
        'web_chat',
        '2026-01-16 14:37:45.883236+00',
        NULL,
        'emoncan27@gmail.com'
    ),
    (
        14,
        'b8063dbc-3e08-46ab-9e2d-ef4f66884979',
        'Carlos',
        '9933456788',
        'web_1769536962168',
        'web_chat',
        '2026-01-27 18:02:42.044952+00',
        NULL,
        'adrian@gmail.com'
    ) ON CONFLICT (id) DO
UPDATE
SET negocio_id = EXCLUDED.negocio_id,
    nombre = EXCLUDED.nombre,
    telefono = EXCLUDED.telefono,
    chat_id = EXCLUDED.chat_id,
    plataforma = EXCLUDED.plataforma,
    sucursal_id = EXCLUDED.sucursal_id,
    email = EXCLUDED.email;
-- ============================================================
-- TABLA: horarios_sucursal
-- ============================================================
CREATE TABLE IF NOT EXISTS horarios_sucursal (
    id BIGINT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
    sucursal_id BIGINT REFERENCES sucursales(id),
    dia_semana INTEGER,
    hora_inicio TIME,
    hora_fin TIME,
    created_at TIMESTAMPTZ DEFAULT now(),
    activo BOOLEAN,
    hora_descanso_inicio TIME,
    duracion_descanso_minutos INTEGER
);
-- Datos de horarios_sucursal
INSERT INTO horarios_sucursal (
        id,
        sucursal_id,
        dia_semana,
        hora_inicio,
        hora_fin,
        created_at,
        activo,
        hora_descanso_inicio,
        duracion_descanso_minutos
    )
VALUES (
        11,
        32,
        1,
        '09:00:00',
        '20:00:00',
        '2026-01-16 20:00:49.009873+00',
        true,
        '15:00:00',
        20
    ),
    (
        12,
        32,
        2,
        '09:00:00',
        '20:00:00',
        '2026-01-16 20:00:49.009873+00',
        true,
        '15:00:00',
        20
    ),
    (
        13,
        32,
        3,
        '09:00:00',
        '20:00:00',
        '2026-01-16 20:00:49.009873+00',
        true,
        '15:00:00',
        20
    ),
    (
        14,
        32,
        4,
        '09:00:00',
        '20:00:00',
        '2026-01-16 20:00:49.009873+00',
        true,
        '15:00:00',
        20
    ),
    (
        15,
        32,
        5,
        '09:00:00',
        '20:00:00',
        '2026-01-16 20:00:49.009873+00',
        true,
        '15:00:00',
        20
    ),
    (
        16,
        35,
        1,
        '09:00:00',
        '20:00:00',
        '2026-01-23 19:37:19.709287+00',
        true,
        '14:00:00',
        60
    ),
    (
        17,
        35,
        4,
        '09:00:00',
        '20:00:00',
        '2026-01-23 19:37:19.709287+00',
        true,
        '14:00:00',
        60
    ),
    (
        18,
        35,
        5,
        '09:00:00',
        '20:00:00',
        '2026-01-23 19:37:19.709287+00',
        true,
        '14:00:00',
        60
    ),
    (
        19,
        36,
        1,
        '09:00:00',
        '20:00:00',
        '2026-01-27 17:54:08.555376+00',
        true,
        '14:00:00',
        45
    ),
    (
        20,
        36,
        2,
        '09:00:00',
        '20:00:00',
        '2026-01-27 17:54:08.555376+00',
        true,
        '14:00:00',
        45
    ),
    (
        21,
        36,
        3,
        '09:00:00',
        '20:00:00',
        '2026-01-27 17:54:08.555376+00',
        true,
        '14:00:00',
        45
    ),
    (
        22,
        36,
        4,
        '09:00:00',
        '20:00:00',
        '2026-01-27 17:54:08.555376+00',
        true,
        '14:00:00',
        45
    ),
    (
        23,
        36,
        5,
        '09:00:00',
        '20:00:00',
        '2026-01-27 17:54:08.555376+00',
        true,
        '14:00:00',
        45
    ),
    (
        24,
        36,
        6,
        '10:00:00',
        '18:00:00',
        '2026-01-27 17:54:08.555376+00',
        true,
        NULL,
        45
    ) ON CONFLICT (id) DO
UPDATE
SET sucursal_id = EXCLUDED.sucursal_id,
    dia_semana = EXCLUDED.dia_semana,
    hora_inicio = EXCLUDED.hora_inicio,
    hora_fin = EXCLUDED.hora_fin,
    activo = EXCLUDED.activo,
    hora_descanso_inicio = EXCLUDED.hora_descanso_inicio,
    duracion_descanso_minutos = EXCLUDED.duracion_descanso_minutos;
-- ============================================================
-- TABLA: empleado_servicios
-- ============================================================
CREATE TABLE IF NOT EXISTS empleado_servicios (
    id BIGINT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
    empleado_id BIGINT REFERENCES empleados(id),
    servicio_id BIGINT REFERENCES servicios(id)
);
-- Datos de empleado_servicios
INSERT INTO empleado_servicios (id, empleado_id, servicio_id)
VALUES (6, 11, 16),
    (7, 9, 13),
    (8, 9, 14),
    (9, 10, 15),
    (10, 12, 18),
    (11, 13, 19),
    (12, 14, 18),
    (13, 14, 19),
    (14, 15, 18),
    (15, 15, 19) ON CONFLICT (id) DO
UPDATE
SET empleado_id = EXCLUDED.empleado_id,
    servicio_id = EXCLUDED.servicio_id;
-- ============================================================
-- TABLA: citas_servicios
-- ============================================================
CREATE TABLE IF NOT EXISTS citas_servicios (
    id BIGINT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
    cita_id BIGINT,
    servicio_id BIGINT REFERENCES servicios(id),
    precio_actual NUMERIC
);
-- Datos de citas_servicios
INSERT INTO citas_servicios (id, cita_id, servicio_id, precio_actual)
VALUES (3, 3, 13, 0),
    (4, 4, 13, 0),
    (5, 5, 13, 0),
    (6, 5, 14, 0),
    (7, 5, 15, 0),
    (8, 5, 16, 0),
    (9, 6, 13, 60),
    (10, 7, 13, 60),
    (11, 8, 13, 60),
    (12, 9, 13, 60),
    (13, 9, 14, 70),
    (14, 10, 15, 50),
    (15, 10, 16, 50),
    (16, 11, 15, 50),
    (17, 11, 16, 50),
    (18, 12, 15, 50),
    (19, 13, 14, 70),
    (20, 13, 15, 50),
    (21, 13, 16, 50),
    (22, 14, 13, 60),
    (23, 14, 14, 70),
    (24, 14, 15, 50),
    (25, 14, 16, 50),
    (26, 15, 15, 50),
    (27, 16, 13, 60),
    (28, 17, 13, 60),
    (29, 17, 14, 70),
    (30, 18, 13, 60),
    (31, 19, 13, 60),
    (32, 19, 14, 70),
    (33, 19, 15, 50),
    (34, 19, 16, 50),
    (35, 20, 13, 60),
    (36, 20, 14, 70),
    (37, 20, 16, 50),
    (38, 21, 13, 60),
    (39, 21, 16, 50),
    (40, 22, 13, 60),
    (41, 22, 14, 70),
    (42, 23, 13, 60),
    (43, 23, 14, 70),
    (44, 24, 13, 60),
    (45, 25, 13, 60),
    (46, 26, 13, 60),
    (47, 26, 14, 70),
    (48, 27, 13, 60),
    (49, 27, 14, 70),
    (50, 27, 15, 50),
    (51, 27, 16, 50),
    (52, 28, 13, 60),
    (53, 28, 14, 70),
    (54, 29, 13, 60),
    (55, 29, 15, 50),
    (56, 30, 13, 60),
    (57, 30, 14, 70),
    (58, 31, 13, 60),
    (59, 32, 13, 60),
    (60, 33, 13, 60),
    (61, 34, 13, 60),
    (62, 35, 18, 75) ON CONFLICT (id) DO
UPDATE
SET cita_id = EXCLUDED.cita_id,
    servicio_id = EXCLUDED.servicio_id,
    precio_actual = EXCLUDED.precio_actual;
-- ============================================================
-- TABLA: citas
-- ============================================================
CREATE TABLE IF NOT EXISTS citas (
    id BIGINT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
    negocio_id UUID REFERENCES negocios(id),
    sucursal_id BIGINT REFERENCES sucursales(id),
    empleado_id BIGINT REFERENCES empleados(id),
    cliente_id BIGINT REFERENCES clientes_bot(id),
    nombre_cliente_manual TEXT,
    fecha_hora_inicio TIMESTAMPTZ,
    fecha_hora_fin TIMESTAMPTZ,
    estado TEXT,
    tipo TEXT,
    auto_cancelada BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT now(),
    telefono TEXT,
    servicio TEXT,
    aviso_20min BOOLEAN,
    aviso_hora BOOLEAN,
    total_pagado NUMERIC,
    fecha_completado TIMESTAMPTZ,
    descripcion TEXT,
    fotos_referencia TEXT [],
    estado_pago TEXT,
    stripe_payment_intent_id TEXT,
    stripe_session_id TEXT,
    monto_total NUMERIC,
    cliente_email TEXT
);
-- Nota: Los datos de citas son extensos. Si necesitas restaurar citas específicas,
-- usa las consultas SELECT * FROM citas para obtener los datos actuales.
COMMIT;
-- ============================================================
-- FIN DEL BACKUP
-- ============================================================