import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Car, FileText, ImagePlus, Pencil, Trash2, X } from "lucide-react";
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
  { clave: "disponible", texto: "Disponible" },
  { clave: "separado", texto: "Separado" },
  { clave: "vendido", texto: "Vendido" },
];

type Form = {
  tipo: string; condicion: string; estado: string; marca: string; modelo: string; version: string;
  anio: string; placa: string; color: string; kilometraje: string; combustible: string; transmision: string;
  cilindraje: string; carroceria: string; puertas: string; traccion: string; ciudad_matricula: string;
  num_propietarios: string; vin: string; motor_numero: string; precio: string; precio_compra: string;
  soat_vence: string; tecnomecanica_vence: string; equipamiento: string; observaciones: string;
};

const VACIO: Form = {
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

  const cargar = useCallback(async () => {
    const { data, error } = await supabase
      .from("vehiculos_inventario")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) toast.error("No se pudo cargar el inventario.");
    setLista(data ?? []);
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
    for (const archivo of Array.from(archivos)) {
      if (!archivo.type.startsWith("image/")) { toast.error("Elige solo imágenes."); continue; }
      if (archivo.size > 4 * 1024 * 1024) { toast.error(`${archivo.name} pesa más de 4 MB.`); continue; }
      const ext = (archivo.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const ruta = `vehiculo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("negocios").upload(ruta, archivo, { upsert: true });
      if (error) { toast.error("No se pudo subir una foto."); continue; }
      nuevas.push(supabase.storage.from("negocios").getPublicUrl(ruta).data.publicUrl);
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
    if (!form.marca.trim() || !form.modelo.trim()) return toast.error("Escribe la marca y el modelo.");
    if (precio === null || precio < 0) return toast.error("Escribe un precio válido.");
    setGuardando(true);
    const datos = {
      tipo: form.tipo, condicion: form.condicion, estado: form.estado,
      marca: form.marca.trim(), modelo: form.modelo.trim(), version: txt(form.version),
      anio: num(form.anio), placa: txt(form.placa)?.toUpperCase() ?? null, color: txt(form.color),
      kilometraje: num(form.kilometraje), combustible: txt(form.combustible), transmision: txt(form.transmision),
      cilindraje: txt(form.cilindraje), carroceria: txt(form.carroceria), puertas: num(form.puertas),
      traccion: txt(form.traccion), ciudad_matricula: txt(form.ciudad_matricula),
      num_propietarios: num(form.num_propietarios), vin: txt(form.vin), motor_numero: txt(form.motor_numero),
      precio, precio_compra: num(form.precio_compra),
      soat_vence: form.soat_vence || null, tecnomecanica_vence: form.tecnomecanica_vence || null,
      equipamiento: txt(form.equipamiento), observaciones: txt(form.observaciones), fotos,
    };
    const { error } = editando
      ? await supabase.from("vehiculos_inventario").update(datos).eq("id", editando)
      : await supabase.from("vehiculos_inventario").insert(datos);
    setGuardando(false);
    if (error) return toast.error("No se pudo guardar el vehículo.");
    toast.success(editando ? "Vehículo actualizado." : "Vehículo guardado.");
    limpiar();
    cargar();
  };

  const editar = (v: Vehiculo) => {
    const s = (x: string | number | null) => (x === null || x === undefined ? "" : String(x));
    setForm({
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
    const { error } = await supabase.from("vehiculos_inventario").update({ estado }).eq("id", v.id);
    if (error) return toast.error("No se pudo actualizar.");
    cargar();
  };

  const borrar = async (v: Vehiculo) => {
    if (!window.confirm(`¿Eliminar ${v.marca} ${v.modelo}?`)) return;
    const { error } = await supabase.from("vehiculos_inventario").delete().eq("id", v.id);
    if (error) return toast.error("No se pudo eliminar.");
    cargar();
  };

  const marcas = useMemo(() => Array.from(new Set(lista.map((v) => v.marca))).sort(), [lista]);

  const visibles = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return lista.filter((v) => {
      if (fTipo !== "todos" && v.tipo !== fTipo) return false;
      if (fEstado !== "todos" && v.estado !== fEstado) return false;
      if (fMarca !== "todas" && v.marca !== fMarca) return false;
      if (!q) return true;
      return [v.marca, v.modelo, v.version, v.placa, v.color, v.anio].some((x) => String(x ?? "").toLowerCase().includes(q));
    });
  }, [lista, busca, fTipo, fEstado, fMarca]);

  const disponibles = lista.filter((v) => v.estado === "disponible");
  const valorDisponible = disponibles.reduce((s, v) => s + v.precio, 0);

  const generarCatalogo = () => {
    const base = visibles.filter((v) => v.estado !== "vendido");
    if (base.length === 0) return toast.error("No hay vehículos disponibles para el catálogo.");
    const color = negocio?.color_principal && /^#[0-9a-f]{6}$/i.test(negocio.color_principal) ? negocio.color_principal : "#0e7490";
    const nombre = negocio?.nombre || "Catálogo de vehículos";
    const contacto = [negocio?.telefono_pedidos, negocio?.instagram, negocio?.sitio_web, negocio?.ciudad].filter(Boolean).join("  ·  ");
    const fecha = new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });
    const tarjetas = base.map((v) => {
      const datos: [string, string | number | null][] = [
        ["Año", v.anio], ["Kilometraje", v.kilometraje !== null ? `${v.kilometraje.toLocaleString("es-CO")} km` : null],
        ["Color", v.color], ["Combustible", v.combustible], ["Transmisión", v.transmision],
        ["Cilindraje", v.cilindraje], ["Carrocería", v.carroceria], ["Puertas", v.puertas],
        ["Tracción", v.traccion], ["Placa termina en", v.placa ? v.placa.slice(-1) : null],
        ["Matriculado en", v.ciudad_matricula], ["Propietarios", v.num_propietarios],
      ];
      const filas = datos.filter(([, x]) => x !== null && x !== "")
        .map(([k, x]) => `<tr><td>${esc(k)}</td><td>${esc(x)}</td></tr>`).join("");
      const imgs = (v.fotos ?? []).slice(0, 3);
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
    }).join("");
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
    const w = window.open("", "_blank");
    if (!w) return toast.error("Permite las ventanas emergentes para generar el PDF.");
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
            <input className={campo} placeholder="VIN / chasis" value={form.vin} onChange={(e) => set("vin", e.target.value)} />
            <input className={campo} placeholder="N.º de motor" value={form.motor_numero} onChange={(e) => set("motor_numero", e.target.value)} />
            <input className={campo} placeholder="Precio de venta (COP) *" inputMode="decimal" value={form.precio} onChange={(e) => set("precio", e.target.value)} />
            <input className={campo} placeholder="Precio de compra (COP)" inputMode="decimal" value={form.precio_compra} onChange={(e) => set("precio_compra", e.target.value)} />
            <label className="space-y-1"><span className="text-xs text-muted-foreground">SOAT vence</span>
              <input className={campo} type="date" value={form.soat_vence} onChange={(e) => set("soat_vence", e.target.value)} /></label>
            <label className="space-y-1"><span className="text-xs text-muted-foreground">Tecnomecánica vence</span>
              <input className={campo} type="date" value={form.tecnomecanica_vence} onChange={(e) => set("tecnomecanica_vence", e.target.value)} /></label>
          </div>
          <label className="space-y-1 block"><span className="text-xs text-muted-foreground">Estado</span>
            <select className={campo} value={form.estado} onChange={(e) => set("estado", e.target.value)}>
              {ESTADOS.map((e) => <option key={e.clave} value={e.clave}>{e.texto}</option>)}
            </select></label>
          <textarea className={campo} rows={2} placeholder="Equipamiento (aire, cámara, ABS, rines…)" value={form.equipamiento} onChange={(e) => set("equipamiento", e.target.value)} />
          <textarea className={campo} rows={2} placeholder="Observaciones" value={form.observaciones} onChange={(e) => set("observaciones", e.target.value)} />

          <div className="space-y-2">
            <span className="text-xs text-muted-foreground">Fotos (la primera es la principal)</span>
            <div className="flex flex-wrap gap-2">
              {fotos.map((u, i) => (
                <div key={u} className="relative">
                  <img src={u} alt="" className="h-20 w-20 rounded-lg object-cover" />
                  <button type="button" onClick={() => setFotos((f) => f.filter((_, j) => j !== i))} className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-destructive-foreground" aria-label="Quitar foto">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-glass-border text-xs text-muted-foreground">
                <ImagePlus className="h-5 w-5" />{subiendo ? "Subiendo…" : "Subir"}
                <input type="file" accept="image/*" multiple className="hidden" disabled={subiendo} onChange={(e) => { subirFotos(e.target.files); e.target.value = ""; }} />
              </label>
            </div>
          </div>

          <button onClick={guardar} disabled={guardando || subiendo} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
            {guardando ? "Guardando…" : editando ? "Guardar cambios" : "Guardar vehículo"}
          </button>
        </GlassPanel>

        <div className="min-w-0 space-y-3">
          <input className={campo} placeholder="Buscar por marca, modelo, placa, color o año" value={busca} onChange={(e) => setBusca(e.target.value)} />
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
            <select className={campo} value={fMarca} onChange={(e) => setFMarca(e.target.value)}>
              <option value="todas">Todas las marcas</option>
              {marcas.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          )}

          {cargando && <p className="text-sm text-muted-foreground">Cargando inventario…</p>}
          {!cargando && visibles.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay vehículos con esos filtros.</p>}

          {visibles.map((v) => (
            <GlassPanel key={v.id} className="flex flex-wrap gap-3 p-4">
              {v.fotos?.[0] ? (
                <img src={v.fotos[0]} alt="" className="h-24 w-32 rounded-lg object-cover" />
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
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <select className="rounded-lg border border-glass-border bg-glass/40 px-2 py-1 text-base text-foreground" value={v.estado} onChange={(e) => cambiarEstado(v, e.target.value)}>
                    {ESTADOS.map((e) => <option key={e.clave} value={e.clave}>{e.texto}</option>)}
                  </select>
                  <button onClick={() => editar(v)} className="inline-flex items-center gap-1 text-xs text-primary"><Pencil className="h-3 w-3" /> Editar</button>
                  <button onClick={() => borrar(v)} className="inline-flex items-center gap-1 text-xs text-destructive"><Trash2 className="h-3 w-3" /> Eliminar</button>
                </div>
              </div>
            </GlassPanel>
          ))}
        </div>
      </div>
    </div>
  );
}
