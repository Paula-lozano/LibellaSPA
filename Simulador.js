// Tonos de piel directamente (sin subtonos)
const tonosPiel = {
  clara: ["#fce4ec", "#ffebee", "#f8bbd0", "#ffe0b2"],
  media: ["#ffe0b2", "#ffd180", "#ffcc80", "#ffab91"],
  trigueña: ["#d7a86e", "#d2a679", "#bf8f68", "#a47551"],
  morena: ["#a47449", "#8b5e3c", "#5d4037", "#6d4c41"],
  oscura: ["#8d5524", "#6c3e1f", "#5d2a1d", "#3e2723"],
  ebano: ["#3b1f1f", "#2e1a12", "#1c0f0a", "#0a0302"]
};

// Colores que están disponibles físicamente en el local
const coloresDisponibles = [
  "#ff8a80", "#ffb74d", "#ff7043", "#e53935", "#fdd835",
  "#82b1ff", "#ce93d8", "#90caf9", "#f8bbd0", "#cfd8dc",
  "#f5f5dc", "#fbe9e7", "#ffe0b2", "#f3e5f5",
  "#e53935", "#ffa726", "#43a047", "#2979ff",
  "#6d4c41", "#3e2723", "#000000", "#5d4037",
  "#ffd700", "#cd7f32", "#c0c0c0",
  "#e0c097", "#fbe9e7", "#ffe0b2",
  "#1e88e5", "#43a047", "#fdd835", "#fbc02d",
  "#880e4f", "#4a148c", "#000000", "#3e2723",
  "#ffd700", "#cd7f32", "#c0c0c0",
  "#fce4ec", "#ffebee", "#f8bbd0", "#ffe0b2",
  "#ffe0b2", "#ffd180", "#ffcc80", "#ffab91",
  "#d7a86e", "#d2a679", "#bf8f68", "#a47551",
  "#a47449", "#8b5e3c", "#5d4037", "#6d4c41",
  "#8d5524", "#6c3e1f", "#5d2a1d", "#3e2723",
  "#3b1f1f", "#2e1a12", "#1c0f0a", "#0a0302"
];

// Cambiar color de fondo de la mano según la piel
const colorPielFondo = {
  clara: "#fdebd0",
  media: "#f1c27d",
  trigueña: "#dba26e",
  morena: "#b27a53",
  oscura: "#8d5524",
  ebano: "#4b2e2e"
};

// Actualiza dinámicamente los subtonos cuando se elige el tono de piel
document.getElementById("piel").addEventListener("change", function () {
  const pielSeleccionada = this.value;
  const mano = document.getElementById("mano");

  // Cambia color de fondo de la mano según el tono de piel
  mano.style.backgroundColor = colorPielFondo[pielSeleccionada] || "#ccc";
});

  if (subtonosPorPiel[pielSeleccionada]) {
    subtonosPorPiel[pielSeleccionada].forEach(subtono => {
      const option = document.createElement("option");
      option.value = subtono;
      option.textContent = subtono.charAt(0).toUpperCase() + subtono.slice(1);
      subtonoSelect.appendChild(option);
    });
  }

function mostrarColores() {
  const piel = document.getElementById("piel").value;
  const bloques = document.getElementById("bloques-colores");
  const codigoColor = document.getElementById("codigoColor");

  const uñas = [
    document.getElementById("uña1"),
    document.getElementById("uña2"),
    document.getElementById("uña3"),
    document.getElementById("uña4"),
    document.getElementById("uña5")
  ];

  bloques.innerHTML = "";
  codigoColor.textContent = "";
  uñas.forEach(uña => uña.style.backgroundColor = "#ccc");

  if (!piel) {
    bloques.innerHTML = "<p>Por favor selecciona un tono de piel.</p>";
    return;
  }

  // Pintar el fondo de la mano con el color de piel seleccionado
  document.getElementById("mano").style.backgroundColor = colorPielFondo[piel] || "#ccc";

  const colores = tonosPiel[piel] || [];

  if (colores.length === 0) {
    bloques.innerHTML = "<p>No hay colores disponibles para este tono de piel.</p>";
    return;
  }

  colores.forEach(color => {
    const div = document.createElement("div");
    div.className = "color-bloque";
    div.style.backgroundColor = color;
    div.textContent = color;

    div.onclick = () => {
      uñas.forEach(uña => uña.style.backgroundColor = color);
      codigoColor.textContent = `Color seleccionado: ${color}`;
    };

    bloques.appendChild(div);
  });
}

  






  