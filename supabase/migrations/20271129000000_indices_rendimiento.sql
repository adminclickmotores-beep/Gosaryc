-- Rendimiento ultrarrápido: índices compuestos por negocio + fecha/búsqueda.
-- Tablas reales del proyecto (owner_id = dueño del negocio). Sin triggers nuevos.
-- Solo CREATE INDEX IF NOT EXISTS: no borra ni altera datos.

CREATE INDEX IF NOT EXISTS idx_ventas_dueno_fecha
  ON restaurante_pedidos (owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ventas_dueno_estado
  ON restaurante_pedidos (owner_id, estado);

CREATE INDEX IF NOT EXISTS idx_movcaja_dueno_fecha
  ON restaurante_movimientos_caja (owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_movcaja_dueno_tipo
  ON restaurante_movimientos_caja (owner_id, tipo);

CREATE INDEX IF NOT EXISTS idx_asientos_dueno_fecha
  ON asientos_contables (owner_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_asientos_origen
  ON asientos_contables (owner_id, origen_tipo, origen_id);

CREATE INDEX IF NOT EXISTS idx_cuentas_dueno_codigo
  ON cuentas_contables (owner_id, codigo);

CREATE INDEX IF NOT EXISTS idx_clientes_dueno_nombre
  ON restaurante_clientes (owner_id, nombre);
CREATE INDEX IF NOT EXISTS idx_clientes_dueno_doc
  ON restaurante_clientes (owner_id, documento);

CREATE INDEX IF NOT EXISTS idx_productos_dueno_nombre
  ON restaurante_productos (owner_id, nombre);
CREATE INDEX IF NOT EXISTS idx_productos_dueno_categoria
  ON restaurante_productos (owner_id, categoria);

CREATE INDEX IF NOT EXISTS idx_fac_dueno_fecha
  ON fac_emitidas (owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fac_dueno_estado
  ON fac_emitidas (owner_id, dian_estado);

CREATE INDEX IF NOT EXISTS idx_oblig_dueno_vence
  ON obligaciones_tributarias_negocio (owner_id, vence_en);
