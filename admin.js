/* ==========================================
   AL BEAUTY STUDIO - PANEL ADMINISTRATIVO
   ------------------------------------------
   Rol: administrador. Módulos:
   - Agenda de las profesionales y gestión de
     citas (confirmar, atender, cancelar).
   - Facturación (RF-006): cliente, ítems,
     valor, descuento, método y estado de pago,
     consecutivo y comprobante imprimible (RF-007).
   - Reportes (RF-007): ingresos por día, semana
     o mes; por método de pago, servicio y
     profesional; citas confirmadas y canceladas.
   - Clientes registrados e historial (RF-008).
   - Servicios y precios (RF-002).
   - Profesionales y horarios de trabajo.
   - Moderación de opiniones.
   Las reglas de firestore.rules impiden que un
   usuario sin rol "admin" lea o modifique estos
   datos aunque abra esta página.
========================================== */

import { auth, db } from "./firebase-config.js";
import { esperarSesion, cerrarSesion } from "./sesion.js";

import {
    collection,
    doc,
    getDocs,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    runTransaction,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js";

import {
    NEGOCIO,
    ESTADOS_CITA,
    METODOS_PAGO,
    SERVICIOS_INICIALES,
    PROFESIONALES_INICIALES,
    NOMBRES_DIAS,
    DURACION_BLOQUE,
    formatoCOP,
    fechaISO,
    fechaLocal,
    fechaLegible,
    aMinutos,
    aHora,
    idHorario,
    normalizarCelular,
    limpiarTexto,
    enlaceWhatsApp,
    crear
} from "./app-comun.js";

/* =========================================
   ESTADO EN MEMORIA
========================================= */

const datos = {
    usuarios: [],
    citas: [],
    facturas: [],
    servicios: [],
    profesionales: [],
    opiniones: []
};

let perfilAdmin = null;

const $ = (id) => document.getElementById(id);

function mensaje(id, texto, tipo = "info") {
    const el = $(id);
    el.textContent = texto;
    el.className = "mensaje " + tipo;
}

function estadoChip(estado) {
    const etiqueta = ESTADOS_CITA[estado] || (estado ? estado.charAt(0).toUpperCase() + estado.slice(1) : "");
    return crear("span", { clase: "estado " + estado, texto: etiqueta });
}

// Construye una tabla a partir de columnas y filas.
function tabla(columnas, filas, pie = null) {
    if (filas.length === 0) {
        return crear("p", { clase: "vacio", texto: "No hay registros para mostrar." });
    }
    const thead = crear("thead", {}, crear("tr", {}, columnas.map((c) =>
        crear("th", { clase: c.num ? "num" : null, scope: "col", texto: c.titulo })
    )));
    const tbody = crear("tbody", {}, filas.map((fila) =>
        crear("tr", {}, fila.map((celda, i) =>
            crear("td", { clase: columnas[i].num ? "num" : null }, celda)
        ))
    ));
    const partes = [thead, tbody];
    if (pie) {
        partes.push(crear("tfoot", {}, crear("tr", {}, pie.map((celda, i) =>
            crear("td", { clase: columnas[i].num ? "num" : null }, celda)
        ))));
    }
    return crear("table", {}, partes);
}

function pintar(idContenedor, nodo) {
    $(idContenedor).replaceChildren(nodo);
}

function fechaRegistro(valor) {
    if (!valor) return "";
    const fecha = valor.toDate ? valor.toDate() : new Date(valor);
    return isNaN(fecha) ? "" : fecha.toLocaleDateString("es-CO");
}

function sumarDias(iso, dias) {
    const f = fechaLocal(iso);
    f.setDate(f.getDate() + dias);
    return fechaISO(f);
}

function lunesDe(iso) {
    const f = fechaLocal(iso);
    const dia = (f.getDay() + 6) % 7;
    f.setDate(f.getDate() - dia);
    return fechaISO(f);
}

function clienteDe(id) {
    return datos.usuarios.find((u) => u.id === id);
}

/* =========================================
   CARGA DE DATOS DESDE FIRESTORE
========================================= */

async function leerColeccion(nombre) {
    const resultado = await getDocs(collection(db, nombre));
    return resultado.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function cargarTodo() {
    const [usuarios, citas, facturas, servicios, profesionales, opiniones] = await Promise.all([
        leerColeccion("usuarios"),
        leerColeccion("citas"),
        leerColeccion("facturas"),
        leerColeccion("servicios"),
        leerColeccion("profesionales"),
        leerColeccion("opiniones")
    ]);

    datos.usuarios = usuarios.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es"));
    datos.citas = citas.sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
    datos.facturas = facturas.sort((a, b) => (b.numero || 0) - (a.numero || 0));
    datos.servicios = servicios.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es"));
    datos.profesionales = profesionales.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es"));
    datos.opiniones = opiniones.sort((a, b) => (b.creadaEn?.seconds || 0) - (a.creadaEn?.seconds || 0));
}

// Si la base de datos aún no tiene catálogo se usan
// los valores iniciales para no bloquear la agenda.
function profesionalesAgenda() {
    return datos.profesionales.length ? datos.profesionales : PROFESIONALES_INICIALES;
}

function serviciosCatalogo() {
    return datos.servicios.length ? datos.servicios : SERVICIOS_INICIALES;
}

function renderTodo() {
    renderResumen();
    renderAgendaDia();
    renderCitas();
    renderSelectoresFactura();
    renderFacturas();
    renderReportes();
    renderClientes();
    renderServicios();
    renderProfesionales();
    renderOpiniones();
}

async function recargar() {
    await cargarTodo();
    renderTodo();
}

/* =========================================
   NAVEGACIÓN ENTRE MÓDULOS
========================================= */

document.querySelectorAll(".panel-nav button").forEach((boton) => {
    boton.addEventListener("click", () => mostrarSeccion(boton.dataset.seccion));
});

function mostrarSeccion(nombre) {
    document.querySelectorAll(".panel-nav button").forEach((b) => {
        b.setAttribute("aria-selected", String(b.dataset.seccion === nombre));
    });
    document.querySelectorAll(".panel-main > section").forEach((s) => {
        s.hidden = s.id !== "sec-" + nombre;
    });
    window.scrollTo({ top: 0 });
}

/* =========================================
   RESUMEN
========================================= */

function renderResumen() {
    const hoy = fechaISO();
    const mes = hoy.slice(0, 7);

    const citasHoy = datos.citas.filter((c) => c.fecha === hoy && c.estado !== "cancelada");
    const pendientes = datos.citas.filter((c) => c.estado === "pendiente" && c.fecha >= hoy);
    const ingresosMes = datos.facturas
        .filter((f) => f.estadoPago === "pagada" && (f.fecha || "").startsWith(mes))
        .reduce((t, f) => t + (f.total || 0), 0);
    const clientes = datos.usuarios.filter((u) => u.rol === "cliente").length;

    $("kpis").replaceChildren(
        crear("div", { clase: "kpi" }, [crear("span", { texto: "Citas de hoy" }), crear("strong", { texto: String(citasHoy.length) })]),
        crear("div", { clase: "kpi" }, [crear("span", { texto: "Por confirmar" }), crear("strong", { texto: String(pendientes.length) })]),
        crear("div", { clase: "kpi" }, [crear("span", { texto: "Ingresos del mes" }), crear("strong", { texto: formatoCOP(ingresosMes) })]),
        crear("div", { clase: "kpi" }, [crear("span", { texto: "Clientes registrados" }), crear("strong", { texto: String(clientes) })])
    );

    const proximas = datos.citas
        .filter((c) => c.fecha >= hoy && ["pendiente", "confirmada"].includes(c.estado))
        .slice(0, 8);

    pintar("resumen-proximas", tabla(
        [{ titulo: "Fecha" }, { titulo: "Hora" }, { titulo: "Cliente" }, { titulo: "Profesional" }, { titulo: "Estado" }],
        proximas.map((c) => [fechaLegible(c.fecha), c.hora, c.clienteNombre, c.profesionalNombre, estadoChip(c.estado)])
    ));

    pintar("resumen-pendientes", tabla(
        [{ titulo: "Fecha" }, { titulo: "Cliente" }, { titulo: "Servicio" }, { titulo: "Acción" }],
        pendientes.slice(0, 8).map((c) => [
            `${fechaLegible(c.fecha)} ${c.hora}`,
            c.clienteNombre,
            c.servicioNombre,
            crear("button", { clase: "btn ok peq", type: "button", texto: "Confirmar", onclick: () => confirmarCita(c) })
        ])
    ));

    $("tarjeta-semilla").classList.toggle("oculto", datos.servicios.length > 0 && datos.profesionales.length > 0);
}

$("btn-semilla").addEventListener("click", async () => {
    try {
        mensaje("msg-semilla", "Creando registros...", "info");
        for (const s of SERVICIOS_INICIALES) {
            if (!datos.servicios.some((x) => x.id === s.id)) {
                const { id, ...resto } = s;
                await setDoc(doc(db, "servicios", id), resto);
            }
        }
        for (const p of PROFESIONALES_INICIALES) {
            if (!datos.profesionales.some((x) => x.id === p.id)) {
                const { id, ...resto } = p;
                await setDoc(doc(db, "profesionales", id), resto);
            }
        }
        await recargar();
        mensaje("msg-semilla", "Datos iniciales creados. Ajusta los precios en «Servicios y precios».", "success");
    } catch (error) {
        console.error(error);
        mensaje("msg-semilla", "No se pudieron crear los datos: " + (error.code || error.message), "error");
    }
});

/* =========================================
   AGENDA DEL DÍA POR PROFESIONAL
========================================= */

function renderAgendaDia() {
    const fecha = $("agenda-fecha").value || fechaISO();
    const dia = fechaLocal(fecha).getDay();

    const columnas = profesionalesAgenda().filter((p) => p.activo !== false).map((p) => {
        const titulo = crear("h3", {}, [
            p.nombre,
            crear("small", { texto: `${p.entrada} a ${p.salida} · ${p.dias.map((d) => NOMBRES_DIAS[d]).join(", ")}` })
        ]);

        if (!p.dias.includes(dia)) {
            return crear("div", { clase: "agenda-col" }, [titulo, crear("div", { clase: "bloque", texto: "No atiende este día." })]);
        }

        const bloques = [];
        for (let inicio = aMinutos(p.entrada); inicio + DURACION_BLOQUE <= aMinutos(p.salida); inicio += DURACION_BLOQUE) {
            const hora = aHora(inicio);
            const etiqueta = `${hora} - ${aHora(inicio + DURACION_BLOQUE)}`;
            const cita = datos.citas.find((c) =>
                c.profesionalId === p.id && c.fecha === fecha && c.hora === hora && c.estado !== "cancelada");

            if (cita) {
                bloques.push(crear("div", { clase: "bloque ocupado " + cita.estado }, [
                    crear("strong", { texto: etiqueta }),
                    `${cita.clienteNombre} · ${cita.servicioNombre} `,
                    estadoChip(cita.estado)
                ]));
            } else {
                bloques.push(crear("div", { clase: "bloque" }, [crear("strong", { texto: etiqueta }), "Disponible"]));
            }
        }
        return crear("div", { clase: "agenda-col" }, [titulo, ...bloques]);
    });

    $("agenda-dia").replaceChildren(...columnas);
}

$("agenda-fecha").addEventListener("change", renderAgendaDia);

/* =========================================
   LISTADO Y GESTIÓN DE CITAS
========================================= */

function renderCitas() {
    const desde = $("citas-desde").value;
    const hasta = $("citas-hasta").value;
    const profesional = $("citas-profesional").value;
    const estado = $("citas-estado").value;

    const lista = datos.citas.filter((c) =>
        (!desde || c.fecha >= desde) &&
        (!hasta || c.fecha <= hasta) &&
        (!profesional || c.profesionalId === profesional) &&
        (!estado || c.estado === estado)
    );

    pintar("tabla-citas", tabla(
        [{ titulo: "Fecha" }, { titulo: "Hora" }, { titulo: "Cliente" }, { titulo: "Servicio" },
         { titulo: "Profesional" }, { titulo: "Valor", num: true }, { titulo: "Estado" }, { titulo: "Acciones" }],
        lista.map((c) => [
            fechaLegible(c.fecha),
            c.hora,
            crear("span", {}, [c.clienteNombre, crear("br"), crear("small", { texto: c.clienteTelefono || "" })]),
            c.servicioNombre,
            c.profesionalNombre,
            formatoCOP(c.precio),
            crear("span", {}, [estadoChip(c.estado), c.motivoCancelacion ? crear("small", { texto: " " + c.motivoCancelacion }) : null]),
            accionesCita(c)
        ])
    ));
}

function accionesCita(c) {
    const acciones = [];
    if (c.estado === "pendiente") {
        acciones.push(crear("button", { clase: "btn ok peq", type: "button", texto: "Confirmar", onclick: () => confirmarCita(c) }));
    }
    if (["pendiente", "confirmada"].includes(c.estado)) {
        acciones.push(crear("button", { clase: "btn sec peq", type: "button", texto: "Atendida", onclick: () => cambiarEstadoCita(c, "atendida") }));
        acciones.push(crear("button", { clase: "btn peligro peq", type: "button", texto: "Cancelar", onclick: () => cancelarCita(c) }));
    }
    if (["confirmada", "atendida"].includes(c.estado) && !c.facturaId) {
        acciones.push(crear("button", { clase: "btn peq", type: "button", texto: "Facturar", onclick: () => facturarCita(c) }));
    }
    if (c.facturaId) {
        const factura = datos.facturas.find((f) => f.id === c.facturaId);
        if (factura) acciones.push(crear("button", { clase: "btn sec peq", type: "button", texto: factura.consecutivo, onclick: () => verComprobante(factura) }));
    }
    if (c.clienteTelefono) {
        acciones.push(crear("a", {
            clase: "btn sec peq",
            href: enlaceWhatsApp(c.clienteTelefono, `Hola ${c.clienteNombre}, te escribimos de ${NEGOCIO.nombre} sobre tu cita del ${fechaLegible(c.fecha)} a las ${c.hora}.`),
            target: "_blank",
            rel: "noopener",
            texto: "WhatsApp"
        }));
    }
    return crear("div", { clase: "acciones", style: "margin:0" }, acciones);
}

async function cambiarEstadoCita(cita, estado, extra = {}) {
    try {
        await updateDoc(doc(db, "citas", cita.id), { estado, actualizadaEn: serverTimestamp(), ...extra });

        // Al cancelar se libera el horario para otras clientas.
        if (estado === "cancelada") {
            try {
                await deleteDoc(doc(db, "horariosOcupados", idHorario(cita.profesionalId, cita.fecha, cita.hora)));
            } catch (error) {
                console.warn("No se pudo liberar el horario:", error.code || error);
            }
        }

        Object.assign(cita, { estado, ...extra });
        renderTodo();
        mensaje("msg-citas", `Cita de ${cita.clienteNombre} marcada como ${ESTADOS_CITA[estado].toLowerCase()}.`, "success");
        return true;
    } catch (error) {
        console.error(error);
        mensaje("msg-citas", "No se pudo actualizar la cita: " + (error.code || error.message), "error");
        return false;
    }
}

async function confirmarCita(cita) {
    const ok = await cambiarEstadoCita(cita, "confirmada");
    if (ok && cita.clienteTelefono) {
        const texto =
            `Hola ${cita.clienteNombre}, ${NEGOCIO.nombre} confirma tu cita:\n` +
            `• ${cita.servicioNombre} con ${cita.profesionalNombre}\n` +
            `• ${fechaLegible(cita.fecha)} a las ${cita.hora}\n` +
            `• Valor: ${formatoCOP(cita.precio)}\n¡Te esperamos!`;
        window.open(enlaceWhatsApp(cita.clienteTelefono, texto), "_blank", "noopener");
    }
}

async function cancelarCita(cita) {
    const motivo = prompt(`Motivo de la cancelación de la cita de ${cita.clienteNombre}:`, "Cancelada por el estudio");
    if (motivo === null) return;
    await cambiarEstadoCita(cita, "cancelada", {
        canceladaPor: "admin",
        motivoCancelacion: limpiarTexto(motivo, 150) || "Sin motivo"
    });
}

["citas-desde", "citas-hasta", "citas-profesional", "citas-estado"].forEach((id) =>
    $(id).addEventListener("change", renderCitas));

/* =========================================
   FACTURACIÓN
========================================= */

const itemsFactura = $("items-factura");

// Campos para clientes sin cuenta (atención en mostrador).
const campoMostrador = crear("div", { clase: "campo oculto", id: "fac-mostrador" }, [
    crear("label", { for: "fac-nombre-mostrador", texto: "Nombre del cliente" }),
    crear("input", { id: "fac-nombre-mostrador", maxlength: "80" }),
    crear("label", { for: "fac-doc-mostrador", texto: "Documento" }),
    crear("input", { id: "fac-doc-mostrador", maxlength: "12", inputmode: "numeric" })
]);
$("fac-cliente").closest(".campo").after(campoMostrador);

function renderSelectoresFactura() {
    const seleccion = $("fac-cliente").value;
    $("fac-cliente").replaceChildren(
        crear("option", { value: "", texto: "Selecciona un cliente" }),
        crear("option", { value: "__mostrador", texto: "Cliente sin cuenta (mostrador)" }),
        ...datos.usuarios.filter((u) => u.rol === "cliente").map((u) =>
            crear("option", { value: u.id, texto: `${u.nombre}${u.documento ? " · " + u.documento : ""}` }))
    );
    $("fac-cliente").value = seleccion;

    const metodo = $("fac-metodo").value;
    $("fac-metodo").replaceChildren(...METODOS_PAGO.map((m) => crear("option", { value: m, texto: m })));
    if (metodo) $("fac-metodo").value = metodo;

    const profesionalFiltro = $("citas-profesional").value;
    $("citas-profesional").replaceChildren(
        crear("option", { value: "", texto: "Todas" }),
        ...profesionalesAgenda().map((p) => crear("option", { value: p.id, texto: p.nombre }))
    );
    $("citas-profesional").value = profesionalFiltro;

    actualizarCitasCliente($("fac-cita").value);
    if (itemsFactura.children.length === 0) agregarItem();
}

function actualizarCitasCliente(citaPreseleccionada = "") {
    const clienteId = $("fac-cliente").value;
    $("fac-mostrador").classList.toggle("oculto", clienteId !== "__mostrador");

    const citas = datos.citas.filter((c) =>
        c.clienteId === clienteId && !c.facturaId && ["confirmada", "atendida"].includes(c.estado));

    $("fac-cita").replaceChildren(
        crear("option", { value: "", texto: "Sin cita asociada" }),
        ...citas.map((c) => crear("option", { value: c.id, texto: `${fechaLegible(c.fecha)} ${c.hora} · ${c.servicioNombre}` }))
    );
    $("fac-cita").value = citaPreseleccionada;
}

function agregarItem(servicioId = "", precio = null) {
    const servicios = serviciosCatalogo().filter((s) => s.activo !== false);
    const select = crear("select", { "aria-label": "Servicio" },
        servicios.map((s) => crear("option", { value: s.id, texto: s.nombre })));
    if (servicioId) select.value = servicioId;

    const cantidad = crear("input", { type: "number", min: "1", value: "1", "aria-label": "Cantidad" });
    const valor = crear("input", { type: "number", min: "0", step: "500", "aria-label": "Valor unitario" });
    const subtotal = crear("td", { clase: "num" });

    const servicioActual = () => servicios.find((s) => s.id === select.value);
    valor.value = precio ?? servicioActual()?.precio ?? 0;

    const quitar = crear("button", { clase: "btn peligro peq", type: "button", "aria-label": "Quitar servicio", texto: "✕" });

    const fila = crear("tr", {}, [
        crear("td", {}, select),
        crear("td", {}, cantidad),
        crear("td", {}, valor),
        subtotal,
        crear("td", {}, quitar)
    ]);

    select.addEventListener("change", () => { valor.value = servicioActual()?.precio ?? 0; calcularTotales(); });
    cantidad.addEventListener("input", calcularTotales);
    valor.addEventListener("input", calcularTotales);
    quitar.addEventListener("click", () => {
        fila.remove();
        if (itemsFactura.children.length === 0) agregarItem();
        calcularTotales();
    });

    itemsFactura.append(fila);
    calcularTotales();
}

function leerItems() {
    const servicios = serviciosCatalogo();
    return [...itemsFactura.querySelectorAll("tr")].map((fila) => {
        const [select, cantidad, valor] = fila.querySelectorAll("select, input");
        const servicio = servicios.find((s) => s.id === select.value);
        const cant = Math.max(1, Math.floor(Number(cantidad.value) || 1));
        const unitario = Math.max(0, Math.round(Number(valor.value) || 0));
        return {
            fila,
            servicioId: select.value,
            nombre: servicio?.nombre || "",
            cantidad: cant,
            precioUnitario: unitario,
            subtotal: cant * unitario
        };
    });
}

function calcularTotales() {
    const items = leerItems();
    items.forEach((i) => { i.fila.lastElementChild.previousElementSibling.textContent = formatoCOP(i.subtotal); });

    const subtotal = items.reduce((t, i) => t + i.subtotal, 0);
    const descuento = Math.min(subtotal, Math.max(0, Math.round(Number($("fac-descuento").value) || 0)));
    const total = subtotal - descuento;

    $("totales-factura").replaceChildren(
        crear("div", {}, [crear("span", { texto: "Subtotal" }), crear("span", { texto: formatoCOP(subtotal) })]),
        crear("div", {}, [crear("span", { texto: "Descuento" }), crear("span", { texto: "− " + formatoCOP(descuento) })]),
        crear("div", { clase: "total" }, [crear("span", { texto: "Total a pagar" }), crear("span", { texto: formatoCOP(total) })])
    );
    return { items, subtotal, descuento, total };
}

$("fac-cliente").addEventListener("change", () => actualizarCitasCliente());
$("fac-descuento").addEventListener("input", calcularTotales);
$("btn-agregar-item").addEventListener("click", () => agregarItem());

$("fac-cita").addEventListener("change", () => {
    const cita = datos.citas.find((c) => c.id === $("fac-cita").value);
    if (!cita) return;
    itemsFactura.replaceChildren();
    agregarItem(cita.servicioId, cita.precio);
});

$("form-factura").addEventListener("reset", () => {
    setTimeout(() => {
        itemsFactura.replaceChildren();
        $("fac-fecha").value = fechaISO();
        actualizarCitasCliente();
        agregarItem();
        $("msg-factura").textContent = "";
    });
});

function facturarCita(cita) {
    mostrarSeccion("facturacion");
    $("fac-cliente").value = cita.clienteId;
    actualizarCitasCliente(cita.id);
    $("fac-fecha").value = fechaISO();
    itemsFactura.replaceChildren();
    agregarItem(cita.servicioId, cita.precio);
}

$("form-factura").addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const clienteId = $("fac-cliente").value;
    let cliente = null;

    if (clienteId === "__mostrador") {
        const nombre = limpiarTexto($("fac-nombre-mostrador").value, 80);
        const documento = $("fac-doc-mostrador").value.replace(/\D/g, "");
        if (nombre.length < 3) return mensaje("msg-factura", "Escribe el nombre del cliente de mostrador.", "error");
        cliente = { id: null, nombre, documento };
    } else {
        cliente = clienteDe(clienteId);
        if (!cliente) return mensaje("msg-factura", "Selecciona el cliente.", "error");
    }

    const fecha = $("fac-fecha").value;
    if (!fecha) return mensaje("msg-factura", "Selecciona la fecha de la factura.", "error");

    const { items, subtotal, descuento, total } = calcularTotales();
    if (items.some((i) => !i.servicioId)) return mensaje("msg-factura", "Cada ítem debe tener un servicio.", "error");
    if (total <= 0) return mensaje("msg-factura", "El total de la factura debe ser mayor que cero.", "error");

    const metodoPago = $("fac-metodo").value;
    if (!METODOS_PAGO.includes(metodoPago)) return mensaje("msg-factura", "Selecciona el método de pago.", "error");

    const citaId = $("fac-cita").value || null;
    const cita = datos.citas.find((c) => c.id === citaId);

    $("btn-guardar-factura").disabled = true;
    mensaje("msg-factura", "Generando factura...", "info");

    try {
        // Transacción: obtiene el consecutivo, crea la
        // factura y marca la cita como facturada.
        const factura = await runTransaction(db, async (tx) => {
            const refConfig = doc(db, "config", "facturacion");
            const config = await tx.get(refConfig);
            const numero = (config.exists() ? Number(config.data().ultimoNumero) || 0 : 0) + 1;
            const refFactura = doc(collection(db, "facturas"));

            const registro = {
                numero,
                consecutivo: "ALB-" + String(numero).padStart(6, "0"),
                fecha,
                clienteId: cliente.id,
                clienteNombre: cliente.nombre,
                clienteDocumento: cliente.documento || "",
                clienteCorreo: cliente.correo || "",
                citaId,
                profesionalId: cita?.profesionalId || null,
                profesionalNombre: cita?.profesionalNombre || null,
                items: items.map(({ fila, ...resto }) => resto),
                subtotal,
                descuento,
                total,
                metodoPago,
                estadoPago: $("fac-estado").value === "pendiente" ? "pendiente" : "pagada",
                observaciones: limpiarTexto($("fac-observaciones").value, 300),
                creadaPor: auth.currentUser.uid,
                creadaEn: serverTimestamp()
            };

            tx.set(refConfig, { ultimoNumero: numero }, { merge: true });
            tx.set(refFactura, registro);
            if (citaId) {
                tx.update(doc(db, "citas", citaId), { facturaId: refFactura.id, estado: "atendida", actualizadaEn: serverTimestamp() });
            }
            return { id: refFactura.id, ...registro };
        });

        await recargar();
        $("form-factura").reset();
        mensaje("msg-factura", `Factura ${factura.consecutivo} generada por ${formatoCOP(factura.total)}.`, "success");
        verComprobante(factura);
    } catch (error) {
        console.error(error);
        mensaje("msg-factura", "No se pudo generar la factura: " + (error.code || error.message), "error");
    } finally {
        $("btn-guardar-factura").disabled = false;
    }
});

function renderFacturas() {
    const desde = $("facturas-desde").value;
    const hasta = $("facturas-hasta").value;
    const estado = $("facturas-estado").value;
    const texto = $("facturas-buscar").value.trim().toLowerCase();

    const lista = datos.facturas.filter((f) =>
        (!desde || f.fecha >= desde) &&
        (!hasta || f.fecha <= hasta) &&
        (!estado || f.estadoPago === estado) &&
        (!texto || [f.consecutivo, f.clienteNombre, f.clienteDocumento].join(" ").toLowerCase().includes(texto))
    );

    const totalVigente = lista.filter((f) => f.estadoPago !== "anulada").reduce((t, f) => t + (f.total || 0), 0);

    pintar("tabla-facturas", tabla(
        [{ titulo: "Número" }, { titulo: "Fecha" }, { titulo: "Cliente" }, { titulo: "Servicios" },
         { titulo: "Método de pago" }, { titulo: "Total", num: true }, { titulo: "Estado" }, { titulo: "Acciones" }],
        lista.map((f) => [
            f.consecutivo,
            fechaLegible(f.fecha),
            f.clienteNombre,
            (f.items || []).map((i) => `${i.cantidad} × ${i.nombre}`).join(", "),
            f.metodoPago,
            formatoCOP(f.total),
            estadoChip(f.estadoPago),
            crear("div", { clase: "acciones", style: "margin:0" }, [
                crear("button", { clase: "btn sec peq", type: "button", texto: "Comprobante", onclick: () => verComprobante(f) }),
                f.estadoPago === "pendiente"
                    ? crear("button", { clase: "btn ok peq", type: "button", texto: "Marcar pagada", onclick: () => actualizarFactura(f, { estadoPago: "pagada" }) })
                    : null,
                f.estadoPago !== "anulada"
                    ? crear("button", { clase: "btn peligro peq", type: "button", texto: "Anular", onclick: () => anularFactura(f) })
                    : null
            ])
        ]),
        ["", "", "", "", "Total (sin anuladas)", formatoCOP(totalVigente), "", ""]
    ));
}

async function actualizarFactura(factura, cambios) {
    try {
        await updateDoc(doc(db, "facturas", factura.id), { ...cambios, actualizadaEn: serverTimestamp() });
        Object.assign(factura, cambios);
        renderTodo();
    } catch (error) {
        alert("No se pudo actualizar la factura: " + (error.code || error.message));
    }
}

async function anularFactura(factura) {
    const motivo = prompt(`Motivo de anulación de la factura ${factura.consecutivo}:`);
    if (!motivo) return;
    await actualizarFactura(factura, { estadoPago: "anulada", motivoAnulacion: limpiarTexto(motivo, 150) });
}

["facturas-desde", "facturas-hasta", "facturas-estado"].forEach((id) => $(id).addEventListener("change", renderFacturas));
$("facturas-buscar").addEventListener("input", renderFacturas);

/* ---------- Comprobante imprimible ---------- */

function verComprobante(f) {
    const filas = (f.items || []).map((i) => [i.nombre, String(i.cantidad), formatoCOP(i.precioUnitario), formatoCOP(i.subtotal)]);

    const contenido = crear("div", { clase: "comprobante" }, [
        crear("div", { clase: "cab" }, [
            crear("div", {}, [
                crear("h2", { id: "titulo-comprobante", texto: NEGOCIO.nombre }),
                crear("div", { texto: "Nail & Beauty Studio · Bogotá" }),
                crear("div", { texto: "WhatsApp: 301 750 1031" })
            ]),
            crear("div", { style: "text-align:right" }, [
                crear("strong", { texto: "Comprobante de pago" }),
                crear("div", { texto: f.consecutivo }),
                crear("div", { texto: fechaLegible(f.fecha) }),
                estadoChip(f.estadoPago)
            ])
        ]),
        crear("p", {}, [
            crear("strong", { texto: "Cliente: " }), f.clienteNombre,
            f.clienteDocumento ? ` · Documento ${f.clienteDocumento}` : "",
            f.profesionalNombre ? crear("span", {}, [crear("br"), crear("strong", { texto: "Profesional: " }), f.profesionalNombre]) : null
        ]),
        tabla(
            [{ titulo: "Servicio" }, { titulo: "Cant.", num: true }, { titulo: "Valor unitario", num: true }, { titulo: "Subtotal", num: true }],
            filas
        ),
        crear("div", { clase: "totales" }, [
            crear("div", {}, [crear("span", { texto: "Subtotal" }), crear("span", { texto: formatoCOP(f.subtotal) })]),
            crear("div", {}, [crear("span", { texto: "Descuento" }), crear("span", { texto: "− " + formatoCOP(f.descuento) })]),
            crear("div", { clase: "total" }, [crear("span", { texto: "Total" }), crear("span", { texto: formatoCOP(f.total) })]),
            crear("div", {}, [crear("span", { texto: "Método de pago" }), crear("span", { texto: f.metodoPago })])
        ]),
        f.observaciones ? crear("p", {}, [crear("strong", { texto: "Observaciones: " }), f.observaciones]) : null,
        f.motivoAnulacion ? crear("p", {}, [crear("strong", { texto: "Anulada: " }), f.motivoAnulacion]) : null,
        crear("p", { clase: "nota", texto: "Documento interno de control. No reemplaza la factura electrónica de la DIAN." })
    ]);

    $("contenido-comprobante").replaceChildren(contenido);
    $("dialogo-factura").showModal();
}

$("btn-cerrar-comprobante").addEventListener("click", () => $("dialogo-factura").close());
$("btn-imprimir-comprobante").addEventListener("click", () => {
    document.body.classList.add("imprimir-comprobante");
    window.print();
});
window.addEventListener("afterprint", () => {
    document.body.classList.remove("imprimir-comprobante", "imprimir-reporte");
});

/* =========================================
   REPORTES
========================================= */

function rangoReporte() {
    return { desde: $("rep-desde").value, hasta: $("rep-hasta").value };
}

function claveAgrupacion(fecha, modo) {
    if (modo === "mes") return fecha.slice(0, 7);
    if (modo === "semana") return lunesDe(fecha);
    return fecha;
}

function etiquetaAgrupacion(clave, modo) {
    if (modo === "mes") {
        const [a, m] = clave.split("-").map(Number);
        return new Date(a, m - 1, 1).toLocaleDateString("es-CO", { month: "long", year: "numeric" });
    }
    if (modo === "semana") return `Semana del ${fechaLegible(clave)}`;
    return fechaLegible(clave);
}

function filasConBarra(mapa, total) {
    return [...mapa.entries()]
        .sort((a, b) => b[1].valor - a[1].valor)
        .map(([nombre, d]) => [
            nombre,
            String(d.cantidad),
            formatoCOP(d.valor),
            crear("div", { clase: "barra", title: total ? Math.round(d.valor * 100 / total) + "%" : "0%" },
                crear("span", { style: `width:${total ? (d.valor * 100 / total).toFixed(1) : 0}%` }))
        ]);
}

function acumular(mapa, clave, valor, cantidad = 1) {
    const actual = mapa.get(clave) || { valor: 0, cantidad: 0 };
    actual.valor += valor;
    actual.cantidad += cantidad;
    mapa.set(clave, actual);
}

function facturasReporte() {
    const { desde, hasta } = rangoReporte();
    return datos.facturas.filter((f) => f.estadoPago === "pagada" && (!desde || f.fecha >= desde) && (!hasta || f.fecha <= hasta));
}

function renderReportes() {
    const { desde, hasta } = rangoReporte();
    const modo = $("rep-agrupar").value;

    const facturas = facturasReporte();
    const pendientes = datos.facturas.filter((f) => f.estadoPago === "pendiente" && (!desde || f.fecha >= desde) && (!hasta || f.fecha <= hasta));
    const citas = datos.citas.filter((c) => (!desde || c.fecha >= desde) && (!hasta || c.fecha <= hasta));
    const total = facturas.reduce((t, f) => t + (f.total || 0), 0);
    const canceladas = citas.filter((c) => c.estado === "cancelada").length;

    $("rep-kpis").replaceChildren(
        crear("div", { clase: "kpi" }, [crear("span", { texto: "Ingresos cobrados" }), crear("strong", { texto: formatoCOP(total) })]),
        crear("div", { clase: "kpi" }, [crear("span", { texto: "Facturas pagadas" }), crear("strong", { texto: String(facturas.length) })]),
        crear("div", { clase: "kpi" }, [crear("span", { texto: "Ticket promedio" }), crear("strong", { texto: formatoCOP(facturas.length ? total / facturas.length : 0) })]),
        crear("div", { clase: "kpi" }, [crear("span", { texto: "Por cobrar" }), crear("strong", { texto: formatoCOP(pendientes.reduce((t, f) => t + f.total, 0)) })]),
        crear("div", { clase: "kpi" }, [crear("span", { texto: "Tasa de cancelación" }), crear("strong", { texto: citas.length ? Math.round(canceladas * 100 / citas.length) + "%" : "0%" })])
    );

    // Ingresos por periodo
    const porPeriodo = new Map();
    facturas.forEach((f) => acumular(porPeriodo, claveAgrupacion(f.fecha, modo), f.total));
    const columnasPeriodo = [{ titulo: "Periodo" }, { titulo: "Facturas", num: true }, { titulo: "Ingresos", num: true }];
    pintar("rep-periodo", tabla(
        columnasPeriodo,
        [...porPeriodo.entries()].sort((a, b) => a[0].localeCompare(b[0]))
            .map(([clave, d]) => [etiquetaAgrupacion(clave, modo), String(d.cantidad), formatoCOP(d.valor)]),
        ["Total", String(facturas.length), formatoCOP(total)]
    ));

    // Método de pago
    const porMetodo = new Map();
    facturas.forEach((f) => acumular(porMetodo, f.metodoPago || "Sin dato", f.total));
    const colBarra = [{ titulo: "Concepto" }, { titulo: "Cant.", num: true }, { titulo: "Ingresos", num: true }, { titulo: "Participación" }];
    pintar("rep-metodo", tabla(colBarra, filasConBarra(porMetodo, total)));

    // Servicio (desde los ítems; el descuento se reparte proporcionalmente)
    const porServicio = new Map();
    facturas.forEach((f) => {
        const factor = f.subtotal ? f.total / f.subtotal : 1;
        (f.items || []).forEach((i) => acumular(porServicio, i.nombre, i.subtotal * factor, i.cantidad));
    });
    pintar("rep-servicio", tabla(colBarra, filasConBarra(porServicio, total)));

    // Profesional
    const porProfesional = new Map();
    profesionalesAgenda().forEach((p) => porProfesional.set(p.nombre, { valor: 0, cantidad: 0, citas: 0, canceladas: 0 }));
    facturas.forEach((f) => {
        const nombre = f.profesionalNombre || "Sin profesional asociada";
        const d = porProfesional.get(nombre) || { valor: 0, cantidad: 0, citas: 0, canceladas: 0 };
        d.valor += f.total; d.cantidad += 1;
        porProfesional.set(nombre, d);
    });
    citas.forEach((c) => {
        const d = porProfesional.get(c.profesionalNombre) || { valor: 0, cantidad: 0, citas: 0, canceladas: 0 };
        d.citas += 1;
        if (c.estado === "cancelada") d.canceladas += 1;
        porProfesional.set(c.profesionalNombre, d);
    });
    pintar("rep-profesional", tabla(
        [{ titulo: "Profesional" }, { titulo: "Citas", num: true }, { titulo: "Canceladas", num: true }, { titulo: "Facturas", num: true }, { titulo: "Ingresos", num: true }],
        [...porProfesional.entries()].map(([n, d]) => [n, String(d.citas), String(d.canceladas), String(d.cantidad), formatoCOP(d.valor)])
    ));

    // Citas por estado
    const porEstado = Object.keys(ESTADOS_CITA).map((e) => {
        const n = citas.filter((c) => c.estado === e).length;
        return [estadoChip(e), String(n), citas.length ? Math.round(n * 100 / citas.length) + "%" : "0%"];
    });
    pintar("rep-estados", tabla(
        [{ titulo: "Estado" }, { titulo: "Citas", num: true }, { titulo: "%", num: true }],
        porEstado,
        ["Total", String(citas.length), "100%"]
    ));

    // Detalle de cancelaciones
    pintar("rep-cancelaciones", tabla(
        [{ titulo: "Fecha" }, { titulo: "Cliente" }, { titulo: "Profesional" }, { titulo: "Canceló" }, { titulo: "Motivo" }],
        citas.filter((c) => c.estado === "cancelada").map((c) => [
            `${fechaLegible(c.fecha)} ${c.hora}`,
            c.clienteNombre,
            c.profesionalNombre,
            c.canceladaPor === "cliente" ? "Cliente" : "Estudio",
            c.motivoCancelacion || ""
        ])
    ));
}

function fijarRango(tipo) {
    const hoy = fechaISO();
    const d = new Date();
    if (tipo === "hoy") { $("rep-desde").value = hoy; $("rep-hasta").value = hoy; $("rep-agrupar").value = "dia"; }
    if (tipo === "semana") { $("rep-desde").value = lunesDe(hoy); $("rep-hasta").value = sumarDias(lunesDe(hoy), 6); $("rep-agrupar").value = "dia"; }
    if (tipo === "mes") {
        $("rep-desde").value = fechaISO(new Date(d.getFullYear(), d.getMonth(), 1));
        $("rep-hasta").value = fechaISO(new Date(d.getFullYear(), d.getMonth() + 1, 0));
        $("rep-agrupar").value = "semana";
    }
    if (tipo === "anio") {
        $("rep-desde").value = `${d.getFullYear()}-01-01`;
        $("rep-hasta").value = `${d.getFullYear()}-12-31`;
        $("rep-agrupar").value = "mes";
    }
    renderReportes();
}

document.querySelectorAll("[data-rango]").forEach((b) => b.addEventListener("click", () => fijarRango(b.dataset.rango)));
["rep-desde", "rep-hasta", "rep-agrupar"].forEach((id) => $(id).addEventListener("change", renderReportes));

$("btn-imprimir-reporte").addEventListener("click", () => {
    document.body.classList.add("imprimir-reporte");
    window.print();
});

$("btn-csv-reporte").addEventListener("click", () => {
    const { desde, hasta } = rangoReporte();
    const facturas = datos.facturas.filter((f) => (!desde || f.fecha >= desde) && (!hasta || f.fecha <= hasta));
    const campo = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lineas = [
        ["Numero", "Fecha", "Cliente", "Documento", "Profesional", "Servicios", "Metodo de pago", "Estado", "Subtotal", "Descuento", "Total"].map(campo).join(";"),
        ...facturas.map((f) => [
            f.consecutivo, f.fecha, f.clienteNombre, f.clienteDocumento, f.profesionalNombre || "",
            (f.items || []).map((i) => `${i.cantidad} x ${i.nombre}`).join(" | "),
            f.metodoPago, f.estadoPago, f.subtotal, f.descuento, f.total
        ].map(campo).join(";"))
    ];
    const blob = new Blob(["﻿" + lineas.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const enlace = crear("a", { href: URL.createObjectURL(blob), download: `reporte-facturas_${desde || "inicio"}_${hasta || "hoy"}.csv` });
    document.body.append(enlace);
    enlace.click();
    enlace.remove();
});

/* =========================================
   CLIENTES REGISTRADOS E HISTORIAL
========================================= */

function renderClientes() {
    const texto = $("clientes-buscar").value.trim().toLowerCase();
    const rol = $("clientes-rol").value;

    const lista = datos.usuarios.filter((u) =>
        (!rol || u.rol === rol) &&
        (!texto || [u.nombre, u.documento, u.correo, u.telefono].join(" ").toLowerCase().includes(texto))
    );

    pintar("tabla-clientes", tabla(
        [{ titulo: "Nombre" }, { titulo: "Documento" }, { titulo: "Correo" }, { titulo: "Celular" },
         { titulo: "Registro" }, { titulo: "Rol" }, { titulo: "Citas", num: true }, { titulo: "Acciones" }],
        lista.map((u) => [
            u.nombre,
            u.documento || "—",
            u.correo,
            u.telefono || "—",
            fechaRegistro(u.fechaRegistro),
            crear("span", {}, [u.rol === "admin" ? "Administrador" : "Cliente", " ", u.activo === false ? estadoChip("inactivo") : null]),
            String(datos.citas.filter((c) => c.clienteId === u.id).length),
            crear("div", { clase: "acciones", style: "margin:0" }, [
                crear("button", { clase: "btn sec peq", type: "button", texto: "Historial", onclick: () => verHistorial(u) }),
                u.id !== auth.currentUser.uid
                    ? crear("button", {
                        clase: "btn sec peq", type: "button",
                        texto: u.activo === false ? "Activar" : "Desactivar",
                        onclick: () => actualizarUsuario(u, { activo: u.activo === false })
                    })
                    : null,
                u.id !== auth.currentUser.uid
                    ? crear("button", {
                        clase: "btn sec peq", type: "button",
                        texto: u.rol === "admin" ? "Hacer cliente" : "Hacer admin",
                        onclick: () => {
                            const nuevo = u.rol === "admin" ? "cliente" : "admin";
                            if (confirm(`¿Cambiar el rol de ${u.nombre} a ${nuevo}?`)) actualizarUsuario(u, { rol: nuevo });
                        }
                    })
                    : null
            ])
        ])
    ));
}

async function actualizarUsuario(usuario, cambios) {
    try {
        await updateDoc(doc(db, "usuarios", usuario.id), cambios);
        Object.assign(usuario, cambios);
        renderClientes();
        renderResumen();
        mensaje("msg-clientes", `Usuario ${usuario.nombre} actualizado.`, "success");
    } catch (error) {
        mensaje("msg-clientes", "No se pudo actualizar: " + (error.code || error.message), "error");
    }
}

async function verHistorial(usuario) {
    const contenedor = $("historial-cliente");
    contenedor.classList.remove("oculto");
    contenedor.replaceChildren(crear("p", { texto: "Consultando historial..." }));

    let recomendaciones = [];
    try {
        const r = await getDocs(query(collection(db, "recomendaciones"), where("clienteId", "==", usuario.id)));
        recomendaciones = r.docs.map((d) => d.data()).sort((a, b) => (b.creadaEn?.seconds || 0) - (a.creadaEn?.seconds || 0));
    } catch (error) {
        console.warn(error);
    }

    const citas = datos.citas.filter((c) => c.clienteId === usuario.id).reverse();
    const facturas = datos.facturas.filter((f) => f.clienteId === usuario.id);
    const totalPagado = facturas.filter((f) => f.estadoPago === "pagada").reduce((t, f) => t + f.total, 0);

    contenedor.replaceChildren(
        crear("h2", { texto: `Historial de ${usuario.nombre}` }),
        crear("p", { clase: "subtitulo" }, [
            `Documento: ${usuario.documento || "—"} · Correo: ${usuario.correo} · Celular: ${usuario.telefono || "—"} · `,
            `Registrada el ${fechaRegistro(usuario.fechaRegistro)} · Total pagado: ${formatoCOP(totalPagado)}`
        ]),
        crear("h2", { texto: "Citas" }),
        crear("div", { clase: "tabla-wrap" }, tabla(
            [{ titulo: "Fecha" }, { titulo: "Servicio" }, { titulo: "Profesional" }, { titulo: "Valor", num: true }, { titulo: "Estado" }],
            citas.map((c) => [`${fechaLegible(c.fecha)} ${c.hora}`, c.servicioNombre, c.profesionalNombre, formatoCOP(c.precio), estadoChip(c.estado)])
        )),
        crear("h2", { texto: "Facturas", style: "margin-top:16px" }),
        crear("div", { clase: "tabla-wrap" }, tabla(
            [{ titulo: "Número" }, { titulo: "Fecha" }, { titulo: "Servicios" }, { titulo: "Método" }, { titulo: "Total", num: true }, { titulo: "Estado" }],
            facturas.map((f) => [f.consecutivo, fechaLegible(f.fecha), (f.items || []).map((i) => i.nombre).join(", "), f.metodoPago, formatoCOP(f.total), estadoChip(f.estadoPago)])
        )),
        crear("h2", { texto: "Recomendaciones de colorimetría", style: "margin-top:16px" }),
        crear("div", { clase: "tabla-wrap" }, tabla(
            [{ titulo: "Fecha" }, { titulo: "Tono / subtono" }, { titulo: "Ocasión" }, { titulo: "Servicio sugerido" }, { titulo: "Colores" }],
            recomendaciones.map((r) => [fechaRegistro(r.creadaEn), `${r.tonoPiel} / ${r.subtono}`, r.ocasion, r.servicioRecomendado, (r.colores || []).slice(0, 4).join(", ")])
        ))
    );
    contenedor.scrollIntoView({ behavior: "smooth" });
}

$("clientes-buscar").addEventListener("input", renderClientes);
$("clientes-rol").addEventListener("change", renderClientes);

/* =========================================
   SERVICIOS Y PRECIOS
========================================= */

function renderServicios() {
    pintar("tabla-servicios", tabla(
        [{ titulo: "Servicio" }, { titulo: "Categoría" }, { titulo: "Descripción" }, { titulo: "Duración" }, { titulo: "Valor", num: true }, { titulo: "Estado" }, { titulo: "Acciones" }],
        datos.servicios.map((s) => [
            s.nombre,
            s.categoria || "",
            s.descripcion || "",
            `${s.duracionMin || DURACION_BLOQUE} min`,
            formatoCOP(s.precio),
            s.activo === false ? estadoChip("inactivo") : crear("span", { clase: "estado atendida", texto: "Activo" }),
            crear("button", { clase: "btn sec peq", type: "button", texto: "Editar", onclick: () => editarServicio(s) })
        ])
    ));
}

function editarServicio(s) {
    $("titulo-form-servicio").textContent = `Editar servicio: ${s.nombre}`;
    $("srv-id").value = s.id;
    $("srv-nombre").value = s.nombre || "";
    $("srv-categoria").value = s.categoria || "otro";
    $("srv-precio").value = s.precio ?? 0;
    $("srv-duracion").value = s.duracionMin || DURACION_BLOQUE;
    $("srv-descripcion").value = s.descripcion || "";
    $("srv-foto").value = s.foto || "";
    $("srv-activo").value = String(s.activo !== false);
    $("srv-nombre").focus();
}

$("form-servicio").addEventListener("reset", () => {
    $("titulo-form-servicio").textContent = "Nuevo servicio";
    $("srv-id").value = "";
});

$("form-servicio").addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const id = $("srv-id").value;
    const nombre = limpiarTexto($("srv-nombre").value, 80);
    const precio = Math.round(Number($("srv-precio").value));

    if (nombre.length < 3) return mensaje("msg-servicio", "El nombre del servicio es obligatorio.", "error");
    if (!Number.isFinite(precio) || precio <= 0) return mensaje("msg-servicio", "El valor del servicio debe ser mayor que cero.", "error");
    if (datos.servicios.some((s) => s.nombre.toLowerCase() === nombre.toLowerCase() && s.id !== id)) {
        return mensaje("msg-servicio", "Ya existe un servicio con ese nombre.", "error");
    }

    const registro = {
        nombre,
        categoria: $("srv-categoria").value,
        precio,
        duracionMin: Math.max(15, Math.round(Number($("srv-duracion").value) || DURACION_BLOQUE)),
        descripcion: limpiarTexto($("srv-descripcion").value, 300),
        foto: limpiarTexto($("srv-foto").value, 300),
        activo: $("srv-activo").value === "true",
        actualizadoEn: serverTimestamp()
    };

    try {
        if (id) await setDoc(doc(db, "servicios", id), registro, { merge: true });
        else await addDoc(collection(db, "servicios"), registro);
        await recargar();
        $("form-servicio").reset();
        mensaje("msg-servicio", `Servicio «${nombre}» guardado.`, "success");
    } catch (error) {
        mensaje("msg-servicio", "No se pudo guardar: " + (error.code || error.message), "error");
    }
});

/* =========================================
   PROFESIONALES Y HORARIOS
========================================= */

$("pro-dias").replaceChildren(...[1, 2, 3, 4, 5, 6, 0].map((d) =>
    crear("label", {}, [crear("input", { type: "checkbox", value: String(d), checked: d !== 0 }), NOMBRES_DIAS[d]])
));

function renderProfesionales() {
    pintar("tabla-profesionales", tabla(
        [{ titulo: "Nombre" }, { titulo: "Especialidad" }, { titulo: "Horario" }, { titulo: "Días" }, { titulo: "Citas próximas", num: true }, { titulo: "Estado" }, { titulo: "Acciones" }],
        datos.profesionales.map((p) => [
            p.nombre,
            p.especialidad || "",
            `${p.entrada} - ${p.salida}`,
            (p.dias || []).map((d) => NOMBRES_DIAS[d]).join(", "),
            String(datos.citas.filter((c) => c.profesionalId === p.id && c.fecha >= fechaISO() && c.estado !== "cancelada").length),
            p.activo === false ? estadoChip("inactivo") : crear("span", { clase: "estado atendida", texto: "Activa" }),
            crear("button", { clase: "btn sec peq", type: "button", texto: "Editar", onclick: () => editarProfesional(p) })
        ])
    ));
}

function editarProfesional(p) {
    $("titulo-form-profesional").textContent = `Editar profesional: ${p.nombre}`;
    $("pro-id").value = p.id;
    $("pro-nombre").value = p.nombre || "";
    $("pro-especialidad").value = p.especialidad || "";
    $("pro-telefono").value = (p.telefono || "").replace(/^57/, "");
    $("pro-entrada").value = p.entrada;
    $("pro-salida").value = p.salida;
    $("pro-activo").value = String(p.activo !== false);
    $("pro-dias").querySelectorAll("input").forEach((i) => { i.checked = (p.dias || []).includes(Number(i.value)); });
    $("pro-nombre").focus();
}

$("form-profesional").addEventListener("reset", () => {
    $("titulo-form-profesional").textContent = "Nueva profesional";
    $("pro-id").value = "";
});

$("form-profesional").addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const id = $("pro-id").value;
    const nombre = limpiarTexto($("pro-nombre").value, 80);
    const entrada = $("pro-entrada").value;
    const salida = $("pro-salida").value;
    const dias = [...$("pro-dias").querySelectorAll("input:checked")].map((i) => Number(i.value)).sort();
    const telefonoTexto = $("pro-telefono").value.trim();
    const telefono = telefonoTexto ? normalizarCelular(telefonoTexto) : "";

    if (nombre.length < 3) return mensaje("msg-profesional", "El nombre es obligatorio.", "error");
    if (!entrada || !salida || aMinutos(salida) - aMinutos(entrada) < DURACION_BLOQUE) {
        return mensaje("msg-profesional", `El horario debe cubrir al menos un bloque de ${DURACION_BLOQUE} minutos.`, "error");
    }
    if (dias.length === 0) return mensaje("msg-profesional", "Selecciona al menos un día de atención.", "error");
    if (telefonoTexto && !telefono) return mensaje("msg-profesional", "El celular no es válido.", "error");

    const registro = {
        nombre,
        especialidad: limpiarTexto($("pro-especialidad").value, 120),
        telefono,
        entrada,
        salida,
        dias,
        activo: $("pro-activo").value === "true",
        actualizadoEn: serverTimestamp()
    };

    try {
        if (id) await setDoc(doc(db, "profesionales", id), registro, { merge: true });
        else await addDoc(collection(db, "profesionales"), registro);
        await recargar();
        $("form-profesional").reset();
        mensaje("msg-profesional", `Profesional «${nombre}» guardada.`, "success");
    } catch (error) {
        mensaje("msg-profesional", "No se pudo guardar: " + (error.code || error.message), "error");
    }
});

/* =========================================
   OPINIONES
========================================= */

function renderOpiniones() {
    pintar("tabla-opiniones", tabla(
        [{ titulo: "Fecha" }, { titulo: "Nombre" }, { titulo: "Calificación" }, { titulo: "Comentario" }, { titulo: "Visible" }, { titulo: "Acciones" }],
        datos.opiniones.map((o) => [
            fechaRegistro(o.creadaEn),
            o.nombre,
            "★".repeat(o.calificacion || 0),
            o.comentario,
            o.visible ? "Sí" : "No",
            crear("div", { clase: "acciones", style: "margin:0" }, [
                crear("button", {
                    clase: "btn sec peq", type: "button", texto: o.visible ? "Ocultar" : "Mostrar",
                    onclick: async () => {
                        await updateDoc(doc(db, "opiniones", o.id), { visible: !o.visible });
                        o.visible = !o.visible;
                        renderOpiniones();
                    }
                }),
                crear("button", {
                    clase: "btn peligro peq", type: "button", texto: "Eliminar",
                    onclick: async () => {
                        if (!confirm("¿Eliminar esta opinión definitivamente?")) return;
                        await deleteDoc(doc(db, "opiniones", o.id));
                        datos.opiniones = datos.opiniones.filter((x) => x.id !== o.id);
                        renderOpiniones();
                    }
                })
            ])
        ])
    ));
}

/* =========================================
   INICIO: VERIFICACIÓN DEL ROL
========================================= */

$("btn-salir").addEventListener("click", () => cerrarSesion("login.html"));

async function iniciar() {
    const sesion = await esperarSesion();

    if (!sesion.usuario) {
        window.location.replace("login.html?volver=admin.html");
        return;
    }
    if (!sesion.perfil || sesion.perfil.rol !== "admin") {
        window.location.replace("mi-cuenta.html");
        return;
    }

    perfilAdmin = sesion.perfil;
    $("nombre-admin").textContent = `Hola, ${perfilAdmin.nombre || "administradora"}`;

    const hoy = fechaISO();
    $("agenda-fecha").value = hoy;
    $("citas-desde").value = hoy;
    $("citas-hasta").value = sumarDias(hoy, 14);
    $("fac-fecha").value = hoy;

    try {
        await cargarTodo();
    } catch (error) {
        console.error(error);
        $("pantalla-carga").textContent =
            "No se pudo leer la base de datos (" + (error.code || error.message) +
            "). Verifica que las reglas de Firestore estén publicadas.";
        return;
    }

    fijarRango("mes");
    renderTodo();
    $("pantalla-carga").classList.add("oculto");
    $("panel").classList.remove("oculto");
}

iniciar();
