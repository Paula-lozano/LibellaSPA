
/* ==========================================
   LIBELLA SPA
   INICIO DE SESIÓN CON FIREBASE
========================================== */

// Importamos las conexiones de nuestro proyecto.
import { auth, db } from "./firebase-config.js";

// Importamos las funciones de Authentication.
import {
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js";

// Importamos las funciones de Firestore.
import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js";

/* ==========================================
   ELEMENTOS DEL FORMULARIO
========================================== */

const loginForm = document.getElementById("login-form");

const emailInput = document.getElementById("email");

const passwordInput = document.getElementById("password");

const loginButton = document.getElementById("login-button");

const loginMessage = document.getElementById("login-message");

/* ==========================================
   MOSTRAR MENSAJES
========================================== */

function mostrarMensaje(texto, tipo = "info") {

    loginMessage.textContent = texto;

    loginMessage.className = "login-message " + tipo;

}

/* ==========================================
   CONTROLAR EL BOTÓN
========================================== */

function cambiarEstadoBoton(cargando) {

    loginButton.disabled = cargando;

    loginButton.textContent = cargando
        ? "Verificando acceso..."
        : "Ingresar a mi cuenta";

}


/* ==========================================
   MENSAJES DE ERROR DE FIREBASE
========================================== */

function obtenerMensajeError(error) {

    console.error("Código de error Firebase:", error.code);
    console.error("Detalle del error:", error.message);

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
            return "No hay conexión con Firebase. Revisa tu conexión a internet.";

        case "auth/unauthorized-domain":
            return "Este dominio no está autorizado en Firebase.";

        case "permission-denied":
            return "Tu cuenta no tiene permiso para consultar su perfil.";

        default:
            return "Ocurrió un error al iniciar sesión. Revisa la consola para conocer el detalle.";

    }

}

/* ==========================================
   INICIAR SESIÓN
========================================== */

loginForm.addEventListener("submit", async function (evento) {

    // Evitamos que la página se recargue.
    evento.preventDefault();

    // Obtenemos los datos escritos.
    const correo = emailInput.value.trim();

    const contrasena = passwordInput.value;

    // Validamos los campos.
    if (!correo || !contrasena) {

        mostrarMensaje(
            "Debes escribir tu correo y contraseña.",
            "error"
        );

        return;

    }

    cambiarEstadoBoton(true);

    mostrarMensaje(
        "Estamos verificando tus datos...",
        "info"
    );

    try {

        /* ==================================
           1. AUTENTICACIÓN
        ================================== */

        const resultado = await signInWithEmailAndPassword(
            auth,
            correo,
            contrasena
        );

        const usuario = resultado.user;

        /* ==================================
           2. CONSULTAR PERFIL
        ================================== */

        // Buscamos el documento que corresponde
        // al UID del usuario autenticado.

        const referenciaUsuario = doc(
            db,
            "usuarios",
            usuario.uid
        );

        const documentoUsuario = await getDoc(
            referenciaUsuario
        );

        // Si no existe el perfil, no permitimos
        // continuar con este flujo de acceso.

        if (!documentoUsuario.exists()) {

            await signOut(auth);

            mostrarMensaje(
                "Tu cuenta no tiene un perfil configurado. Contacta a la administradora.",
                "error"
            );

            return;

        }

        /* ==================================
           3. IDENTIFICAR EL ROL
        ================================== */

        const datosUsuario = documentoUsuario.data();

        const rol = datosUsuario.rol;

        /* ==================================
           4. ACCESO DEL ADMINISTRADOR
        ================================== */

        if (rol === "admin") {

            mostrarMensaje(
                "Bienvenida, administradora. Acceso correcto.",
                "success"
            );

            // El panel administrativo se creará
            // en el siguiente módulo.
            //
            // Por ahora no redirigimos a una
            // página que todavía no existe.

            return;

        }

        /* ==================================
           5. ACCESO DEL CLIENTE
        ================================== */

        if (rol === "cliente") {

            mostrarMensaje(
                "¡Bienvenida a Libella SPA! Inicio de sesión correcto.",
                "success"
            );

            // Más adelante construiremos el
            // espacio privado del cliente.
            //
            // Por ahora confirmamos el acceso
            // sin cambiar de página.

            return;

        }

        /* ==================================
           6. ROL NO RECONOCIDO
        ================================== */

        await signOut(auth);

        mostrarMensaje(
            "Tu cuenta no tiene un rol válido. Contacta a la administradora.",
            "error"
        );

    } catch (error) {

        mostrarMensaje(
            obtenerMensajeError(error),
            "error"
        );

    } finally {

        cambiarEstadoBoton(false);

    }

});
