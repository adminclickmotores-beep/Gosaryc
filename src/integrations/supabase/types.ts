export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Ayudas para las tablas de compraventa, distribuidora y taller de motos (mismas reglas que el resto de tablas).
type OpcionalesExcepto<R, Req extends keyof R> = Pick<R, Req> & Partial<Omit<R, Req>>
type BaseNeg = { id: string; owner_id: string | null; tipo_negocio: string | null; created_at: string }
type CvArticuloRow = BaseNeg & { nombre: string; descripcion: string | null; fotos: string[]; origen: string; contrato_id: string | null; vendedor: string | null; vendedor_doc: string | null; vendedor_tel: string | null; costo: number; precio_venta: number; ubicacion: string | null; estado: string; precio_vendido: number | null; metodo: string | null; recibo: string | null; vendido_en: string | null }
type CvContratoRow = BaseNeg & { numero: string; articulo: string; descripcion: string | null; fotos: string[]; cliente: string; documento: string | null; telefono: string | null; avaluo: number; prestado: number; plazo_dias: number; retroventa_pct: number; inicio: string; vence: string; prorrogas: number; estado: string; articulo_id: string | null; metodo: string | null }
type CvMovimientoRow = BaseNeg & { contrato_id: string; numero: string; articulo: string; cliente: string; tipo: string; capital: number; interes: number; total: number; vence_anterior: string | null; vence_nuevo: string | null; metodo: string; recibo: string; fecha: string }
type DisRutaRow = BaseNeg & { nombre: string; vendedor: string | null; vehiculo: string | null; zona: string | null; dias: string | null; activo: boolean }
type DisClienteRow = BaseNeg & { nombre: string; documento: string | null; telefono: string | null; direccion: string | null; canal: string; cupo_credito: number; saldo: number; ruta_id: string | null; activo: boolean }
type DisProductoRow = BaseNeg & { nombre: string; sku: string | null; presentacion: string; unidades_por_presentacion: number; stock_unidades: number; costo_unidad: number; precio_unidad: number; activo: boolean }
type DisPrecioRow = BaseNeg & { producto_id: string; canal: string; desde_unidades: number; precio_unidad: number }
type DisPedidoRow = BaseNeg & { numero: string; cliente_id: string; cliente: string; canal: string; ruta_id: string | null; ruta: string | null; fecha: string; fecha_entrega: string | null; condicion: string; estado: string; total: number; metodo: string | null; despachado_en: string | null }
type DisPedidoItemRow = BaseNeg & { pedido_id: string; producto_id: string; nombre: string; presentacion: string; cantidad: number; unidades: number; precio_unidad: number; costo_unidad: number; subtotal: number }
type DisAbonoRow = BaseNeg & { cliente_id: string; cliente: string; monto: number; metodo: string; recibo: string; fecha: string }
type MotMecanicoRow = BaseNeg & { nombre: string; comision_pct: number; activo: boolean }
type MotRepuestoRow = BaseNeg & { nombre: string; referencia: string | null; proveedor: string | null; stock: number; stock_minimo: number; costo: number; precio: number; activo: boolean }
type MotOrdenRow = BaseNeg & { numero: string; placa: string; marca: string | null; cilindraje: number | null; kilometraje: number; cliente: string; documento: string | null; telefono: string | null; falla: string; checklist: Json; fotos: string[]; mecanico_id: string | null; mecanico: string | null; estado: string; mano_obra: number; repuestos_total: number; total: number; comision_pct: number; comision: number; comision_pagada: boolean; pagado: boolean; metodo: string | null; prox_mantenimiento: string | null; entregada_en: string | null }
type MotOrdenRepuestoRow = BaseNeg & { orden_id: string; repuesto_id: string; nombre: string; cantidad: number; precio: number; costo: number; subtotal: number; anulado: boolean }

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      tarifas_vehiculares_colombia: {
        Row: {
          id: string
          anio: number
          datos: Json
          fuente: string | null
          origen: string
          verificado_en: string
          created_at: string
        }
        Insert: {
          id?: string
          anio: number
          datos: Json
          fuente?: string | null
          origen?: string
          verificado_en?: string
          created_at?: string
        }
        Update: {
          id?: string
          anio?: number
          datos?: Json
          fuente?: string | null
          origen?: string
          verificado_en?: string
          created_at?: string
        }
        Relationships: []
      }
      asesor_ia_diagnosticos: {
        Row: {
          id: string
          negocio_id: string
          owner_id: string
          diagnostico: Json
          creado_en: string
          actualizado_en: string
        }
        Insert: {
          id?: string
          negocio_id: string
          owner_id: string
          diagnostico: Json
          creado_en?: string
          actualizado_en?: string
        }
        Update: {
          id?: string
          negocio_id?: string
          owner_id?: string
          diagnostico?: Json
          creado_en?: string
          actualizado_en?: string
        }
        Relationships: [
          {
            foreignKeyName: "asesor_ia_diagnosticos_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: true
            referencedRelation: "negocio_config"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_bridge: {
        Row: {
          id: string
          business_id: string
          pairing_code: string
          status: string
          last_heartbeat: string | null
          auto_pilot_200: boolean
          config_version: number
          mensajes_hoy: number
          mensajes_hoy_fecha: string
          last_sync_at: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          business_id: string
          pairing_code: string
          status?: string
          last_heartbeat?: string | null
          auto_pilot_200?: boolean
          config_version?: number
          mensajes_hoy?: number
          mensajes_hoy_fecha?: string
          last_sync_at?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          pairing_code?: string
          status?: string
          last_heartbeat?: string | null
          auto_pilot_200?: boolean
          config_version?: number
          mensajes_hoy?: number
          mensajes_hoy_fecha?: string
          last_sync_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_bridge_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "negocio_config"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_meta_config: {
        Row: {
          id: string
          business_id: string
          owner_id: string
          meta_phone_number_id: string
          meta_access_token: string
          meta_verify_token: string
          meta_app_secret: string
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_id: string
          owner_id: string
          meta_phone_number_id: string
          meta_access_token?: string
          meta_verify_token: string
          meta_app_secret?: string
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          owner_id?: string
          meta_phone_number_id?: string
          meta_access_token?: string
          meta_verify_token?: string
          meta_app_secret?: string
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_meta_historial: {
        Row: {
          id: string
          business_id: string
          telefono: string
          rol: string
          contenido: string
          wa_message_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          business_id: string
          telefono: string
          rol: string
          contenido?: string
          wa_message_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          telefono?: string
          rol?: string
          contenido?: string
          wa_message_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      whatsapp_comandos_autorizados: {
        Row: {
          id: string
          owner_id: string | null
          telefono: string
          nombre: string
          puede_inventario: boolean
          puede_facturar: boolean
          puede_pedidos: boolean
          puede_reportes: boolean
          activo: boolean
          created_at: string
        }
        Insert: {
          id?: string
          owner_id?: string | null
          telefono: string
          nombre?: string
          puede_inventario?: boolean
          puede_facturar?: boolean
          puede_pedidos?: boolean
          puede_reportes?: boolean
          activo?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          owner_id?: string | null
          telefono?: string
          nombre?: string
          puede_inventario?: boolean
          puede_facturar?: boolean
          puede_pedidos?: boolean
          puede_reportes?: boolean
          activo?: boolean
          created_at?: string
        }
        Relationships: []
      }
      whatsapp_comandos_ejecutados: {
        Row: {
          id: string
          owner_id: string | null
          telefono: string
          nombre: string
          accion: string
          texto_original: string
          entidades: Json
          vista_previa: string
          estado: string
          resultado: string
          created_at: string
          ejecutado_en: string | null
        }
        Insert: {
          id?: string
          owner_id?: string | null
          telefono?: string
          nombre?: string
          accion?: string
          texto_original?: string
          entidades?: Json
          vista_previa?: string
          estado?: string
          resultado?: string
          created_at?: string
          ejecutado_en?: string | null
        }
        Update: {
          id?: string
          owner_id?: string | null
          telefono?: string
          nombre?: string
          accion?: string
          texto_original?: string
          entidades?: Json
          vista_previa?: string
          estado?: string
          resultado?: string
          created_at?: string
          ejecutado_en?: string | null
        }
        Relationships: []
      }
      whatsapp_outbox: {
        Row: {
          id: string
          business_id: string
          telefono: string
          mensaje: string
          estado: string
          created_at: string
        }
        Insert: {
          id?: string
          business_id: string
          telefono: string
          mensaje: string
          estado?: string
          created_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          telefono?: string
          mensaje?: string
          estado?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_outbox_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "negocio_config"
            referencedColumns: ["id"]
          },
        ]
      }
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
          anulado: boolean
          anulado_en: string | null
          anulado_por: string | null
          motivo_anulacion: string | null
          origen_id: string | null
          origen_tipo: string | null
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
          anulado?: boolean
          anulado_en?: string | null
          anulado_por?: string | null
          motivo_anulacion?: string | null
          origen_id?: string | null
          origen_tipo?: string | null
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
          anulado?: boolean
          anulado_en?: string | null
          anulado_por?: string | null
          motivo_anulacion?: string | null
          origen_id?: string | null
          origen_tipo?: string | null
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
          sucursal_id: string | null
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
          sucursal_id?: string | null
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
          sucursal_id?: string | null
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
          referencia_pago: string | null
          registrado_por: string | null
          sucursal_id: string | null
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
          referencia_pago?: string | null
          registrado_por?: string | null
          sucursal_id?: string | null
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
          referencia_pago?: string | null
          registrado_por?: string | null
          sucursal_id?: string | null
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
      pan_recetas: {
        Row: {
          activo: boolean
          created_at: string
          gramaje_unidad: number
          id: string
          nombre: string
          notas: string | null
          owner_id: string | null
          precio_venta: number
          stock_vitrina: number
          tipo_negocio: string | null
          unidades_por_lote: number
        }
        Insert: {
          activo?: boolean
          created_at?: string
          gramaje_unidad?: number
          id?: string
          nombre: string
          notas?: string | null
          owner_id?: string | null
          precio_venta?: number
          stock_vitrina?: number
          tipo_negocio?: string | null
          unidades_por_lote?: number
        }
        Update: {
          activo?: boolean
          created_at?: string
          gramaje_unidad?: number
          id?: string
          nombre?: string
          notas?: string | null
          owner_id?: string | null
          precio_venta?: number
          stock_vitrina?: number
          tipo_negocio?: string | null
          unidades_por_lote?: number
        }
        Relationships: []
      }
      cl_pacientes: {
        Row: {
          activo: boolean
          alergias: string | null
          created_at: string
          duenio_correo: string | null
          duenio_documento: string | null
          duenio_nombre: string
          duenio_telefono: string | null
          especie: string | null
          fecha_nacimiento: string | null
          foto_path: string | null
          id: string
          nombre: string
          notas: string | null
          owner_id: string | null
          peso_kg: number | null
          raza: string | null
          sexo: string | null
          tipo_negocio: string | null
        }
        Insert: {
          activo?: boolean
          alergias?: string | null
          created_at?: string
          duenio_correo?: string | null
          duenio_documento?: string | null
          duenio_nombre: string
          duenio_telefono?: string | null
          especie?: string | null
          fecha_nacimiento?: string | null
          foto_path?: string | null
          id?: string
          nombre: string
          notas?: string | null
          owner_id?: string | null
          peso_kg?: number | null
          raza?: string | null
          sexo?: string | null
          tipo_negocio?: string | null
        }
        Update: {
          activo?: boolean
          alergias?: string | null
          created_at?: string
          duenio_correo?: string | null
          duenio_documento?: string | null
          duenio_nombre?: string
          duenio_telefono?: string | null
          especie?: string | null
          fecha_nacimiento?: string | null
          foto_path?: string | null
          id?: string
          nombre?: string
          notas?: string | null
          owner_id?: string | null
          peso_kg?: number | null
          raza?: string | null
          sexo?: string | null
          tipo_negocio?: string | null
        }
        Relationships: []
      }
      cl_historias: {
        Row: {
          adjuntos: string[]
          control_en: string | null
          control_motivo: string | null
          created_at: string
          creado_por: string | null
          diagnostico: string
          formula: Json
          frecuencia_cardiaca: number | null
          frecuencia_respiratoria: number | null
          id: string
          motivo: string
          otros_signos: string | null
          owner_id: string | null
          paciente_id: string
          peso_kg: number | null
          presion: string | null
          profesional: string | null
          temperatura: number | null
          tipo_negocio: string | null
          tratamiento: string | null
        }
        Insert: {
          adjuntos?: string[]
          control_en?: string | null
          control_motivo?: string | null
          created_at?: string
          creado_por?: string | null
          diagnostico: string
          formula?: Json
          frecuencia_cardiaca?: number | null
          frecuencia_respiratoria?: number | null
          id?: string
          motivo: string
          otros_signos?: string | null
          owner_id?: string | null
          paciente_id: string
          peso_kg?: number | null
          presion?: string | null
          profesional?: string | null
          temperatura?: number | null
          tipo_negocio?: string | null
          tratamiento?: string | null
        }
        Update: {
          adjuntos?: string[]
          control_en?: string | null
          control_motivo?: string | null
          created_at?: string
          creado_por?: string | null
          diagnostico?: string
          formula?: Json
          frecuencia_cardiaca?: number | null
          frecuencia_respiratoria?: number | null
          id?: string
          motivo?: string
          otros_signos?: string | null
          owner_id?: string | null
          paciente_id?: string
          peso_kg?: number | null
          presion?: string | null
          profesional?: string | null
          temperatura?: number | null
          tipo_negocio?: string | null
          tratamiento?: string | null
        }
        Relationships: []
      }
      cl_notas_aclaratorias: {
        Row: {
          autor: string | null
          created_at: string
          creado_por: string | null
          historia_id: string
          id: string
          nota: string
          owner_id: string | null
          paciente_id: string
          tipo_negocio: string | null
        }
        Insert: {
          autor?: string | null
          created_at?: string
          creado_por?: string | null
          historia_id: string
          id?: string
          nota: string
          owner_id?: string | null
          paciente_id: string
          tipo_negocio?: string | null
        }
        Update: {
          autor?: string | null
          created_at?: string
          creado_por?: string | null
          historia_id?: string
          id?: string
          nota?: string
          owner_id?: string | null
          paciente_id?: string
          tipo_negocio?: string | null
        }
        Relationships: []
      }
      cl_vacunas: {
        Row: {
          aplicada_en: string
          aplicado_por: string | null
          created_at: string
          id: string
          lote: string | null
          nombre: string
          notas: string | null
          owner_id: string | null
          paciente_id: string
          proxima_en: string | null
          tipo: string
          tipo_negocio: string | null
        }
        Insert: {
          aplicada_en?: string
          aplicado_por?: string | null
          created_at?: string
          id?: string
          lote?: string | null
          nombre: string
          notas?: string | null
          owner_id?: string | null
          paciente_id: string
          proxima_en?: string | null
          tipo?: string
          tipo_negocio?: string | null
        }
        Update: {
          aplicada_en?: string
          aplicado_por?: string | null
          created_at?: string
          id?: string
          lote?: string | null
          nombre?: string
          notas?: string | null
          owner_id?: string | null
          paciente_id?: string
          proxima_en?: string | null
          tipo?: string
          tipo_negocio?: string | null
        }
        Relationships: []
      }
      cl_servicios: {
        Row: {
          activo: boolean
          categoria: string
          comision_pct: number
          created_at: string
          id: string
          nombre: string
          owner_id: string | null
          precio: number
          tipo_negocio: string | null
        }
        Insert: {
          activo?: boolean
          categoria?: string
          comision_pct?: number
          created_at?: string
          id?: string
          nombre: string
          owner_id?: string | null
          precio?: number
          tipo_negocio?: string | null
        }
        Update: {
          activo?: boolean
          categoria?: string
          comision_pct?: number
          created_at?: string
          id?: string
          nombre?: string
          owner_id?: string | null
          precio?: number
          tipo_negocio?: string | null
        }
        Relationships: []
      }
      cl_insumos: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          lote: string | null
          minimo: number
          nombre: string
          owner_id: string | null
          precio_venta: number
          stock: number
          tipo_negocio: string | null
          unidad: string
          vence_en: string | null
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          lote?: string | null
          minimo?: number
          nombre: string
          owner_id?: string | null
          precio_venta?: number
          stock?: number
          tipo_negocio?: string | null
          unidad?: string
          vence_en?: string | null
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          lote?: string | null
          minimo?: number
          nombre?: string
          owner_id?: string | null
          precio_venta?: number
          stock?: number
          tipo_negocio?: string | null
          unidad?: string
          vence_en?: string | null
        }
        Relationships: []
      }
      cl_citas: {
        Row: {
          cobro_id: string | null
          consultorio: string | null
          created_at: string
          duracion_min: number
          estado: string
          id: string
          inicio: string
          motivo: string | null
          owner_id: string | null
          paciente_id: string
          profesional: string
          tipo_negocio: string | null
        }
        Insert: {
          cobro_id?: string | null
          consultorio?: string | null
          created_at?: string
          duracion_min?: number
          estado?: string
          id?: string
          inicio: string
          motivo?: string | null
          owner_id?: string | null
          paciente_id: string
          profesional: string
          tipo_negocio?: string | null
        }
        Update: {
          cobro_id?: string | null
          consultorio?: string | null
          created_at?: string
          duracion_min?: number
          estado?: string
          id?: string
          inicio?: string
          motivo?: string | null
          owner_id?: string | null
          paciente_id?: string
          profesional?: string
          tipo_negocio?: string | null
        }
        Relationships: []
      }
      cl_cobros: {
        Row: {
          cita_id: string | null
          cobrado_en: string | null
          comision_total: number
          created_at: string
          estado: string
          id: string
          items: Json
          metodo: string | null
          owner_id: string | null
          paciente_id: string
          profesional: string
          tipo_negocio: string | null
          total: number
        }
        Insert: {
          cita_id?: string | null
          cobrado_en?: string | null
          comision_total?: number
          created_at?: string
          estado?: string
          id?: string
          items?: Json
          metodo?: string | null
          owner_id?: string | null
          paciente_id: string
          profesional: string
          tipo_negocio?: string | null
          total?: number
        }
        Update: {
          cita_id?: string | null
          cobrado_en?: string | null
          comision_total?: number
          created_at?: string
          estado?: string
          id?: string
          items?: Json
          metodo?: string | null
          owner_id?: string | null
          paciente_id?: string
          profesional?: string
          tipo_negocio?: string | null
          total?: number
        }
        Relationships: []
      }
      cl_comisiones: {
        Row: {
          base: number
          categoria: string
          cobro_id: string
          concepto: string
          created_at: string
          estado: string
          fecha: string
          id: string
          liquidada_en: string | null
          owner_id: string | null
          porcentaje: number
          profesional: string
          tipo_negocio: string | null
          valor: number
        }
        Insert: {
          base?: number
          categoria?: string
          cobro_id: string
          concepto: string
          created_at?: string
          estado?: string
          fecha?: string
          id?: string
          liquidada_en?: string | null
          owner_id?: string | null
          porcentaje?: number
          profesional: string
          tipo_negocio?: string | null
          valor?: number
        }
        Update: {
          base?: number
          categoria?: string
          cobro_id?: string
          concepto?: string
          created_at?: string
          estado?: string
          fecha?: string
          id?: string
          liquidada_en?: string | null
          owner_id?: string | null
          porcentaje?: number
          profesional?: string
          tipo_negocio?: string | null
          valor?: number
        }
        Relationships: []
      }
      pan_receta_items: {
        Row: {
          cantidad: number
          created_at: string
          id: string
          insumo_id: string
          owner_id: string | null
          receta_id: string
          tipo_negocio: string | null
        }
        Insert: {
          cantidad: number
          created_at?: string
          id?: string
          insumo_id: string
          owner_id?: string | null
          receta_id: string
          tipo_negocio?: string | null
        }
        Update: {
          cantidad?: number
          created_at?: string
          id?: string
          insumo_id?: string
          owner_id?: string | null
          receta_id?: string
          tipo_negocio?: string | null
        }
        Relationships: []
      }
      pan_producciones: {
        Row: {
          anulado: boolean
          anulado_en: string | null
          anulado_por: string | null
          costo_total: number
          costo_unitario: number
          created_at: string
          fecha: string
          horneado_por: string | null
          id: string
          lotes: number
          motivo_anulacion: string | null
          nombre: string
          notas: string | null
          owner_id: string | null
          receta_id: string | null
          tipo_negocio: string | null
          unidades: number
        }
        Insert: {
          anulado?: boolean
          anulado_en?: string | null
          anulado_por?: string | null
          costo_total?: number
          costo_unitario?: number
          created_at?: string
          fecha?: string
          horneado_por?: string | null
          id?: string
          lotes: number
          motivo_anulacion?: string | null
          nombre: string
          notas?: string | null
          owner_id?: string | null
          receta_id?: string | null
          tipo_negocio?: string | null
          unidades?: number
        }
        Update: {
          anulado?: boolean
          anulado_en?: string | null
          anulado_por?: string | null
          costo_total?: number
          costo_unitario?: number
          created_at?: string
          fecha?: string
          horneado_por?: string | null
          id?: string
          lotes?: number
          motivo_anulacion?: string | null
          nombre?: string
          notas?: string | null
          owner_id?: string | null
          receta_id?: string | null
          tipo_negocio?: string | null
          unidades?: number
        }
        Relationships: []
      }
      pan_mermas: {
        Row: {
          anulado: boolean
          anulado_en: string | null
          anulado_por: string | null
          cantidad: number
          causa: string
          clase: string
          costo_total: number
          created_at: string
          fecha: string
          id: string
          insumo_id: string | null
          motivo: string
          motivo_anulacion: string | null
          nombre: string
          owner_id: string | null
          receta_id: string | null
          registrado_por: string | null
          tipo_negocio: string | null
        }
        Insert: {
          anulado?: boolean
          anulado_en?: string | null
          anulado_por?: string | null
          cantidad: number
          causa: string
          clase: string
          costo_total?: number
          created_at?: string
          fecha?: string
          id?: string
          insumo_id?: string | null
          motivo: string
          motivo_anulacion?: string | null
          nombre: string
          owner_id?: string | null
          receta_id?: string | null
          registrado_por?: string | null
          tipo_negocio?: string | null
        }
        Update: {
          anulado?: boolean
          anulado_en?: string | null
          anulado_por?: string | null
          cantidad?: number
          causa?: string
          clase?: string
          costo_total?: number
          created_at?: string
          fecha?: string
          id?: string
          insumo_id?: string | null
          motivo?: string
          motivo_anulacion?: string | null
          nombre?: string
          owner_id?: string | null
          receta_id?: string | null
          registrado_por?: string | null
          tipo_negocio?: string | null
        }
        Relationships: []
      }
      pan_encargos: {
        Row: {
          abonado: number
          anulado: boolean
          anulado_en: string | null
          anulado_por: string | null
          cliente: string
          created_at: string
          dedicatoria: string | null
          descripcion: string
          entrega_en: string
          estado: string
          foto_path: string | null
          id: string
          motivo_anulacion: string | null
          notas: string | null
          owner_id: string | null
          sabor: string | null
          tamano: string | null
          telefono: string | null
          tipo_negocio: string | null
          total: number
        }
        Insert: {
          abonado?: number
          anulado?: boolean
          anulado_en?: string | null
          anulado_por?: string | null
          cliente: string
          created_at?: string
          dedicatoria?: string | null
          descripcion: string
          entrega_en: string
          estado?: string
          foto_path?: string | null
          id?: string
          motivo_anulacion?: string | null
          notas?: string | null
          owner_id?: string | null
          sabor?: string | null
          tamano?: string | null
          telefono?: string | null
          tipo_negocio?: string | null
          total?: number
        }
        Update: {
          abonado?: number
          anulado?: boolean
          anulado_en?: string | null
          anulado_por?: string | null
          cliente?: string
          created_at?: string
          dedicatoria?: string | null
          descripcion?: string
          entrega_en?: string
          estado?: string
          foto_path?: string | null
          id?: string
          motivo_anulacion?: string | null
          notas?: string | null
          owner_id?: string | null
          sabor?: string | null
          tamano?: string | null
          telefono?: string | null
          tipo_negocio?: string | null
          total?: number
        }
        Relationships: []
      }
      obr_obras: {
        Row: { avance: number; cliente: string | null; created_at: string; estado: string; fecha_fin: string | null; fecha_inicio: string | null; id: string; nombre: string; notas: string | null; owner_id: string | null; presupuesto: number; responsable: string | null; telefono: string | null; tipo_negocio: string | null }
        Insert: { avance?: number; cliente?: string | null; created_at?: string; estado?: string; fecha_fin?: string | null; fecha_inicio?: string | null; id?: string; nombre: string; notas?: string | null; owner_id?: string | null; presupuesto?: number; responsable?: string | null; telefono?: string | null; tipo_negocio?: string | null }
        Update: { avance?: number; cliente?: string | null; created_at?: string; estado?: string; fecha_fin?: string | null; fecha_inicio?: string | null; id?: string; nombre?: string; notas?: string | null; owner_id?: string | null; presupuesto?: number; responsable?: string | null; telefono?: string | null; tipo_negocio?: string | null }
        Relationships: []
      }
      obr_capitulos: {
        Row: { created_at: string; ejecutado: number; id: string; nombre: string; obra_id: string; owner_id: string | null; planeado: number; tipo_negocio: string | null }
        Insert: { created_at?: string; ejecutado?: number; id?: string; nombre: string; obra_id: string; owner_id?: string | null; planeado?: number; tipo_negocio?: string | null }
        Update: { created_at?: string; ejecutado?: number; id?: string; nombre?: string; obra_id?: string; owner_id?: string | null; planeado?: number; tipo_negocio?: string | null }
        Relationships: []
      }
      obr_materiales: {
        Row: { activo: boolean; costo: number; created_at: string; id: string; nombre: string; owner_id: string | null; stock: number; tipo_negocio: string | null; unidad: string }
        Insert: { activo?: boolean; costo?: number; created_at?: string; id?: string; nombre: string; owner_id?: string | null; stock?: number; tipo_negocio?: string | null; unidad?: string }
        Update: { activo?: boolean; costo?: number; created_at?: string; id?: string; nombre?: string | null; owner_id?: string | null; stock?: number; tipo_negocio?: string | null; unidad?: string }
        Relationships: []
      }
      obr_vales: {
        Row: { capitulo_id: string | null; concepto: string; created_at: string; entregado_a: string | null; id: string; obra_id: string; owner_id: string | null; tipo_negocio: string | null; total: number }
        Insert: { capitulo_id?: string | null; concepto?: string; created_at?: string; entregado_a?: string | null; id?: string; obra_id: string; owner_id?: string | null; tipo_negocio?: string | null; total?: number }
        Update: { capitulo_id?: string | null; concepto?: string; created_at?: string; entregado_a?: string | null; id?: string; obra_id?: string; owner_id?: string | null; tipo_negocio?: string | null; total?: number }
        Relationships: []
      }
      obr_vale_items: {
        Row: { cantidad: number; costo: number; created_at: string; id: string; material_id: string; nombre: string; owner_id: string | null; tipo_negocio: string | null; vale_id: string }
        Insert: { cantidad: number; costo?: number; created_at?: string; id?: string; material_id: string; nombre: string; owner_id?: string | null; tipo_negocio?: string | null; vale_id: string }
        Update: { cantidad?: number; costo?: number; created_at?: string; id?: string; material_id?: string; nombre?: string | null; owner_id?: string | null; tipo_negocio?: string | null; vale_id?: string }
        Relationships: []
      }
      obr_cortes: {
        Row: { acta: string; anticipo_aplicado: number; avance_pct: number; created_at: string; estado: string; fecha: string; id: string; neto: number; obra_id: string; owner_id: string | null; retencion: number; tipo_negocio: string | null; valor: number }
        Insert: { acta: string; anticipo_aplicado?: number; avance_pct?: number; created_at?: string; estado?: string; fecha?: string; id?: string; neto?: number; obra_id: string; owner_id?: string | null; retencion?: number; tipo_negocio?: string | null; valor: number }
        Update: { acta?: string; anticipo_aplicado?: number; avance_pct?: number; created_at?: string; estado?: string; fecha?: string; id?: string; neto?: number; obra_id?: string; owner_id?: string | null; retencion?: number; tipo_negocio?: string | null; valor?: number }
        Relationships: []
      }
      inm_propiedades: {
        Row: { piso: string | null; proyecto: string | null; torre: string | null; administracion: number; canon: number; created_at: string; direccion: string | null; estado: string; id: string; matricula: string | null; modalidad: string; notas: string | null; owner_id: string | null; precio_venta: number; propietario: string | null; telefono_prop: string | null; tipo_negocio: string | null; titulo: string }
        Insert: { piso?: string | null; proyecto?: string | null; torre?: string | null; administracion?: number; canon?: number; created_at?: string; direccion?: string | null; estado?: string; id?: string; matricula?: string | null; modalidad?: string; notas?: string | null; owner_id?: string | null; precio_venta?: number; propietario?: string | null; telefono_prop?: string | null; tipo_negocio?: string | null; titulo: string }
        Update: { piso?: string | null; proyecto?: string | null; torre?: string | null; administracion?: number; canon?: number; created_at?: string; direccion?: string | null; estado?: string; id?: string; matricula?: string | null; modalidad?: string; notas?: string | null; owner_id?: string | null; precio_venta?: number; propietario?: string | null; telefono_prop?: string | null; tipo_negocio?: string | null; titulo?: string }
        Relationships: []
      }
      inm_contratos: {
        Row: { arrendatario: string; canon: number; comision_pct: number; created_at: string; deposito: number; dia_pago: number; estado: string; fin: string | null; id: string; inicio: string; owner_id: string | null; propiedad_id: string; telefono: string | null; tipo_negocio: string | null }
        Insert: { arrendatario: string; canon: number; comision_pct?: number; created_at?: string; deposito?: number; dia_pago?: number; estado?: string; fin?: string | null; id?: string; inicio?: string; owner_id?: string | null; propiedad_id: string; telefono?: string | null; tipo_negocio?: string | null }
        Update: { arrendatario?: string; canon?: number; comision_pct?: number; created_at?: string; deposito?: number; dia_pago?: number; estado?: string; fin?: string | null; id?: string; inicio?: string; owner_id?: string | null; propiedad_id?: string; telefono?: string | null; tipo_negocio?: string | null }
        Relationships: []
      }
      inm_cobros: {
        Row: { contrato_id: string; created_at: string; estado: string; fecha: string; id: string; liquidado: boolean; owner_id: string | null; periodo: string; tipo_negocio: string | null; valor: number }
        Insert: { contrato_id: string; created_at?: string; estado?: string; fecha?: string; id?: string; liquidado?: boolean; owner_id?: string | null; periodo: string; tipo_negocio?: string | null; valor: number }
        Update: { contrato_id?: string; created_at?: string; estado?: string; fecha?: string; id?: string; liquidado?: boolean; owner_id?: string | null; periodo?: string; tipo_negocio?: string | null; valor?: number }
        Relationships: []
      }
      inm_gastos: {
        Row: { concepto: string; contrato_id: string; created_at: string; fecha: string; id: string; liquidado: boolean; owner_id: string | null; tipo_negocio: string | null; valor: number }
        Insert: { concepto: string; contrato_id: string; created_at?: string; fecha?: string; id?: string; liquidado?: boolean; owner_id?: string | null; tipo_negocio?: string | null; valor: number }
        Update: { concepto?: string; contrato_id?: string; created_at?: string; fecha?: string; id?: string; liquidado?: boolean; owner_id?: string | null; tipo_negocio?: string | null; valor?: number }
        Relationships: []
      }
      inm_liquidaciones: {
        Row: { cobros: number; comision: number; contrato_id: string; created_at: string; gastos: number; id: string; metodo: string; neto: number; owner_id: string | null; tipo_negocio: string | null; total_cobrado: number }
        Insert: { cobros?: number; comision?: number; contrato_id: string; created_at?: string; gastos?: number; id?: string; metodo?: string; neto?: number; owner_id?: string | null; tipo_negocio?: string | null; total_cobrado?: number }
        Update: { cobros?: number; comision?: number; contrato_id?: string; created_at?: string; gastos?: number; id?: string; metodo?: string; neto?: number; owner_id?: string | null; tipo_negocio?: string | null; total_cobrado?: number }
        Relationships: []
      }
      inm_ventas: {
        Row: { comision: number; comision_pct: number; comprador: string; created_at: string; id: string; metodo: string; owner_id: string | null; precio: number; propiedad_id: string; telefono: string | null; tipo_negocio: string | null }
        Insert: { comision?: number; comision_pct?: number; comprador: string; created_at?: string; id?: string; metodo?: string; owner_id?: string | null; precio: number; propiedad_id: string; telefono?: string | null; tipo_negocio?: string | null }
        Update: { comision?: number; comision_pct?: number; comprador?: string; created_at?: string; id?: string; metodo?: string; owner_id?: string | null; precio?: number; propiedad_id?: string; telefono?: string | null; tipo_negocio?: string | null }
        Relationships: []
      }
      agr_labores: {
        Row: { cantidad: number; costo: number; created_at: string; descripcion: string | null; fecha: string; id: string; lote_id: string; owner_id: string | null; tipo: string; tipo_negocio: string | null }
        Insert: { cantidad?: number; costo?: number; created_at?: string; descripcion?: string | null; fecha?: string; id?: string; lote_id: string; owner_id?: string | null; tipo?: string; tipo_negocio?: string | null }
        Update: { cantidad?: number; costo?: number; created_at?: string; descripcion?: string | null; fecha?: string; id?: string; lote_id?: string; owner_id?: string | null; tipo?: string; tipo_negocio?: string | null }
        Relationships: []
      }
      tec_tickets: {
        Row: { asunto: string; cliente: string; created_at: string; estado: string; horas: number; id: string; owner_id: string | null; prioridad: string; telefono: string | null; tipo: string; tipo_negocio: string | null; vence: string | null }
        Insert: { asunto: string; cliente: string; created_at?: string; estado?: string; horas?: number; id?: string; owner_id?: string | null; prioridad?: string; telefono?: string | null; tipo?: string; tipo_negocio?: string | null; vence?: string | null }
        Update: { asunto?: string; cliente?: string; created_at?: string; estado?: string; horas?: number; id?: string; owner_id?: string | null; prioridad?: string; telefono?: string | null; tipo?: string; tipo_negocio?: string | null; vence?: string | null }
        Relationships: []
      }
      tec_contratos: {
        Row: { activo: boolean; cliente: string; concepto: string; created_at: string; id: string; owner_id: string | null; telefono: string | null; tipo_negocio: string | null; ultimo_periodo: string | null; valor_mensual: number }
        Insert: { activo?: boolean; cliente: string; concepto: string; created_at?: string; id?: string; owner_id?: string | null; telefono?: string | null; tipo_negocio?: string | null; ultimo_periodo?: string | null; valor_mensual: number }
        Update: { activo?: boolean; cliente?: string; concepto?: string; created_at?: string; id?: string; owner_id?: string | null; telefono?: string | null; tipo_negocio?: string | null; ultimo_periodo?: string | null; valor_mensual?: number }
        Relationships: []
      }
      agr_lotes: {
        Row: { costo_acumulado: number; created_at: string; cultivo: string | null; estado: string; fecha_siembra: string | null; id: string; nombre: string; notas: string | null; owner_id: string | null; stock: number; superficie: number; tipo_negocio: string | null; unidad: string }
        Insert: { costo_acumulado?: number; created_at?: string; cultivo?: string | null; estado?: string; fecha_siembra?: string | null; id?: string; nombre: string; notas?: string | null; owner_id?: string | null; stock?: number; superficie?: number; tipo_negocio?: string | null; unidad?: string }
        Update: { costo_acumulado?: number; created_at?: string; cultivo?: string | null; estado?: string; fecha_siembra?: string | null; id?: string; nombre?: string | null; notas?: string | null; owner_id?: string | null; stock?: number; superficie?: number; tipo_negocio?: string | null; unidad?: string }
        Relationships: []
      }
      agr_insumos: {
        Row: { activo: boolean; costo: number; created_at: string; id: string; nombre: string; owner_id: string | null; stock: number; tipo_negocio: string | null; unidad: string }
        Insert: { activo?: boolean; costo?: number; created_at?: string; id?: string; nombre: string; owner_id?: string | null; stock?: number; tipo_negocio?: string | null; unidad?: string }
        Update: { activo?: boolean; costo?: number; created_at?: string; id?: string; nombre?: string | null; owner_id?: string | null; stock?: number; tipo_negocio?: string | null; unidad?: string }
        Relationships: []
      }
      agr_aplicaciones: {
        Row: { cantidad: number; costo: number; created_at: string; dosis: string | null; fecha: string; id: string; insumo_id: string; lote_id: string; nombre: string; owner_id: string | null; tipo_negocio: string | null }
        Insert: { cantidad: number; costo?: number; created_at?: string; dosis?: string | null; fecha?: string; id?: string; insumo_id: string; lote_id: string; nombre: string; owner_id?: string | null; tipo_negocio?: string | null }
        Update: { cantidad?: number; costo?: number; created_at?: string; dosis?: string | null; fecha?: string; id?: string; insumo_id?: string; lote_id?: string; nombre?: string | null; owner_id?: string | null; tipo_negocio?: string | null }
        Relationships: []
      }
      agr_cosechas: {
        Row: { cantidad: number; cliente: string | null; costo: number; created_at: string; fecha: string; id: string; lote_id: string; owner_id: string | null; precio: number; tipo_negocio: string | null; total: number; unidad: string; utilidad: number }
        Insert: { cantidad: number; cliente?: string | null; costo?: number; created_at?: string; fecha?: string; id?: string; lote_id: string; owner_id?: string | null; precio?: number; tipo_negocio?: string | null; total?: number; unidad?: string; utilidad?: number }
        Update: { cantidad?: number; cliente?: string | null; costo?: number; created_at?: string; fecha?: string; id?: string; lote_id?: string; owner_id?: string | null; precio?: number; tipo_negocio?: string | null; total?: number; unidad?: string; utilidad?: number }
        Relationships: []
      }
      tra_flota: {
        Row: { activo: boolean; capacidad: string | null; conductor: string | null; created_at: string; id: string; owner_id: string | null; placa: string; telefono: string | null; tipo_negocio: string | null }
        Insert: { activo?: boolean; capacidad?: string | null; conductor?: string | null; created_at?: string; id?: string; owner_id?: string | null; placa: string; telefono?: string | null; tipo_negocio?: string | null }
        Update: { activo?: boolean; capacidad?: string | null; conductor?: string | null; created_at?: string; id?: string; owner_id?: string | null; placa?: string; telefono?: string | null; tipo_negocio?: string | null }
        Relationships: []
      }
      tra_manifiestos: {
        Row: { anticipos: number; cliente: string; conductor: string | null; created_at: string; destino: string; estado: string; fecha: string; guia: string; id: string; origen: string; owner_id: string | null; pago_conductor: number; placa: string | null; telefono: string | null; tipo_negocio: string | null; utilidad: number; valor_flete: number }
        Insert: { anticipos?: number; cliente: string; conductor?: string | null; created_at?: string; destino?: string; estado?: string; fecha?: string; guia: string; id?: string; origen?: string; owner_id?: string | null; pago_conductor?: number; placa?: string | null; telefono?: string | null; tipo_negocio?: string | null; utilidad?: number; valor_flete?: number }
        Update: { anticipos?: number; cliente?: string; conductor?: string | null; created_at?: string; destino?: string; estado?: string; fecha?: string; guia?: string; id?: string; origen?: string; owner_id?: string | null; pago_conductor?: number; placa?: string | null; telefono?: string | null; tipo_negocio?: string | null; utilidad?: number; valor_flete?: number }
        Relationships: []
      }
      tra_anticipos: {
        Row: { concepto: string; created_at: string; detalle: string | null; id: string; manifiesto_id: string; owner_id: string | null; tipo_negocio: string | null; valor: number }
        Insert: { concepto: string; created_at?: string; detalle?: string | null; id?: string; manifiesto_id: string; owner_id?: string | null; tipo_negocio?: string | null; valor: number }
        Update: { concepto?: string; created_at?: string; detalle?: string | null; id?: string; manifiesto_id?: string; owner_id?: string | null; tipo_negocio?: string | null; valor?: number }
        Relationships: []
      }
      tra_liquidaciones: {
        Row: { anticipos: number; created_at: string; flete: number; id: string; manifiesto_id: string; metodo: string; owner_id: string | null; pago_conductor: number; tipo_negocio: string | null; utilidad: number }
        Insert: { anticipos?: number; created_at?: string; flete?: number; id?: string; manifiesto_id: string; metodo?: string; owner_id?: string | null; pago_conductor?: number; tipo_negocio?: string | null; utilidad?: number }
        Update: { anticipos?: number; created_at?: string; flete?: number; id?: string; manifiesto_id?: string; metodo?: string; owner_id?: string | null; pago_conductor?: number; tipo_negocio?: string | null; utilidad?: number }
        Relationships: []
      }
      hot_habitaciones: {
        Row: { created_at: string; estado: string; id: string; notas: string | null; numero: string; owner_id: string | null; tarifa: number; tipo_hab: string; tipo_negocio: string | null }
        Insert: { created_at?: string; estado?: string; id?: string; notas?: string | null; numero: string; owner_id?: string | null; tarifa?: number; tipo_hab?: string; tipo_negocio?: string | null }
        Update: { created_at?: string; estado?: string; id?: string; notas?: string | null; numero?: string; owner_id?: string | null; tarifa?: number; tipo_hab?: string; tipo_negocio?: string | null }
        Relationships: []
      }
      hot_huespedes: {
        Row: { acompanantes: number; created_at: string; documento: string | null; id: string; nombre: string; notas: string | null; owner_id: string | null; telefono: string | null; tipo_negocio: string | null }
        Insert: { acompanantes?: number; created_at?: string; documento?: string | null; id?: string; nombre: string; notas?: string | null; owner_id?: string | null; telefono?: string | null; tipo_negocio?: string | null }
        Update: { acompanantes?: number; created_at?: string; documento?: string | null; id?: string; nombre?: string; notas?: string | null; owner_id?: string | null; telefono?: string | null; tipo_negocio?: string | null }
        Relationships: []
      }
      hot_reservas: {
        Row: { acompanantes: number; anticipo: number; created_at: string; documento: string | null; estado: string; fecha_in: string; fecha_out: string; habitacion_id: string; huesped: string; id: string; notas: string | null; owner_id: string | null; telefono: string | null; tipo_negocio: string | null; total: number }
        Insert: { acompanantes?: number; anticipo?: number; created_at?: string; documento?: string | null; estado?: string; fecha_in?: string; fecha_out?: string; habitacion_id: string; huesped: string; id?: string; notas?: string | null; owner_id?: string | null; telefono?: string | null; tipo_negocio?: string | null; total?: number }
        Update: { acompanantes?: number; anticipo?: number; created_at?: string; documento?: string | null; estado?: string; fecha_in?: string; fecha_out?: string; habitacion_id?: string; huesped?: string; id?: string; notas?: string | null; owner_id?: string | null; telefono?: string | null; tipo_negocio?: string | null; total?: number }
        Relationships: []
      }
      hot_cargos: {
        Row: { concepto: string; created_at: string; id: string; owner_id: string | null; reserva_id: string; rubro: string; tipo_negocio: string | null; valor: number }
        Insert: { concepto: string; created_at?: string; id?: string; owner_id?: string | null; reserva_id: string; rubro?: string; tipo_negocio?: string | null; valor: number }
        Update: { concepto?: string; created_at?: string; id?: string; owner_id?: string | null; reserva_id?: string; rubro?: string; tipo_negocio?: string | null; valor?: number }
        Relationships: []
      }
      edu_estudiantes: {
        Row: { acudiente: string | null; alergias: string | null; created_at: string; documento: string | null; eps: string | null; estado: string; grado: string; grupo: string | null; id: string; nombre: string; owner_id: string | null; programa: string | null; telefono_acu: string | null; tipo_negocio: string | null }
        Insert: { acudiente?: string | null; alergias?: string | null; created_at?: string; documento?: string | null; eps?: string | null; estado?: string; grado?: string; grupo?: string | null; id?: string; nombre: string; owner_id?: string | null; programa?: string | null; telefono_acu?: string | null; tipo_negocio?: string | null }
        Update: { acudiente?: string | null; alergias?: string | null; created_at?: string; documento?: string | null; eps?: string | null; estado?: string; grado?: string; grupo?: string | null; id?: string; nombre?: string; owner_id?: string | null; programa?: string | null; telefono_acu?: string | null; tipo_negocio?: string | null }
        Relationships: []
      }
      edu_pensiones: {
        Row: { concepto: string; created_at: string; estado: string; estudiante_id: string; fecha_vence: string | null; id: string; owner_id: string | null; periodo: string; tipo_negocio: string | null; valor: number }
        Insert: { concepto?: string; created_at?: string; estado?: string; estudiante_id: string; fecha_vence?: string | null; id?: string; owner_id?: string | null; periodo: string; tipo_negocio?: string | null; valor?: number }
        Update: { concepto?: string; created_at?: string; estado?: string; estudiante_id?: string; fecha_vence?: string | null; id?: string; owner_id?: string | null; periodo?: string; tipo_negocio?: string | null; valor?: number }
        Relationships: []
      }
      edu_asistencia: {
        Row: { created_at: string; estudiante_id: string; fecha: string; hora_entrada: string | null; hora_salida: string | null; id: string; nota: string | null; owner_id: string | null; presente: boolean; recogido_por: string | null; tipo_negocio: string | null }
        Insert: { created_at?: string; estudiante_id: string; fecha?: string; hora_entrada?: string | null; hora_salida?: string | null; id?: string; nota?: string | null; owner_id?: string | null; presente?: boolean; recogido_por?: string | null; tipo_negocio?: string | null }
        Update: { created_at?: string; estudiante_id?: string; fecha?: string; hora_entrada?: string | null; hora_salida?: string | null; id?: string; nota?: string | null; owner_id?: string | null; presente?: boolean; recogido_por?: string | null; tipo_negocio?: string | null }
        Relationships: []
      }
      edu_reportes_diarios: {
        Row: { actividad: string; comidas: string; created_at: string; estado_animo: string; estudiante_id: string; fecha: string; id: string; mensaje: string; owner_id: string | null; panales: string; profesora: string; siestas: string; tipo_negocio: string | null }
        Insert: { actividad?: string; comidas?: string; created_at?: string; estado_animo?: string; estudiante_id: string; fecha?: string; id?: string; mensaje?: string; owner_id?: string | null; panales?: string; profesora?: string; siestas?: string; tipo_negocio?: string | null }
        Update: { actividad?: string; comidas?: string; created_at?: string; estado_animo?: string; estudiante_id?: string; fecha?: string; id?: string; mensaje?: string; owner_id?: string | null; panales?: string; profesora?: string; siestas?: string; tipo_negocio?: string | null }
        Relationships: []
      }
      edu_notas: {
        Row: { area: string; created_at: string; estudiante_id: string; id: string; logro: string | null; owner_id: string | null; periodo: string; tipo_negocio: string | null; valoracion: string }
        Insert: { area: string; created_at?: string; estudiante_id: string; id?: string; logro?: string | null; owner_id?: string | null; periodo: string; tipo_negocio?: string | null; valoracion?: string }
        Update: { area?: string; created_at?: string; estudiante_id?: string; id?: string; logro?: string | null; owner_id?: string | null; periodo?: string; tipo_negocio?: string | null; valoracion?: string }
        Relationships: []
      }
      mod_referencias: {
        Row: { created_at: string; id: string; marca: string | null; nombre: string; notas: string | null; owner_id: string | null; precio: number; temporada: string | null; tipo_negocio: string | null }
        Insert: { created_at?: string; id?: string; marca?: string | null; nombre: string; notas?: string | null; owner_id?: string | null; precio?: number; temporada?: string | null; tipo_negocio?: string | null }
        Update: { created_at?: string; id?: string; marca?: string | null; nombre?: string; notas?: string | null; owner_id?: string | null; precio?: number; temporada?: string | null; tipo_negocio?: string | null }
        Relationships: []
      }
      mod_variantes: {
        Row: { codigo_barras: string | null; color: string; costo: number; created_at: string; id: string; owner_id: string | null; referencia_id: string; stock: number; talla: string; tipo_negocio: string | null }
        Insert: { codigo_barras?: string | null; color?: string; costo?: number; created_at?: string; id?: string; owner_id?: string | null; referencia_id: string; stock?: number; talla: string; tipo_negocio?: string | null }
        Update: { codigo_barras?: string | null; color?: string; costo?: number; created_at?: string; id?: string; owner_id?: string | null; referencia_id?: string; stock?: number; talla?: string; tipo_negocio?: string | null }
        Relationships: []
      }
      mod_bonos: {
        Row: { cliente: string; concepto: string; created_at: string; estado: string; id: string; owner_id: string | null; referencia: string | null; telefono: string | null; tipo_negocio: string | null; valor: number; vence: string | null }
        Insert: { cliente: string; concepto?: string; created_at?: string; estado?: string; id?: string; owner_id?: string | null; referencia?: string | null; telefono?: string | null; tipo_negocio?: string | null; valor: number; vence?: string | null }
        Update: { cliente?: string; concepto?: string; created_at?: string; estado?: string; id?: string; owner_id?: string | null; referencia?: string | null; telefono?: string | null; tipo_negocio?: string | null; valor?: number; vence?: string | null }
        Relationships: []
      }
      far_productos: {
        Row: { controlado: boolean; costo: number; created_at: string; id: string; lote: string | null; nombre: string; owner_id: string | null; precio: number; principio_activo: string | null; refrigerado: boolean; registro_invima: string | null; requiere_formula: boolean; stock: number; tipo_negocio: string | null; vence: string | null }
        Insert: { controlado?: boolean; costo?: number; created_at?: string; id?: string; lote?: string | null; nombre: string; owner_id?: string | null; precio?: number; principio_activo?: string | null; refrigerado?: boolean; registro_invima?: string | null; requiere_formula?: boolean; stock?: number; tipo_negocio?: string | null; vence?: string | null }
        Update: { controlado?: boolean; costo?: number; created_at?: string; id?: string; lote?: string | null; nombre?: string; owner_id?: string | null; precio?: number; principio_activo?: string | null; refrigerado?: boolean; registro_invima?: string | null; requiere_formula?: boolean; stock?: number; tipo_negocio?: string | null; vence?: string | null }
        Relationships: []
      }
      far_ventas: {
        Row: { cantidad: number; cliente: string | null; con_formula: boolean; created_at: string; id: string; owner_id: string | null; producto_id: string; tipo_negocio: string | null; total: number }
        Insert: { cantidad: number; cliente?: string | null; con_formula?: boolean; created_at?: string; id?: string; owner_id?: string | null; producto_id: string; tipo_negocio?: string | null; total?: number }
        Update: { cantidad?: number; cliente?: string | null; con_formula?: boolean; created_at?: string; id?: string; owner_id?: string | null; producto_id?: string; tipo_negocio?: string | null; total?: number }
        Relationships: []
      }
      opt_formulas: {
        Row: { cliente: string; created_at: string; id: string; notas: string | null; od_adicion: string | null; od_cilindro: string | null; od_dp: string | null; od_eje: string | null; od_esfera: string | null; oi_adicion: string | null; oi_cilindro: string | null; oi_dp: string | null; oi_eje: string | null; oi_esfera: string | null; owner_id: string | null; telefono: string | null; tipo_negocio: string | null; vigencia: string | null }
        Insert: { cliente: string; created_at?: string; id?: string; notas?: string | null; od_adicion?: string | null; od_cilindro?: string | null; od_dp?: string | null; od_eje?: string | null; od_esfera?: string | null; oi_adicion?: string | null; oi_cilindro?: string | null; oi_dp?: string | null; oi_eje?: string | null; oi_esfera?: string | null; owner_id?: string | null; telefono?: string | null; tipo_negocio?: string | null; vigencia?: string | null }
        Update: { cliente?: string; created_at?: string; id?: string; notas?: string | null; od_adicion?: string | null; od_cilindro?: string | null; od_dp?: string | null; od_eje?: string | null; od_esfera?: string | null; oi_adicion?: string | null; oi_cilindro?: string | null; oi_dp?: string | null; oi_eje?: string | null; oi_esfera?: string | null; owner_id?: string | null; telefono?: string | null; tipo_negocio?: string | null; vigencia?: string | null }
        Relationships: []
      }
      opt_ordenes: {
        Row: { abono: number; cliente: string; created_at: string; estado: string; formula_id: string | null; id: string; laboratorio: string | null; lentes: string | null; montura: string | null; owner_id: string | null; promesa: string | null; saldo: number; tipo_negocio: string | null; valor: number }
        Insert: { abono?: number; cliente: string; created_at?: string; estado?: string; formula_id?: string | null; id?: string; laboratorio?: string | null; lentes?: string | null; montura?: string | null; owner_id?: string | null; promesa?: string | null; saldo?: number; tipo_negocio?: string | null; valor?: number }
        Update: { abono?: number; cliente?: string; created_at?: string; estado?: string; formula_id?: string | null; id?: string; laboratorio?: string | null; lentes?: string | null; montura?: string | null; owner_id?: string | null; promesa?: string | null; saldo?: number; tipo_negocio?: string | null; valor?: number }
        Relationships: []
      }
      eve_salones: {
        Row: { capacidad: number; created_at: string; id: string; nombre: string; notas: string | null; owner_id: string | null; tarifa: number; tipo_negocio: string | null }
        Insert: { capacidad?: number; created_at?: string; id?: string; nombre: string; notas?: string | null; owner_id?: string | null; tarifa?: number; tipo_negocio?: string | null }
        Update: { capacidad?: number; created_at?: string; id?: string; nombre?: string; notas?: string | null; owner_id?: string | null; tarifa?: number; tipo_negocio?: string | null }
        Relationships: []
      }
      eve_eventos: {
        Row: { alquiler: string | null; anticipo: number; cliente: string; created_at: string; decoracion: string | null; estado: string; fecha: string; id: string; invitados: number; menu: string | null; notas: string | null; owner_id: string | null; saldo: number; salon_id: string | null; telefono: string | null; tipo_negocio: string | null; valor: number }
        Insert: { alquiler?: string | null; anticipo?: number; cliente: string; created_at?: string; decoracion?: string | null; estado?: string; fecha: string; id?: string; invitados?: number; menu?: string | null; notas?: string | null; owner_id?: string | null; saldo?: number; salon_id?: string | null; telefono?: string | null; tipo_negocio?: string | null; valor?: number }
        Update: { alquiler?: string | null; anticipo?: number; cliente?: string; created_at?: string; decoracion?: string | null; estado?: string; fecha?: string; id?: string; invitados?: number; menu?: string | null; notas?: string | null; owner_id?: string | null; saldo?: number; salon_id?: string | null; telefono?: string | null; tipo_negocio?: string | null; valor?: number }
        Relationships: []
      }
      eve_abonos: {
        Row: { created_at: string; evento_id: string; id: string; metodo: string; owner_id: string | null; tipo_negocio: string | null; valor: number }
        Insert: { created_at?: string; evento_id: string; id?: string; metodo?: string; owner_id?: string | null; tipo_negocio?: string | null; valor: number }
        Update: { created_at?: string; evento_id?: string; id?: string; metodo?: string; owner_id?: string | null; tipo_negocio?: string | null; valor?: number }
        Relationships: []
      }
      eve_checklist: {
        Row: { created_at: string; evento_id: string; id: string; listo: boolean; owner_id: string | null; tarea: string; tipo_negocio: string | null }
        Insert: { created_at?: string; evento_id: string; id?: string; listo?: boolean; owner_id?: string | null; tarea: string; tipo_negocio?: string | null }
        Update: { created_at?: string; evento_id?: string; id?: string; listo?: boolean; owner_id?: string | null; tarea?: string; tipo_negocio?: string | null }
        Relationships: []
      }
      fac_emitidas: {
        Row: { cliente: string; cliente_doc: string | null; created_at: string; formato: string; id: string; items: Json; iva: number; numero: number; owner_id: string | null; subtotal: number; tipo_negocio: string | null; total: number; dian_cufe: string | null; dian_qr: string | null; dian_estado: string; dian_respuesta: Json; impoconsumo: number; retefuente: number; reteiva: number; reteica: number; total_retenciones: number; neto_a_recibir: number; metodo_pago: string | null }
        Insert: { cliente: string; cliente_doc?: string | null; created_at?: string; formato?: string; id?: string; items?: Json; iva?: number; numero?: number; owner_id?: string | null; subtotal?: number; tipo_negocio?: string | null; total: number; dian_cufe?: string | null; dian_qr?: string | null; dian_estado?: string; dian_respuesta?: Json }
        Update: { cliente?: string; cliente_doc?: string | null; created_at?: string; formato?: string; id?: string; items?: Json; iva?: number; numero?: number; owner_id?: string | null; subtotal?: number; tipo_negocio?: string | null; total?: number; dian_cufe?: string | null; dian_qr?: string | null; dian_estado?: string; dian_respuesta?: Json }
        Relationships: []
      }
      lav_ordenes: {
        Row: { abono: number; cliente: string; created_at: string; entrega: string | null; estado: string; id: string; owner_id: string | null; peso_kg: number; prendas: string; servicio: string | null; telefono: string | null; tipo_negocio: string | null; total: number }
        Insert: { abono?: number; cliente: string; created_at?: string; entrega?: string | null; estado?: string; id?: string; owner_id?: string | null; peso_kg?: number; prendas: string; servicio?: string | null; telefono?: string | null; tipo_negocio?: string | null; total?: number }
        Update: { abono?: number; cliente?: string; created_at?: string; entrega?: string | null; estado?: string; id?: string; owner_id?: string | null; peso_kg?: number; prendas?: string; servicio?: string | null; telefono?: string | null; tipo_negocio?: string | null; total?: number }
        Relationships: []
      }
      prof_casos: {
        Row: { abono: number; asunto: string; cliente: string; created_at: string; estado: string; honorarios: number; id: string; owner_id: string | null; telefono: string | null; tipo_negocio: string | null; vence: string | null }
        Insert: { abono?: number; asunto: string; cliente: string; created_at?: string; estado?: string; honorarios?: number; id?: string; owner_id?: string | null; telefono?: string | null; tipo_negocio?: string | null; vence?: string | null }
        Update: { abono?: number; asunto?: string; cliente?: string; created_at?: string; estado?: string; honorarios?: number; id?: string; owner_id?: string | null; telefono?: string | null; tipo_negocio?: string | null; vence?: string | null }
        Relationships: []
      }
      tec_proyectos: {
        Row: { abono: number; alcance: string; cliente: string; created_at: string; entrega: string | null; estado: string; horas: number; id: string; owner_id: string | null; telefono: string | null; tipo_negocio: string | null; valor: number }
        Insert: { abono?: number; alcance: string; cliente: string; created_at?: string; entrega?: string | null; estado?: string; horas?: number; id?: string; owner_id?: string | null; telefono?: string | null; tipo_negocio?: string | null; valor?: number }
        Update: { abono?: number; alcance?: string; cliente?: string; created_at?: string; entrega?: string | null; estado?: string; horas?: number; id?: string; owner_id?: string | null; telefono?: string | null; tipo_negocio?: string | null; valor?: number }
        Relationships: []
      }
      pap_encargos: {
        Row: { abono: number; cliente: string; created_at: string; detalle: string; entrega: string | null; estado: string; id: string; owner_id: string | null; telefono: string | null; tipo_negocio: string | null; valor: number }
        Insert: { abono?: number; cliente: string; created_at?: string; detalle: string; entrega?: string | null; estado?: string; id?: string; owner_id?: string | null; telefono?: string | null; tipo_negocio?: string | null; valor?: number }
        Update: { abono?: number; cliente?: string; created_at?: string; detalle?: string; entrega?: string | null; estado?: string; id?: string; owner_id?: string | null; telefono?: string | null; tipo_negocio?: string | null; valor?: number }
        Relationships: []
      }
      joy_piezas: {
        Row: { abono: number; cliente: string | null; created_at: string; descripcion: string; estado: string; id: string; material: string | null; owner_id: string | null; peso: string | null; precio: number; telefono: string | null; tipo_negocio: string | null }
        Insert: { abono?: number; cliente?: string | null; created_at?: string; descripcion: string; estado?: string; id?: string; material?: string | null; owner_id?: string | null; peso?: string | null; precio?: number; telefono?: string | null; tipo_negocio?: string | null }
        Update: { abono?: number; cliente?: string | null; created_at?: string; descripcion?: string; estado?: string; id?: string; material?: string | null; owner_id?: string | null; peso?: string | null; precio?: number; telefono?: string | null; tipo_negocio?: string | null }
        Relationships: []
      }
      lic_domicilios: {
        Row: { abono: number; cliente: string; created_at: string; documento: string | null; edad_ok: boolean; estado: string; id: string; owner_id: string | null; pedido: string; telefono: string | null; tipo_negocio: string | null; total: number }
        Insert: { abono?: number; cliente: string; created_at?: string; documento?: string | null; edad_ok?: boolean; estado?: string; id?: string; owner_id?: string | null; pedido: string; telefono?: string | null; tipo_negocio?: string | null; total?: number }
        Update: { abono?: number; cliente?: string; created_at?: string; documento?: string | null; edad_ok?: boolean; estado?: string; id?: string; owner_id?: string | null; pedido?: string; telefono?: string | null; tipo_negocio?: string | null; total?: number }
        Relationships: []
      }
      parq_turnos: {
        Row: { abono: number; created_at: string; entrada: string; estado: string; horas: number; id: string; owner_id: string | null; placa: string; salida: string | null; tarifa: number; tipo_negocio: string | null; total: number }
        Insert: { abono?: number; created_at?: string; entrada?: string; estado?: string; horas?: number; id?: string; owner_id?: string | null; placa: string; salida?: string | null; tarifa: number; tipo_negocio?: string | null; total?: number }
        Update: { abono?: number; created_at?: string; entrada?: string; estado?: string; horas?: number; id?: string; owner_id?: string | null; placa?: string; salida?: string | null; tarifa?: number; tipo_negocio?: string | null; total?: number }
        Relationships: []
      }
      sst_empresas: {
        Row: { contacto: string | null; created_at: string; estado: string; id: string; n_trabajadores: number; nit: string | null; nombre: string; owner_id: string | null; riesgo: string; telefono: string | null; tipo_negocio: string | null }
        Insert: { contacto?: string | null; created_at?: string; estado?: string; id?: string; n_trabajadores?: number; nit?: string | null; nombre: string; owner_id?: string | null; riesgo?: string; telefono?: string | null; tipo_negocio?: string | null }
        Update: { contacto?: string | null; created_at?: string; estado?: string; id?: string; n_trabajadores?: number; nit?: string | null; nombre?: string; owner_id?: string | null; riesgo?: string; telefono?: string | null; tipo_negocio?: string | null }
        Relationships: []
      }
      sst_trabajadores: {
        Row: { cargo: string; created_at: string; documento: string; empresa_id: string | null; examen_vence: string | null; id: string; nombre: string; owner_id: string | null; telefono: string | null; tipo_negocio: string | null }
        Insert: { cargo?: string; created_at?: string; documento?: string; empresa_id?: string | null; examen_vence?: string | null; id?: string; nombre: string; owner_id?: string | null; telefono?: string | null; tipo_negocio?: string | null }
        Update: { cargo?: string; created_at?: string; documento?: string; empresa_id?: string | null; examen_vence?: string | null; id?: string; nombre?: string; owner_id?: string | null; telefono?: string | null; tipo_negocio?: string | null }
        Relationships: []
      }
      sst_evaluaciones: {
        Row: { abono: number; codigo_seguro: string; concepto: string; created_at: string; empresa: string; estado: string; fecha: string; id: string; owner_id: string | null; restricciones: string; tipo: string; tipo_negocio: string | null; trabajador: string; trabajador_id: string | null; valor: number; vence: string | null }
        Insert: { abono?: number; codigo_seguro?: string; concepto?: string; created_at?: string; empresa?: string; estado?: string; fecha?: string; id?: string; owner_id?: string | null; restricciones?: string; tipo?: string; tipo_negocio?: string | null; trabajador?: string; trabajador_id?: string | null; valor?: number; vence?: string | null }
        Update: { abono?: number; codigo_seguro?: string; concepto?: string; created_at?: string; empresa?: string; estado?: string; fecha?: string; id?: string; owner_id?: string | null; restricciones?: string; tipo?: string; tipo_negocio?: string | null; trabajador?: string; trabajador_id?: string | null; valor?: number; vence?: string | null }
        Relationships: []
      }
      sst_profesiogramas: {
        Row: { cargo: string; controles: string; created_at: string; empresa: string; epp: string; id: string; owner_id: string | null; peligros: string; periodicidad_meses: number; tipo_negocio: string | null }
        Insert: { cargo?: string; controles?: string; created_at?: string; empresa?: string; epp?: string; id?: string; owner_id?: string | null; peligros?: string; periodicidad_meses?: number; tipo_negocio?: string | null }
        Update: { cargo?: string; controles?: string; created_at?: string; empresa?: string; epp?: string; id?: string; owner_id?: string | null; peligros?: string; periodicidad_meses?: number; tipo_negocio?: string | null }
        Relationships: []
      }
      sst_estandares: {
        Row: { convivencia: string; copasst: string; created_at: string; cumple: number; empresa: string; id: string; owner_id: string | null; plan_anual: string; riesgo: string; tamano: string; tipo_negocio: string | null; total_aplica: number }
        Insert: { convivencia?: string; copasst?: string; created_at?: string; cumple?: number; empresa?: string; id?: string; owner_id?: string | null; plan_anual?: string; riesgo?: string; tamano?: string; tipo_negocio?: string | null; total_aplica?: number }
        Update: { convivencia?: string; copasst?: string; created_at?: string; cumple?: number; empresa?: string; id?: string; owner_id?: string | null; plan_anual?: string; riesgo?: string; tamano?: string; tipo_negocio?: string | null; total_aplica?: number }
        Relationships: []
      }
      sst_atel: {
        Row: { created_at: string; descripcion: string; empresa: string; estado: string; fecha: string; id: string; owner_id: string | null; tipo: string; tipo_negocio: string | null; trabajador: string }
        Insert: { created_at?: string; descripcion?: string; empresa?: string; estado?: string; fecha?: string; id?: string; owner_id?: string | null; tipo?: string; tipo_negocio?: string | null; trabajador?: string }
        Update: { created_at?: string; descripcion?: string; empresa?: string; estado?: string; fecha?: string; id?: string; owner_id?: string | null; tipo?: string; tipo_negocio?: string | null; trabajador?: string }
        Relationships: []
      }
      sst_ausentismo: {
        Row: { created_at: string; dias: number; empresa: string; fecha: string; id: string; owner_id: string | null; programa: string; tipo_negocio: string | null; trabajador: string }
        Insert: { created_at?: string; dias?: number; empresa?: string; fecha?: string; id?: string; owner_id?: string | null; programa?: string; tipo_negocio?: string | null; trabajador?: string }
        Update: { created_at?: string; dias?: number; empresa?: string; fecha?: string; id?: string; owner_id?: string | null; programa?: string; tipo_negocio?: string | null; trabajador?: string }
        Relationships: []
      }
      sst_capacitaciones: {
        Row: { abono: number; created_at: string; empresa: string; estado: string; fecha: string; id: string; owner_id: string | null; tema: string; tipo_negocio: string | null; valor: number }
        Insert: { abono?: number; created_at?: string; empresa?: string; estado?: string; fecha?: string; id?: string; owner_id?: string | null; tema: string; tipo_negocio?: string | null; valor?: number }
        Update: { abono?: number; created_at?: string; empresa?: string; estado?: string; fecha?: string; id?: string; owner_id?: string | null; tema?: string; tipo_negocio?: string | null; valor?: number }
        Relationships: []
      }
      sst_asistencias: {
        Row: { capacitacion_id: string | null; created_at: string; documento: string; id: string; nombre: string; owner_id: string | null }
        Insert: { capacitacion_id?: string | null; created_at?: string; documento?: string; id?: string; nombre?: string; owner_id?: string | null }
        Update: { capacitacion_id?: string | null; created_at?: string; documento?: string; id?: string; nombre?: string; owner_id?: string | null }
        Relationships: []
      }
      sst_historias: {
        Row: { antecedentes_laborales: string; antecedentes_personales: string; created_at: string; diagnostico: string; documento: string; empresa: string; examen_fisico: string; exposicion: string; fecha: string; id: string; owner_id: string | null; paraclinicos: string; recomendaciones: string; tipo_examen: string; tipo_negocio: string | null; trabajador: string; trabajador_id: string | null }
        Insert: { antecedentes_laborales?: string; antecedentes_personales?: string; created_at?: string; diagnostico?: string; documento?: string; empresa?: string; examen_fisico?: string; exposicion?: string; fecha?: string; id?: string; owner_id?: string | null; paraclinicos?: string; recomendaciones?: string; tipo_examen?: string; tipo_negocio?: string | null; trabajador?: string; trabajador_id?: string | null }
        Update: { antecedentes_laborales?: string; antecedentes_personales?: string; created_at?: string; diagnostico?: string; documento?: string; empresa?: string; examen_fisico?: string; exposicion?: string; fecha?: string; id?: string; owner_id?: string | null; paraclinicos?: string; recomendaciones?: string; tipo_examen?: string; tipo_negocio?: string | null; trabajador?: string; trabajador_id?: string | null }
        Relationships: []
      }
      sst_ordenes_examen: {
        Row: { codigo: string; created_at: string; documento: string; empresa: string; estado: string; examenes: string; fecha: string; id: string; laboratorio: string; owner_id: string | null; tipo: string; tipo_negocio: string | null; trabajador: string; trabajador_id: string | null }
        Insert: { codigo?: string; created_at?: string; documento?: string; empresa?: string; estado?: string; examenes?: string; fecha?: string; id?: string; laboratorio?: string; owner_id?: string | null; tipo?: string; tipo_negocio?: string | null; trabajador?: string; trabajador_id?: string | null }
        Update: { codigo?: string; created_at?: string; documento?: string; empresa?: string; estado?: string; examenes?: string; fecha?: string; id?: string; laboratorio?: string; owner_id?: string | null; tipo?: string; tipo_negocio?: string | null; trabajador?: string; trabajador_id?: string | null }
        Relationships: []
      }
      sst_novedades: {
        Row: { aplicada: boolean; created_at: string; fuente: string; id: string; resumen: string; titulo: string; vigencia_desde: string | null }
        Insert: { aplicada?: boolean; created_at?: string; fuente?: string; id?: string; resumen?: string; titulo: string; vigencia_desde?: string | null }
        Update: { aplicada?: boolean; created_at?: string; fuente?: string; id?: string; resumen?: string; titulo?: string; vigencia_desde?: string | null }
        Relationships: []
      }
      sst_matriz_legal: {
        Row: { codigo: string; created_at: string; estado: string; evidencia: string; id: string; owner_id: string | null; proxima_revision: string | null; responsable: string }
        Insert: { codigo: string; created_at?: string; estado?: string; evidencia?: string; id?: string; owner_id?: string | null; proxima_revision?: string | null; responsable?: string }
        Update: { codigo?: string; created_at?: string; estado?: string; evidencia?: string; id?: string; owner_id?: string | null; proxima_revision?: string | null; responsable?: string }
        Relationships: []
      }
      sst_psicosocial: {
        Row: { aplicacion: string; cargo: string; control: number; created_at: string; demandas: number; empresa: string; estado: string; estres: number; evaluador: string; extralaboral: number; fecha: string; forma: string; id: string; liderazgo: number; nivel_estres: string; nivel_extralaboral: string; nivel_global: string; nivel_intralaboral: string; owner_id: string | null; plan: string; recompensas: number; seguimiento: string | null; trabajador: string }
        Insert: { aplicacion?: string; cargo?: string; control?: number; created_at?: string; demandas?: number; empresa?: string; estado?: string; estres?: number; evaluador?: string; extralaboral?: number; fecha?: string; forma?: string; id?: string; liderazgo?: number; nivel_estres?: string; nivel_extralaboral?: string; nivel_global?: string; nivel_intralaboral?: string; owner_id?: string | null; plan?: string; recompensas?: number; seguimiento?: string | null; trabajador?: string }
        Update: { aplicacion?: string; cargo?: string; control?: number; created_at?: string; demandas?: number; empresa?: string; estado?: string; estres?: number; evaluador?: string; extralaboral?: number; fecha?: string; forma?: string; id?: string; liderazgo?: number; nivel_estres?: string; nivel_extralaboral?: string; nivel_global?: string; nivel_intralaboral?: string; owner_id?: string | null; plan?: string; recompensas?: number; seguimiento?: string | null; trabajador?: string }
        Relationships: []
      }
      sst_restricciones: {
        Row: { cargo: string; categoria: string; concepto: string; created_at: string; descripcion: string; duracion: string; empresa: string; estado: string; evaluacion_id: string | null; id: string; owner_id: string | null; plan: string; seguimiento: string | null; trabajador: string; vence: string | null }
        Insert: { cargo?: string; categoria?: string; concepto?: string; created_at?: string; descripcion?: string; duracion?: string; empresa?: string; estado?: string; evaluacion_id?: string | null; id?: string; owner_id?: string | null; plan?: string; seguimiento?: string | null; trabajador?: string; vence?: string | null }
        Update: { cargo?: string; categoria?: string; concepto?: string; created_at?: string; descripcion?: string; duracion?: string; empresa?: string; estado?: string; evaluacion_id?: string | null; id?: string; owner_id?: string | null; plan?: string; seguimiento?: string | null; trabajador?: string; vence?: string | null }
        Relationships: []
      }
      sst_normas: {
        Row: { codigo: string; created_at: string; estado: string; fuente: string; id: string; nota: string | null; origen: string; owner_id: string | null; resumen: string; tema: string; titulo: string; ultima_actualizacion: string }
        Insert: { codigo: string; created_at?: string; estado?: string; fuente?: string; id?: string; nota?: string | null; origen?: string; owner_id?: string | null; resumen?: string; tema?: string; titulo: string; ultima_actualizacion?: string }
        Update: { codigo?: string; created_at?: string; estado?: string; fuente?: string; id?: string; nota?: string | null; origen?: string; owner_id?: string | null; resumen?: string; tema?: string; titulo?: string; ultima_actualizacion?: string }
        Relationships: []
      }
      srv_citas: {
        Row: { cobrada: boolean; comision: number; comision_pct: number; created_at: string; duracion_min: number; ficha: string | null; fecha: string; hora: string; id: string; cliente: string; estado: string; liquidacion_id: string | null; liquidada: boolean; metodo: string | null; owner_id: string | null; precio: number; profesional: string; servicio: string; telefono: string | null; tipo_negocio: string | null }
        Insert: { cobrada?: boolean; comision?: number; comision_pct?: number; created_at?: string; duracion_min?: number; ficha?: string | null; fecha?: string; hora?: string; id?: string; cliente: string; estado?: string; liquidacion_id?: string | null; liquidada?: boolean; metodo?: string | null; owner_id?: string | null; precio?: number; profesional: string; servicio: string; telefono?: string | null; tipo_negocio?: string | null }
        Update: { cobrada?: boolean; comision?: number; comision_pct?: number; created_at?: string; duracion_min?: number; ficha?: string | null; fecha?: string; hora?: string; id?: string; cliente?: string; estado?: string; liquidacion_id?: string | null; liquidada?: boolean; metodo?: string | null; owner_id?: string | null; precio?: number; profesional?: string; servicio?: string; telefono?: string | null; tipo_negocio?: string | null }
        Relationships: []
      }
      srv_liquidaciones: {
        Row: { citas: number; created_at: string; id: string; metodo: string; owner_id: string | null; profesional: string; tipo_negocio: string | null; total_comision: number }
        Insert: { citas?: number; created_at?: string; id?: string; metodo?: string; owner_id?: string | null; profesional: string; tipo_negocio?: string | null; total_comision?: number }
        Update: { citas?: number; created_at?: string; id?: string; metodo?: string; owner_id?: string | null; profesional?: string; tipo_negocio?: string | null; total_comision?: number }
        Relationships: []
      }
      cond_unidades: {
        Row: { activa: boolean; correo: string | null; created_at: string; cuota: number; id: string; owner_id: string | null; propietario: string; telefono: string | null; tipo_negocio: string | null; unidad: string }
        Insert: { activa?: boolean; correo?: string | null; created_at?: string; cuota?: number; id?: string; owner_id?: string | null; propietario: string; telefono?: string | null; tipo_negocio?: string | null; unidad: string }
        Update: { activa?: boolean; correo?: string | null; created_at?: string; cuota?: number; id?: string; owner_id?: string | null; propietario?: string; telefono?: string | null; tipo_negocio?: string | null; unidad?: string }
        Relationships: []
      }
      cond_cuotas: {
        Row: { created_at: string; estado: string; id: string; metodo: string | null; mora: number; owner_id: string | null; pagada_en: string | null; pagado: number; periodo: string; propietario: string; recibo: string | null; tipo_negocio: string | null; unidad: string; unidad_id: string; valor: number; vence: string }
        Insert: { created_at?: string; estado?: string; id?: string; metodo?: string | null; mora?: number; owner_id?: string | null; pagada_en?: string | null; pagado?: number; periodo: string; propietario: string; recibo?: string | null; tipo_negocio?: string | null; unidad: string; unidad_id: string; valor: number; vence: string }
        Update: { created_at?: string; estado?: string; id?: string; metodo?: string | null; mora?: number; owner_id?: string | null; pagada_en?: string | null; pagado?: number; periodo?: string; propietario?: string; recibo?: string | null; tipo_negocio?: string | null; unidad?: string; unidad_id?: string; valor?: number; vence?: string }
        Relationships: []
      }
      pre_creditos: {
        Row: { cliente: string; cobrador: string | null; created_at: string; cuota: number; documento: string | null; estado: string; fecha_inicio: string; frecuencia: string; id: string; monto: number; notas: string | null; owner_id: string | null; plazo: number; saldo_capital: number; tasa_mora_pct: number; tasa_pct: number; telefono: string | null; tipo_negocio: string | null; total_interes: number }
        Insert: { cliente: string; cobrador?: string | null; created_at?: string; cuota?: number; documento?: string | null; estado?: string; fecha_inicio?: string; frecuencia: string; id?: string; monto: number; notas?: string | null; owner_id?: string | null; plazo: number; saldo_capital?: number; tasa_mora_pct?: number; tasa_pct?: number; telefono?: string | null; tipo_negocio?: string | null; total_interes?: number }
        Update: { cliente?: string; cobrador?: string | null; created_at?: string; cuota?: number; documento?: string | null; estado?: string; fecha_inicio?: string; frecuencia?: string; id?: string; monto?: number; notas?: string | null; owner_id?: string | null; plazo?: number; saldo_capital?: number; tasa_mora_pct?: number; tasa_pct?: number; telefono?: string | null; tipo_negocio?: string | null; total_interes?: number }
        Relationships: []
      }
      pre_cuotas: {
        Row: { capital: number; capital_pagado: number; created_at: string; credito_id: string; estado: string; id: string; interes: number; interes_pagado: number; mora_cobrada: number; numero: number; owner_id: string | null; pagada_en: string | null; tipo_negocio: string | null; valor: number; vence: string }
        Insert: { capital?: number; capital_pagado?: number; created_at?: string; credito_id: string; estado?: string; id?: string; interes?: number; interes_pagado?: number; mora_cobrada?: number; numero: number; owner_id?: string | null; pagada_en?: string | null; tipo_negocio?: string | null; valor?: number; vence: string }
        Update: { capital?: number; capital_pagado?: number; created_at?: string; credito_id?: string; estado?: string; id?: string; interes?: number; interes_pagado?: number; mora_cobrada?: number; numero?: number; owner_id?: string | null; pagada_en?: string | null; tipo_negocio?: string | null; valor?: number; vence?: string }
        Relationships: []
      }
      pre_abonos: {
        Row: { capital: number; cobrador: string; created_at: string; credito_id: string; cuota_id: string; fecha: string; id: string; interes: number; metodo: string; monto: number; mora: number; owner_id: string | null; tipo_negocio: string | null }
        Insert: { capital?: number; cobrador?: string; created_at?: string; credito_id: string; cuota_id: string; fecha?: string; id?: string; interes?: number; metodo?: string; monto: number; mora?: number; owner_id?: string | null; tipo_negocio?: string | null }
        Update: { capital?: number; cobrador?: string; created_at?: string; credito_id?: string; cuota_id?: string; fecha?: string; id?: string; interes?: number; metodo?: string; monto?: number; mora?: number; owner_id?: string | null; tipo_negocio?: string | null }
        Relationships: []
      }
      pre_cierres: {
        Row: { cobrador: string; created_at: string; diferencia: number; entregado: number; esperado: number; fecha: string; id: string; owner_id: string | null; tipo_negocio: string | null }
        Insert: { cobrador: string; created_at?: string; diferencia?: number; entregado?: number; esperado?: number; fecha: string; id?: string; owner_id?: string | null; tipo_negocio?: string | null }
        Update: { cobrador?: string; created_at?: string; diferencia?: number; entregado?: number; esperado?: number; fecha?: string; id?: string; owner_id?: string | null; tipo_negocio?: string | null }
        Relationships: []
      }
      tex_insumos: {
        Row: { activo: boolean; costo: number; created_at: string; id: string; nombre: string; owner_id: string | null; stock: number; tipo_negocio: string | null; unidad: string }
        Insert: { activo?: boolean; costo?: number; created_at?: string; id?: string; nombre: string; owner_id?: string | null; stock?: number; tipo_negocio?: string | null; unidad?: string }
        Update: { activo?: boolean; costo?: number; created_at?: string; id?: string; nombre?: string; owner_id?: string | null; stock?: number; tipo_negocio?: string | null; unidad?: string }
        Relationships: []
      }
      tex_ordenes: {
        Row: { cantidad: number; cliente: string | null; cobrado: number; color: string | null; costo_insumos: number; created_at: string; entregadas: number; estado: string; fecha_entrega: string | null; id: string; mano_obra: number; notas: string | null; owner_id: string | null; precio_unit: number; referencia: string; tallas: Json; tipo_negocio: string | null }
        Insert: { cantidad: number; cliente?: string | null; cobrado?: number; color?: string | null; costo_insumos?: number; created_at?: string; entregadas?: number; estado?: string; fecha_entrega?: string | null; id?: string; mano_obra?: number; notas?: string | null; owner_id?: string | null; precio_unit?: number; referencia: string; tallas?: Json; tipo_negocio?: string | null }
        Update: { cantidad?: number; cliente?: string | null; cobrado?: number; color?: string | null; costo_insumos?: number; created_at?: string; entregadas?: number; estado?: string; fecha_entrega?: string | null; id?: string; mano_obra?: number; notas?: string | null; owner_id?: string | null; precio_unit?: number; referencia?: string; tallas?: Json; tipo_negocio?: string | null }
        Relationships: []
      }
      tex_consumos: {
        Row: { cantidad: number; costo: number; created_at: string; id: string; insumo_id: string; nombre: string; orden_id: string; owner_id: string | null; tipo_negocio: string | null }
        Insert: { cantidad: number; costo?: number; created_at?: string; id?: string; insumo_id: string; nombre: string; orden_id: string; owner_id?: string | null; tipo_negocio?: string | null }
        Update: { cantidad?: number; costo?: number; created_at?: string; id?: string; insumo_id?: string; nombre?: string; orden_id?: string; owner_id?: string | null; tipo_negocio?: string | null }
        Relationships: []
      }
      tex_entregas: {
        Row: { cantidad: number; created_at: string; id: string; metodo: string; orden_id: string; owner_id: string | null; tipo_negocio: string | null; valor: number }
        Insert: { cantidad: number; created_at?: string; id?: string; metodo?: string; orden_id: string; owner_id?: string | null; tipo_negocio?: string | null; valor?: number }
        Update: { cantidad?: number; created_at?: string; id?: string; metodo?: string; orden_id?: string; owner_id?: string | null; tipo_negocio?: string | null; valor?: number }
        Relationships: []
      }
      flo_flores: {
        Row: { activo: boolean; categoria: string; costo: number; created_at: string; id: string; nombre: string; owner_id: string | null; stock: number; tipo_negocio: string | null; vida_dias: number }
        Insert: { activo?: boolean; categoria?: string; costo?: number; created_at?: string; id?: string; nombre: string; owner_id?: string | null; stock?: number; tipo_negocio?: string | null; vida_dias?: number }
        Update: { activo?: boolean; categoria?: string; costo?: number; created_at?: string; id?: string; nombre?: string; owner_id?: string | null; stock?: number; tipo_negocio?: string | null; vida_dias?: number }
        Relationships: []
      }
      flo_arreglos: {
        Row: { activo: boolean; costo_armado: number; created_at: string; descripcion: string | null; foto_ruta: string | null; id: string; nombre: string; owner_id: string | null; precio: number; receta: Json; tipo_negocio: string | null }
        Insert: { activo?: boolean; costo_armado?: number; created_at?: string; descripcion?: string | null; foto_ruta?: string | null; id?: string; nombre: string; owner_id?: string | null; precio?: number; receta?: Json; tipo_negocio?: string | null }
        Update: { activo?: boolean; costo_armado?: number; created_at?: string; descripcion?: string | null; foto_ruta?: string | null; id?: string; nombre?: string; owner_id?: string | null; precio?: number; receta?: Json; tipo_negocio?: string | null }
        Relationships: []
      }
      flo_encargos: {
        Row: { arreglo: string; arreglo_id: string; cantidad: number; cliente: string; costo: number; created_at: string; destinatario: string; direccion: string | null; estado: string; fecha_entrega: string; franja: string; id: string; metodo: string; owner_id: string | null; repartidor: string | null; tarjeta: string | null; telefono: string | null; tipo_negocio: string | null; total: number }
        Insert: { arreglo: string; arreglo_id: string; cantidad: number; cliente: string; costo?: number; created_at?: string; destinatario: string; direccion?: string | null; estado?: string; fecha_entrega: string; franja?: string; id?: string; metodo?: string; owner_id?: string | null; repartidor?: string | null; tarjeta?: string | null; telefono?: string | null; tipo_negocio?: string | null; total?: number }
        Update: { arreglo?: string; arreglo_id?: string; cantidad?: number; cliente?: string; costo?: number; created_at?: string; destinatario?: string; direccion?: string | null; estado?: string; fecha_entrega?: string; franja?: string; id?: string; metodo?: string; owner_id?: string | null; repartidor?: string | null; tarjeta?: string | null; telefono?: string | null; tipo_negocio?: string | null; total?: number }
        Relationships: []
      }
      alq_vehiculos: {
        Row: { activo: boolean; created_at: string; descripcion: string; estado: string; foto_ruta: string | null; id: string; km_actual: number; km_incluidos_dia: number; owner_id: string | null; placa: string; tarifa_dia: number; tarifa_hora: number; tipo_negocio: string | null; valor_km_extra: number; valor_tanque: number }
        Insert: { activo?: boolean; created_at?: string; descripcion: string; estado?: string; foto_ruta?: string | null; id?: string; km_actual?: number; km_incluidos_dia?: number; owner_id?: string | null; placa: string; tarifa_dia?: number; tarifa_hora?: number; tipo_negocio?: string | null; valor_km_extra?: number; valor_tanque?: number }
        Update: { activo?: boolean; created_at?: string; descripcion?: string; estado?: string; foto_ruta?: string | null; id?: string; km_actual?: number; km_incluidos_dia?: number; owner_id?: string | null; placa?: string; tarifa_dia?: number; tarifa_hora?: number; tipo_negocio?: string | null; valor_km_extra?: number; valor_tanque?: number }
        Relationships: []
      }
      alq_contratos: {
        Row: { cantidad: number; cerrado_en: string | null; cliente: string; combustible_entrega: number | null; combustible_salida: number; created_at: string; deposito: number; descripcion: string; documento: string | null; estado: string; id: string; km_entrega: number | null; km_salida: number; metodo: string | null; modalidad: string; notas: string | null; owner_id: string | null; placa: string; prevista: string | null; recargo_combustible: number; recargo_dano: number; recargo_demora: number; recargo_km: number; salida: string; saldo_cobrado: number; tarifa: number; telefono: string | null; tipo_negocio: string | null; total: number; vehiculo_id: string }
        Insert: { cantidad: number; cerrado_en?: string | null; cliente: string; combustible_entrega?: number | null; combustible_salida?: number; created_at?: string; deposito?: number; descripcion: string; documento?: string | null; estado?: string; id?: string; km_entrega?: number | null; km_salida?: number; metodo?: string | null; modalidad: string; notas?: string | null; owner_id?: string | null; placa: string; prevista?: string | null; recargo_combustible?: number; recargo_dano?: number; recargo_demora?: number; recargo_km?: number; salida?: string; saldo_cobrado?: number; tarifa?: number; telefono?: string | null; tipo_negocio?: string | null; total?: number; vehiculo_id: string }
        Update: { cantidad?: number; cerrado_en?: string | null; cliente?: string; combustible_entrega?: number | null; combustible_salida?: number; created_at?: string; deposito?: number; descripcion?: string; documento?: string | null; estado?: string; id?: string; km_entrega?: number | null; km_salida?: number; metodo?: string | null; modalidad?: string; notas?: string | null; owner_id?: string | null; placa?: string; prevista?: string | null; recargo_combustible?: number; recargo_dano?: number; recargo_demora?: number; recargo_km?: number; salida?: string; saldo_cobrado?: number; tarifa?: number; telefono?: string | null; tipo_negocio?: string | null; total?: number; vehiculo_id?: string }
        Relationships: []
      }
      alq_multas: {
        Row: { cliente: string; cobrada_en: string | null; concepto: string; contrato_id: string | null; created_at: string; detalle: string | null; estado: string; fecha: string; id: string; metodo: string | null; owner_id: string | null; placa: string; tipo_negocio: string | null; valor: number }
        Insert: { cliente: string; cobrada_en?: string | null; concepto?: string; contrato_id?: string | null; created_at?: string; detalle?: string | null; estado?: string; fecha?: string; id?: string; metodo?: string | null; owner_id?: string | null; placa: string; tipo_negocio?: string | null; valor: number }
        Update: { cliente?: string; cobrada_en?: string | null; concepto?: string; contrato_id?: string | null; created_at?: string; detalle?: string | null; estado?: string; fecha?: string; id?: string; metodo?: string | null; owner_id?: string | null; placa?: string; tipo_negocio?: string | null; valor?: number }
        Relationships: []
      }
      seg_puestos: {
        Row: { activo: boolean; cliente: string; created_at: string; fin: string | null; id: string; inicio: string; owner_id: string | null; personal_requerido: number; sede: string; servicio: string; supervisor: string | null; telefono: string | null; tipo_negocio: string | null; turno: string; valor_mensual: number }
        Insert: { activo?: boolean; cliente: string; created_at?: string; fin?: string | null; id?: string; inicio?: string; owner_id?: string | null; personal_requerido?: number; sede: string; servicio?: string; supervisor?: string | null; telefono?: string | null; tipo_negocio?: string | null; turno?: string; valor_mensual?: number }
        Update: { activo?: boolean; cliente?: string; created_at?: string; fin?: string | null; id?: string; inicio?: string; owner_id?: string | null; personal_requerido?: number; sede?: string; servicio?: string; supervisor?: string | null; telefono?: string | null; tipo_negocio?: string | null; turno?: string; valor_mensual?: number }
        Relationships: []
      }
      seg_turnos: {
        Row: { created_at: string; empleado: string; estado: string; fecha: string; id: string; owner_id: string | null; puesto_id: string; reemplazo: string | null; tipo_negocio: string | null; turno: string }
        Insert: { created_at?: string; empleado: string; estado?: string; fecha: string; id?: string; owner_id?: string | null; puesto_id: string; reemplazo?: string | null; tipo_negocio?: string | null; turno?: string }
        Update: { created_at?: string; empleado?: string; estado?: string; fecha?: string; id?: string; owner_id?: string | null; puesto_id?: string; reemplazo?: string | null; tipo_negocio?: string | null; turno?: string }
        Relationships: []
      }
      seg_novedades: {
        Row: { accion: string | null; created_at: string; detalle: string; empleado: string | null; fecha: string; id: string; owner_id: string | null; puesto_id: string; tipo: string; tipo_negocio: string | null }
        Insert: { accion?: string | null; created_at?: string; detalle: string; empleado?: string | null; fecha?: string; id?: string; owner_id?: string | null; puesto_id: string; tipo?: string; tipo_negocio?: string | null }
        Update: { accion?: string | null; created_at?: string; detalle?: string; empleado?: string | null; fecha?: string; id?: string; owner_id?: string | null; puesto_id?: string; tipo?: string; tipo_negocio?: string | null }
        Relationships: []
      }
      seg_insumos: {
        Row: { activo: boolean; costo: number; created_at: string; elemento: string; id: string; meses_reposicion: number; owner_id: string | null; stock: number; tipo_negocio: string | null; unidad: string }
        Insert: { activo?: boolean; costo?: number; created_at?: string; elemento: string; id?: string; meses_reposicion?: number; owner_id?: string | null; stock?: number; tipo_negocio?: string | null; unidad?: string }
        Update: { activo?: boolean; costo?: number; created_at?: string; elemento?: string; id?: string; meses_reposicion?: number; owner_id?: string | null; stock?: number; tipo_negocio?: string | null; unidad?: string }
        Relationships: []
      }
      seg_entregas: {
        Row: { cantidad: number; costo_total: number; created_at: string; elemento: string; empleado: string; fecha: string; id: string; insumo_id: string; owner_id: string | null; proxima_entrega: string | null; puesto: string | null; tipo_negocio: string | null }
        Insert: { cantidad: number; costo_total?: number; created_at?: string; elemento: string; empleado: string; fecha?: string; id?: string; insumo_id: string; owner_id?: string | null; proxima_entrega?: string | null; puesto?: string | null; tipo_negocio?: string | null }
        Update: { cantidad?: number; costo_total?: number; created_at?: string; elemento?: string; empleado?: string; fecha?: string; id?: string; insumo_id?: string; owner_id?: string | null; proxima_entrega?: string | null; puesto?: string | null; tipo_negocio?: string | null }
        Relationships: []
      }
      seg_facturas: {
        Row: { cliente: string; created_at: string; estado: string; id: string; metodo: string | null; owner_id: string | null; pagada_en: string | null; periodo: string; puesto_id: string; sede: string; tipo_negocio: string | null; valor: number; vence: string }
        Insert: { cliente: string; created_at?: string; estado?: string; id?: string; metodo?: string | null; owner_id?: string | null; pagada_en?: string | null; periodo: string; puesto_id: string; sede: string; tipo_negocio?: string | null; valor: number; vence: string }
        Update: { cliente?: string; created_at?: string; estado?: string; id?: string; metodo?: string | null; owner_id?: string | null; pagada_en?: string | null; periodo?: string; puesto_id?: string; sede?: string; tipo_negocio?: string | null; valor?: number; vence?: string }
        Relationships: []
      }
      gan_animales: {
        Row: { chapeta: string; created_at: string; especie: string; estado: string; fecha_ingreso: string; fecha_nacimiento: string | null; id: string; lote: string | null; notas: string | null; owner_id: string | null; peso_actual: number; peso_inicial: number; potrero: string | null; raza: string | null; sexo: string; tipo_negocio: string | null }
        Insert: { chapeta: string; created_at?: string; especie?: string; estado?: string; fecha_ingreso?: string; fecha_nacimiento?: string | null; id?: string; lote?: string | null; notas?: string | null; owner_id?: string | null; peso_actual?: number; peso_inicial?: number; potrero?: string | null; raza?: string | null; sexo?: string; tipo_negocio?: string | null }
        Update: { chapeta?: string; created_at?: string; especie?: string; estado?: string; fecha_ingreso?: string; fecha_nacimiento?: string | null; id?: string; lote?: string | null; notas?: string | null; owner_id?: string | null; peso_actual?: number; peso_inicial?: number; potrero?: string | null; raza?: string | null; sexo?: string; tipo_negocio?: string | null }
        Relationships: []
      }
      gan_pesajes: {
        Row: { animal_id: string; chapeta: string; created_at: string; dias: number | null; fecha: string; ganancia_dia: number | null; id: string; owner_id: string | null; peso: number; tipo_negocio: string | null }
        Insert: { animal_id: string; chapeta: string; created_at?: string; dias?: number | null; fecha: string; ganancia_dia?: number | null; id?: string; owner_id?: string | null; peso: number; tipo_negocio?: string | null }
        Update: { animal_id?: string; chapeta?: string; created_at?: string; dias?: number | null; fecha?: string; ganancia_dia?: number | null; id?: string; owner_id?: string | null; peso?: number; tipo_negocio?: string | null }
        Relationships: []
      }
      gan_sanidad: {
        Row: { animal_id: string | null; chapeta: string | null; created_at: string; fecha: string; id: string; lote: string | null; notas: string | null; owner_id: string | null; producto: string; proxima: string | null; registro_ica: string | null; tipo: string; tipo_negocio: string | null }
        Insert: { animal_id?: string | null; chapeta?: string | null; created_at?: string; fecha?: string; id?: string; lote?: string | null; notas?: string | null; owner_id?: string | null; producto: string; proxima?: string | null; registro_ica?: string | null; tipo?: string; tipo_negocio?: string | null }
        Update: { animal_id?: string | null; chapeta?: string | null; created_at?: string; fecha?: string; id?: string; lote?: string | null; notas?: string | null; owner_id?: string | null; producto?: string; proxima?: string | null; registro_ica?: string | null; tipo?: string; tipo_negocio?: string | null }
        Relationships: []
      }
      gan_produccion: {
        Row: { cantidad: number; chapeta: string | null; created_at: string; fecha: string; id: string; lote: string | null; notas: string | null; owner_id: string | null; tipo: string; tipo_negocio: string | null; unidad: string; valor: number }
        Insert: { cantidad: number; chapeta?: string | null; created_at?: string; fecha?: string; id?: string; lote?: string | null; notas?: string | null; owner_id?: string | null; tipo?: string; tipo_negocio?: string | null; unidad?: string; valor?: number }
        Update: { cantidad?: number; chapeta?: string | null; created_at?: string; fecha?: string; id?: string; lote?: string | null; notas?: string | null; owner_id?: string | null; tipo?: string; tipo_negocio?: string | null; unidad?: string; valor?: number }
        Relationships: []
      }
      gan_insumos: {
        Row: { activo: boolean; costo: number; created_at: string; id: string; nombre: string; owner_id: string | null; stock: number; stock_minimo: number; tipo_negocio: string | null; unidad: string }
        Insert: { activo?: boolean; costo?: number; created_at?: string; id?: string; nombre: string; owner_id?: string | null; stock?: number; stock_minimo?: number; tipo_negocio?: string | null; unidad?: string }
        Update: { activo?: boolean; costo?: number; created_at?: string; id?: string; nombre?: string; owner_id?: string | null; stock?: number; stock_minimo?: number; tipo_negocio?: string | null; unidad?: string }
        Relationships: []
      }
      gan_consumos: {
        Row: { cantidad: number; costo_total: number; created_at: string; fecha: string; id: string; insumo_id: string; lote: string | null; nombre: string; owner_id: string | null; tipo_negocio: string | null }
        Insert: { cantidad: number; costo_total?: number; created_at?: string; fecha?: string; id?: string; insumo_id: string; lote?: string | null; nombre: string; owner_id?: string | null; tipo_negocio?: string | null }
        Update: { cantidad?: number; costo_total?: number; created_at?: string; fecha?: string; id?: string; insumo_id?: string; lote?: string | null; nombre?: string; owner_id?: string | null; tipo_negocio?: string | null }
        Relationships: []
      }
      gan_guias: {
        Row: { cantidad: number; chapetas: string | null; created_at: string; destino: string; emitida: string; id: string; numero: string; origen: string; owner_id: string | null; tipo_negocio: string | null; vence: string }
        Insert: { cantidad: number; chapetas?: string | null; created_at?: string; destino: string; emitida?: string; id?: string; numero: string; origen: string; owner_id?: string | null; tipo_negocio?: string | null; vence: string }
        Update: { cantidad?: number; chapetas?: string | null; created_at?: string; destino?: string; emitida?: string; id?: string; numero?: string; origen?: string; owner_id?: string | null; tipo_negocio?: string | null; vence?: string }
        Relationships: []
      }
      gan_ventas: {
        Row: { animales: number; comprador: string; created_at: string; detalle: Json; fecha: string; id: string; kilos: number; metodo: string; modalidad: string; owner_id: string | null; precio: number; tipo_negocio: string | null; total: number }
        Insert: { animales?: number; comprador: string; created_at?: string; detalle?: Json; fecha?: string; id?: string; kilos?: number; metodo?: string; modalidad: string; owner_id?: string | null; precio: number; tipo_negocio?: string | null; total?: number }
        Update: { animales?: number; comprador?: string; created_at?: string; detalle?: Json; fecha?: string; id?: string; kilos?: number; metodo?: string; modalidad?: string; owner_id?: string | null; precio?: number; tipo_negocio?: string | null; total?: number }
        Relationships: []
      }
      fun_donantes: {
        Row: { activo: boolean; ciudad: string | null; correo: string | null; created_at: string; documento: string | null; id: string; nombre: string; owner_id: string | null; telefono: string | null; tipo: string; tipo_negocio: string | null }
        Insert: { activo?: boolean; ciudad?: string | null; correo?: string | null; created_at?: string; documento?: string | null; id?: string; nombre: string; owner_id?: string | null; telefono?: string | null; tipo?: string; tipo_negocio?: string | null }
        Update: { activo?: boolean; ciudad?: string | null; correo?: string | null; created_at?: string; documento?: string | null; id?: string; nombre?: string; owner_id?: string | null; telefono?: string | null; tipo?: string; tipo_negocio?: string | null }
        Relationships: []
      }
      fun_proyectos: {
        Row: { created_at: string; descripcion: string | null; ejecutado: number; estado: string; fin: string | null; id: string; inicio: string; meta_beneficiarios: number; nombre: string; owner_id: string | null; presupuesto: number; tipo_negocio: string | null }
        Insert: { created_at?: string; descripcion?: string | null; ejecutado?: number; estado?: string; fin?: string | null; id?: string; inicio?: string; meta_beneficiarios?: number; nombre: string; owner_id?: string | null; presupuesto?: number; tipo_negocio?: string | null }
        Update: { created_at?: string; descripcion?: string | null; ejecutado?: number; estado?: string; fin?: string | null; id?: string; inicio?: string; meta_beneficiarios?: number; nombre?: string; owner_id?: string | null; presupuesto?: number; tipo_negocio?: string | null }
        Relationships: []
      }
      fun_beneficiarios: {
        Row: { activo: boolean; consentimiento: boolean; created_at: string; documento: string | null; id: string; necesidad: string | null; nombre: string; owner_id: string | null; proyecto_id: string; telefono: string | null; tipo_negocio: string | null }
        Insert: { activo?: boolean; consentimiento?: boolean; created_at?: string; documento?: string | null; id?: string; necesidad?: string | null; nombre: string; owner_id?: string | null; proyecto_id: string; telefono?: string | null; tipo_negocio?: string | null }
        Update: { activo?: boolean; consentimiento?: boolean; created_at?: string; documento?: string | null; id?: string; necesidad?: string | null; nombre?: string; owner_id?: string | null; proyecto_id?: string; telefono?: string | null; tipo_negocio?: string | null }
        Relationships: []
      }
      fun_donaciones: {
        Row: { certificado: string; created_at: string; descripcion: string | null; documento: string | null; donante: string; donante_id: string; fecha: string; id: string; metodo: string | null; owner_id: string | null; proyecto: string | null; proyecto_id: string | null; tipo: string; tipo_negocio: string | null; valor: number }
        Insert: { certificado: string; created_at?: string; descripcion?: string | null; documento?: string | null; donante: string; donante_id: string; fecha?: string; id?: string; metodo?: string | null; owner_id?: string | null; proyecto?: string | null; proyecto_id?: string | null; tipo: string; tipo_negocio?: string | null; valor: number }
        Update: { certificado?: string; created_at?: string; descripcion?: string | null; documento?: string | null; donante?: string; donante_id?: string; fecha?: string; id?: string; metodo?: string | null; owner_id?: string | null; proyecto?: string | null; proyecto_id?: string | null; tipo?: string; tipo_negocio?: string | null; valor?: number }
        Relationships: []
      }
      fun_gastos: {
        Row: { concepto: string; created_at: string; fecha: string; id: string; metodo: string; owner_id: string | null; proyecto: string; proyecto_id: string; tipo_negocio: string | null; valor: number }
        Insert: { concepto: string; created_at?: string; fecha?: string; id?: string; metodo?: string; owner_id?: string | null; proyecto: string; proyecto_id: string; tipo_negocio?: string | null; valor: number }
        Update: { concepto?: string; created_at?: string; fecha?: string; id?: string; metodo?: string; owner_id?: string | null; proyecto?: string; proyecto_id?: string; tipo_negocio?: string | null; valor?: number }
        Relationships: []
      }
      fun_voluntarios: {
        Row: { activo: boolean; area: string; created_at: string; desde: string; documento: string | null; horas_mes: number; id: string; nombre: string; owner_id: string | null; telefono: string | null; tipo_negocio: string | null }
        Insert: { activo?: boolean; area?: string; created_at?: string; desde?: string; documento?: string | null; horas_mes?: number; id?: string; nombre: string; owner_id?: string | null; telefono?: string | null; tipo_negocio?: string | null }
        Update: { activo?: boolean; area?: string; created_at?: string; desde?: string; documento?: string | null; horas_mes?: number; id?: string; nombre?: string; owner_id?: string | null; telefono?: string | null; tipo_negocio?: string | null }
        Relationships: []
      }
      igl_miembros: {
        Row: { activo: boolean; created_at: string; documento: string | null; familia: string | null; fecha_bautizo: string | null; grupo: string | null; id: string; ministerio: string | null; nombre: string; owner_id: string | null; telefono: string | null; tipo_negocio: string | null }
        Insert: { activo?: boolean; created_at?: string; documento?: string | null; familia?: string | null; fecha_bautizo?: string | null; grupo?: string | null; id?: string; ministerio?: string | null; nombre: string; owner_id?: string | null; telefono?: string | null; tipo_negocio?: string | null }
        Update: { activo?: boolean; created_at?: string; documento?: string | null; familia?: string | null; fecha_bautizo?: string | null; grupo?: string | null; id?: string; ministerio?: string | null; nombre?: string; owner_id?: string | null; telefono?: string | null; tipo_negocio?: string | null }
        Relationships: []
      }
      igl_grupos: {
        Row: { activo: boolean; created_at: string; dia_reunion: string | null; id: string; lider: string | null; nombre: string; owner_id: string | null; tipo: string; tipo_negocio: string | null }
        Insert: { activo?: boolean; created_at?: string; dia_reunion?: string | null; id?: string; lider?: string | null; nombre: string; owner_id?: string | null; tipo?: string; tipo_negocio?: string | null }
        Update: { activo?: boolean; created_at?: string; dia_reunion?: string | null; id?: string; lider?: string | null; nombre?: string; owner_id?: string | null; tipo?: string; tipo_negocio?: string | null }
        Relationships: []
      }
      igl_ingresos: {
        Row: { concepto: string; created_at: string; culto: string; evento: string | null; fecha: string; fondo: string; id: string; metodo: string; miembro: string | null; miembro_id: string | null; owner_id: string | null; recibo: string; tipo_negocio: string | null; valor: number }
        Insert: { concepto: string; created_at?: string; culto?: string; evento?: string | null; fecha?: string; fondo?: string; id?: string; metodo?: string; miembro?: string | null; miembro_id?: string | null; owner_id?: string | null; recibo: string; tipo_negocio?: string | null; valor: number }
        Update: { concepto?: string; created_at?: string; culto?: string; evento?: string | null; fecha?: string; fondo?: string; id?: string; metodo?: string; miembro?: string | null; miembro_id?: string | null; owner_id?: string | null; recibo?: string; tipo_negocio?: string | null; valor?: number }
        Relationships: []
      }
      igl_egresos: {
        Row: { concepto: string; created_at: string; culto: string; evento: string | null; fecha: string; fondo: string; id: string; metodo: string; obra_social: boolean; owner_id: string | null; tipo_negocio: string | null; valor: number }
        Insert: { concepto: string; created_at?: string; culto?: string; evento?: string | null; fecha?: string; fondo?: string; id?: string; metodo?: string; obra_social?: boolean; owner_id?: string | null; tipo_negocio?: string | null; valor: number }
        Update: { concepto?: string; created_at?: string; culto?: string; evento?: string | null; fecha?: string; fondo?: string; id?: string; metodo?: string; obra_social?: boolean; owner_id?: string | null; tipo_negocio?: string | null; valor?: number }
        Relationships: []
      }
      igl_cierres: {
        Row: { created_at: string; culto: string; desde: string; diezmos: number; egresos: number; eventos: number; hasta: string; id: string; neto: number; ofrendas: number; owner_id: string | null; por_fondo: Json; primicias: number; tipo_negocio: string | null }
        Insert: { created_at?: string; culto?: string; desde: string; diezmos?: number; egresos?: number; eventos?: number; hasta: string; id?: string; neto?: number; ofrendas?: number; owner_id?: string | null; por_fondo?: Json; primicias?: number; tipo_negocio?: string | null }
        Update: { created_at?: string; culto?: string; desde?: string; diezmos?: number; egresos?: number; eventos?: number; hasta?: string; id?: string; neto?: number; ofrendas?: number; owner_id?: string | null; por_fondo?: Json; primicias?: number; tipo_negocio?: string | null }
        Relationships: []
      }
      igl_eventos: {
        Row: { created_at: string; estado: string; fecha: string; id: string; lugar: string | null; nombre: string; notas: string | null; owner_id: string | null; presupuesto: number; tipo_negocio: string | null }
        Insert: { created_at?: string; estado?: string; fecha: string; id?: string; lugar?: string | null; nombre: string; notas?: string | null; owner_id?: string | null; presupuesto?: number; tipo_negocio?: string | null }
        Update: { created_at?: string; estado?: string; fecha?: string; id?: string; lugar?: string | null; nombre?: string; notas?: string | null; owner_id?: string | null; presupuesto?: number; tipo_negocio?: string | null }
        Relationships: []
      }
      igl_visitas: {
        Row: { created_at: string; fecha: string; id: string; notas: string | null; owner_id: string | null; persona: string; responsable: string | null; seguimiento: string; tipo: string; tipo_negocio: string | null }
        Insert: { created_at?: string; fecha?: string; id?: string; notas?: string | null; owner_id?: string | null; persona: string; responsable?: string | null; seguimiento?: string; tipo?: string; tipo_negocio?: string | null }
        Update: { created_at?: string; fecha?: string; id?: string; notas?: string | null; owner_id?: string | null; persona?: string; responsable?: string | null; seguimiento?: string; tipo?: string; tipo_negocio?: string | null }
        Relationships: []
      }
      parq_abonados: {
        Row: { activo: boolean; created_at: string; id: string; nombre: string; owner_id: string | null; placa: string; tarifa_mensual: number; telefono: string | null; tipo_negocio: string | null; vence: string }
        Insert: { activo?: boolean; created_at?: string; id?: string; nombre: string; owner_id?: string | null; placa: string; tarifa_mensual?: number; telefono?: string | null; tipo_negocio?: string | null; vence?: string }
        Update: { activo?: boolean; created_at?: string; id?: string; nombre?: string; owner_id?: string | null; placa?: string; tarifa_mensual?: number; telefono?: string | null; tipo_negocio?: string | null; vence?: string }
        Relationships: []
      }
      cv_articulos: { Row: CvArticuloRow; Insert: OpcionalesExcepto<CvArticuloRow, "nombre">; Update: Partial<CvArticuloRow>; Relationships: [] }
      cv_contratos: { Row: CvContratoRow; Insert: OpcionalesExcepto<CvContratoRow, "numero" | "articulo" | "cliente" | "prestado" | "plazo_dias" | "vence">; Update: Partial<CvContratoRow>; Relationships: [] }
      cv_movimientos: { Row: CvMovimientoRow; Insert: OpcionalesExcepto<CvMovimientoRow, "contrato_id" | "numero" | "articulo" | "cliente" | "tipo" | "recibo">; Update: Partial<CvMovimientoRow>; Relationships: [] }
      dis_rutas: { Row: DisRutaRow; Insert: OpcionalesExcepto<DisRutaRow, "nombre">; Update: Partial<DisRutaRow>; Relationships: [] }
      dis_clientes: { Row: DisClienteRow; Insert: OpcionalesExcepto<DisClienteRow, "nombre">; Update: Partial<DisClienteRow>; Relationships: [] }
      dis_productos: { Row: DisProductoRow; Insert: OpcionalesExcepto<DisProductoRow, "nombre">; Update: Partial<DisProductoRow>; Relationships: [] }
      dis_precios: { Row: DisPrecioRow; Insert: OpcionalesExcepto<DisPrecioRow, "producto_id" | "canal" | "desde_unidades" | "precio_unidad">; Update: Partial<DisPrecioRow>; Relationships: [] }
      dis_pedidos: { Row: DisPedidoRow; Insert: OpcionalesExcepto<DisPedidoRow, "numero" | "cliente_id" | "cliente" | "canal">; Update: Partial<DisPedidoRow>; Relationships: [] }
      dis_pedido_items: { Row: DisPedidoItemRow; Insert: OpcionalesExcepto<DisPedidoItemRow, "pedido_id" | "producto_id" | "nombre" | "presentacion" | "cantidad" | "unidades" | "precio_unidad" | "subtotal">; Update: Partial<DisPedidoItemRow>; Relationships: [] }
      dis_abonos: { Row: DisAbonoRow; Insert: OpcionalesExcepto<DisAbonoRow, "cliente_id" | "cliente" | "monto" | "recibo">; Update: Partial<DisAbonoRow>; Relationships: [] }
      mot_mecanicos: { Row: MotMecanicoRow; Insert: OpcionalesExcepto<MotMecanicoRow, "nombre">; Update: Partial<MotMecanicoRow>; Relationships: [] }
      mot_repuestos: { Row: MotRepuestoRow; Insert: OpcionalesExcepto<MotRepuestoRow, "nombre">; Update: Partial<MotRepuestoRow>; Relationships: [] }
      mot_ordenes: { Row: MotOrdenRow; Insert: OpcionalesExcepto<MotOrdenRow, "placa" | "cliente" | "falla">; Update: Partial<MotOrdenRow>; Relationships: [] }
      mot_orden_repuestos: { Row: MotOrdenRepuestoRow; Insert: OpcionalesExcepto<MotOrdenRepuestoRow, "orden_id" | "repuesto_id" | "nombre" | "cantidad" | "precio" | "subtotal">; Update: Partial<MotOrdenRepuestoRow>; Relationships: [] }
      parq_pagos: {
        Row: { abonado_id: string; created_at: string; desde: string; fecha: string; hasta: string; id: string; metodo: string; nombre: string; owner_id: string | null; placa: string; recibo: string; tipo_negocio: string | null; valor: number }
        Insert: { abonado_id: string; created_at?: string; desde: string; fecha?: string; hasta: string; id?: string; metodo?: string; nombre: string; owner_id?: string | null; placa: string; recibo: string; tipo_negocio?: string | null; valor: number }
        Update: { abonado_id?: string; created_at?: string; desde?: string; fecha?: string; hasta?: string; id?: string; metodo?: string; nombre?: string; owner_id?: string | null; placa?: string; recibo?: string; tipo_negocio?: string | null; valor?: number }
        Relationships: []
      }
      tal_ordenes: {
        Row: {
          abono: number
          checklist: Json
          clave_patron: string | null
          cliente: string
          combustible: string | null
          comision: number
          comision_pct: number
          created_at: string
          dias_garantia: number
          estado: string
          fecha_entrega: string | null
          id: string
          identificador: string
          kilometraje: string | null
          liquidacion_id: string | null
          liquidada: boolean
          mano_obra: number
          marca: string | null
          modelo: string | null
          notas: string | null
          owner_id: string | null
          registrado_por: string | null
          repuestos_total: number
          rubro: string
          tecnico: string | null
          telefono: string | null
          tipo_negocio: string | null
          total: number
        }
        Insert: {
          abono?: number
          checklist?: Json
          clave_patron?: string | null
          cliente: string
          combustible?: string | null
          comision?: number
          comision_pct?: number
          created_at?: string
          dias_garantia?: number
          estado?: string
          fecha_entrega?: string | null
          id?: string
          identificador: string
          kilometraje?: string | null
          liquidacion_id?: string | null
          liquidada?: boolean
          mano_obra?: number
          marca?: string | null
          modelo?: string | null
          notas?: string | null
          owner_id?: string | null
          registrado_por?: string | null
          repuestos_total?: number
          rubro?: string
          tecnico?: string | null
          telefono?: string | null
          tipo_negocio?: string | null
          total?: number
        }
        Update: {
          abono?: number
          checklist?: Json
          clave_patron?: string | null
          cliente?: string
          combustible?: string | null
          comision?: number
          comision_pct?: number
          created_at?: string
          dias_garantia?: number
          estado?: string
          fecha_entrega?: string | null
          id?: string
          identificador?: string
          kilometraje?: string | null
          liquidacion_id?: string | null
          liquidada?: boolean
          mano_obra?: number
          marca?: string | null
          modelo?: string | null
          notas?: string | null
          owner_id?: string | null
          registrado_por?: string | null
          repuestos_total?: number
          rubro?: string
          tecnico?: string | null
          telefono?: string | null
          tipo_negocio?: string | null
          total?: number
        }
        Relationships: []
      }
      tal_fotos: {
        Row: { created_at: string; id: string; nota: string | null; orden_id: string; owner_id: string | null; ruta: string; tipo_negocio: string | null }
        Insert: { created_at?: string; id?: string; nota?: string | null; orden_id: string; owner_id?: string | null; ruta: string; tipo_negocio?: string | null }
        Update: { created_at?: string; id?: string; nota?: string | null; orden_id?: string; owner_id?: string | null; ruta?: string | null; tipo_negocio?: string | null }
        Relationships: []
      }
      tal_repuestos: {
        Row: { activo: boolean; codigo: string | null; costo: number; created_at: string; id: string; nombre: string; owner_id: string | null; precio: number; stock: number; tipo_negocio: string | null }
        Insert: { activo?: boolean; codigo?: string | null; costo?: number; created_at?: string; id?: string; nombre: string; owner_id?: string | null; precio?: number; stock?: number; tipo_negocio?: string | null }
        Update: { activo?: boolean; codigo?: string | null; costo?: number; created_at?: string; id?: string; nombre?: string | null; owner_id?: string | null; precio?: number; stock?: number; tipo_negocio?: string | null }
        Relationships: []
      }
      tal_orden_repuestos: {
        Row: { cantidad: number; costo: number; created_at: string; id: string; nombre: string; orden_id: string; owner_id: string | null; precio: number; repuesto_id: string; tipo_negocio: string | null }
        Insert: { cantidad: number; costo?: number; created_at?: string; id?: string; nombre: string; orden_id: string; owner_id?: string | null; precio?: number; repuesto_id: string; tipo_negocio?: string | null }
        Update: { cantidad?: number; costo?: number; created_at?: string; id?: string; nombre?: string | null; orden_id?: string; owner_id?: string | null; precio?: number; repuesto_id?: string; tipo_negocio?: string | null }
        Relationships: []
      }
      tal_liquidaciones: {
        Row: { created_at: string; id: string; metodo: string; ordenes: number; owner_id: string | null; profesional: string; tipo_negocio: string | null; total_comision: number; total_mano: number }
        Insert: { created_at?: string; id?: string; metodo?: string; ordenes?: number; owner_id?: string | null; profesional: string; tipo_negocio?: string | null; total_comision?: number; total_mano?: number }
        Update: { created_at?: string; id?: string; metodo?: string; ordenes?: number; owner_id?: string | null; profesional?: string; tipo_negocio?: string | null; total_comision?: number; total_mano?: number }
        Relationships: []
      }
      tal_proyectos: {
        Row: { abono: number; cliente: string; created_at: string; descripcion: string | null; estado: string; fecha_entrega: string | null; id: string; materiales: Json; owner_id: string | null; registrado_por: string | null; rubro: string; saldo: number; telefono: string | null; tipo_negocio: string | null; titulo: string; total: number }
        Insert: { abono?: number; cliente: string; created_at?: string; descripcion?: string | null; estado?: string; fecha_entrega?: string | null; id?: string; materiales?: Json; owner_id?: string | null; registrado_por?: string | null; rubro?: string; saldo?: number; telefono?: string | null; tipo_negocio?: string | null; titulo: string; total?: number }
        Update: { abono?: number; cliente?: string; created_at?: string; descripcion?: string | null; estado?: string; fecha_entrega?: string | null; id?: string; materiales?: Json; owner_id?: string | null; registrado_por?: string | null; rubro?: string; saldo?: number; telefono?: string | null; tipo_negocio?: string | null; titulo?: string; total?: number }
        Relationships: []
      }
      com_seriales: {
        Row: {
          cliente: string | null
          created_at: string
          estado: string
          garantia_hasta: string | null
          id: string
          notas: string | null
          owner_id: string | null
          producto_id: string
          registrado_por: string | null
          serial: string
          telefono: string | null
          tipo_negocio: string | null
          vendido_el: string | null
        }
        Insert: {
          cliente?: string | null
          created_at?: string
          estado?: string
          garantia_hasta?: string | null
          id?: string
          notas?: string | null
          owner_id?: string | null
          producto_id: string
          registrado_por?: string | null
          serial: string
          telefono?: string | null
          tipo_negocio?: string | null
          vendido_el?: string | null
        }
        Update: {
          cliente?: string | null
          created_at?: string
          estado?: string
          garantia_hasta?: string | null
          id?: string
          notas?: string | null
          owner_id?: string | null
          producto_id?: string
          registrado_por?: string | null
          serial?: string
          telefono?: string | null
          tipo_negocio?: string | null
          vendido_el?: string | null
        }
        Relationships: []
      }
      com_productos: {
        Row: {
          atributos: Json
          garantia_dias: number
          requiere_serial: boolean
          imagen_url: string | null
          ubicacion_pasillo: string | null
          ubicacion_estante: string | null
          ubicacion_nivel: string | null
          controla_lotes: boolean
          activo: boolean
          codigo_barras: string | null
          costo: number
          created_at: string
          id: string
          impuesto_pct: number
          nombre: string
          owner_id: string | null
          precio_detal: number
          precio_especial: number | null
          precio_incluye_impuesto: boolean
          precio_mayorista: number | null
          sku: string | null
          stock: number
          stock_actual: number
          stock_minimo: number
          tipo_impuesto: string
          tipo_negocio: string | null
          unidad_base: string
          unidades_por_caja: number | null
        }
        Insert: {
          atributos?: Json
          garantia_dias?: number
          requiere_serial?: boolean
          ubicacion_pasillo?: string | null
          ubicacion_estante?: string | null
          ubicacion_nivel?: string | null
          controla_lotes?: boolean
          activo?: boolean
          codigo_barras?: string | null
          costo?: number
          created_at?: string
          id?: string
          impuesto_pct?: number
          nombre: string
          owner_id?: string | null
          precio_detal?: number
          precio_especial?: number | null
          precio_incluye_impuesto?: boolean
          precio_mayorista?: number | null
          sku?: string | null
          stock?: number
          stock_actual?: number
          stock_minimo?: number
          tipo_impuesto?: string
          tipo_negocio?: string | null
          unidad_base?: string
          unidades_por_caja?: number | null
          imagen_url?: string | null
        }
        Update: {
          atributos?: Json
          garantia_dias?: number
          requiere_serial?: boolean
          imagen_url?: string | null
          ubicacion_pasillo?: string | null
          ubicacion_estante?: string | null
          ubicacion_nivel?: string | null
          controla_lotes?: boolean
          activo?: boolean
          codigo_barras?: string | null
          costo?: number
          created_at?: string
          id?: string
          impuesto_pct?: number
          nombre?: string
          owner_id?: string | null
          precio_detal?: number
          precio_especial?: number | null
          precio_incluye_impuesto?: boolean
          precio_mayorista?: number | null
          sku?: string | null
          stock?: number
          stock_actual?: number
          stock_minimo?: number
          tipo_impuesto?: string
          tipo_negocio?: string | null
          unidad_base?: string
          unidades_por_caja?: number | null
        }
        Relationships: []
      }
      com_movimientos_stock: {
        Row: {
          created_at: string
          delta: number
          id: string
          motivo: string
          owner_id: string | null
          producto_id: string
          stock_resultante: number
          tipo_negocio: string | null
        }
        Insert: {
          created_at?: string
          delta: number
          id?: string
          motivo: string
          owner_id?: string | null
          producto_id: string
          stock_resultante: number
          tipo_negocio?: string | null
        }
        Update: {
          created_at?: string
          delta?: number
          id?: string
          motivo?: string
          owner_id?: string | null
          producto_id?: string
          stock_resultante?: number
          tipo_negocio?: string | null
        }
        Relationships: []
      }
      com_ventas: {
        Row: {
          devuelta_en: string | null
          devuelta_por: string | null
          motivo_devolucion: string | null
          autorizado_por: string | null
          base: number
          cliente: string | null
          created_at: string
          fiado_id: string | null
          id: string
          impoconsumo: number
          iva: number
          metodo: string
          motivo_autorizacion: string | null
          owner_id: string | null
          registrado_por: string | null
          sucursal_id: string | null
          telefono: string | null
          tipo_negocio: string | null
          tipo_precio: string
          total: number
        }
        Insert: {
          devuelta_en?: string | null
          devuelta_por?: string | null
          motivo_devolucion?: string | null
          autorizado_por?: string | null
          base?: number
          cliente?: string | null
          created_at?: string
          fiado_id?: string | null
          id?: string
          impoconsumo?: number
          iva?: number
          metodo?: string
          motivo_autorizacion?: string | null
          owner_id?: string | null
          registrado_por?: string | null
          sucursal_id?: string | null
          telefono?: string | null
          tipo_negocio?: string | null
          tipo_precio?: string
          total?: number
        }
        Update: {
          devuelta_en?: string | null
          devuelta_por?: string | null
          motivo_devolucion?: string | null
          autorizado_por?: string | null
          base?: number
          cliente?: string | null
          created_at?: string
          fiado_id?: string | null
          id?: string
          impoconsumo?: number
          iva?: number
          metodo?: string
          motivo_autorizacion?: string | null
          owner_id?: string | null
          registrado_por?: string | null
          sucursal_id?: string | null
          telefono?: string | null
          tipo_negocio?: string | null
          tipo_precio?: string
          total?: number
        }
        Relationships: []
      }
      com_venta_items: {
        Row: {
          base: number
          cantidad: number
          cantidad_base: number
          costo_unitario: number
          utilidad_bruta: number
          created_at: string
          id: string
          impuesto: number
          impuesto_pct: number
          nombre: string
          owner_id: string | null
          precio_base: number
          producto_id: string
          tipo_impuesto: string
          tipo_negocio: string | null
          total: number
          unidad: string
          venta_id: string
        }
        Insert: {
          base?: number
          cantidad: number
          cantidad_base: number
          costo_unitario?: number
          utilidad_bruta?: number
          created_at?: string
          id?: string
          impuesto?: number
          impuesto_pct?: number
          nombre: string
          owner_id?: string | null
          precio_base?: number
          producto_id: string
          tipo_impuesto?: string
          tipo_negocio?: string | null
          total?: number
          unidad: string
          venta_id: string
        }
        Update: {
          base?: number
          cantidad?: number
          cantidad_base?: number
          costo_unitario?: number
          utilidad_bruta?: number
          created_at?: string
          id?: string
          impuesto?: number
          impuesto_pct?: number
          nombre?: string
          owner_id?: string | null
          precio_base?: number
          producto_id?: string
          tipo_impuesto?: string
          tipo_negocio?: string | null
          total?: number
          unidad?: string
          venta_id?: string
        }
        Relationships: []
      }
      com_cupos: {
        Row: {
          cliente: string
          cliente_clave: string
          created_at: string
          cupo_maximo: number
          id: string
          owner_id: string | null
          plazo_dias: number
          telefono: string | null
          tipo_negocio: string | null
        }
        Insert: {
          cliente: string
          cliente_clave: string
          created_at?: string
          cupo_maximo?: number
          id?: string
          owner_id?: string | null
          plazo_dias?: number
          telefono?: string | null
          tipo_negocio?: string | null
        }
        Update: {
          cliente?: string
          cliente_clave?: string
          created_at?: string
          cupo_maximo?: number
          id?: string
          owner_id?: string | null
          plazo_dias?: number
          telefono?: string | null
          tipo_negocio?: string | null
        }
        Relationships: []
      }
      bel_servicios: {
        Row: { activo: boolean; comision_pct: number; created_at: string; descontar_insumos: boolean; duracion_min: number; id: string; nombre: string; owner_id: string | null; precio: number; tipo_negocio: string | null }
        Insert: { activo?: boolean; comision_pct?: number; created_at?: string; descontar_insumos?: boolean; duracion_min?: number; id?: string; nombre: string; owner_id?: string | null; precio?: number; tipo_negocio?: string | null }
        Update: { activo?: boolean; comision_pct?: number; created_at?: string; descontar_insumos?: boolean; duracion_min?: number; id?: string; nombre?: string; owner_id?: string | null; precio?: number; tipo_negocio?: string | null }
        Relationships: []
      }
      bel_insumos: {
        Row: { activo: boolean; costo_unitario: number; created_at: string; id: string; nombre: string; owner_id: string | null; stock: number; tipo_negocio: string | null; unidad: string }
        Insert: { activo?: boolean; costo_unitario?: number; created_at?: string; id?: string; nombre: string; owner_id?: string | null; stock?: number; tipo_negocio?: string | null; unidad?: string }
        Update: { activo?: boolean; costo_unitario?: number; created_at?: string; id?: string; nombre?: string; owner_id?: string | null; stock?: number; tipo_negocio?: string | null; unidad?: string }
        Relationships: []
      }
      bel_servicio_insumos: {
        Row: { cantidad: number; created_at: string; id: string; insumo_id: string; owner_id: string | null; servicio_id: string; tipo_negocio: string | null }
        Insert: { cantidad: number; created_at?: string; id?: string; insumo_id: string; owner_id?: string | null; servicio_id: string; tipo_negocio?: string | null }
        Update: { cantidad?: number; created_at?: string; id?: string; insumo_id?: string; owner_id?: string | null; servicio_id?: string; tipo_negocio?: string | null }
        Relationships: []
      }
      bel_clientes: {
        Row: { activo: boolean; alergias: string | null; created_at: string; id: string; nombre: string; notas: string | null; owner_id: string | null; telefono: string | null; tipo_negocio: string | null }
        Insert: { activo?: boolean; alergias?: string | null; created_at?: string; id?: string; nombre: string; notas?: string | null; owner_id?: string | null; telefono?: string | null; tipo_negocio?: string | null }
        Update: { activo?: boolean; alergias?: string | null; created_at?: string; id?: string; nombre?: string; notas?: string | null; owner_id?: string | null; telefono?: string | null; tipo_negocio?: string | null }
        Relationships: []
      }
      bel_citas: {
        Row: { atencion_id: string | null; cliente_id: string; created_at: string; duracion_min: number; estado: string; id: string; inicio: string; notas: string | null; owner_id: string | null; profesional: string; recordatorio_enviado: boolean; recurso: string | null; servicio_id: string | null; staff_id: string | null; tipo_negocio: string | null }
        Insert: { atencion_id?: string | null; cliente_id: string; created_at?: string; duracion_min?: number; estado?: string; id?: string; inicio: string; notas?: string | null; owner_id?: string | null; profesional: string; recordatorio_enviado?: boolean; recurso?: string | null; servicio_id?: string | null; staff_id?: string | null; tipo_negocio?: string | null }
        Update: { atencion_id?: string | null; cliente_id?: string; created_at?: string; duracion_min?: number; estado?: string; id?: string; inicio?: string; notas?: string | null; owner_id?: string | null; profesional?: string; recordatorio_enviado?: boolean; recurso?: string | null; servicio_id?: string | null; staff_id?: string | null; tipo_negocio?: string | null }
        Relationships: []
      }
      bel_fichas: {
        Row: { cita_id: string | null; cliente_id: string; created_at: string; fecha: string; foto_antes: string | null; foto_despues: string | null; formula: string | null; id: string; notas: string | null; owner_id: string | null; profesional: string | null; tipo_negocio: string | null }
        Insert: { cita_id?: string | null; cliente_id: string; created_at?: string; fecha?: string; foto_antes?: string | null; foto_despues?: string | null; formula?: string | null; id?: string; notas?: string | null; owner_id?: string | null; profesional?: string | null; tipo_negocio?: string | null }
        Update: { cita_id?: string | null; cliente_id?: string; created_at?: string; fecha?: string; foto_antes?: string | null; foto_despues?: string | null; formula?: string | null; id?: string; notas?: string | null; owner_id?: string | null; profesional?: string | null; tipo_negocio?: string | null }
        Relationships: []
      }
      bel_atenciones: {
        Row: { base_comision: number; cita_id: string | null; cliente_id: string | null; comision: number; comision_pct: number; concepto: string; costo_insumos: number; created_at: string; estado: string; fecha: string; id: string; liquidacion_id: string | null; metodo: string; owner_id: string | null; precio: number; profesional: string; registrado_por: string | null; servicio_id: string | null; staff_id: string | null; tipo: string; tipo_negocio: string | null }
        Insert: { base_comision?: number; cita_id?: string | null; cliente_id?: string | null; comision?: number; comision_pct?: number; concepto: string; costo_insumos?: number; created_at?: string; estado?: string; fecha?: string; id?: string; liquidacion_id?: string | null; metodo?: string; owner_id?: string | null; precio: number; profesional: string; registrado_por?: string | null; servicio_id?: string | null; staff_id?: string | null; tipo?: string; tipo_negocio?: string | null }
        Update: { base_comision?: number; cita_id?: string | null; cliente_id?: string | null; comision?: number; comision_pct?: number; concepto?: string; costo_insumos?: number; created_at?: string; estado?: string; fecha?: string; id?: string; liquidacion_id?: string | null; metodo?: string; owner_id?: string | null; precio?: number; profesional?: string; registrado_por?: string | null; servicio_id?: string | null; staff_id?: string | null; tipo?: string; tipo_negocio?: string | null }
        Relationships: []
      }
      bel_consumos: {
        Row: { atencion_id: string; cantidad: number; costo: number; created_at: string; id: string; insumo_id: string; nombre: string; owner_id: string | null; tipo_negocio: string | null }
        Insert: { atencion_id: string; cantidad: number; costo?: number; created_at?: string; id?: string; insumo_id: string; nombre: string; owner_id?: string | null; tipo_negocio?: string | null }
        Update: { atencion_id?: string; cantidad?: number; costo?: number; created_at?: string; id?: string; insumo_id?: string; nombre?: string; owner_id?: string | null; tipo_negocio?: string | null }
        Relationships: []
      }
      bel_liquidaciones: {
        Row: { atenciones: number; created_at: string; hasta: string; id: string; metodo: string; owner_id: string | null; pagada_por: string | null; profesional: string; tipo_negocio: string | null; total_comision: number; total_ventas: number }
        Insert: { atenciones?: number; created_at?: string; hasta: string; id?: string; metodo?: string; owner_id?: string | null; pagada_por?: string | null; profesional: string; tipo_negocio?: string | null; total_comision: number; total_ventas?: number }
        Update: { atenciones?: number; created_at?: string; hasta?: string; id?: string; metodo?: string; owner_id?: string | null; pagada_por?: string | null; profesional?: string; tipo_negocio?: string | null; total_comision?: number; total_ventas?: number }
        Relationships: []
      }
      gim_planes: {
        Row: { activo: boolean; created_at: string; duracion_dias: number; id: string; nombre: string; owner_id: string | null; precio: number; sesiones: number | null; tipo: string; tipo_negocio: string | null }
        Insert: { activo?: boolean; created_at?: string; duracion_dias: number; id?: string; nombre: string; owner_id?: string | null; precio?: number; sesiones?: number | null; tipo?: string; tipo_negocio?: string | null }
        Update: { activo?: boolean; created_at?: string; duracion_dias?: number; id?: string; nombre?: string; owner_id?: string | null; precio?: number; sesiones?: number | null; tipo?: string; tipo_negocio?: string | null }
        Relationships: []
      }
      gim_socios: {
        Row: { activo: boolean; codigo_qr: string; contacto_emergencia: string | null; correo: string | null; created_at: string; documento: string; foto_url: string | null; id: string; nombre: string; owner_id: string | null; telefono: string | null; tipo_negocio: string | null }
        Insert: { activo?: boolean; codigo_qr?: string; contacto_emergencia?: string | null; correo?: string | null; created_at?: string; documento: string; foto_url?: string | null; id?: string; nombre: string; owner_id?: string | null; telefono?: string | null; tipo_negocio?: string | null }
        Update: { activo?: boolean; codigo_qr?: string; contacto_emergencia?: string | null; correo?: string | null; created_at?: string; documento?: string; foto_url?: string | null; id?: string; nombre?: string; owner_id?: string | null; telefono?: string | null; tipo_negocio?: string | null }
        Relationships: []
      }
      gim_membresias: {
        Row: { congelada_desde: string | null; created_at: string; dias_congelados: number; estado: string; id: string; inicio: string; metodo: string; motivo_congelamiento: string | null; owner_id: string | null; plan_id: string; plan_nombre: string; precio: number; registrado_por: string | null; sesiones_restantes: number | null; socio_id: string; tipo_negocio: string | null; vence: string }
        Insert: { congelada_desde?: string | null; created_at?: string; dias_congelados?: number; estado?: string; id?: string; inicio: string; metodo?: string; motivo_congelamiento?: string | null; owner_id?: string | null; plan_id: string; plan_nombre: string; precio?: number; registrado_por?: string | null; sesiones_restantes?: number | null; socio_id: string; tipo_negocio?: string | null; vence: string }
        Update: { congelada_desde?: string | null; created_at?: string; dias_congelados?: number; estado?: string; id?: string; inicio?: string; metodo?: string; motivo_congelamiento?: string | null; owner_id?: string | null; plan_id?: string; plan_nombre?: string; precio?: number; registrado_por?: string | null; sesiones_restantes?: number | null; socio_id?: string; tipo_negocio?: string | null; vence?: string }
        Relationships: []
      }
      gim_accesos: {
        Row: { codigo: string | null; created_at: string; id: string; membresia_id: string | null; owner_id: string | null; resultado: string; socio_id: string | null; tipo_negocio: string | null }
        Insert: { codigo?: string | null; created_at?: string; id?: string; membresia_id?: string | null; owner_id?: string | null; resultado: string; socio_id?: string | null; tipo_negocio?: string | null }
        Update: { codigo?: string | null; created_at?: string; id?: string; membresia_id?: string | null; owner_id?: string | null; resultado?: string; socio_id?: string | null; tipo_negocio?: string | null }
        Relationships: []
      }
      gim_valoraciones: {
        Row: { brazo_cm: number | null; cadera_cm: number | null; cintura_cm: number | null; created_at: string; entrenador: string | null; estatura_cm: number | null; fecha: string; grasa_pct: number | null; id: string; masa_muscular_kg: number | null; muslo_cm: number | null; notas: string | null; owner_id: string | null; pecho_cm: number | null; peso_kg: number | null; registrado_por: string | null; rutina: string | null; socio_id: string; tipo_negocio: string | null }
        Insert: { brazo_cm?: number | null; cadera_cm?: number | null; cintura_cm?: number | null; created_at?: string; entrenador?: string | null; estatura_cm?: number | null; fecha?: string; grasa_pct?: number | null; id?: string; masa_muscular_kg?: number | null; muslo_cm?: number | null; notas?: string | null; owner_id?: string | null; pecho_cm?: number | null; peso_kg?: number | null; registrado_por?: string | null; rutina?: string | null; socio_id: string; tipo_negocio?: string | null }
        Update: { brazo_cm?: number | null; cadera_cm?: number | null; cintura_cm?: number | null; created_at?: string; entrenador?: string | null; estatura_cm?: number | null; fecha?: string; grasa_pct?: number | null; id?: string; masa_muscular_kg?: number | null; muslo_cm?: number | null; notas?: string | null; owner_id?: string | null; pecho_cm?: number | null; peso_kg?: number | null; registrado_por?: string | null; rutina?: string | null; socio_id?: string; tipo_negocio?: string | null }
        Relationships: []
      }
      com_venta_item_lotes: {
        Row: {
          cantidad: number
          created_at: string
          id: string
          lote_id: string
          owner_id: string | null
          producto_id: string
          venta_id: string
        }
        Insert: {
          cantidad: number
          created_at?: string
          id?: string
          lote_id: string
          owner_id?: string | null
          producto_id: string
          venta_id: string
        }
        Update: {
          cantidad?: number
          created_at?: string
          id?: string
          lote_id?: string
          owner_id?: string | null
          producto_id?: string
          venta_id?: string
        }
        Relationships: []
      }
      com_lotes: {
        Row: {
          cantidad_actual: number
          cantidad_inicial: number
          costo_unitario: number
          created_at: string
          id: string
          numero_lote: string
          owner_id: string | null
          producto_id: string
          registrado_por: string | null
          tipo_negocio: string | null
          vence: string | null
        }
        Insert: {
          cantidad_actual: number
          cantidad_inicial: number
          costo_unitario?: number
          created_at?: string
          id?: string
          numero_lote: string
          owner_id?: string | null
          producto_id: string
          registrado_por?: string | null
          tipo_negocio?: string | null
          vence?: string | null
        }
        Update: {
          cantidad_actual?: number
          cantidad_inicial?: number
          costo_unitario?: number
          created_at?: string
          id?: string
          numero_lote?: string
          owner_id?: string | null
          producto_id?: string
          registrado_por?: string | null
          tipo_negocio?: string | null
          vence?: string | null
        }
        Relationships: []
      }
      com_cotizaciones: {
        Row: {
          base: number
          cliente: string
          created_at: string
          descuento: number
          descuento_pct: number
          estado: string
          id: string
          impoconsumo: number
          iva: number
          notas: string | null
          numero: string
          owner_id: string | null
          registrado_por: string | null
          telefono: string | null
          tipo_negocio: string | null
          tipo_precio: string
          total: number
          venta_id: string | null
          vigencia: string | null
        }
        Insert: {
          base?: number
          cliente: string
          created_at?: string
          descuento?: number
          descuento_pct?: number
          estado?: string
          id?: string
          impoconsumo?: number
          iva?: number
          notas?: string | null
          numero: string
          owner_id?: string | null
          registrado_por?: string | null
          telefono?: string | null
          tipo_negocio?: string | null
          tipo_precio?: string
          total?: number
          venta_id?: string | null
          vigencia?: string | null
        }
        Update: {
          base?: number
          cliente?: string
          created_at?: string
          descuento?: number
          descuento_pct?: number
          estado?: string
          id?: string
          impoconsumo?: number
          iva?: number
          notas?: string | null
          numero?: string
          owner_id?: string | null
          registrado_por?: string | null
          telefono?: string | null
          tipo_negocio?: string | null
          tipo_precio?: string
          total?: number
          venta_id?: string | null
          vigencia?: string | null
        }
        Relationships: []
      }
      com_cotizacion_items: {
        Row: {
          base: number
          cantidad: number
          cotizacion_id: string
          created_at: string
          id: string
          impuesto: number
          nombre: string
          owner_id: string | null
          precio_unitario: number
          producto_id: string
          tipo_negocio: string | null
          total: number
          unidad: string
        }
        Insert: {
          base?: number
          cantidad: number
          cotizacion_id: string
          created_at?: string
          id?: string
          impuesto?: number
          nombre: string
          owner_id?: string | null
          precio_unitario?: number
          producto_id: string
          tipo_negocio?: string | null
          total?: number
          unidad: string
        }
        Update: {
          base?: number
          cantidad?: number
          cotizacion_id?: string
          created_at?: string
          id?: string
          impuesto?: number
          nombre?: string
          owner_id?: string | null
          precio_unitario?: number
          producto_id?: string
          tipo_negocio?: string | null
          total?: number
          unidad?: string
        }
        Relationships: []
      }
      com_despostes: {
        Row: {
          costo_kilo_limpio: number
          costo_total: number
          created_at: string
          descripcion: string
          id: string
          merma_kg: number
          merma_valor: number
          notas: string | null
          origen_id: string | null
          owner_id: string | null
          peso_entrada: number
          peso_util: number
          registrado_por: string | null
          rendimiento_pct: number
          tipo_negocio: string | null
        }
        Insert: {
          costo_kilo_limpio?: number
          costo_total: number
          created_at?: string
          descripcion: string
          id?: string
          merma_kg?: number
          merma_valor?: number
          notas?: string | null
          origen_id?: string | null
          owner_id?: string | null
          peso_entrada: number
          peso_util?: number
          registrado_por?: string | null
          rendimiento_pct?: number
          tipo_negocio?: string | null
        }
        Update: {
          costo_kilo_limpio?: number
          costo_total?: number
          created_at?: string
          descripcion?: string
          id?: string
          merma_kg?: number
          merma_valor?: number
          notas?: string | null
          origen_id?: string | null
          owner_id?: string | null
          peso_entrada?: number
          peso_util?: number
          registrado_por?: string | null
          rendimiento_pct?: number
          tipo_negocio?: string | null
        }
        Relationships: []
      }
      com_desposte_items: {
        Row: {
          created_at: string
          desposte_id: string
          id: string
          nombre: string
          owner_id: string | null
          peso_kg: number
          producto_id: string | null
          tipo: string
          tipo_negocio: string | null
          valor: number
        }
        Insert: {
          created_at?: string
          desposte_id: string
          id?: string
          nombre: string
          owner_id?: string | null
          peso_kg: number
          producto_id?: string | null
          tipo: string
          tipo_negocio?: string | null
          valor?: number
        }
        Update: {
          created_at?: string
          desposte_id?: string
          id?: string
          nombre?: string
          owner_id?: string | null
          peso_kg?: number
          producto_id?: string | null
          tipo?: string
          tipo_negocio?: string | null
          valor?: number
        }
        Relationships: []
      }
      pan_turnos: {
        Row: {
          created_at: string
          estado: string
          fecha: string
          hora_fin: string | null
          hora_inicio: string | null
          id: string
          meta_venta: number
          notas: string | null
          owner_id: string | null
          persona: string
          rol: string
          tipo_negocio: string | null
          venta_real: number
        }
        Insert: {
          created_at?: string
          estado?: string
          fecha?: string
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          meta_venta?: number
          notas?: string | null
          owner_id?: string | null
          persona: string
          rol?: string
          tipo_negocio?: string | null
          venta_real?: number
        }
        Update: {
          created_at?: string
          estado?: string
          fecha?: string
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          meta_venta?: number
          notas?: string | null
          owner_id?: string | null
          persona?: string
          rol?: string
          tipo_negocio?: string | null
          venta_real?: number
        }
        Relationships: []
      }
      costos_veh: {
        Row: {
          abonado: number
          adjuntos: Json
          anulado: boolean
          anulado_en: string | null
          anulado_por: string | null
          cantidad: number
          contacto: string | null
          created_at: string
          datos: Json
          detalle: string | null
          estado: string
          fecha: string | null
          historial: Json
          id: string
          minimo: number
          monto: number
          motivo_anulacion: string | null
          owner_id: string | null
          telefono: string | null
          tipo_negocio: string | null
          titulo: string
        }
        Insert: {
          abonado?: number
          adjuntos?: Json
          anulado?: boolean
          anulado_en?: string | null
          anulado_por?: string | null
          cantidad?: number
          contacto?: string | null
          created_at?: string
          datos?: Json
          detalle?: string | null
          estado?: string
          fecha?: string | null
          historial?: Json
          id?: string
          minimo?: number
          monto?: number
          motivo_anulacion?: string | null
          owner_id?: string | null
          telefono?: string | null
          tipo_negocio?: string | null
          titulo: string
        }
        Update: {
          abonado?: number
          adjuntos?: Json
          anulado?: boolean
          anulado_en?: string | null
          anulado_por?: string | null
          cantidad?: number
          contacto?: string | null
          created_at?: string
          datos?: Json
          detalle?: string | null
          estado?: string
          fecha?: string | null
          historial?: Json
          id?: string
          minimo?: number
          monto?: number
          motivo_anulacion?: string | null
          owner_id?: string | null
          telefono?: string | null
          tipo_negocio?: string | null
          titulo?: string
        }
        Relationships: []
      }
      esquemas_rubro: {
        Row: {
          activo: boolean
          alertas: Json
          calculos: Json
          created_at: string
          nombre: string
          tipo_negocio: string
          updated_at: string
          version: number
          vocabulario: Json
        }
        Insert: {
          activo?: boolean
          alertas?: Json
          calculos?: Json
          created_at?: string
          nombre: string
          tipo_negocio: string
          updated_at?: string
          version?: number
          vocabulario?: Json
        }
        Update: {
          activo?: boolean
          alertas?: Json
          calculos?: Json
          created_at?: string
          nombre?: string
          tipo_negocio?: string
          updated_at?: string
          version?: number
          vocabulario?: Json
        }
        Relationships: []
      }
      esquemas_rubro_campos: {
        Row: {
          activo: boolean
          ayuda: string | null
          clave: string
          created_at: string
          etiqueta: string
          id: string
          modulo: string
          obligatorio: boolean
          opciones: Json
          orden: number
          placeholder: string | null
          tipo: string
          tipo_negocio: string
          validacion: Json
        }
        Insert: {
          activo?: boolean
          ayuda?: string | null
          clave: string
          created_at?: string
          etiqueta: string
          id?: string
          modulo: string
          obligatorio?: boolean
          opciones?: Json
          orden?: number
          placeholder?: string | null
          tipo?: string
          tipo_negocio: string
          validacion?: Json
        }
        Update: {
          activo?: boolean
          ayuda?: string | null
          clave?: string
          created_at?: string
          etiqueta?: string
          id?: string
          modulo?: string
          obligatorio?: boolean
          opciones?: Json
          orden?: number
          placeholder?: string | null
          tipo?: string
          tipo_negocio?: string
          validacion?: Json
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
      nomina_empleados: {
        Row: {
          activo: boolean
          anclado_smmlv: boolean
          cargo: string | null
          created_at: string
          documento: string | null
          eps: string | null
          exonerado: boolean
          fecha_ingreso: string | null
          fondo_pension: string | null
          id: string
          nombre: string
          num_smmlv: number
          owner_id: string | null
          salario_base: number
          tarifa_arl: number
          telefono: string | null
          tipo_negocio: string | null
        }
        Insert: {
          activo?: boolean
          anclado_smmlv?: boolean
          cargo?: string | null
          created_at?: string
          documento?: string | null
          eps?: string | null
          exonerado?: boolean
          fecha_ingreso?: string | null
          fondo_pension?: string | null
          id?: string
          nombre: string
          num_smmlv?: number
          owner_id?: string | null
          salario_base?: number
          tarifa_arl?: number
          telefono?: string | null
          tipo_negocio?: string | null
        }
        Update: {
          activo?: boolean
          anclado_smmlv?: boolean
          cargo?: string | null
          created_at?: string
          documento?: string | null
          eps?: string | null
          exonerado?: boolean
          fecha_ingreso?: string | null
          fondo_pension?: string | null
          id?: string
          nombre?: string
          num_smmlv?: number
          owner_id?: string | null
          salario_base?: number
          tarifa_arl?: number
          telefono?: string | null
          tipo_negocio?: string | null
        }
        Relationships: []
      }
      nomina_liquidaciones: {
        Row: {
          aportes: number
          auxilio: number
          costo_total: number
          created_at: string
          descuentos: number
          detalle: Json
          devengado: number
          dias: number
          empleado_id: string | null
          empleado_nombre: string
          estado: string
          extras: number
          id: string
          neto: number
          owner_id: string | null
          periodo_fin: string
          periodo_inicio: string
          provisiones: number
          salario_base: number
          tipo_negocio: string | null
        }
        Insert: {
          aportes?: number
          auxilio?: number
          costo_total?: number
          created_at?: string
          descuentos?: number
          detalle?: Json
          devengado?: number
          dias?: number
          empleado_id?: string | null
          empleado_nombre?: string
          estado?: string
          extras?: number
          id?: string
          neto?: number
          owner_id?: string | null
          periodo_fin: string
          periodo_inicio: string
          provisiones?: number
          salario_base?: number
          tipo_negocio?: string | null
        }
        Update: {
          aportes?: number
          auxilio?: number
          costo_total?: number
          created_at?: string
          descuentos?: number
          detalle?: Json
          devengado?: number
          dias?: number
          empleado_id?: string | null
          empleado_nombre?: string
          estado?: string
          extras?: number
          id?: string
          neto?: number
          owner_id?: string | null
          periodo_fin?: string
          periodo_inicio?: string
          provisiones?: number
          salario_base?: number
          tipo_negocio?: string | null
        }
        Relationships: []
      }
      parametros_nomina_colombia: {
        Row: {
          aux_transporte: number
          caja_compensacion: number
          created_at: string
          exoneracion_tope_smmlv: number
          extra_diurna: number
          extra_nocturna: number
          fuente_legal: string | null
          horas_mes: number
          icbf: number
          id: string
          jornada_semanal: number
          pension_emp: number
          pension_trab: number
          prov_cesantias: number
          prov_intereses: number
          prov_prima: number
          prov_vacaciones: number
          rec_dominical: number
          rec_nocturno: number
          salud_emp: number
          salud_trab: number
          sena: number
          smmlv: number
          tope_aux_smmlv: number
          vigencia_desde: string
          vigencia_hasta: string | null
        }
        Insert: {
          aux_transporte: number
          caja_compensacion?: number
          created_at?: string
          exoneracion_tope_smmlv?: number
          extra_diurna?: number
          extra_nocturna?: number
          fuente_legal?: string | null
          horas_mes?: number
          icbf?: number
          id?: string
          jornada_semanal?: number
          pension_emp?: number
          pension_trab?: number
          prov_cesantias?: number
          prov_intereses?: number
          prov_prima?: number
          prov_vacaciones?: number
          rec_dominical?: number
          rec_nocturno?: number
          salud_emp?: number
          salud_trab?: number
          sena?: number
          smmlv: number
          tope_aux_smmlv?: number
          vigencia_desde: string
          vigencia_hasta?: string | null
        }
        Update: {
          aux_transporte?: number
          caja_compensacion?: number
          created_at?: string
          exoneracion_tope_smmlv?: number
          extra_diurna?: number
          extra_nocturna?: number
          fuente_legal?: string | null
          horas_mes?: number
          icbf?: number
          id?: string
          jornada_semanal?: number
          pension_emp?: number
          pension_trab?: number
          prov_cesantias?: number
          prov_intereses?: number
          prov_prima?: number
          prov_vacaciones?: number
          rec_dominical?: number
          rec_nocturno?: number
          salud_emp?: number
          salud_trab?: number
          sena?: number
          smmlv?: number
          tope_aux_smmlv?: number
          vigencia_desde?: string
          vigencia_hasta?: string | null
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
      liquidaciones_repartidores: {
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
      metas_registros: {
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
      suscripciones_registros: {
        Row: {
          anulado: boolean
          contacto: string | null
          created_at: string
          detalle: string | null
          estado: string
          id: string
          monto: number
          owner_id: string | null
          tipo_negocio: string | null
          titulo: string
        }
        Insert: {
          anulado?: boolean
          contacto?: string | null
          created_at?: string
          detalle?: string | null
          estado?: string
          id?: string
          monto?: number
          owner_id?: string | null
          tipo_negocio?: string | null
          titulo: string
        }
        Update: {
          anulado?: boolean
          contacto?: string | null
          created_at?: string
          detalle?: string | null
          estado?: string
          id?: string
          monto?: number
          owner_id?: string | null
          tipo_negocio?: string | null
          titulo?: string
        }
        Relationships: []
      }
      combos_registros: {
        Row: {
          anulado: boolean
          contacto: string | null
          created_at: string
          detalle: string | null
          estado: string
          id: string
          monto: number
          owner_id: string | null
          tipo_negocio: string | null
          titulo: string
        }
        Insert: {
          anulado?: boolean
          contacto?: string | null
          created_at?: string
          detalle?: string | null
          estado?: string
          id?: string
          monto?: number
          owner_id?: string | null
          tipo_negocio?: string | null
          titulo: string
        }
        Update: {
          anulado?: boolean
          contacto?: string | null
          created_at?: string
          detalle?: string | null
          estado?: string
          id?: string
          monto?: number
          owner_id?: string | null
          tipo_negocio?: string | null
          titulo?: string
        }
        Relationships: []
      }
      fidelizacion_registros: {
        Row: {
          anulado: boolean
          contacto: string | null
          created_at: string
          detalle: string | null
          estado: string
          id: string
          monto: number
          owner_id: string | null
          tipo_negocio: string | null
          titulo: string
        }
        Insert: {
          anulado?: boolean
          contacto?: string | null
          created_at?: string
          detalle?: string | null
          estado?: string
          id?: string
          monto?: number
          owner_id?: string | null
          tipo_negocio?: string | null
          titulo: string
        }
        Update: {
          anulado?: boolean
          contacto?: string | null
          created_at?: string
          detalle?: string | null
          estado?: string
          id?: string
          monto?: number
          owner_id?: string | null
          tipo_negocio?: string | null
          titulo?: string
        }
        Relationships: []
      }
      pagos_digitales_registros: {
        Row: {
          anulado: boolean
          contacto: string | null
          created_at: string
          detalle: string | null
          estado: string
          id: string
          monto: number
          owner_id: string | null
          tipo_negocio: string | null
          titulo: string
        }
        Insert: {
          anulado?: boolean
          contacto?: string | null
          created_at?: string
          detalle?: string | null
          estado?: string
          id?: string
          monto?: number
          owner_id?: string | null
          tipo_negocio?: string | null
          titulo: string
        }
        Update: {
          anulado?: boolean
          contacto?: string | null
          created_at?: string
          detalle?: string | null
          estado?: string
          id?: string
          monto?: number
          owner_id?: string | null
          tipo_negocio?: string | null
          titulo?: string
        }
        Relationships: []
      }
      proveedores_registros: {
        Row: {
          abonado: number
          anulado: boolean
          contacto: string | null
          created_at: string
          datos: Json
          detalle: string | null
          estado: string
          historial: Json
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
          datos?: Json
          detalle?: string | null
          estado?: string
          historial?: Json
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
          datos?: Json
          detalle?: string | null
          estado?: string
          historial?: Json
          id?: string
          monto?: number
          owner_id?: string | null
          telefono?: string | null
          tipo_negocio?: string | null
          titulo?: string
        }
        Relationships: []
      }
      ventas_veh_registros: {
        Row: {
          anulado: boolean
          contacto: string | null
          created_at: string
          detalle: string | null
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
          contacto?: string | null
          created_at?: string
          detalle?: string | null
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
          contacto?: string | null
          created_at?: string
          detalle?: string | null
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
      comisiones_registros: {
        Row: {
          anulado: boolean
          contacto: string | null
          created_at: string
          detalle: string | null
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
          contacto?: string | null
          created_at?: string
          detalle?: string | null
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
          contacto?: string | null
          created_at?: string
          detalle?: string | null
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
      alistamiento_registros: {
        Row: {
          anulado: boolean
          contacto: string | null
          created_at: string
          detalle: string | null
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
          contacto?: string | null
          created_at?: string
          detalle?: string | null
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
          contacto?: string | null
          created_at?: string
          detalle?: string | null
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
      cartera_veh_registros: {
        Row: {
          abonado: number
          anulado: boolean
          contacto: string | null
          created_at: string
          detalle: string | null
          estado: string
          fecha: string | null
          id: string
          monto: number
          owner_id: string | null
          tipo_negocio: string | null
          titulo: string
        }
        Insert: {
          abonado?: number
          anulado?: boolean
          contacto?: string | null
          created_at?: string
          detalle?: string | null
          estado?: string
          fecha?: string | null
          id?: string
          monto?: number
          owner_id?: string | null
          tipo_negocio?: string | null
          titulo: string
        }
        Update: {
          abonado?: number
          anulado?: boolean
          contacto?: string | null
          created_at?: string
          detalle?: string | null
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
      vehiculos_usados_registros: {
        Row: {
          anulado: boolean
          contacto: string | null
          created_at: string
          detalle: string | null
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
          contacto?: string | null
          created_at?: string
          detalle?: string | null
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
          contacto?: string | null
          created_at?: string
          detalle?: string | null
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
      facturas_registros: {
        Row: {
          abonado: number
          anulado: boolean
          cantidad: number
          contacto: string | null
          created_at: string
          datos: Json
          detalle: string | null
          estado: string
          fecha: string | null
          historial: Json
          id: string
          minimo: number
          modulo: string
          monto: number
          motivo_anulacion: string | null
          owner_id: string | null
          telefono: string | null
          tipo_negocio: string | null
          titulo: string
        }
        Insert: {
          abonado?: number
          anulado?: boolean
          cantidad?: number
          contacto?: string | null
          created_at?: string
          datos?: Json
          detalle?: string | null
          estado?: string
          fecha?: string | null
          historial?: Json
          id?: string
          minimo?: number
          modulo?: string
          monto?: number
          motivo_anulacion?: string | null
          owner_id?: string | null
          telefono?: string | null
          tipo_negocio?: string | null
          titulo: string
        }
        Update: {
          abonado?: number
          anulado?: boolean
          cantidad?: number
          contacto?: string | null
          created_at?: string
          datos?: Json
          detalle?: string | null
          estado?: string
          fecha?: string | null
          historial?: Json
          id?: string
          minimo?: number
          modulo?: string
          monto?: number
          motivo_anulacion?: string | null
          owner_id?: string | null
          telefono?: string | null
          tipo_negocio?: string | null
          titulo?: string
        }
        Relationships: []
      }
      permisos_rest_registros: {
        Row: {
          abonado: number
          anulado: boolean
          cantidad: number
          contacto: string | null
          created_at: string
          datos: Json
          detalle: string | null
          estado: string
          fecha: string | null
          historial: Json
          id: string
          minimo: number
          modulo: string
          monto: number
          motivo_anulacion: string | null
          owner_id: string | null
          telefono: string | null
          tipo_negocio: string | null
          titulo: string
        }
        Insert: {
          abonado?: number
          anulado?: boolean
          cantidad?: number
          contacto?: string | null
          created_at?: string
          datos?: Json
          detalle?: string | null
          estado?: string
          fecha?: string | null
          historial?: Json
          id?: string
          minimo?: number
          modulo?: string
          monto?: number
          motivo_anulacion?: string | null
          owner_id?: string | null
          telefono?: string | null
          tipo_negocio?: string | null
          titulo: string
        }
        Update: {
          abonado?: number
          anulado?: boolean
          cantidad?: number
          contacto?: string | null
          created_at?: string
          datos?: Json
          detalle?: string | null
          estado?: string
          fecha?: string | null
          historial?: Json
          id?: string
          minimo?: number
          modulo?: string
          monto?: number
          motivo_anulacion?: string | null
          owner_id?: string | null
          telefono?: string | null
          tipo_negocio?: string | null
          titulo?: string
        }
        Relationships: []
      }
      resenas_registros: {
        Row: {
          anulado: boolean
          contacto: string | null
          created_at: string
          detalle: string | null
          estado: string
          id: string
          owner_id: string | null
          tipo_negocio: string | null
          titulo: string
        }
        Insert: {
          anulado?: boolean
          contacto?: string | null
          created_at?: string
          detalle?: string | null
          estado?: string
          id?: string
          owner_id?: string | null
          tipo_negocio?: string | null
          titulo: string
        }
        Update: {
          anulado?: boolean
          contacto?: string | null
          created_at?: string
          detalle?: string | null
          estado?: string
          id?: string
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
      agente_conocimiento: {
        Row: {
          created_at: string
          estado: string
          fuente: string | null
          id: string
          negocio_id: string
          origen: string
          owner_id: string
          pregunta: string
          respuesta: string
          tipo: string
          verificado_en: string
          veces: number
        }
        Insert: {
          created_at?: string
          estado?: string
          fuente?: string | null
          id?: string
          negocio_id: string
          origen?: string
          owner_id: string
          pregunta?: string
          respuesta: string
          tipo?: string
          verificado_en?: string
          veces?: number
        }
        Update: {
          created_at?: string
          estado?: string
          fuente?: string | null
          id?: string
          negocio_id?: string
          origen?: string
          owner_id?: string
          pregunta?: string
          respuesta?: string
          tipo?: string
          verificado_en?: string
          veces?: number
        }
        Relationships: []
      }
      normativa_colombia_vigente: {
        Row: {
          area: string
          clave: string
          created_at: string
          fuente: string | null
          id: string
          origen: string
          resumen: string
          titulo: string
          valor: string | null
          verificado_en: string
          vigencia_desde: string | null
        }
        Insert: {
          area: string
          clave: string
          created_at?: string
          fuente?: string | null
          id?: string
          origen?: string
          resumen?: string
          titulo: string
          valor?: string | null
          verificado_en?: string
          vigencia_desde?: string | null
        }
        Update: {
          area?: string
          clave?: string
          created_at?: string
          fuente?: string | null
          id?: string
          origen?: string
          resumen?: string
          titulo?: string
          valor?: string | null
          verificado_en?: string
          vigencia_desde?: string | null
        }
        Relationships: []
      }
      agente_whatsapp: {
        Row: {
          activo: boolean
          clave: string
          created_at: string
          ia_activa: boolean
          id: string
          instrucciones: string | null
          negocio_id: string
          nombre_agente: string
          owner_id: string
          personalidad: string
          objetivo_cierre: string
          cierre_autonomo: boolean
        }
        Insert: {
          activo?: boolean
          clave?: string
          created_at?: string
          ia_activa?: boolean
          id?: string
          instrucciones?: string | null
          negocio_id: string
          nombre_agente?: string
          owner_id: string
          personalidad?: string
          objetivo_cierre?: string
          cierre_autonomo?: boolean
        }
        Update: {
          activo?: boolean
          clave?: string
          created_at?: string
          ia_activa?: boolean
          id?: string
          instrucciones?: string | null
          negocio_id?: string
          nombre_agente?: string
          owner_id?: string
          personalidad?: string
          objetivo_cierre?: string
          cierre_autonomo?: boolean
        }
        Relationships: []
      }
      integraciones_negocio: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          owner_id: string
          proveedor: string
          token: string | null
          updated_at: string
          url_api: string | null
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          owner_id?: string
          proveedor: string
          token?: string | null
          updated_at?: string
          url_api?: string | null
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          owner_id?: string
          proveedor?: string
          token?: string | null
          updated_at?: string
          url_api?: string | null
        }
        Relationships: []
      }
      secop_perfiles: {
        Row: {
          activo: boolean
          codigos_unspsc: string[]
          created_at: string
          cuantia_minima: number
          departamentos: string[]
          id: string
          notificar_whatsapp: boolean
          owner_id: string
          palabras_clave: string[]
          ultima_consulta: string | null
        }
        Insert: {
          activo?: boolean
          codigos_unspsc?: string[]
          created_at?: string
          cuantia_minima?: number
          departamentos?: string[]
          id?: string
          notificar_whatsapp?: boolean
          owner_id?: string
          palabras_clave?: string[]
          ultima_consulta?: string | null
        }
        Update: {
          activo?: boolean
          codigos_unspsc?: string[]
          created_at?: string
          cuantia_minima?: number
          departamentos?: string[]
          id?: string
          notificar_whatsapp?: boolean
          owner_id?: string
          palabras_clave?: string[]
          ultima_consulta?: string | null
        }
        Relationships: []
      }
      secop_oportunidades: {
        Row: {
          checklist_ia: Json | null
          created_at: string
          cuantia: number
          departamento: string | null
          entidad: string | null
          estado_interno: string
          fecha_cierre: string | null
          fecha_publicacion: string | null
          id: string
          modalidad: string | null
          objeto: string | null
          owner_id: string
          proceso_id: string
          referencia: string | null
          url_proceso: string | null
        }
        Insert: {
          checklist_ia?: Json | null
          created_at?: string
          cuantia?: number
          departamento?: string | null
          entidad?: string | null
          estado_interno?: string
          fecha_cierre?: string | null
          fecha_publicacion?: string | null
          id?: string
          modalidad?: string | null
          objeto?: string | null
          owner_id?: string
          proceso_id: string
          referencia?: string | null
          url_proceso?: string | null
        }
        Update: {
          checklist_ia?: Json | null
          created_at?: string
          cuantia?: number
          departamento?: string | null
          entidad?: string | null
          estado_interno?: string
          fecha_cierre?: string | null
          fecha_publicacion?: string | null
          id?: string
          modalidad?: string | null
          objeto?: string | null
          owner_id?: string
          proceso_id?: string
          referencia?: string | null
          url_proceso?: string | null
        }
        Relationships: []
      }
      crm_leads: {
        Row: {
          atendido_por_humano: boolean
          canal_origen: string
          capacidad_pago: string | null
          created_at: string
          datos_extra: Json
          etapa_embudo: string
          fecha_llegada: string
          id: string
          interes: string | null
          negocio_id: string
          nombre: string | null
          numero_turno: number
          owner_id: string
          puntaje: number | null
          telefono: string
          temperatura: string | null
          ultima_interaccion: string
          urgencia: string | null
          valor_estimado: number
        }
        Insert: {
          atendido_por_humano?: boolean
          canal_origen?: string
          capacidad_pago?: string | null
          created_at?: string
          datos_extra?: Json
          etapa_embudo?: string
          fecha_llegada?: string
          id?: string
          interes?: string | null
          negocio_id: string
          nombre?: string | null
          numero_turno?: number
          owner_id: string
          puntaje?: number | null
          telefono?: string
          temperatura?: string | null
          ultima_interaccion?: string
          urgencia?: string | null
          valor_estimado?: number
        }
        Update: {
          atendido_por_humano?: boolean
          canal_origen?: string
          capacidad_pago?: string | null
          created_at?: string
          datos_extra?: Json
          etapa_embudo?: string
          fecha_llegada?: string
          id?: string
          interes?: string | null
          negocio_id?: string
          nombre?: string | null
          numero_turno?: number
          owner_id?: string
          puntaje?: number | null
          telefono?: string
          temperatura?: string | null
          ultima_interaccion?: string
          urgencia?: string | null
          valor_estimado?: number
        }
        Relationships: []
      }
      crm_pqrs: {
        Row: {
          created_at: string
          estado: string
          id: string
          lead_id: string | null
          negocio_id: string
          owner_id: string
          resumen: string | null
          telefono: string
          tipo: string
          urgencia: string
        }
        Insert: {
          created_at?: string
          estado?: string
          id?: string
          lead_id?: string | null
          negocio_id: string
          owner_id: string
          resumen?: string | null
          telefono?: string
          tipo?: string
          urgencia?: string
        }
        Update: {
          created_at?: string
          estado?: string
          id?: string
          lead_id?: string | null
          negocio_id?: string
          owner_id?: string
          resumen?: string | null
          telefono?: string
          tipo?: string
          urgencia?: string
        }
        Relationships: []
      }
      crm_mensajes: {
        Row: {
          contenido: string
          created_at: string
          id: string
          lead_id: string | null
          negocio_id: string
          owner_id: string
          rol: string
          telefono: string
        }
        Insert: {
          contenido?: string
          created_at?: string
          id?: string
          lead_id?: string | null
          negocio_id: string
          owner_id: string
          rol?: string
          telefono?: string
        }
        Update: {
          contenido?: string
          created_at?: string
          id?: string
          lead_id?: string | null
          negocio_id?: string
          owner_id?: string
          rol?: string
          telefono?: string
        }
        Relationships: []
      }
      agente_leads: {
        Row: {
          atendido_por_humano: boolean
          canal_origen: string
          created_at: string
          datos_confirmados: string | null
          fecha_llegada: string
          id: string
          interes: string | null
          negocio_id: string
          nombre: string | null
          numero_turno: number
          owner_id: string
          puntaje: number | null
          telefono: string
          temperatura: string | null
          updated_at: string
        }
        Insert: {
          atendido_por_humano?: boolean
          canal_origen?: string
          created_at?: string
          datos_confirmados?: string | null
          fecha_llegada?: string
          id?: string
          interes?: string | null
          negocio_id: string
          nombre?: string | null
          numero_turno?: number
          owner_id: string
          puntaje?: number | null
          telefono: string
          temperatura?: string | null
          updated_at?: string
        }
        Update: {
          atendido_por_humano?: boolean
          canal_origen?: string
          created_at?: string
          datos_confirmados?: string | null
          fecha_llegada?: string
          id?: string
          interes?: string | null
          negocio_id?: string
          nombre?: string | null
          numero_turno?: number
          owner_id?: string
          puntaje?: number | null
          telefono?: string
          temperatura?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_avisos: {
        Row: {
          chat_id: string | null
          created_at: string
          detalle: string | null
          id: string
          leido: boolean
          negocio_id: string
          owner_id: string
          tipo: string
          titulo: string
        }
        Insert: {
          chat_id?: string | null
          created_at?: string
          detalle?: string | null
          id?: string
          leido?: boolean
          negocio_id: string
          owner_id: string
          tipo?: string
          titulo: string
        }
        Update: {
          chat_id?: string | null
          created_at?: string
          detalle?: string | null
          id?: string
          leido?: boolean
          negocio_id?: string
          owner_id?: string
          tipo?: string
          titulo?: string
        }
        Relationships: []
      }
      whatsapp_conocimiento_negocio: {
        Row: {
          created_at: string
          frecuencia: number
          id: string
          negocio_id: string
          owner_id: string
          pregunta_patron: string
          respuesta_aprendida: string
        }
        Insert: {
          created_at?: string
          frecuencia?: number
          id?: string
          negocio_id: string
          owner_id: string
          pregunta_patron: string
          respuesta_aprendida: string
        }
        Update: {
          created_at?: string
          frecuencia?: number
          id?: string
          negocio_id?: string
          owner_id?: string
          pregunta_patron?: string
          respuesta_aprendida?: string
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
          razon_social: string | null
          tipo_documento: string
          nit: string | null
          digito_verificacion: string | null
          direccion_fiscal: string | null
          regimen_tributario: string
          responsabilidad_fiscal: string
          resolucion_facturacion: string | null
          rango_desde: number
          rango_hasta: number
          resolucion_vence: string | null
          iva_defecto: number
          dian_activa: boolean
          contador_nombre: string | null
          contador_telefono: string | null
          contador_correo: string | null
          ica_municipio: string | null
          ica_ciuu: string | null
          pie_factura: string | null
          crm_activo: boolean
          secop_activo: boolean
          permitir_inventario_negativo: boolean
          prefijo_facturacion: string | null
          dian_software_id: string | null
          dian_pin: string | null
          dian_certificado_nombre: string | null
          dian_certificado_vence: string | null
          dian_ambiente: string
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
          razon_social?: string | null
          tipo_documento?: string
          nit?: string | null
          digito_verificacion?: string | null
          direccion_fiscal?: string | null
          regimen_tributario?: string
          responsabilidad_fiscal?: string
          resolucion_facturacion?: string | null
          rango_desde?: number
          rango_hasta?: number
          resolucion_vence?: string | null
          iva_defecto?: number
          dian_activa?: boolean
          contador_nombre?: string | null
          contador_telefono?: string | null
          contador_correo?: string | null
          ica_municipio?: string | null
          ica_ciuu?: string | null
          pie_factura?: string | null
          crm_activo?: boolean
          secop_activo?: boolean
          permitir_inventario_negativo?: boolean
          prefijo_facturacion?: string | null
          dian_software_id?: string | null
          dian_pin?: string | null
          dian_certificado_nombre?: string | null
          dian_certificado_vence?: string | null
          dian_ambiente?: string
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
          razon_social?: string | null
          tipo_documento?: string
          nit?: string | null
          digito_verificacion?: string | null
          direccion_fiscal?: string | null
          regimen_tributario?: string
          responsabilidad_fiscal?: string
          resolucion_facturacion?: string | null
          rango_desde?: number
          rango_hasta?: number
          resolucion_vence?: string | null
          iva_defecto?: number
          dian_activa?: boolean
          contador_nombre?: string | null
          contador_telefono?: string | null
          contador_correo?: string | null
          ica_municipio?: string | null
          ica_ciuu?: string | null
          pie_factura?: string | null
          crm_activo?: boolean
          secop_activo?: boolean
          permitir_inventario_negativo?: boolean
          prefijo_facturacion?: string | null
          dian_software_id?: string | null
          dian_pin?: string | null
          dian_certificado_nombre?: string | null
          dian_certificado_vence?: string | null
          dian_ambiente?: string
        }
        Relationships: []
      }
      negocio_dian_config: {
        Row: {
          activa: boolean
          ambiente: string
          certificado_nombre: string | null
          certificado_vence: string | null
          created_at: string
          id: string
          owner_id: string | null
          pin: string | null
          prefijo: string | null
          proveedor_url: string | null
          rango_desde: number | null
          rango_hasta: number | null
          resolucion: string | null
          software_id: string | null
          token_api: string | null
          updated_at: string
        }
        Insert: {
          activa?: boolean
          ambiente?: string
          certificado_nombre?: string | null
          certificado_vence?: string | null
          created_at?: string
          id?: string
          owner_id?: string | null
          pin?: string | null
          prefijo?: string | null
          proveedor_url?: string | null
          rango_desde?: number | null
          rango_hasta?: number | null
          resolucion?: string | null
          software_id?: string | null
          token_api?: string | null
          updated_at?: string
        }
        Update: {
          activa?: boolean
          ambiente?: string
          certificado_nombre?: string | null
          certificado_vence?: string | null
          created_at?: string
          id?: string
          owner_id?: string | null
          pin?: string | null
          prefijo?: string | null
          proveedor_url?: string | null
          rango_desde?: number | null
          rango_hasta?: number | null
          resolucion?: string | null
          software_id?: string | null
          token_api?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      calendario_tributario_oficial: {
        Row: {
          anio: number
          created_at: string
          fecha_vencimiento: string
          id: string
          impuesto: string
          municipio: string | null
          periodicidad: string
          periodo: string
          ultimo_digito: string | null
        }
        Insert: {
          anio: number
          created_at?: string
          fecha_vencimiento: string
          id?: string
          impuesto: string
          municipio?: string | null
          periodicidad?: string
          periodo?: string
          ultimo_digito?: string | null
        }
        Update: {
          anio?: number
          created_at?: string
          fecha_vencimiento?: string
          id?: string
          impuesto?: string
          municipio?: string | null
          periodicidad?: string
          periodo?: string
          ultimo_digito?: string | null
        }
        Relationships: []
      }
      obligaciones_tributarias_negocio: {
        Row: {
          acuse_url: string | null
          anio: number
          created_at: string
          estado: string
          fecha_vencimiento: string
          id: string
          impuesto: string
          notas: string | null
          owner_id: string | null
          periodo: string
          soporte_url: string | null
        }
        Insert: {
          acuse_url?: string | null
          anio: number
          created_at?: string
          estado?: string
          fecha_vencimiento: string
          id?: string
          impuesto: string
          notas?: string | null
          owner_id?: string | null
          periodo?: string
          soporte_url?: string | null
        }
        Update: {
          acuse_url?: string | null
          anio?: number
          created_at?: string
          estado?: string
          fecha_vencimiento?: string
          id?: string
          impuesto?: string
          notas?: string | null
          owner_id?: string | null
          periodo?: string
          soporte_url?: string | null
        }
        Relationships: []
      }
      novedades_normativas: {
        Row: {
          aplicada: boolean
          created_at: string
          fuente: string
          id: string
          resumen: string
          titulo: string
          vigencia_desde: string | null
        }
        Insert: {
          aplicada?: boolean
          created_at?: string
          fuente?: string
          id?: string
          resumen?: string
          titulo: string
          vigencia_desde?: string | null
        }
        Update: {
          aplicada?: boolean
          created_at?: string
          fuente?: string
          id?: string
          resumen?: string
          titulo?: string
          vigencia_desde?: string | null
        }
        Relationships: []
      }
      ica_tarifas: {
        Row: {
          actividad: string
          ciuu: string
          created_at: string
          id: string
          municipio: string
          owner_id: string | null
          tarifa_por_mil: number
        }
        Insert: {
          actividad?: string
          ciuu?: string
          created_at?: string
          id?: string
          municipio?: string
          owner_id?: string | null
          tarifa_por_mil?: number
        }
        Update: {
          actividad?: string
          ciuu?: string
          created_at?: string
          id?: string
          municipio?: string
          owner_id?: string | null
          tarifa_por_mil?: number
        }
        Relationships: []
      }
      negocio_sucursales: {
        Row: {
          activa: boolean
          created_at: string
          direccion: string | null
          id: string
          nombre: string
          owner_id: string | null
          telefono: string | null
        }
        Insert: {
          activa?: boolean
          created_at?: string
          direccion?: string | null
          id?: string
          nombre: string
          owner_id?: string | null
          telefono?: string | null
        }
        Update: {
          activa?: boolean
          created_at?: string
          direccion?: string | null
          id?: string
          nombre?: string
          owner_id?: string | null
          telefono?: string | null
        }
        Relationships: []
      }
      negocio_traslados: {
        Row: {
          acta_codigo: string
          cantidad: number
          created_at: string
          desde_sede: string
          estado: string
          hasta_sede: string
          id: string
          notas: string | null
          owner_id: string | null
          producto_id: string | null
          producto_nombre: string
        }
        Insert: {
          acta_codigo?: string
          cantidad: number
          created_at?: string
          desde_sede?: string
          estado?: string
          hasta_sede: string
          id?: string
          notas?: string | null
          owner_id?: string | null
          producto_id?: string | null
          producto_nombre: string
        }
        Update: {
          acta_codigo?: string
          cantidad?: number
          created_at?: string
          desde_sede?: string
          estado?: string
          hasta_sede?: string
          id?: string
          notas?: string | null
          owner_id?: string | null
          producto_id?: string | null
          producto_nombre?: string
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
          documento: string | null
          digito_verificacion: string | null
          correo: string | null
          total_gastado: number
          total_pedidos: number
          ultimo_pedido: string | null
          owner_id: string | null
        }
        Insert: {
          owner_id?: string | null
          created_at?: string
          direccion?: string | null
          id?: string
          nombre: string
          notas?: string | null
          telefono: string
          documento?: string | null
          digito_verificacion?: string | null
          correo?: string | null
          total_gastado?: number
          total_pedidos?: number
          ultimo_pedido?: string | null
        }
        Update: {
          owner_id?: string | null
          created_at?: string
          direccion?: string | null
          id?: string
          nombre?: string
          notas?: string | null
          telefono?: string
          documento?: string | null
          digito_verificacion?: string | null
          correo?: string | null
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
          anulado: boolean
          anulado_en: string | null
          anulado_por: string | null
          motivo_anulacion: string | null
          concepto: string
          created_at: string
          id: string
          monto: number
          tipo: string
        }
        Insert: {
          anulado?: boolean
          anulado_en?: string | null
          anulado_por?: string | null
          motivo_anulacion?: string | null
          concepto: string
          created_at?: string
          id?: string
          monto?: number
          tipo: string
        }
        Update: {
          anulado?: boolean
          anulado_en?: string | null
          anulado_por?: string | null
          motivo_anulacion?: string | null
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
          codigo_barras: string | null
          created_at: string
          descripcion: string | null
          destacado: boolean
          id: string
          imagen_url: string | null
          nombre: string
          owner_id: string | null
          precio: number
          stock_actual: number | null
          tipo_negocio: string | null
        }
        Insert: {
          activo?: boolean
          categoria_id?: string | null
          codigo_barras?: string | null
          created_at?: string
          descripcion?: string | null
          destacado?: boolean
          id?: string
          imagen_url?: string | null
          nombre: string
          owner_id?: string | null
          precio?: number
          stock_actual?: number | null
          tipo_negocio?: string | null
        }
        Update: {
          activo?: boolean
          categoria_id?: string | null
          codigo_barras?: string | null
          created_at?: string
          descripcion?: string | null
          destacado?: boolean
          id?: string
          imagen_url?: string | null
          nombre?: string
          owner_id?: string | null
          precio?: number
          stock_actual?: number | null
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
      restaurante_productos_kardex: {
        Row: {
          created_at: string
          delta: number
          id: string
          motivo: string | null
          owner_id: string | null
          pedido_id: string | null
          producto_id: string
          stock_resultante: number
          tipo: string
        }
        Insert: {
          created_at?: string
          delta: number
          id?: string
          motivo?: string | null
          owner_id?: string | null
          pedido_id?: string | null
          producto_id: string
          stock_resultante?: number
          tipo?: string
        }
        Update: {
          created_at?: string
          delta?: number
          id?: string
          motivo?: string | null
          owner_id?: string | null
          pedido_id?: string | null
          producto_id?: string
          stock_resultante?: number
          tipo?: string
        }
        Relationships: []
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
          sucursal_id: string | null
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
          sucursal_id?: string | null
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
          sucursal_id?: string | null
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
          dias: number | null
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
          dias?: number | null
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
          dias?: number | null
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
      meta_guardar_config: { Args: { p_phone_number_id: string; p_access_token: string; p_verify_token: string; p_app_secret: string; p_activo: boolean }; Returns: Json }
      meta_estado_config: { Args: never; Returns: Json }
      registro_es_del_negocio: { Args: { p_tabla: string; p_id: string; p_owner: string }; Returns: boolean }
      tal_agregar_repuesto: { Args: { p_orden: string; p_repuesto: string; p_cantidad: number }; Returns: Json }
      tal_cobrar_orden: { Args: { p_orden: string; p_metodo: string }; Returns: Json }
      srv_cobrar_cita: { Args: { p_cita: string; p_metodo: string }; Returns: Json }
      srv_liquidar: { Args: { p_profesional: string; p_metodo: string }; Returns: number }
      cond_generar_cuotas: { Args: { p_periodo: string; p_vence: string }; Returns: Json }
      cond_cobrar_cuota: { Args: { p_cuota: string; p_metodo: string; p_tasa: number }; Returns: Json }
      pre_crear: { Args: { p_cliente: string; p_telefono: string; p_documento: string; p_cobrador: string; p_monto: number; p_tasa: number; p_frecuencia: string; p_plazo: number; p_inicio: string; p_metodo: string; p_notas: string }; Returns: Json }
      pre_abonar: { Args: { p_cuota: string; p_monto: number; p_metodo: string }; Returns: Json }
      pre_cerrar_dia: { Args: { p_cobrador: string; p_fecha: string; p_entregado: number }; Returns: Json }
      pre_fijar_mora: { Args: { p_credito: string; p_tasa: number }; Returns: undefined }
      alq_abrir: { Args: { p_vehiculo: string; p_cliente: string; p_documento: string; p_telefono: string; p_modalidad: string; p_cantidad: number; p_tarifa: number; p_deposito: number; p_km_salida: number; p_combustible: number; p_metodo: string; p_notas: string }; Returns: Json }
      alq_cerrar: { Args: { p_contrato: string; p_km_entrega: number; p_combustible: number; p_dano: number; p_metodo: string }; Returns: Json }
      alq_cobrar_multa: { Args: { p_multa: string; p_metodo: string }; Returns: number }
      seg_facturar_mes: { Args: { p_periodo: string; p_vence: string }; Returns: Json }
      seg_cobrar_factura: { Args: { p_factura: string; p_metodo: string }; Returns: number }
      seg_entregar: { Args: { p_insumo: string; p_empleado: string; p_puesto: string; p_cantidad: number; p_proxima: string | null }; Returns: number }
      gan_pesar: { Args: { p_animal: string; p_peso: number; p_fecha: string }; Returns: Json }
      gan_consumir: { Args: { p_insumo: string; p_lote: string; p_cantidad: number }; Returns: number }
      gan_vender: { Args: { p_animales: string[]; p_modalidad: string; p_precio: number; p_comprador: string; p_metodo: string }; Returns: Json }
      fun_donar: { Args: { p_donante: string; p_tipo: string; p_descripcion: string; p_valor: number; p_proyecto: string | null; p_metodo: string }; Returns: Json }
      fun_gastar: { Args: { p_proyecto: string; p_concepto: string; p_valor: number; p_metodo: string }; Returns: Json }
      igl_ingresar: { Args: { p_miembro: string | null; p_nombre: string; p_concepto: string; p_fondo: string; p_valor: number; p_metodo: string; p_culto: string; p_fecha: string; p_evento: string }; Returns: Json }
      igl_egresar: { Args: { p_fondo: string; p_concepto: string; p_obra_social: boolean; p_valor: number; p_metodo: string; p_culto: string; p_fecha: string; p_evento: string }; Returns: Json }
      igl_cerrar: { Args: { p_culto: string; p_desde: string; p_hasta: string }; Returns: Json }
      parq_cobrar_abono: { Args: { p_abonado: string; p_metodo: string }; Returns: Json }
      cv_crear_contrato: { Args: { p_articulo: string; p_descripcion: string; p_cliente: string; p_documento: string; p_telefono: string; p_avaluo: number; p_prestado: number; p_plazo_dias: number; p_retroventa_pct: number; p_fotos: string[]; p_metodo: string }; Returns: Json }
      cv_prorrogar: { Args: { p_contrato: string; p_metodo: string }; Returns: Json }
      cv_rescatar: { Args: { p_contrato: string; p_metodo: string }; Returns: Json }
      cv_procesar_vencidos: { Args: { p_gracia: number; p_margen: number }; Returns: number }
      cv_comprar: { Args: { p_nombre: string; p_descripcion: string; p_vendedor: string; p_documento: string; p_telefono: string; p_costo: number; p_precio_venta: number; p_fotos: string[]; p_metodo: string }; Returns: Json }
      cv_vender: { Args: { p_articulo: string; p_precio: number; p_metodo: string }; Returns: Json }
      dis_ingresar_stock: { Args: { p_producto: string; p_cantidad: number; p_costo_unidad: number; p_metodo: string }; Returns: undefined }
      dis_crear_pedido: { Args: { p_cliente: string; p_ruta: string | null; p_entrega: string | null; p_condicion: string; p_items: Json }; Returns: Json }
      dis_despachar: { Args: { p_pedido: string; p_metodo: string }; Returns: Json }
      dis_cancelar: { Args: { p_pedido: string }; Returns: undefined }
      dis_abonar: { Args: { p_cliente: string; p_monto: number; p_metodo: string }; Returns: Json }
      mot_agregar_repuesto: { Args: { p_orden: string; p_repuesto: string; p_cantidad: number }; Returns: undefined }
      mot_quitar_repuesto: { Args: { p_item: string }; Returns: undefined }
      mot_ingresar_stock: { Args: { p_repuesto: string; p_cantidad: number; p_costo: number; p_metodo: string }; Returns: undefined }
      mot_entregar: { Args: { p_orden: string; p_metodo: string }; Returns: Json }
      mot_cancelar: { Args: { p_orden: string }; Returns: undefined }
      mot_pagar_comisiones: { Args: { p_mecanico: string; p_metodo: string }; Returns: Json }
      tex_consumir: { Args: { p_orden: string; p_insumo: string; p_cantidad: number }; Returns: Json }
      tex_entregar: { Args: { p_orden: string; p_cantidad: number; p_metodo: string }; Returns: Json }
      flo_vender: { Args: { p_arreglo: string; p_cantidad: number; p_cliente: string; p_telefono: string; p_destinatario: string; p_direccion: string; p_tarjeta: string; p_fecha: string; p_franja: string; p_metodo: string }; Returns: Json }
      tal_liquidar: { Args: { p_profesional: string; p_metodo: string }; Returns: number }
      tal_cobrar_proyecto: {
        Args: { p_proyecto: string; p_monto: number; p_metodo: string; p_es_abono: boolean }
        Returns: Json
      }
      ofi_cobrar: { Args: { p_tabla: string; p_id: string; p_valor: number; p_metodo: string }; Returns: Json }
      ofi_cobrar_retencion: {
        Args: { p_tabla: string; p_id: string; p_valor: number; p_metodo: string; p_retefuente: number; p_reteica: number }
        Returns: Json
      }
      inm_vender: {
        Args: { p_propiedad: string; p_comprador: string; p_telefono: string | null; p_precio: number; p_comision_pct: number; p_metodo: string }
        Returns: Json
      }
      agr_registrar_labor: {
        Args: { p_lote: string; p_tipo: string; p_descripcion: string | null; p_cantidad: number; p_costo: number }
        Returns: Json
      }
      tec_facturar_contrato: { Args: { p_contrato: string; p_periodo: string }; Returns: Json }
      sst_cobrar: { Args: { p_tabla: string; p_id: string; p_valor: number; p_metodo: string }; Returns: Json }
      sst_facturar_empresa: { Args: { p_empresa: string; p_metodo: string }; Returns: Json }
      sst_validar_certificado: { Args: { p_codigo: string }; Returns: Json }
      obr_registrar_vale: {
        Args: { p_obra: string; p_capitulo: string | null; p_items: Json; p_entregado: string | null }
        Returns: Json
      }
      obr_cobrar_corte: { Args: { p_corte: string; p_metodo: string }; Returns: Json }
      inm_cobrar_canon: { Args: { p_cobro: string; p_metodo: string }; Returns: Json }
      inm_liquidar: { Args: { p_contrato: string; p_metodo: string }; Returns: Json }
      agr_aplicar: {
        Args: { p_lote: string; p_insumo: string; p_cantidad: number; p_dosis: string | null }
        Returns: Json
      }
      agr_vender: {
        Args: { p_lote: string; p_cantidad: number; p_precio: number; p_cliente: string | null; p_metodo: string }
        Returns: Json
      }
      tra_anticipo: {
        Args: { p_manifiesto: string; p_concepto: string; p_detalle: string | null; p_valor: number }
        Returns: Json
      }
      tra_cobrar_flete: { Args: { p_manifiesto: string; p_metodo: string }; Returns: Json }
      tra_liquidar: { Args: { p_manifiesto: string; p_pago: number; p_metodo: string }; Returns: Json }
      fac_emitir: {
        Args: { p_cliente: string; p_cliente_doc: string | null; p_items: Json; p_iva: number; p_formato: string; p_inc: number; p_retefuente: number; p_reteiva: number; p_reteica: number; p_metodo: string }
        Returns: Json
      }
      mi_dian_config: { Args: never; Returns: Json }
      hot_checkout: { Args: { p_reserva: string; p_metodo: string }; Returns: Json }
      edu_generar_pensiones: { Args: { p_periodo: string; p_valor: number; p_vence: string | null }; Returns: Json }
      edu_cobrar_pension: { Args: { p_pension: string; p_metodo: string }; Returns: Json }
      far_vender: {
        Args: { p_producto: string; p_cantidad: number; p_cliente: string | null; p_con_formula: boolean; p_metodo: string }
        Returns: Json
      }
      opt_abonar: { Args: { p_orden: string; p_valor: number; p_metodo: string }; Returns: Json }
      eve_reservar: {
        Args: { p_salon: string | null; p_cliente: string; p_telefono: string | null; p_fecha: string; p_valor: number; p_anticipo: number }
        Returns: Json
      }
      eve_abonar: { Args: { p_evento: string; p_valor: number; p_metodo: string }; Returns: Json }
      accept_org_invite: { Args: { _token: string }; Returns: string }
      es_superadmin: { Args: never; Returns: boolean }
      es_soporte_plataforma: { Args: never; Returns: boolean }
      admin_asignar_rol_plataforma: { Args: { p_user_id: string; p_rol: string; p_activo?: boolean }; Returns: undefined }
      generar_codigo_vinculacion_whatsapp: { Args: { p_business_id: string }; Returns: Json }
      url_destino_aprobada: { Args: { p_url: string }; Returns: boolean }
      licencia_activa_para: { Args: { p_owner: string }; Returns: boolean }
      generar_codigo_alta_entropia: { Args: { p_prefijo?: string }; Returns: string }
      verificar_licencia: { Args: { p_codigo: string }; Returns: Json }
      verificar_licencia_equipo: { Args: { p_codigo: string; p_equipo: string }; Returns: Json }
      consultar_licencia_equipo: { Args: { p_equipo: string }; Returns: Json }
      solicitar_licencia: {
        Args: { p_equipo: string; p_correo: string; p_cliente: string; p_telefono?: string; p_sistema?: string }
        Returns: Json
      }
      aprobar_solicitud_licencia: { Args: { p_id: string; p_tipo: string }; Returns: string }
      iniciar_prueba_equipo: { Args: { p_equipo: string; p_cliente?: string }; Returns: Json }
      aprobar_solicitud_pase_dias: { Args: { p_id: string; p_dias?: number }; Returns: string }
      aprobar_pago_licencia: { Args: { p_id: string }; Returns: Json }
      aprobar_pase_dias_licencia: { Args: { p_id: string }; Returns: Json }
      admin_actualizar_suscripcion: { Args: { p_owner: string; p_plan?: string; p_estado?: string; p_vence_el?: string }; Returns: undefined }
      admin_rechazar_pago_licencia: { Args: { p_id: string }; Returns: undefined }
      admin_rechazar_solicitud_licencia: { Args: { p_id: string }; Returns: undefined }
      admin_crear_licencia: { Args: { p_cliente: string; p_telefono: string; p_ciudad: string; p_tipo: string; p_dias: number }; Returns: undefined }
      admin_crear_pase_dias: { Args: { p_cliente: string; p_telefono?: string; p_ciudad?: string; p_dias?: number }; Returns: string }
      admin_actualizar_licencia: { Args: { p_id: string; p_tipo?: string; p_estado?: string; p_vence_el?: string }; Returns: undefined }
      generar_clave_activacion: { Args: { p_owner: string }; Returns: string }
      activar_licencia: { Args: { p_clave: string }; Returns: Json }
      mi_licencia_vigente: { Args: never; Returns: Json }
      mi_acceso: { Args: never; Returns: Json }
      mi_negocio_id: { Args: never; Returns: string }
      com_registrar_venta: {
        Args: {
          p_items: Json
          p_cliente: string
          p_telefono: string
          p_tipo_precio: string
          p_metodo: string
          p_autorizar: boolean
          p_motivo: string
        }
        Returns: Json
      }
      com_estado_credito: { Args: { p_cliente: string; p_telefono: string }; Returns: Json }
      com_devolver_venta: { Args: { p_venta: string; p_motivo: string }; Returns: Json }
      nomina_pagar: { Args: { p_liquidacion: string; p_metodo: string }; Returns: Json }
      com_ingresar_lote: {
        Args: { p_producto: string; p_lote: string; p_vence: string | null; p_cantidad: number; p_unidad: string; p_costo: number }
        Returns: string
      }
      com_crear_cotizacion: {
        Args: {
          p_items: Json
          p_cliente: string
          p_telefono: string
          p_tipo_precio: string
          p_descuento_pct: number
          p_vigencia_dias: number
          p_notas: string
        }
        Returns: Json
      }
      com_estado_cotizacion: { Args: { p_id: string; p_estado: string }; Returns: undefined }
      com_convertir_cotizacion: {
        Args: { p_id: string; p_metodo: string; p_autorizar: boolean; p_motivo: string }
        Returns: Json
      }
      com_registrar_desposte: {
        Args: {
          p_origen: string | null
          p_descripcion: string
          p_peso_entrada: number
          p_costo_total: number
          p_salidas: Json
          p_mermas: Json
          p_notas: string
        }
        Returns: Json
      }
      bel_registrar_atencion: {
        Args: {
          p_cita: string | null
          p_cliente: string | null
          p_profesional: string | null
          p_servicio: string | null
          p_concepto: string | null
          p_tipo: string
          p_precio: number | null
          p_costo: number | null
          p_comision_pct: number | null
          p_metodo: string
        }
        Returns: Json
      }
      bel_liquidar_comisiones: { Args: { p_profesional: string; p_hasta: string; p_metodo: string }; Returns: number }
      es_dueno_o_admin_negocio: { Args: { p_owner_id: string }; Returns: boolean }
      es_mi_registro_staff: { Args: { p_owner_id: string; p_staff_id: string | null; p_profesional: string | null; p_registrado_por?: string | null }; Returns: boolean }
      gim_vender_membresia: { Args: { p_socio: string; p_plan: string; p_inicio: string | null; p_metodo: string }; Returns: Json }
      gim_congelar_membresia: { Args: { p_membresia: string; p_motivo: string }; Returns: undefined }
      gim_descongelar_membresia: { Args: { p_membresia: string }; Returns: number }
      gim_checkin: { Args: { p_codigo: string }; Returns: Json }
      pan_registrar_horneada: {
        Args: { p_receta: string; p_lotes: number; p_horneado_por: string; p_notas: string }
        Returns: string
      }
      pan_registrar_merma: {
        Args: {
          p_clase: string
          p_receta: string | null
          p_insumo: string | null
          p_cantidad: number
          p_causa: string
          p_motivo: string
          p_registrado_por: string
        }
        Returns: string
      }
      pan_crear_encargo: {
        Args: {
          p_cliente: string
          p_telefono: string
          p_descripcion: string
          p_sabor: string
          p_tamano: string
          p_dedicatoria: string
          p_entrega: string
          p_total: number
          p_abono: number
          p_metodo: string
          p_foto: string | null
          p_notas: string
        }
        Returns: string
      }
      pan_abonar_encargo: { Args: { p_id: string; p_monto: number; p_metodo: string }; Returns: number }
      pan_entregar_encargo: { Args: { p_id: string; p_metodo: string }; Returns: number }
      cl_finalizar_cita: { Args: { p_cita: string; p_items: Json }; Returns: string }
      cl_cobrar: { Args: { p_cobro: string; p_metodo: string }; Returns: number }
      cl_liquidar_comisiones: { Args: { p_profesional: string; p_hasta: string }; Returns: number }
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
      descontar_stock_productos_pedido: { Args: { p_pedido: string }; Returns: number }
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
