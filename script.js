(() => {
  "use strict";

  const form = document.querySelector("#lead-form");
  const formView = document.querySelector("#form-view");
  const successView = document.querySelector("#success-view");
  const submitButton = document.querySelector("#submit-button");
  const buttonLabel = submitButton.querySelector(".button-label");
  const resetButton = document.querySelector("#reset-button");
  const submitError = document.querySelector("#submit-error");

  const fields = {
    name: document.querySelector("#name"),
    phone: document.querySelector("#phone"),
    email: document.querySelector("#email"),
    privacyConsent: document.querySelector("#privacy-consent")
  };

  const missingEmailValue = "nie-wypelniono@example.invalid";

  let isSubmitting = false;

  function normalizePhone(value) {
    const trimmedValue = value.trim();
    if (!/^\+?[\d\s-]+$/u.test(trimmedValue)) {
      return null;
    }

    let digits = trimmedValue.replace(/\D/g, "");

    if (digits.startsWith("48") && digits.length === 11) {
      digits = digits.slice(2);
    }

    return digits.length === 9 ? `+48${digits}` : null;
  }

  function normalizeEmail(value) {
    return value.replace(/\s+/g, "").toLowerCase();
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u.test(value);
  }

  function showFieldError(fieldName, message) {
    const input = fields[fieldName];
    const error = document.querySelector(`#${input.id}-error`);
    input.setAttribute("aria-invalid", message ? "true" : "false");
    error.textContent = message;
  }

  function clearErrors() {
    Object.keys(fields).forEach((fieldName) => showFieldError(fieldName, ""));
    submitError.hidden = true;
  }

  function validateForm() {
    clearErrors();

    const name = fields.name.value.trim();
    const rawPhone = fields.phone.value.trim();
    const phone = normalizePhone(rawPhone);
    const email = normalizeEmail(fields.email.value);
    const emailProvided = email.length > 0;
    let firstInvalidField = null;

    if (name.length < 2) {
      showFieldError("name", "Imię musi zawierać co najmniej 2 znaki.");
      firstInvalidField ||= fields.name;
    }

    if (!phone) {
      showFieldError("phone", "Wpisz poprawny numer telefonu.");
      firstInvalidField ||= fields.phone;
    }

    if (emailProvided && !isValidEmail(email)) {
      showFieldError("email", "Wpisz poprawny adres e-mail.");
      firstInvalidField ||= fields.email;
    }

    if (!fields.privacyConsent.checked) {
      showFieldError("privacyConsent", "Ta zgoda jest wymagana.");
      firstInvalidField ||= fields.privacyConsent;
    }

    if (firstInvalidField) {
      firstInvalidField.focus();
      return null;
    }

    fields.phone.value = phone;
    fields.email.value = email;

    return {
      name,
      phone,
      email,
      privacyConsent: true,
      marketingConsent: document.querySelector("#marketing-consent").checked,
      source: "web",
      website: document.querySelector("#website").value
    };
  }

  function setSubmitting(active) {
    isSubmitting = active;
    submitButton.disabled = active;
    submitButton.classList.toggle("is-loading", active);
    buttonLabel.textContent = active ? "Wysyłanie..." : "Prześlij";
    form.setAttribute("aria-busy", active ? "true" : "false");
  }

  function showSuccess() {
    formView.hidden = true;
    successView.hidden = false;
    successView.focus();
  }

  async function submitForm(event) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const payload = validateForm();
    if (!payload) {
      return;
    }

    const endpoint = window.APP_CONFIG?.googleAppsScriptUrl?.trim();
    if (!endpoint || endpoint === "PASTE_GOOGLE_APPS_SCRIPT_URL_HERE") {
      submitError.hidden = false;
      return;
    }

    setSubmitting(true);
    submitError.hidden = true;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: new URLSearchParams({
          ...payload,
          email: payload.email || missingEmailValue,
          privacyConsent: String(payload.privacyConsent),
          marketingConsent: String(payload.marketingConsent)
        })
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error("Submission rejected");
      }

      showSuccess();
    } catch (_error) {
      submitError.hidden = false;
      submitError.focus?.();
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    form.reset();
    clearErrors();
    successView.hidden = true;
    formView.hidden = false;
    fields.name.focus();
  }

  form.addEventListener("submit", submitForm);
  resetButton.addEventListener("click", resetForm);

  Object.entries(fields).forEach(([fieldName, input]) => {
    input.addEventListener("input", () => showFieldError(fieldName, ""));
    input.addEventListener("change", () => showFieldError(fieldName, ""));
  });
})();
