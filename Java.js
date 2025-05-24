const horarios = generarHorarios(7, 19); 
// Llama a la función generarHorarios() con los valores 7 (inicio) y 19 (fin) para crear una lista de horas.
// Guardará horas de "07:00" a "18:00" (19 no se incluye).

const reservas = {}; 
// Almacena reservas por profesional
//Se estructura como:reservas = {
//diana: ["07:00", "08:00"],
//laura: ["09:00"]
//}

const horaSelect = document.getElementById("hora");
const profesionalSelect = document.getElementById("profesional");
const form = document.getElementById("form-cita");
//Guarda referencias a los elementos HTML del formulario para luego trabajar con ellos en JS

// Genera opciones horarias
function generarHorarios(inicio, fin) {//Funcion para generar horas
  const lista = [];//Crea una constante llamada lista, que es un array vacío ([]). Este array servirá para almacenar las horas generadas.
  for (let h = inicio; h < fin; h++) {//let h: Declara una variable que solo existe dentro del bucle.
    const horaStr = `${h.toString().padStart(2, "0")}:00`; //Esta línea convierte la hora (ej. 7) en el formato 07:00, como texto
    //"h.toString()" Convierte el número h (como 7) en texto ("7").
    //".padStart(2, "0")" Asegura que el número tenga 2 dígitos: Si h = 7, se convierte en "07". Si h = 10, queda igual ("10").
    //`${...}:00` Crea una cadena como "07:00", "08:00", etc.
    //"const horaStr" Guarda la hora ya formateada en la variable horaStr
    lista.push(horaStr);
    //"lista.push(...)" Añade el valor de horaStr al final del array lista
  }
  return lista;
  //Devuelve el array completo que contiene todas las horas generadas
}


//Funcion para cargar horas disponibles
function cargarHorarios() {
  const profesional = profesionalSelect.value;
  //"ProfesionalSelect" es una referencia al elemento HTML <select id="profesional">
  //"".value" obtiene el valor actual seleccionado (por ejemplo, "alex" o "laura"
  horaSelect.innerHTML = "";
  //"horaSelect" es una referencia al <select id="hora">, donde se muestran las horas disponibles
  //".innerHTML = "" Elimina cualquier contenido que tenga actualmente. Esto asegura que al cambiar de profesional, las horas viejas se borren antes de mostrar las nuevas
  horarios.forEach(hora => {
    //"forEach(hora => {...}" recorre cada una de esas horas
    //la variable hora contiene una de las horas disponibles
    const ocupada = reservas[profesional]?.includes(hora);
    //"reservas[profesional]" accede a la lista de horas reservadas para la profesional seleccionada
    //"?" (encadenamiento opcional) evita errores si reservas[profesional] todavía no existe (es undefined)
    //".includes(hora)" verifica si esa hora ya está en la lista de reservas
    //"const ocupada" será true si esa hora ya está reservada para esa profesional, false en caso contrario
    const option = document.createElement("option");
    //Crea un nuevo elemento HTML <option> para agregarlo dentro del <select> de horas.
    // Este será el valor visual y funcional que el cliente verá y podrá elegir.
    option.value = hora;
    //Establece el valor interno del <option>, es decir, lo que se enviará si el formulario se procesa
    option.textContent = hora;
    //Define el texto visible del <option> (lo que ve el usuario)
    if (ocupada) option.disabled = true;
    //Si la hora ya está reservada (ocupada === true), se desactiva la opción
    //option.disabled = true; impide que el usuario la seleccione
    horaSelect.appendChild(option);
    //Añade el <option> recién creado al menú de selección de horas (<select id="hora">).
    // Este paso es lo que muestra esa hora como opción en el HTML.
  });
}

//Cuando se cambia de profesional, actualiza las horas disponibles
profesionalSelect.addEventListener("change", cargarHorarios);

// Evento al enviar el formulario
form.addEventListener("submit", function (e) {
  //form es una referencia al formulario HTML (<form id="form-cita">)
  //".addEventListener("submit", ...)" Asocia un evento al formulario que se activará cuando el usuario lo envíe (al hacer clic en el botón “Agendar”)
  //"function (e)" e es el objeto del evento, y se usa para controlar o evitar su comportamiento por defecto
  e.preventDefault();
  //Detiene el comportamiento por defecto del formulario, que sería:
  // Recargar la página.
  // Intentar enviar datos a un servidor (lo cual no queremos aquí)

  const nombre = document.getElementById("nombre").value;
  const fecha = document.getElementById("fecha").value;
  const profesional = document.getElementById("profesional").value;
  const hora = document.getElementById("hora").value;
  const telefono = document.getElementById("telefono").value;
  //Captura de datos del formulario
  //"document.getElementById(...)" Accede a un campo del formulario por su ID.
  //".value" Obtiene el valor actual ingresado o seleccionado por el usuario

  if (!reservas[profesional]) reservas[profesional] = [];
  //"!reservas[profesional]" Verifica si todavía no existe una lista de reservas para esa profesional
  //"reservas[profesional] = []" Si no existe, se inicializa con un array vacío para empezar a guardar sus horarios

  if (reservas[profesional].includes(hora)) {//Verificacion de la hora reeservada
    alert("Ese horario ya está reservado para esa profesional.");//Mensaje de alerta
    return;
    //Previene que se agende un horario duplicado.
  }

  //Agrega la hora reservada al registro de la profesional
  reservas[profesional].push(hora);

  // Confirmación emergente
  alert(`¡Gracias ${nombre}! Tu cita con ${profesional} ha sido agendada para el ${fecha} a las ${hora}.`);

  // Envío a WhatsApp
  const mensaje = `Hola ${nombre}, tu cita fue agendada con ${profesional} el ${fecha} a las ${hora}. ¡Gracias por reservar en Libella SPA!`;
  //Lo codifica para que sea válido en una URL (espacios, acentos, etc.)
  const mensajeEncoded = encodeURIComponent(mensaje);

  // Se envia el mensaje al Cliente
  window.open(`https://wa.me/${telefono}?text=${mensajeEncoded}`, '_blank');

  // Se envia el mensaje al Profesional
  const telefonoProfesional = profesional === "alex" ? "573176751198" : "573176751198";
  window.open(`https://wa.me/${telefonoProfesional}?text=${mensajeEncoded}`, '_blank');

  form.reset();
  horaSelect.innerHTML = "<option>Selecciona un profesional</option>";
});

///////////////////////////////////////////////////////////////////////////////////////////////
//Foro de opiniones.

//"document.getElementById(...)"" Busca un elemento en el HTML por su id
const formOpinion = document.getElementById("form-opinion");
const listaOpiniones = document.getElementById("lista-opiniones");

// Cargar opiniones guardadas (opcional) / Cargar opiniones previas desde localStorage
document.addEventListener("DOMContentLoaded", () => {
  //"DOMContentLoaded" Evento que se dispara cuando el HTML ya se cargó completamente
  const opinionesGuardadas = JSON.parse(localStorage.getItem("opiniones")) || [];
  //"localStorage.getItem("opiniones")" Busca si hay opiniones guardadas en el navegador
  //"JSON.parse(...)" Convierte el texto guardado (JSON) en un arreglo de objetos JavaScript
  //"|| []" Si no hay nada guardado, se usa un arreglo vacío por defecto
  opinionesGuardadas.forEach(op => mostrarOpinion(op.usuario, op.comentario));
  //".forEach(...)" Recorre cada opinión guardada y la muestra en pantalla usando la función mostrarOpinion
});

// Función para mostrar una opinión en pantalla
function mostrarOpinion(usuario, comentario) {
  //"function mostrarOpinion(...)" Define una función reutilizable para mostrar un comentario
  const div = document.createElement("div");
  //"document.createElement("div")" Crea un nuevo <div> en memoria
  div.className = "opinion";
  //"div.className = "opinion" Le da una clase para aplicar estilos.
  div.innerHTML = `<strong>${usuario}</strong><p>${comentario}</p>`;
  //Usa HTML dinámico para insertar el nombre en negrita y el comentario debajo
  listaOpiniones.appendChild(div);
  //Agrega el nuevo div con la opinión al contenedor principal
}

// Capturar el envío del formulario
formOpinion.addEventListener("submit", function (e) {
  e.preventDefault();
  //"addEventListener("submit", ...)" Escucha el evento cuando se envía el formulario
  //"function (e)" Define la función que maneja ese evento
  //"e.preventDefault()" Previene que la página se recargue al enviar el formulario


  //Obtener datos ingresados por el usuario
  const usuario = document.getElementById("usuario").value.trim();
  const comentario = document.getElementById("comentario").value.trim();
  //".value" Obtiene el valor escrito por el usuario
  //".trim()" Elimina espacios en blanco antes y después del texto (limpieza de datos)


  //Validar que no estén vacíos
  if (!usuario || !comentario) return;//Si alguno de los campos está vacío, la función termina y no guarda nada

  // Mostrar en pantalla
  mostrarOpinion(usuario, comentario);

  // Guardar en LocalStorage
  const opiniones = JSON.parse(localStorage.getItem("opiniones")) || [];
  opiniones.push({ usuario, comentario });
  localStorage.setItem("opiniones", JSON.stringify(opiniones));
  //localStorage: Permite guardar datos directamente en el navegador del usuario.
  //push(...): Añade la nueva opinión al arreglo
  //JSON.stringify(...): Convierte el arreglo de objetos a texto para poder almacenarlo en localStorage

  // Limpiar formulario
  formOpinion.reset();
});