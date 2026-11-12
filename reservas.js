/*
==========================================
LIBELLA SPA - RESERVAS CON FIREBASE
==========================================
*/

// Conexión con Firebase Authentication y Firestore.
import { auth, db } from "./firebase-config.js";

// Herramientas que utilizaremos para consultar
// los horarios ocupados en Firestore.
import {
    collection,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js";

/* ==========================================
   LIBELLA SPA
   HORARIOS DE LAS PROFESIONALES
========================================== */

// Horarios de trabajo configurados.
// 1 = lunes, 2 = martes ... 6 = sábado.

const horariosProfesionales = {

    alex: {
        nombre: "Alexandra Cubillos",
        entrada: "08:00",
        salida: "17:00",
        dias: [1, 2, 3, 4, 5, 6]
    },

    laura: {
        nombre: "Laura Lozano",
        entrada: "09:00",
        salida: "18:00",
        dias: [1, 2, 3, 4, 5, 6]
    }

};

// Cada cita dura 120 minutos.
const duracionCita = 120;

// Elementos del formulario.
const fechaInput = document.getElementById("fecha");
const profesionalSelect =
    document.getElementById("profesional");
const horaSelect = document.getElementById("hora");

// Convertir "08:00" a minutos.
function convertirAMinutos(hora) {

    const partes = hora.split(":");

    return Number(partes[0]) * 60 +
           Number(partes[1]);

}

// Convertir minutos a "HH:MM".
function convertirAHora(minutos) {

    const horas = Math.floor(minutos / 60);
    const minutosRestantes = minutos % 60;

    return String(horas).padStart(2, "0") +
           ":" +
           String(minutosRestantes).padStart(2, "0");

}

// Interpretar la fecha seleccionada como fecha local.
function obtenerFechaLocal(valor) {

    const partes = valor.split("-").map(Number);

    return new Date(
        partes[0],
        partes[1] - 1,
        partes[2]
    );

}

// Obtener la fecha actual en formato YYYY-MM-DD.
function obtenerFechaHoy() {

    const hoy = new Date();

    const anio = hoy.getFullYear();

    const mes = String(
        hoy.getMonth() + 1
    ).padStart(2, "0");

    const dia = String(
        hoy.getDate()
    ).padStart(2, "0");

    return `${anio}-${mes}-${dia}`;

}

// Mostrar un mensaje en el selector.
function limpiarHorarios(mensaje) {

    horaSelect.innerHTML = "";

    const opcion = document.createElement("option");

    opcion.value = "";
    opcion.textContent = mensaje;

    horaSelect.appendChild(opcion);

}


/*
==========================================
CONSULTAR HORARIOS OCUPADOS EN FIREBASE
==========================================
*/

async function consultarHorariosOcupados(fecha, profesional) {

    // Necesitamos que la cliente haya iniciado sesión.
    if (!auth.currentUser) {
        return null;
    }

    // Consultamos la colección horariosOcupados.
    const horariosRef = collection(db, "horariosOcupados");

    // Filtramos por fecha y profesional.
    const consulta = query(
        horariosRef,
        where("fecha", "==", fecha),
        where("profesional", "==", profesional)
    );

    // Ejecutamos la consulta.
    const resultado = await getDocs(consulta);

    // Guardamos las horas ocupadas.
    const horasOcupadas = [];

    resultado.forEach((documento) => {
        horasOcupadas.push(documento.data().hora);
    });

    return horasOcupadas;
}


// Calcular las horas de una profesional.
async function actualizarHorarios() {

    limpiarHorarios("Selecciona un horario");

    const fecha = fechaInput.value;
    const profesional = profesionalSelect.value;

    if (!fecha || !profesional) {

        limpiarHorarios(
            "Selecciona fecha y profesional"
        );

        return;
    }

    const datos = horariosProfesionales[profesional];

    if (!datos) {
        limpiarHorarios("Profesional no válida");
        return;
    }

    // No permitir fechas anteriores.
    if (fecha < obtenerFechaHoy()) {

        limpiarHorarios(
            "Selecciona una fecha futura"
        );

        return;
    }

    const fechaSeleccionada = obtenerFechaLocal(fecha);

    const diaSemana = fechaSeleccionada.getDay();

    // Comprobar que sea un día laboral.
    if (!datos.dias.includes(diaSemana)) {

        limpiarHorarios(
            "La profesional no atiende este día"
        );

        return;
    }

    const entrada = convertirAMinutos(datos.entrada);
    const salida = convertirAMinutos(datos.salida);


    // Consultar los horarios ocupados en Firebase.
    let horasOcupadas;

    try {
        horasOcupadas = await consultarHorariosOcupados(
            fecha,
            profesional
        );
    } catch (error) {

        console.error(
            "Error al consultar disponibilidad:",
            error
        );

        limpiarHorarios(
            "No se pudo consultar la disponibilidad"
        );

        return;
    }

    // No mostrar horarios como libres si
    // todavía no podemos consultar Firebase.
    if (horasOcupadas === null) {

        limpiarHorarios(
            "Inicia sesión para consultar disponibilidad"
        );

        return;
    }


    let cantidadHorarios = 0;

    // Crear bloques de 120 minutos.
    for (
        let inicio = entrada;
        inicio + duracionCita <= salida;
        inicio += duracionCita
    ) {

        // No mostrar horarios que ya pasaron hoy.
        if (fecha === obtenerFechaHoy()) {

            const ahora = new Date();

            const minutosActuales =
                ahora.getHours() * 60 +
                ahora.getMinutes();

            if (inicio <= minutosActuales) {
                continue;
            }
        }

        // NUEVO: convertir la hora de inicio.
        const horaInicio = convertirAHora(inicio);

        // NUEVO: verificar si está ocupada en Firebase.
        if (horasOcupadas.includes(horaInicio)) {
            continue;
        }

        const fin = inicio + duracionCita;

        const opcion = document.createElement("option");

        opcion.value = convertirAHora(inicio);

        opcion.textContent =
            convertirAHora(inicio) +
            " - " +
            convertirAHora(fin);

        horaSelect.appendChild(opcion);

        cantidadHorarios++;
    }

    if (cantidadHorarios === 0) {

        limpiarHorarios(
            "No hay horarios disponibles"
        );

    }

}

// Evitar seleccionar fechas anteriores.
fechaInput.min = obtenerFechaHoy();

// Actualizar al cambiar fecha o profesional.
fechaInput.addEventListener(
    "change",
    actualizarHorarios
);

profesionalSelect.addEventListener(
    "change",
    actualizarHorarios
);

// Mostrar el mensaje inicial.
limpiarHorarios(
    "Selecciona fecha y profesional"
);

// Actualizar la fecha mínima al regresar a la pestaña.
document.addEventListener("visibilitychange", () => {

    if (!document.hidden) {
        fechaInput.min = obtenerFechaHoy();
        actualizarHorarios();
    }

});
