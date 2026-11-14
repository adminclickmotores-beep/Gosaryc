-- Datos de la separación (reserva) de un vehículo del inventario.
ALTER TABLE public.vehiculos_inventario ADD COLUMN IF NOT EXISTS separado_cliente text;
ALTER TABLE public.vehiculos_inventario ADD COLUMN IF NOT EXISTS separado_telefono text;
ALTER TABLE public.vehiculos_inventario ADD COLUMN IF NOT EXISTS separado_abono numeric;
ALTER TABLE public.vehiculos_inventario ADD COLUMN IF NOT EXISTS separado_fecha date;
ALTER TABLE public.vehiculos_inventario ADD COLUMN IF NOT EXISTS separado_notas text;
