/**
 * Demo en vivo en modo sandbox local: todo ocurre en memoria del navegador.
 * No usa supabase.auth, ni funciones del servidor, ni escribe en la base de datos.
 * Mientras `gosaryc_modo_demo` está activo en sessionStorage, el cliente de datos responde con
 * estos datos de ejemplo (en pesos colombianos). Cualquier cambio que haga el visitante vive solo
 * en la memoria de la pestaña y desaparece al cerrarla.
 * Este archivo NO importa el cliente de Supabase (evita dependencias circulares).
 */
import type { Session } from "@supabase/supabase-js";

export type ModoDemo = "concesionario" | "restaurante";
const CLAVE = "gosaryc_modo_demo";
const UID = "00000000-0000-4000-8000-00000000demo";

export function leerModoDemo(): ModoDemo | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.sessionStorage.getItem(CLAVE);
    return v === "concesionario" || v === "restaurante" ? v : null;
  } catch {
    return null;
  }
}

export function activarModoDemo(modo: ModoDemo) {
  try {
    window.sessionStorage.setItem(CLAVE, modo);
  } catch {
    /* almacenamiento bloqueado */
  }
  datos = null;
}

export function salirModoDemo() {
  try {
    window.sessionStorage.removeItem(CLAVE);
  } catch {
    /* almacenamiento bloqueado */
  }
  datos = null;
  if (typeof window !== "undefined") window.dispatchEvent(new Event("gosaryc:demo-cambio"));
}

export function sesionDemo(): Session {
  const modo = leerModoDemo() ?? "restaurante";
  const email = modo === "concesionario" ? "demo.vehiculos@gosaryc.com" : "demo.restaurante@gosaryc.com";
  const ahora = new Date().toISOString();
  return {
    access_token: "demo-sandbox",
    refresh_token: "demo-sandbox",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: {
      id: UID,
      aud: "authenticated",
      role: "authenticated",
      email,
      email_confirmed_at: ahora,
      created_at: ahora,
      app_metadata: {},
      user_metadata: { demo: true },
    },
  } as unknown as Session;
}

/* ------------------------------ datos de ejemplo ------------------------------ */

type Fila = Record<string, unknown>;
let datos: Record<string, Fila[]> | null = null;
let contador = 1;
const nuevoId = () => `demo-${Date.now().toString(36)}-${contador++}`;
const haceHoras = (h: number) => new Date(Date.now() - h * 3600 * 1000).toISOString();
const enDias = (d: number) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);
const foto = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=600&q=80`;
const con = (rows: Fila[]): Fila[] =>
  rows.map((r, i) => ({ id: `d${i + 1}-${Math.abs(JSON.stringify(r).length)}`, owner_id: UID, created_at: haceHoras(48 + i), ...r }));

function construir(modo: ModoDemo): Record<string, Fila[]> {
  const base: Record<string, Fila[]> = {};
  const esRest = modo === "restaurante";
  base.negocio_config = [
    {
      id: "demo-negocio",
      owner_id: UID,
      nombre: esRest ? "Crokante Gourmet Demo" : "ClickMotores Demo",
      tipo_negocio: esRest ? "restaurante" : "concesionario",
      eslogan: esRest ? "Sabor crujiente, hecho al momento" : "Tu moto o carro de confianza, con taller propio",
      descripcion: "Cuenta de demostración con datos de ejemplo.",
      ciudad: "Medellín",
      moneda: "COP",
      color_principal: esRest ? "#F59E0B" : "#10B981",
      logo_url: "/icono-app.svg",
      telefono_pedidos: "3000000000",
      horarios: "Todos los días 11:00 a.m. - 10:00 p.m.",
      iva_porcentaje: 19,
      created_at: haceHoras(500),
      updated_at: haceHoras(1),
    },
  ];
  base.turnos_caja = con([{ cajero: "Demo", fondo_inicial: 200000, estado: "abierto", abierto_en: haceHoras(4) }]);

  if (esRest) {
    base.restaurante_categorias = con([
      { nombre: "Platos fuertes", orden: 1 },
      { nombre: "Alitas y snacks", orden: 2 },
      { nombre: "Hamburguesas", orden: 3 },
      { nombre: "Bebidas", orden: 4 },
    ]);
    const cats = base.restaurante_categorias;
    const p = (nombre: string, precio: number, desc: string, f: string, c: number): Fila => ({
      nombre, precio, descripcion: desc, imagen_url: foto(f), destacado: true, activo: true, categoria_id: cats[c].id, tipo_negocio: "restaurante",
    });
    base.restaurante_productos = con([
      p("Chuleta Apanada Especial", 28900, "Chuleta de cerdo apanada crocante con papa, ensalada y arroz.", "photo-1604908176997-125f25cc6f3d", 0),
      p("Pechuga a la Plancha", 26500, "Pechuga jugosa con arroz, ensalada y papa criolla.", "photo-1532550907401-a500c9a57435", 0),
      p("Alitas Crujientes x12", 32900, "Doce alitas crujientes bañadas en la salsa que elijas.", "photo-1527477396000-e27163b481c2", 1),
      p("Papas Cargadas", 17900, "Papas con queso, tocineta y salsa de la casa.", "photo-1573080496219-bb080dd4f877", 1),
      p("Hamburguesa Artesanal Doble", 26900, "Doble carne artesanal, queso, tocineta y vegetales frescos.", "photo-1568901346375-23c9450c58cd", 2),
      p("Hamburguesa Pollo Crispy", 23900, "Pollo apanado, lechuga, tomate y salsa ajo.", "photo-1606755962773-d324e0a13086", 2),
      p("Limonada Natural", 8500, "Limonada natural hecha al momento, bien fría.", "photo-1621263764928-df1444c5e859", 3),
      p("Jugo de Mora en Leche", 9500, "Jugo natural de mora en leche.", "photo-1546173159-315724a31696", 3),
    ]);
    const prods = base.restaurante_productos;
    base.restaurante_producto_opciones = con(
      [0, 2, 4].flatMap((i) => [
        { producto_id: prods[i].id, grupo: "Tipo de papa", nombre: "Papa amarilla", obligatorio: true, multiple: false, precio_extra: 0 },
        { producto_id: prods[i].id, grupo: "Tipo de papa", nombre: "Papa francesa", obligatorio: true, multiple: false, precio_extra: 0 },
        { producto_id: prods[i].id, grupo: "Salsas", nombre: "BBQ", obligatorio: false, multiple: true, precio_extra: 0 },
        { producto_id: prods[i].id, grupo: "Salsas", nombre: "Ajo", obligatorio: false, multiple: true, precio_extra: 0 },
      ]),
    );
    base.restaurante_mesas = con(
      [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ numero: n, nombre: `Mesa ${n}`, capacidad: n % 2 ? 4 : 2, estado: n === 2 || n === 5 ? "ocupada" : "libre" })),
    );
    base.restaurante_insumos = con([
      { nombre: "Pechuga de pollo", unidad: "kg", stock_actual: 18, stock_minimo: 8, costo_unitario: 14500 },
      { nombre: "Carne de res molida", unidad: "kg", stock_actual: 6, stock_minimo: 10, costo_unitario: 22000 },
      { nombre: "Papa", unidad: "kg", stock_actual: 40, stock_minimo: 15, costo_unitario: 2400 },
      { nombre: "Pan hamburguesa", unidad: "und", stock_actual: 60, stock_minimo: 30, costo_unitario: 900 },
      { nombre: "Queso", unidad: "kg", stock_actual: 4, stock_minimo: 5, costo_unitario: 21000 },
    ]);
    const clientes = con([
      { nombre: "Laura Gómez", telefono: "3001112233" },
      { nombre: "Andrés Ruiz", telefono: "3004445566" },
      { nombre: "Camila Torres", telefono: "3007778899" },
    ]);
    base.restaurante_clientes = clientes;
    const ped = [
      { cliente_nombre: "Laura Gómez", cliente_telefono: "3001112233", estado: "entregado", metodo_pago: "efectivo", items: [[0, 1], [6, 2]], h: 5 },
      { cliente_nombre: "Andrés Ruiz", cliente_telefono: "3004445566", estado: "entregado", metodo_pago: "nequi", items: [[4, 2]], h: 3 },
      { cliente_nombre: "Camila Torres", cliente_telefono: "3007778899", estado: "nuevo", metodo_pago: "nequi", items: [[2, 1], [6, 1]], h: 1 },
      { cliente_nombre: "Mesa 2", cliente_telefono: "", estado: "preparando", metodo_pago: "efectivo", items: [[1, 2], [7, 2]], h: 0.5 },
      { cliente_nombre: "Mesa 5", cliente_telefono: "", estado: "listo", metodo_pago: "tarjeta", items: [[3, 1], [5, 2]], h: 0.3 },
    ];
    base.restaurante_pedidos = [];
    base.restaurante_pedido_items = [];
    ped.forEach((x, i) => {
      const id = `demo-ped-${i + 1}`;
      const total = x.items.reduce((s, [pi, c]) => s + Number(prods[pi].precio) * c, 0);
      base.restaurante_pedidos.push({
        id, owner_id: UID, cliente_nombre: x.cliente_nombre, cliente_telefono: x.cliente_telefono, estado: x.estado,
        metodo_pago: x.metodo_pago, modalidad: x.cliente_nombre.startsWith("Mesa") ? "mesa" : "recoger", total,
        pago_estado: x.estado === "entregado" ? "pagado" : "pendiente", created_at: haceHoras(x.h),
      });
      x.items.forEach(([pi, c], j) =>
        base.restaurante_pedido_items.push({
          id: `${id}-i${j}`, pedido_id: id, producto_id: prods[pi].id, nombre: prods[pi].nombre, cantidad: c, precio_unitario: prods[pi].precio, created_at: haceHoras(x.h),
        }),
      );
    });
    base.restaurante_movimientos_caja = con([
      { tipo: "ingreso", concepto: "Ventas del día", monto: 428000, metodo_pago: "efectivo", fecha: enDias(0) },
      { tipo: "gasto", concepto: "Compra de gas", monto: 65000, metodo_pago: "efectivo", fecha: enDias(0) },
    ]);
    base.crm_leads = con([
      { nombre: "Eventos Sabor SAS", telefono: "3105550101", etapa: "nuevo", origen: "whatsapp", valor: 1800000 },
      { nombre: "Colegio San José", telefono: "3105550102", etapa: "contactado", origen: "instagram", valor: 2400000 },
    ]);
  } else {
    const v = (tipo: string, condicion: string, marca: string, modelo: string, version: string, cc: string, anio: number, km: number, placa: string, color: string, precio: number, f: string, estado = "disponible"): Fila => ({
      tipo, condicion, marca, modelo, version, cilindraje: cc, anio, kilometraje: km, placa, color, precio, estado, fotos: [foto(f)],
      observaciones: "Papeles al día, lista para entrega.", soat_vence: enDias(60), tecnomecanica_vence: enDias(90), fecha_ingreso: enDias(-12), eliminado_en: null,
    });
    base.vehiculos_inventario = con([
      v("carro", "nuevo", "Renault", "Kwid", "Zen 1.0", "1000", 2026, 0, "NUE001", "Blanco", 49900000, "photo-1549317661-bd32c8ce0db2"),
      v("carro", "usado", "Mazda", "CX-30", "Touring 2.0", "2000", 2022, 28000, "HJK321", "Gris", 98500000, "photo-1494976388531-d1058494cdd8"),
      v("carro", "usado", "Renault", "Duster", "Intens 1.6", "1600", 2020, 48000, "TUV908", "Blanco", 62000000, "photo-1519641471654-76ce0107ad1b", "separado"),
      v("moto", "nuevo", "Bajaj", "Pulsar NS200", "FI ABS", "200", 2026, 0, "NUE002", "Negro", 13900000, "photo-1558981806-ec527fa84c39"),
      v("moto", "usado", "Yamaha", "XTZ 150", "Enduro 150", "150", 2023, 9500, "KLM45F", "Azul", 9800000, "photo-1568772585407-9361f9bf3a87"),
      v("moto", "usado", "Yamaha", "FZ 25", "Naked 250", "250", 2022, 14500, "ABC12D", "Rojo", 11800000, "photo-1609630875171-b1321377ee65", "vendido"),
    ]);
    const inv = base.vehiculos_inventario;
    const costos = [41000000, 84000000, 53500000, 11800000, 8200000, 9400000];
    base.vehiculo_costos = con(inv.map((x, i) => ({ vehiculo_id: x.id, precio_compra: costos[i] })));
    base.vehiculo_gastos = con(
      inv.map((x, i) => ({ vehiculo_id: x.id, categoria: "alistamiento", descripcion: "Alistamiento (lavado, mantenimiento y documentos)", monto: 250000 + i * 300000, fecha: enDias(-8 - i) })),
    );
    base.restaurante_clientes = con([
      { nombre: "Carlos Mejía", telefono: "3115550101" },
      { nombre: "Daniela Ospina", telefono: "3115550102" },
      { nombre: "Transportes Andes SAS", telefono: "3115550103" },
    ]);
    base.crm_leads = con([
      { nombre: "Carlos Mejía", telefono: "3115550101", etapa: "nuevo", origen: "whatsapp", valor: 98500000 },
      { nombre: "Daniela Ospina", telefono: "3115550102", etapa: "prueba de manejo", origen: "web", valor: 49900000 },
      { nombre: "Transportes Andes SAS", telefono: "3115550103", etapa: "negociacion", origen: "referido", valor: 13900000 },
    ]);
    base.restaurante_movimientos_caja = con([
      { tipo: "ingreso", concepto: "Venta Mazda CX-30 (cuota inicial)", monto: 28500000, metodo_pago: "transferencia", fecha: enDias(0) },
      { tipo: "gasto", concepto: "Repuestos taller", monto: 380000, metodo_pago: "efectivo", fecha: enDias(0) },
    ]);
  }
  return base;
}

function tablas(): Record<string, Fila[]> {
  if (!datos) datos = construir(leerModoDemo() ?? "restaurante");
  return datos;
}

/* ------------------------------ constructor de consultas ------------------------------ */

type Resultado = { data: unknown; error: { message: string; code?: string } | null; count?: number | null };

class Consulta implements PromiseLike<Resultado> {
  private op: "select" | "insert" | "update" | "delete" = "select";
  private filtros: Array<(r: Fila) => boolean> = [];
  private orden: Array<{ col: string; asc: boolean }> = [];
  private limite: number | null = null;
  private desde = 0;
  private unico: "single" | "maybe" | null = null;
  private payload: Fila[] = [];
  private parche: Fila = {};
  private pideDatos = true;
  private soloConteo = false;
  private contar = false;
  private cols = "*";

  constructor(private tabla: string) {}

  select(cols?: string, opts?: { count?: string; head?: boolean }) {
    this.cols = cols ?? "*";
    if (this.op !== "select") this.pideDatos = true;
    if (opts?.count) this.contar = true;
    if (opts?.head) this.soloConteo = true;
    return this;
  }
  insert(v: Fila | Fila[]) {
    this.op = "insert";
    this.payload = Array.isArray(v) ? v : [v];
    this.pideDatos = false;
    return this;
  }
  upsert(v: Fila | Fila[]) {
    return this.insert(v);
  }
  update(v: Fila) {
    this.op = "update";
    this.parche = v;
    this.pideDatos = false;
    return this;
  }
  delete() {
    this.op = "delete";
    this.pideDatos = false;
    return this;
  }
  private f(fn: (r: Fila) => boolean) {
    this.filtros.push(fn);
    return this;
  }
  eq(c: string, v: unknown) { return this.f((r) => r[c] === v); }
  neq(c: string, v: unknown) { return this.f((r) => r[c] !== v); }
  gt(c: string, v: unknown) { return this.f((r) => (r[c] as number) > (v as number)); }
  gte(c: string, v: unknown) { return this.f((r) => (r[c] as number) >= (v as number)); }
  lt(c: string, v: unknown) { return this.f((r) => (r[c] as number) < (v as number)); }
  lte(c: string, v: unknown) { return this.f((r) => (r[c] as number) <= (v as number)); }
  in(c: string, v: unknown[]) { return this.f((r) => v.includes(r[c])); }
  is(c: string, v: unknown) { return this.f((r) => (v === null ? r[c] == null : r[c] === v)); }
  like(c: string, v: string) { const re = new RegExp(`^${v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*")}$`); return this.f((r) => re.test(String(r[c] ?? ""))); }
  ilike(c: string, v: string) { const re = new RegExp(`^${v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*")}$`, "i"); return this.f((r) => re.test(String(r[c] ?? ""))); }
  not(c: string, op: string, v: unknown) { return op === "is" ? this.f((r) => (v === null ? r[c] != null : r[c] !== v)) : this; }
  match(o: Fila) { Object.entries(o).forEach(([k, v]) => this.eq(k, v)); return this; }
  or() { return this; }
  contains() { return this; }
  textSearch() { return this; }
  filter() { return this; }
  abortSignal() { return this; }
  returns() { return this; }
  order(col: string, o?: { ascending?: boolean }) { this.orden.push({ col, asc: o?.ascending !== false }); return this; }
  limit(n: number) { this.limite = n; return this; }
  range(a: number, b: number) { this.desde = a; this.limite = b - a + 1; return this; }
  single() { this.unico = "single"; return this; }
  maybeSingle() { this.unico = "maybe"; return this; }

  private anidar(fila: Fila): Fila {
    const out: Fila = { ...fila };
    const re = /(?:(\w+):)?(\w+)(?:![\w]+)?\(/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(this.cols))) {
      const nombre = m[1] ?? m[2];
      const hijos = (tablas()[m[2]] ?? []).filter((h) => Object.entries(h).some(([k, v]) => k.endsWith("_id") && v === fila.id));
      out[nombre] = hijos;
    }
    return out;
  }

  private ejecutar(): Resultado {
    const todas = (tablas()[this.tabla] ??= []);
    const coincide = (r: Fila) => this.filtros.every((fn) => fn(r));
    if (this.op === "insert") {
      const nuevas = this.payload.map((p) => ({ id: nuevoId(), owner_id: UID, created_at: new Date().toISOString(), ...p }));
      todas.push(...nuevas);
      return { data: this.pideDatos ? (this.unico ? nuevas[0] ?? null : nuevas) : null, error: null };
    }
    if (this.op === "update") {
      const afectadas = todas.filter(coincide);
      afectadas.forEach((r) => Object.assign(r, this.parche));
      return { data: this.pideDatos ? afectadas : null, error: null };
    }
    if (this.op === "delete") {
      const datosTabla = tablas();
      datosTabla[this.tabla] = todas.filter((r) => !coincide(r));
      return { data: null, error: null };
    }
    let filas = todas.filter(coincide);
    const total = filas.length;
    this.orden.forEach(({ col, asc }) => {
      filas = [...filas].sort((a, b) => {
        const x = a[col] as number | string;
        const y = b[col] as number | string;
        return (x > y ? 1 : x < y ? -1 : 0) * (asc ? 1 : -1);
      });
    });
    if (this.limite !== null) filas = filas.slice(this.desde, this.desde + this.limite);
    if (this.soloConteo) return { data: null, error: null, count: total };
    const salida = filas.map((r) => this.anidar(r));
    if (this.unico) {
      if (salida.length === 0) {
        return this.unico === "maybe" ? { data: null, error: null } : { data: null, error: { message: "Sin resultados", code: "PGRST116" } };
      }
      return { data: salida[0], error: null, count: this.contar ? total : null };
    }
    return { data: salida, error: null, count: this.contar ? total : null };
  }

  then<A = Resultado, B = never>(
    ok?: ((v: Resultado) => A | PromiseLike<A>) | null,
    fail?: ((r: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    return Promise.resolve().then(() => this.ejecutar()).then(ok, fail);
  }
}

/* ------------------------------ piezas del cliente falso ------------------------------ */

const vacio = { data: null, error: null };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const canalFalso: any = new Proxy(function () {}, {
  get: (_t, p) => (p === "then" ? undefined : canalFalso),
  apply: () => canalFalso,
});

const almacenFalso = {
  from: () => ({
    createSignedUrl: async () => ({ data: { signedUrl: "" }, error: null }),
    createSignedUrls: async () => ({ data: [], error: null }),
    getPublicUrl: () => ({ data: { publicUrl: "" } }),
    upload: async () => vacio,
    remove: async () => vacio,
    list: async () => ({ data: [], error: null }),
    download: async () => vacio,
  }),
};

const AUTH_PROPIAS = new Set(["getSession", "getUser", "onAuthStateChange", "signOut", "refreshSession", "updateUser"]);

/**
 * Devuelve la pieza falsa del cliente cuando el modo demo está activo, o undefined para
 * dejar pasar la llamada al cliente real.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function piezaDemo(prop: string | symbol, authReal: () => any): unknown {
  if (!leerModoDemo()) return undefined;
  switch (prop) {
    case "from":
      return (tabla: string) => new Consulta(tabla);
    case "rpc":
      return async (nombre: string) => {
        if (nombre === "mi_acceso") return { data: { admin: true, modulos: [] }, error: null };
        return vacio;
      };
    case "channel":
      return () => canalFalso;
    case "removeChannel":
    case "removeAllChannels":
      return async () => "ok";
    case "storage":
      return almacenFalso;
    case "functions":
      return { invoke: async () => vacio };
    case "auth":
      return new Proxy(
        {},
        {
          get(_t, p) {
            if (!AUTH_PROPIAS.has(String(p))) {
              // Cualquier otra acción de cuenta (iniciar sesión, registrarse...) sale del modo demo.
              salirModoDemo();
              const real = authReal();
              const v = real[p as string];
              return typeof v === "function" ? v.bind(real) : v;
            }
            switch (p) {
              case "getSession":
                return async () => ({ data: { session: sesionDemo() }, error: null });
              case "getUser":
                return async () => ({ data: { user: sesionDemo().user }, error: null });
              case "refreshSession":
                return async () => ({ data: { session: sesionDemo(), user: sesionDemo().user }, error: null });
              case "onAuthStateChange":
                return () => ({ data: { subscription: { unsubscribe: () => {} } } });
              case "signOut":
                return async () => {
                  salirModoDemo();
                  return { error: null };
                };
              default:
                return async () => ({ data: { user: sesionDemo().user }, error: null });
            }
          },
        },
      );
    default:
      return undefined;
  }
}
