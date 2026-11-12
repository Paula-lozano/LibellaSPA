/* ==========================================
   AL BEAUTY STUDIO - CATÁLOGO DE SERVICIOS
   ------------------------------------------
   RF-002: la información de los servicios que
   administra el panel (nombre, descripción y
   precio) se refleja en la página principal.
========================================== */

import { obtenerServicios, formatoCOP } from "./app-comun.js";

const servicios = await obtenerServicios({ soloActivos: false });

document.querySelectorAll(".service-card[data-servicio]").forEach((tarjeta) => {
    const servicio = servicios.find((s) => s.id === tarjeta.dataset.servicio);
    if (!servicio) return;

    if (servicio.activo === false) {
        tarjeta.hidden = true;
        return;
    }

    tarjeta.querySelector("h3").textContent = servicio.nombre;
    if (servicio.descripcion) {
        tarjeta.querySelector(".service-desc").textContent = servicio.descripcion;
    }
    tarjeta.querySelector("[data-precio]").textContent = "Desde " + formatoCOP(servicio.precio);
});
