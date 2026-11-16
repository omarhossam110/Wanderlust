// ==================== CURRENCY CONVERTER ====================

import { ApiService } from "../api/api.js";
import { escapeHTML } from "../utils/helpers.js";
import { showMessage } from "../utils/ui.js";

// Add your ExchangeRate-API key here.
const EXCHANGE_RATE_API_KEY = "2decd4b59ceedff7b965f9ee";
const EXCHANGE_RATE_API = "https://v6.exchangerate-api.com/v6";

const POPULAR_CURRENCIES = [
    { code: "EUR", flag: "eu" },
    { code: "GBP", flag: "gb" },
    { code: "EGP", flag: "eg" },
    { code: "AED", flag: "ae" },
    { code: "SAR", flag: "sa" },
    { code: "JPY", flag: "jp" },
    { code: "CAD", flag: "ca" },
    { code: "INR", flag: "in" }
];

const currencyNames = new Intl.DisplayNames(["en"], { type: "currency" });
const ratesCache = new Map();

const amountInput = document.getElementById("currency-amount");
const fromSelect = document.getElementById("currency-from");
const toSelect = document.getElementById("currency-to");
const swapButton = document.getElementById("swap-currencies-btn");
const convertButton = document.getElementById("convert-btn");
const resultContainer = document.getElementById("currency-result");
const popularCurrenciesContainer = document.getElementById("popular-currencies");

let latestRates = null;
let latestBaseCurrency = "";
let isInitialized = false;

function getCurrencyName(code) {
    try {
        const name = currencyNames.of(code);
        return name && name !== code ? name : code;
    } catch {
        return code;
    }
}

function formatAmount(value, maximumFractionDigits = 2) {
    return new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits
    }).format(value);
}

function showResultMessage(message, type = "info") {
    if (!resultContainer) return;

    resultContainer.innerHTML = `
        <div class="exchange-rate-info">
            <p>${escapeHTML(message)}</p>
        </div>
    `;

    resultContainer.dataset.state = type;
}

async function fetchRates(baseCurrency) {
    if (ratesCache.has(baseCurrency)) {
        return ratesCache.get(baseCurrency);
    }

    if (!EXCHANGE_RATE_API_KEY || EXCHANGE_RATE_API_KEY === "YOUR_EXCHANGERATE_API_KEY") {
        throw new Error("Add your ExchangeRate-API key in currency.js before using the converter.");
    }

    const url = `${EXCHANGE_RATE_API}/${encodeURIComponent(EXCHANGE_RATE_API_KEY)}/latest/${encodeURIComponent(baseCurrency)}`;
    const data = await ApiService.get(url);

    if (data.result !== "success" || !data.conversion_rates) {
        throw new Error(data["error-type"] || "Unable to load exchange rates.");
    }

    ratesCache.set(baseCurrency, data);
    return data;
}

function populateCurrencySelects(currencies) {
    const selectedFrom = fromSelect.value || "USD";
    const selectedTo = toSelect.value || "EGP";

    const options = currencies
        .sort((a, b) => a.localeCompare(b))
        .map(code => {
            const name = getCurrencyName(code);
            return `<option value="${escapeHTML(code)}">${escapeHTML(code)} - ${escapeHTML(name)}</option>`;
        })
        .join("");

    fromSelect.innerHTML = options;
    toSelect.innerHTML = options;

    fromSelect.value = currencies.includes(selectedFrom) ? selectedFrom : "USD";
    toSelect.value = currencies.includes(selectedTo) ? selectedTo : "EGP";
}

function renderPopularCurrencies(rates, baseCurrency) {
    if (!popularCurrenciesContainer) return;

    popularCurrenciesContainer.innerHTML = POPULAR_CURRENCIES.map(currency => {
        const rate = rates[currency.code];
        const rateText = typeof rate === "number" ? formatAmount(rate, 4) : "Unavailable";
        const name = getCurrencyName(currency.code);

        return `
            <div
                class="popular-currency-card"
                data-currency="${currency.code}"
                role="button"
                tabindex="0"
                aria-label="Convert to ${escapeHTML(name)}"
            >
                <img
                    src="https://flagcdn.com/w40/${currency.flag}.png"
                    alt="${currency.code}"
                    class="flag"
                    loading="lazy"
                >
                <div class="info">
                    <div class="code">${currency.code}</div>
                    <div class="name">${escapeHTML(name)}</div>
                </div>
                <div class="rate">${rateText}</div>
            </div>
        `;
    }).join("");

    popularCurrenciesContainer.querySelectorAll("[data-currency]").forEach(card => {
        const selectPopularCurrency = () => {
            const currencyCode = card.dataset.currency;
            if (!Array.from(toSelect.options).some(option => option.value === currencyCode)) {
                showMessage(`${currencyCode} is not available in the currency list.`, "error");
                return;
            }

            toSelect.value = currencyCode;
            convertCurrency();
        };

        card.addEventListener("click", selectPopularCurrency);
        card.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                selectPopularCurrency();
            }
        });
    });

    popularCurrenciesContainer.setAttribute("aria-label", `Popular exchange rates from ${baseCurrency}`);
}

function renderConversion(amount, fromCurrency, toCurrency, rate, updatedAt) {
    const convertedAmount = amount * rate;

    resultContainer.innerHTML = `
        <div class="conversion-display">
            <div class="conversion-from">
                <span class="amount">${formatAmount(amount)}</span>
                <span class="currency-code">${escapeHTML(fromCurrency)}</span>
            </div>
            <div class="conversion-equals"><i class="fa-solid fa-equals"></i></div>
            <div class="conversion-to">
                <span class="amount">${formatAmount(convertedAmount)}</span>
                <span class="currency-code">${escapeHTML(toCurrency)}</span>
            </div>
        </div>
        <div class="exchange-rate-info">
            <p>1 ${escapeHTML(fromCurrency)} = ${formatAmount(rate, 6)} ${escapeHTML(toCurrency)}</p>
            <small>Last updated: ${escapeHTML(updatedAt || "Not available")}</small>
        </div>
    `;

    resultContainer.dataset.state = "success";
}

async function convertCurrency() {
    const amount = Number(amountInput.value);
    const fromCurrency = fromSelect.value;
    const toCurrency = toSelect.value;

    if (!Number.isFinite(amount) || amount <= 0) {
        showMessage("Please enter an amount greater than zero.", "error");
        amountInput.focus();
        return;
    }

    if (!fromCurrency || !toCurrency) {
        showMessage("Please select both currencies.", "error");
        return;
    }

    convertButton.disabled = true;
    showResultMessage("Loading the latest exchange rate...", "loading");

    try {
        const data = await fetchRates(fromCurrency);
        const rate = data.conversion_rates[toCurrency];

        if (typeof rate !== "number") {
            throw new Error(`The exchange rate for ${toCurrency} is not available.`);
        }

        latestRates = data.conversion_rates;
        latestBaseCurrency = fromCurrency;

        const updatedAt = data.time_last_update_utc
            ? new Date(data.time_last_update_utc).toLocaleString("en-US")
            : "Not available";

        renderConversion(amount, fromCurrency, toCurrency, rate, updatedAt);
        renderPopularCurrencies(latestRates, latestBaseCurrency);
    } catch (error) {
        console.error("Currency conversion error:", error);
        showResultMessage(error.message || "Something went wrong while converting currencies.", "error");
        showMessage(error.message || "Unable to convert currencies. Please try again.", "error");
    } finally {
        convertButton.disabled = false;
    }
}

async function refreshPopularRates() {
    const baseCurrency = fromSelect.value;

    try {
        const data = await fetchRates(baseCurrency);
        latestRates = data.conversion_rates;
        latestBaseCurrency = baseCurrency;
        renderPopularCurrencies(latestRates, latestBaseCurrency);
    } catch (error) {
        console.error("Popular currency rates error:", error);
        if (popularCurrenciesContainer) {
            popularCurrenciesContainer.innerHTML = `
                <div class="exchange-rate-info">
                    <p>${escapeHTML(error.message || "Unable to load popular exchange rates.")}</p>
                </div>
            `;
        }
    }
}

function swapCurrencies() {
    const previousFrom = fromSelect.value;
    fromSelect.value = toSelect.value;
    toSelect.value = previousFrom;

    refreshPopularRates();
    convertCurrency();
}

function setupCurrencyEvents() {
    convertButton.addEventListener("click", convertCurrency);
    swapButton.addEventListener("click", swapCurrencies);

    fromSelect.addEventListener("change", () => {
        refreshPopularRates();
    });

    amountInput.addEventListener("keydown", event => {
        if (event.key === "Enter") convertCurrency();
    });

    toSelect.addEventListener("keydown", event => {
        if (event.key === "Enter") convertCurrency();
    });
}

export async function initializeCurrency() {
    if (isInitialized) return;

    if (!amountInput || !fromSelect || !toSelect || !swapButton || !convertButton || !resultContainer) {
        console.warn("Currency Converter elements were not found in the HTML.");
        return;
    }

    isInitialized = true;
    showResultMessage("Loading available currencies...", "loading");

    try {
        const data = await fetchRates(fromSelect.value || "USD");
        const currencies = Object.keys(data.conversion_rates || {});

        if (!currencies.length) {
            throw new Error("No currencies were returned by ExchangeRate-API.");
        }

        populateCurrencySelects(currencies);
        setupCurrencyEvents();

        latestRates = data.conversion_rates;
        latestBaseCurrency = fromSelect.value;
        renderPopularCurrencies(latestRates, latestBaseCurrency);
        await convertCurrency();
    } catch (error) {
        console.error("Currency Converter initialization error:", error);
        showResultMessage(error.message || "Unable to initialize the currency converter.", "error");
        showMessage(error.message || "Unable to load currencies. Please check your API key and try again.", "error");
        isInitialized = false;
    }
}
