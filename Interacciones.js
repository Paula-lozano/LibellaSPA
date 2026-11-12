
// ==========================================
// AL BEAUTY STUDIO - EFECTOS INTERACTIVOS
// ==========================================

// 1. ELEMENTOS PRINCIPALES
const cabecera = document.querySelector(".header");

const barraProgreso =
  document.getElementById("scroll-progress");

const botonArriba =
  document.getElementById("back-top");

// 2. EFECTOS AL DESPLAZARSE
function actualizarMovimiento() {

  const alturaTotal =
    document.documentElement.scrollHeight -
    window.innerHeight;

  const porcentaje =
    alturaTotal > 0
      ? (window.scrollY / alturaTotal) * 100
      : 0;

  // Barra de progreso
  if (barraProgreso) {
    barraProgreso.style.width = porcentaje + "%";
  }

  // Efecto del encabezado
  if (cabecera) {
    cabecera.classList.toggle(
      "is-scrolled",
      window.scrollY > 35
    );
  }

  // Mostrar boton para volver arriba
  if (botonArriba) {
    botonArriba.classList.toggle(
      "show",
      window.scrollY > 450
    );
  }
}

window.addEventListener(
  "scroll",
  actualizarMovimiento,
  { passive: true }
);

actualizarMovimiento();

// 3. BOTON PARA VOLVER AL INICIO
if (botonArriba) {
  botonArriba.addEventListener("click", function() {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  });
}

// 4. ANIMACIONES DE LAS SECCIONES
const elementosAnimados = document.querySelectorAll(
  ".section-heading, " +
  ".service-card, " +
  ".about-content, " +
  ".about-photo, " +
  ".booking-intro, " +
  ".form-panel, " +
  ".quote-card, " +
  ".opinion-form, " +
  ".newsletter-inner"
);

const movimientoReducido = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

if (
  "IntersectionObserver" in window &&
  !movimientoReducido
) {

  const observador = new IntersectionObserver(
    function(entradas) {

      entradas.forEach(function(entrada) {

        if (entrada.isIntersecting) {
          entrada.target.classList.add("visible");
          observador.unobserve(entrada.target);
        }

      });

    },
    {
      threshold: 0.10
    }
  );

  elementosAnimados.forEach(function(elemento, indice) {

    elemento.classList.add("reveal");

    if (elemento.classList.contains("service-card")) {
      elemento.classList.add(
        "reveal-delay-" + (indice % 3)
      );
    }

    observador.observe(elemento);
  });
}

// 5. EFECTO DE CORAZONES EN LA SUSCRIPCION
const estadoCorreo =
  document.getElementById("mensaje-suscripcion");

const areaCorreo =
  document.getElementById("suscripcion");

if (
  estadoCorreo &&
  areaCorreo &&
  "MutationObserver" in window
) {

  const observadorCorreo = new MutationObserver(function() {

    // Activar solo cuando EmailJS confirme el envio
    if (
      !estadoCorreo.textContent.includes(
        "¡Suscripción exitosa!"
      )
    ) {
      return;
    }

    estadoCorreo.classList.add("newsletter-success");

    if (movimientoReducido) {
      return;
    }

    // Crear corazones y estrellas flotantes
    for (let i = 0; i < 12; i++) {

      const corazon = document.createElement("span");

      corazon.className = "float-heart";

      corazon.textContent =
        i % 3 === 0 ? "✦" : "♥";

      corazon.style.left =
        (10 + Math.random() * 80) + "%";

      corazon.style.setProperty(
        "--dur",
        (3 + Math.random() * 2) + "s"
      );

      corazon.style.animationDelay =
        (Math.random() * 0.7) + "s";

      areaCorreo.appendChild(corazon);

      // Eliminar elemento al terminar
      corazon.addEventListener(
        "animationend",
        function() {
          corazon.remove();
        },
        { once: true }
      );
    }

  });

  observadorCorreo.observe(
    estadoCorreo,
    {
      childList: true,
      characterData: true,
      subtree: true
    }
  );
}
