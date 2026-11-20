import { describe, expect, it } from "vitest";
import { esCuentaMaestra } from "@/lib/cuenta-maestra";
import {
  evaluarVigenciaLicencia,
  guardarTokenLicenciaOffline,
  leerTokenLicenciaOffline,
  obtenerIdDispositivo,
} from "@/lib/licencia-offline";

type RolUsuario = "dueno" | "empleado" | "soporte" | "superadmin";

interface RegistroNegocio {
  id: string;
  owner_id: string;
  negocio_id: string;
}

interface Cliente extends RegistroNegocio {
  nombre: string;
}

interface Venta extends RegistroNegocio {
  cliente_id: string;
  total: number;
}

/**
 * Simulador determinístico de las políticas RLS de Gosaryc:
 * - Todo registro está aislado por owner_id y negocio_id.
 * - No se permite enlazar entidades de otro negocio (cross-tenant FK).
 * - Solo jhonathan.cortes.24@gmail.com puede actuar como superadmin y emitir licencias pagas.
 */
class MotorSeguridadRLS {
  private clientes: Cliente[] = [];
  private ventas: Venta[] = [];
  private roles = new Map<string, RolUsuario>();
  private suscripciones = new Map<string, { plan: string; dias: number }>();

  registrarNegocioNuevo(ownerId: string, correo: string) {
    this.roles.set(ownerId, esCuentaMaestra(correo) ? "superadmin" : "dueno");
    // Regla de negocio: todo negocio nuevo recibe exactamente 30 días de prueba.
    this.suscripciones.set(ownerId, { plan: "prueba", dias: 30 });
  }

  insertarCliente(actorOwnerId: string, cliente: Cliente) {
    if (cliente.owner_id !== actorOwnerId) {
      throw new Error("RLS_DENIED: owner_id no coincide con el usuario autenticado");
    }
    this.clientes.push(cliente);
  }

  consultarClientes(actorOwnerId: string): Cliente[] {
    return this.clientes.filter((c) => c.owner_id === actorOwnerId);
  }

  insertarVenta(actorOwnerId: string, venta: Venta) {
    if (venta.owner_id !== actorOwnerId) {
      throw new Error("RLS_DENIED: no puedes registrar ventas en otro negocio");
    }
    const cliente = this.clientes.find((c) => c.id === venta.cliente_id && c.owner_id === actorOwnerId);
    if (!cliente || cliente.negocio_id !== venta.negocio_id) {
      throw new Error("RLS_DENIED: no puedes enlazar un cliente de otro negocio");
    }
    this.ventas.push(venta);
  }

  consultarVentas(actorOwnerId: string): Venta[] {
    return this.ventas.filter((v) => v.owner_id === actorOwnerId);
  }

  cambiarRol(actorCorreo: string, objetivoOwnerId: string, nuevoRol: RolUsuario) {
    if (!esCuentaMaestra(actorCorreo)) {
      throw new Error("RLS_DENIED: un usuario normal no puede auto-asignarse rol de soporte o admin");
    }
    this.roles.set(objetivoOwnerId, nuevoRol);
  }

  generarLicenciaAnual(actorCorreo: string, objetivoOwnerId: string): string {
    if (!esCuentaMaestra(actorCorreo)) {
      throw new Error("RLS_DENIED: solo la cuenta maestra puede generar licencias pagas de 1 año");
    }
    this.suscripciones.set(objetivoOwnerId, { plan: "anual", dias: 365 });
    return `GSR-ANUAL-${objetivoOwnerId.slice(0, 6).toUpperCase()}`;
  }

  obtenerSuscripcion(ownerId: string) {
    return this.suscripciones.get(ownerId) ?? null;
  }
}

describe("Reglas de Negocio y Seguridad: Aislamiento multi-negocio (RLS)", () => {
  it("impide que el Negocio A consulte o enlace clientes o ventas del Negocio B", () => {
    const db = new MotorSeguridadRLS();
    db.registrarNegocioNuevo("owner-A", "duenoA@negocio.com");
    db.registrarNegocioNuevo("owner-B", "duenoB@negocio.com");

    db.insertarCliente("owner-A", { id: "cli-A1", owner_id: "owner-A", negocio_id: "neg-A", nombre: "Ana Negocio A" });
    db.insertarCliente("owner-B", { id: "cli-B1", owner_id: "owner-B", negocio_id: "neg-B", nombre: "Beto Negocio B" });

    db.insertarVenta("owner-B", {
      id: "ven-B1",
      owner_id: "owner-B",
      negocio_id: "neg-B",
      cliente_id: "cli-B1",
      total: 150000,
    });

    // Negocio A solo ve sus propios clientes y ninguna venta de B.
    expect(db.consultarClientes("owner-A").map((c) => c.id)).toEqual(["cli-A1"]);
    expect(db.consultarVentas("owner-A")).toEqual([]);

    // Negocio A no puede enlazar un cliente de Negocio B en una venta propia.
    expect(() =>
      db.insertarVenta("owner-A", {
        id: "ven-A-ilegal",
        owner_id: "owner-A",
        negocio_id: "neg-A",
        cliente_id: "cli-B1",
        total: 50000,
      }),
    ).toThrow(/RLS_DENIED/);

    // Negocio A tampoco puede insertar registros a nombre de Negocio B.
    expect(() =>
      db.insertarCliente("owner-A", {
        id: "cli-infiltrado",
        owner_id: "owner-B",
        negocio_id: "neg-B",
        nombre: "Infiltrado",
      }),
    ).toThrow(/RLS_DENIED/);
  });

  it("rechaza tokens offline de otro negocio, otro dispositivo o con firma manipulada", async () => {
    const venceEn = new Date(Date.now() + 20 * 86400000).toISOString();
    await guardarTokenLicenciaOffline({
      owner_id: "owner-A",
      negocio_id: "neg-A",
      plan: "anual",
      estado: "activo",
      vence_en: venceEn,
      dias_gracia: 3,
    });

    const validoA = await leerTokenLicenciaOffline("owner-A");
    expect(validoA?.owner_id).toBe("owner-A");

    // Negocio B no puede reutilizar el token local de Negocio A.
    const bloqueadoB = await leerTokenLicenciaOffline("owner-B");
    expect(bloqueadoB).toBeNull();

    // Si alguien manipula la fecha o el plan en localStorage, la firma invalida el token.
    const raw = JSON.parse(window.localStorage.getItem("gosaryc:licencia-token-v1") ?? "{}");
    raw.plan = "anual_infinito";
    window.localStorage.setItem("gosaryc:licencia-token-v1", JSON.stringify(raw));
    expect(await leerTokenLicenciaOffline("owner-A")).toBeNull();

    // Si el token se copia de otro dispositivo, se rechaza.
    await guardarTokenLicenciaOffline({
      owner_id: "owner-A",
      negocio_id: "neg-A",
      plan: "anual",
      estado: "activo",
      vence_en: venceEn,
    });
    expect(obtenerIdDispositivo()).toMatch(/^GSR-/);
    window.localStorage.setItem("gosaryc:dispositivo-id-v1", "GSR-OTRO-PC");
    expect(await leerTokenLicenciaOffline("owner-A")).toBeNull();
  });
});

describe("Reglas de Negocio y Seguridad: Licencias, Roles y 30 días de prueba", () => {
  it("solo permite acceso de superadmin y generador anual a jhonathan.cortes.24@gmail.com", () => {
    expect(esCuentaMaestra("jhonathan.cortes.24@gmail.com")).toBe(true);
    expect(esCuentaMaestra("  JHONATHAN.CORTES.24@GMAIL.COM  ")).toBe(true);
    expect(esCuentaMaestra("admin@gosaryc.com")).toBe(false);
    expect(esCuentaMaestra("soporte@gosaryc.com")).toBe(false);
    expect(esCuentaMaestra("usuario@gmail.com")).toBe(false);
    expect(esCuentaMaestra(null)).toBe(false);

    const db = new MotorSeguridadRLS();
    db.registrarNegocioNuevo("owner-normal", "cliente@tienda.com");

    // Un usuario normal no puede auto-asignarse rol de soporte/admin ni crear licencias pagas.
    expect(() => db.cambiarRol("cliente@tienda.com", "owner-normal", "soporte")).toThrow(/RLS_DENIED/);
    expect(() => db.cambiarRol("cliente@tienda.com", "owner-normal", "superadmin")).toThrow(/RLS_DENIED/);
    expect(() => db.generarLicenciaAnual("cliente@tienda.com", "owner-normal")).toThrow(/RLS_DENIED/);

    // Solo la cuenta maestra puede generar licencias de 1 año.
    const clave = db.generarLicenciaAnual("jhonathan.cortes.24@gmail.com", "owner-normal");
    expect(clave).toMatch(/^GSR-ANUAL-/);
    expect(db.obtenerSuscripcion("owner-normal")).toEqual({ plan: "anual", dias: 365 });
  });

  it("otorga exactamente 30 días de prueba a negocios nuevos y evalúa vigencia/gracia/bloqueo", () => {
    const db = new MotorSeguridadRLS();
    db.registrarNegocioNuevo("owner-nuevo", "nuevo@negocio.com");
    expect(db.obtenerSuscripcion("owner-nuevo")).toEqual({ plan: "prueba", dias: 30 });

    const en30Dias = new Date(Date.now() + 30 * 86400000).toISOString();
    const pruebaActiva = evaluarVigenciaLicencia("activo", en30Dias, 3);
    expect(pruebaActiva.bloqueo).toBeNull();
    expect(pruebaActiva.enGracia).toBe(false);
    expect(pruebaActiva.diasRestantes).toBe(30);

    const vencidaHace1Dia = new Date(Date.now() - 1 * 86400000).toISOString();
    const enGracia = evaluarVigenciaLicencia("activo", vencidaHace1Dia, 3);
    expect(enGracia.bloqueo).toBeNull();
    expect(enGracia.enGracia).toBe(true);
    expect(enGracia.diasGraciaRestantes).toBeGreaterThanOrEqual(1);

    const vencidaHace5Dias = new Date(Date.now() - 5 * 86400000).toISOString();
    const bloqueada = evaluarVigenciaLicencia("activo", vencidaHace5Dias, 3);
    expect(bloqueada.bloqueo).toBe("vencido");

    const suspendida = evaluarVigenciaLicencia("suspendido", en30Dias, 3);
    expect(suspendida.bloqueo).toBe("suspendido");
  });
});
