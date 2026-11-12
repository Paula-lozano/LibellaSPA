/* ==========================================
   AL BEAUTY STUDIO - RESERVA DE CITAS
   ------------------------------------------
   RF-001 / CU-001. Flujo:
   1. Se cargan servicios y profesionales desde
      Firestore (colecciones servicios y
      profesionales).
   2. Al elegir fecha y profesional se consultan
      los horarios ocupados y se muestran solo
      los bloques libres.
   3. Al enviar, la cita se registra en la
      colección "citas" con estado "pendiente" y
      se bloquea el horario en "horariosOcupados"
      en una misma escritura atómica (batch).
   4. Se ofrece el enlace de WhatsApp con el
      resumen para notificar al estudio.
========================================== */

import { auth, db } from "./firebase-config.js";
import { esperarSesion, estadoSesion } from "./sesion.js";

import {
    collection,
    doc,
    query,
    where,
    getDocs,
    writeBatch,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js";

import {
    NEGOCIO,
    obtenerServicios,
    obtenerProfesionales,
    generarFranjas,
    idHorario,
    fechaISO,
    fechaLegible,
    formatoCOP,
    normalizarCelular,
    limpiarTexto,
    enlaceWhatsApp,
    crear
} from "./app-comun.js";

const formulario = document.getElementById("form-cita");
const nombreInput = document.getElementById("nombre");
const servicioSelect = document.getElementById("servicio");
const fechaInput = document.getElementById("fecha");
const profesionalSelect = document.getElementById("profesional");
const horaSelect = document.getElementById("hora");
const telefonoInput = document.getElementById("telefono");
const mensaje = document.getElementById("mensaje-cita");
const botonEnviar = formulario.querySelector('button[type="submit"]');

let servicios = [];
let profesionales = [];

function mostrarMensaje(contenido, tipo = "info") {
    mensaje.replaceChildren(...[].concat(contenido));
    mensaje.className = "form-message " + tipo;
}

function opcionesHora(texto) {
    horaSelect.replaceChildren(crear("option", { value: "", texto }));
}

/* ---------- Carga de catálogos ---------- */

async function cargarCatalogos() {
    [servicios, profesionales] = await Promise.all([
        obtenerServicios(),
        obtenerProfesionales()
    ]);

    servicioSelect.replaceChildren(
        crear("option", { value: "", disabled: true, selected: true, texto: "Selecciona un servicio" }),
        ...servicios.map((s) => crear("option", {
            value: s.id,
            texto: `${s.nombre} · ${formatoCOP(s.precio)}`
        }))
    );

    profesionalSelect.replaceChildren(
        crear("option", { value: "", disabled: true, selected: true, texto: "Selecciona una profesional" }),
        ...profesionales.map((p) => crear("option", { value: p.id, texto: p.nombre }))
    );

    // Preselección desde la tarjeta de servicio (?servicio=...)
    const sugerido = new URLSearchParams(location.search).get("servicio");
    if (sugerido && servicios.some((s) => s.id === sugerido)) {
        servicioSelect.value = sugerido;
    }
}

/* ---------- Disponibilidad ---------- */

async function consultarOcupados(fecha, profesionalId) {
    const consulta = query(
        collection(db, "horariosOcupados"),
        where("fecha", "==", fecha),
        where("profesional", "==", profesionalId)
    );
    const resultado = await getDocs(consulta);
    return resultado.docs.map((d) => d.data().hora);
}

async function actualizarHorarios() {
    const fecha = fechaInput.value;
    const profesional = profesionales.find((p) => p.id === profesionalSelect.value);

    if (!fecha || !profesional) {
        opcionesHora("Selecciona fecha y profesional");
        return;
    }

    if (fecha < fechaISO()) {
        opcionesHora("Selecciona una fecha futura");
        return;
    }

    opcionesHora("Consultando disponibilidad...");

    let ocupadas = [];
    try {
        ocupadas = await consultarOcupados(fecha, profesional.id);
    } catch (error) {
        console.error("Error al consultar disponibilidad:", error);
        opcionesHora("No se pudo consultar la disponibilidad");
        return;
    }

    const franjas = generarFranjas(profesional, fecha, ocupadas);

    if (franjas.length === 0) {
        const trabaja = profesional.dias.includes(new Date(fecha + "T00:00").getDay());
        opcionesHora(trabaja ? "No hay horarios disponibles" : "La profesional no atiende este día");
        return;
    }

    horaSelect.replaceChildren(
        crear("option", { value: "", texto: "Selecciona un horario" }),
        ...franjas.map((f) => crear("option", { value: f.hora, texto: f.etiqueta }))
    );
}

/* ---------- Registro de la cita ---------- */

formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    await esperarSesion();

    if (!auth.currentUser || !estadoSesion.perfil) {
        mostrarMensaje([
            "Para reservar debes iniciar sesión. ",
            crear("a", { href: "login.html?volver=index.html%23citas", texto: "Iniciar sesión" }),
            " o ",
            crear("a", { href: "registro.html", texto: "crear una cuenta" }),
            "."
        ], "error");
        return;
    }

    const nombre = limpiarTexto(nombreInput.value, 80);
    const servicio = servicios.find((s) => s.id === servicioSelect.value);
    const profesional = profesionales.find((p) => p.id === profesionalSelect.value);
    const fecha = fechaInput.value;
    const hora = horaSelect.value;
    const celular = normalizarCelular(telefonoInput.value);

    if (nombre.length < 3) return mostrarMensaje("Escribe tu nombre completo.", "error");
    if (!servicio) return mostrarMensaje("Selecciona un servicio.", "error");
    if (!fecha || fecha < fechaISO()) return mostrarMensaje("Selecciona una fecha futura.", "error");
    if (!profesional) return mostrarMensaje("Selecciona una profesional.", "error");

    // Se valida que la hora sea uno de los bloques
    // válidos (evita valores forzados desde DevTools).
    const validas = generarFranjas(profesional, fecha).map((f) => f.hora);
    if (!validas.includes(hora)) {
        return mostrarMensaje("Selecciona una hora disponible dentro del horario de atención.", "error");
    }

    if (!celular) {
        return mostrarMensaje("El número de WhatsApp debe ser un celular colombiano de 10 dígitos (ej. 3001234567).", "error");
    }

    botonEnviar.disabled = true;
    mostrarMensaje("Registrando tu cita...", "info");

    try {
        const lote = writeBatch(db);
        const refCita = doc(collection(db, "citas"));
        const refHorario = doc(db, "horariosOcupados", idHorario(profesional.id, fecha, hora));

        lote.set(refCita, {
            clienteId: auth.currentUser.uid,
            clienteNombre: nombre,
            clienteCorreo: auth.currentUser.email,
            clienteTelefono: celular,
            servicioId: servicio.id,
            servicioNombre: servicio.nombre,
            precio: Number(servicio.precio) || 0,
            profesionalId: profesional.id,
            profesionalNombre: profesional.nombre,
            fecha,
            hora,
            estado: "pendiente",
            creadaEn: serverTimestamp(),
            actualizadaEn: serverTimestamp()
        });

        lote.set(refHorario, {
            profesional: profesional.id,
            fecha,
            hora,
            citaId: refCita.id
        });

        await lote.commit();

        const texto =
            `Hola ${NEGOCIO.nombre}, registré una cita:\n` +
            `• Nombre: ${nombre}\n` +
            `• Servicio: ${servicio.nombre} (${formatoCOP(servicio.precio)})\n` +
            `• Profesional: ${profesional.nombre}\n` +
            `• Fecha: ${fechaLegible(fecha)} a las ${hora}\n` +
            `• Código: ${refCita.id.slice(0, 8).toUpperCase()}`;

        const enlace = enlaceWhatsApp(NEGOCIO.whatsapp, texto);

        mostrarMensaje([
            crear("strong", { texto: "¡Cita registrada! " }),
            `Código ${refCita.id.slice(0, 8).toUpperCase()} · ${servicio.nombre} el ${fechaLegible(fecha)} a las ${hora} con ${profesional.nombre}. `,
            "Estado: pendiente de confirmación. ",
            crear("a", { href: enlace, target: "_blank", rel: "noopener", texto: "Avisar por WhatsApp ↗" }),
            " · ",
            crear("a", { href: "mi-cuenta.html", texto: "Ver mis citas" })
        ], "success");

        window.open(enlace, "_blank", "noopener");

        formulario.reset();
        opcionesHora("Selecciona fecha y profesional");
        precargarDatos();

    } catch (error) {
        console.error("Error al registrar la cita:", error);
        if (error.code === "permission-denied") {
            mostrarMensaje("Ese horario acaba de ser reservado por otra persona. Elige otro, por favor.", "error");
            actualizarHorarios();
        } else {
            mostrarMensaje("No pudimos registrar la cita. Revisa tu conexión e inténtalo de nuevo.", "error");
        }
    } finally {
        botonEnviar.disabled = false;
    }
});

function precargarDatos() {
    const perfil = estadoSesion.perfil;
    if (!perfil) return;
    if (!nombreInput.value) nombreInput.value = perfil.nombre || "";
    if (!telefonoInput.value && perfil.telefono) {
        telefonoInput.value = String(perfil.telefono).replace(/^57/, "");
    }
}

/* ---------- Inicio ---------- */

fechaInput.min = fechaISO();
fechaInput.addEventListener("change", actualizarHorarios);
profesionalSelect.addEventListener("change", actualizarHorarios);
opcionesHora("Selecciona fecha y profesional");

cargarCatalogos();
document.addEventListener("sesion-cambio", precargarDatos);

document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
        fechaInput.min = fechaISO();
        actualizarHorarios();
    }
});
