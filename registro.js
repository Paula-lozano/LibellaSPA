/* ==========================================
   AL BEAUTY STUDIO - REGISTRO DE CLIENTES
   ------------------------------------------
   Crea la cuenta en Firebase Authentication y
   el perfil en la colección "usuarios" con rol
   "cliente" (entidad Cliente del modelo de datos).
========================================== */

import { auth, db } from "./firebase-config.js";
import { normalizarCelular, limpiarTexto } from "./app-comun.js";

import {
    createUserWithEmailAndPassword,
    updateProfile
} from "https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js";

import {
    doc,
    setDoc
} from "https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js";

const formulario = document.getElementById("form-registro");
const mensaje = document.getElementById("mensaje-registro");

function mostrarMensaje(texto, esError = false) {
    mensaje.textContent = texto;
    mensaje.style.color = esError ? "#b42345" : "#27754b";
}

formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const nombre = limpiarTexto(document.getElementById("nombre").value, 80);
    const correo = document.getElementById("correo").value.trim();
    const documento = document.getElementById("documento").value.replace(/\D/g, "");
    const telefono = normalizarCelular(document.getElementById("telefono").value);
    const contrasena = document.getElementById("contrasena").value;
    const confirmar = document.getElementById("confirmar-contrasena").value;
    const acepta = document.getElementById("acepta-datos").checked;

    if (nombre.length < 3) return mostrarMensaje("Escribe tu nombre completo.", true);
    if (!/^\d{5,12}$/.test(documento)) return mostrarMensaje("El documento debe tener entre 5 y 12 dígitos.", true);
    if (!telefono) return mostrarMensaje("Escribe un celular colombiano válido de 10 dígitos.", true);
    if (contrasena.length < 6) return mostrarMensaje("La contraseña debe tener mínimo 6 caracteres.", true);
    if (contrasena !== confirmar) return mostrarMensaje("Las contraseñas no coinciden.", true);
    if (!acepta) return mostrarMensaje("Debes autorizar el tratamiento de datos personales.", true);

    const boton = formulario.querySelector('button[type="submit"]');
    boton.disabled = true;
    mostrarMensaje("Estamos creando tu cuenta...");

    try {
        const resultado = await createUserWithEmailAndPassword(auth, correo, contrasena);
        const usuario = resultado.user;

        await updateProfile(usuario, { displayName: nombre });

        await setDoc(doc(db, "usuarios", usuario.uid), {
            nombre,
            nombreBusqueda: nombre.toLowerCase(),
            correo: usuario.email,
            documento,
            telefono,
            rol: "cliente",
            activo: true,
            aceptaTratamientoDatos: true,
            fechaRegistro: new Date().toISOString()
        });

        mostrarMensaje("¡Cuenta creada exitosamente! Te llevamos a tu cuenta...");
        formulario.reset();
        setTimeout(() => { window.location.href = "mi-cuenta.html"; }, 1200);

    } catch (error) {
        console.error("Error de registro:", error.code, error);

        if (error.code === "auth/email-already-in-use") {
            mostrarMensaje("Este correo ya tiene una cuenta registrada.", true);
        } else if (error.code === "auth/invalid-email") {
            mostrarMensaje("El correo electrónico no es válido.", true);
        } else if (error.code === "auth/weak-password") {
            mostrarMensaje("La contraseña es demasiado débil.", true);
        } else if (error.code === "permission-denied") {
            mostrarMensaje("La cuenta se creó, pero no pudimos guardar el perfil. Comunícate con el estudio.", true);
        } else {
            mostrarMensaje("No se pudo completar el registro. Intenta nuevamente.", true);
        }
    } finally {
        boton.disabled = false;
    }
});
