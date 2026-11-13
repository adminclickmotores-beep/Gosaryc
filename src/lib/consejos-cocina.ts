/** Guía de preparación y aprovechamiento según el tipo de plato o ingrediente. */
type Regla = { patron: RegExp; tema: string; consejos: string[] };

const REGLAS: Regla[] = [
  {
    patron: /pollo|alas|tender|pechuga|chuleta de pollo/,
    tema: "Pollo",
    consejos: [
      "Cocina hasta 74 °C en el centro; usa un termómetro para no pasarte ni quedarte corto.",
      "Marinar 2 a 4 horas en frío ablanda la carne y permite usar cortes más económicos.",
      "Aprovecha huesos y recortes para caldo o salsas: es costo que ya pagaste.",
    ],
  },
  {
    patron: /cerdo|chuleta|costilla|tocino|carne|res|hamburg/,
    tema: "Carnes",
    consejos: [
      "Porciona y pesa cada corte al recibirlo: así cada plato lleva siempre la misma cantidad.",
      "Aplana la chuleta o carne a un grosor parejo para que cocine uniforme y rinda mejor.",
      "Congela en porciones individuales para no descongelar de más y evitar mermas.",
    ],
  },
  {
    patron: /apanad|fritur|frito|crujiente|crokante|tempura/,
    tema: "Apanados y fritos",
    consejos: [
      "Seca bien el producto antes de apanar; el apanado se pega mejor y absorbe menos aceite.",
      "Fríe a 170–180 °C: más frío absorbe aceite, más caliente se quema por fuera y queda crudo por dentro.",
      "Filtra el aceite al terminar el día y cámbialo cuando oscurezca o huela fuerte: cuida el sabor y la salud.",
      "No sobrecargues la freidora; baja la temperatura y el plato sale aceitoso.",
    ],
  },
  {
    patron: /papa|yuca|platano|patacon/,
    tema: "Papas y tubérculos",
    consejos: [
      "Lava el almidón y fríe en dos tiempos (blanquear a 150 °C y terminar a 180 °C) para papas crocantes por fuera y suaves por dentro.",
      "Compra por bulto y guarda en lugar fresco y oscuro; la papa reverdecida se desperdicia.",
      "Pela y corta solo lo del turno; cortada se oxida y pierde calidad.",
    ],
  },
  {
    patron: /arroz|pasta|spaghetti|fideo/,
    tema: "Arroz y pastas",
    consejos: [
      "Mide con la misma taza siempre: el arroz y la pasta cambian mucho de volumen al cocinar.",
      "Prepara por tandas según la hora pico y evita guardar cocidos más de 2 horas a temperatura ambiente.",
    ],
  },
  {
    patron: /ensalada|verdura|lechuga|tomate|cebolla|hortaliza/,
    tema: "Verduras",
    consejos: [
      "Lava y desinfecta, y guarda secas en recipientes tapados: duran varios días más.",
      "Usa el mismo vegetal en varios platos para comprar más y desperdiciar menos.",
    ],
  },
  {
    patron: /limonada|jugo|bebida|gaseosa|cafe|te\b|batido/,
    tema: "Bebidas",
    consejos: [
      "Las bebidas suelen tener el mejor margen: ofrécelas como combo con el plato fuerte.",
      "Estandariza vasos y medidas para que el costo por vaso sea siempre igual.",
    ],
  },
  {
    patron: /pizza|masa|pan|harina|arepa|empanada/,
    tema: "Masas y panes",
    consejos: [
      "Pesa la harina en gramos, no por tazas: la diferencia entre una y otra cambia el resultado.",
      "Deja reposar la masa para mejor textura y congela bolas ya porcionadas.",
    ],
  },
  {
    patron: /sopa|caldo|sancocho|crema|ajiaco/,
    tema: "Sopas y caldos",
    consejos: [
      "Haz el caldo base con recortes y huesos; sirve para varias recetas y baja el costo.",
      "Enfría rápido en recipientes bajos antes de refrigerar.",
    ],
  },
  {
    patron: /postre|torta|helado|brownie|flan|dulce/,
    tema: "Postres",
    consejos: [
      "Los postres tienen margen alto: ofrécelos al cerrar la cuenta.",
      "Prepara en tandas y vende por porción con peso exacto.",
    ],
  },
];

const GENERALES = [
  "Usa PEPS: lo primero que entra es lo primero que sale. Rotula con la fecha de compra.",
  "Compra lo que rota rápido en poca cantidad y lo que dura en volumen, con el mejor precio.",
  "Pesa y registra la merma (lo que se pierde al limpiar o cocinar) para que el costo del plato sea real.",
  "Cotiza cada insumo con 2 o 3 proveedores cada mes.",
];

export function consejosPara(textos: string[]): { tema: string; consejos: string[] }[] {
  const base = textos
    .join(" ")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
  const encontrados = REGLAS.filter((r) => r.patron.test(base)).map((r) => ({ tema: r.tema, consejos: r.consejos }));
  return [...encontrados, { tema: "Para todo el inventario", consejos: GENERALES }];
}
