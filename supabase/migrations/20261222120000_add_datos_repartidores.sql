-- Datos adicionales del repartidor: documento, tipo de vehículo y placa.
ALTER TABLE public.restaurante_repartidores
  ADD COLUMN IF NOT EXISTS documento text,
  ADD COLUMN IF NOT EXISTS vehiculo text,
  ADD COLUMN IF NOT EXISTS placa text;
