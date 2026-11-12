# AL Beauty Studio — Portafolio web y gestión de servicios

Portafolio web con reserva de citas, simulador de colorimetría y panel administrativo
(agenda, facturación, reportes y clientes) para AL Beauty Studio.

- **Producción:** https://al-beauty-studio-five.vercel.app/
- **Frontend:** HTML5, CSS3 y JavaScript (módulos ES) — sin framework.
- **Backend (BaaS):** Firebase Authentication + Cloud Firestore con reglas de seguridad (`firestore.rules`).
- **Servicios externos:** EmailJS (correo de bienvenida) y WhatsApp (enlaces `wa.me`).
- **Hosting:** Vercel (HTTPS, cabeceras de seguridad en `vercel.json`).

> El identificador técnico del proyecto de Firebase (`libella-spa`) conserva el nombre
> comercial anterior de la empresa. La marca vigente en la interfaz es **AL Beauty Studio**.

## Páginas

| Página | Rol | Descripción |
|---|---|---|
| `index.html` | Público / cliente | Servicios con precios, reserva de citas, opiniones, suscripción |
| `Galeria.html?servicio=` | Público | Galería de manicure, pedicure y acrílicas |
| `Simulador.html` | Público / cliente | Recomendación por colorimetría (tono, subtono, ocasión) |
| `registro.html` / `login.html` | Público | Registro de clientes e inicio de sesión con recuperación de contraseña |
| `mi-cuenta.html` | Cliente | Mis citas (cancelar), pagos, recomendaciones y datos |
| `admin.html` | Administrador | Agenda por profesional, citas, facturación, reportes, clientes, servicios, profesionales y opiniones |

## Base de datos (Cloud Firestore)

| Colección | Entidad | Campos principales |
|---|---|---|
| `usuarios/{uid}` | Cliente / Administrador | nombre, documento, correo, telefono, rol, activo, fechaRegistro |
| `servicios/{id}` | Servicio | nombre, categoria, descripcion, precio, duracionMin, foto, activo |
| `profesionales/{id}` | Profesional | nombre, especialidad, entrada, salida, dias[], activo |
| `citas/{id}` | Cita | clienteId, servicioId, profesionalId, fecha, hora, precio, estado, facturaId |
| `horariosOcupados/{prof_fecha_hora}` | Bloqueo de agenda | profesional, fecha, hora, citaId |
| `facturas/{id}` | Factura + detalle | numero, consecutivo, clienteId, citaId, items[], subtotal, descuento, total, metodoPago, estadoPago |
| `config/facturacion` | Consecutivo | ultimoNumero |
| `recomendaciones/{id}` | Recomendación | clienteId, tonoPiel, subtono, ocasion, colores[], servicioRecomendado |
| `opiniones/{id}` | Opinión | usuarioId, nombre, comentario, calificacion, visible |

## Puesta en marcha

1. **Publicar las reglas:** Firebase Console → Firestore Database → Reglas → pegar `firestore.rules` → Publicar.
2. **Crear la administradora:** registrar una cuenta en `registro.html`, luego en Firebase Console →
   Firestore → `usuarios/{uid}` cambiar el campo `rol` de `cliente` a `admin`.
3. Ingresar a `admin.html` y pulsar **Cargar servicios y profesionales iniciales**; ajustar precios.
4. Desplegar: `git push` a la rama conectada con Vercel.

Para probar en local basta un servidor estático (por ejemplo, la extensión Live Server de VS Code);
`localhost` está autorizado por defecto en Firebase Authentication.
