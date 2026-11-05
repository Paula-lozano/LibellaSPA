
// INTERACCIONES Y ANIMACIONES - LIBELLA SPA

// Elementos principales
const cabecera = document.querySelector(".header");
const progreso = document.getElementById("scroll-progress");
const volver = document.getElementById("back-top");

// Actualiza los efectos al desplazarse por la pagina
function actualizarScroll() {
  const maximo =
    document.documentElement.scrollHeight - window.innerHeight;

  const porcentaje =
    maximo > 0 ? (window.scrollY / maximo) * 100 : 0;

  if (progreso) {
    progreso.style.width = porcentaje + "%";
  }

  if (cabecera) {
    cabecera.classList.toggle(
      "is-scrolled",
      window.scrollY > 35
    );
  }

  if (volver) {
    volver.classList.toggle(
      "show",
      window.scrollY > 450
    );
  }
}

// Detectar movimiento de la pagina
window.addEventListener(
  "scroll",
  actualizarScroll,
  { passive: true }
);

actualizarScroll();

// Boton para volver al inicio
if (volver) {
  volver.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  });
}

// Elementos que apareceran progresivamente
const secciones = document.querySelectorAll(
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

// Animaciones cuando el usuario baja por la pagina
if ("IntersectionObserver" in window) {

  const observador = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((entrada) => {

        if (entrada.isIntersecting) {
          entrada.target.classList.add("visible");
          observador.unobserve(entrada.target);
        }

      });
    },
    { threshold: 0.10 }
  );

  secciones.forEach((elemento, indice) => {

    elemento.classList.add("reveal");

    if (elemento.classList.contains("service-card")) {
      elemento.classList.add(
        "reveal-delay-" + (indice % 3)
      );
    }

    observador.observe(elemento);
  });
}

// Animacion cuando EmailJS confirma la suscripcion
const estadoCorreo =
  document.getElementById("mensaje-suscripcion");

const areaCorreo =
  document.getElementById("suscripcion");

if (
  estadoCorreo &&
  areaCorreo &&
  "MutationObserver" in window
) {

  const observadorCorreo = new MutationObserver(() => {

    // Solo celebrar cuando el correo fue enviado
    if (
      !estadoCorreo.textContent.includes(
        "¡Suscripción exitosa!"
      )
    ) {
      return;
    }

    estadoCorreo.classList.add("newsletter-success");

    // Respetar preferencias de movimiento reducido
    if (
      window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches
    ) {
      return;
    }

    // Crear corazones flotantes
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

      // Eliminar el corazon al terminar su animacion
      corazon.addEventListener(
        "animationend",
        () => corazon.remove(),
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
