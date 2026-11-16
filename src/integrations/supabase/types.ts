export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      equipo_negocio: {
        Row: {
          activo: boolean
          created_at: string
          email: string
          id: string
          modulos: string[]
          nombre: string | null
          user_id: string | null
        }
        Insert: {
          activo?: boolean
          created_at?: string
          email: string
          id?: string
          modulos?: string[]
          nombre?: string | null
          user_id?: string | null
        }
        Update: {
          activo?: boolean
          created_at?: string
          email?: string
          id?: string
          modulos?: string[]
          nombre?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      auditoria_clinica: {
        Row: {
          accion: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          id: string
          modulo: string
          owner_id: string | null
          registro_id: string | null
          titulo: string | null
        }
        Insert: {
          accion: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          id?: string
          modulo: string
          owner_id?: string | null
          registro_id?: string | null
          titulo?: string | null
        }
        Update: {
          accion?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          id?: string
          modulo?: string
          owner_id?: string | null
          registro_id?: string | null
          titulo?: string | null
        }
        Relationships: []
      }
      equipo_auditoria: {
        Row: {
          accion: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          detalle: string | null
          id: string
          miembro_email: string
          owner_id: string | null
        }
        Insert: {
          accion: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          detalle?: string | null
          id?: string
          miembro_email: string
          owner_id?: string | null
        }
        Update: {
          accion?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          detalle?: string | null
          id?: string
          miembro_email?: string
          owner_id?: string | null
        }
        Relationships: []
      }
      asientos_contables: {
        Row: {
          asiento_id: string
          concepto: string
          created_at: string
          cuenta_id: string
          debe: number
          fecha: string
          haber: number
          id: string
          owner_id: string | null
        }
        Insert: {
          asiento_id: string
          concepto: string
          created_at?: string
          cuenta_id: string
          debe?: number
          fecha?: string
          haber?: number
          id?: string
          owner_id?: string | null
        }
        Update: {
          asiento_id?: string
          concepto?: string
          created_at?: string
          cuenta_id?: string
          debe?: number
          fecha?: string
          haber?: number
          id?: string
          owner_id?: string | null
        }
        Relationships: []
      }
      cuentas_contables: {
        Row: {
          codigo: string
          created_at: string
          id: string
          nombre: string
          owner_id: string | null
          tipo: string
        }
        Insert: {
          codigo: string
          created_at?: string
          id?: string
          nombre: string
          owner_id?: string | null
          tipo: string
        }
        Update: {
          codigo?: string
          created_at?: string
          id?: string
          nombre?: string
          owner_id?: string | null
          tipo?: string
        }
        Relationships: []
      }
      cotizaciones_vehiculo: {
        Row: {
          cliente: string
          condicion: string
          created_at: string
          cuota_inicial: number
          cuota_mensual: number | null
          descuento: number
          estado: string
          forma_pago: string
          id: string
          monto_financiar: number
          notas: string | null
          numero: number
          owner_id: string | null
          plazo_meses: number | null
          precio: number
          tasa_mensual: number | null
          telefono: string | null
          total_a_pagar: number
          vehiculo: string
          vehiculo_id: string | null
          vigente_hasta: string | null
        }
        Insert: {
          cliente: string
          condicion?: string
          created_at?: string
          cuota_inicial?: number
          cuota_mensual?: number | null
          descuento?: number
          estado?: string
          forma_pago?: string
          id?: string
          monto_financiar?: number
          notas?: string | null
          numero?: number
          owner_id?: string | null
          plazo_meses?: number | null
          precio?: number
          tasa_mensual?: number | null
          telefono?: string | null
          total_a_pagar?: number
          vehiculo: string
          vehiculo_id?: string | null
          vigente_hasta?: string | null
        }
        Update: {
          cliente?: string
          condicion?: string
          created_at?: string
          cuota_inicial?: number
          cuota_mensual?: number | null
          descuento?: number
          estado?: string
          forma_pago?: string
          id?: string
          monto_financiar?: number
          notas?: string | null
          numero?: number
          owner_id?: string | null
          plazo_meses?: number | null
          precio?: number
          tasa_mensual?: number | null
          telefono?: string | null
          total_a_pagar?: number
          vehiculo?: string
          vehiculo_id?: string | null
          vigente_hasta?: string | null
        }
        Relationships: []
      }
      compras_vehiculos: {
        Row: {
          id: string
          owner_id: string | null
          estado: string
          vendedor_tipo: string
          vendedor_nombre: string
          vendedor_documento: string | null
          vendedor_telefono: string | null
          vendedor_email: string | null
          propietario_nombre: string | null
          propietario_documento: string | null
          tipo: string
          marca: string
          linea: string | null
          modelo: string
          anio: number | null
          placa: string | null
          vin: string | null
          chasis: string | null
          motor_numero: string | null
          color: string | null
          kilometraje: number | null
          observaciones: string | null
          vehiculo_id: string | null
          creado_por: string | null
          aprobada_por: string | null
          aprobada_en: string | null
          recibida_por: string | null
          recibida_en: string | null
          recepcion_notas: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id?: string | null
          estado?: string
          vendedor_tipo?: string
          vendedor_nombre: string
          vendedor_documento?: string | null
          vendedor_telefono?: string | null
          vendedor_email?: string | null
          propietario_nombre?: string | null
          propietario_documento?: string | null
          tipo?: string
          marca: string
          linea?: string | null
          modelo: string
          anio?: number | null
          placa?: string | null
          vin?: string | null
          chasis?: string | null
          motor_numero?: string | null
          color?: string | null
          kilometraje?: number | null
          observaciones?: string | null
          vehiculo_id?: string | null
          creado_por?: string | null
          aprobada_por?: string | null
          aprobada_en?: string | null
          recibida_por?: string | null
          recibida_en?: string | null
          recepcion_notas?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string | null
          estado?: string
          vendedor_tipo?: string
          vendedor_nombre?: string
          vendedor_documento?: string | null
          vendedor_telefono?: string | null
          vendedor_email?: string | null
          propietario_nombre?: string | null
          propietario_documento?: string | null
          tipo?: string
          marca?: string
          linea?: string | null
          modelo?: string
          anio?: number | null
          placa?: string | null
          vin?: string | null
          chasis?: string | null
          motor_numero?: string | null
          color?: string | null
          kilometraje?: number | null
          observaciones?: string | null
          vehiculo_id?: string | null
          creado_por?: string | null
          aprobada_por?: string | null
          aprobada_en?: string | null
          recibida_por?: string | null
          recibida_en?: string | null
          recepcion_notas?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      compras_vehiculos_economico: {
        Row: {
          compra_id: string
          owner_id: string | null
          oferta_inicial: number | null
          precio_acordado: number | null
          forma_pago: string | null
          condiciones_pago: string | null
          updated_by: string | null
          updated_at: string
        }
        Insert: {
          compra_id: string
          owner_id?: string | null
          oferta_inicial?: number | null
          precio_acordado?: number | null
          forma_pago?: string | null
          condiciones_pago?: string | null
          updated_by?: string | null
          updated_at?: string
        }
        Update: {
          compra_id?: string
          owner_id?: string | null
          oferta_inicial?: number | null
          precio_acordado?: number | null
          forma_pago?: string | null
          condiciones_pago?: string | null
          updated_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      consignaciones_vehiculos: {
        Row: {
          id: string
          owner_id: string | null
          estado: string
          propietario_nombre: string
          propietario_documento: string | null
          propietario_telefono: string | null
          propietario_email: string | null
          tipo: string
          marca: string
          modelo: string
          anio: number | null
          placa: string | null
          vin: string | null
          color: string | null
          kilometraje: number | null
          fecha_inicio: string
          fecha_vencimiento: string | null
          observaciones: string | null
          creado_por: string | null
          liquidada_por: string | null
          liquidada_en: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id?: string | null
          estado?: string
          propietario_nombre: string
          propietario_documento?: string | null
          propietario_telefono?: string | null
          propietario_email?: string | null
          tipo?: string
          marca: string
          modelo: string
          anio?: number | null
          placa?: string | null
          vin?: string | null
          color?: string | null
          kilometraje?: number | null
          fecha_inicio?: string
          fecha_vencimiento?: string | null
          observaciones?: string | null
          creado_por?: string | null
          liquidada_por?: string | null
          liquidada_en?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string | null
          estado?: string
          propietario_nombre?: string
          propietario_documento?: string | null
          propietario_telefono?: string | null
          propietario_email?: string | null
          tipo?: string
          marca?: string
          modelo?: string
          anio?: number | null
          placa?: string | null
          vin?: string | null
          color?: string | null
          kilometraje?: number | null
          fecha_inicio?: string
          fecha_vencimiento?: string | null
          observaciones?: string | null
          creado_por?: string | null
          liquidada_por?: string | null
          liquidada_en?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      consignaciones_economico: {
        Row: {
          consignacion_id: string
          owner_id: string | null
          precio_acordado: number | null
          comision_pct: number | null
          gastos_autorizados: number | null
          precio_venta_final: number | null
          monto_liquidado: number | null
          updated_by: string | null
          updated_at: string
        }
        Insert: {
          consignacion_id: string
          owner_id?: string | null
          precio_acordado?: number | null
          comision_pct?: number | null
          gastos_autorizados?: number | null
          precio_venta_final?: number | null
          monto_liquidado?: number | null
          updated_by?: string | null
          updated_at?: string
        }
        Update: {
          consignacion_id?: string
          owner_id?: string | null
          precio_acordado?: number | null
          comision_pct?: number | null
          gastos_autorizados?: number | null
          precio_venta_final?: number | null
          monto_liquidado?: number | null
          updated_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      compras_vehiculos_gastos: {
        Row: {
          id: string
          compra_id: string
          owner_id: string | null
          concepto: string
          monto: number
          fecha: string
          creado_por: string | null
          created_at: string
        }
        Insert: {
          id?: string
          compra_id: string
          owner_id?: string | null
          concepto: string
          monto: number
          fecha?: string
          creado_por?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          compra_id?: string
          owner_id?: string | null
          concepto?: string
          monto?: number
          fecha?: string
          creado_por?: string | null
          created_at?: string
        }
        Relationships: []
      }
      compras_vehiculos_pagos: {
        Row: {
          id: string
          compra_id: string
          owner_id: string | null
          tipo: string
          monto: number
          fecha: string
          metodo: string | null
          nota: string | null
          registrado_por: string | null
          created_at: string
        }
        Insert: {
          id?: string
          compra_id: string
          owner_id?: string | null
          tipo?: string
          monto: number
          fecha?: string
          metodo?: string | null
          nota?: string | null
          registrado_por?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          compra_id?: string
          owner_id?: string | null
          tipo?: string
          monto?: number
          fecha?: string
          metodo?: string | null
          nota?: string | null
          registrado_por?: string | null
          created_at?: string
        }
        Relationships: []
      }
      compras_vehiculos_aprobaciones: {
        Row: {
          id: string
          compra_id: string
          owner_id: string | null
          usuario_id: string | null
          usuario_email: string | null
          precio_aprobado: number
          gastos_aprobados: number
          forma_pago: string | null
          vigente: boolean
          invalidada_en: string | null
          motivo_invalidacion: string | null
          created_at: string
        }
        Insert: {
          id?: string
          compra_id: string
          owner_id?: string | null
          usuario_id?: string | null
          usuario_email?: string | null
          precio_aprobado: number
          gastos_aprobados?: number
          forma_pago?: string | null
          vigente?: boolean
          invalidada_en?: string | null
          motivo_invalidacion?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          compra_id?: string
          owner_id?: string | null
          usuario_id?: string | null
          usuario_email?: string | null
          precio_aprobado?: number
          gastos_aprobados?: number
          forma_pago?: string | null
          vigente?: boolean
          invalidada_en?: string | null
          motivo_invalidacion?: string | null
          created_at?: string
        }
        Relationships: []
      }
      compras_vehiculos_historial: {
        Row: {
          id: string
          compra_id: string
          owner_id: string | null
          tipo: string
          detalle: string
          economico: boolean
          usuario_id: string | null
          usuario_email: string | null
          created_at: string
        }
        Insert: {
          id?: string
          compra_id: string
          owner_id?: string | null
          tipo: string
          detalle: string
          economico?: boolean
          usuario_id?: string | null
          usuario_email?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          compra_id?: string
          owner_id?: string | null
          tipo?: string
          detalle?: string
          economico?: boolean
          usuario_id?: string | null
          usuario_email?: string | null
          created_at?: string
        }
        Relationships: []
      }
      compras_vehiculos_documentos: {
        Row: {
          id: string
          compra_id: string
          owner_id: string | null
          tipo: string
          nombre: string
          ruta: string
          creado_por: string | null
          created_at: string
        }
        Insert: {
          id?: string
          compra_id: string
          owner_id?: string | null
          tipo?: string
          nombre: string
          ruta: string
          creado_por?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          compra_id?: string
          owner_id?: string | null
          tipo?: string
          nombre?: string
          ruta?: string
          creado_por?: string | null
          created_at?: string
        }
        Relationships: []
      }
      tasas_vehiculo: {
        Row: {
          condicion: string
          created_at: string
          id: string
          mes: string
          owner_id: string | null
          tasa_mensual: number
        }
        Insert: {
          condicion: string
          created_at?: string
          id?: string
          mes: string
          owner_id?: string | null
          tasa_mensual: number
        }
        Update: {
          condicion?: string
          created_at?: string
          id?: string
          mes?: string
          owner_id?: string | null
          tasa_mensual?: number
        }
        Relationships: []
      }
      documentos_vehiculo: {
        Row: {
          created_at: string
          id: string
          nombre: string
          owner_id: string | null
          ruta: string
          tipo: string
          vehiculo_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nombre: string
          owner_id?: string | null
          ruta: string
          tipo?: string
          vehiculo_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nombre?: string
          owner_id?: string | null
          ruta?: string
          tipo?: string
          vehiculo_id?: string
        }
        Relationships: []
      }
      vehiculo_gastos: {
        Row: {
          categoria: string
          created_at: string
          descripcion: string
          fecha: string
          id: string
          monto: number
          owner_id: string | null
          proveedor: string | null
          vehiculo_id: string
        }
        Insert: {
          categoria?: string
          created_at?: string
          descripcion: string
          fecha?: string
          id?: string
          monto?: number
          owner_id?: string | null
          proveedor?: string | null
          vehiculo_id: string
        }
        Update: {
          categoria?: string
          created_at?: string
          descripcion?: string
          fecha?: string
          id?: string
          monto?: number
          owner_id?: string | null
          proveedor?: string | null
          vehiculo_id?: string
        }
        Relationships: []
      }
      vehiculo_costos: {
        Row: {
          owner_id: string | null
          precio_compra: number | null
          updated_at: string
          vehiculo_id: string
        }
        Insert: {
          owner_id?: string | null
          precio_compra?: number | null
          updated_at?: string
          vehiculo_id: string
        }
        Update: {
          owner_id?: string | null
          precio_compra?: number | null
          updated_at?: string
          vehiculo_id?: string
        }
        Relationships: []
      }
      vehiculo_movimientos: {
        Row: {
          created_at: string
          detalle: string
          id: string
          owner_id: string | null
          tipo: string
          vehiculo_id: string
        }
        Insert: {
          created_at?: string
          detalle: string
          id?: string
          owner_id?: string | null
          tipo: string
          vehiculo_id: string
        }
        Update: {
          created_at?: string
          detalle?: string
          id?: string
          owner_id?: string | null
          tipo?: string
          vehiculo_id?: string
        }
        Relationships: []
      }
      turnos_caja: {
        Row: {
          abierto_en: string
          cajero: string | null
          cerrado_en: string | null
          created_at: string
          diferencia: number | null
          efectivo_contado: number | null
          esperado_efectivo: number | null
          estado: string
          fondo_inicial: number
          id: string
          notas_cierre: string | null
          owner_id: string | null
        }
        Insert: {
          abierto_en?: string
          cajero?: string | null
          cerrado_en?: string | null
          created_at?: string
          diferencia?: number | null
          efectivo_contado?: number | null
          esperado_efectivo?: number | null
          estado?: string
          fondo_inicial?: number
          id?: string
          notas_cierre?: string | null
          owner_id?: string | null
        }
        Update: {
          abierto_en?: string
          cajero?: string | null
          cerrado_en?: string | null
          created_at?: string
          diferencia?: number | null
          efectivo_contado?: number | null
          esperado_efectivo?: number | null
          estado?: string
          fondo_inicial?: number
          id?: string
          notas_cierre?: string | null
          owner_id?: string | null
        }
        Relationships: []
      }
      movimientos_turno: {
        Row: {
          anulado: boolean
          categoria: string | null
          concepto: string
          created_at: string
          id: string
          metodo: string
          monto: number
          motivo_anulacion: string | null
          owner_id: string | null
          registrado_por: string | null
          tipo: string
          turno_id: string
        }
        Insert: {
          anulado?: boolean
          categoria?: string | null
          concepto: string
          created_at?: string
          id?: string
          metodo?: string
          monto: number
          motivo_anulacion?: string | null
          owner_id?: string | null
          registrado_por?: string | null
          tipo: string
          turno_id: string
        }
        Update: {
          anulado?: boolean
          categoria?: string | null
          concepto?: string
          created_at?: string
          id?: string
          metodo?: string
          monto?: number
          motivo_anulacion?: string | null
          owner_id?: string | null
          registrado_por?: string | null
          tipo?: string
          turno_id?: string
        }
        Relationships: []
      }
      retomas_vehiculos: {
        Row: {
          anio: number | null
          color: string | null
          created_at: string
          id: string
          kilometraje: number | null
          creado_por: string | null
          estado_aprobacion: string
          aprobado_por: string | null
          aprobado_en: string | null
          aprobacion_notas: string | null
          marca: string
          modelo: string
          motivo_resultado: string | null
          observaciones: string | null
          operacion: string
          owner_id: string | null
          peritaje_archivos: string[]
          peritaje_fecha: string | null
          peritaje_notas: string | null
          placa: string | null
          precio_pedido: number | null
          precio_retoma: number | null
          precio_venta: number | null
          resultado: string
          tipo: string
          vehiculo_id: string | null
          vendedor_documento: string | null
          vendedor_nombre: string | null
          vendedor_telefono: string | null
          version: string | null
        }
        Insert: {
          anio?: number | null
          color?: string | null
          created_at?: string
          id?: string
          kilometraje?: number | null
          creado_por?: string | null
          estado_aprobacion?: string
          aprobado_por?: string | null
          aprobado_en?: string | null
          aprobacion_notas?: string | null
          marca: string
          modelo: string
          motivo_resultado?: string | null
          observaciones?: string | null
          operacion?: string
          owner_id?: string | null
          peritaje_archivos?: string[]
          peritaje_fecha?: string | null
          peritaje_notas?: string | null
          placa?: string | null
          precio_pedido?: number | null
          precio_retoma?: number | null
          precio_venta?: number | null
          resultado?: string
          tipo?: string
          vehiculo_id?: string | null
          vendedor_documento?: string | null
          vendedor_nombre?: string | null
          vendedor_telefono?: string | null
          version?: string | null
        }
        Update: {
          anio?: number | null
          color?: string | null
          created_at?: string
          id?: string
          kilometraje?: number | null
          creado_por?: string | null
          estado_aprobacion?: string
          aprobado_por?: string | null
          aprobado_en?: string | null
          aprobacion_notas?: string | null
          marca?: string
          modelo?: string
          motivo_resultado?: string | null
          observaciones?: string | null
          operacion?: string
          owner_id?: string | null
          peritaje_archivos?: string[]
          peritaje_fecha?: string | null
          peritaje_notas?: string | null
          placa?: string | null
          precio_pedido?: number | null
          precio_retoma?: number | null
          precio_venta?: number | null
          resultado?: string
          tipo?: string
          vehiculo_id?: string | null
          vendedor_documento?: string | null
          vendedor_nombre?: string | null
          vendedor_telefono?: string | null
          version?: string | null
        }
        Relationships: []
      }
      retomas_economico: {
        Row: {
          retoma_id: string
          owner_id: string | null
          precio_pedido: number | null
          precio_retoma: number | null
          precio_venta: number | null
          costos_estimados: number | null
          autorizado: Json | null
          updated_by: string | null
          updated_at: string
        }
        Insert: {
          retoma_id: string
          owner_id?: string | null
          precio_pedido?: number | null
          precio_retoma?: number | null
          precio_venta?: number | null
          costos_estimados?: number | null
          autorizado?: Json | null
          updated_by?: string | null
          updated_at?: string
        }
        Update: {
          retoma_id?: string
          owner_id?: string | null
          precio_pedido?: number | null
          precio_retoma?: number | null
          precio_venta?: number | null
          costos_estimados?: number | null
          autorizado?: Json | null
          updated_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      retomas_avaluos: {
        Row: {
          id: string
          retoma_id: string
          owner_id: string | null
          valor: number
          notas: string | null
          creado_por: string | null
          created_at: string
        }
        Insert: {
          id?: string
          retoma_id: string
          owner_id?: string | null
          valor: number
          notas?: string | null
          creado_por?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          retoma_id?: string
          owner_id?: string | null
          valor?: number
          notas?: string | null
          creado_por?: string | null
          created_at?: string
        }
        Relationships: []
      }
      retomas_inspecciones: {
        Row: {
          id: string
          retoma_id: string
          owner_id: string | null
          fecha: string
          estado_general: string | null
          observaciones: string
          creado_por: string | null
          created_at: string
        }
        Insert: {
          id?: string
          retoma_id: string
          owner_id?: string | null
          fecha?: string
          estado_general?: string | null
          observaciones: string
          creado_por?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          retoma_id?: string
          owner_id?: string | null
          fecha?: string
          estado_general?: string | null
          observaciones?: string
          creado_por?: string | null
          created_at?: string
        }
        Relationships: []
      }
      retomas_historial: {
        Row: {
          id: string
          retoma_id: string
          owner_id: string | null
          accion: string
          detalle: string | null
          economico: boolean
          usuario_id: string | null
          usuario_email: string | null
          created_at: string
        }
        Insert: {
          id?: string
          retoma_id: string
          owner_id?: string | null
          accion: string
          detalle?: string | null
          economico?: boolean
          usuario_id?: string | null
          usuario_email?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          retoma_id?: string
          owner_id?: string | null
          accion?: string
          detalle?: string | null
          economico?: boolean
          usuario_id?: string | null
          usuario_email?: string | null
          created_at?: string
        }
        Relationships: []
      }
      solicitudes_credito: {
        Row: {
          antiguedad: string | null
          cargo: string | null
          ciudad: string | null
          created_at: string
          cuota_inicial: number | null
          direccion: string | null
          documentos: string[]
          egresos_mensuales: number | null
          email: string | null
          empresa: string | null
          entidad: string | null
          estado: string
          estado_civil: string | null
          fecha_nacimiento: string | null
          id: string
          ingresos_mensuales: number | null
          lugar_expedicion: string | null
          monto_solicitado: number | null
          nombre_completo: string
          numero_documento: string | null
          observaciones: string | null
          ocupacion: string | null
          otros_ingresos: number | null
          owner_id: string | null
          patrimonio: number | null
          personas_a_cargo: number | null
          plazo_meses: number | null
          ref1_nombre: string | null
          ref1_parentesco: string | null
          ref1_telefono: string | null
          ref2_nombre: string | null
          ref2_parentesco: string | null
          ref2_telefono: string | null
          telefono: string | null
          telefono_empresa: string | null
          tipo_documento: string
          tipo_vinculacion: string | null
          tipo_vivienda: string | null
          valor_vehiculo: number | null
          vehiculo: string | null
        }
        Insert: {
          antiguedad?: string | null
          cargo?: string | null
          ciudad?: string | null
          created_at?: string
          cuota_inicial?: number | null
          direccion?: string | null
          documentos?: string[]
          egresos_mensuales?: number | null
          email?: string | null
          empresa?: string | null
          entidad?: string | null
          estado?: string
          estado_civil?: string | null
          fecha_nacimiento?: string | null
          id?: string
          ingresos_mensuales?: number | null
          lugar_expedicion?: string | null
          monto_solicitado?: number | null
          nombre_completo: string
          numero_documento?: string | null
          observaciones?: string | null
          ocupacion?: string | null
          otros_ingresos?: number | null
          owner_id?: string | null
          patrimonio?: number | null
          personas_a_cargo?: number | null
          plazo_meses?: number | null
          ref1_nombre?: string | null
          ref1_parentesco?: string | null
          ref1_telefono?: string | null
          ref2_nombre?: string | null
          ref2_parentesco?: string | null
          ref2_telefono?: string | null
          telefono?: string | null
          telefono_empresa?: string | null
          tipo_documento?: string
          tipo_vinculacion?: string | null
          tipo_vivienda?: string | null
          valor_vehiculo?: number | null
          vehiculo?: string | null
        }
        Update: {
          antiguedad?: string | null
          cargo?: string | null
          ciudad?: string | null
          created_at?: string
          cuota_inicial?: number | null
          direccion?: string | null
          documentos?: string[]
          egresos_mensuales?: number | null
          email?: string | null
          empresa?: string | null
          entidad?: string | null
          estado?: string
          estado_civil?: string | null
          fecha_nacimiento?: string | null
          id?: string
          ingresos_mensuales?: number | null
          lugar_expedicion?: string | null
          monto_solicitado?: number | null
          nombre_completo?: string
          numero_documento?: string | null
          observaciones?: string | null
          ocupacion?: string | null
          otros_ingresos?: number | null
          owner_id?: string | null
          patrimonio?: number | null
          personas_a_cargo?: number | null
          plazo_meses?: number | null
          ref1_nombre?: string | null
          ref1_parentesco?: string | null
          ref1_telefono?: string | null
          ref2_nombre?: string | null
          ref2_parentesco?: string | null
          ref2_telefono?: string | null
          telefono?: string | null
          telefono_empresa?: string | null
          tipo_documento?: string
          tipo_vinculacion?: string | null
          tipo_vivienda?: string | null
          valor_vehiculo?: number | null
          vehiculo?: string | null
        }
        Relationships: []
      }
      vehiculos_inventario: {
        Row: {
          anio: number | null
          carroceria: string | null
          ciudad_matricula: string | null
          color: string | null
          combustible: string | null
          condicion: string
          created_at: string
          cilindraje: string | null
          equipamiento: string | null
          estado: string
          fotos: string[]
          id: string
          kilometraje: number | null
          marca: string
          modelo: string
          motor_numero: string | null
          num_propietarios: number | null
          observaciones: string | null
          owner_id: string | null
          placa: string | null
          precio: number
          precio_compra: number | null
          puertas: number | null
          soat_vence: string | null
          tecnomecanica_vence: string | null
          tipo: string
          traccion: string | null
          transmision: string | null
          version: string | null
          vin: string | null
          separado_cliente: string | null
          separado_telefono: string | null
          separado_abono: number | null
          separado_fecha: string | null
          separado_notas: string | null
          linea: string | null
          chasis: string | null
          procedencia: string
          propietario_nombre: string | null
          propietario_documento: string | null
          propietario_telefono: string | null
          propietario_email: string | null
          fecha_ingreso: string | null
          fecha_venta: string | null
          precio_venta_final: number | null
          eliminado_en: string | null
          motivo_retiro: string | null
        }
        Insert: {
          eliminado_en?: string | null
          motivo_retiro?: string | null
          linea?: string | null
          chasis?: string | null
          procedencia?: string
          propietario_nombre?: string | null
          propietario_documento?: string | null
          propietario_telefono?: string | null
          propietario_email?: string | null
          fecha_ingreso?: string | null
          fecha_venta?: string | null
          precio_venta_final?: number | null
          anio?: number | null
          carroceria?: string | null
          ciudad_matricula?: string | null
          color?: string | null
          combustible?: string | null
          condicion?: string
          created_at?: string
          cilindraje?: string | null
          equipamiento?: string | null
          estado?: string
          fotos?: string[]
          id?: string
          kilometraje?: number | null
          marca: string
          modelo: string
          motor_numero?: string | null
          num_propietarios?: number | null
          observaciones?: string | null
          owner_id?: string | null
          placa?: string | null
          precio?: number
          precio_compra?: number | null
          puertas?: number | null
          soat_vence?: string | null
          tecnomecanica_vence?: string | null
          tipo?: string
          traccion?: string | null
          transmision?: string | null
          version?: string | null
          vin?: string | null
          separado_cliente?: string | null
          separado_telefono?: string | null
          separado_abono?: number | null
          separado_fecha?: string | null
          separado_notas?: string | null
        }
        Update: {
          eliminado_en?: string | null
          motivo_retiro?: string | null
          linea?: string | null
          chasis?: string | null
          procedencia?: string
          propietario_nombre?: string | null
          propietario_documento?: string | null
          propietario_telefono?: string | null
          propietario_email?: string | null
          fecha_ingreso?: string | null
          fecha_venta?: string | null
          precio_venta_final?: number | null
          anio?: number | null
          carroceria?: string | null
          ciudad_matricula?: string | null
          color?: string | null
          combustible?: string | null
          condicion?: string
          created_at?: string
          cilindraje?: string | null
          equipamiento?: string | null
          estado?: string
          fotos?: string[]
          id?: string
          kilometraje?: number | null
          marca?: string
          modelo?: string
          motor_numero?: string | null
          num_propietarios?: number | null
          observaciones?: string | null
          owner_id?: string | null
          placa?: string | null
          precio?: number
          precio_compra?: number | null
          puertas?: number | null
          soat_vence?: string | null
          tecnomecanica_vence?: string | null
          tipo?: string
          traccion?: string | null
          transmision?: string | null
          version?: string | null
          vin?: string | null
          separado_cliente?: string | null
          separado_telefono?: string | null
          separado_abono?: number | null
          separado_fecha?: string | null
          separado_notas?: string | null
        }
        Relationships: []
      }
      cotizaciones: {
        Row: {
          cliente: string
          correo: string | null
          direccion: string | null
          documento: string | null
          forma_pago: string | null
          plazo_entrega: string | null
          contacto: string | null
          created_at: string
          descuento: number
          estado: string
          id: string
          items: Json
          notas: string | null
          numero: number
          owner_id: string | null
          telefono: string | null
          total: number
          vigente_hasta: string | null
        }
        Insert: {
          cliente: string
          correo?: string | null
          direccion?: string | null
          documento?: string | null
          forma_pago?: string | null
          plazo_entrega?: string | null
          contacto?: string | null
          created_at?: string
          descuento?: number
          estado?: string
          id?: string
          items?: Json
          notas?: string | null
          numero?: number
          owner_id?: string | null
          telefono?: string | null
          total?: number
          vigente_hasta?: string | null
        }
        Update: {
          cliente?: string
          correo?: string | null
          direccion?: string | null
          documento?: string | null
          forma_pago?: string | null
          plazo_entrega?: string | null
          contacto?: string | null
          created_at?: string
          descuento?: number
          estado?: string
          id?: string
          items?: Json
          notas?: string | null
          numero?: number
          owner_id?: string | null
          telefono?: string | null
          total?: number
          vigente_hasta?: string | null
        }
        Relationships: []
      }
      agenda_citas: {
        Row: {
          cliente: string | null
          created_at: string
          duracion_min: number
          estado: string
          fecha: string
          hora: string | null
          id: string
          notas: string | null
          owner_id: string | null
          telefono: string | null
          tipo: string
          titulo: string
        }
        Insert: {
          cliente?: string | null
          created_at?: string
          duracion_min?: number
          estado?: string
          fecha: string
          hora?: string | null
          id?: string
          notas?: string | null
          owner_id?: string | null
          telefono?: string | null
          tipo?: string
          titulo: string
        }
        Update: {
          cliente?: string | null
          created_at?: string
          duracion_min?: number
          estado?: string
          fecha?: string
          hora?: string | null
          id?: string
          notas?: string | null
          owner_id?: string | null
          telefono?: string | null
          tipo?: string
          titulo?: string
        }
        Relationships: []
      }
      modulo_registros: {
        Row: {
          abonado: number
          anulado: boolean
          cantidad: number
          contacto: string | null
          created_at: string
          detalle: string | null
          estado: string
          fecha: string | null
          historial: Json
          id: string
          minimo: number
          modulo: string
          datos: Json
          monto: number
          motivo_anulacion: string | null
          telefono: string | null
          titulo: string
        }
        Insert: {
          abonado?: number
          anulado?: boolean
          cantidad?: number
          contacto?: string | null
          created_at?: string
          detalle?: string | null
          estado?: string
          fecha?: string | null
          historial?: Json
          id?: string
          minimo?: number
          modulo: string
          datos?: Json
          monto?: number
          motivo_anulacion?: string | null
          telefono?: string | null
          titulo: string
        }
        Update: {
          abonado?: number
          anulado?: boolean
          cantidad?: number
          contacto?: string | null
          created_at?: string
          detalle?: string | null
          estado?: string
          fecha?: string | null
          historial?: Json
          id?: string
          minimo?: number
          modulo?: string
          datos?: Json
          monto?: number
          motivo_anulacion?: string | null
          telefono?: string | null
          titulo?: string
        }
        Relationships: []
      }
      fiados: {
        Row: {
          abonado: number
          anulado: boolean
          contacto: string | null
          created_at: string
          estado: string
          fecha: string | null
          id: string
          monto: number
          owner_id: string | null
          telefono: string | null
          tipo_negocio: string | null
          titulo: string
        }
        Insert: {
          abonado?: number
          anulado?: boolean
          contacto?: string | null
          created_at?: string
          estado?: string
          fecha?: string | null
          id?: string
          monto?: number
          owner_id?: string | null
          telefono?: string | null
          tipo_negocio?: string | null
          titulo: string
        }
        Update: {
          abonado?: number
          anulado?: boolean
          contacto?: string | null
          created_at?: string
          estado?: string
          fecha?: string | null
          id?: string
          monto?: number
          owner_id?: string | null
          telefono?: string | null
          tipo_negocio?: string | null
          titulo?: string
        }
        Relationships: []
      }
      equipo_pagos: {
        Row: {
          anulado: boolean
          created_at: string
          estado: string
          fecha: string | null
          id: string
          monto: number
          owner_id: string | null
          tipo_negocio: string | null
          titulo: string
        }
        Insert: {
          anulado?: boolean
          created_at?: string
          estado?: string
          fecha?: string | null
          id?: string
          monto?: number
          owner_id?: string | null
          tipo_negocio?: string | null
          titulo: string
        }
        Update: {
          anulado?: boolean
          created_at?: string
          estado?: string
          fecha?: string | null
          id?: string
          monto?: number
          owner_id?: string | null
          tipo_negocio?: string | null
          titulo?: string
        }
        Relationships: []
      }
      propinas_registros: {
        Row: {
          anulado: boolean
          created_at: string
          estado: string
          id: string
          monto: number
          owner_id: string | null
          tipo_negocio: string | null
          titulo: string
        }
        Insert: {
          anulado?: boolean
          created_at?: string
          estado?: string
          id?: string
          monto?: number
          owner_id?: string | null
          tipo_negocio?: string | null
          titulo: string
        }
        Update: {
          anulado?: boolean
          created_at?: string
          estado?: string
          id?: string
          monto?: number
          owner_id?: string | null
          tipo_negocio?: string | null
          titulo?: string
        }
        Relationships: []
      }
      tickets_soporte: {
        Row: {
          asunto: string
          categoria: string
          correo: string | null
          created_at: string
          descripcion: string
          estado: string
          id: string
          negocio: string | null
          pagina: string | null
          respuesta: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          asunto: string
          categoria?: string
          correo?: string | null
          created_at?: string
          descripcion: string
          estado?: string
          id?: string
          negocio?: string | null
          pagina?: string | null
          respuesta?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          asunto?: string
          categoria?: string
          correo?: string | null
          created_at?: string
          descripcion?: string
          estado?: string
          id?: string
          negocio?: string | null
          pagina?: string | null
          respuesta?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      agente_memoria: {
        Row: {
          contenido: string
          created_at: string
          id: string
          negocio_id: string
          owner_id: string
          tipo: string
          veces: number
        }
        Insert: {
          contenido: string
          created_at?: string
          id?: string
          negocio_id: string
          owner_id: string
          tipo?: string
          veces?: number
        }
        Update: {
          contenido?: string
          created_at?: string
          id?: string
          negocio_id?: string
          owner_id?: string
          tipo?: string
          veces?: number
        }
        Relationships: []
      }
      agente_whatsapp: {
        Row: {
          activo: boolean
          clave: string
          created_at: string
          id: string
          instrucciones: string | null
          negocio_id: string
          nombre_agente: string
          owner_id: string
        }
        Insert: {
          activo?: boolean
          clave?: string
          created_at?: string
          id?: string
          instrucciones?: string | null
          negocio_id: string
          nombre_agente?: string
          owner_id: string
        }
        Update: {
          activo?: boolean
          clave?: string
          created_at?: string
          id?: string
          instrucciones?: string | null
          negocio_id?: string
          nombre_agente?: string
          owner_id?: string
        }
        Relationships: []
      }
      negocio_config: {
        Row: {
          aviso_entrega: string | null
          ciudad: string | null
          cobertura: string | null
          color_principal: string | null
          created_at: string
          descripcion: string | null
          eslogan: string | null
          horarios: string | null
          id: string
          instagram: string | null
          logo_url: string | null
          moneda: string
          owner_id: string | null
          portada_url: string | null
          nombre: string
          sitio_web: string | null
          telefono_pedidos: string | null
          tipo_negocio: string | null
          updated_at: string
          iva_porcentaje: number
          whatsapp_cocina: string | null
        }
        Insert: {
          aviso_entrega?: string | null
          ciudad?: string | null
          cobertura?: string | null
          color_principal?: string | null
          created_at?: string
          descripcion?: string | null
          eslogan?: string | null
          horarios?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          moneda?: string
          owner_id?: string | null
          nombre?: string
          portada_url?: string | null
          sitio_web?: string | null
          telefono_pedidos?: string | null
          tipo_negocio?: string | null
          updated_at?: string
          iva_porcentaje?: number
          whatsapp_cocina?: string | null
        }
        Update: {
          aviso_entrega?: string | null
          ciudad?: string | null
          cobertura?: string | null
          color_principal?: string | null
          created_at?: string
          descripcion?: string | null
          eslogan?: string | null
          horarios?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          moneda?: string
          owner_id?: string | null
          portada_url?: string | null
          nombre?: string
          sitio_web?: string | null
          telefono_pedidos?: string | null
          tipo_negocio?: string | null
          updated_at?: string
          iva_porcentaje?: number
          whatsapp_cocina?: string | null
        }
        Relationships: []
      }
      restaurante_clientes: {
        Row: {
          created_at: string
          direccion: string | null
          id: string
          nombre: string
          notas: string | null
          telefono: string
          total_gastado: number
          total_pedidos: number
          ultimo_pedido: string | null
        }
        Insert: {
          created_at?: string
          direccion?: string | null
          id?: string
          nombre: string
          notas?: string | null
          telefono: string
          total_gastado?: number
          total_pedidos?: number
          ultimo_pedido?: string | null
        }
        Update: {
          created_at?: string
          direccion?: string | null
          id?: string
          nombre?: string
          notas?: string | null
          telefono?: string
          total_gastado?: number
          total_pedidos?: number
          ultimo_pedido?: string | null
        }
        Relationships: []
      }
      restaurante_repartidores: {
        Row: {
          activo: boolean
          documento: string | null
          placa: string | null
          vehiculo: string | null
          created_at: string
          id: string
          nombre: string
          telefono: string | null
        }
        Insert: {
          activo?: boolean
          documento?: string | null
          placa?: string | null
          vehiculo?: string | null
          created_at?: string
          id?: string
          nombre: string
          telefono?: string | null
        }
        Update: {
          activo?: boolean
          documento?: string | null
          placa?: string | null
          vehiculo?: string | null
          created_at?: string
          id?: string
          nombre?: string
          telefono?: string | null
        }
        Relationships: []
      }
      restaurante_mesas: {
        Row: {
          capacidad: number
          created_at: string
          estado: string
          id: string
          numero: string
        }
        Insert: {
          capacidad?: number
          created_at?: string
          estado?: string
          id?: string
          numero: string
        }
        Update: {
          capacidad?: number
          created_at?: string
          estado?: string
          id?: string
          numero?: string
        }
        Relationships: []
      }
      restaurante_movimientos_caja: {
        Row: {
          concepto: string
          created_at: string
          id: string
          monto: number
          tipo: string
        }
        Insert: {
          concepto: string
          created_at?: string
          id?: string
          monto?: number
          tipo: string
        }
        Update: {
          concepto?: string
          created_at?: string
          id?: string
          monto?: number
          tipo?: string
        }
        Relationships: []
      }
      restaurante_categorias: {
        Row: {
          activa: boolean
          created_at: string
          id: string
          nombre: string
          orden: number
          owner_id: string | null
          tipo_negocio: string | null
        }
        Insert: {
          activa?: boolean
          created_at?: string
          id?: string
          nombre: string
          orden?: number
          owner_id?: string | null
          tipo_negocio?: string | null
        }
        Update: {
          activa?: boolean
          created_at?: string
          id?: string
          nombre?: string
          orden?: number
          owner_id?: string | null
          tipo_negocio?: string | null
        }
        Relationships: []
      }
      restaurante_bodegas: {
        Row: {
          created_at: string
          direccion: string | null
          id: string
          nombre: string
          owner_id: string | null
        }
        Insert: {
          created_at?: string
          direccion?: string | null
          id?: string
          nombre: string
          owner_id?: string | null
        }
        Update: {
          created_at?: string
          direccion?: string | null
          id?: string
          nombre?: string
          owner_id?: string | null
        }
        Relationships: []
      }
      restaurante_insumos: {
        Row: {
          bodega_id: string | null
          cantidad_compra: number
          created_at: string
          id: string
          nombre: string
          precio_compra: number
          proveedor: string | null
          stock: number
          stock_minimo: number
          unidad: string
        }
        Insert: {
          bodega_id?: string | null
          cantidad_compra?: number
          created_at?: string
          id?: string
          nombre: string
          precio_compra?: number
          proveedor?: string | null
          stock?: number
          stock_minimo?: number
          unidad?: string
        }
        Update: {
          bodega_id?: string | null
          cantidad_compra?: number
          created_at?: string
          id?: string
          nombre?: string
          precio_compra?: number
          proveedor?: string | null
          stock?: number
          stock_minimo?: number
          unidad?: string
        }
        Relationships: []
      }
      restaurante_kardex: {
        Row: {
          cantidad: number
          created_at: string
          id: string
          insumo_id: string
          motivo: string | null
          owner_id: string | null
          pedido_id: string | null
          stock_resultante: number
          tipo: string
        }
        Insert: {
          cantidad: number
          created_at?: string
          id?: string
          insumo_id: string
          motivo?: string | null
          owner_id?: string | null
          pedido_id?: string | null
          stock_resultante?: number
          tipo: string
        }
        Update: {
          cantidad?: number
          created_at?: string
          id?: string
          insumo_id?: string
          motivo?: string | null
          owner_id?: string | null
          pedido_id?: string | null
          stock_resultante?: number
          tipo?: string
        }
        Relationships: []
      }
      restaurante_recetas: {
        Row: {
          created_at: string
          id: string
          merma_pct: number
          porciones: number
          preparacion: string | null
          producto_id: string
          tiempo_min: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          merma_pct?: number
          porciones?: number
          preparacion?: string | null
          producto_id: string
          tiempo_min?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          merma_pct?: number
          porciones?: number
          preparacion?: string | null
          producto_id?: string
          tiempo_min?: number | null
        }
        Relationships: []
      }
      restaurante_receta_ingredientes: {
        Row: {
          cantidad: number
          created_at: string
          id: string
          insumo_id: string
          receta_id: string
        }
        Insert: {
          cantidad?: number
          created_at?: string
          id?: string
          insumo_id: string
          receta_id: string
        }
        Update: {
          cantidad?: number
          created_at?: string
          id?: string
          insumo_id?: string
          receta_id?: string
        }
        Relationships: []
      }
      restaurante_productos: {
        Row: {
          activo: boolean
          categoria_id: string | null
          created_at: string
          descripcion: string | null
          destacado: boolean
          id: string
          imagen_url: string | null
          nombre: string
          owner_id: string | null
          precio: number
          tipo_negocio: string | null
        }
        Insert: {
          activo?: boolean
          categoria_id?: string | null
          created_at?: string
          descripcion?: string | null
          destacado?: boolean
          id?: string
          imagen_url?: string | null
          nombre: string
          owner_id?: string | null
          precio?: number
          tipo_negocio?: string | null
        }
        Update: {
          activo?: boolean
          categoria_id?: string | null
          created_at?: string
          descripcion?: string | null
          destacado?: boolean
          id?: string
          imagen_url?: string | null
          nombre?: string
          owner_id?: string | null
          precio?: number
          tipo_negocio?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurante_productos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "restaurante_categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurante_pedidos: {
        Row: {
          canal: string
          numero_factura: number | null
          barrio: string | null
          cliente_email: string | null
          cliente_nombre: string
          cliente_telefono: string
          created_at: string
          direccion: string | null
          estado: string
          id: string
          modalidad: string
          notas: string | null
          cliente_id: string | null
          mesa_id: string | null
          metodo_pago: string
          pago_estado: string
          historial: Json
          owner_id: string | null
          repartidor_id: string | null
          total: number
        }
        Insert: {
          pago_estado?: string
          historial?: Json
          metodo_pago?: string
          canal?: string
          numero_factura?: number | null
          owner_id?: string | null
          barrio?: string | null
          cliente_email?: string | null
          cliente_nombre: string
          cliente_telefono: string
          created_at?: string
          direccion?: string | null
          estado?: string
          id?: string
          modalidad?: string
          notas?: string | null
          cliente_id?: string | null
          mesa_id?: string | null
          repartidor_id?: string | null
          total?: number
        }
        Update: {
          pago_estado?: string
          historial?: Json
          metodo_pago?: string
          canal?: string
          numero_factura?: number | null
          owner_id?: string | null
          barrio?: string | null
          cliente_email?: string | null
          cliente_nombre?: string
          cliente_telefono?: string
          created_at?: string
          direccion?: string | null
          estado?: string
          id?: string
          modalidad?: string
          notas?: string | null
          cliente_id?: string | null
          mesa_id?: string | null
          repartidor_id?: string | null
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "restaurante_pedidos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "restaurante_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurante_pedidos_mesa_id_fkey"
            columns: ["mesa_id"]
            isOneToOne: false
            referencedRelation: "restaurante_mesas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurante_pedidos_repartidor_id_fkey"
            columns: ["repartidor_id"]
            isOneToOne: false
            referencedRelation: "restaurante_repartidores"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurante_producto_opciones: {
        Row: {
          activa: boolean
          created_at: string
          grupo: string
          id: string
          multiple: boolean
          nombre: string
          obligatorio: boolean
          owner_id: string | null
          precio_extra: number
          producto_id: string
        }
        Insert: {
          activa?: boolean
          created_at?: string
          grupo: string
          id?: string
          multiple?: boolean
          nombre: string
          obligatorio?: boolean
          owner_id?: string | null
          precio_extra?: number
          producto_id: string
        }
        Update: {
          activa?: boolean
          created_at?: string
          grupo?: string
          id?: string
          multiple?: boolean
          nombre?: string
          obligatorio?: boolean
          owner_id?: string | null
          precio_extra?: number
          producto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurante_producto_opciones_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "restaurante_productos"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurante_pedido_items: {
        Row: {
          opciones: Json
          cantidad: number
          created_at: string
          id: string
          nombre: string
          pedido_id: string
          precio_unitario: number
          producto_id: string | null
        }
        Insert: {
          opciones?: Json
          cantidad: number
          created_at?: string
          id?: string
          nombre: string
          pedido_id: string
          precio_unitario: number
          producto_id?: string | null
        }
        Update: {
          opciones?: Json
          cantidad?: number
          created_at?: string
          id?: string
          nombre?: string
          pedido_id?: string
          precio_unitario?: number
          producto_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurante_pedido_items_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "restaurante_pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurante_pedido_items_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "restaurante_productos"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_log: {
        Row: {
          called_at: string
          fn: string
          id: string
          user_id: string
        }
        Insert: {
          called_at?: string
          fn: string
          id?: string
          user_id: string
        }
        Update: {
          called_at?: string
          fn?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      asset_pin_comments: {
        Row: {
          asset_id: string
          author_id: string
          body: string
          created_at: string
          id: string
          org_id: string
          resolved: boolean
          workspace_id: string
          x: number
          y: number
        }
        Insert: {
          asset_id: string
          author_id: string
          body: string
          created_at?: string
          id?: string
          org_id: string
          resolved?: boolean
          workspace_id: string
          x: number
          y: number
        }
        Update: {
          asset_id?: string
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          org_id?: string
          resolved?: boolean
          workspace_id?: string
          x?: number
          y?: number
        }
        Relationships: []
      }
      asset_reviewer_assignments: {
        Row: {
          asset_id: string
          assigned_by: string
          created_at: string
          id: string
          org_id: string
          required: boolean
          reviewer_id: string
          workspace_id: string
        }
        Insert: {
          asset_id: string
          assigned_by: string
          created_at?: string
          id?: string
          org_id: string
          required?: boolean
          reviewer_id: string
          workspace_id: string
        }
        Update: {
          asset_id?: string
          assigned_by?: string
          created_at?: string
          id?: string
          org_id?: string
          required?: boolean
          reviewer_id?: string
          workspace_id?: string
        }
        Relationships: []
      }
      asset_reviews: {
        Row: {
          asset_id: string
          asset_version: number
          comment: string | null
          created_at: string
          id: string
          org_id: string
          reviewer_id: string
          status: Database["public"]["Enums"]["asset_review_status"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          asset_id: string
          asset_version?: number
          comment?: string | null
          created_at?: string
          id?: string
          org_id: string
          reviewer_id: string
          status?: Database["public"]["Enums"]["asset_review_status"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          asset_id?: string
          asset_version?: number
          comment?: string | null
          created_at?: string
          id?: string
          org_id?: string
          reviewer_id?: string
          status?: Database["public"]["Enums"]["asset_review_status"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_reviews_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "workspace_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      audience_query_logs: {
        Row: {
          created_at: string
          criteria: Json
          crm_provider: string | null
          id: string
          org_id: string
          prompt: string
          result_count: number
          user_email: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          criteria?: Json
          crm_provider?: string | null
          id?: string
          org_id: string
          prompt: string
          result_count?: number
          user_email: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          criteria?: Json
          crm_provider?: string | null
          id?: string
          org_id?: string
          prompt?: string
          result_count?: number
          user_email?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      audience_saved_searches: {
        Row: {
          created_at: string
          created_by: string
          criteria: Json
          id: string
          name: string
          org_id: string
          prompt: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          criteria?: Json
          id?: string
          name: string
          org_id: string
          prompt?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          criteria?: Json
          id?: string
          name?: string
          org_id?: string
          prompt?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      audiences: {
        Row: {
          created_at: string
          created_by: string
          estimated_count: number
          id: string
          name: string
          org_id: string
          parsed_criteria: Json
          prompt: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          estimated_count?: number
          id?: string
          name: string
          org_id: string
          parsed_criteria: Json
          prompt: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          estimated_count?: number
          id?: string
          name?: string
          org_id?: string
          parsed_criteria?: Json
          prompt?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audiences_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audiences_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_requests: {
        Row: {
          brief: string
          created_at: string
          desired_due_date: string | null
          id: string
          org_id: string
          requestor_email: string
          requestor_name: string | null
          status: Database["public"]["Enums"]["campaign_request_status"]
          status_token: string
          status_token_expires_at: string
          template_id: string | null
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          brief: string
          created_at?: string
          desired_due_date?: string | null
          id?: string
          org_id: string
          requestor_email: string
          requestor_name?: string | null
          status?: Database["public"]["Enums"]["campaign_request_status"]
          status_token?: string
          status_token_expires_at?: string
          template_id?: string | null
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          brief?: string
          created_at?: string
          desired_due_date?: string | null
          id?: string
          org_id?: string
          requestor_email?: string
          requestor_name?: string | null
          status?: Database["public"]["Enums"]["campaign_request_status"]
          status_token?: string
          status_token_expires_at?: string
          template_id?: string | null
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      campaign_stages: {
        Row: {
          color: string
          created_at: string
          id: string
          is_system: boolean
          key: string
          label: string
          org_id: string
          position: number
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_system?: boolean
          key: string
          label: string
          org_id: string
          position?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_system?: boolean
          key?: string
          label?: string
          org_id?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_stages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_variants: {
        Row: {
          ai_summary: string | null
          channel: string
          copy: string | null
          created_at: string
          created_by: string
          creative_asset_id: string | null
          id: string
          is_winner: boolean
          label: string
          org_id: string
          position: number
          results: Json
          subject: string | null
          updated_at: string
          utm_tail: string | null
          workspace_id: string
        }
        Insert: {
          ai_summary?: string | null
          channel?: string
          copy?: string | null
          created_at?: string
          created_by: string
          creative_asset_id?: string | null
          id?: string
          is_winner?: boolean
          label: string
          org_id: string
          position?: number
          results?: Json
          subject?: string | null
          updated_at?: string
          utm_tail?: string | null
          workspace_id: string
        }
        Update: {
          ai_summary?: string | null
          channel?: string
          copy?: string | null
          created_at?: string
          created_by?: string
          creative_asset_id?: string | null
          id?: string
          is_winner?: boolean
          label?: string
          org_id?: string
          position?: number
          results?: Json
          subject?: string | null
          updated_at?: string
          utm_tail?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          notes: string | null
          org_id: string
          taxonomy_snapshot: Json
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          notes?: string | null
          org_id: string
          taxonomy_snapshot: Json
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          notes?: string | null
          org_id?: string
          taxonomy_snapshot?: Json
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_items: {
        Row: {
          blocked_reason: string | null
          created_at: string
          created_by: string
          depends_on: string[]
          done: boolean
          due_at: string | null
          id: string
          org_id: string
          owner_id: string | null
          position: number
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          blocked_reason?: string | null
          created_at?: string
          created_by: string
          depends_on?: string[]
          done?: boolean
          due_at?: string | null
          id?: string
          org_id: string
          owner_id?: string | null
          position?: number
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          blocked_reason?: string | null
          created_at?: string
          created_by?: string
          depends_on?: string[]
          done?: boolean
          due_at?: string | null
          id?: string
          org_id?: string
          owner_id?: string | null
          position?: number
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          channel: string | null
          city: string | null
          company: string | null
          created_at: string
          created_by: string
          document: string | null
          email: string | null
          estimated_value: number | null
          full_name: string
          id: string
          is_sample: boolean
          last_activity_on: string
          next_follow_up_on: string | null
          notes: string | null
          phone: string | null
          org_id: string
          source: string | null
          stage: string
          title: string | null
          updated_at: string
        }
        Insert: {
          channel?: string | null
          city?: string | null
          company?: string | null
          created_at?: string
          created_by: string
          document?: string | null
          email?: string | null
          estimated_value?: number | null
          full_name: string
          id?: string
          is_sample?: boolean
          last_activity_on?: string
          next_follow_up_on?: string | null
          notes?: string | null
          org_id: string
          phone?: string | null
          source?: string | null
          stage?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          channel?: string | null
          city?: string | null
          company?: string | null
          created_at?: string
          created_by?: string
          document?: string | null
          email?: string | null
          estimated_value?: number | null
          full_name?: string
          id?: string
          is_sample?: boolean
          last_activity_on?: string
          next_follow_up_on?: string | null
          notes?: string | null
          org_id?: string
          phone?: string | null
          source?: string | null
          stage?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      funnel_events: {
        Row: {
          channel: string | null
          created_at: string
          created_by: string
          id: string
          is_sample: boolean
          notes: string | null
          occurred_on: string
          org_id: string
          source: string | null
          stage: string
          unqualified_reason: string | null
          value_count: number
          workspace_id: string | null
        }
        Insert: {
          channel?: string | null
          created_at?: string
          created_by: string
          id?: string
          is_sample?: boolean
          notes?: string | null
          occurred_on?: string
          org_id: string
          source?: string | null
          stage: string
          unqualified_reason?: string | null
          value_count?: number
          workspace_id?: string | null
        }
        Update: {
          channel?: string | null
          created_at?: string
          created_by?: string
          id?: string
          is_sample?: boolean
          notes?: string | null
          occurred_on?: string
          org_id?: string
          source?: string | null
          stage?: string
          unqualified_reason?: string | null
          value_count?: number
          workspace_id?: string | null
        }
        Relationships: []
      }
      funnel_targets: {
        Row: {
          created_at: string
          created_by: string
          id: string
          mql_target: number
          org_id: string
          sqo_target: number
          updated_at: string
          workspace_id: string | null
          year_month: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          mql_target?: number
          org_id: string
          sqo_target?: number
          updated_at?: string
          workspace_id?: string | null
          year_month: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          mql_target?: number
          org_id?: string
          sqo_target?: number
          updated_at?: string
          workspace_id?: string | null
          year_month?: string
        }
        Relationships: []
      }
      gmail_connections: {
        Row: {
          access_token: string
          created_at: string
          email: string
          expires_at: string
          id: string
          org_id: string | null
          refresh_token: string
          scope: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          org_id?: string | null
          refresh_token: string
          scope?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          org_id?: string | null
          refresh_token?: string
          scope?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gmail_connections_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      imported_contacts: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          list_id: string
          org_id: string
          raw: Json | null
          source_attribution: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          list_id: string
          org_id: string
          raw?: Json | null
          source_attribution?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          list_id?: string
          org_id?: string
          raw?: Json | null
          source_attribution?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "imported_contacts_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "imported_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imported_contacts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      imported_lists: {
        Row: {
          created_at: string
          created_by: string
          event_date: string | null
          id: string
          org_id: string
          original_filename: string | null
          row_count: number
          source_label: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          event_date?: string | null
          id?: string
          org_id: string
          original_filename?: string | null
          row_count?: number
          source_label: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          event_date?: string | null
          id?: string
          org_id?: string
          original_filename?: string | null
          row_count?: number
          source_label?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "imported_lists_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imported_lists_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_referrals: {
        Row: {
          assigned_to: string | null
          company: string | null
          created_at: string
          email: string
          follow_up_at: string | null
          id: string
          message: string | null
          name: string
          notes: string | null
          org_id: string | null
          phone: string | null
          referral_link_id: string | null
          status: Database["public"]["Enums"]["lead_status"]
        }
        Insert: {
          assigned_to?: string | null
          company?: string | null
          created_at?: string
          email: string
          follow_up_at?: string | null
          id?: string
          message?: string | null
          name: string
          notes?: string | null
          org_id?: string | null
          phone?: string | null
          referral_link_id?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
        }
        Update: {
          assigned_to?: string | null
          company?: string | null
          created_at?: string
          email?: string
          follow_up_at?: string | null
          id?: string
          message?: string | null
          name?: string
          notes?: string | null
          org_id?: string | null
          phone?: string | null
          referral_link_id?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
        }
        Relationships: [
          {
            foreignKeyName: "lead_referrals_referral_link_id_fkey"
            columns: ["referral_link_id"]
            isOneToOne: false
            referencedRelation: "referral_links"
            referencedColumns: ["id"]
          },
        ]
      }
      link_clicks: {
        Row: {
          country: string | null
          id: string
          ip_hash: string | null
          occurred_at: string
          org_id: string
          referrer: string | null
          short_link_id: string
          user_agent: string | null
        }
        Insert: {
          country?: string | null
          id?: string
          ip_hash?: string | null
          occurred_at?: string
          org_id: string
          referrer?: string | null
          short_link_id: string
          user_agent?: string | null
        }
        Update: {
          country?: string | null
          id?: string
          ip_hash?: string | null
          occurred_at?: string
          org_id?: string
          referrer?: string | null
          short_link_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "link_clicks_short_link_id_fkey"
            columns: ["short_link_id"]
            isOneToOne: false
            referencedRelation: "short_links"
            referencedColumns: ["id"]
          },
        ]
      }
      list_import_logs: {
        Row: {
          attendees_count: number
          created_at: string
          crm_provider: string | null
          errors: Json | null
          event_name: string | null
          external_campaign_id: string | null
          external_event_id: string | null
          failed_contacts: number
          file_name: string | null
          id: string
          no_shows_count: number
          org_id: string
          status: string
          successful_contacts: number
          total_contacts: number
          user_email: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          attendees_count?: number
          created_at?: string
          crm_provider?: string | null
          errors?: Json | null
          event_name?: string | null
          external_campaign_id?: string | null
          external_event_id?: string | null
          failed_contacts?: number
          file_name?: string | null
          id?: string
          no_shows_count?: number
          org_id: string
          status?: string
          successful_contacts?: number
          total_contacts?: number
          user_email: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          attendees_count?: number
          created_at?: string
          crm_provider?: string | null
          errors?: Json | null
          event_name?: string | null
          external_campaign_id?: string | null
          external_event_id?: string | null
          failed_contacts?: number
          file_name?: string | null
          id?: string
          no_shows_count?: number
          org_id?: string
          status?: string
          successful_contacts?: number
          total_contacts?: number
          user_email?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      org_campaign_types: {
        Row: {
          archived: boolean
          category: string
          created_at: string
          id: string
          label: string
          org_id: string
          position: number
          updated_at: string
          value: string
        }
        Insert: {
          archived?: boolean
          category: string
          created_at?: string
          id?: string
          label: string
          org_id: string
          position?: number
          updated_at?: string
          value: string
        }
        Update: {
          archived?: boolean
          category?: string
          created_at?: string
          id?: string
          label?: string
          org_id?: string
          position?: number
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      org_digests: {
        Row: {
          created_at: string
          for_date: string
          id: string
          org_id: string
          summary: Json
        }
        Insert: {
          created_at?: string
          for_date: string
          id?: string
          org_id: string
          summary?: Json
        }
        Update: {
          created_at?: string
          for_date?: string
          id?: string
          org_id?: string
          summary?: Json
        }
        Relationships: []
      }
      org_integration_status: {
        Row: {
          id: string
          integration_id: string
          marked_by: string | null
          notes: string | null
          org_id: string
          status: string
          updated_at: string
        }
        Insert: {
          id?: string
          integration_id: string
          marked_by?: string | null
          notes?: string | null
          org_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          id?: string
          integration_id?: string
          marked_by?: string | null
          notes?: string | null
          org_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      org_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          org_id: string
          role: Database["public"]["Enums"]["org_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          org_id: string
          role?: Database["public"]["Enums"]["org_role"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          org_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_invites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_members: {
        Row: {
          created_at: string
          id: string
          org_id: string
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          industry: string | null
          name: string
          public_url: string | null
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          industry?: string | null
          name: string
          public_url?: string | null
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          industry?: string | null
          name?: string
          public_url?: string | null
          slug?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          default_org_id: string | null
          full_name: string | null
          id: string
          onboarded_at: string | null
        }
        Insert: {
          created_at?: string
          default_org_id?: string | null
          full_name?: string | null
          id: string
          onboarded_at?: string | null
        }
        Update: {
          created_at?: string
          default_org_id?: string | null
          full_name?: string | null
          id?: string
          onboarded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_default_org_id_fkey"
            columns: ["default_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_links: {
        Row: {
          company: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          name: string
          org_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name: string
          org_id: string
          slug: string
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          org_id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_links_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      responder_logs: {
        Row: {
          actor_id: string
          classification: string
          created_at: string
          draft_preview: string
          gmail_draft_id: string | null
          id: string
          org_id: string
          outcome: string
          recipient: string
          subject: string
          thread_id: string | null
        }
        Insert: {
          actor_id: string
          classification: string
          created_at?: string
          draft_preview?: string
          gmail_draft_id?: string | null
          id?: string
          org_id: string
          outcome?: string
          recipient?: string
          subject?: string
          thread_id?: string | null
        }
        Update: {
          actor_id?: string
          classification?: string
          created_at?: string
          draft_preview?: string
          gmail_draft_id?: string | null
          id?: string
          org_id?: string
          outcome?: string
          recipient?: string
          subject?: string
          thread_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "responder_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      responder_rules: {
        Row: {
          classification: string
          created_at: string
          created_by: string
          enabled: boolean
          field: string
          id: string
          name: string
          op: string
          org_id: string
          position: number
          updated_at: string
          value: string
        }
        Insert: {
          classification: string
          created_at?: string
          created_by: string
          enabled?: boolean
          field: string
          id?: string
          name: string
          op: string
          org_id: string
          position?: number
          updated_at?: string
          value?: string
        }
        Update: {
          classification?: string
          created_at?: string
          created_by?: string
          enabled?: boolean
          field?: string
          id?: string
          name?: string
          op?: string
          org_id?: string
          position?: number
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "responder_rules_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      responder_settings: {
        Row: {
          auto_approve: Json
          org_id: string
          updated_at: string
        }
        Insert: {
          auto_approve?: Json
          org_id: string
          updated_at?: string
        }
        Update: {
          auto_approve?: Json
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "responder_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      short_links: {
        Row: {
          click_count: number
          created_at: string
          created_by: string
          id: string
          label: string | null
          org_id: string
          slug: string
          target_url: string
          utm_link_id: string | null
          workspace_id: string | null
        }
        Insert: {
          click_count?: number
          created_at?: string
          created_by: string
          id?: string
          label?: string | null
          org_id: string
          slug: string
          target_url: string
          utm_link_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          click_count?: number
          created_at?: string
          created_by?: string
          id?: string
          label?: string | null
          org_id?: string
          slug?: string
          target_url?: string
          utm_link_id?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      taxonomy_settings: {
        Row: {
          audiences: Json
          channels: Json
          id: string
          objectives: Json
          org_id: string
          quarters: Json
          regions: Json
          separator: string
          template: string
          updated_at: string
        }
        Insert: {
          audiences?: Json
          channels?: Json
          id?: string
          objectives?: Json
          org_id: string
          quarters?: Json
          regions?: Json
          separator?: string
          template?: string
          updated_at?: string
        }
        Update: {
          audiences?: Json
          channels?: Json
          id?: string
          objectives?: Json
          org_id?: string
          quarters?: Json
          regions?: Json
          separator?: string
          template?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "taxonomy_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      licencias: {
        Row: {
          ciudad: string | null
          cliente: string
          codigo: string
          correo: string | null
          equipo_id: string | null
          created_at: string
          estado: string
          id: string
          inicio: string
          notas: string | null
          telefono: string | null
          tipo: string
          ultima_verificacion: string | null
          updated_at: string
          vence_el: string
        }
        Insert: {
          ciudad?: string | null
          cliente: string
          codigo?: string
          correo?: string | null
          equipo_id?: string | null
          created_at?: string
          estado?: string
          id?: string
          inicio?: string
          notas?: string | null
          telefono?: string | null
          tipo?: string
          ultima_verificacion?: string | null
          updated_at?: string
          vence_el?: string
        }
        Update: {
          ciudad?: string | null
          cliente?: string
          codigo?: string
          correo?: string | null
          equipo_id?: string | null
          created_at?: string
          estado?: string
          id?: string
          inicio?: string
          notas?: string | null
          telefono?: string | null
          tipo?: string
          ultima_verificacion?: string | null
          updated_at?: string
          vence_el?: string
        }
        Relationships: []
      }
      solicitudes_licencia: {
        Row: {
          cliente: string
          correo: string
          created_at: string
          equipo_id: string
          estado: string
          id: string
          licencia_id: string | null
          sistema: string | null
          telefono: string | null
          updated_at: string
        }
        Insert: {
          cliente: string
          correo: string
          created_at?: string
          equipo_id: string
          estado?: string
          id?: string
          licencia_id?: string | null
          sistema?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          cliente?: string
          correo?: string
          created_at?: string
          equipo_id?: string
          estado?: string
          id?: string
          licencia_id?: string | null
          sistema?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitudes_licencia_licencia_id_fkey"
            columns: ["licencia_id"]
            isOneToOne: false
            referencedRelation: "licencias"
            referencedColumns: ["id"]
          },
        ]
      }
      pagos_licencia: {
        Row: {
          comprobante_url: string | null
          correo: string | null
          created_at: string
          estado: string
          id: string
          monto: number
          owner_id: string
          revisado_en: string | null
          tipo: string
        }
        Insert: {
          comprobante_url?: string | null
          correo?: string | null
          created_at?: string
          estado?: string
          id?: string
          monto?: number
          owner_id?: string
          revisado_en?: string | null
          tipo: string
        }
        Update: {
          comprobante_url?: string | null
          correo?: string | null
          created_at?: string
          estado?: string
          id?: string
          monto?: number
          owner_id?: string
          revisado_en?: string | null
          tipo?: string
        }
        Relationships: []
      }
      claves_activacion: {
        Row: {
          clave: string
          created_at: string
          estado: string
          id: string
          owner_id: string
          usada_en: string | null
        }
        Insert: {
          clave: string
          created_at?: string
          estado?: string
          id?: string
          owner_id: string
          usada_en?: string | null
        }
        Update: {
          clave?: string
          created_at?: string
          estado?: string
          id?: string
          owner_id?: string
          usada_en?: string | null
        }
        Relationships: []
      }
      suscripciones_negocio: {
        Row: {
          vence_en: string
          correo_titular: string | null
          created_at: string
          dias_extra_usados: boolean
          estado: string
          inicio: string
          notas: string | null
          owner_id: string
          plan: string
          precio: number
          updated_at: string
          vence_el: string
        }
        Insert: {
          vence_en?: string
          correo_titular?: string | null
          created_at?: string
          dias_extra_usados?: boolean
          estado?: string
          inicio?: string
          notas?: string | null
          owner_id: string
          plan?: string
          precio?: number
          updated_at?: string
          vence_el?: string
        }
        Update: {
          vence_en?: string
          correo_titular?: string | null
          created_at?: string
          dias_extra_usados?: boolean
          estado?: string
          inicio?: string
          notas?: string | null
          owner_id?: string
          plan?: string
          precio?: number
          updated_at?: string
          vence_el?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          key: string
          updated_at: string
          user_id: string
          values: Json
        }
        Insert: {
          key: string
          updated_at?: string
          user_id: string
          values?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          user_id?: string
          values?: Json
        }
        Relationships: []
      }
      utm_generation_logs: {
        Row: {
          base_url: string
          created_at: string
          generated_url: string
          id: string
          org_id: string
          user_email: string
          user_id: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          workspace_id: string | null
        }
        Insert: {
          base_url: string
          created_at?: string
          generated_url: string
          id?: string
          org_id: string
          user_email: string
          user_id: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          workspace_id?: string | null
        }
        Update: {
          base_url?: string
          created_at?: string
          generated_url?: string
          id?: string
          org_id?: string
          user_email?: string
          user_id?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      utm_links: {
        Row: {
          base_url: string
          created_at: string
          created_by: string
          final_url: string
          id: string
          label: string
          org_id: string
          utm_campaign: string
          utm_content: string | null
          utm_medium: string
          utm_source: string
          utm_term: string | null
          workspace_id: string | null
        }
        Insert: {
          base_url: string
          created_at?: string
          created_by: string
          final_url: string
          id?: string
          label: string
          org_id: string
          utm_campaign: string
          utm_content?: string | null
          utm_medium: string
          utm_source: string
          utm_term?: string | null
          workspace_id?: string | null
        }
        Update: {
          base_url?: string
          created_at?: string
          created_by?: string
          final_url?: string
          id?: string
          label?: string
          org_id?: string
          utm_campaign?: string
          utm_content?: string | null
          utm_medium?: string
          utm_source?: string
          utm_term?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "utm_links_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "utm_links_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      utm_settings: {
        Row: {
          campaigns: Json
          default_base_url: string | null
          id: string
          mediums: Json
          org_id: string
          sources: Json
          updated_at: string
        }
        Insert: {
          campaigns?: Json
          default_base_url?: string | null
          id?: string
          mediums?: Json
          org_id: string
          sources?: Json
          updated_at?: string
        }
        Update: {
          campaigns?: Json
          default_base_url?: string | null
          id?: string
          mediums?: Json
          org_id?: string
          sources?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "utm_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      utm_templates: {
        Row: {
          base_url: string | null
          created_at: string
          created_by: string
          id: string
          is_default: boolean
          name: string
          org_id: string
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          base_url?: string | null
          created_at?: string
          created_by: string
          id?: string
          is_default?: boolean
          name: string
          org_id: string
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          base_url?: string | null
          created_at?: string
          created_by?: string
          id?: string
          is_default?: boolean
          name?: string
          org_id?: string
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "utm_templates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_subscriptions: {
        Row: {
          active: boolean
          created_at: string
          created_by: string
          events: string[]
          id: string
          org_id: string
          secret: string
          updated_at: string
          url: string
          workspace_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by: string
          events?: string[]
          id?: string
          org_id: string
          secret: string
          updated_at?: string
          url: string
          workspace_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string
          events?: string[]
          id?: string
          org_id?: string
          secret?: string
          updated_at?: string
          url?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      workspace_activity: {
        Row: {
          actor_id: string
          created_at: string
          id: string
          kind: string
          org_id: string
          payload: Json
          workspace_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          id?: string
          kind: string
          org_id: string
          payload?: Json
          workspace_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          id?: string
          kind?: string
          org_id?: string
          payload?: Json
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_activity_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_assets: {
        Row: {
          created_at: string
          id: string
          kind: string
          label: string
          mime_type: string | null
          org_id: string
          size_bytes: number | null
          storage_path: string | null
          uploaded_by: string
          url: string
          version: number
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          label: string
          mime_type?: string | null
          org_id: string
          size_bytes?: number | null
          storage_path?: string | null
          uploaded_by: string
          url: string
          version?: number
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          label?: string
          mime_type?: string | null
          org_id?: string
          size_bytes?: number | null
          storage_path?: string | null
          uploaded_by?: string
          url?: string
          version?: number
          workspace_id?: string
        }
        Relationships: []
      }
      workspace_budget_lines: {
        Row: {
          actual_cents: number
          channel: string | null
          created_at: string
          created_by: string
          id: string
          label: string
          org_id: string
          planned_cents: number
          position: number
          updated_at: string
          vendor: string | null
          workspace_id: string
        }
        Insert: {
          actual_cents?: number
          channel?: string | null
          created_at?: string
          created_by: string
          id?: string
          label: string
          org_id: string
          planned_cents?: number
          position?: number
          updated_at?: string
          vendor?: string | null
          workspace_id: string
        }
        Update: {
          actual_cents?: number
          channel?: string | null
          created_at?: string
          created_by?: string
          id?: string
          label?: string
          org_id?: string
          planned_cents?: number
          position?: number
          updated_at?: string
          vendor?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      workspace_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          mentions: string[]
          org_id: string
          parent_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          mentions?: string[]
          org_id: string
          parent_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          mentions?: string[]
          org_id?: string
          parent_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      workspace_kpis: {
        Row: {
          channel: string
          clicks: number
          conversions: number
          created_at: string
          created_by: string
          id: string
          notes: string | null
          opens: number
          org_id: string
          revenue_cents: number
          sent: number
          spend_cents: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          channel: string
          clicks?: number
          conversions?: number
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          opens?: number
          org_id: string
          revenue_cents?: number
          sent?: number
          spend_cents?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          channel?: string
          clicks?: number
          conversions?: number
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          opens?: number
          org_id?: string
          revenue_cents?: number
          sent?: number
          spend_cents?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      workspace_retros: {
        Row: {
          campaign_type: Database["public"]["Enums"]["campaign_type"]
          created_at: string
          created_by: string
          id: string
          next_time: string | null
          org_id: string
          what_didnt: string | null
          what_worked: string | null
          workspace_id: string
        }
        Insert: {
          campaign_type?: Database["public"]["Enums"]["campaign_type"]
          created_at?: string
          created_by: string
          id?: string
          next_time?: string | null
          org_id: string
          what_didnt?: string | null
          what_worked?: string | null
          workspace_id: string
        }
        Update: {
          campaign_type?: Database["public"]["Enums"]["campaign_type"]
          created_at?: string
          created_by?: string
          id?: string
          next_time?: string | null
          org_id?: string
          what_didnt?: string | null
          what_worked?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      workspace_share_links: {
        Row: {
          click_count: number
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          label: string | null
          org_id: string
          scope: string
          token: string
          workspace_id: string
        }
        Insert: {
          click_count?: number
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          label?: string | null
          org_id: string
          scope?: string
          token: string
          workspace_id: string
        }
        Update: {
          click_count?: number
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          label?: string | null
          org_id?: string
          scope?: string
          token?: string
          workspace_id?: string
        }
        Relationships: []
      }
      workspace_templates: {
        Row: {
          campaign_type: Database["public"]["Enums"]["campaign_type"]
          created_at: string
          created_by: string | null
          default_checklist: Json
          description: string | null
          id: string
          is_seed: boolean
          name: string
          org_id: string | null
          suggested_channels: Json
          suggested_kpi_label: string | null
          updated_at: string
        }
        Insert: {
          campaign_type?: Database["public"]["Enums"]["campaign_type"]
          created_at?: string
          created_by?: string | null
          default_checklist?: Json
          description?: string | null
          id?: string
          is_seed?: boolean
          name: string
          org_id?: string | null
          suggested_channels?: Json
          suggested_kpi_label?: string | null
          updated_at?: string
        }
        Update: {
          campaign_type?: Database["public"]["Enums"]["campaign_type"]
          created_at?: string
          created_by?: string | null
          default_checklist?: Json
          description?: string | null
          id?: string
          is_seed?: boolean
          name?: string
          org_id?: string | null
          suggested_channels?: Json
          suggested_kpi_label?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      workspaces: {
        Row: {
          budget_cents: number
          campaign_type: Database["public"]["Enums"]["campaign_type"]
          channel: string | null
          created_at: string
          currency: string
          end_date: string | null
          goal: string | null
          id: string
          is_sample: boolean
          kpi_actual: number | null
          kpi_label: string | null
          kpi_target: number | null
          name: string
          org_id: string
          owner_id: string
          revenue_cents: number
          spend_cents: number
          start_date: string | null
          status: string
          taxonomy_snapshot: Json | null
          updated_at: string
          workspace_flow: Json
        }
        Insert: {
          budget_cents?: number
          campaign_type?: Database["public"]["Enums"]["campaign_type"]
          channel?: string | null
          created_at?: string
          currency?: string
          end_date?: string | null
          goal?: string | null
          id?: string
          is_sample?: boolean
          kpi_actual?: number | null
          kpi_label?: string | null
          kpi_target?: number | null
          name: string
          org_id: string
          owner_id: string
          revenue_cents?: number
          spend_cents?: number
          start_date?: string | null
          status?: string
          taxonomy_snapshot?: Json | null
          updated_at?: string
          workspace_flow?: Json
        }
        Update: {
          budget_cents?: number
          campaign_type?: Database["public"]["Enums"]["campaign_type"]
          channel?: string | null
          created_at?: string
          currency?: string
          end_date?: string | null
          goal?: string | null
          id?: string
          is_sample?: boolean
          kpi_actual?: number | null
          kpi_label?: string | null
          kpi_target?: number | null
          name?: string
          org_id?: string
          owner_id?: string
          revenue_cents?: number
          spend_cents?: number
          start_date?: string | null
          status?: string
          taxonomy_snapshot?: Json | null
          updated_at?: string
          workspace_flow?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_org_invite: { Args: { _token: string }; Returns: string }
      es_superadmin: { Args: never; Returns: boolean }
      verificar_licencia: { Args: { p_codigo: string }; Returns: Json }
      verificar_licencia_equipo: { Args: { p_codigo: string; p_equipo: string }; Returns: Json }
      consultar_licencia_equipo: { Args: { p_equipo: string }; Returns: Json }
      solicitar_licencia: {
        Args: { p_equipo: string; p_correo: string; p_cliente: string; p_telefono?: string; p_sistema?: string }
        Returns: Json
      }
      aprobar_solicitud_licencia: { Args: { p_id: string; p_tipo: string }; Returns: string }
      aprobar_pago_licencia: { Args: { p_id: string }; Returns: Json }
      generar_clave_activacion: { Args: { p_owner: string }; Returns: string }
      activar_licencia: { Args: { p_clave: string }; Returns: Json }
      mi_licencia_vigente: { Args: never; Returns: Json }
      mi_acceso: { Args: never; Returns: Json }
      mi_negocio_id: { Args: never; Returns: string }
      ret_permiso: { Args: { p: string }; Returns: boolean }
      com_permiso: { Args: { p: string }; Returns: boolean }
      compra_aprobar: { Args: { p_compra: string }; Returns: undefined }
      compra_recibir: { Args: { p_compra: string; p_notas?: string }; Returns: string }
      compra_cancelar: { Args: { p_compra: string; p_motivo: string }; Returns: undefined }
      retoma_decidir: { Args: { p_id: string; p_decision: string; p_notas?: string }; Returns: undefined }
      retoma_a_inventario: { Args: { p_id: string }; Returns: string }
      consignacion_liquidar: { Args: { p_id: string }; Returns: number }
      reclamar_acceso: { Args: never; Returns: undefined }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      dispatch_hmac: {
        Args: { _body: string; _subscription_id: string }
        Returns: string
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_cron_secret: { Args: never; Returns: string }
      get_org_invite_token: { Args: { _invite_id: string }; Returns: string }
      has_org_role: {
        Args: {
          _org_id: string
          _role: Database["public"]["Enums"]["org_role"]
        }
        Returns: boolean
      }
      has_org_role_any: {
        Args: {
          _org_id: string
          _roles: Database["public"]["Enums"]["org_role"][]
        }
        Returns: boolean
      }
      descontar_insumos_pedido: { Args: { p_pedido: string }; Returns: number }
      devolver_insumos_pedido: { Args: { p_pedido: string }; Returns: number }
      registrar_compra_insumo: {
        Args: {
          p_insumo: string
          p_cantidad: number
          p_costo_total: number
          p_proveedor: string
          p_credito: boolean
        }
        Returns: number
      }
      mover_stock_bodega: {
        Args: { p_insumo: string; p_origen: string; p_destino: string; p_cantidad: number }
        Returns: undefined
      }
      registrar_compra_insumo_bodega: {
        Args: {
          p_insumo: string
          p_cantidad: number
          p_costo_total: number
          p_proveedor: string
          p_credito: boolean
          p_bodega?: string
        }
        Returns: number
      }
      devolver_compra_insumo: {
        Args: { p_insumo: string; p_cantidad: number; p_motivo: string }
        Returns: number
      }
      devolver_compra_proveedor: {
        Args: {
          p_insumo: string
          p_cantidad: number
          p_motivo: string
          p_proveedor: string
          p_valor: number
        }
        Returns: number
      }
      is_org_member: { Args: { _org_id: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      org_default_creator: { Args: { _org_id: string }; Returns: string }
      org_id_from_slug: { Args: { _slug: string }; Returns: string }
      public_invite_by_token: {
        Args: { _token: string }
        Returns: {
          accepted_at: string
          email: string
          expires_at: string
          id: string
          org_id: string
          org_name: string
          role: Database["public"]["Enums"]["org_role"]
        }[]
      }
      public_request_status: {
        Args: { _token: string }
        Returns: {
          brief: string
          created_at: string
          id: string
          status: Database["public"]["Enums"]["campaign_request_status"]
          workspace_id: string
        }[]
      }
      seguimiento_pedido: {
        Args: { _id: string }
        Returns: {
          created_at: string
          estado: string
          metodo_pago: string
          modalidad: string
          total: number
        }[]
      }
      public_seed_templates: {
        Args: never
        Returns: {
          campaign_type: Database["public"]["Enums"]["campaign_type"]
          description: string
          id: string
          name: string
        }[]
      }
      public_workspace_by_token: {
        Args: { _token: string }
        Returns: {
          channel: string
          end_date: string
          goal: string
          id: string
          kpi_actual: number
          kpi_label: string
          kpi_target: number
          name: string
          org_id: string
          start_date: string
          status: string
        }[]
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      record_ai_call: {
        Args: { _fn: string; _limit?: number }
        Returns: number
      }
      record_link_click: {
        Args: {
          _org_id: string
          _ref: string
          _short_link_id: string
          _ua: string
        }
        Returns: undefined
      }
      record_share_view: { Args: { _token: string }; Returns: undefined }
      resolve_referral_slug: {
        Args: { _slug: string }
        Returns: {
          org_id: string
          referral_link_id: string
          referrer_name: string
        }[]
      }
      resolve_short_link: {
        Args: { _slug: string }
        Returns: {
          id: string
          org_id: string
          target_url: string
        }[]
      }
      seed_contacts_sample: {
        Args: { _org_id: string; _user_id: string }
        Returns: undefined
      }
      seed_funnel_sample: {
        Args: { _org_id: string; _user_id: string }
        Returns: undefined
      }
      shares_org_with: { Args: { _other: string }; Returns: boolean }
    }
    Enums: {
      asset_review_status: "pending" | "approved" | "changes_requested"
      campaign_request_status: "new" | "accepted" | "declined" | "converted"
      campaign_type:
        | "product_launch"
        | "webinar"
        | "newsletter"
        | "paid_acquisition"
        | "event"
        | "content"
        | "other"
      lead_status: "new" | "contacted" | "qualified" | "closed"
      org_role: "owner" | "admin" | "member"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      asset_review_status: ["pending", "approved", "changes_requested"],
      campaign_request_status: ["new", "accepted", "declined", "converted"],
      campaign_type: [
        "product_launch",
        "webinar",
        "newsletter",
        "paid_acquisition",
        "event",
        "content",
        "other",
      ],
      lead_status: ["new", "contacted", "qualified", "closed"],
      org_role: ["owner", "admin", "member"],
    },
  },
} as const
