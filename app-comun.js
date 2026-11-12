/* ==========================================
   AL BEAUTY STUDIO - FUNCIONES COMPARTIDAS
   ------------------------------------------
   Utilidades que usan varias páginas:
   formato de moneda y fechas, validación de
   teléfonos, cálculo de horarios disponibles
   y lectura de servicios y profesionales
   desde la base de datos (Cloud Firestore).
========================================== */

import { db } from "./firebase-config.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js";

/* ---------- Datos del negocio ---------- */

export const NEGOCIO = {
    nombre: "AL Beauty Studio",
    whatsapp: "573017501031",
    instagram: "@libella.cute"
};

// Duración de cada bloque de agenda (minutos).
export const DURACION_BLOQUE = 120;

// Estados posibles de una cita.
export const ESTADOS_CITA = {
    pendiente: "Pendiente",
    confirmada: "Confirmada",
    atendida: "Atendida",
    cancelada: "Cancelada"
};

// Métodos de pago aceptados en facturación.
export const METODOS_PAGO = [
    "Efectivo",
    "Tarjeta débito",
    "Tarjeta crédito",
    "Nequi",
    "Daviplata",
    "Transferencia bancaria"
];

/* Valores iniciales. Se usan cuando la base de
   datos todavía no tiene registros y como datos
   de carga inicial desde el panel administrativo.
   Los precios se ajustan desde el panel. */

export const SERVICIOS_INICIALES = [
    {
        id: "manicure",
        nombre: "Manicure",
        categoria: "manicure",
        descripcion: "Limpieza, limado, cutícula y esmaltado tradicional.",
        precio: 25000,
        duracionMin: 120,
        foto: "Imagenes/Manicure/Manicure1.jpg",
        activo: true
    },
    {
        id: "pedicure",
        nombre: "Pedicure",
        categoria: "pedicure",
        descripcion: "Exfoliación, hidratación y esmaltado de pies.",
        precio: 30000,
        duracionMin: 120,
        foto: "Imagenes/Pedicure/Pedicure2.jpg",
        activo: true
    },
    {
        id: "acrilicas",
        nombre: "Uñas acrílicas",
        categoria: "acrilicas",
        descripcion: "Extensión en acrílico con diseño personalizado.",
        precio: 80000,
        duracionMin: 120,
        foto: "Imagenes/Acrilicas/Acrilicas1.jpg",
        activo: true
    }
];

export const PROFESIONALES_INICIALES = [
    {
        id: "alex",
        nombre: "Alexandra Cubillos",
        especialidad: "Manicure, pedicure y acrílicas",
        entrada: "08:00",
        salida: "17:00",
        dias: [1, 2, 3, 4, 5, 6],
        activo: true
    },
    {
        id: "laura",
        nombre: "Laura Lozano",
        especialidad: "Manicure, pedicure y acrílicas",
        entrada: "09:00",
        salida: "18:00",
        dias: [1, 2, 3, 4, 5, 6],
        activo: true
    }
];

export const NOMBRES_DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

/* ---------- Formatos ---------- */

const formatoMoneda = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
});

export function formatoCOP(valor) {
    return formatoMoneda.format(Number(valor) || 0);
}

// Fecha local en formato AAAA-MM-DD.
export function fechaISO(fecha = new Date()) {
    const a = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, "0");
    const d = String(fecha.getDate()).padStart(2, "0");
    return `${a}-${m}-${d}`;
}

// Convierte "AAAA-MM-DD" en una fecha local.
export function fechaLocal(valor) {
    const [a, m, d] = valor.split("-").map(Number);
    return new Date(a, m - 1, d);
}

export function fechaLegible(valor) {
    if (!valor) return "";
    return fechaLocal(valor).toLocaleDateString("es-CO", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

export function aMinutos(hora) {
    const [h, m] = hora.split(":").map(Number);
    return h * 60 + m;
}

export function aHora(minutos) {
    return String(Math.floor(minutos / 60)).padStart(2, "0") +
        ":" + String(minutos % 60).padStart(2, "0");
}

/* ---------- Validaciones ---------- */

// Acepta celulares colombianos de 10 dígitos que
// empiezan por 3, con o sin el indicativo 57.
// Devuelve el número normalizado (57XXXXXXXXXX)
// o null si no es válido.
export function normalizarCelular(texto) {
    const digitos = String(texto || "").replace(/[\s\-()+]/g, "");
    if (!/^\d+$/.test(digitos)) return null;
    if (/^3\d{9}$/.test(digitos)) return "57" + digitos;
    if (/^573\d{9}$/.test(digitos)) return digitos;
    return null;
}

// Limpia texto libre: quita espacios extremos y
// limita la longitud. El texto siempre se pinta con
// textContent, nunca con innerHTML (prevención XSS).
export function limpiarTexto(texto, maximo = 120) {
    return String(texto || "").trim().replace(/\s+/g, " ").slice(0, maximo);
}

/* ---------- Agenda ---------- */

// Genera los bloques disponibles de una profesional
// para una fecha, excluyendo los horarios ocupados
// y las horas que ya pasaron.
export function generarFranjas(profesional, fecha, horasOcupadas = []) {
    if (!profesional || !fecha) return [];

    const dia = fechaLocal(fecha).getDay();
    if (!profesional.dias.includes(dia)) return [];

    const entrada = aMinutos(profesional.entrada);
    const salida = aMinutos(profesional.salida);
    const esHoy = fecha === fechaISO();
    const ahora = new Date();
    const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();

    const franjas = [];

    for (let inicio = entrada; inicio + DURACION_BLOQUE <= salida; inicio += DURACION_BLOQUE) {
        if (esHoy && inicio <= minutosAhora) continue;
        const hora = aHora(inicio);
        if (horasOcupadas.includes(hora)) continue;
        franjas.push({
            hora,
            etiqueta: hora + " - " + aHora(inicio + DURACION_BLOQUE)
        });
    }

    return franjas;
}

// Identificador del documento que bloquea un horario.
// Al ser determinístico, dos reservas del mismo horario
// apuntan al mismo documento y la segunda es rechazada.
export function idHorario(profesionalId, fecha, hora) {
    return `${profesionalId}_${fecha}_${hora.replace(":", "")}`;
}

/* ---------- Lectura de catálogos ---------- */

export async function obtenerServicios({ soloActivos = true } = {}) {
    try {
        const resultado = await getDocs(collection(db, "servicios"));
        let lista = resultado.docs.map((d) => ({ id: d.id, ...d.data() }));
        if (lista.length === 0) lista = SERVICIOS_INICIALES.slice();
        if (soloActivos) lista = lista.filter((s) => s.activo !== false);
        return lista.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    } catch (error) {
        console.warn("No se pudieron leer los servicios:", error.code || error);
        return SERVICIOS_INICIALES.slice();
    }
}

export async function obtenerProfesionales({ soloActivos = true } = {}) {
    try {
        const resultado = await getDocs(collection(db, "profesionales"));
        let lista = resultado.docs.map((d) => ({ id: d.id, ...d.data() }));
        if (lista.length === 0) lista = PROFESIONALES_INICIALES.slice();
        if (soloActivos) lista = lista.filter((p) => p.activo !== false);
        return lista.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    } catch (error) {
        console.warn("No se pudieron leer las profesionales:", error.code || error);
        return PROFESIONALES_INICIALES.slice();
    }
}

/* ---------- WhatsApp ---------- */

export function enlaceWhatsApp(numero, mensaje) {
    return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}

/* ---------- DOM ---------- */

// Crea un elemento con atributos y texto seguro.
export function crear(etiqueta, opciones = {}, hijos = []) {
    const el = document.createElement(etiqueta);
    for (const [clave, valor] of Object.entries(opciones)) {
        if (valor === undefined || valor === null || valor === false) continue;
        if (clave === "texto") el.textContent = valor;
        else if (clave === "clase") el.className = valor;
        else if (clave.startsWith("on") && typeof valor === "function") {
            el.addEventListener(clave.slice(2), valor);
        } else el.setAttribute(clave, valor === true ? "" : valor);
    }
    for (const hijo of [].concat(hijos)) {
        if (hijo === null || hijo === undefined || hijo === false) continue;
        el.append(hijo instanceof Node ? hijo : document.createTextNode(String(hijo)));
    }
    return el;
}
