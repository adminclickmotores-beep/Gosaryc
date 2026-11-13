// Tarifas unificadas de domicilio (Yumbo 2026, zona centro). Fuente: la lista de precios del negocio.

export type TarifaDomicilio = {
  nombre: string;
  precio: number;
  /** Otros nombres con los que el cliente puede escribir el barrio. */
  alias?: string[];
  /** Detalle que se muestra junto al nombre (cuadras, calles). */
  detalle?: string;
  /** Si es true, solo se elige a mano (no se detecta por la dirección). */
  soloManual?: boolean;
};

const t = (precio: number, nombres: string[]): TarifaDomicilio[] => nombres.map((nombre) => ({ nombre, precio }));

export const TARIFAS_DOMICILIO: TarifaDomicilio[] = [
  ...t(4000, [
    "Belalcázar", "Bolívar", "Uribe", "Barrio Chino", "Bellavista", "Buenos Aires", "Las Cruces", "Comfandi",
    "Bosques del Samán", "Coorivalle", "Colinas", "Pedregal", "San Fernando", "Filandia",
    "Flor de Montenegro", "Gaitán", "Guacanda", "Portales de Yumbo", "Floral", "La Ceiba", "Las Vegas",
    "Madrigal", "Municipal", "Lleras", "Fray Peña",
  ]),
  ...t(4500, ["Pizarro", "Dionicio", "Cacique Jacinto", "Campestre Real", "Brisas del Campestre"]),
  ...t(5000, [
    "Acacias", "Alta", "Trinidad", "Estancia vieja y nueva", "Parques del Pinar", "Hacienda Verde", "Guadalupe",
    "Juan Pablo Alta", "Puerto Isaac", "Nuevo Horizonte", "Brisas de la Sultana Alta", "San Rafael Plaza",
  ]).map((x) => (x.nombre === "Estancia vieja y nueva" ? { ...x, alias: ["Estancia vieja", "Estancia nueva", "Estancia"] } : x)),
  { nombre: "Bellavista Parte", precio: 5000, detalle: "CRA. 8N, 9N, 10N" },
  { nombre: "Ceiba Parte Alta", precio: 5000, detalle: "CRA. 8N, 9N, 10N" },
  { nombre: "San Fernando Parte", precio: 5000, detalle: "Calle 1 y 2" },
  { nombre: "Buenos Aires Altares", precio: 5000, detalle: "CRA. 14 y 15" },
  { nombre: "Cruces Parte Alta", precio: 5000, detalle: "Calle 1 y 2" },
  { nombre: "Riveras de Yumbo", precio: 6000 },
  ...t(7000, ["Cartón Colombia", "Empresas de Gas", "Residencias Santana", "Cementos Argos", "Panorama", "Eternit", "Las Américas", "San Jorge", "Goodyear"]),
  ...t(8000, ["Guabinas", "Colinas del Norte", "Propal", "Maderkit"]),
  { nombre: "Cencar", precio: 9000 },
  // Acopio y otros servicios
  { nombre: "Pilis", precio: 12000 },
  { nombre: "Zona Franca", precio: 16000 },
  { nombre: "Dapa Mall", precio: 11000, alias: ["Dapa"] },
  { nombre: "Mulalo", precio: 15000 },
  { nombre: "San Marcos", precio: 16000 },
  { nombre: "Guajira 7", precio: 22000, alias: ["Guajira"] },
  { nombre: "Sameo", precio: 18000, alias: ["Menga"] },
  { nombre: "Aeropuerto", precio: 25000 },
  { nombre: "Carrera 25 a 27", precio: 10000, soloManual: true },
  { nombre: "Carrera 27 a 31", precio: 12000, soloManual: true },
  { nombre: "Carrera 32 a 34", precio: 13000, soloManual: true },
  { nombre: "Carrera 35 a 37", precio: 14000, soloManual: true },
  { nombre: "Carrera 38 a 39", precio: 15000, soloManual: true },
];

const normalizar = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Busca el barrio dentro de la dirección escrita. Gana el nombre más largo (más específico). */
export function buscarTarifa(direccion: string): TarifaDomicilio | null {
  const texto = ` ${normalizar(direccion)} `;
  if (texto.trim() === "") return null;
  let mejor: TarifaDomicilio | null = null;
  let mejorLong = 0;
  for (const tarifa of TARIFAS_DOMICILIO) {
    if (tarifa.soloManual) continue;
    for (const n of [tarifa.nombre, ...(tarifa.alias ?? [])]) {
      const clave = normalizar(n);
      if (clave.length > mejorLong && texto.includes(` ${clave} `)) {
        mejor = tarifa;
        mejorLong = clave.length;
      }
    }
  }
  return mejor;
}

const miles = (n: number) => `$${n.toLocaleString("es-CO")}`;

/** Texto con toda la lista, agrupada por precio, para dárselo a la IA. */
export function tarifasComoTexto(): string {
  const porPrecio = new Map<number, string[]>();
  for (const x of TARIFAS_DOMICILIO) {
    const lista = porPrecio.get(x.precio) ?? [];
    lista.push(x.detalle ? `${x.nombre} (${x.detalle})` : x.nombre);
    porPrecio.set(x.precio, lista);
  }
  return [...porPrecio.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([precio, nombres]) => `- ${miles(precio)}: ${nombres.join(", ")}`)
    .join("\n");
}
