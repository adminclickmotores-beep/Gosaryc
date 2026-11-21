/**
 * Modo demo en memoria: sustituye al cliente de la base de datos por un almacén local.
 * Las pantallas reales del sistema (formularios, validaciones, cálculos y PDFs) siguen
 * funcionando igual, pero todo se lee y se escribe aquí. No hay llamadas de red ni inicio
 * de sesión real. Al restaurar, se vuelve a cargar el estado inicial del sector.
 */

export type SectorDemo = "auto" | "rest" | "comercio";
type Fila = Record<string, unknown>;
type Resultado = { data: unknown; error: { message: string; code?: string } | null; count?: number | null };

const CLAVE_MODO = "gosaryc_demo_memoria";
export const DEMO_USER_ID = "00000000-0000-4000-8000-0000000000d1";
export const DEMO_NEGOCIO_ID = "00000000-0000-4000-8000-0000000000d2";

export function sectorDemoActivo(): SectorDemo | null {
  try {
    if (typeof sessionStorage === "undefined") return null;
    const v = sessionStorage.getItem(CLAVE_MODO);
    return v === "auto" || v === "rest" || v === "comercio" ? v : null;
  } catch {
    return null;
  }
}

export function activarDemoMemoria(sector: SectorDemo) {
  sessionStorage.setItem(CLAVE_MODO, sector);
  almacen = null;
}

export function salirDemoMemoria() {
  sessionStorage.removeItem(CLAVE_MODO);
  almacen = null;
}

const ahora = () => new Date().toISOString();
const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now());

/* ------------------------------ datos iniciales ------------------------------ */

function base(sector: SectorDemo): Record<string, Fila[]> {
  const nombre = sector === "auto" ? "AutoElite Colombia" : sector === "rest" ? "Sabores del Valle" : "MultiComercio POS";
  const tipo = sector === "auto" ? "concesionario" : sector === "rest" ? "restaurante" : "ferreteria";
  const t: Record<string, Fila[]> = {
    profiles: [{ id: DEMO_USER_ID, full_name: "Cuenta demostración", default_org_id: DEMO_NEGOCIO_ID, onboarded_at: ahora(), created_at: ahora() }],
    negocio_config: [{
      id: DEMO_NEGOCIO_ID, owner_id: DEMO_USER_ID, nombre, tipo_negocio: tipo, moneda: "COP", iva_porcentaje: 19, iva_defecto: 19,
      ciudad: "Medellín", telefono_pedidos: "3001234567", horarios: "Lun a Sáb 8:00 a. m. – 8:00 p. m.", razon_social: nombre,
      tipo_documento: "NIT", nit: "900123456", digito_verificacion: "7", regimen_tributario: "Responsable de IVA",
      responsabilidad_fiscal: "O-13", rango_desde: 1, rango_hasta: 5000, dian_activa: false, crm_activo: true,
      permitir_inventario_negativo: false, prefijo_facturacion: "SETP", created_at: ahora(), updated_at: ahora(),
    }],
  };
  if (sector === "rest") {
    const cats = ["Platos fuertes", "Bebidas", "Entradas"].map((n, i) => ({ id: uid(), nombre: n, orden: i, activa: true, owner_id: DEMO_USER_ID, tipo_negocio: tipo, created_at: ahora() }));
    t.restaurante_categorias = cats;
    const p = (c: number, n: string, precio: number, stock: number, ean: string) => ({ id: uid(), nombre: n, precio, stock_actual: stock, codigo_barras: ean, categoria_id: cats[c].id, activo: true, destacado: false, owner_id: DEMO_USER_ID, tipo_negocio: tipo, created_at: ahora() });
    t.restaurante_productos = [
      p(0, "Churrasco Angus 350g", 48000, 30, "7702345600011"), p(0, "Salmón en Salsa de Maracuyá", 52000, 25, "7702345600028"),
      p(0, "Costillas BBQ Ahumadas", 44000, 40, "7702345600035"), p(1, "Limonada de Coco Natural", 11000, 50, "7702345600042"),
      p(1, "Jugo Natural en Agua/Leche", 8500, 50, "7702345600059"), p(2, "Nachos con Guacamole", 18000, 35, "7702345600066"),
    ];
    t.restaurante_mesas = ["1", "2", "3", "4", "5", "6"].map((n) => ({ id: uid(), numero: n, capacidad: 4, estado: "libre", created_at: ahora() }));
  } else if (sector === "comercio") {
    const cats = ["Ferretería", "Pinturas", "Servicios"].map((n, i) => ({ id: uid(), nombre: n, orden: i, activa: true, owner_id: DEMO_USER_ID, tipo_negocio: tipo, created_at: ahora() }));
    t.restaurante_categorias = cats;
    const p = (c: number, n: string, precio: number, stock: number, ean: string) => ({ id: uid(), nombre: n, precio, stock_actual: stock, codigo_barras: ean, categoria_id: cats[c].id, activo: true, destacado: false, owner_id: DEMO_USER_ID, tipo_negocio: tipo, created_at: ahora() });
    t.restaurante_productos = [
      p(0, "Taladro Percutor DeWalt 1/2\" 700W", 329000, 8, "7701001001012"), p(0, "Cemento Gris Uso General 50 kg", 33500, 45, "7701001001029"),
      p(0, "Cable Eléctrico AWG 12 (metro)", 2800, 320, "7701001001036"), p(1, "Pintura Vinilo Tipo 1 Blanco Galón", 56000, 3, "7701001001043"),
      p(2, "Servicio de Instalación / Mantenimiento Técnico", 65000, 9999, "SERV-01"),
    ];
  }
  return t;
}

/* --------------------------------- almacén ---------------------------------- */

let almacen: Record<string, Fila[]> | null = null;
const oyentes = new Set<() => void>();

function tablas(): Record<string, Fila[]> {
  if (!almacen) almacen = base(sectorDemoActivo() ?? "rest");
  return almacen;
}
function tabla(nombre: string): Fila[] {
  const t = tablas();
  if (!t[nombre]) t[nombre] = [];
  return t[nombre];
}

/** Vuelve al estado inicial del sector y avisa a las pantallas para que se recarguen. */
export function restaurarDemoMemoria() {
  almacen = null;
  oyentes.forEach((f) => f());
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("negocio:cambio"));
    window.dispatchEvent(new Event("crm:cambio"));
    window.location.reload();
  }
}

/* ------------------------------ consultas (query) ----------------------------- */

type Pred = (r: Fila) => boolean;
const comparar = (a: unknown, b: unknown): number => {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0;
};
const likeRe = (p: string, ci: boolean) =>
  new RegExp("^" + p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*").replace(/_/g, ".") + "$", ci ? "i" : "");

function valorTipado(v: string): unknown {
  if (v === "null") return null;
  if (v === "true") return true;
  if (v === "false") return false;
  return v;
}

function predOp(col: string, op: string, val: unknown): Pred {
  switch (op) {
    case "eq": return (r) => r[col] === val || (r[col] != null && val != null && String(r[col]) === String(val));
    case "neq": return (r) => !(r[col] === val || (r[col] != null && val != null && String(r[col]) === String(val)));
    case "gt": return (r) => comparar(r[col], val) > 0;
    case "gte": return (r) => comparar(r[col], val) >= 0;
    case "lt": return (r) => r[col] != null && comparar(r[col], val) < 0;
    case "lte": return (r) => r[col] != null && comparar(r[col], val) <= 0;
    case "is": return (r) => (val === null ? r[col] == null : r[col] === val);
    case "in": {
      const lista = Array.isArray(val) ? val.map(String) : String(val).replace(/^\(|\)$/g, "").split(",");
      return (r) => r[col] != null && lista.includes(String(r[col]));
    }
    case "like": return (r) => likeRe(String(val), false).test(String(r[col] ?? ""));
    case "ilike": return (r) => likeRe(String(val), true).test(String(r[col] ?? ""));
    default: return () => true;
  }
}

function predOr(expr: string): Pred {
  const partes = expr.split(",").map((p) => {
    const m = p.match(/^([^.]+)\.(not\.)?([a-z]+)\.(.*)$/);
    if (!m) return () => true;
    const base = predOp(m[1], m[3], m[3] === "in" ? m[4] : valorTipado(m[4]));
    return m[2] ? (r: Fila) => !base(r) : base;
  });
  return (r) => partes.some((f) => f(r));
}

class Consulta implements PromiseLike<Resultado> {
  private op: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private carga: Fila[] | Fila | null = null;
  private filtros: Pred[] = [];
  private orden: { col: string; asc: boolean }[] = [];
  private tope: number | null = null;
  private desde = 0;
  private modo: "varias" | "una" | "quizas" = "varias";
  private devolver = false;
  private contar = false;
  private soloCabecera = false;
  constructor(private nombre: string) {}

  select(_cols?: string, opt?: { count?: string; head?: boolean }) {
    if (this.op !== "select") this.devolver = true;
    if (opt?.count) this.contar = true;
    if (opt?.head) this.soloCabecera = true;
    return this;
  }
  insert(v: Fila | Fila[]) { this.op = "insert"; this.carga = v; return this; }
  upsert(v: Fila | Fila[]) { this.op = "upsert"; this.carga = v; return this; }
  update(v: Fila) { this.op = "update"; this.carga = v; return this; }
  delete() { this.op = "delete"; return this; }

  eq(c: string, v: unknown) { this.filtros.push(predOp(c, "eq", v)); return this; }
  neq(c: string, v: unknown) { this.filtros.push(predOp(c, "neq", v)); return this; }
  gt(c: string, v: unknown) { this.filtros.push(predOp(c, "gt", v)); return this; }
  gte(c: string, v: unknown) { this.filtros.push(predOp(c, "gte", v)); return this; }
  lt(c: string, v: unknown) { this.filtros.push(predOp(c, "lt", v)); return this; }
  lte(c: string, v: unknown) { this.filtros.push(predOp(c, "lte", v)); return this; }
  is(c: string, v: unknown) { this.filtros.push(predOp(c, "is", v)); return this; }
  in(c: string, v: unknown[]) { this.filtros.push(predOp(c, "in", v)); return this; }
  like(c: string, v: string) { this.filtros.push(predOp(c, "like", v)); return this; }
  ilike(c: string, v: string) { this.filtros.push(predOp(c, "ilike", v)); return this; }
  not(c: string, op: string, v: unknown) { const p = predOp(c, op, v); this.filtros.push((r) => !p(r)); return this; }
  or(expr: string) { this.filtros.push(predOr(expr)); return this; }
  match(o: Fila) { Object.entries(o).forEach(([c, v]) => this.filtros.push(predOp(c, "eq", v))); return this; }
  filter(c: string, op: string, v: unknown) { this.filtros.push(predOp(c, op, v)); return this; }
  contains() { return this; }
  textSearch() { return this; }
  order(col: string, opt?: { ascending?: boolean }) { this.orden.push({ col, asc: opt?.ascending !== false }); return this; }
  limit(n: number) { this.tope = n; return this; }
  range(a: number, b: number) { this.desde = a; this.tope = b - a + 1; return this; }
  single() { this.modo = "una"; return this; }
  maybeSingle() { this.modo = "quizas"; return this; }
  abortSignal() { return this; }
  returns() { return this; }

  private ejecutar(): Resultado {
    const t = tabla(this.nombre);
    const coincide = (r: Fila) => this.filtros.every((f) => f(r));
    let filas: Fila[] = [];
    if (this.op === "insert" || this.op === "upsert") {
      const lista = Array.isArray(this.carga) ? this.carga : [this.carga as Fila];
      for (const v of lista) {
        const previa = this.op === "upsert" && v.id != null ? t.find((r) => r.id === v.id) : undefined;
        if (previa) { Object.assign(previa, v); filas.push(previa); continue; }
        const nueva: Fila = { id: uid(), created_at: ahora(), owner_id: DEMO_USER_ID, ...v };
        t.push(nueva);
        filas.push(nueva);
      }
    } else if (this.op === "update") {
      filas = t.filter(coincide);
      filas.forEach((r) => Object.assign(r, this.carga, { updated_at: ahora() }));
    } else if (this.op === "delete") {
      filas = t.filter(coincide);
      const ids = new Set(filas);
      almacen![this.nombre] = t.filter((r) => !ids.has(r));
    } else {
      filas = t.filter(coincide);
    }
    if (this.op === "select" && this.orden.length) {
      filas = [...filas].sort((a, b) => {
        for (const o of this.orden) { const c = comparar(a[o.col], b[o.col]); if (c) return o.asc ? c : -c; }
        return 0;
      });
    }
    const total = filas.length;
    if (this.op === "select" && this.tope != null) filas = filas.slice(this.desde, this.desde + this.tope);
    const copia = filas.map((r) => ({ ...r }));
    const count = this.contar ? total : null;
    if (this.op !== "select" && !this.devolver) return { data: null, error: null, count };
    if (this.soloCabecera) return { data: null, error: null, count };
    if (this.modo === "varias") return { data: copia, error: null, count };
    if (copia.length === 1) return { data: copia[0], error: null, count };
    if (copia.length === 0 && this.modo === "quizas") return { data: null, error: null, count };
    return { data: null, error: { message: "JSON object requested, multiple (or no) rows returned", code: "PGRST116" }, count };
  }

  then<A = Resultado, B = never>(
    ok?: ((v: Resultado) => A | PromiseLike<A>) | null,
    fail?: ((e: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    return Promise.resolve().then(() => this.ejecutar()).then(ok, fail);
  }
}

/* ------------------------------ cliente falso ------------------------------- */

function sesionFalsa() {
  const usuario = { id: DEMO_USER_ID, email: "demo@gosaryc.demo", email_confirmed_at: ahora(), app_metadata: {}, user_metadata: { full_name: "Cuenta demostración" }, aud: "authenticated", created_at: ahora() };
  return { access_token: "demo-memoria", refresh_token: "demo-memoria", expires_in: 3600, token_type: "bearer", user: usuario };
}

const canalFalso = () => {
  const c: Record<string, unknown> = {};
  c.on = () => c;
  c.subscribe = () => c;
  c.unsubscribe = () => Promise.resolve("ok");
  c.send = () => Promise.resolve("ok");
  return c;
};

export function crearClienteDemo() {
  return {
    from: (nombre: string) => new Consulta(nombre),
    rpc: async (fn?: string) => {
      if (fn === "mi_acceso") return { data: { admin: true, modulos: [] }, error: null };
      if (fn === "mi_negocio_id") return { data: DEMO_NEGOCIO_ID, error: null };
      if (fn === "es_superadmin" || fn === "es_soporte_plataforma") return { data: false, error: null };
      if (fn === "licencia_activa_para") return { data: true, error: null };
      if (fn === "mi_licencia_vigente") return { data: { activa: true, plan: "demo" }, error: null };
      return { data: null, error: null };
    },
    auth: {
      getSession: async () => ({ data: { session: sesionFalsa() }, error: null }),
      getUser: async () => ({ data: { user: sesionFalsa().user }, error: null }),
      onAuthStateChange: (cb: (e: string, s: unknown) => void) => {
        setTimeout(() => cb("INITIAL_SESSION", sesionFalsa()), 0);
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
      signOut: async () => { salirDemoMemoria(); return { error: null }; },
      signInWithPassword: async () => ({ data: { session: sesionFalsa(), user: sesionFalsa().user }, error: null }),
      updateUser: async () => ({ data: { user: sesionFalsa().user }, error: null }),
      refreshSession: async () => ({ data: { session: sesionFalsa() }, error: null }),
    },
    channel: () => canalFalso(),
    removeChannel: async () => "ok",
    removeAllChannels: async () => [],
    storage: {
      from: () => ({
        upload: async (ruta: string) => ({ data: { path: ruta }, error: null }),
        getPublicUrl: (ruta: string) => ({ data: { publicUrl: ruta } }),
        createSignedUrl: async (ruta: string) => ({ data: { signedUrl: ruta }, error: null }),
        remove: async () => ({ data: [], error: null }),
        download: async () => ({ data: null, error: { message: "Sin archivos en la demostración" } }),
        list: async () => ({ data: [], error: null }),
      }),
    },
    functions: { invoke: async () => ({ data: null, error: { message: "No disponible en la demostración" } }) },
  };
}

export function suscribirReinicioDemo(f: () => void) {
  oyentes.add(f);
  return () => { oyentes.delete(f); };
}
