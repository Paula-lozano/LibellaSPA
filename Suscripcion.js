
// ==========================================
// AL BEAUTY STUDIO - SUSCRIPCION CON EMAILJS
// ==========================================
// Servicio externo: EmailJS envía el correo de
// bienvenida usando la plantilla configurada en
// https://dashboard.emailjs.com. Las tres llaves
// siguientes son públicas por diseño (EmailJS las
// expone en el navegador); el envío se limita por
// dominio permitido desde el panel de EmailJS.

// 1. CONFIGURACION DE EMAILJS (clave pública)
const EMAILJS_PUBLIC_KEY = "1Gbqb3sfLWYUcvHnz";

// Servicio y plantilla creados en EmailJS
const EMAILJS_SERVICE_ID = "service_91qsvjb";
const EMAILJS_TEMPLATE_ID = "template_5uw9mvm";

// 2. ELEMENTOS DEL FORMULARIO
const formularioSuscripcion =
  document.getElementById("form-suscripcion");

const correoSuscripcion =
  document.getElementById("email-suscripcion");

const botonSuscripcion =
  document.getElementById("btn-suscripcion");

const mensajeSuscripcion =
  document.getElementById("mensaje-suscripcion");

// 3. INICIALIZAR EMAILJS
if (
  typeof emailjs !== "undefined" &&
  EMAILJS_PUBLIC_KEY !== "AQUI_TU_PUBLIC_KEY"
) {
  emailjs.init({
    publicKey: EMAILJS_PUBLIC_KEY
  });
}

// 4. ENVIAR CORREO DE BIENVENIDA
if (
  formularioSuscripcion &&
  correoSuscripcion &&
  botonSuscripcion &&
  mensajeSuscripcion
) {
  formularioSuscripcion.addEventListener(
    "submit",
    async function(evento) {
      evento.preventDefault();

      const correo = correoSuscripcion.value.trim();

      if (!correoSuscripcion.checkValidity()) {
        correoSuscripcion.reportValidity();
        return;
      }

      if (
        typeof emailjs === "undefined" ||
        EMAILJS_PUBLIC_KEY === "AQUI_TU_PUBLIC_KEY"
      ) {
        mensajeSuscripcion.style.color = "#a83250";
        mensajeSuscripcion.textContent =
          "Falta configurar EmailJS.";
        return;
      }

      botonSuscripcion.disabled = true;
      mensajeSuscripcion.style.color = "#743454";
      mensajeSuscripcion.textContent =
        "Estamos preparando tu bienvenida...";

      try {
        await emailjs.send(
          EMAILJS_SERVICE_ID,
          EMAILJS_TEMPLATE_ID,
          {
            email: correo,
            website_url: window.location.origin +
              window.location.pathname,
            nombre: "Amante de la belleza"
          }
        );

        mensajeSuscripcion.style.color = "#d6f5d9";
        mensajeSuscripcion.textContent =
          "¡Suscripción exitosa! Revisa tu correo de bienvenida.";

        formularioSuscripcion.reset();

      } catch (error) {
        console.error(
          "Error al enviar el correo:",
          error
        );

        mensajeSuscripcion.style.color = "#ffd6df";
        mensajeSuscripcion.textContent =
          "No pudimos enviar el correo. Intenta nuevamente.";

      } finally {
        botonSuscripcion.disabled = false;
      }
    }
  );
}
