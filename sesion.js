/* ==========================================
   AL BEAUTY STUDIO - ESTADO DE LA SESIÓN
   ------------------------------------------
   Escucha la sesión de Firebase Authentication,
   consulta el perfil (rol) en Firestore y
   actualiza el menú de las páginas públicas.
   Expone el perfil para otros módulos mediante
   el evento "sesion-lista".
========================================== */

import { auth, db } from "./firebase-config.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js";

export const estadoSesion = {
    listo: false,
    usuario: null,
    perfil: null
};

// Devuelve una promesa que se resuelve cuando ya se
// conoce si hay sesión iniciada.
export function esperarSesion() {
    if (estadoSesion.listo) return Promise.resolve(estadoSesion);
    return new Promise((resolver) => {
        document.addEventListener("sesion-lista", () => resolver(estadoSesion), { once: true });
    });
}

export async function cerrarSesion(destino = "index.html") {
    await signOut(auth);
    window.location.href = destino;
}

function pintarMenu() {
    const contenedor = document.getElementById("menu-sesion");
    if (!contenedor) return;

    contenedor.replaceChildren();

    if (!estadoSesion.usuario || !estadoSesion.perfil) {
        const enlace = document.createElement("a");
        enlace.href = "login.html";
        enlace.textContent = "Iniciar sesión";
        contenedor.append(enlace);
        return;
    }

    const esAdmin = estadoSesion.perfil.rol === "admin";

    const cuenta = document.createElement("a");
    cuenta.href = esAdmin ? "admin.html" : "mi-cuenta.html";
    cuenta.textContent = esAdmin ? "Panel admin" : "Mi cuenta";

    const salir = document.createElement("button");
    salir.type = "button";
    salir.className = "nav-salir";
    salir.textContent = "Salir";
    salir.addEventListener("click", () => cerrarSesion());

    contenedor.append(cuenta, salir);
}

onAuthStateChanged(auth, async (usuario) => {
    estadoSesion.usuario = usuario;
    estadoSesion.perfil = null;

    if (usuario) {
        try {
            const documento = await getDoc(doc(db, "usuarios", usuario.uid));
            if (documento.exists()) {
                estadoSesion.perfil = { id: usuario.uid, ...documento.data() };
            }
        } catch (error) {
            console.warn("No se pudo consultar el perfil:", error.code || error);
        }
    }

    const primeraVez = !estadoSesion.listo;
    estadoSesion.listo = true;
    pintarMenu();

    if (primeraVez) {
        document.dispatchEvent(new CustomEvent("sesion-lista"));
    }
    document.dispatchEvent(new CustomEvent("sesion-cambio"));
});
