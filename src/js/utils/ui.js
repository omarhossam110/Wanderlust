

// ==================== UI HELPERS ====================

import { escapeHTML } from "./helpers.js";

// ==================== TOAST MESSAGES ====================

export function showMessage(message, type = "error") {
    const container = document.getElementById("toast-container");

    if (!container) {
        alert(message);
        return;
    }

    const toast = document.createElement("div");

    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3500);
}

// ==================== HEADER COUNTRY SELECTION ====================

export function updateHeaderSelection(
    selectionElement,
    emptyMessage = "Select a country and city from Dashboard"
) {
    if (!selectionElement) {
        return {
            countryCode: "",
            countryName: "",
            city: "",
            hasCountry: false,
            hasCity: false
        };
    }

    const countrySelect = document.getElementById("global-country");
    const citySelect = document.getElementById("global-city");

    const countryCode = countrySelect?.value || "";

    const countryName =
        countrySelect?.selectedOptions[0]?.textContent?.trim() || "";

    const city = citySelect?.value?.trim() || "";

    if (!countryCode || !countryName) {
        selectionElement.innerHTML = `
            <div class="current-selection-badge">
                <span>${escapeHTML(emptyMessage)}</span>
            </div>
        `;

        return {
            countryCode: "",
            countryName: "",
            city: "",
            hasCountry: false,
            hasCity: false
        };
    }

    const flagURL = `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;

    selectionElement.innerHTML = `
        <div class="current-selection-badge">
            <img
                src="${flagURL}"
                alt="${escapeHTML(countryName)}"
                class="selection-flag"
            >

            <span>${escapeHTML(countryName)}</span>

            ${
                city
                    ? `<span class="selection-city">${escapeHTML(city)}</span>`
                    : ""
            }
        </div>
    `;

    return {
        countryCode,
        countryName,
        city,
        hasCountry: true,
        hasCity: Boolean(city)
    };
}
