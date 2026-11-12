/* ==========================================
   AL BEAUTY STUDIO - SIMULADOR DE COLORIMETRÍA
   ------------------------------------------
   RF-003 / CU-003. Reglas de recomendación:
   1. El tono de piel define los subtonos
      posibles (diccionario subtonosPorPiel).
   2. El subtono (cálido, frío, neutro, oliva)
      define la familia de colores base.
   3. El tono de piel ajusta la profundidad
      (nudes claros u oscuros).
   4. La ocasión añade colores de intensidad
      adecuada y define el servicio sugerido.
   Si la clienta inició sesión puede guardar la
   recomendación en Firestore (recomendaciones),
   que luego aparece en su historial.
========================================== */

// Firebase se carga bajo demanda (import dinámico) solo cuando la
// clienta guarda una recomendación. Así la página del simulador no
// descarga ~230 KB al abrirse y carga más rápido en celulares.
async function cargarFirebase() {
    const [{ auth, db }, sesion, firestore] = await Promise.all([
        import("./firebase-config.js"),
        import("./sesion.js"),
        import("https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js")
    ]);
    return { auth, db, ...sesion, ...firestore };
}

/* ---------- Datos de colorimetría ---------- */

// Subtonos disponibles para cada tono de piel.
const subtonosPorPiel = {
    clara: ["frio", "calido", "neutro"],
    media: ["calido", "frio", "neutro", "oliva"],
    triguena: ["calido", "neutro", "oliva"],
    morena: ["calido", "neutro", "oliva"],
    oscura: ["calido", "frio", "neutro"],
    ebano: ["frio", "calido", "neutro"]
};

const nombresSubtono = {
    frio: "Frío (venas azuladas, la plata te favorece)",
    calido: "Cálido (venas verdosas, el dorado te favorece)",
    neutro: "Neutro (te favorecen plata y dorado)",
    oliva: "Oliva (matiz verdoso-dorado)"
};

const nombresPiel = {
    clara: "Clara",
    media: "Media",
    triguena: "Trigueña",
    morena: "Morena",
    oscura: "Oscura",
    ebano: "Ébano"
};

// Color de fondo de la mano para la vista previa.
const colorPielFondo = {
    clara: "#f6dcc8",
    media: "#e8bc94",
    triguena: "#d39b6c",
    morena: "#b27a53",
    oscura: "#8d5524",
    ebano: "#4b2e24"
};

// Paleta base por subtono: [nombre, hexadecimal].
const paletaPorSubtono = {
    frio: [
        ["Rosa chicle", "#f48fb1"],
        ["Fucsia", "#d81b60"],
        ["Lavanda", "#b39ddb"],
        ["Azul cobalto", "#1e40af"],
        ["Vino frío", "#7b1f3a"],
        ["Plata", "#c0c0c8"]
    ],
    calido: [
        ["Coral", "#ff7f50"],
        ["Durazno", "#ffb07c"],
        ["Terracota", "#c8553d"],
        ["Mostaza", "#d4a017"],
        ["Rojo tomate", "#d7263d"],
        ["Dorado", "#d4af37"]
    ],
    neutro: [
        ["Rosa palo", "#e8b4b8"],
        ["Malva", "#b784a7"],
        ["Rojo clásico", "#c0142f"],
        ["Verde salvia", "#8fa98b"],
        ["Champán", "#e9d8a6"],
        ["Taupe", "#9c8577"]
    ],
    oliva: [
        ["Verde oliva", "#6b7d3a"],
        ["Ciruela", "#6d2e5a"],
        ["Bronce", "#cd7f32"],
        ["Ladrillo", "#a4442a"],
        ["Mocca", "#7b5544"],
        ["Oro viejo", "#b8912f"]
    ]
};

// Nude recomendado según la profundidad de la piel.
const nudePorPiel = {
    clara: ["Nude rosado", "#f2d4cf"],
    media: ["Nude beige", "#d9b39a"],
    triguena: ["Nude caramelo", "#c18f6b"],
    morena: ["Nude canela", "#a06b4c"],
    oscura: ["Nude chocolate", "#7a4a33"],
    ebano: ["Nude cacao", "#5a3526"]
};

// Ajuste por ocasión: colores extra y servicio.
const reglasOcasion = {
    diario: {
        extra: [["Transparente brillo", "#f7eef2"]],
        servicio: "manicure",
        consejo: "Para el día a día priorizamos tonos suaves y de bajo mantenimiento."
    },
    oficina: {
        extra: [["Blanco francés", "#f8f4ef"]],
        servicio: "manicure",
        consejo: "En la oficina funcionan los nudes y los tonos neutros, en uñas cortas o medianas."
    },
    fiesta: {
        extra: [["Negro glitter", "#1b1b1f"], ["Metalizado", "#a7a9b4"]],
        servicio: "acrilicas",
        consejo: "Para la noche sugerimos acabados intensos o metalizados en uñas acrílicas."
    },
    evento: {
        extra: [["Perla", "#efe6dc"], ["Rosa champán", "#f1c6c0"]],
        servicio: "acrilicas",
        consejo: "Para bodas y eventos recomendamos acrílicas con acabado perla o francés."
    }
};

const nombresServicio = {
    manicure: "Manicure",
    pedicure: "Pedicure",
    acrilicas: "Uñas acrílicas"
};

/* ---------- Elementos ---------- */

const formulario = document.getElementById("form-simulador");
const pielSelect = document.getElementById("piel");
const subtonoSelect = document.getElementById("subtono");
const ocasionSelect = document.getElementById("ocasion");
const mano = document.getElementById("mano");
const unas = mano.querySelectorAll(".una-simulada");
const codigoColor = document.getElementById("codigoColor");
const bloques = document.getElementById("bloques-colores");
const resumen = document.getElementById("resumen");
const botonGuardar = document.getElementById("btn-guardar");
const botonReservar = document.getElementById("btn-reservar");
const mensaje = document.getElementById("mensaje-simulador");

let recomendacionActual = null;

/* ---------- Lógica ---------- */

function pintarUnas(color) {
    unas.forEach((u) => { u.style.backgroundColor = color; });
}

function actualizarSubtonos() {
    const piel = pielSelect.value;
    subtonoSelect.replaceChildren();

    if (!subtonosPorPiel[piel]) {
        subtonoSelect.disabled = true;
        subtonoSelect.append(new Option("Primero elige el tono", ""));
        mano.style.backgroundColor = "";
        return;
    }

    subtonoSelect.disabled = false;
    subtonoSelect.append(new Option("-- Seleccionar --", ""));
    subtonosPorPiel[piel].forEach((s) => subtonoSelect.append(new Option(nombresSubtono[s], s)));
    mano.style.backgroundColor = colorPielFondo[piel];
}

// Calcula la recomendación (función pura, fácil de probar).
export function generarRecomendacion(piel, subtono, ocasion) {
    if (!subtonosPorPiel[piel]) throw new Error("Tono de piel no válido");
    if (!subtonosPorPiel[piel].includes(subtono)) throw new Error("Subtono no válido para el tono de piel");
    const regla = reglasOcasion[ocasion] || reglasOcasion.diario;

    const colores = [nudePorPiel[piel], ...paletaPorSubtono[subtono], ...regla.extra]
        .map(([nombre, hex]) => ({ nombre, hex }));

    return {
        tonoPiel: piel,
        subtono,
        ocasion,
        colores,
        servicioRecomendado: regla.servicio,
        consejo: regla.consejo
    };
}

function mostrarRecomendacion(rec) {
    bloques.replaceChildren();
    pintarUnas(rec.colores[0].hex);
    codigoColor.textContent = `Color en vista previa: ${rec.colores[0].nombre} (${rec.colores[0].hex})`;

    rec.colores.forEach((color, indice) => {
        const boton = document.createElement("button");
        boton.type = "button";
        boton.className = "color-bloque";
        boton.setAttribute("aria-pressed", indice === 0 ? "true" : "false");

        const muestra = document.createElement("span");
        muestra.className = "color-muestra";
        muestra.style.backgroundColor = color.hex;

        const nombre = document.createElement("span");
        nombre.className = "color-nombre";
        nombre.textContent = color.nombre;
        const codigo = document.createElement("small");
        codigo.textContent = color.hex;
        nombre.append(codigo);

        boton.append(muestra, nombre);
        boton.addEventListener("click", () => {
            pintarUnas(color.hex);
            codigoColor.textContent = `Color en vista previa: ${color.nombre} (${color.hex})`;
            bloques.querySelectorAll(".color-bloque").forEach((b) => b.setAttribute("aria-pressed", "false"));
            boton.setAttribute("aria-pressed", "true");
        });

        bloques.append(boton);
    });

    const servicio = nombresServicio[rec.servicioRecomendado];
    resumen.replaceChildren();
    const titulo = document.createElement("strong");
    titulo.textContent = `Piel ${nombresPiel[rec.tonoPiel]} · subtono ${nombresSubtono[rec.subtono].split(" ")[0].toLowerCase()}. `;
    resumen.append(
        titulo,
        `${rec.consejo} Servicio sugerido: ${servicio}. Toca un color para verlo en la mano.`
    );

    botonReservar.hidden = false;
    botonReservar.href = `index.html?servicio=${rec.servicioRecomendado}#citas`;
    botonReservar.textContent = `Reservar ${servicio.toLowerCase()}`;
    botonGuardar.disabled = false;
    mensaje.textContent = "";
}

formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();

    if (!pielSelect.value) {
        mensaje.textContent = "Por favor selecciona un tono de piel.";
        mensaje.className = "mensaje error";
        pielSelect.focus();
        return;
    }
    if (!subtonoSelect.value) {
        mensaje.textContent = "Por favor selecciona tu subtono.";
        mensaje.className = "mensaje error";
        subtonoSelect.focus();
        return;
    }

    try {
        recomendacionActual = generarRecomendacion(pielSelect.value, subtonoSelect.value, ocasionSelect.value);
        mostrarRecomendacion(recomendacionActual);
    } catch (error) {
        console.error(error);
        mensaje.textContent = "No fue posible generar la recomendación. Revisa los datos seleccionados.";
        mensaje.className = "mensaje error";
    }
});

botonGuardar.addEventListener("click", async () => {
    if (!recomendacionActual) return;
    botonGuardar.disabled = true;
    mensaje.textContent = "Verificando tu sesión...";
    mensaje.className = "mensaje";
    const { auth, db, esperarSesion, estadoSesion, collection, addDoc, serverTimestamp } = await cargarFirebase();
    await esperarSesion();
    botonGuardar.disabled = false;

    if (!auth.currentUser || !estadoSesion.perfil) {
        mensaje.replaceChildren("Inicia sesión para guardar la recomendación en tu historial. ");
        const enlace = document.createElement("a");
        enlace.href = "login.html?volver=Simulador.html";
        enlace.textContent = "Iniciar sesión";
        mensaje.append(enlace);
        mensaje.className = "mensaje error";
        return;
    }

    botonGuardar.disabled = true;
    try {
        await addDoc(collection(db, "recomendaciones"), {
            clienteId: auth.currentUser.uid,
            clienteNombre: estadoSesion.perfil.nombre || "",
            tonoPiel: recomendacionActual.tonoPiel,
            subtono: recomendacionActual.subtono,
            ocasion: recomendacionActual.ocasion,
            colores: recomendacionActual.colores.map((c) => `${c.nombre} ${c.hex}`),
            servicioRecomendado: nombresServicio[recomendacionActual.servicioRecomendado],
            creadaEn: serverTimestamp()
        });
        mensaje.textContent = "Recomendación guardada. Puedes verla en «Mi cuenta».";
        mensaje.className = "mensaje success";
    } catch (error) {
        console.error("Error al guardar la recomendación:", error);
        mensaje.textContent = "No se pudo guardar la recomendación. Inténtalo de nuevo.";
        mensaje.className = "mensaje error";
        botonGuardar.disabled = false;
    }
});

pielSelect.addEventListener("change", () => {
    actualizarSubtonos();
    botonGuardar.disabled = true;
});

// Enlace compartible: Simulador.html?piel=media&subtono=calido&ocasion=evento
// abre la recomendación ya generada (solo acepta valores válidos).
(function abrirDesdeEnlace() {
    const q = new URLSearchParams(location.search);
    const piel = q.get("piel"), subtono = q.get("subtono"), ocasion = q.get("ocasion");
    if (!subtonosPorPiel[piel] || !subtonosPorPiel[piel].includes(subtono)) return;
    pielSelect.value = piel;
    actualizarSubtonos();
    subtonoSelect.value = subtono;
    if (reglasOcasion[ocasion]) ocasionSelect.value = ocasion;
    recomendacionActual = generarRecomendacion(piel, subtono, ocasionSelect.value);
    mostrarRecomendacion(recomendacionActual);
})();
