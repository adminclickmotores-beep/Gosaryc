import { supabase } from "@/integrations/supabase/client";
import { markOnboarded } from "@/hooks/use-onboarding-status";
import type { TablesInsert } from "@/integrations/supabase/types";

/**
 * Cuentas demo reales y ligeras. No se sube nada al Storage: las fotos son
 * enlaces externos comprimidos (w=600, q=80) y el contenido se siembra de forma
 * idempotente con el mismo aislamiento por owner_id que cualquier cuenta.
 */
export type TipoDemo = "vehiculos" | "restaurante";

export const CORREO_DEMO: Record<TipoDemo, string> = {
  vehiculos: "demo.vehiculos@gosaryc.com",
  restaurante: "demo.restaurante@gosaryc.com",
};

// Clave interna de las cuentas demo: el visitante nunca la escribe.
const CLAVE_DEMO = "GosarycDemoReal-2026";

export const esCuentaDemo = (correo?: string | null): boolean =>
  !!correo && Object.values(CORREO_DEMO).includes(correo.toLowerCase());

const foto = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=600&q=80`;

const hoy = () => new Date();
const enDias = (d: number) => {
  const f = hoy();
  f.setDate(f.getDate() + d);
  return f.toISOString().slice(0, 10);
};
const haceHoras = (h: number) => new Date(Date.now() - h * 3600 * 1000).toISOString();

/**
 * Guarda la configuración del negocio demo. Si la base rechaza algún dato,
 * guarda al menos el nombre y el tipo de negocio, para que la demo de vehículos
 * nunca se quede con el panel del restaurante.
 */
async function guardarConfig(uid: string, cfg: TablesInsert<"negocio_config">) {
  const basico: TablesInsert<"negocio_config"> = {
    owner_id: uid,
    nombre: cfg.nombre,
    tipo_negocio: cfg.tipo_negocio,
    eslogan: cfg.eslogan,
    descripcion: cfg.descripcion,
    ciudad: cfg.ciudad,
    color_principal: cfg.color_principal,
    logo_url: cfg.logo_url,
    telefono_pedidos: cfg.telefono_pedidos,
  };
  // Primero la base deja la cuenta como dueña de su propio negocio y con el tipo correcto
  // (sin depender de las reglas de acceso del navegador, que fallaban en silencio).
  const { error: errPrep } = await supabase.rpc("demo_preparar_negocio", {
    p_tipo: cfg.tipo_negocio ?? "",
    p_nombre: cfg.nombre ?? "",
  });
  if (errPrep) console.warn("Demo: no se pudo preparar el negocio", errPrep.message);

  const { data: existe } = await supabase.from("negocio_config").select("id").eq("owner_id", uid).order("created_at").limit(1).maybeSingle();
  if (existe) {
    const { data: hechos, error } = await supabase.from("negocio_config").update(cfg).eq("id", existe.id).select("id");
    if (error || !hechos || hechos.length === 0) {
      console.warn("Demo: configuración completa rechazada, se guarda la básica", error?.message);
      await supabase.from("negocio_config").update(basico).eq("id", existe.id);
    }
  } else {
    const { error } = await supabase.from("negocio_config").insert(cfg);
    if (error) {
      console.warn("Demo: configuración completa rechazada, se guarda la básica", error.message);
      await supabase.from("negocio_config").insert(basico);
    }
  }
}

async function sembrarVehiculos(uid: string) {
  const cfg = {
    nombre: "ClickMotores Demo",
    eslogan: "Tu moto o carro de confianza, con taller propio",
    descripcion: "Concesionario gama media y taller. Cuenta de demostración con datos de prueba.",
    tipo_negocio: "concesionario",
    moneda: "COP",
    ciudad: "Medellín",
    color_principal: "#10B981",
    logo_url: "/icono-app.svg",
    razon_social: "ClickMotores Demo S.A.S.",
    nit: "900123456",
    digito_verificacion: "7",
    direccion_fiscal: "Cra 43A # 10-25, Medellín",
    // Debe ser uno de los valores que acepta la base; con otro valor no se guardaba nada
    // y la demo de vehículos se quedaba como restaurante y vacía.
    regimen_tributario: "Responsable de IVA",
    telefono_pedidos: "3000000000",
    owner_id: uid,
  };
  await guardarConfig(uid, cfg);

  // La base carga todo lo que falte (inventario, costos, créditos, cotizaciones, ventas,
  // cartera, comisiones...). Desde el navegador los permisos rechazaban parte de los datos
  // y la demo quedaba vacía. Solo si la función no responde se usa la carga del navegador.
  const { error: errSiembra } = await supabase.rpc("demo_sembrar_vehiculos");
  if (errSiembra) {
    console.warn("Demo: carga desde la base no disponible, se usa la del navegador", errSiembra.message);
    await sembrarVehiculosNavegador(uid);
  }
  const { count: turnos } = await supabase.from("turnos_caja").select("id", { count: "exact", head: true }).eq("owner_id", uid);
  if ((turnos ?? 0) === 0) {
    await supabase.from("turnos_caja").insert({ owner_id: uid, cajero: "Demo", fondo_inicial: 300000, estado: "abierto" });
  }
}

/** Respaldo: carga básica del inventario desde el navegador. */
async function sembrarVehiculosNavegador(uid: string) {
  const { count } = await supabase
    .from("vehiculos_inventario")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", uid)
    .is("eliminado_en", null);
  if ((count ?? 0) > 0) return;

  const lista = [
    { tipo: "moto", condicion: "usado", marca: "Yamaha", modelo: "FZ 25", version: "Naked Sport 200cc", cilindraje: "200", anio: 2022, kilometraje: 14500, placa: "KLM45F", color: "Azul", precio: 11800000, compra: 9400000, alist: 650000, foto: "photo-1558981806-ec527fa84c39", obs: "Excelente estado, único dueño." },
    { tipo: "moto", condicion: "nuevo", marca: "Honda", modelo: "CB 150 Urbana", version: "Urbana 150cc", cilindraje: "150", anio: 2026, kilometraje: 0, placa: "NUE12G", color: "Rojo", precio: 9900000, compra: 8300000, alist: 250000, foto: "photo-1568772585407-9361f9bf3a87", obs: "Moto nueva, lista para matrícula." },
    { tipo: "carro", condicion: "usado", marca: "Mazda", modelo: "3 Touring", version: "Sedán gama media", cilindraje: "2000", anio: 2019, kilometraje: 62000, placa: "HJK321", color: "Gris", precio: 68500000, compra: 59000000, alist: 1800000, foto: "photo-1494976388531-d1058494cdd8", obs: "Mantenimientos al día, 2 propietarios." },
    { tipo: "carro", condicion: "usado", marca: "Renault", modelo: "Duster", version: "SUV compacta gama media", cilindraje: "1600", anio: 2020, kilometraje: 48000, placa: "TUV908", color: "Blanco", precio: 62000000, compra: 53500000, alist: 2100000, foto: "photo-1519641471654-76ce0107ad1b", obs: "Camioneta SUV compacta, papeles al día." },
  ];
  const { data: creados } = await supabase
    .from("vehiculos_inventario")
    .insert(
      lista.map((v, i) => ({
        owner_id: uid,
        tipo: v.tipo,
        condicion: v.condicion,
        marca: v.marca,
        modelo: v.modelo,
        version: v.version,
        cilindraje: v.cilindraje,
        anio: v.anio,
        kilometraje: v.kilometraje,
        placa: v.placa,
        color: v.color,
        precio: v.precio,
        precio_compra: v.compra,
        observaciones: v.obs,
        fotos: [foto(v.foto)],
        soat_vence: enDias(40 + i * 70),
        tecnomecanica_vence: enDias(25 + i * 90),
        fecha_ingreso: enDias(-10 - i * 3),
      })),
    )
    .select("id");
  if (creados && creados.length === lista.length) {
    // El precio de compra vive en su propia tabla protegida.
    await supabase.from("vehiculo_costos").insert(
      creados.map((c, i) => ({ vehiculo_id: c.id, owner_id: uid, precio_compra: lista[i].compra })),
    );
    await supabase.from("vehiculo_gastos").insert(
      creados.map((c, i) => ({
        owner_id: uid,
        vehiculo_id: c.id,
        categoria: "alistamiento",
        descripcion: "Alistamiento (lavado, mantenimiento y documentos)",
        monto: lista[i].alist,
        fecha: enDias(-8 - i * 3),
      })),
    );
  }
}

async function sembrarRestaurante(uid: string) {
  const cfg = {
    nombre: "Crokante Gourmet Demo",
    eslogan: "Sabor crujiente, hecho al momento",
    descripcion: "Restaurante y comida rápida. Cuenta de demostración con datos de prueba.",
    tipo_negocio: "restaurante",
    moneda: "COP",
    ciudad: "Medellín",
    color_principal: "#F59E0B",
    logo_url: "/icono-app.svg",
    telefono_pedidos: "3000000000",
    horarios: "Todos los días 11:00 a.m. - 10:00 p.m.",
    owner_id: uid,
  };
  await guardarConfig(uid, cfg);

  // La base carga todo lo que falte (carta, opciones, inventario, recetas, mesas,
  // repartidores, clientes, pedidos de hoy y de la semana, gastos, propinas, metas,
  // reseñas, combos, puntos, proveedores y cuentas por cobrar). Desde el navegador
  // los pedidos se rechazaban y la demo quedaba casi vacía.
  const { error: errSiembra } = await supabase.rpc("demo_sembrar_restaurante");
  if (errSiembra) {
    console.warn("Demo: carga desde la base no disponible, se usa la del navegador", errSiembra.message);
    await sembrarRestauranteNavegador(uid);
  }
  const { count: turnos } = await supabase.from("turnos_caja").select("id", { count: "exact", head: true }).eq("owner_id", uid);
  if ((turnos ?? 0) === 0) {
    await supabase.from("turnos_caja").insert({ owner_id: uid, cajero: "Demo", fondo_inicial: 200000, estado: "abierto" });
  }
}

/** Respaldo: carga básica de la carta y unos pedidos desde el navegador. */
async function sembrarRestauranteNavegador(uid: string) {
  const { count } = await supabase.from("restaurante_productos").select("id", { count: "exact", head: true }).eq("owner_id", uid);
  if ((count ?? 0) > 0) return;

  const platos = [
    { nombre: "Chuleta Apanada Especial", precio: 28900, desc: "Chuleta de cerdo apanada crocante con papa, ensalada y arroz.", foto: "photo-1604908176997-125f25cc6f3d", papa: true },
    { nombre: "Alitas Crujientes x12", precio: 32900, desc: "Doce alitas crujientes bañadas en la salsa que elijas.", foto: "photo-1527477396000-e27163b481c2", papa: true },
    { nombre: "Hamburguesa Artesanal Doble", precio: 26900, desc: "Doble carne artesanal, queso, tocineta y vegetales frescos.", foto: "photo-1568901346375-23c9450c58cd", papa: true },
    { nombre: "Limonada Natural", precio: 8500, desc: "Limonada natural hecha al momento, bien fría.", foto: "photo-1621263764928-df1444c5e859", papa: false },
  ];
  const { data: prods } = await supabase
    .from("restaurante_productos")
    .insert(
      platos.map((p) => ({
        owner_id: uid,
        nombre: p.nombre,
        precio: p.precio,
        descripcion: p.desc,
        imagen_url: foto(p.foto),
        destacado: true,
        activo: true,
        tipo_negocio: "restaurante",
      })),
    )
    .select("id,nombre,precio");
  if (!prods) return;

  const opciones = prods.flatMap((p, i) => {
    if (!platos[i].papa) return [];
    return [
      { owner_id: uid, producto_id: p.id, grupo: "Tipo de papa", nombre: "Papa amarilla", obligatorio: true, multiple: false, precio_extra: 0 },
      { owner_id: uid, producto_id: p.id, grupo: "Tipo de papa", nombre: "Papa francesa", obligatorio: true, multiple: false, precio_extra: 0 },
      { owner_id: uid, producto_id: p.id, grupo: "Salsas", nombre: "BBQ", obligatorio: false, multiple: true, precio_extra: 0 },
      { owner_id: uid, producto_id: p.id, grupo: "Salsas", nombre: "Ajo", obligatorio: false, multiple: true, precio_extra: 0 },
      { owner_id: uid, producto_id: p.id, grupo: "Salsas", nombre: "Piña", obligatorio: false, multiple: true, precio_extra: 500 },
    ];
  });
  if (opciones.length > 0) await supabase.from("restaurante_producto_opciones").insert(opciones);

  const pedidos = [
    { cliente_nombre: "Laura Gómez", cliente_telefono: "3001112233", estado: "entregado", metodo_pago: "efectivo", items: [[0, 1], [3, 2]], horas: 5 },
    { cliente_nombre: "Andrés Ruiz", cliente_telefono: "3004445566", estado: "entregado", metodo_pago: "nequi", items: [[2, 2]], horas: 3 },
    { cliente_nombre: "Camila Torres", cliente_telefono: "3007778899", estado: "nuevo", metodo_pago: "nequi", items: [[1, 1], [3, 1]], horas: 1 },
  ];
  for (const ped of pedidos) {
    const total = ped.items.reduce((s, [i, c]) => s + prods[i].precio * c, 0);
    const { data: creado } = await supabase
      .from("restaurante_pedidos")
      .insert({
        owner_id: uid,
        cliente_nombre: ped.cliente_nombre,
        cliente_telefono: ped.cliente_telefono,
        estado: ped.estado,
        metodo_pago: ped.metodo_pago,
        modalidad: "recoger",
        total,
        created_at: haceHoras(ped.horas),
      })
      .select("id")
      .single();
    if (creado) {
      await supabase.from("restaurante_pedido_items").insert(
        ped.items.map(([i, c]) => ({
          pedido_id: creado.id,
          producto_id: prods[i].id,
          nombre: prods[i].nombre,
          cantidad: c,
          precio_unitario: prods[i].precio,
        })),
      );
    }
  }
}

async function sembrar(tipo: TipoDemo, uid: string) {
  if (tipo === "vehiculos") await sembrarVehiculos(uid);
  else await sembrarRestaurante(uid);
  window.dispatchEvent(new Event("negocio:cambio"));
}

/** Crea la cuenta demo si no existe, inicia sesión sin pedir clave y carga los datos de prueba. */
export async function entrarDemo(tipo: TipoDemo): Promise<void> {
  const email = CORREO_DEMO[tipo];
  try {
    localStorage.setItem("gosaly:recordarme", "1");
    sessionStorage.setItem("gosaly:sesion_activa", "1");
  } catch {
    /* almacenamiento bloqueado */
  }
  let { data, error } = await supabase.auth.signInWithPassword({ email, password: CLAVE_DEMO });
  if (error || !data.session) {
    const reg = await supabase.auth.signUp({ email, password: CLAVE_DEMO });
    if (reg.error && !/already|registered/i.test(reg.error.message)) throw reg.error;
    const intento = await supabase.auth.signInWithPassword({ email, password: CLAVE_DEMO });
    data = intento.data;
    error = intento.error;
  }
  if (error || !data.session) {
    throw new Error("No se pudo abrir la demo en este momento. Inténtalo de nuevo en unos minutos.");
  }
  // La demo nunca pasa por «Cuéntanos de tu negocio»: se marca como configurada.
  try {
    const uid = data.session.user.id;
    const ahora = new Date().toISOString();
    await supabase.from("profiles").update({ onboarded_at: ahora }).eq("id", uid);
    markOnboarded(uid, ahora);
  } catch {
    /* no bloquea la entrada */
  }
  // Cada visitante entra siempre con los datos iniciales impecables.
  await restaurarDemo(tipo);
}

/** Borra solo los datos de prueba de esta cuenta demo y vuelve a cargar los iniciales. */
export async function restaurarDemo(tipo: TipoDemo): Promise<void> {
  const { data } = await supabase.auth.getUser();
  const uid = data.user?.id;
  if (!uid || !esCuentaDemo(data.user?.email)) return;
  // No se borra nada: la carga de la base repone lo que falte (y los pedidos del día
  // cuando aún no hay ninguno hoy), así la demo nunca queda vacía.
  await sembrar(tipo, uid);
}
