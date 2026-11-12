
/*
==========================================
AL BEAUTY STUDIO - CONFIGURACIÓN DE FIREBASE
==========================================

Este archivo conecta nuestra página web
con los servicios de Firebase.

Utilizaremos:
1. Authentication: inicio de sesión.
2. Firestore: almacenamiento de datos.
==========================================
*/

// Importamos Firebase desde su CDN.
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js";

// Importamos las herramientas de autenticación.
import { getAuth } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js";

// Importamos la base de datos Firestore.
import { getFirestore } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js";

// Configuración de nuestro proyecto Firebase.
// Nota: el identificador técnico del proyecto (libella-spa)
// conserva el nombre comercial anterior de la empresa. No es
// visible para las usuarias; la marca vigente es AL Beauty Studio.
// Estas claves web son públicas por diseño: la protección de los
// datos la dan las reglas de seguridad (firestore.rules).
const firebaseConfig = {
    apiKey: "AIzaSyB5FFzkLZGsNdM_X1CNxFpweBhzDmeJPnI",
    authDomain: "libella-spa.firebaseapp.com",
    projectId: "libella-spa",
    storageBucket: "libella-spa.firebasestorage.app",
    messagingSenderId: "20745912534",
    appId: "1:20745912534:web:db15aa7e3772bb76038977"
};

// Inicializamos Firebase.
const app = initializeApp(firebaseConfig);

// Inicializamos el servicio de autenticación.
const auth = getAuth(app);

// Inicializamos la base de datos.
const db = getFirestore(app);

// Exportamos las conexiones para utilizarlas
// desde otros archivos JavaScript.
export { app, auth, db };
