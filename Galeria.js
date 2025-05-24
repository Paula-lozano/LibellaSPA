//"window.location.search" Esto devuelve la cadena de consulta de la URL (lo que va después del signo ? ejemplo: servicio=manicure
//"new URLSearchParams" Permite leer, añadir, eliminar o modificar parámetros de forma muy práctica
//"const params" Guarda el objeto URLSearchParams en una constante llamada params
const params = new URLSearchParams(window.location.search);

//"params.get('servicio')" Busca el valor del parámetro llamado servicio dentro de la URL 
// "o" Si params.get('servicio') devuelve null, undefined o una cadena vacía (es decir, si el parámetro servicio no está en la URL), se usará "manicure" como valor predeterminado
//"const servicio" Guarda el valor del parámetro servicio (o el valor por defecto "manicure") en la constante servicio
const servicio = params.get('servicio') || "manicure";

//Crea un objeto literal con los títulos personalizados para cada tipo de servicio
const titulos = {
  manicure: "Diseños de Manicure",
  pedicure: "Diseños de Pedicure",
  acrilicas: "Diseños de Uñas Acrílicas",
};
//Esta línea modifica el texto dentro de un elemento <h2> que se encuentra dentro de un elemento con ID titulo-servicio, 
// utilizando como contenido el título correspondiente al tipo de servicio (como "manicure", "pedicure", etc.). 
// Si no hay título disponible, muestra "Galería de Diseños" como valor predeterminado.
  document.querySelector('#titulo-servicio h2').textContent = titulos[servicio] || "Galería de Diseños";

   // Función para generar rutas automáticamente
   // La funcion "generarRutas, crea un arreglo de rutas de imagenes automaticas, siguiendo una estructura y nombre consecutivo"
   //"Carpeta" Nombre de la carpeta tiene que estar al mismo nivel que el HTML
function generarRutas(carpeta, cantidad, prefijo = carpeta) {
  //"Array.from()"" es un método que crea un nuevo array
  //"length: cantidad"Crea un array de cantidad elementos vacíos
  //"(_, i) =>" Esta es una función flecha que se ejecuta una vez por cada elemento del array
  //${carpeta} → nombre de la carpeta (ej. "Manicure").
  //${prefijo} → nombre base del archivo (ej. "Manicure").
  //${i + 1} → número secuencial que empieza desde 1.
  //jpg → extensión de la imagen.
return Array.from({ length: cantidad }, (_, i) => `${carpeta}/${prefijo}${i + 1}.jpg`);
}
//"For" define cuantas imagenes mostrar por cada servicio
const imagenesPorServicio = {
manicure: generarRutas("Manicure", 5),
pedicure: generarRutas("Pedicure", 3),
acrilicas: generarRutas("Acrilicas", 5),
};

//"imagenesPorServicio[servicio]"" imagenesPorServicio es un objeto que mapea cada tipo de servicio con un arreglo de rutas
//"|| o" Si imagenesPorServicio[servicio] es undefined no está definido en el objeto), entonces se usará un array vacío []
const imagenes = imagenesPorServicio[servicio] || [];
//"document.getElementById" Es un método del DOM que busca un elemento HTML por su atributo id
const galeria = document.getElementById("galeria-contenido");

//"imagenes" es un array de rutas de imágenes
//"forEach()"" es un método de los arrays que ejecuta una función una vez por cada elemento del array. En este caso, por cada ruta de imagen
//"ruta" ruta de la imagen
imagenes.forEach(ruta => {

  //Crea dinámicamente un nuevo elemento
const img = document.createElement("img");
//Asigna la fuente de la imagen (src) combinando la carpeta "Imagenes" con el nombre de archivo (la ruta).
img.src = `Imagenes/${ruta}`;
//Define el atributo alt (texto alternativo) para la imagen
img.alt = "Diseño de uñas";
//galeria es la referencia al contenedor HTML (por ejemplo un <div> con id "galeria-contenido").
//appendChild(img): Inserta el nuevo elemento <img> dentro del contenedor. Lo añade como hijo al final del contenido
galeria.appendChild(img);
});