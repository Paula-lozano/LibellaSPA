/* ==========================================
   AL BEAUTY STUDIO - OPINIONES
   ------------------------------------------
   Las opiniones se guardan en la colección
   "opiniones" de Firestore. Para publicar se
   requiere sesión iniciada. Todo el contenido
   se pinta con textContent para evitar que un
   texto con etiquetas HTML o scripts se ejecute
   (prevención de XSS almacenado).
========================================== */

import { auth, db } from "./firebase-config.js";
import { esperarSesion, estadoSesion } from "./sesion.js";

import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js";

import { limpiarTexto, crear } from "./app-comun.js";

const formulario = document.getElementById("form-opinion");
const nombreInput = document.getElementById("usuario");
const comentarioInput = document.getElementById("comentario");
const calificacionSelect = document.getElementById("calificacion");
const mensaje = document.getElementById("mensaje-opinion");
const lista = document.getElementById("lista-opiniones");

function mostrarMensaje(contenido, tipo) {
    mensaje.replaceChildren(...[].concat(contenido));
    mensaje.className = "form-message " + tipo;
}

function tarjeta(opinion) {
    const fecha = opinion.creadaEn?.toDate
        ? opinion.creadaEn.toDate().toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })
        : "";
    const estrellas = "★".repeat(opinion.calificacion || 5) + "☆".repeat(5 - (opinion.calificacion || 5));

    return crear("article", { clase: "opinion-item" }, [
        crear("span", { clase: "opinion-stars", "aria-label": `${opinion.calificacion} de 5 estrellas`, texto: estrellas }),
        crear("p", { texto: opinion.comentario }),
        crear("strong", { texto: opinion.nombre }),
        crear("small", { texto: fecha })
    ]);
}

async function cargarOpiniones() {
    try {
        const resultado = await getDocs(query(collection(db, "opiniones"), where("visible", "==", true)));
        const opiniones = resultado.docs
            .map((d) => d.data())
            .sort((a, b) => (b.creadaEn?.seconds || 0) - (a.creadaEn?.seconds || 0))
            .slice(0, 9);

        lista.replaceChildren(...opiniones.map(tarjeta));
    } catch (error) {
        console.warn("No se pudieron cargar las opiniones:", error.code || error);
    }
}

formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    await esperarSesion();

    if (!auth.currentUser || !estadoSesion.perfil) {
        mostrarMensaje([
            "Inicia sesión para publicar tu opinión. ",
            crear("a", { href: "login.html?volver=index.html%23opiniones", texto: "Iniciar sesión" })
        ], "error");
        return;
    }

    const nombre = limpiarTexto(nombreInput.value, 60);
    const comentario = limpiarTexto(comentarioInput.value, 500);
    const calificacion = Number(calificacionSelect.value);

    if (nombre.length < 2 || comentario.length < 5) {
        mostrarMensaje("Escribe tu nombre y un comentario de al menos 5 caracteres.", "error");
        return;
    }

    const boton = formulario.querySelector('button[type="submit"]');
    boton.disabled = true;

    try {
        await addDoc(collection(db, "opiniones"), {
            usuarioId: auth.currentUser.uid,
            nombre,
            comentario,
            calificacion: Number.isInteger(calificacion) && calificacion >= 1 && calificacion <= 5 ? calificacion : 5,
            visible: true,
            creadaEn: serverTimestamp()
        });

        mostrarMensaje("¡Gracias! Tu opinión fue publicada.", "success");
        formulario.reset();
        nombreInput.value = estadoSesion.perfil.nombre || "";
        cargarOpiniones();
    } catch (error) {
        console.error("Error al publicar la opinión:", error);
        mostrarMensaje("No pudimos publicar tu opinión. Inténtalo de nuevo.", "error");
    } finally {
        boton.disabled = false;
    }
});

document.addEventListener("sesion-cambio", () => {
    if (estadoSesion.perfil && !nombreInput.value) {
        nombreInput.value = estadoSesion.perfil.nombre || "";
    }
});

cargarOpiniones();
