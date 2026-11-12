/* ==========================================
   AL BEAUTY STUDIO
   INICIO DE SESIÓN CON FIREBASE
   ------------------------------------------
   1. Autentica con Firebase Authentication.
   2. Consulta el perfil en Firestore (usuarios).
   3. Redirige según el rol:
      admin   -> admin.html (panel administrativo)
      cliente -> mi-cuenta.html o la página de
                 origen (parámetro ?volver=).
========================================== */

import { auth, db } from "./firebase-config.js";

import {
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    signOut
} from "https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js";

const loginForm = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginButton = document.getElementById("login-button");
const loginMessage = document.getElementById("login-message");
const enlaceRecuperar = document.getElementById("recuperar-contrasena");

function mostrarMensaje(texto, tipo = "info") {
    loginMessage.textContent = texto;
    loginMessage.className = "login-message " + tipo;
}

function cambiarEstadoBoton(cargando) {
    loginButton.disabled = cargando;
    loginButton.textContent = cargando ? "Verificando acceso..." : "Ingresar a mi cuenta";
}

// Solo se permite volver a páginas internas del sitio
// (evita redirecciones abiertas a dominios externos).
function destinoSeguro() {
    const volver = new URLSearchParams(location.search).get("volver");
    if (volver && /^[A-Za-z0-9_\-]+\.html(#[A-Za-z0-9_\-]+)?$/.test(volver)) {
        return volver;
    }
    return null;
}

function obtenerMensajeError(error) {
    console.error("Código de error Firebase:", error.code);

    switch (error.code) {
        case "auth/invalid-email":
            return "El correo electrónico no es válido. Revisa cómo lo escribiste.";
        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/user-not-found":
            return "El correo o la contraseña son incorrectos. Verifica tus datos e inténtalo nuevamente.";
        case "auth/user-disabled":
            return "Esta cuenta está deshabilitada. Contacta a la administradora.";
        case "auth/too-many-requests":
            return "Se realizaron demasiados intentos. Espera unos minutos antes de volver a ingresar.";
        case "auth/network-request-failed":
            return "No hay conexión con el servidor. Revisa tu conexión a internet.";
        case "auth/unauthorized-domain":
            return "Este dominio no está autorizado en Firebase.";
        case "permission-denied":
            return "Tu cuenta no tiene permiso para consultar su perfil.";
        default:
            return "Ocurrió un error al iniciar sesión. Inténtalo nuevamente.";
    }
}

loginForm.addEventListener("submit", async function (evento) {
    evento.preventDefault();

    const correo = emailInput.value.trim();
    const contrasena = passwordInput.value;

    if (!correo || !contrasena) {
        mostrarMensaje("Debes escribir tu correo y contraseña.", "error");
        return;
    }

    cambiarEstadoBoton(true);
    mostrarMensaje("Estamos verificando tus datos...", "info");

    try {
        const resultado = await signInWithEmailAndPassword(auth, correo, contrasena);
        const usuario = resultado.user;

        const documentoUsuario = await getDoc(doc(db, "usuarios", usuario.uid));

        if (!documentoUsuario.exists()) {
            await signOut(auth);
            mostrarMensaje("Tu cuenta no tiene un perfil configurado. Contacta a la administradora.", "error");
            return;
        }

        const datos = documentoUsuario.data();

        if (datos.activo === false) {
            await signOut(auth);
            mostrarMensaje("Tu cuenta está inactiva. Contacta a la administradora.", "error");
            return;
        }

        if (datos.rol === "admin") {
            mostrarMensaje("Bienvenida, administradora. Abriendo el panel...", "success");
            window.location.href = "admin.html";
            return;
        }

        if (datos.rol === "cliente") {
            mostrarMensaje("¡Bienvenida a AL Beauty Studio! Inicio de sesión correcto.", "success");
            window.location.href = destinoSeguro() || "mi-cuenta.html";
            return;
        }

        await signOut(auth);
        mostrarMensaje("Tu cuenta no tiene un rol válido. Contacta a la administradora.", "error");

    } catch (error) {
        mostrarMensaje(obtenerMensajeError(error), "error");
    } finally {
        cambiarEstadoBoton(false);
    }
});

// Recuperación de contraseña por correo (Firebase Auth).
if (enlaceRecuperar) {
    enlaceRecuperar.addEventListener("click", async (evento) => {
        evento.preventDefault();
        const correo = emailInput.value.trim();

        if (!correo || !emailInput.checkValidity()) {
            mostrarMensaje("Escribe tu correo en el campo de arriba y vuelve a pulsar «¿Olvidaste tu contraseña?».", "info");
            emailInput.focus();
            return;
        }

        try {
            await sendPasswordResetEmail(auth, correo);
        } catch (error) {
            console.warn("Recuperación:", error.code);
        }
        // Mismo mensaje exista o no la cuenta (no revela usuarios).
        mostrarMensaje("Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.", "success");
    });
}
