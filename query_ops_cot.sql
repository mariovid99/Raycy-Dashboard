-- ===========================================================
-- COTIZACIONES - Alejandro González - Enero 2026
-- Solo cotizaciones que están asignadas a una OP
-- ===========================================================
SELECT 
    c.*,
    s.nombre as supervisor_nombre,
    s.email as supervisor_email,
    o.id as oportunidad_id,
    o.codigo_op
FROM public.core_cotizacion c
INNER JOIN public.core_cotizacion_supervisores cs ON c.id = cs.cotizacion_id
INNER JOIN public.core_supervisor s ON cs.supervisor_id = s.id
INNER JOIN public.core_oportunidad_cotizaciones oc ON c.id = oc.cotizacion_id
INNER JOIN public.core_oportunidad o ON oc.oportunidad_id = o.id
WHERE cs.supervisor_id = 11  -- Alejandro González
    AND c.fecha_cotizacion >= '2026-01-01'
    AND c.fecha_cotizacion <= '2026-01-31'
    AND c.eliminado = FALSE
ORDER BY c.fecha_cotizacion DESC;

-- ===========================================================
-- OPORTUNIDADES - Relacionadas con cotizaciones de Alejandro González - Enero 2026
-- ===========================================================
SELECT 
    o.*
FROM public.core_oportunidad o
INNER JOIN public.core_cotizacion c ON o.id = c.id
INNER JOIN public.core_cotizacion_supervisores cs ON c.id = cs.cotizacion_id
WHERE cs.supervisor_id = 11  -- Alejandro González
    AND c.fecha_cotizacion >= '2026-01-01'
    AND c.fecha_cotizacion <= '2026-01-31'
    AND c.eliminado = FALSE
ORDER BY o.fecha_creacion DESC;