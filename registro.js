
/* ==========================================
   LIBELLA SPA - REGISTRO DE CLIENTES
========================================== */

// Importamos Firebase Authentication y Firestore
import { auth, db } from "./firebase-config.js";

import {
    createUserWithEmailAndPassword,
    updateProfile
} from "https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js";

import {
    doc,
    setDoc
} from "https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js";

// Obtenemos los elementos del formulario
const formulario = document.getElementById("form-registro");
const mensaje = document.getElementById("mensaje-registro");

// Mostrar mensajes a la cliente
function mostrarMensaje(texto, esError = false) {
    mensaje.textContent = texto;
    mensaje.style.color = esError ? "#b42345" : "#27754b";
}

// Registrar una nueva cliente
formulario.addEventListener("submit", async (evento) => {

    // Evitamos que se recargue la página
    evento.preventDefault();

    // Obtenemos los datos del formulario
    const nombre = document.getElementById("nombre").value.trim();

    const correo = document.getElementById("correo").value.trim();

    const contrasena = document.getElementById("contrasena").value;

    const confirmar = document.getElementById(
        "confirmar-contrasena"
    ).value;

    // Validar que las contraseñas coincidan
    if (contrasena !== confirmar) {
        mostrarMensaje(
            "Las contraseñas no coinciden.",
            true
        );
        return;
    }

    // Validar longitud mínima
    if (contrasena.length < 6) {
        mostrarMensaje(
            "La contraseña debe tener mínimo 6 caracteres.",
            true
        );
        return;
    }

    const boton = formulario.querySelector(
        'button[type="submit"]'
    );

    boton.disabled = true;
    mostrarMensaje("Estamos creando tu cuenta...");

    try {

        // Crear cuenta en Firebase Authentication
        const resultado = await createUserWithEmailAndPassword(
            auth,
            correo,
            contrasena
        );

        const usuario = resultado.user;

        // Guardar el nombre en Authentication
        await updateProfile(usuario, {
            displayName: nombre
        });

        // Crear perfil en Firestore
        await setDoc(
            doc(db, "usuarios", usuario.uid),
            {
                nombre: nombre,
                correo: usuario.email,
                rol: "cliente",
                fechaRegistro: new Date().toISOString()
            }
        );

        // Mostrar éxito solo al finalizar
        mostrarMensaje(
            "¡Cuenta creada exitosamente! Ya puedes iniciar sesión."
        );

        formulario.reset();

    } catch (error) {

        console.error("Error de registro:", error.code, error);

        if (error.code === "auth/email-already-in-use") {
            mostrarMensaje(
                "Este correo ya tiene una cuenta registrada.",
                true
            );
        } else if (error.code === "auth/invalid-email") {
            mostrarMensaje(
                "El correo electrónico no es válido.",
                true
            );
        } else if (error.code === "auth/weak-password") {
            mostrarMensaje(
                "La contraseña es demasiado débil.",
                true
            );
        } else if (error.code === "permission-denied") {
            mostrarMensaje(
                "La cuenta se creó, pero no pudimos guardar el perfil. Comunícate con el administrador.",
                true
            );
        } else {
            mostrarMensaje(
                "No se pudo completar el registro. Intenta nuevamente.",
                true
            );
        }

    } finally {
        boton.disabled = false;
    }
});
