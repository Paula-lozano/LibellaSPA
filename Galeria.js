/* ==========================================
   AL BEAUTY STUDIO - GALERÍA DE DISEÑOS
   ------------------------------------------
   Lee el parámetro ?servicio= de la URL y muestra
   las fotografías de la carpeta correspondiente.
   Valores válidos: manicure, pedicure, acrilicas.
========================================== */

// URLSearchParams permite leer los parámetros de la URL.
const params = new URLSearchParams(window.location.search);

// Si el parámetro no existe o no es válido se usa "manicure".
const titulos = {
  manicure: "Diseños de Manicure",
  pedicure: "Diseños de Pedicure",
  acrilicas: "Diseños de Uñas Acrílicas"
};

const servicioParam = params.get("servicio");
const servicio = Object.prototype.hasOwnProperty.call(titulos, servicioParam) ? servicioParam : "manicure";

document.querySelector("#titulo-servicio h2").textContent = titulos[servicio];
document.title = `${titulos[servicio]} | AL Beauty Studio`;

// Genera rutas consecutivas: Carpeta/Prefijo1.jpg, Prefijo2.jpg...
function generarRutas(carpeta, cantidad, prefijo = carpeta) {
  return Array.from({ length: cantidad }, (_, i) => `${carpeta}/${prefijo}${i + 1}.jpg`);
}

// Cantidad de fotografías disponibles por servicio.
const imagenesPorServicio = {
  manicure: generarRutas("Manicure", 5),
  pedicure: generarRutas("Pedicure", 3),
  acrilicas: generarRutas("Acrilicas", 5)
};

const galeria = document.getElementById("galeria-contenido");

imagenesPorServicio[servicio].forEach((ruta, indice) => {
  const img = document.createElement("img");
  img.src = `Imagenes/${ruta}`;
  img.alt = `${titulos[servicio]}: diseño ${indice + 1} realizado en AL Beauty Studio`;
  img.loading = "lazy";
  img.decoding = "async";
  galeria.appendChild(img);
});

// Marca la pestaña activa y prepara el botón de reserva.
document.querySelectorAll(".tabs-galeria a").forEach((enlace) => {
  if (enlace.dataset.servicio === servicio) enlace.setAttribute("aria-current", "page");
});

const reservar = document.getElementById("btn-reservar-galeria");
if (reservar) reservar.href = `index.html?servicio=${servicio}#citas`;
