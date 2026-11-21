import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { Campo, Cargando, Encabezado, boton, botonSec, campo, dinero, num } from "@/components/comercio/ComercioModulos";
import { exportarExcel, imprimirReporte } from "@/lib/exportes";
import { Etiqueta, Indicador, Pestanas, SelectorMetodo, diasEntre, hoyISO, msg } from "@/components/negocios/comunes";

type Animal = Tables<"gan_animales">;
type Pesaje = Tables<"gan_pesajes">;
type Sanidad = Tables<"gan_sanidad">;
type Produccion = Tables<"gan_produccion">;
type Insumo = Tables<"gan_insumos">;
type Guia = Tables<"gan_guias">;
type Venta = Tables<"gan_ventas">;
type Vista = "animales" | "sanidad" | "produccion" | "insumos" | "guias" | "ventas";

const ESPECIES = [
  { clave: "bovino", texto: "Bovino" }, { clave: "porcino", texto: "Porcino" }, { clave: "ave", texto: "Ave" },
  { clave: "equino", texto: "Equino" }, { clave: "ovino", texto: "Ovino" }, { clave: "caprino", texto: "Caprino" },
];
const TIPOS_SAN = [
  { clave: "vacuna", texto: "Vacuna" }, { clave: "desparasitacion", texto: "Desparasitación" },
  { clave: "parto", texto: "Parto / cría" }, { clave: "tratamiento", texto: "Tratamiento" },
];
const UNIDAD_PROD: Record<string, string> = { leche: "litros", crias: "crías", huevos: "huevos", carne: "kg" };

function PanelGanaderia({ vistaInicial }: { vistaInicial: Vista }) {
  const [vista, setVista] = useState<Vista>(vistaInicial);
  const [animales, setAnimales] = useState<Animal[]>([]);
  const [pesajes, setPesajes] = useState<Pesaje[]>([]);
  const [sanidad, setSanidad] = useState<Sanidad[]>([]);
  const [produccion, setProduccion] = useState<Produccion[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [guias, setGuias] = useState<Guia[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [hoy, setHoy] = useState("");
  const [ocupado, setOcupado] = useState(false);
  // animal
  const [chapeta, setChapeta] = useState("");
  const [especie, setEspecie] = useState("bovino");
  const [sexo, setSexo] = useState("hembra");
  const [raza, setRaza] = useState("");
  const [lote, setLote] = useState("");
  const [potrero, setPotrero] = useState("");
  const [nacimiento, setNacimiento] = useState("");
  const [pesoIni, setPesoIni] = useState("");
  const [filtroLote, setFiltroLote] = useState("");
  // pesaje
  const [pAnimal, setPAnimal] = useState("");
  const [pPeso, setPPeso] = useState("");
  const [pFecha, setPFecha] = useState("");
  const [verAnimal, setVerAnimal] = useState("");
  // venta
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [modalidad, setModalidad] = useState("kilo");
  const [precio, setPrecio] = useState("");
  const [comprador, setComprador] = useState("");
  const [metodo, setMetodo] = useState("efectivo");
  // sanidad
  const [sAnimal, setSAnimal] = useState("");
  const [sLote, setSLote] = useState("");
  const [sTipo, setSTipo] = useState("vacuna");
  const [sProducto, setSProducto] = useState("");
  const [sFecha, setSFecha] = useState("");
  const [sProxima, setSProxima] = useState("");
  const [sIca, setSIca] = useState("");
  const [sNotas, setSNotas] = useState("");
  // producción
  const [prTipo, setPrTipo] = useState("leche");
  const [prCantidad, setPrCantidad] = useState("");
  const [prFecha, setPrFecha] = useState("");
  const [prLote, setPrLote] = useState("");
  const [prChapeta, setPrChapeta] = useState("");
  const [prValor, setPrValor] = useState("");
  // insumos
  const [iNombre, setINombre] = useState("");
  const [iUnidad, setIUnidad] = useState("kg");
  const [iStock, setIStock] = useState("");
  const [iMin, setIMin] = useState("");
  const [iCosto, setICosto] = useState("");
  const [cInsumo, setCInsumo] = useState("");
  const [cLote, setCLote] = useState("");
  const [cCantidad, setCCantidad] = useState("");
  const [stockEdit, setStockEdit] = useState<Record<string, string>>({});
  // guías
  const [gNumero, setGNumero] = useState("");
  const [gOrigen, setGOrigen] = useState("");
  const [gDestino, setGDestino] = useState("");
  const [gCantidad, setGCantidad] = useState("");
  const [gChapetas, setGChapetas] = useState("");
  const [gVence, setGVence] = useState("");

  useEffect(() => {
    const h = hoyISO();
    setHoy(h);
    setPFecha(h);
    setSFecha(h);
    setPrFecha(h);
  }, []);

  const cargar = useCallback(async () => {
    const [a, p, s, pr, i, g, v] = await Promise.all([
      supabase.from("gan_animales").select("*").order("chapeta").limit(3000),
      supabase.from("gan_pesajes").select("*").order("fecha", { ascending: false }).limit(4000),
      supabase.from("gan_sanidad").select("*").order("fecha", { ascending: false }).limit(1500),
      supabase.from("gan_produccion").select("*").order("fecha", { ascending: false }).limit(1500),
      supabase.from("gan_insumos").select("*").order("nombre").limit(500),
      supabase.from("gan_guias").select("*").order("vence", { ascending: false }).limit(300),
      supabase.from("gan_ventas").select("*").order("created_at", { ascending: false }).limit(300),
    ]);
    setAnimales(a.data ?? []);
    setPesajes(p.data ?? []);
    setSanidad(s.data ?? []);
    setProduccion(pr.data ?? []);
    setInsumos(i.data ?? []);
    setGuias(g.data ?? []);
    setVentas(v.data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const activos = useMemo(() => animales.filter((a) => a.estado === "activo"), [animales]);
  const lotes = useMemo(() => Array.from(new Set(activos.map((a) => a.lote).filter((l): l is string => !!l))).sort(), [activos]);
  const visibles = useMemo(() => activos.filter((a) => (filtroLote ? a.lote === filtroLote : true)), [activos, filtroLote]);

  /** Ganancia diaria promedio desde el ingreso: (peso actual - peso inicial) / días. */
  const gdpPromedio = useCallback((a: Animal): number | null => {
    if (!hoy || a.peso_inicial <= 0) return null;
    const dias = diasEntre(a.fecha_ingreso, hoy);
    return dias > 0 ? Math.round(((a.peso_actual - a.peso_inicial) / dias) * 1000) / 1000 : null;
  }, [hoy]);

  const crearAnimal = async () => {
    if (!chapeta.trim()) return toast.error("Escribe el número de chapeta o arete.");
    const p = Math.max(num(pesoIni), 0);
    const { error } = await supabase.from("gan_animales").insert({
      chapeta: chapeta.trim(), especie, sexo, raza: raza.trim() || null, lote: lote.trim() || null, potrero: potrero.trim() || null,
      fecha_nacimiento: nacimiento || null, peso_inicial: p, peso_actual: p,
    });
    if (error) return toast.error(error.code === "23505" ? "Esa chapeta ya existe." : msg(error.message, "No se pudo guardar el animal."));
    toast.success("Animal registrado.");
    setChapeta(""); setRaza(""); setPesoIni(""); setNacimiento("");
    void cargar();
  };
  const pesar = async () => {
    if (!pAnimal) return toast.error("Elige el animal.");
    setOcupado(true);
    const { data, error } = await supabase.rpc("gan_pesar", { p_animal: pAnimal, p_peso: num(pPeso), p_fecha: pFecha });
    setOcupado(false);
    if (error) return toast.error(msg(error.message, "No se pudo registrar el pesaje."));
    const r = (data ?? {}) as { ganancia_dia?: number | null };
    toast.success(r.ganancia_dia !== null && r.ganancia_dia !== undefined ? `Pesaje guardado. Ganancia diaria: ${r.ganancia_dia} kg.` : "Pesaje guardado.");
    setPPeso("");
    setVerAnimal(pAnimal);
    void cargar();
  };

  const totalVenta = useMemo(() => {
    const p = Math.max(num(precio), 0);
    return activos.filter((a) => seleccion.includes(a.id)).reduce((s, a) => s + (modalidad === "kilo" ? Math.round(a.peso_actual * p) : Math.round(p)), 0);
  }, [activos, seleccion, modalidad, precio]);
  const kilosSel = activos.filter((a) => seleccion.includes(a.id)).reduce((s, a) => s + a.peso_actual, 0);
  const vender = async () => {
    if (seleccion.length === 0) return toast.error("Marca los animales que vendes.");
    if (comprador.trim().length < 2) return toast.error("Escribe el comprador.");
    setOcupado(true);
    const { data, error } = await supabase.rpc("gan_vender", { p_animales: seleccion, p_modalidad: modalidad, p_precio: num(precio), p_comprador: comprador.trim(), p_metodo: metodo });
    setOcupado(false);
    if (error) return toast.error(msg(error.message, "No se pudo registrar la venta."));
    const r = (data ?? {}) as { animales?: number; kilos?: number; total?: number };
    toast.success(`Venta de ${r.animales ?? 0} animal(es) por ${dinero(r.total ?? 0)}. Entró a Caja y quedó en Contabilidad.`);
    imprimirReporte("Liquidación de venta de ganado", `Comprador: ${comprador.trim()} · ${modalidad === "kilo" ? "Por kilo" : "Por cabeza"} a ${dinero(num(precio))}`,
      ["Chapeta", "Peso (kg)", "Valor"],
      activos.filter((a) => seleccion.includes(a.id)).map((a) => [a.chapeta, String(a.peso_actual), dinero(modalidad === "kilo" ? Math.round(a.peso_actual * num(precio)) : Math.round(num(precio)))]),
      [`Total: ${dinero(r.total ?? 0)} · ${r.kilos ?? 0} kg`]);
    setSeleccion([]); setPrecio(""); setComprador("");
    void cargar();
  };

  const registrarSanidad = async () => {
    if (sProducto.trim().length < 2) return toast.error("Escribe el producto o la novedad.");
    let objetivos: Animal[] = [];
    if (sAnimal) objetivos = activos.filter((a) => a.id === sAnimal);
    else if (sLote) objetivos = activos.filter((a) => a.lote === sLote);
    if (objetivos.length === 0) return toast.error("Elige un animal o un lote.");
    const filas = objetivos.map((a) => ({ animal_id: a.id, chapeta: a.chapeta, lote: a.lote, tipo: sTipo, producto: sProducto.trim(), fecha: sFecha, proxima: sProxima || null, registro_ica: sIca.trim() || null, notas: sNotas.trim() || null }));
    const { error } = await supabase.from("gan_sanidad").insert(filas);
    if (error) return toast.error(msg(error.message, "No se pudo registrar."));
    toast.success(`Registro guardado para ${filas.length} animal(es).`);
    setSProducto(""); setSProxima(""); setSIca(""); setSNotas("");
    void cargar();
  };

  const registrarProduccion = async () => {
    if (num(prCantidad) <= 0) return toast.error("Escribe la cantidad producida.");
    const { error } = await supabase.from("gan_produccion").insert({
      fecha: prFecha, tipo: prTipo, cantidad: num(prCantidad), unidad: UNIDAD_PROD[prTipo] ?? "und", lote: prLote.trim() || null, chapeta: prChapeta.trim() || null, valor: Math.max(num(prValor), 0),
    });
    if (error) return toast.error(msg(error.message, "No se pudo registrar la producción."));
    toast.success("Producción registrada.");
    setPrCantidad(""); setPrValor("");
    void cargar();
  };

  const crearInsumo = async () => {
    if (iNombre.trim().length < 2) return toast.error("Escribe el insumo (concentrado, sal, medicina…).");
    const { error } = await supabase.from("gan_insumos").insert({ nombre: iNombre.trim(), unidad: iUnidad.trim() || "kg", stock: Math.max(num(iStock), 0), stock_minimo: Math.max(num(iMin), 0), costo: Math.max(num(iCosto), 0) });
    if (error) return toast.error(msg(error.message, "No se pudo guardar el insumo."));
    toast.success("Insumo agregado.");
    setINombre(""); setIStock(""); setIMin(""); setICosto("");
    void cargar();
  };
  const guardarStock = async (i: Insumo) => {
    const v = stockEdit[i.id];
    if (v === undefined) return;
    const { error } = await supabase.from("gan_insumos").update({ stock: Math.max(num(v), 0) }).eq("id", i.id);
    if (error) return toast.error(msg(error.message, "No se pudo actualizar."));
    setStockEdit((e) => {
      const { [i.id]: _omitido, ...resto } = e;
      return resto;
    });
    void cargar();
  };
  const consumir = async () => {
    if (!cInsumo) return toast.error("Elige el insumo.");
    setOcupado(true);
    const { data, error } = await supabase.rpc("gan_consumir", { p_insumo: cInsumo, p_lote: cLote.trim(), p_cantidad: num(cCantidad) });
    setOcupado(false);
    if (error) return toast.error(msg(error.message, "No se pudo registrar el consumo."));
    toast.success(`Consumo registrado: salió del inventario y quedó como gasto por ${dinero(Number(data ?? 0))}.`);
    setCCantidad("");
    void cargar();
  };

  const crearGuia = async () => {
    if (!gNumero.trim() || !gOrigen.trim() || !gDestino.trim()) return toast.error("Completa número, origen y destino.");
    if (!gVence) return toast.error("Indica el vencimiento de la guía.");
    const { error } = await supabase.from("gan_guias").insert({ numero: gNumero.trim(), origen: gOrigen.trim(), destino: gDestino.trim(), cantidad: Math.max(Math.round(num(gCantidad)), 1), chapetas: gChapetas.trim() || null, vence: gVence });
    if (error) return toast.error(msg(error.message, "No se pudo guardar la guía."));
    toast.success("Guía de movilización registrada.");
    setGNumero(""); setGOrigen(""); setGDestino(""); setGCantidad(""); setGChapetas("");
    void cargar();
  };

  if (cargando) return <Cargando />;
  const pesajesAnimal = pesajes.filter((p) => p.animal_id === verAnimal).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const hace30 = hoy ? new Date(Date.parse(`${hoy}T00:00:00Z`) - 30 * 86400000).toISOString().slice(0, 10) : "";
  const prod30 = produccion.filter((p) => p.fecha >= hace30);
  const totProd = (t: string) => prod30.filter((p) => p.tipo === t).reduce((s, p) => s + p.cantidad, 0);
  const kilosTotales = activos.reduce((s, a) => s + a.peso_actual, 0);

  return (
    <div className="space-y-6">
      <Encabezado titulo="Ganadería" texto="Inventario por chapeta, lote y potrero, pesajes con ganancia diaria, control sanitario, producción, insumos, guías de movilización y venta por kilo o por cabeza a Caja." />
      <Pestanas items={[{ clave: "animales", texto: "Animales y pesajes" }, { clave: "sanidad", texto: "Sanidad" }, { clave: "produccion", texto: "Producción" }, { clave: "insumos", texto: "Alimentación y medicinas" }, { clave: "guias", texto: "Guías de movilización" }, { clave: "ventas", texto: "Ventas" }]} valor={vista} onChange={setVista} />

      {vista === "animales" && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Indicador titulo="Animales activos" valor={activos.length} />
            <Indicador titulo="Lotes" valor={lotes.length} />
            <Indicador titulo="Peso total" valor={`${Math.round(kilosTotales).toLocaleString("es-CO")} kg`} />
          </div>
          <GlassPanel className="space-y-3 p-4">
            <h2 className="text-sm font-semibold text-foreground">Nuevo animal</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Campo etiqueta="Chapeta / arete *"><input className={campo} value={chapeta} onChange={(e) => setChapeta(e.target.value)} /></Campo>
              <Campo etiqueta="Especie"><select className={campo} value={especie} onChange={(e) => setEspecie(e.target.value)}>{ESPECIES.map((x) => <option key={x.clave} value={x.clave}>{x.texto}</option>)}</select></Campo>
              <Campo etiqueta="Sexo"><select className={campo} value={sexo} onChange={(e) => setSexo(e.target.value)}><option value="hembra">Hembra</option><option value="macho">Macho</option></select></Campo>
              <Campo etiqueta="Raza"><input className={campo} value={raza} onChange={(e) => setRaza(e.target.value)} /></Campo>
              <Campo etiqueta="Lote"><input className={campo} list="lista-lotes" value={lote} onChange={(e) => setLote(e.target.value)} /></Campo>
              <Campo etiqueta="Potrero / galpón"><input className={campo} value={potrero} onChange={(e) => setPotrero(e.target.value)} /></Campo>
              <Campo etiqueta="Fecha de nacimiento"><input type="date" className={campo} value={nacimiento} onChange={(e) => setNacimiento(e.target.value)} /></Campo>
              <Campo etiqueta="Peso inicial (kg)"><input className={campo} inputMode="decimal" value={pesoIni} onChange={(e) => setPesoIni(e.target.value)} /></Campo>
            </div>
            <datalist id="lista-lotes">{lotes.map((l) => <option key={l} value={l} />)}</datalist>
            <button type="button" className={boton} onClick={() => void crearAnimal()}>Guardar animal</button>
          </GlassPanel>

          <GlassPanel className="space-y-3 p-4">
            <h2 className="text-sm font-semibold text-foreground">Registrar pesaje</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <Campo etiqueta="Animal *"><select className={campo} value={pAnimal} onChange={(e) => { setPAnimal(e.target.value); setVerAnimal(e.target.value); }}><option value="">Elige…</option>{activos.map((a) => <option key={a.id} value={a.id}>{a.chapeta} · {a.peso_actual} kg</option>)}</select></Campo>
              <Campo etiqueta="Peso (kg) *"><input className={campo} inputMode="decimal" value={pPeso} onChange={(e) => setPPeso(e.target.value)} /></Campo>
              <Campo etiqueta="Fecha"><input type="date" className={campo} value={pFecha} onChange={(e) => setPFecha(e.target.value)} /></Campo>
            </div>
            <button type="button" className={boton} disabled={ocupado} onClick={() => void pesar()}>Guardar pesaje</button>
            {verAnimal && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-foreground">Historial de pesajes</p>
                {pesajesAnimal.length === 0 ? <p className="text-xs text-muted-foreground">Sin pesajes todavía.</p> : pesajesAnimal.map((p) => (
                  <p key={p.id} className="flex flex-wrap justify-between gap-2 text-sm text-muted-foreground"><span>{p.fecha} · {p.peso} kg</span><span className="text-foreground">{p.ganancia_dia === null ? "—" : `${p.ganancia_dia} kg/día en ${p.dias} días`}</span></p>
                ))}
              </div>
            )}
          </GlassPanel>

          <GlassPanel className="space-y-2 p-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <Campo etiqueta="Filtrar por lote"><select className={campo} value={filtroLote} onChange={(e) => setFiltroLote(e.target.value)}><option value="">Todos</option>{lotes.map((l) => <option key={l} value={l}>{l}</option>)}</select></Campo>
              <button type="button" className={botonSec} onClick={() => exportarExcel("inventario-ganado", ["Chapeta", "Especie", "Sexo", "Lote", "Potrero", "Peso inicial", "Peso actual", "Ganancia diaria"], visibles.map((a) => [a.chapeta, a.especie, a.sexo, a.lote ?? "", a.potrero ?? "", a.peso_inicial, a.peso_actual, gdpPromedio(a) ?? ""]))}>Descargar Excel</button>
            </div>
            {visibles.length === 0 ? <p className="text-sm text-muted-foreground">No hay animales activos.</p> : visibles.map((a) => (
              <label key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-glass-border p-3">
                <span className="flex min-w-0 items-center gap-3">
                  <input type="checkbox" className="h-4 w-4" checked={seleccion.includes(a.id)} onChange={(e) => setSeleccion((s) => (e.target.checked ? [...s, a.id] : s.filter((x) => x !== a.id)))} aria-label={`Seleccionar ${a.chapeta}`} />
                  <span className="min-w-0">
                    <span className="block break-words text-sm font-semibold text-foreground">{a.chapeta} · {ESPECIES.find((x) => x.clave === a.especie)?.texto} {a.sexo}</span>
                    <span className="block break-words text-xs text-muted-foreground">Lote {a.lote ?? "—"} · potrero {a.potrero ?? "—"}{a.raza ? ` · ${a.raza}` : ""}</span>
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-2 text-sm text-foreground">
                  {a.peso_actual} kg
                  {gdpPromedio(a) !== null && <Etiqueta texto={`${gdpPromedio(a)} kg/día`} tono={(gdpPromedio(a) ?? 0) >= 0 ? "ok" : "alerta"} />}
                  <button type="button" className={botonSec} onClick={(e) => { e.preventDefault(); setVerAnimal(a.id); setPAnimal(a.id); }}>Ver pesajes</button>
                </span>
              </label>
            ))}
          </GlassPanel>

          <GlassPanel className="space-y-3 p-4">
            <h2 className="text-sm font-semibold text-foreground">Liquidar venta de los animales marcados ({seleccion.length})</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Campo etiqueta="Vender por"><select className={campo} value={modalidad} onChange={(e) => setModalidad(e.target.value)}><option value="kilo">Kilo en pie</option><option value="cabeza">Cabeza</option></select></Campo>
              <Campo etiqueta={modalidad === "kilo" ? "Precio por kilo" : "Precio por cabeza"}><input className={campo} inputMode="decimal" value={precio} onChange={(e) => setPrecio(e.target.value)} /></Campo>
              <Campo etiqueta="Comprador *"><input className={campo} value={comprador} onChange={(e) => setComprador(e.target.value)} /></Campo>
              <Campo etiqueta="Recibir por"><SelectorMetodo valor={metodo} onChange={setMetodo} /></Campo>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Indicador titulo="Kilos seleccionados" valor={`${Math.round(kilosSel)} kg`} />
              <Indicador titulo="Total de la venta" valor={dinero(totalVenta)} />
            </div>
            <button type="button" className={boton} disabled={ocupado} onClick={() => void vender()}>Registrar venta y cobrar en Caja</button>
          </GlassPanel>
        </>
      )}

      {vista === "sanidad" && (
        <>
          <GlassPanel className="space-y-3 p-4">
            <h2 className="text-sm font-semibold text-foreground">Registrar vacuna, desparasitación, parto o tratamiento</h2>
            <p className="text-xs text-muted-foreground">Elige un animal, o deja el animal vacío y elige un lote para aplicarlo a todos sus animales activos.</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Campo etiqueta="Animal"><select className={campo} value={sAnimal} onChange={(e) => setSAnimal(e.target.value)}><option value="">Todo el lote…</option>{activos.map((a) => <option key={a.id} value={a.id}>{a.chapeta}</option>)}</select></Campo>
              <Campo etiqueta="Lote"><select className={campo} value={sLote} onChange={(e) => setSLote(e.target.value)} disabled={!!sAnimal}><option value="">Elige…</option>{lotes.map((l) => <option key={l} value={l}>{l}</option>)}</select></Campo>
              <Campo etiqueta="Tipo"><select className={campo} value={sTipo} onChange={(e) => setSTipo(e.target.value)}>{TIPOS_SAN.map((t) => <option key={t.clave} value={t.clave}>{t.texto}</option>)}</select></Campo>
              <Campo etiqueta="Producto / novedad *"><input className={campo} value={sProducto} onChange={(e) => setSProducto(e.target.value)} placeholder="Ej. Aftosa, ivermectina, cría macho" /></Campo>
              <Campo etiqueta="Fecha"><input type="date" className={campo} value={sFecha} onChange={(e) => setSFecha(e.target.value)} /></Campo>
              <Campo etiqueta="Próxima aplicación"><input type="date" className={campo} value={sProxima} onChange={(e) => setSProxima(e.target.value)} /></Campo>
              <Campo etiqueta="Registro ICA / lote del producto"><input className={campo} value={sIca} onChange={(e) => setSIca(e.target.value)} /></Campo>
              <Campo etiqueta="Notas"><input className={campo} value={sNotas} onChange={(e) => setSNotas(e.target.value)} /></Campo>
            </div>
            <button type="button" className={boton} onClick={() => void registrarSanidad()}>Guardar registro sanitario</button>
          </GlassPanel>
          <GlassPanel className="space-y-2 p-4">
            <div className="flex flex-wrap justify-between gap-2">
              <h2 className="text-sm font-semibold text-foreground">Historial y próximas aplicaciones</h2>
              <button type="button" className={botonSec} onClick={() => exportarExcel("sanidad-ganado", ["Fecha", "Chapeta", "Lote", "Tipo", "Producto", "Próxima", "ICA"], sanidad.map((s) => [s.fecha, s.chapeta ?? "", s.lote ?? "", s.tipo, s.producto, s.proxima ?? "", s.registro_ica ?? ""]))}>Descargar Excel</button>
            </div>
            {sanidad.length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay registros.</p> : sanidad.map((s) => (
              <p key={s.id} className="flex flex-wrap justify-between gap-2 text-sm text-muted-foreground">
                <span className="min-w-0 break-words">{s.fecha} · {s.chapeta ?? s.lote} · {TIPOS_SAN.find((t) => t.clave === s.tipo)?.texto}: {s.producto}</span>
                {s.proxima && <span className={hoy && s.proxima < hoy ? "text-destructive" : "text-foreground"}>Próxima {s.proxima}</span>}
              </p>
            ))}
          </GlassPanel>
        </>
      )}

      {vista === "produccion" && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Indicador titulo="Leche (30 días)" valor={`${totProd("leche")} L`} />
            <Indicador titulo="Crías (30 días)" valor={totProd("crias")} />
            <Indicador titulo="Huevos (30 días)" valor={totProd("huevos")} />
            <Indicador titulo="Carne (30 días)" valor={`${totProd("carne")} kg`} />
          </div>
          <GlassPanel className="space-y-3 p-4">
            <h2 className="text-sm font-semibold text-foreground">Registrar producción</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Campo etiqueta="Producto"><select className={campo} value={prTipo} onChange={(e) => setPrTipo(e.target.value)}><option value="leche">Leche</option><option value="crias">Crías nacidas</option><option value="huevos">Huevos</option><option value="carne">Carne</option></select></Campo>
              <Campo etiqueta={`Cantidad (${UNIDAD_PROD[prTipo]}) *`}><input className={campo} inputMode="decimal" value={prCantidad} onChange={(e) => setPrCantidad(e.target.value)} /></Campo>
              <Campo etiqueta="Fecha"><input type="date" className={campo} value={prFecha} onChange={(e) => setPrFecha(e.target.value)} /></Campo>
              <Campo etiqueta="Lote"><select className={campo} value={prLote} onChange={(e) => setPrLote(e.target.value)}><option value="">—</option>{lotes.map((l) => <option key={l} value={l}>{l}</option>)}</select></Campo>
              <Campo etiqueta="Chapeta (opcional)"><input className={campo} value={prChapeta} onChange={(e) => setPrChapeta(e.target.value)} /></Campo>
              <Campo etiqueta="Valor estimado"><input className={campo} inputMode="decimal" value={prValor} onChange={(e) => setPrValor(e.target.value)} /></Campo>
            </div>
            <button type="button" className={boton} onClick={() => void registrarProduccion()}>Guardar producción</button>
          </GlassPanel>
          <GlassPanel className="space-y-2 p-4">
            {produccion.length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay producción registrada.</p> : produccion.slice(0, 100).map((p) => (
              <p key={p.id} className="flex flex-wrap justify-between gap-2 text-sm text-muted-foreground"><span>{p.fecha} · {p.tipo}{p.lote ? ` · lote ${p.lote}` : ""}{p.chapeta ? ` · ${p.chapeta}` : ""}</span><span className="text-foreground">{p.cantidad} {p.unidad}</span></p>
            ))}
          </GlassPanel>
        </>
      )}

      {vista === "insumos" && (
        <>
          <GlassPanel className="space-y-3 p-4">
            <h2 className="text-sm font-semibold text-foreground">Concentrado, sal y medicinas</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Campo etiqueta="Insumo *"><input className={campo} value={iNombre} onChange={(e) => setINombre(e.target.value)} /></Campo>
              <Campo etiqueta="Unidad"><input className={campo} value={iUnidad} onChange={(e) => setIUnidad(e.target.value)} /></Campo>
              <Campo etiqueta="Existencias"><input className={campo} inputMode="decimal" value={iStock} onChange={(e) => setIStock(e.target.value)} /></Campo>
              <Campo etiqueta="Stock mínimo"><input className={campo} inputMode="decimal" value={iMin} onChange={(e) => setIMin(e.target.value)} /></Campo>
              <Campo etiqueta="Costo unitario"><input className={campo} inputMode="decimal" value={iCosto} onChange={(e) => setICosto(e.target.value)} /></Campo>
            </div>
            <button type="button" className={boton} onClick={() => void crearInsumo()}>Agregar insumo</button>
            {insumos.map((i) => (
              <div key={i.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-glass-border p-3">
                <p className="min-w-0 break-words text-sm text-foreground">{i.nombre} · {dinero(i.costo)} por {i.unidad}</p>
                <div className="flex flex-wrap items-center gap-2">
                  {i.stock <= i.stock_minimo && <Etiqueta texto="Bajo el mínimo" tono="alerta" />}
                  <input className={`${campo} !w-28`} aria-label="Existencias" inputMode="decimal" value={stockEdit[i.id] ?? String(i.stock)} onChange={(e) => setStockEdit((x) => ({ ...x, [i.id]: e.target.value }))} />
                  {stockEdit[i.id] !== undefined && <button type="button" className={botonSec} onClick={() => void guardarStock(i)}>Guardar</button>}
                </div>
              </div>
            ))}
          </GlassPanel>
          <GlassPanel className="space-y-3 p-4">
            <h2 className="text-sm font-semibold text-foreground">Registrar consumo por lote</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <Campo etiqueta="Insumo *"><select className={campo} value={cInsumo} onChange={(e) => setCInsumo(e.target.value)}><option value="">Elige…</option>{insumos.filter((i) => i.activo).map((i) => <option key={i.id} value={i.id}>{i.nombre} (hay {i.stock})</option>)}</select></Campo>
              <Campo etiqueta="Lote"><select className={campo} value={cLote} onChange={(e) => setCLote(e.target.value)}><option value="">General</option>{lotes.map((l) => <option key={l} value={l}>{l}</option>)}</select></Campo>
              <Campo etiqueta="Cantidad *"><input className={campo} inputMode="decimal" value={cCantidad} onChange={(e) => setCCantidad(e.target.value)} /></Campo>
            </div>
            <button type="button" className={boton} disabled={ocupado} onClick={() => void consumir()}>Registrar consumo</button>
          </GlassPanel>
        </>
      )}

      {vista === "guias" && (
        <>
          <GlassPanel className="space-y-3 p-4">
            <h2 className="text-sm font-semibold text-foreground">Nueva guía de movilización ICA</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Campo etiqueta="Número de guía *"><input className={campo} value={gNumero} onChange={(e) => setGNumero(e.target.value)} /></Campo>
              <Campo etiqueta="Origen *"><input className={campo} value={gOrigen} onChange={(e) => setGOrigen(e.target.value)} /></Campo>
              <Campo etiqueta="Destino *"><input className={campo} value={gDestino} onChange={(e) => setGDestino(e.target.value)} /></Campo>
              <Campo etiqueta="Cantidad de animales"><input className={campo} inputMode="numeric" value={gCantidad} onChange={(e) => setGCantidad(e.target.value)} /></Campo>
              <Campo etiqueta="Chapetas"><input className={campo} value={gChapetas} onChange={(e) => setGChapetas(e.target.value)} placeholder="Ej. 101, 102, 103" /></Campo>
              <Campo etiqueta="Vence *"><input type="date" className={campo} value={gVence} onChange={(e) => setGVence(e.target.value)} /></Campo>
            </div>
            <button type="button" className={boton} onClick={() => void crearGuia()}>Guardar guía</button>
          </GlassPanel>
          <GlassPanel className="space-y-2 p-4">
            {guias.length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay guías.</p> : guias.map((g) => {
              const dias = hoy ? diasEntre(hoy, g.vence) : 99;
              return (
                <div key={g.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-glass-border p-3">
                  <p className="min-w-0 break-words text-sm text-foreground">Guía {g.numero} · {g.origen} → {g.destino} · {g.cantidad} animal(es){g.chapetas ? ` (${g.chapetas})` : ""}</p>
                  <Etiqueta texto={dias < 0 ? "Vencida" : dias <= 3 ? `Vence en ${dias} día(s)` : `Vence ${g.vence}`} tono={dias < 0 ? "alerta" : dias <= 3 ? "info" : "neutro"} />
                </div>
              );
            })}
          </GlassPanel>
        </>
      )}

      {vista === "ventas" && (
        <GlassPanel className="space-y-2 p-4">
          <div className="flex flex-wrap justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">Ventas de ganado</h2>
            <button type="button" className={botonSec} onClick={() => exportarExcel("ventas-ganado", ["Fecha", "Comprador", "Modalidad", "Precio", "Animales", "Kilos", "Total"], ventas.map((v) => [v.fecha, v.comprador, v.modalidad, v.precio, v.animales, v.kilos, v.total]))}>Descargar Excel</button>
          </div>
          {ventas.length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay ventas. Marca animales en la pestaña Animales y liquida la venta.</p> : ventas.map((v) => (
            <p key={v.id} className="flex flex-wrap justify-between gap-2 text-sm text-muted-foreground">
              <span className="min-w-0 break-words">{v.fecha} · {v.comprador} · {v.animales} animal(es) · {v.kilos} kg · {v.modalidad === "kilo" ? "por kilo" : "por cabeza"} a {dinero(v.precio)}</span>
              <span className="text-foreground">{dinero(v.total)}</span>
            </p>
          ))}
        </GlassPanel>
      )}
    </div>
  );
}

export function AnimalesGanaderia() {
  return <PanelGanaderia vistaInicial="animales" />;
}
export function ProduccionGanaderia() {
  return <PanelGanaderia vistaInicial="produccion" />;
}
export function SanidadGanaderia() {
  return <PanelGanaderia vistaInicial="sanidad" />;
}
export function InsumosGanaderia() {
  return <PanelGanaderia vistaInicial="insumos" />;
}
export function GuiasGanaderia() {
  return <PanelGanaderia vistaInicial="guias" />;
}
