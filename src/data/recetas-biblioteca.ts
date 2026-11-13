/**
 * Biblioteca de recetas base por tipo de negocio.
 * Las cantidades son para `porciones` (base) y se escalan al número de porciones que pida el usuario.
 * Los nombres de ingrediente deben coincidir con los del inventario para que se carguen solos.
 */
export type RecetaBase = {
  platillo: string;
  /** Palabras clave para reconocer el platillo (sin acentos, minúsculas). */
  claves: string[];
  porciones: number;
  ingredientes: { nombre: string; cantidad: number; unidad: "g" | "ml" | "und" }[];
  preparacion: string;
};

export const RECETAS_BIBLIOTECA: Record<string, RecetaBase[]> = {
  restaurante: [
    {
      platillo: "Chuleta de cerdo",
      claves: ["chuleta de cerdo", "chuleta"],
      porciones: 1,
      ingredientes: [
        { nombre: "Chuleta de cerdo", cantidad: 250, unidad: "g" },
        { nombre: "Sal", cantidad: 3, unidad: "g" },
        { nombre: "Ajo", cantidad: 5, unidad: "g" },
        { nombre: "Limón", cantidad: 0.5, unidad: "und" },
        { nombre: "Aceite", cantidad: 15, unidad: "ml" },
      ],
      preparacion:
        "1. Saca la chuleta del refrigerador 20 minutos antes.\n2. Marina con limón, ajo picado y sal de 2 a 4 horas.\n3. Calienta el aceite en sartén a fuego medio-alto.\n4. Cocina la chuleta 3 a 4 minutos por lado, sin moverla mucho.\n5. Verifica que el centro llegue a 63 °C (ligeramente rosado) o 71 °C si la prefieres bien cocida.\n6. Deja reposar 3 a 5 minutos antes de servir.",
    },
    {
      platillo: "Pollo a la plancha",
      claves: ["pollo a la plancha", "pechuga a la plancha", "pollo plancha"],
      porciones: 1,
      ingredientes: [
        { nombre: "Pechuga de pollo", cantidad: 220, unidad: "g" },
        { nombre: "Sal", cantidad: 3, unidad: "g" },
        { nombre: "Pimienta", cantidad: 1, unidad: "g" },
        { nombre: "Aceite", cantidad: 10, unidad: "ml" },
      ],
      preparacion:
        "1. Aplana la pechuga a un grosor parejo.\n2. Sazona con sal y pimienta.\n3. Cocina en plancha caliente con aceite, 4 a 5 minutos por lado.\n4. Llega a 74 °C en el centro.\n5. Deja reposar 2 minutos antes de servir.",
    },
    {
      platillo: "Hamburguesa",
      claves: ["hamburguesa", "burger"],
      porciones: 1,
      ingredientes: [
        { nombre: "Carne de res molida", cantidad: 120, unidad: "g" },
        { nombre: "Pan de hamburguesa", cantidad: 1, unidad: "und" },
        { nombre: "Queso", cantidad: 1, unidad: "und" },
        { nombre: "Sal", cantidad: 2, unidad: "g" },
        { nombre: "Aceite", cantidad: 5, unidad: "ml" },
      ],
      preparacion:
        "1. Forma la carne en una porción de 120 g, sin apretarla de más.\n2. Sazona solo con sal justo antes de cocinar.\n3. Cocina en plancha caliente 3 a 4 minutos por lado.\n4. Agrega el queso en el último minuto.\n5. Tuesta el pan y arma la hamburguesa.",
    },
    {
      platillo: "Papas fritas",
      claves: ["papas fritas", "papas francesas", "papas a la francesa", "papas"],
      porciones: 1,
      ingredientes: [
        { nombre: "Papa", cantidad: 250, unidad: "g" },
        { nombre: "Aceite", cantidad: 200, unidad: "ml" },
        { nombre: "Sal", cantidad: 2, unidad: "g" },
      ],
      preparacion:
        "1. Corta la papa en bastones parejos y enjuágala para quitar el almidón.\n2. Sécala muy bien.\n3. Blanquea en aceite a 150 °C unos 4 minutos.\n4. Escurre y deja enfriar.\n5. Fríe a 180 °C hasta dorar.\n6. Escurre sobre papel y sala al momento de servir.",
    },
    {
      platillo: "Arroz blanco",
      claves: ["arroz blanco", "arroz"],
      porciones: 1,
      ingredientes: [
        { nombre: "Arroz", cantidad: 100, unidad: "g" },
        { nombre: "Agua", cantidad: 200, unidad: "ml" },
        { nombre: "Sal", cantidad: 1, unidad: "g" },
        { nombre: "Aceite", cantidad: 5, unidad: "ml" },
      ],
      preparacion:
        "1. Enjuaga el arroz hasta que el agua salga clara.\n2. Sofríe en aceite 1 minuto.\n3. Agrega el agua y la sal, tapa y cocina a fuego bajo unos 18 minutos.\n4. Deja reposar tapado 5 minutos antes de servir.",
    },
    {
      platillo: "Ensalada de la casa",
      claves: ["ensalada", "ensalada de la casa"],
      porciones: 1,
      ingredientes: [
        { nombre: "Lechuga", cantidad: 80, unidad: "g" },
        { nombre: "Tomate", cantidad: 60, unidad: "g" },
        { nombre: "Cebolla", cantidad: 15, unidad: "g" },
        { nombre: "Aceite", cantidad: 10, unidad: "ml" },
        { nombre: "Limón", cantidad: 0.25, unidad: "und" },
        { nombre: "Sal", cantidad: 1, unidad: "g" },
      ],
      preparacion:
        "1. Lava y desinfecta las verduras, luego sécalas.\n2. Corta la lechuga en trozos, el tomate en gajos y la cebolla en juliana fina.\n3. Mezcla con aceite, limón y sal justo antes de servir.",
    },
    {
      platillo: "Carne asada",
      claves: ["carne asada", "bistec", "arrachera"],
      porciones: 1,
      ingredientes: [
        { nombre: "Carne de res", cantidad: 250, unidad: "g" },
        { nombre: "Sal", cantidad: 3, unidad: "g" },
        { nombre: "Ajo", cantidad: 5, unidad: "g" },
        { nombre: "Limón", cantidad: 0.5, unidad: "und" },
        { nombre: "Aceite", cantidad: 10, unidad: "ml" },
      ],
      preparacion:
        "1. Marina la carne con limón, ajo picado, sal y aceite de 1 a 2 horas.\n2. Saca la carne del refrigerador 15 minutos antes de cocinar.\n3. Asa a fuego alto 2 a 3 minutos por lado para dorar por fuera.\n4. Deja reposar 3 minutos y corta en contra de la fibra.",
    },
    {
      platillo: "Frijoles de la olla",
      claves: ["frijoles", "frijoles de la olla", "frijol"],
      porciones: 1,
      ingredientes: [
        { nombre: "Frijol", cantidad: 80, unidad: "g" },
        { nombre: "Agua", cantidad: 300, unidad: "ml" },
        { nombre: "Cebolla", cantidad: 20, unidad: "g" },
        { nombre: "Ajo", cantidad: 3, unidad: "g" },
        { nombre: "Sal", cantidad: 2, unidad: "g" },
      ],
      preparacion:
        "1. Lava el frijol y déjalo remojar toda la noche.\n2. Escúrrelo, ponlo en olla con agua, cebolla y ajo.\n3. Cocina a fuego medio-bajo de 1 hora y media a 2 horas, hasta que estén suaves.\n4. Agrega la sal al final y sirve caliente.",
    },
    {
      platillo: "Limonada natural",
      claves: ["limonada", "limonada natural"],
      porciones: 1,
      ingredientes: [
        { nombre: "Limón", cantidad: 1, unidad: "und" },
        { nombre: "Azúcar", cantidad: 20, unidad: "g" },
        { nombre: "Agua", cantidad: 300, unidad: "ml" },
      ],
      preparacion:
        "1. Exprime el limón y cuela el jugo.\n2. Disuelve el azúcar en un poco de agua tibia.\n3. Mezcla el jugo, el jarabe y el resto del agua.\n4. Sirve con hielo y ajusta el dulce al gusto.",
    },
    {
      platillo: "Quesadilla de queso",
      claves: ["quesadilla", "quesadilla de queso"],
      porciones: 1,
      ingredientes: [
        { nombre: "Tortilla de maíz", cantidad: 2, unidad: "und" },
        { nombre: "Queso", cantidad: 60, unidad: "g" },
        { nombre: "Aceite", cantidad: 5, unidad: "ml" },
      ],
      preparacion:
        "1. Calienta la tortilla en comal o plancha sin aceite, unos segundos por lado.\n2. Coloca el queso sobre una mitad y dobla.\n3. Dora 1 a 2 minutos por lado con un poco de aceite hasta que el queso se derrita.\n4. Corta en triángulos y sirve.",
    },
  ],
  panaderia: [
    {
      platillo: "Pan francés",
      claves: ["pan frances", "pan blanco", "pan de sal", "baguette"],
      porciones: 10,
      ingredientes: [
        { nombre: "Harina", cantidad: 500, unidad: "g" },
        { nombre: "Agua", cantidad: 300, unidad: "ml" },
        { nombre: "Sal", cantidad: 10, unidad: "g" },
        { nombre: "Levadura", cantidad: 10, unidad: "g" },
        { nombre: "Azúcar", cantidad: 15, unidad: "g" },
      ],
      preparacion:
        "1. Mezcla harina, sal, azúcar y levadura; agrega el agua.\n2. Amasa 10 minutos hasta que la masa esté lisa.\n3. Deja reposar tapada 1 hora hasta que duplique su tamaño.\n4. Divide en 10 piezas y dales forma.\n5. Reposa 30 minutos y hornea a 220 °C unos 20 minutos, hasta dorar.",
    },
    {
      platillo: "Torta de vainilla",
      claves: ["torta de vainilla", "bizcocho", "torta", "ponque"],
      porciones: 12,
      ingredientes: [
        { nombre: "Harina", cantidad: 300, unidad: "g" },
        { nombre: "Azúcar", cantidad: 250, unidad: "g" },
        { nombre: "Mantequilla", cantidad: 200, unidad: "g" },
        { nombre: "Huevo", cantidad: 4, unidad: "und" },
        { nombre: "Leche", cantidad: 120, unidad: "ml" },
        { nombre: "Polvo de hornear", cantidad: 10, unidad: "g" },
      ],
      preparacion:
        "1. Bate la mantequilla con el azúcar hasta que esté cremosa.\n2. Agrega los huevos uno a uno.\n3. Incorpora la harina con el polvo de hornear, alternando con la leche.\n4. Vierte en molde engrasado.\n5. Hornea a 175 °C de 40 a 45 minutos; un palillo debe salir limpio.\n6. Deja enfriar antes de desmoldar.",
    },
    {
      platillo: "Galletas de mantequilla",
      claves: ["galleta", "galletas"],
      porciones: 20,
      ingredientes: [
        { nombre: "Harina", cantidad: 250, unidad: "g" },
        { nombre: "Mantequilla", cantidad: 150, unidad: "g" },
        { nombre: "Azúcar", cantidad: 100, unidad: "g" },
        { nombre: "Huevo", cantidad: 1, unidad: "und" },
      ],
      preparacion:
        "1. Mezcla la mantequilla con el azúcar.\n2. Agrega el huevo y luego la harina hasta formar una masa.\n3. Refrigera 30 minutos.\n4. Estira, corta y hornea a 180 °C de 10 a 12 minutos.",
    },
  ],
  cafeteria: [
    {
      platillo: "Café americano",
      claves: ["americano", "cafe americano", "tinto", "cafe negro"],
      porciones: 1,
      ingredientes: [
        { nombre: "Café molido", cantidad: 15, unidad: "g" },
        { nombre: "Agua", cantidad: 250, unidad: "ml" },
      ],
      preparacion:
        "1. Calienta el agua a 92-96 °C, sin hervir.\n2. Prepara el café con el molido.\n3. Sirve de inmediato en taza precalentada.",
    },
    {
      platillo: "Capuchino",
      claves: ["capuchino", "cappuccino", "latte"],
      porciones: 1,
      ingredientes: [
        { nombre: "Café molido", cantidad: 18, unidad: "g" },
        { nombre: "Agua", cantidad: 50, unidad: "ml" },
        { nombre: "Leche", cantidad: 150, unidad: "ml" },
      ],
      preparacion:
        "1. Extrae un espresso con el café y el agua.\n2. Calienta y espuma la leche a unos 65 °C.\n3. Vierte la leche sobre el espresso y sirve.",
    },
    {
      platillo: "Jugo de naranja",
      claves: ["jugo de naranja", "naranjada"],
      porciones: 1,
      ingredientes: [{ nombre: "Naranja", cantidad: 4, unidad: "und" }],
      preparacion: "1. Lava y parte las naranjas.\n2. Exprime y cuela el jugo.\n3. Sirve frío y consume el mismo día.",
    },
    {
      platillo: "Malteada de vainilla",
      claves: ["malteada", "batido", "milkshake"],
      porciones: 1,
      ingredientes: [
        { nombre: "Helado de vainilla", cantidad: 200, unidad: "g" },
        { nombre: "Leche", cantidad: 150, unidad: "ml" },
      ],
      preparacion: "1. Licúa el helado con la leche 20 a 30 segundos.\n2. Sirve de inmediato en vaso frío.",
    },
  ],
  comida_rapida: [
    {
      platillo: "Perro caliente",
      claves: ["perro caliente", "hot dog", "perro"],
      porciones: 1,
      ingredientes: [
        { nombre: "Salchicha", cantidad: 1, unidad: "und" },
        { nombre: "Pan de perro", cantidad: 1, unidad: "und" },
        { nombre: "Queso", cantidad: 20, unidad: "g" },
      ],
      preparacion:
        "1. Cocina la salchicha en plancha hasta dorar.\n2. Tuesta ligeramente el pan.\n3. Arma con la salchicha, el queso y tus salsas.",
    },
    {
      platillo: "Pizza personal",
      claves: ["pizza personal", "pizza"],
      porciones: 1,
      ingredientes: [
        { nombre: "Harina", cantidad: 120, unidad: "g" },
        { nombre: "Agua", cantidad: 70, unidad: "ml" },
        { nombre: "Levadura", cantidad: 2, unidad: "g" },
        { nombre: "Salsa de tomate", cantidad: 50, unidad: "g" },
        { nombre: "Queso mozzarella", cantidad: 80, unidad: "g" },
        { nombre: "Aceite", cantidad: 5, unidad: "ml" },
      ],
      preparacion:
        "1. Amasa harina, agua, levadura y aceite; reposa 1 hora.\n2. Estira la masa en forma de disco.\n3. Agrega salsa y queso.\n4. Hornea a 250 °C de 8 a 10 minutos.",
    },
  ],
};

const sinAcentos = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/** Busca una receta base por el nombre del platillo. Devuelve la primera que coincida. */
export function buscarRecetaBase(tipo: string, platillo: string): RecetaBase | null {
  const nombre = sinAcentos(platillo);
  const buscar = (lista: RecetaBase[]) =>
    lista.find((r) => r.claves.some((c) => nombre.includes(sinAcentos(c)))) ?? null;
  // Primero las recetas del tipo de negocio; si no hay, las generales de restaurante (comida en general).
  return buscar(RECETAS_BIBLIOTECA[tipo] ?? []) ?? buscar(RECETAS_BIBLIOTECA.restaurante ?? []);
}
