SELECT cc.id,
       cc.tipo_compra,
       cc.concepto,
       cc.descripcion,
       cc.fecha_compra,
       cc.unidades,
       cc.costo_total,
       cc.facturado,
       cc.pagado,
       cc.concluido,
       cc.notas,
       cc.numero_factura,
       cc.fecha_factura,
       cc.fecha_pago_credito,
       cc.fecha_creacion,
       cc.fecha_actualizacion,
       cc.eliminado,
       cc.fecha_eliminacion,
       cot.numero_cotizacion,
       nom.clave                AS nomenclatura,
       op.codigo_op,
       prov.nombre              AS proveedor,
       mp.alias                 AS metodo_pago,
       cc.fecha_pago_usuario,
       cc.tipo_compra_proyecto,
       cc.mano_obra_detalle,
       cc.es_mano_obra,
       cc.total_mano_obra,
       cc.supervisor_id,
       cc.fecha_concluido,
       cc.fecha_facturado,
       cc.fecha_pagado,
       cc.supervisor_responsable_compra_id
FROM public.core_compra cc
LEFT JOIN public.core_cotizacion  cot ON cc.cotizacion_id   = cot.id
LEFT JOIN public.core_nomenclatura nom ON cc.nomenclatura_id = nom.id
LEFT JOIN public.core_oportunidad  op  ON cc.oportunidad_id  = op.id
LEFT JOIN public.core_proveedor   prov ON cc.proveedor_id    = prov.id
LEFT JOIN public.core_tarjetapago  mp  ON cc.metodo_pago_id  = mp.id
WHERE cc.fecha_compra >= '2024-01-01' AND cc.fecha_compra <= '2026-04-30' AND cc.eliminado = false
ORDER BY cc.fecha_compra ASC;