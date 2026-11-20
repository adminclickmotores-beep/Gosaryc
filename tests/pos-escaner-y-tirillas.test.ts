import { describe, expect, it } from "vitest";
import {
  descontarStockOffline,
  generarEAN13,
  limpiarStockOffline,
  stockEfectivoOffline,
} from "@/lib/escaner-barras";
import { limpiarNombreImpresora } from "@/lib/impresion-local";
import {
  comandaCocinaHTML,
  escaparCelda,
  escaparHtml,
  facturaHTML,
  urlSegura,
} from "@/lib/exportes";
import { construirJsonFiscal } from "@/lib/dian";

function esEAN13Valido(codigo: string): boolean {
  if (!/^\d{13}$/.test(codigo)) return false;
  let suma = 0;
  for (let i = 0; i < 12; i++) {
    const digito = Number(codigo[i]);
    suma += i % 2 === 0 ? digito : digito * 3;
  }
  const controlEsperado = (10 - (suma % 10)) % 10;
  return Number(codigo[12]) === controlEsperado;
}

describe("POS, Escáner, Inventario, Tirillas y Exportes", () => {
  it("calcula totales fiscales (subtotal, IVA, INC y total) y genera tirillas/comandas seguras", () => {
    const json = construirJsonFiscal({
      prefijo: "FE",
      numero: 1024,
      resolucion: "18764000001234",
      negocio: "Restaurante El Sabor",
      nit: "900123456-7",
      cliente: "Carlos Pérez",
      items: [
        { descripcion: "Hamburguesa Artesanal", cantidad: 2, precio: 25000 },
        { descripcion: "Limonada Natural", cantidad: 1, precio: 10000 },
      ],
      ivaPct: 19,
      incPct: 8,
      ambiente: "Pruebas",
    });

    expect(json.subtotal).toBe(60000);
    expect(json.iva).toBe(11400);
    expect(json.inc).toBe(4800);
    expect(json.total).toBe(76200);

    const htmlTirilla = facturaHTML(
      {
        negocio: "Mi Negocio <script>alert(1)</script>",
        nit: "900123456-7",
        numero: "1024",
        cliente: "Cliente Prueba",
        items: [{ descripcion: "Café", cantidad: 2, precio: 5000 }],
        ivaPct: 19,
        logoUrl: "javascript:alert(1)",
      },
      "80mm",
    );
    expect(htmlTirilla).not.toContain("<script>alert(1)</script>");
    expect(htmlTirilla).not.toContain("javascript:alert(1)");
    expect(htmlTirilla).toContain("1024");

    const htmlComanda = comandaCocinaHTML(
      {
        negocio: "Cocina Central",
        numero: "45",
        modalidad: "mesa",
        mesa: "7",
        cliente: "Laura",
        items: [{ nombre: "Bandeja Paisa", cantidad: 2 }],
      },
      "58mm",
    );
    expect(htmlComanda).toContain("COMANDA COCINA");
    expect(htmlComanda).toContain("MESA 7");
    expect(htmlComanda).toContain("SIN PRECIOS");
  });

  it("descuenta stock en inventario tras una venta y lo restaura al sincronizar", () => {
    expect(stockEfectivoOffline("com_productos", "prod-1", 10)).toBe(10);

    descontarStockOffline("com_productos", [
      { productoId: "prod-1", cantidad: 3 },
      { productoId: "prod-2", cantidad: 5 },
    ]);
    expect(stockEfectivoOffline("com_productos", "prod-1", 10)).toBe(7);
    expect(stockEfectivoOffline("com_productos", "prod-2", 4, false)).toBe(0);
    expect(stockEfectivoOffline("com_productos", "prod-2", 4, true)).toBe(-1);

    // Acumula una segunda venta sobre el mismo producto.
    descontarStockOffline("com_productos", [{ productoId: "prod-1", cantidad: 2 }]);
    expect(stockEfectivoOffline("com_productos", "prod-1", 10)).toBe(5);

    limpiarStockOffline("com_productos");
    expect(stockEfectivoOffline("com_productos", "prod-1", 10)).toBe(10);
  });

  it("genera códigos EAN-13 válidos con prefijo interno 200 y dígito de control correcto", () => {
    for (let i = 0; i < 50; i++) {
      const codigo = generarEAN13();
      expect(codigo).toHaveLength(13);
      expect(codigo.startsWith("200")).toBe(true);
      expect(esEAN13Valido(codigo)).toBe(true);
    }
  });

  it("sanitiza nombres de impresora bloqueando inyección de comandos de shell", () => {
    expect(limpiarNombreImpresora("EPSON TM-T20II (Caja #1)")).toBe("EPSON TM-T20II (Caja #1)");
    expect(limpiarNombreImpresora("\\\\SERVIDOR\\Cocina_80mm")).toBe("\\\\SERVIDOR\\Cocina_80mm");

    const malicioso = 'EPSON"; rm -rf / & calc.exe | $(whoami) `id` <script>';
    const limpio = limpiarNombreImpresora(malicioso);
    expect(limpio).not.toMatch(/[;"&|$`<>]/);
  });

  it("sanitiza celdas de Excel contra inyección de fórmulas y escapa HTML/URLs", () => {
    expect(escaparCelda("=CMD|' /C calc'!A0")).toBe("'=CMD|' /C calc'!A0");
    expect(escaparCelda("+1+1")).toBe("'+1+1");
    expect(escaparCelda("-2+3")).toBe("'-2+3");
    expect(escaparCelda("@SUM(A1:A5)")).toBe("'@SUM(A1:A5)");
    expect(escaparCelda("  \t=HYPERLINK(\"http://evil\")")).toBe('"\'=HYPERLINK(""http://evil"")"');
    expect(escaparCelda("Producto; Especial")).toBe('"Producto; Especial"');
    expect(escaparCelda(125000)).toBe("125000");

    expect(escaparHtml('<img src=x onerror="alert(1)">')).toBe("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(urlSegura("https://gosaryc.lovable.app/logo.png")).toBe("https://gosaryc.lovable.app/logo.png");
    expect(urlSegura("javascript:alert(1)")).toBeNull();
  });
});
