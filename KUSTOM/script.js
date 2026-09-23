
const WHATSAPP_NUMBER = "573053474213";
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwY0jBBlN1lL1XOoGV_jZIS2HpYs3G7nUnI1Av-w6tajqmi0uu-CKyvZUu2n8XayWJh/exec";

document.addEventListener("DOMContentLoaded", () => {
  setYear();
  setupMobileMenu();
  setupSmoothScroll();
  setupChoiceButtons();
  setupQuoteForm();
});

/* ---------- Año dinámico en el footer ---------- */
function setYear() {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}

/* ---------- Menú móvil (hamburguesa) ---------- */
function setupMobileMenu() {
  const toggle = document.getElementById("navToggle");
  const nav = document.getElementById("mainNav");
  if (!toggle || !nav) return;

  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    toggle.classList.toggle("open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  nav.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("open");
      toggle.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

/* ---------- Scroll suave hacia las secciones ---------- */
function setupSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (e) => {
      const targetId = anchor.getAttribute("href");
      if (!targetId || targetId === "#") return;
      const target = document.querySelector(targetId);
      if (!target) return;
      e.preventDefault();
      const headerHeight = document.getElementById("header")?.offsetHeight || 0;
      const top = target.getBoundingClientRect().top + window.scrollY - headerHeight + 1;
      window.scrollTo({ top, behavior: "smooth" });
    });
  });
}

/* ---------- Botones tipo "Sí / No" (logo, dominio, hosting) ---------- */
function setupChoiceButtons() {
  document.querySelectorAll(".choice-group").forEach((group) => {
    const name = group.dataset.name;
    const hiddenInput = document.getElementById(name);

    group.querySelectorAll(".choice-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        group.querySelectorAll(".choice-btn").forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        if (hiddenInput) hiddenInput.value = btn.dataset.value;
      });
    });
  });
}

/* ---------- Formulario de cotización ---------- */
function setupQuoteForm() {
  const form = document.getElementById("quoteForm");
  if (!form) return;

  const submitBtn = document.getElementById("submitBtn");
  const formNote = document.getElementById("formNote");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    clearErrors(form);
    formNote.textContent = "";
    formNote.className = "form-note";

    const data = getFormData(form);
    const errors = validateFormData(data);

    if (Object.keys(errors).length > 0) {
      showErrors(errors);
      formNote.textContent = "Por favor completa los campos obligatorios marcados.";
      formNote.classList.add("error");
      const firstErrorField = document.getElementById(Object.keys(errors)[0]);
      if (firstErrorField) firstErrorField.focus();
      return;
    }

    const message = buildWhatsAppMessage(data);
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

    formNote.textContent = "¡Listo! Abriendo WhatsApp con tu cotización...";
    formNote.classList.add("success");

    window.open(url, "_blank");

    // Guarda el pedido en Google Sheets y dispara la notificación por correo
    sendToGoogleSheets(data);
  });
}

/* Envía los datos del formulario al Google Apps Script.
   Este script (ver apps-script.gs) agrega la fila en la hoja de cálculo
   y envía el correo a la empresa, sin que el visitante tenga que hacer nada. */
function sendToGoogleSheets(data) {
  if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes("PEGA_AQUI")) {
    console.warn("GOOGLE_SCRIPT_URL no está configurada todavía (ver apps-script.gs).");
    return;
  }

  fetch(GOOGLE_SCRIPT_URL, {
    method: "POST",
    mode: "no-cors", // Google Apps Script no responde con cabeceras CORS estándar
    headers: { "Content-Type": "text/plain;charset=utf-8" }, // evita el preflight que Apps Script no soporta
    body: JSON.stringify(data),
  }).catch((err) => console.error("Error al enviar a Google Sheets:", err));
}

/* Recopila los datos del formulario en un objeto */
function getFormData(form) {
  const fd = new FormData(form);
  const data = {};
  fd.forEach((value, key) => {
    data[key] = typeof value === "string" ? value.trim() : value;
  });
  return data;
}

/* Validación básica de campos obligatorios */
function validateFormData(data) {
  const errors = {};

  if (!data.nombre) {
    errors.nombre = "Escribe tu nombre.";
  }

  if (!data.negocio) {
    errors.negocio = "Escribe el nombre de tu negocio.";
  }

  if (!data.whatsapp) {
    errors.whatsapp = "Ingresa tu número de WhatsApp.";
  } else if (!/^[0-9+\s()-]{7,}$/.test(data.whatsapp)) {
    errors.whatsapp = "Ingresa un número de WhatsApp válido.";
  }

  if (data.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.correo)) {
    errors.correo = "Ingresa un correo electrónico válido.";
  }

  if (!data.tipoNegocio) {
    errors.tipoNegocio = "Selecciona el tipo de negocio.";
  }

  if (!data.tipoPagina) {
    errors.tipoPagina = "Selecciona el tipo de página que necesitas.";
  }

  return errors;
}

/* Muestra los mensajes de error junto a cada campo */
function showErrors(errors) {
  Object.entries(errors).forEach(([field, message]) => {
    const input = document.getElementById(field);
    const errorEl = document.getElementById(`err-${field}`);
    if (input) input.classList.add("invalid");
    if (errorEl) errorEl.textContent = message;
  });
}

/* Limpia errores previos antes de una nueva validación */
function clearErrors(form) {
  form.querySelectorAll(".invalid").forEach((el) => el.classList.remove("invalid"));
  form.querySelectorAll(".field-error").forEach((el) => (el.textContent = ""));
}

/* Valor legible para los campos opcionales de Sí/No/vacío */
function readable(value) {
  return value && value.length > 0 ? value : "No especificado";
}

/* Construye el mensaje que se enviará por WhatsApp */
function buildWhatsAppMessage(data) {
  const lines = [
    "Hola, quiero solicitar una cotización para mi negocio.",
    "",
    `Nombre: ${data.nombre}`,
    `Negocio: ${data.negocio}`,
    `WhatsApp: ${data.whatsapp}`,
    `Correo: ${readable(data.correo)}`,
    `Tipo de negocio: ${data.tipoNegocio}`,
    `Tipo de página: ${data.tipoPagina}`,
    `Logo: ${readable(data.logo)}`,
    `Dominio: ${readable(data.dominio)}`,
    `Hosting: ${readable(data.hosting)}`,
    `Presupuesto aproximado: ${readable(data.presupuesto)}`,
    `Información adicional: ${readable(data.info)}`,
    "",
    "Gracias.",
  ];

  return lines.join("\n");
}