import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FotoPrivada } from "@/components/vehiculos/FotoPrivada";
import { migrarFotosAntiguas, subirFotoPrivada, urlsFirmadas } from "@/lib/fotos-vehiculos";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Car, Eye, FileText, ImagePlus, LayoutGrid, Pencil, Table2, Trash2, X } from "lucide-react";
import { usePermisosVehiculos } from "@/hooks/use-permisos-vehiculos";
import { FichaVehiculo, PROCEDENCIAS, calcularCostos } from "@/components/vehiculos/FichaVehiculo";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { useNegocio } from "@/hooks/use-negocio";

type Vehiculo = Tables<"vehiculos_inventario">;

const dinero = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const campo =
  "w-full rounded-lg border border-glass-border bg-glass/40 px-3 py-2.5 text-base text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/50";

const ESTADOS = [
  { clave: "ingreso", texto: "Ingreso" },
  { clave: "inspeccion", texto: "Inspección" },
  { clave: "alistamiento", texto: "Alistamiento" },
  { clave: "disponible", texto: "Disponible" },
  { clave: "separado", texto: "Reservado" },
  { clave: "vendido", texto: "Vendido" },
  { clave: "entregado", texto: "Entregado" },
  { clave: "retirado", texto: "Retirado" },
];
const errorLegible = (msg: string, defecto: string): string => {
  if (msg.includes("vehiculos_placa_unica_idx")) return "Ya existe un vehículo con esa placa.";
  if (msg.includes("vehiculos_vin_unico_idx")) return "Ya existe un vehículo con ese VIN.";
  if (msg.includes("PLACA_DUPLICADA")) return "Ya existe un vehículo con esa placa.";
  if (msg.includes("VIN_DUPLICADO")) return "Ya existe un vehículo con ese VIN.";
  if (msg.includes("SIN_PERMISO_ESTADOS")) return "No tienes permiso para cambiar estados.";
  if (msg.includes("SIN_PERMISO_PRECIOS")) return "No tienes permiso para modificar precios.";
  if (msg.includes("SIN_PERMISO_RETIRAR")) return "No tienes permiso para retirar vehículos.";
  if (msg.includes("SIN_PERMISO_EDITAR")) return "No tienes permiso para editar vehículos.";
  if (msg.toLowerCase().includes("row-level security")) return "No tienes permiso para esta acción.";
  return defecto;
};
const textoEstado = (c: string) => ESTADOS.find((e) => e.clave === c)?.texto ?? c;
const hoyISO = () => new Date().toISOString().slice(0, 10);

type Form = {
  linea: string; chasis: string; procedencia: string; propietario_nombre: string; propietario_documento: string;
  propietario_telefono: string; propietario_email: string; fecha_ingreso: string; precio_venta_final: string;
  tipo: string; condicion: string; estado: string; marca: string; modelo: string; version: string;
  anio: string; placa: string; color: string; kilometraje: string; combustible: string; transmision: string;
  cilindraje: string; carroceria: string; puertas: string; traccion: string; ciudad_matricula: string;
  num_propietarios: string; vin: string; motor_numero: string; precio: string; precio_compra: string;
  soat_vence: string; tecnomecanica_vence: string; equipamiento: string; observaciones: string;
};

const VACIO: Form = {
  linea: "", chasis: "", procedencia: "compra", propietario_nombre: "", propietario_documento: "",
  propietario_telefono: "", propietario_email: "", fecha_ingreso: "", precio_venta_final: "",
  tipo: "carro", condicion: "usado", estado: "disponible", marca: "", modelo: "", version: "",
  anio: "", placa: "", color: "", kilometraje: "", combustible: "", transmision: "",
  cilindraje: "", carroceria: "", puertas: "", traccion: "", ciudad_matricula: "",
  num_propietarios: "", vin: "", motor_numero: "", precio: "", precio_compra: "",
  soat_vence: "", tecnomecanica_vence: "", equipamiento: "", observaciones: "",
};

const num = (s: string): number | null => {
  if (!s.trim()) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};
const txt = (s: string): string | null => (s.trim() ? s.trim() : null);

const esc = (s: string | number | null | undefined): string =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

export function InventarioVehiculos() {
  const { negocio } = useNegocio();
  const perm = usePermisosVehiculos();
  const [verRetirados, setVerRetirados] = useState(false);
  const [lista, setLista] = useState<Vehiculo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState<Form>(VACIO);
  const [fotos, setFotos] = useState<string[]>([]);
  const [editando, setEditando] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [busca, setBusca] = useState("");
  const [fTipo, setFTipo] = useState("todos");
  const [fEstado, setFEstado] = useState("todos");
  const [fMarca, setFMarca] = useState("todas");
  const [fModelo, setFModelo] = useState("todos");
  const [fProc, setFProc] = useState("todas");
  const [fDisp, setFDisp] = useState("todos");
  const [vista, setVista] = useState<"tarjetas" | "tabla">("tarjetas");
  const [gastosPorVeh, setGastosPorVeh] = useState<Record<string, number>>({});
  const [ficha, setFicha] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const [{ data, error }, g, co] = await Promise.all([
      supabase.from("vehiculos_inventario").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("vehiculo_gastos").select("vehiculo_id, monto").limit(5000),
      supabase.from("vehiculo_costos").select("vehiculo_id, precio_compra").limit(5000),
    ]);
    if (error) toast.error("No se pudo cargar el inventario.");
    // El precio de adquisición vive en una tabla aparte: la base solo lo entrega a quien tiene permiso de costos.
    const costos = new Map<string, number | null>();
    for (const c of co.data ?? []) costos.set(c.vehiculo_id, c.precio_compra);
    setLista((data ?? []).map((v) => ({ ...v, precio_compra: costos.get(v.id) ?? null })));
    const mapa: Record<string, number> = {};
    for (const x of g.data ?? []) mapa[x.vehiculo_id] = (mapa[x.vehiculo_id] ?? 0) + x.monto;
    setGastosPorVeh(mapa);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const set = (k: keyof Form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const subirFotos = async (archivos: FileList | null) => {
    if (!archivos || archivos.length === 0) return;
    setSubiendo(true);
    const nuevas: string[] = [];
    const { data: negocioId } = await supabase.rpc("mi_negocio_id");
    if (!negocioId) { toast.error("No se pudo identificar tu negocio."); setSubiendo(false); return; }
    for (const archivo of Array.from(archivos)) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(archivo.type)) { toast.error(`${archivo.name}: usa JPG, PNG o WEBP.`); continue; }
      if (archivo.size > 4 * 1024 * 1024) { toast.error(`${archivo.name} pesa más de 4 MB.`); continue; }
      const ruta = await subirFotoPrivada(archivo, negocioId, "nuevos");
      if (!ruta) { toast.error("No se pudo subir una foto."); continue; }
      nuevas.push(ruta);
    }
    setFotos((f) => [...f, ...nuevas]);
    setSubiendo(false);
  };

  const limpiar = () => {
    setForm(VACIO);
    setFotos([]);
    setEditando(null);
  };

  const guardar = async () => {
    const precio = num(form.precio);
    if (editando ? !perm.editar && !perm.estados && !perm.precios : !perm.crear)
      return toast.error(editando ? "No tienes permiso para editar vehículos." : "No tienes permiso para crear vehículos.");
    if (!form.marca.trim() || !form.modelo.trim()) return toast.error("Escribe la marca y el modelo.");
    if (precio === null || precio < 0) return toast.error("Escribe un precio válido.");
    const placaN = txt(form.placa)?.toUpperCase().replace(/[\s-]/g, "") ?? null;
    const vinN = txt(form.vin)?.toUpperCase().replace(/\s/g, "") ?? null;
    if (placaN && !/^[A-Z0-9]{5,7}$/.test(placaN)) return toast.error("La placa debe tener entre 5 y 7 letras o números.");
    if (vinN && !/^[A-Z0-9]{8,20}$/.test(vinN)) return toast.error("El VIN debe tener entre 8 y 20 letras o números (sin I, O ni Q en un VIN estándar de 17).");
    if (placaN && lista.some((x) => x.id !== editando && !x.eliminado_en && (x.placa ?? "").toUpperCase().replace(/[\s-]/g, "") === placaN))
      return toast.error("Ya existe un vehículo con esa placa.");
    if (vinN && lista.some((x) => x.id !== editando && !x.eliminado_en && (x.vin ?? "").toUpperCase().replace(/\s/g, "") === vinN))
      return toast.error("Ya existe un vehículo con ese VIN.");
    if (form.procedencia === "consignacion" && !form.propietario_nombre.trim())
      return toast.error("Un vehículo en consignación necesita los datos del propietario.");
    const finalVenta = num(form.precio_venta_final);
    if ((form.estado === "vendido" || form.estado === "entregado") && finalVenta === null)
      return toast.error("Escribe el precio final de venta para calcular la utilidad real.");
    const previo = editando ? lista.find((x) => x.id === editando) : undefined;
    setGuardando(true);
    const datos = {
      linea: txt(form.linea), chasis: txt(form.chasis), procedencia: form.procedencia,
      propietario_nombre: txt(form.propietario_nombre), propietario_documento: txt(form.propietario_documento),
      propietario_telefono: txt(form.propietario_telefono), propietario_email: txt(form.propietario_email),
      fecha_ingreso: form.fecha_ingreso || (editando ? previo?.fecha_ingreso ?? null : hoyISO()),
      precio_venta_final: finalVenta,
      fecha_venta: form.estado === "vendido" || form.estado === "entregado" ? previo?.fecha_venta ?? hoyISO() : null,
      tipo: form.tipo, condicion: form.condicion, estado: form.estado,
      marca: form.marca.trim(), modelo: form.modelo.trim(), version: txt(form.version),
      anio: num(form.anio), placa: placaN, color: txt(form.color),
      kilometraje: num(form.kilometraje), combustible: txt(form.combustible), transmision: txt(form.transmision),
      cilindraje: txt(form.cilindraje), carroceria: txt(form.carroceria), puertas: num(form.puertas),
      traccion: txt(form.traccion), ciudad_matricula: txt(form.ciudad_matricula),
      num_propietarios: num(form.num_propietarios), vin: vinN, motor_numero: txt(form.motor_numero),
      precio,
      soat_vence: form.soat_vence || null, tecnomecanica_vence: form.tecnomecanica_vence || null,
      equipamiento: txt(form.equipamiento), observaciones: txt(form.observaciones), fotos,
    };
    let vehiculoId = editando;
    let error: { message: string } | null = null;
    if (editando) {
      error = (await supabase.from("vehiculos_inventario").update(datos).eq("id", editando)).error;
    } else {
      const r = await supabase.from("vehiculos_inventario").insert(datos).select("id").single();
      error = r.error;
      vehiculoId = r.data?.id ?? null;
    }
    if (error) {
      setGuardando(false);
      return toast.error(errorLegible(error.message, "No se pudo guardar el vehículo."));
    }
    // Precio de adquisición: tabla protegida, solo con permiso de precios y de costos.
    const compra = num(form.precio_compra);
    if (vehiculoId && perm.precios && perm.costos && compra !== (previo?.precio_compra ?? null) && (compra !== null || previo)) {
      const { error: eC } = await supabase.from("vehiculo_costos").upsert({ vehiculo_id: vehiculoId, precio_compra: compra });
      if (eC) toast.error("El vehículo se guardó, pero no se pudo guardar el precio de adquisición.");
    }
    setGuardando(false);
    toast.success(editando ? "Vehículo actualizado." : "Vehículo guardado.");
    limpiar();
    cargar();
  };

  const editar = (v: Vehiculo) => {
    const s = (x: string | number | null) => (x === null || x === undefined ? "" : String(x));
    setForm({
      linea: s(v.linea), chasis: s(v.chasis), procedencia: v.procedencia, propietario_nombre: s(v.propietario_nombre),
      propietario_documento: s(v.propietario_documento), propietario_telefono: s(v.propietario_telefono),
      propietario_email: s(v.propietario_email), fecha_ingreso: s(v.fecha_ingreso), precio_venta_final: s(v.precio_venta_final),
      tipo: v.tipo, condicion: v.condicion, estado: v.estado, marca: v.marca, modelo: v.modelo, version: s(v.version),
      anio: s(v.anio), placa: s(v.placa), color: s(v.color), kilometraje: s(v.kilometraje),
      combustible: s(v.combustible), transmision: s(v.transmision), cilindraje: s(v.cilindraje),
      carroceria: s(v.carroceria), puertas: s(v.puertas), traccion: s(v.traccion),
      ciudad_matricula: s(v.ciudad_matricula), num_propietarios: s(v.num_propietarios), vin: s(v.vin),
      motor_numero: s(v.motor_numero), precio: s(v.precio), precio_compra: s(v.precio_compra),
      soat_vence: s(v.soat_vence), tecnomecanica_vence: s(v.tecnomecanica_vence),
      equipamiento: s(v.equipamiento), observaciones: s(v.observaciones),
    });
    setFotos(v.fotos ?? []);
    setEditando(v.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cambiarEstado = async (v: Vehiculo, estado: string) => {
    if ((estado === "vendido" || estado === "entregado") && v.precio_venta_final === null) {
      toast.error("Para marcarlo como vendido, edita el vehículo y escribe el precio final de venta.");
      editar({ ...v, estado });
      return;
    }
    const cambios = {
      estado,
      fecha_venta: estado === "vendido" || estado === "entregado" ? v.fecha_venta ?? hoyISO() : null,
    };
    const { error } = await supabase.from("vehiculos_inventario").update(cambios).eq("id", v.id);
    if (error) return toast.error(errorLegible(error.message, "No se pudo actualizar."));
    cargar();
  };

  const borrar = async (v: Vehiculo) => {
    if (!perm.retirar) return toast.error("No tienes permiso para retirar vehículos.");
    const motivo = window.prompt(
      `Retirar ${v.marca} ${v.modelo} del inventario.\nSus gastos, documentos e historial se conservan. ¿Cuál es el motivo?`,
      "",
    );
    if (motivo === null) return;
    const { error } = await supabase
      .from("vehiculos_inventario")
      .update({ eliminado_en: new Date().toISOString(), motivo_retiro: motivo.trim() || null, estado: "retirado" })
      .eq("id", v.id);
    if (error) return toast.error(errorLegible(error.message, "No se pudo retirar el vehículo."));
    toast.success("Vehículo retirado. Puedes verlo con “Mostrar retirados”.");
    cargar();
  };

  const reingresar = async (v: Vehiculo) => {
    if (!perm.retirar) return toast.error("No tienes permiso para reingresar vehículos.");
    const { error } = await supabase
      .from("vehiculos_inventario")
      .update({ eliminado_en: null, motivo_retiro: null, estado: "ingreso" })
      .eq("id", v.id);
    if (error) return toast.error(errorLegible(error.message, "No se pudo reingresar el vehículo."));
    toast.success("Vehículo reingresado al inventario.");
    cargar();
  };

  const marcas = useMemo(() => Array.from(new Set(lista.map((v) => v.marca))).sort(), [lista]);

  const modelos = useMemo(
    () => Array.from(new Set(lista.filter((v) => fMarca === "todas" || v.marca === fMarca).map((v) => v.modelo))).sort(),
    [lista, fMarca],
  );

  const visibles = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return lista.filter((v) => {
      if (!verRetirados && v.eliminado_en) return false;
      if (fTipo !== "todos" && v.tipo !== fTipo) return false;
      if (fEstado !== "todos" && v.estado !== fEstado) return false;
      if (fMarca !== "todas" && v.marca !== fMarca) return false;
      if (fModelo !== "todos" && v.modelo !== fModelo) return false;
      if (fProc !== "todas" && v.procedencia !== fProc) return false;
      if (fDisp === "venta" && !(v.estado === "disponible")) return false;
      if (fDisp === "no_disponible" && v.estado === "disponible") return false;
      if (!q) return true;
      return [v.marca, v.modelo, v.linea, v.version, v.placa, v.vin, v.chasis, v.motor_numero, v.color, v.anio].some((x) => String(x ?? "").toLowerCase().includes(q));
    });
  }, [lista, busca, fTipo, fEstado, fMarca, fModelo, fProc, fDisp, verRetirados]);

  const fichaVeh = ficha ? lista.find((v) => v.id === ficha) ?? null : null;

  const disponibles = lista.filter((v) => v.estado === "disponible" && !v.eliminado_en);
  const valorDisponible = disponibles.reduce((s, v) => s + v.precio, 0);

  // Fotos antiguas públicas: se pasan solas al almacenamiento privado cuando abre quien puede editar.
  const migrado = useRef(false);
  useEffect(() => {
    if (migrado.current || cargando || perm.cargando || !perm.editar) return;
    const pendientes = lista.filter((v) => (v.fotos ?? []).some((f) => /^https?:\/\/.*\/object\/public\/negocios\//i.test(f)));
    migrado.current = true;
    if (pendientes.length === 0) return;
    (async () => {
      const { data: negocioId } = await supabase.rpc("mi_negocio_id");
      if (!negocioId) return;
      let alguno = false;
      for (const v of pendientes) {
        const nuevas = await migrarFotosAntiguas(v.id, v.fotos ?? [], negocioId);
        if (nuevas) alguno = true;
      }
      if (alguno) cargar();
    })();
  }, [lista, cargando, perm.cargando, perm.editar, cargar]);

  const generarCatalogo = async () => {
    const base = visibles.filter((v) => v.estado === "disponible" || v.estado === "separado");
    if (base.length === 0) return toast.error("No hay vehículos disponibles para el catálogo.");
    const w = window.open("", "_blank");
    if (!w) return toast.error("Permite las ventanas emergentes para generar el PDF.");
    const color = negocio?.color_principal && /^#[0-9a-f]{6}$/i.test(negocio.color_principal) ? negocio.color_principal : "#0e7490";
    const nombre = negocio?.nombre || "Catálogo de vehículos";
    const contacto = [negocio?.telefono_pedidos, negocio?.instagram, negocio?.sitio_web, negocio?.ciudad].filter(Boolean).join("  ·  ");
    const fecha = new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });
    const tarjetas = (await Promise.all(base.map(async (v) => {
      const datos: [string, string | number | null][] = [
        ["Año", v.anio], ["Kilometraje", v.kilometraje !== null ? `${v.kilometraje.toLocaleString("es-CO")} km` : null],
        ["Color", v.color], ["Combustible", v.combustible], ["Transmisión", v.transmision],
        ["Cilindraje", v.cilindraje], ["Carrocería", v.carroceria], ["Puertas", v.puertas],
        ["Tracción", v.traccion], ["Placa termina en", v.placa ? v.placa.slice(-1) : null],
        ["Matriculado en", v.ciudad_matricula], ["Propietarios", v.num_propietarios],
      ];
      const filas = datos.filter(([, x]) => x !== null && x !== "")
        .map(([k, x]) => `<tr><td>${esc(k)}</td><td>${esc(x)}</td></tr>`).join("");
      const imgs = (await urlsFirmadas((v.fotos ?? []).slice(0, 3))).filter((u): u is string => !!u);
      const principal = imgs[0] ? `<img class="principal" src="${esc(imgs[0])}" alt="">` : `<div class="sinfoto">Sin foto</div>`;
      const extra = imgs.slice(1).map((u) => `<img src="${esc(u)}" alt="">`).join("");
      return `<section class="tarjeta">
        <div class="fotos">${principal}<div class="mini">${extra}</div></div>
        <div class="info">
          <div class="etq">${v.tipo === "moto" ? "Moto" : "Carro"} · ${v.condicion === "nuevo" ? "Nuevo" : "Usado"}</div>
          <h2>${esc(v.marca)} ${esc(v.modelo)} ${esc(v.version)}</h2>
          <div class="precio">${esc(dinero(v.precio))}</div>
          <table>${filas}</table>
          ${v.equipamiento ? `<p><b>Equipamiento:</b> ${esc(v.equipamiento)}</p>` : ""}
          ${v.observaciones ? `<p>${esc(v.observaciones)}</p>` : ""}
        </div></section>`;
    }))).join("");
    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Catálogo - ${esc(nombre)}</title>
<style>
@page{size:A4;margin:14mm}
*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:0}
header{display:flex;align-items:center;gap:16px;border-bottom:4px solid ${color};padding-bottom:12px;margin-bottom:16px}
header img{max-height:60px;max-width:140px;object-fit:contain}
header h1{margin:0;font-size:26px;color:${color}}header p{margin:2px 0 0;font-size:12px;color:#555}
.tarjeta{display:flex;gap:16px;border:1px solid #ddd;border-radius:10px;padding:12px;margin-bottom:14px;break-inside:avoid}
.fotos{width:46%}.principal{width:100%;height:170px;object-fit:cover;border-radius:8px}
.sinfoto{height:170px;background:#eee;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#888}
.mini{display:flex;gap:6px;margin-top:6px}.mini img{width:calc(50% - 3px);height:60px;object-fit:cover;border-radius:6px}
.info{flex:1}.etq{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:${color};font-weight:bold}
h2{margin:2px 0;font-size:18px}.precio{font-size:22px;font-weight:bold;color:${color};margin-bottom:6px}
table{border-collapse:collapse;width:100%;font-size:12px}td{padding:2px 4px;border-bottom:1px solid #eee}td:first-child{color:#666;width:42%}
p{font-size:12px;margin:6px 0 0}
footer{text-align:center;font-size:11px;color:#666;margin-top:10px;border-top:1px solid #ddd;padding-top:8px}
</style></head><body>
<header>${negocio?.logo_url ? `<img src="${esc(negocio.logo_url)}" alt="">` : ""}<div><h1>${esc(nombre)}</h1>
<p>${esc(negocio?.eslogan || "Catálogo de vehículos")} · ${esc(fecha)}</p></div></header>
${tarjetas}
<footer>${esc(contacto)}<br>Precios y disponibilidad sujetos a cambio sin previo aviso.</footer>
<script>window.onload=function(){setTimeout(function(){window.print()},600)}</script>
</body></html>`;
    w.document.open();
    w.document.write(html);
    w.document.close();
    toast.success("En la ventana que se abrió elige “Guardar como PDF”.");
  };

  const chip = (activo: boolean) =>
    `rounded-full border px-3 py-1.5 text-sm ${activo ? "border-primary bg-primary text-primary-foreground" : "border-glass-border text-muted-foreground"}`;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link to="/restaurante" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowLeft className="h-3 w-3" /> Volver al panel
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="flex items-center gap-2 font-display text-3xl text-foreground">
            <Car className="h-7 w-7 text-primary" /> Inventario de vehículos
          </h1>
          <button onClick={generarCatalogo} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">
            <FileText className="h-4 w-4" /> Generar catálogo PDF
          </button>
        </div>
        <p className="text-sm text-muted-foreground">Carros y motos con todos sus datos y fotos. El catálogo usa el nombre, logo y colores de tu negocio.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <GlassPanel className="p-4"><p className="text-xs text-muted-foreground">Vehículos</p><p className="text-lg font-medium text-foreground">{lista.length}</p></GlassPanel>
        <GlassPanel className="p-4"><p className="text-xs text-muted-foreground">Disponibles</p><p className="text-lg font-medium text-foreground">{disponibles.length}</p></GlassPanel>
        <GlassPanel className="p-4"><p className="text-xs text-muted-foreground">Valor disponible</p><p className="truncate text-lg font-medium text-foreground">{dinero(valorDisponible)}</p></GlassPanel>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <GlassPanel className="h-fit space-y-3 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-foreground">{editando ? "Editar vehículo" : "Nuevo vehículo"}</h2>
            {editando && <button onClick={limpiar} className="text-xs text-primary">Cancelar edición</button>}
          </div>
          <label className="block space-y-1"><span className="text-xs text-muted-foreground">Procedencia</span>
            <select className={campo} value={form.procedencia} onChange={(e) => set("procedencia", e.target.value)}>
              {Object.entries(PROCEDENCIAS).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
            </select></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1"><span className="text-xs text-muted-foreground">Tipo</span>
              <select className={campo} value={form.tipo} onChange={(e) => set("tipo", e.target.value)}>
                <option value="carro">Carro</option><option value="moto">Moto</option>
              </select></label>
            <label className="space-y-1"><span className="text-xs text-muted-foreground">Condición</span>
              <select className={campo} value={form.condicion} onChange={(e) => set("condicion", e.target.value)}>
                <option value="nuevo">Nuevo</option><option value="usado">Usado</option>
              </select></label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input className={campo} placeholder="Marca *" value={form.marca} onChange={(e) => set("marca", e.target.value)} />
            <input className={campo} placeholder="Modelo / línea *" value={form.modelo} onChange={(e) => set("modelo", e.target.value)} />
            <input className={campo} placeholder="Línea" value={form.linea} onChange={(e) => set("linea", e.target.value)} />
            <input className={campo} placeholder="Versión" value={form.version} onChange={(e) => set("version", e.target.value)} />
            <input className={campo} placeholder="Año" inputMode="numeric" value={form.anio} onChange={(e) => set("anio", e.target.value)} />
            <input className={campo} placeholder="Placa" value={form.placa} onChange={(e) => set("placa", e.target.value)} />
            <input className={campo} placeholder="Color" value={form.color} onChange={(e) => set("color", e.target.value)} />
            <input className={campo} placeholder="Kilometraje" inputMode="numeric" value={form.kilometraje} onChange={(e) => set("kilometraje", e.target.value)} />
            <input className={campo} placeholder={form.tipo === "moto" ? "Cilindraje (cc)" : "Cilindraje"} value={form.cilindraje} onChange={(e) => set("cilindraje", e.target.value)} />
            <select className={campo} value={form.combustible} onChange={(e) => set("combustible", e.target.value)}>
              <option value="">Combustible</option><option>Gasolina</option><option>Diésel</option><option>Híbrido</option><option>Eléctrico</option><option>Gas</option>
            </select>
            <select className={campo} value={form.transmision} onChange={(e) => set("transmision", e.target.value)}>
              <option value="">Transmisión</option><option>Mecánica</option><option>Automática</option><option>Semiautomática</option>
            </select>
            <input className={campo} placeholder={form.tipo === "moto" ? "Tipo (scooter, deportiva…)" : "Carrocería (SUV, sedán…)"} value={form.carroceria} onChange={(e) => set("carroceria", e.target.value)} />
            {form.tipo === "carro" && <input className={campo} placeholder="Puertas" inputMode="numeric" value={form.puertas} onChange={(e) => set("puertas", e.target.value)} />}
            {form.tipo === "carro" && <input className={campo} placeholder="Tracción (4x2, 4x4…)" value={form.traccion} onChange={(e) => set("traccion", e.target.value)} />}
            <input className={campo} placeholder="Ciudad de matrícula" value={form.ciudad_matricula} onChange={(e) => set("ciudad_matricula", e.target.value)} />
            <input className={campo} placeholder="N.º de propietarios" inputMode="numeric" value={form.num_propietarios} onChange={(e) => set("num_propietarios", e.target.value)} />
            <input className={campo} placeholder="VIN" value={form.vin} onChange={(e) => set("vin", e.target.value)} />
            <input className={campo} placeholder="N.º de chasis" value={form.chasis} onChange={(e) => set("chasis", e.target.value)} />
            <input className={campo} placeholder="N.º de motor" value={form.motor_numero} onChange={(e) => set("motor_numero", e.target.value)} />
            <input className={campo} placeholder="Precio de venta (COP) *" inputMode="decimal" value={form.precio} onChange={(e) => set("precio", e.target.value)} />
            {perm.costos && <input className={campo} placeholder="Precio de adquisición (COP)" inputMode="decimal" value={form.precio_compra} onChange={(e) => set("precio_compra", e.target.value)} />}
            <input className={campo} placeholder="Precio final de venta (COP)" inputMode="decimal" value={form.precio_venta_final} onChange={(e) => set("precio_venta_final", e.target.value)} />
            <label className="space-y-1"><span className="text-xs text-muted-foreground">Fecha de ingreso</span>
              <input className={campo} type="date" value={form.fecha_ingreso} onChange={(e) => set("fecha_ingreso", e.target.value)} /></label>
            <label className="space-y-1"><span className="text-xs text-muted-foreground">SOAT vence</span>
              <input className={campo} type="date" value={form.soat_vence} onChange={(e) => set("soat_vence", e.target.value)} /></label>
            <label className="space-y-1"><span className="text-xs text-muted-foreground">Tecnomecánica vence</span>
              <input className={campo} type="date" value={form.tecnomecanica_vence} onChange={(e) => set("tecnomecanica_vence", e.target.value)} /></label>
          </div>
          <label className="space-y-1 block"><span className="text-xs text-muted-foreground">Estado</span>
            <select className={campo} value={form.estado} onChange={(e) => set("estado", e.target.value)}>
              {ESTADOS.map((e) => <option key={e.clave} value={e.clave}>{e.texto}</option>)}
            </select></label>
          <div className="space-y-2">
            <span className="text-xs text-muted-foreground">Propietario {form.procedencia === "consignacion" ? "(obligatorio en consignación)" : "o vendedor anterior"}</span>
            <div className="grid grid-cols-2 gap-3">
              <input className={campo} placeholder="Nombre" value={form.propietario_nombre} onChange={(e) => set("propietario_nombre", e.target.value)} />
              <input className={campo} placeholder="Documento" value={form.propietario_documento} onChange={(e) => set("propietario_documento", e.target.value)} />
              <input className={campo} placeholder="Teléfono" inputMode="tel" value={form.propietario_telefono} onChange={(e) => set("propietario_telefono", e.target.value)} />
              <input className={campo} placeholder="Correo" type="email" value={form.propietario_email} onChange={(e) => set("propietario_email", e.target.value)} />
            </div>
          </div>
          <textarea className={campo} rows={2} placeholder="Equipamiento (aire, cámara, ABS, rines…)" value={form.equipamiento} onChange={(e) => set("equipamiento", e.target.value)} />
          <textarea className={campo} rows={2} placeholder="Observaciones" value={form.observaciones} onChange={(e) => set("observaciones", e.target.value)} />

          <div className="space-y-2">
            <span className="text-xs text-muted-foreground">Fotos (la primera es la principal)</span>
            <div className="flex flex-wrap gap-2">
              {fotos.map((u, i) => (
                <div key={u} className="relative">
                  <FotoPrivada valor={u} className="h-20 w-20 rounded-lg object-cover" />
                  <button type="button" onClick={() => setFotos((f) => f.filter((_, j) => j !== i))} className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-destructive-foreground" aria-label="Quitar foto">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-glass-border text-xs text-muted-foreground">
                <ImagePlus className="h-5 w-5" />{subiendo ? "Subiendo…" : "Subir"}
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" disabled={subiendo} onChange={(e) => { subirFotos(e.target.files); e.target.value = ""; }} />
              </label>
            </div>
          </div>

          <button onClick={guardar} disabled={guardando || subiendo} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
            {guardando ? "Guardando…" : editando ? "Guardar cambios" : "Guardar vehículo"}
          </button>
        </GlassPanel>

        <div className="min-w-0 space-y-3">
          <input className={campo} placeholder="Buscar por placa, VIN, marca, modelo, motor o color" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <select className={campo} value={fProc} onChange={(e) => setFProc(e.target.value)}>
              <option value="todas">Toda procedencia</option>
              {Object.entries(PROCEDENCIAS).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
            </select>
            <select className={campo} value={fDisp} onChange={(e) => setFDisp(e.target.value)}>
              <option value="todos">Toda disponibilidad</option>
              <option value="venta">En venta ahora</option>
              <option value="no_disponible">No disponible</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setVista("tarjetas")} className={`${chip(vista === "tarjetas")} inline-flex items-center gap-1.5`}><LayoutGrid className="h-4 w-4" /> Tarjetas</button>
            <label className="ml-auto inline-flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={verRetirados} onChange={(e) => setVerRetirados(e.target.checked)} /> Mostrar retirados
            </label>
            <button onClick={() => setVista("tabla")} className={`${chip(vista === "tabla")} inline-flex items-center gap-1.5`}><Table2 className="h-4 w-4" /> Tabla</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {[{ c: "todos", t: "Todos" }, { c: "carro", t: "Carros" }, { c: "moto", t: "Motos" }].map((x) => (
              <button key={x.c} onClick={() => setFTipo(x.c)} className={chip(fTipo === x.c)}>{x.t}</button>
            ))}
            <span className="mx-1 w-px bg-glass-border" />
            {[{ clave: "todos", texto: "Cualquier estado" }, ...ESTADOS].map((x) => (
              <button key={x.clave} onClick={() => setFEstado(x.clave)} className={chip(fEstado === x.clave)}>{x.texto}</button>
            ))}
          </div>
          {marcas.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              <select className={campo} value={fMarca} onChange={(e) => { setFMarca(e.target.value); setFModelo("todos"); }}>
                <option value="todas">Todas las marcas</option>
                {marcas.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <select className={campo} value={fModelo} onChange={(e) => setFModelo(e.target.value)}>
                <option value="todos">Todos los modelos</option>
                {modelos.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          )}

          {cargando && <p className="text-sm text-muted-foreground">Cargando inventario…</p>}
          {!cargando && visibles.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay vehículos con esos filtros.</p>}

          {vista === "tabla" && visibles.length > 0 && (
            <GlassPanel className="overflow-x-auto p-0">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="p-3">Vehículo</th><th className="p-3">Placa</th><th className="p-3">Procedencia</th>
                    <th className="p-3">Estado</th><th className="p-3">Costo</th><th className="p-3">Precio</th><th className="p-3">Utilidad</th><th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((v) => {
                    const c = calcularCostos(v, gastosPorVeh[v.id] ?? 0);
                    return (
                      <tr key={v.id} className="border-t border-glass-border text-foreground">
                        <td className="p-3">{v.marca} {v.modelo} {v.anio ?? ""}</td>
                        <td className="p-3">{v.placa ?? "—"}</td>
                        <td className="p-3">{PROCEDENCIAS[v.procedencia] ?? v.procedencia}</td>
                        <td className="p-3">{textoEstado(v.estado)}</td>
                        <td className="p-3">{perm.costos ? dinero(c.costoTotal) : "—"}</td>
                        <td className="p-3">{dinero(c.vendido ? v.precio_venta_final ?? v.precio : v.precio)}</td>
                        <td className={`p-3 ${c.utilidad < 0 ? "text-destructive" : ""}`}>{perm.costos ? dinero(c.utilidad) : "—"}</td>
                        <td className="p-3"><button onClick={() => setFicha(v.id)} className="text-primary">Ficha</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </GlassPanel>
          )}

          {vista === "tarjetas" && visibles.map((v) => (
            <GlassPanel key={v.id} className="flex flex-wrap gap-3 p-4">
              {v.fotos?.[0] ? (
                <FotoPrivada valor={v.fotos[0]} className="h-24 w-32 rounded-lg object-cover" />
              ) : (
                <div className="flex h-24 w-32 items-center justify-center rounded-lg bg-glass/40 text-xs text-muted-foreground">Sin foto</div>
              )}
              <div className="min-w-0 flex-1 space-y-1">
                <p className="break-words font-medium text-foreground">
                  {v.marca} {v.modelo} {v.version ?? ""} {v.anio ?? ""}
                </p>
                <p className="break-words text-xs text-muted-foreground">
                  {v.tipo === "moto" ? "Moto" : "Carro"} · {v.condicion === "nuevo" ? "Nuevo" : "Usado"}
                  {v.placa ? ` · ${v.placa}` : ""}{v.color ? ` · ${v.color}` : ""}
                  {v.kilometraje !== null ? ` · ${v.kilometraje.toLocaleString("es-CO")} km` : ""}
                  {v.transmision ? ` · ${v.transmision}` : ""}{v.combustible ? ` · ${v.combustible}` : ""}
                </p>
                <p className="text-sm font-medium text-foreground">{dinero(v.precio)}</p>
                <p className="text-xs text-muted-foreground">
                  {PROCEDENCIAS[v.procedencia] ?? v.procedencia}
                  {perm.costos && (
                    <>
                      {" "}· Costo {dinero(calcularCostos(v, gastosPorVeh[v.id] ?? 0).costoTotal)} ·{" "}
                      {calcularCostos(v, gastosPorVeh[v.id] ?? 0).vendido ? "Utilidad" : "Utilidad proyectada"} {dinero(calcularCostos(v, gastosPorVeh[v.id] ?? 0).utilidad)}
                    </>
                  )}
                  {v.eliminado_en ? ` · Retirado${v.motivo_retiro ? `: ${v.motivo_retiro}` : ""}` : ""}
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button onClick={() => setFicha(v.id)} className="inline-flex items-center gap-1 text-xs text-primary"><Eye className="h-3 w-3" /> Ficha</button>
                  <select className="rounded-lg border border-glass-border bg-glass/40 px-2 py-1 text-base text-foreground" value={v.estado} disabled={!perm.estados || !!v.eliminado_en} onChange={(e) => cambiarEstado(v, e.target.value)}>
                    {ESTADOS.map((e) => <option key={e.clave} value={e.clave}>{e.texto}</option>)}
                  </select>
                  {(perm.editar || perm.precios) && !v.eliminado_en && (
                    <button onClick={() => editar(v)} className="inline-flex items-center gap-1 text-xs text-primary"><Pencil className="h-3 w-3" /> Editar</button>
                  )}
                  {perm.retirar && !v.eliminado_en && (
                    <button onClick={() => borrar(v)} className="inline-flex items-center gap-1 text-xs text-destructive"><Trash2 className="h-3 w-3" /> Retirar</button>
                  )}
                  {perm.retirar && v.eliminado_en && (
                    <button onClick={() => reingresar(v)} className="inline-flex items-center gap-1 text-xs text-primary">Reingresar</button>
                  )}
                </div>
              </div>
            </GlassPanel>
          ))}
        </div>
      </div>
      {fichaVeh && (
        <FichaVehiculo
          vehiculo={fichaVeh}
          perm={perm}
          onCerrar={() => setFicha(null)}
          onEditar={() => { const v = fichaVeh; setFicha(null); editar(v); }}
          onCambio={cargar}
          onRetirar={() => { const v = fichaVeh; setFicha(null); borrar(v); }}
        />
      )}
    </div>
  );
}
