-- =====================================================
-- COMPRAS (GASTOS) - Jonathan Ramirez - Enero 2026
-- =====================================================
SELECT 
    co.id,
    co.tipo_compra,
    co.concepto,
    co.descripcion,
    co.fecha_compra,
    co.unidades,
    co.costo_total,
    co.facturado,
    co.pagado,
    co.concluido,
    co.notas,
    co.numero_factura,
    co.fecha_factura,
    co.fecha_pago_credito,
    co.fecha_creacion,
    co.fecha_actualizacion,
    co.eliminado,
    co.fecha_eliminacion,
    co.cotizacion_id,
    co.nomenclatura_id,
    co.oportunidad_id,
    co.proveedor_id,
    co.metodo_pago_id,
    co.fecha_pago_usuario,
    co.tipo_compra_proyecto,
    co.mano_obra_detalle,
    co.es_mano_obra,
    co.total_mano_obra,
    co.supervisor_id,
    co.fecha_concluido,
    co.fecha_facturado,
    co.fecha_pagado,
    s.nombre as supervisor_nombre,
    s.email as supervisor_email
FROM public.core_compra co
INNER JOIN public.core_supervisor s ON co.supervisor_id = s.id
WHERE co.supervisor_id = 11  -- Jonathan Ramirez
    AND co.fecha_compra >= '2026-01-01'
    AND co.fecha_compra <= '2026-01-31'
    AND co.eliminado = FALSE
ORDER BY co.fecha_compra DESC;

-- ===========================================================
-- COTIZACIONES (VENTAS) - Jonathan Ramirez - Enero 2026
-- Solo cotizaciones que tienen gastos asociados
-- ===========================================================
SELECT 
    c.*,
    s.nombre as supervisor_nombre,
    s.email as supervisor_email,
    (SELECT COUNT(*) 
     FROM public.core_compra co 
     WHERE co.cotizacion_id = c.id 
     AND co.eliminado = FALSE) as total_compras,
    (SELECT COALESCE(SUM(co.costo_total), 0) 
     FROM public.core_compra co 
     WHERE co.cotizacion_id = c.id 
     AND co.eliminado = FALSE) as monto_total_compras
FROM public.core_cotizacion c
INNER JOIN public.core_cotizacion_supervisores cs ON c.id = cs.cotizacion_id
INNER JOIN public.core_supervisor s ON cs.supervisor_id = s.id
WHERE cs.supervisor_id = 11  -- Jonathan Ramirez
    AND c.fecha_cotizacion >= '2026-01-01'
    AND c.fecha_cotizacion <= '2026-01-31'
    AND c.eliminado = FALSE
    AND EXISTS (
        SELECT 1 FROM public.core_compra co 
        WHERE co.cotizacion_id = c.id 
        AND co.eliminado = FALSE
    )
ORDER BY c.fecha_cotizacion DESC;