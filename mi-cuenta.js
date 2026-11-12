/* ==========================================
   AL BEAUTY STUDIO - ESPACIO DEL CLIENTE
   ------------------------------------------
   Muestra las citas, pagos y recomendaciones
   del cliente autenticado. Las consultas filtran
   por clienteId y las reglas de Firestore
   impiden leer datos de otras personas.
========================================== */

import { auth, db } from "./firebase-config.js";
import { esperarSesion, cerrarSesion } from "./sesion.js";

import {
    collection,
    doc,
    getDocs,
    query,
    where,
    updateDoc,
    writeBatch,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js";

import {
    ESTADOS_CITA,
    formatoCOP,
    fechaISO,
    fechaLegible,
    idHorario,
    normalizarCelular,
    limpiarTexto,
    crear
} from "./app-comun.js";

const $ = (id) => document.getElementById(id);
let perfil = null;
let citas = [];

function mensaje(id, texto, tipo) {
    $(id).textContent = texto;
    $(id).className = "mensaje " + tipo;
}

function chip(estado) {
    return crear("span", { clase: "estado " + estado, texto: ESTADOS_CITA[estado] || estado });
}

function tabla(columnas, filas) {
    if (filas.length === 0) return crear("p", { clase: "vacio", texto: "Aún no tienes registros." });
    return crear("table", {}, [
        crear("thead", {}, crear("tr", {}, columnas.map((c) => crear("th", { scope: "col", clase: c.num ? "num" : null, texto: c.t })))),
        crear("tbody", {}, filas.map((f) => crear("tr", {}, f.map((celda, i) => crear("td", { clase: columnas[i].num ? "num" : null }, celda)))))
    ]);
}

async function consultar(coleccion) {
    const r = await getDocs(query(collection(db, coleccion), where("clienteId", "==", auth.currentUser.uid)));
    return r.docs.map((d) => ({ id: d.id, ...d.data() }));
}

function renderCitas() {
    const hoy = fechaISO();
    const ordenadas = citas.slice().sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora));

    $("tabla-citas").replaceChildren(tabla(
        [{ t: "Fecha" }, { t: "Hora" }, { t: "Servicio" }, { t: "Profesional" }, { t: "Valor", num: true }, { t: "Estado" }, { t: "" }],
        ordenadas.map((c) => [
            fechaLegible(c.fecha),
            c.hora,
            c.servicioNombre,
            c.profesionalNombre,
            formatoCOP(c.precio),
            chip(c.estado),
            ["pendiente", "confirmada"].includes(c.estado) && c.fecha >= hoy
                ? crear("button", { clase: "btn peligro peq", type: "button", texto: "Cancelar", onclick: () => cancelar(c) })
                : ""
        ])
    ));
}

async function cancelar(cita) {
    if (!confirm(`¿Cancelar tu cita de ${cita.servicioNombre} del ${fechaLegible(cita.fecha)} a las ${cita.hora}?`)) return;
    const motivo = limpiarTexto(prompt("Cuéntanos el motivo (opcional):", "") || "Cancelada por la clienta", 150);

    try {
        // Se cancela la cita y se libera el horario en una
        // sola operación atómica.
        const lote = writeBatch(db);
        lote.update(doc(db, "citas", cita.id), {
            estado: "cancelada",
            canceladaPor: "cliente",
            motivoCancelacion: motivo,
            actualizadaEn: serverTimestamp()
        });
        lote.delete(doc(db, "horariosOcupados", idHorario(cita.profesionalId, cita.fecha, cita.hora)));
        await lote.commit();

        Object.assign(cita, { estado: "cancelada", canceladaPor: "cliente", motivoCancelacion: motivo });
        renderCitas();
        mensaje("msg-citas", "Tu cita fue cancelada y el horario quedó libre.", "success");
    } catch (error) {
        console.error(error);
        mensaje("msg-citas", "No se pudo cancelar la cita. Comunícate con el estudio por WhatsApp.", "error");
    }
}

async function iniciar() {
    const sesion = await esperarSesion();

    if (!sesion.usuario) {
        window.location.replace("login.html?volver=mi-cuenta.html");
        return;
    }
    if (sesion.perfil?.rol === "admin") {
        window.location.replace("admin.html");
        return;
    }

    perfil = sesion.perfil || {};
    $("saludo").textContent = `Hola, ${perfil.nombre || auth.currentUser.email}`;
    $("perfil-nombre").value = perfil.nombre || "";
    $("perfil-documento").value = perfil.documento || "";
    $("perfil-telefono").value = String(perfil.telefono || "").replace(/^57/, "");
    $("perfil-correo").value = auth.currentUser.email;

    try {
        const [misCitas, facturas, recomendaciones] = await Promise.all([
            consultar("citas"),
            consultar("facturas"),
            consultar("recomendaciones")
        ]);
        citas = misCitas;
        renderCitas();

        $("tabla-facturas").replaceChildren(tabla(
            [{ t: "Número" }, { t: "Fecha" }, { t: "Servicios" }, { t: "Método" }, { t: "Total", num: true }, { t: "Estado" }],
            facturas.sort((a, b) => (b.numero || 0) - (a.numero || 0)).map((f) => [
                f.consecutivo, fechaLegible(f.fecha), (f.items || []).map((i) => i.nombre).join(", "),
                f.metodoPago, formatoCOP(f.total), chip(f.estadoPago)
            ])
        ));

        $("tabla-recomendaciones").replaceChildren(tabla(
            [{ t: "Tono / subtono" }, { t: "Ocasión" }, { t: "Servicio" }, { t: "Colores" }],
            recomendaciones.sort((a, b) => (b.creadaEn?.seconds || 0) - (a.creadaEn?.seconds || 0)).map((r) => [
                `${r.tonoPiel} / ${r.subtono}`, r.ocasion, r.servicioRecomendado, (r.colores || []).slice(0, 4).join(", ")
            ])
        ));
    } catch (error) {
        console.error(error);
        mensaje("msg-citas", "No se pudo consultar tu información (" + (error.code || error.message) + ").", "error");
    }

    $("pantalla-carga").classList.add("oculto");
    $("contenido").classList.remove("oculto");
}

$("form-perfil").addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const nombre = limpiarTexto($("perfil-nombre").value, 80);
    const documento = $("perfil-documento").value.replace(/\D/g, "");
    const telefono = normalizarCelular($("perfil-telefono").value);

    if (nombre.length < 3) return mensaje("msg-perfil", "Escribe tu nombre completo.", "error");
    if (documento && !/^\d{5,12}$/.test(documento)) return mensaje("msg-perfil", "El documento debe tener entre 5 y 12 dígitos.", "error");
    if (!telefono) return mensaje("msg-perfil", "Escribe un celular válido de 10 dígitos.", "error");

    try {
        await updateDoc(doc(db, "usuarios", auth.currentUser.uid), {
            nombre, nombreBusqueda: nombre.toLowerCase(), documento, telefono
        });
        $("saludo").textContent = `Hola, ${nombre}`;
        mensaje("msg-perfil", "Tus datos fueron actualizados.", "success");
    } catch (error) {
        mensaje("msg-perfil", "No se pudieron guardar los cambios.", "error");
    }
});

$("btn-salir").addEventListener("click", () => cerrarSesion("index.html"));

iniciar();
