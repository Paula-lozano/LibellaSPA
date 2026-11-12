
/*
==========================================
LIBELLA SPA - CONFIGURACIÓN DE FIREBASE
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
