# TESTING

Estado (2026-11-14): ninguna prueba de seguridad ha sido ejecutada. No hay acceso a la base desde el asistente.
Una prueba escrita no es una prueba aprobada.

## Dónde están las pruebas
`supabase/tests/` (NO es una carpeta de migraciones: GoIDE no las aplica solas). Cada archivo es independiente, crea sus propias empresas A y B de prueba y termina en `ROLLBACK`: no deja datos ni funciones.

| Conjunto | Archivo | Pruebas |
|---|---|---|
| A. Bodegas y existencias | `A_bodegas_existencias.sql` | A0–A14 |
| B. Historial del equipo | `B_historial_equipo.sql` | B0–B8 |
| C. Clientes | `C_clientes.sql` | C0–C7 |
| D. Pedidos y relaciones | `D_pedidos_relaciones.sql` | D0–D12 |
| E. Archivos privados | `E_archivos_privados.sql` | E0–E13 |
| F. Roles y permisos | `F_roles_permisos.sql` | F0–F11 |
| Conciliación de propietarios (solo lectura) | `informe_conciliacion_propietarios.sql` | 9 consultas |

## Cómo se lee el resultado
Cada prueba emite un aviso `RESULTADO | id | estado | detalle`:
- **BLOQUEADA_OK**: se bloqueó con el código de error o el número de filas esperado (no vale "cualquier error").
- **PERMITIDA_INDEBIDAMENTE**: falla de seguridad.
- **ERROR_TECNICO**: error distinto del esperado; NO cuenta como aprobada, hay que revisarla.
- **NO_EJECUTADA**: no se pudo preparar (tabla, bucket o columna inesperada).
- **CONTROL_OK / CONTROL_FALLIDO**: confirma que lo legítimo sí funciona. Sin controles OK, un bloqueo no demuestra nada.

## Cambios respecto a la versión anterior
- Las pruebas se quitaron de la migración: ya no pueden afectar las correcciones.
- Se eliminó el criterio "pasa si hubo cualquier error" (antes P3 y P6).
- Se agregaron controles positivos y pruebas con visitante sin sesión (anon).

## Resultados reales
| Conjunto | Ejecutado | Resultado |
|---|---|---|
| A, B, C, D, E, F | NO | Sin resultado. Preparadas, no aprobadas |
| Migración aplicada / políticas activas | NO CONFIRMADO | — |

## Pendiente
1. Ejecutar A–F en un entorno de pruebas y registrar cada línea `RESULTADO` aquí.
2. Descarga con la API de Storage con dos sesiones reales (las pruebas E solo cubren las políticas de la base).
3. Finanzas, sin conexión y suscripciones (ver plan mínimo en PROJECT_CONTROL.md).
