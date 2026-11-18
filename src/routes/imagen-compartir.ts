import { createFileRoute } from "@tanstack/react-router";

// Imagen de vista previa (1200x630 PNG liviano) para WhatsApp, Facebook y demás redes.
// Se genera en el servidor sin dependencias: WhatsApp no acepta SVG.

const ANCHO = 1200;
const ALTO = 630;

type Color = [number, number, number];

const LETRAS: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
};

function dibujar(): Uint8Array {
  const px = new Uint8Array(ANCHO * ALTO * 3);

  const punto = (x: number, y: number, c: Color) => {
    if (x < 0 || y < 0 || x >= ANCHO || y >= ALTO) return;
    const i = (y * ANCHO + x) * 3;
    px[i] = c[0];
    px[i + 1] = c[1];
    px[i + 2] = c[2];
  };

  const rect = (x: number, y: number, w: number, h: number, c: Color) => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) punto(xx, yy, c);
  };

  const rectRedondo = (x: number, y: number, w: number, h: number, r: number, c: Color) => {
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        const cx = xx < x + r ? x + r : xx > x + w - r ? x + w - r : xx;
        const cy = yy < y + r ? y + r : yy > y + h - r ? y + h - r : yy;
        const dx = xx - cx;
        const dy = yy - cy;
        if (dx * dx + dy * dy <= r * r) punto(xx, yy, c);
      }
    }
  };

  const texto = (t: string, x: number, y: number, s: number, c: Color) => {
    let cx = x;
    for (const ch of t) {
      const g = LETRAS[ch];
      if (g) {
        for (let f = 0; f < 7; f++) {
          for (let k = 0; k < 5; k++) if (g[f][k] === "1") rect(cx + k * s, y + f * s, s, s, c);
        }
      }
      cx += 6 * s;
    }
  };

  // Fondo con degradado vertical índigo oscuro → casi negro
  for (let y = 0; y < ALTO; y++) {
    const t = y / (ALTO - 1);
    const c: Color = [
      Math.round(30 + (9 - 30) * t),
      Math.round(27 + (13 - 27) * t),
      Math.round(75 + (22 - 75) * t),
    ];
    rect(0, y, ANCHO, 1, c);
  }

  // Logo: cuadro blanco con la "G" índigo → esmeralda
  rectRedondo(80, 60, 120, 120, 28, [255, 255, 255]);
  const cx = 140;
  const cy = 120;
  for (let y = 70; y < 170; y++) {
    for (let x = 90; x < 190; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
      const enAnillo = d >= 27 && d <= 38 && !(ang > -55 && ang < -2);
      const enBarra = y >= cy - 5 && y <= cy + 5 && x >= cx && x <= cx + 38;
      if (enAnillo || enBarra) {
        const t = Math.min(1, Math.max(0, (x - 100) / 80));
        punto(x, y, [
          Math.round(79 + (16 - 79) * t),
          Math.round(70 + (185 - 70) * t),
          Math.round(229 + (129 - 229) * t),
        ]);
      }
    }
  }

  const blanco: Color = [255, 255, 255];
  texto("GOSARYC", 230, 78, 12, blanco);
  texto("GESTION Y VENTAS", 80, 250, 10, blanco);
  texto("PARA TU NEGOCIO", 80, 345, 10, blanco);

  rectRedondo(80, 480, 960, 80, 40, [5, 150, 105]);
  texto("POS + CONTABILIDAD + NOMINA + WHATSAPP", 104, 506, 4, blanco);

  return px;
}

const TABLA_CRC: Uint32Array = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(datos: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < datos.length; i++) c = TABLA_CRC[(c ^ datos[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function bloque(tipo: string, datos: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + datos.length);
  const v = new DataView(out.buffer);
  v.setUint32(0, datos.length);
  for (let i = 0; i < 4; i++) out[4 + i] = tipo.charCodeAt(i);
  out.set(datos, 8);
  v.setUint32(8 + datos.length, crc32(out.subarray(4, 8 + datos.length)));
  return out;
}

async function comprimir(datos: Uint8Array): Promise<Uint8Array> {
  const flujo = new Blob([datos.buffer as ArrayBuffer]).stream().pipeThrough(new CompressionStream("deflate"));
  return new Uint8Array(await new Response(flujo).arrayBuffer());
}

async function crearPng(): Promise<ArrayBuffer> {
  const px = dibujar();
  const fila = ANCHO * 3;
  const crudo = new Uint8Array(ALTO * (fila + 1));
  for (let y = 0; y < ALTO; y++) {
    crudo[y * (fila + 1)] = 0;
    crudo.set(px.subarray(y * fila, (y + 1) * fila), y * (fila + 1) + 1);
  }
  const ihdr = new Uint8Array(13);
  const v = new DataView(ihdr.buffer);
  v.setUint32(0, ANCHO);
  v.setUint32(4, ALTO);
  ihdr[8] = 8; // profundidad
  ihdr[9] = 2; // RGB
  const firma = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const partes = [firma, bloque("IHDR", ihdr), bloque("IDAT", await comprimir(crudo)), bloque("IEND", new Uint8Array(0))];
  const total = partes.reduce((s: number, p: Uint8Array) => s + p.length, 0);
  const salida = new Uint8Array(total);
  let pos = 0;
  for (const p of partes) {
    salida.set(p, pos);
    pos += p.length;
  }
  return salida.buffer as ArrayBuffer;
}

let enCache: Promise<ArrayBuffer> | null = null;

export const Route = createFileRoute("/imagen-compartir")({
  server: {
    handlers: {
      GET: async () => {
        if (!enCache) enCache = crearPng();
        let png: ArrayBuffer;
        try {
          png = await enCache;
        } catch (e) {
          enCache = null;
          throw e;
        }
        return new Response(png.slice(0), {
          headers: {
            "Content-Type": "image/png",
            "Content-Length": String(png.byteLength),
            "Cache-Control": "public, max-age=86400",
          },
        });
      },
    },
  },
});
