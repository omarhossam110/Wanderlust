
// ==================== WANDERLUST - DASHBOARD ====================

import { ApiService } from "../api/api.js";
import { formatNumber, escapeHTML } from "../utils/helpers.js";
import { showMessage } from "../utils/ui.js";

// ==================== API CONFIGURATION ====================

const NAGER_API = "https://date.nager.at/api/v3";

const REST_COUNTRIES_API = "https://api.restcountries.com/countries/v5";
const REST_COUNTRIES_API_KEY = "rc_live_9be29922d2004eacb2f989d6c3b8b516";

// ==================== DASHBOARD ELEMENTS ====================

const countrySelect = document.getElementById("global-country");
const citySelect = document.getElementById("global-city");
const yearSelect = document.getElementById("global-year");
const exploreBtn = document.getElementById("global-search-btn");

const countriesCount = document.getElementById("stat-countries");
const holidaysCount = document.getElementById("stat-holidays");

const selectedDestination = document.getElementById("selected-destination");
const selectedFlag = document.getElementById("selected-country-flag");
const selectedCountryName = document.getElementById("selected-country-name");
const selectedCityName = document.getElementById("selected-city-name");
const clearSelectionBtn = document.getElementById("clear-selection-btn");

const countryInfo = document.getElementById("dashboard-country-info");
const countryInfoSection = document.getElementById("dashboard-country-info-section");

// ==================== DASHBOARD STATE ====================

let availableCountries = [];
let selectedCountryData = null;
let localTimeInterval = null;
let cityRequestId = 0;

// Custom dropdown elements
let countryDropdown = null;
let countryDropdownButton = null;
let countrySearchInput = null;
let countryOptionsContainer = null;

// ==================== COUNTRY DROPDOWN ====================

function createCountryDropdown() {
    if (!countrySelect || countryDropdown) return;

    const wrapper = document.createElement("div");

    wrapper.className = "country-dropdown-wrapper";
    wrapper.style.position = "relative";
    wrapper.style.width = "100%";

    const button = document.createElement("button");

    button.type = "button";
    button.className = countrySelect.className;
    button.textContent = "Select Country";
    button.style.width = "100%";
    button.style.display = "flex";
    button.style.alignItems = "center";
    button.style.justifyContent = "space-between";
    button.style.textAlign = "left";
    button.style.cursor = "pointer";

    const arrow = document.createElement("span");

    arrow.innerHTML = '<i class="fa-solid fa-chevron-down"></i>';

    button.appendChild(arrow);

    const dropdown = document.createElement("div");

    dropdown.className = "country-search-dropdown";
    dropdown.style.position = "absolute";
    dropdown.style.top = "calc(100% + 6px)";
    dropdown.style.left = "0";
    dropdown.style.width = "100%";
    dropdown.style.background = "var(--card-bg, #ffffff)";
    dropdown.style.border = "1px solid var(--border-color, #ddd)";
    dropdown.style.borderRadius = "10px";
    dropdown.style.padding = "10px";
    dropdown.style.zIndex = "1000";
    dropdown.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)";
    dropdown.style.display = "none";
    dropdown.style.maxHeight = "300px";
    dropdown.style.overflow = "hidden";

    const searchInput = document.createElement("input");

    searchInput.type = "text";
    searchInput.placeholder = "Search for a country...";
    searchInput.className = "country-search-input";

    searchInput.style.width = "100%";
    searchInput.style.padding = "10px";
    searchInput.style.marginBottom = "8px";
    searchInput.style.border = "1px solid var(--border-color, #ddd)";
    searchInput.style.borderRadius = "7px";
    searchInput.style.outline = "none";
    searchInput.style.boxSizing = "border-box";

    const optionsContainer = document.createElement("div");

    optionsContainer.className = "country-options";
    optionsContainer.style.maxHeight = "220px";
    optionsContainer.style.overflowY = "auto";

    dropdown.appendChild(searchInput);
    dropdown.appendChild(optionsContainer);

    wrapper.appendChild(button);
    wrapper.appendChild(dropdown);

    countrySelect.parentNode.insertBefore(wrapper, countrySelect);
    wrapper.appendChild(countrySelect);

    countrySelect.style.display = "none";

    countryDropdown = dropdown;
    countryDropdownButton = button;
    countrySearchInput = searchInput;
    countryOptionsContainer = optionsContainer;

    button.addEventListener("click", () => {
        const isOpen = dropdown.style.display === "block";

        if (isOpen) {
            closeCountryDropdown();
        } else {
            openCountryDropdown();
        }
    });

    searchInput.addEventListener("input", () => {
        renderCountryOptions(searchInput.value);
    });

    searchInput.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeCountryDropdown();
            button.focus();
        }
    });

    document.addEventListener("click", event => {
        if (!wrapper.contains(event.target)) {
            closeCountryDropdown();
        }
    });

    renderCountryOptions();
}

function openCountryDropdown() {
    if (!countryDropdown) return;

    countryDropdown.style.display = "block";
    countrySearchInput.value = "";

    renderCountryOptions();

    countrySearchInput.focus();
}

function closeCountryDropdown() {
    if (!countryDropdown) return;

    countryDropdown.style.display = "none";
}

function renderCountryOptions(searchTerm = "") {
    if (!countryOptionsContainer) return;

    countryOptionsContainer.innerHTML = "";

    const normalizedSearch = searchTerm.trim().toLowerCase();

    const filteredCountries = availableCountries.filter(country =>
        country.name.toLowerCase().includes(normalizedSearch)
    );

    if (filteredCountries.length === 0) {
        const emptyMessage = document.createElement("div");

        emptyMessage.textContent = "No countries found.";
        emptyMessage.style.padding = "12px";
        emptyMessage.style.textAlign = "center";
        emptyMessage.style.color = "#888";

        countryOptionsContainer.appendChild(emptyMessage);

        return;
    }

    filteredCountries.forEach(country => {
        const option = document.createElement("button");

        option.type = "button";
        option.textContent = country.name;
        option.className = "country-dropdown-option";

        option.style.display = "block";
        option.style.width = "100%";
        option.style.padding = "10px";
        option.style.border = "none";
        option.style.background =
            countrySelect.value === country.countryCode
                ? "var(--primary-light, #f1f1f1)"
                : "transparent";

        option.style.textAlign = "left";
        option.style.cursor = "pointer";
        option.style.borderRadius = "6px";

        option.addEventListener("mouseenter", () => {
            option.style.background = "var(--primary-light, #f1f1f1)";
        });

        option.addEventListener("mouseleave", () => {
            option.style.background =
                countrySelect.value === country.countryCode
                    ? "var(--primary-light, #f1f1f1)"
                    : "transparent";
        });

        option.addEventListener("click", () => {
            countrySelect.value = country.countryCode;

            updateCountryDropdownLabel();
            closeCountryDropdown();

            countrySelect.dispatchEvent(
                new Event("change", { bubbles: true })
            );
        });

        countryOptionsContainer.appendChild(option);
    });
}

function updateCountryDropdownLabel() {
    if (!countryDropdownButton) return;

    const selectedCountry = availableCountries.find(
        country => country.countryCode === countrySelect.value
    );

    const label = selectedCountry
        ? selectedCountry.name
        : "Select Country";

    countryDropdownButton.innerHTML = `
        <span>${escapeHTML(label)}</span>
        <span><i class="fa-solid fa-chevron-down"></i></span>
    `;
}

// ==================== REST COUNTRIES ====================

async function fetchCountryByCode(countryCode) {
    const data = await ApiService.get(
        `${REST_COUNTRIES_API}/codes.alpha_2/${encodeURIComponent(countryCode)}`,
        {
            headers: {
                Authorization: `Bearer ${REST_COUNTRIES_API_KEY}`
            }
        }
    );

    const country = data.data?.objects?.[0];

    if (!country) {
        throw new Error("Country information was not found.");
    }

    return country;
}

// ==================== COUNTRIES ====================

async function loadCountries() {
    try {
        availableCountries = await ApiService.get(
            `${NAGER_API}/AvailableCountries`
        );

        availableCountries.sort((a, b) =>
            a.name.localeCompare(b.name)
        );

        countrySelect.innerHTML =
            '<option value="">Select Country</option>';

        availableCountries.forEach(country => {
            const option = document.createElement("option");

            option.value = country.countryCode;
            option.textContent = country.name;

            countrySelect.appendChild(option);
        });

        countrySelect.value = "";

        if (countriesCount) {
            countriesCount.textContent = availableCountries.length;
        }

        if (holidaysCount) {
            holidaysCount.textContent = "--";
        }

        createCountryDropdown();
        updateCountryDropdownLabel();

        resetDestinationDisplay();

        citySelect.innerHTML =
            '<option value="">Select a country first</option>';

        citySelect.disabled = true;

    } catch (error) {
        console.error("Could not load countries:", error);

        showMessage("Could not load the countries. Please try again.");
    }
}

// ==================== CITY OPTIONS ====================

async function updateCityOptions() {
    const countryCode = countrySelect.value;

    const currentRequestId = ++cityRequestId;

    citySelect.innerHTML = "";

    if (!countryCode) {
        citySelect.innerHTML =
            '<option value="">Select a country first</option>';

        citySelect.disabled = true;

        return;
    }

    citySelect.disabled = true;

    citySelect.innerHTML =
        '<option value="">Loading cities...</option>';

    try {
        const country = await fetchCountryByCode(countryCode);

        // Ignore outdated requests if the user changed the country.
        if (currentRequestId !== cityRequestId) return;

        const cities = country.capitals?.map(capital => capital.name) || [];

        citySelect.innerHTML = "";

        if (cities.length === 0) {
            citySelect.innerHTML =
                '<option value="">No city available</option>';

            citySelect.disabled = true;

            return;
        }

        citySelect.innerHTML =
            '<option value="">Select City</option>';

        cities.forEach(city => {
            const option = document.createElement("option");

            option.value = city;
            option.textContent = city;

            citySelect.appendChild(option);
        });

        citySelect.disabled = false;

    } catch (error) {
        if (currentRequestId !== cityRequestId) return;

        console.error("Could not load city options:", error);

        citySelect.innerHTML =
            '<option value="">Unable to load cities</option>';

        showMessage("Could not load cities for this country.");
    }
}

// ==================== COUNTRY INFORMATION ====================

async function getCountryInformation(countryCode) {
    return await fetchCountryByCode(countryCode);
}

function getCallingCode(country) {
    const codes = country.calling_codes || [];

    if (!codes.length) {
        return "Not available";
    }

    return codes.map(code => `+${code}`).join(", ");
}

function getCurrencies(country) {
    if (!country.currencies) {
        return "Not available";
    }

    return Object.values(country.currencies)
        .map(currency => `${currency.name} (${currency.symbol || ""})`)
        .join(", ");
}

function getLanguages(country) {
    if (!country.languages?.length) {
        return "Not available";
    }

    return country.languages
        .map(language => {
            return typeof language === "string"
                ? language
                : language.english_name || language.name || language.native_name;
        })
        .filter(Boolean)
        .join(", ");
}

function getTimezone(country) {
    return country.timezones?.[0] || "UTC";
}

function getLocalTime(timezone) {
    const match = timezone.match(/^UTC([+-])(\d{2}):(\d{2})$/);

    if (!match) {
        return new Date().toLocaleTimeString("en-US", {
            timeZone: "UTC",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        });
    }

    const sign = match[1] === "+" ? 1 : -1;
    const hours = Number(match[2]);
    const minutes = Number(match[3]);

    const offsetInMinutes = sign * (hours * 60 + minutes);
    const localDate = new Date(Date.now() + offsetInMinutes * 60000);

    return localDate.toLocaleTimeString("en-US", {
        timeZone: "UTC",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });
}

function updateLocalTime(timezone) {
    const timeElement = document.getElementById("country-local-time");
    const timezoneElement = document.querySelector(".local-time-zone");

    if (!timeElement) return;

    const updateTime = () => {
        timeElement.textContent = getLocalTime(timezone);
    };

    updateTime();

    if (localTimeInterval) {
        clearInterval(localTimeInterval);
    }

    localTimeInterval = setInterval(updateTime, 1000);

    if (timezoneElement) {
        timezoneElement.textContent = timezone;
    }
}

// ==================== RENDER COUNTRY INFORMATION ====================

function renderCountryInformation(country) {
    const commonName = country.names?.common || "Unknown";
    const officialName = country.names?.official || commonName;

    const countryCode = country.codes?.alpha_2?.toLowerCase();

    const flag = country.flag?.url_png ||
        `https://flagcdn.com/w160/${countryCode}.png`;

    const region = country.region || "Not available";
    const subregion = country.subregion || "";

    const capital = country.capitals?.[0]?.name || "Not available";

    const population = formatNumber(country.population || 0);

    const area = country.area?.kilometers
        ? `${formatNumber(country.area.kilometers)} km²`
        : "Not available";

    const continent = country.continents?.join(", ") || region;

    const callingCode = getCallingCode(country);
    const drivingSide = country.cars?.driving_side || "Not available";
    const weekStarts = country.date?.start_of_week || "Not available";

    const currencies = getCurrencies(country);
    const languages = getLanguages(country);

    const neighbors = country.borders || [];

    const mapsLink = country.links?.google_maps ||
        `https://www.google.com/maps/search/${encodeURIComponent(commonName)}`;

    countryInfo.innerHTML = `
        <div class="dashboard-country-header">
            <img src="${escapeHTML(flag)}"
                 alt="${escapeHTML(commonName)}"
                 class="dashboard-country-flag">

            <div class="dashboard-country-title">
                <h3>${escapeHTML(commonName)}</h3>
                <p class="official-name">${escapeHTML(officialName)}</p>
                <span class="region">
                    <i class="fa-solid fa-location-dot"></i>
                    ${escapeHTML(region)}${subregion ? ` • ${escapeHTML(subregion)}` : ""}
                </span>
            </div>
        </div>

        <div class="dashboard-local-time">
            <div class="local-time-display">
                <i class="fa-solid fa-clock"></i>
                <span class="local-time-value" id="country-local-time">--:--:--</span>
                <span class="local-time-zone">${escapeHTML(getTimezone(country))}</span>
            </div>
        </div>

        <div class="dashboard-country-grid">
            <div class="dashboard-country-detail">
                <i class="fa-solid fa-building-columns"></i>
                <span class="label">Capital</span>
                <span class="value">${escapeHTML(capital)}</span>
            </div>

            <div class="dashboard-country-detail">
                <i class="fa-solid fa-users"></i>
                <span class="label">Population</span>
                <span class="value">${population}</span>
            </div>

            <div class="dashboard-country-detail">
                <i class="fa-solid fa-ruler-combined"></i>
                <span class="label">Area</span>
                <span class="value">${escapeHTML(area)}</span>
            </div>

            <div class="dashboard-country-detail">
                <i class="fa-solid fa-globe"></i>
                <span class="label">Continent</span>
                <span class="value">${escapeHTML(continent)}</span>
            </div>

            <div class="dashboard-country-detail">
                <i class="fa-solid fa-phone"></i>
                <span class="label">Calling Code</span>
                <span class="value">${escapeHTML(callingCode)}</span>
            </div>

            <div class="dashboard-country-detail">
                <i class="fa-solid fa-car"></i>
                <span class="label">Driving Side</span>
                <span class="value">${escapeHTML(drivingSide)}</span>
            </div>

            <div class="dashboard-country-detail">
                <i class="fa-solid fa-calendar-week"></i>
                <span class="label">Week Starts</span>
                <span class="value">${escapeHTML(weekStarts)}</span>
            </div>
        </div>

        <div class="dashboard-country-extras">
            <div class="dashboard-country-extra">
                <h4><i class="fa-solid fa-coins"></i> Currency</h4>
                <div class="extra-tags">
                    <span class="extra-tag">${escapeHTML(currencies)}</span>
                </div>
            </div>

            <div class="dashboard-country-extra">
                <h4><i class="fa-solid fa-language"></i> Languages</h4>
                <div class="extra-tags">
                    <span class="extra-tag">${escapeHTML(languages)}</span>
                </div>
            </div>

            <div class="dashboard-country-extra">
                <h4><i class="fa-solid fa-map-location-dot"></i> Neighbors</h4>
                <div class="extra-tags">
                    ${
                        neighbors.length
                            ? neighbors.map(code =>
                                `<span class="extra-tag border-tag">${escapeHTML(code)}</span>`
                              ).join("")
                            : '<span class="extra-tag">No land borders</span>'
                    }
                </div>
            </div>
        </div>

        <div class="dashboard-country-actions">
            <a href="${escapeHTML(mapsLink)}"
               target="_blank"
               rel="noopener noreferrer"
               class="btn-map-link">
                <i class="fa-solid fa-map"></i> View on Google Maps
            </a>
        </div>
    `;

    updateLocalTime(getTimezone(country));
}

// ==================== RESET DESTINATION DISPLAY ====================

function resetDestinationDisplay() {
    if (selectedDestination) {
        selectedDestination.style.display = "none";
    }

    if (countryInfoSection) {
        countryInfoSection.style.display = "none";
    }

    if (countryInfo) {
        countryInfo.innerHTML = "";
    }

    if (localTimeInterval) {
        clearInterval(localTimeInterval);
        localTimeInterval = null;
    }

    selectedCountryData = null;
}

// ==================== HOLIDAYS STAT ====================

async function updateHolidaysCount(countryCode, year) {
    try {
        const holidays = await ApiService.get(
            `${NAGER_API}/PublicHolidays/${year}/${countryCode}`
        );

        if (holidaysCount) {
            holidaysCount.textContent = holidays.length;
        }

    } catch (error) {
        console.error("Could not load holidays:", error);

        if (holidaysCount) {
            holidaysCount.textContent = "--";
        }
    }
}

// ==================== EXPLORE DESTINATION ====================

async function exploreDestination() {
    const countryCode = countrySelect.value;
    const city = citySelect.value;
    const year = yearSelect.value;

    if (!countryCode || !city || !year) {
        showMessage("Please select a country, city, and year.");

        return;
    }

    exploreBtn.disabled = true;

    try {
        const country = await getCountryInformation(countryCode);

        selectedCountryData = country;

        renderCountryInformation(country);

        const countryName = country.names?.common || "Unknown";

        const flag = country.flag?.url_png ||
            `https://flagcdn.com/w80/${countryCode.toLowerCase()}.png`;

        selectedFlag.src = flag;
        selectedFlag.alt = countryName;

        selectedCountryName.textContent = countryName;
        selectedCityName.textContent = `• ${city}`;

        selectedDestination.style.display = "flex";

        if (countryInfoSection) {
            countryInfoSection.style.display = "";
        }

        await updateHolidaysCount(countryCode, year);

    } catch (error) {
        console.error("Could not explore destination:", error);

        showMessage("Could not load destination information. Please try again.");

    } finally {
        exploreBtn.disabled = false;
    }
}

// ==================== EVENT LISTENERS ====================

function setupDashboardEvents() {
    countrySelect.addEventListener("change", async () => {
        updateCountryDropdownLabel();

        resetDestinationDisplay();

        holidaysCount.textContent = "--";

        await updateCityOptions();
    });

    exploreBtn.addEventListener("click", exploreDestination);

    if (clearSelectionBtn) {
        clearSelectionBtn.addEventListener("click", () => {
            countrySelect.value = "";

            updateCountryDropdownLabel();

            // Invalidate any pending city request.
            cityRequestId++;

            citySelect.innerHTML =
                '<option value="">Select a country first</option>';

            citySelect.disabled = true;

            holidaysCount.textContent = "--";

            resetDestinationDisplay();
        });
    }
}

// ==================== INITIALIZE DASHBOARD ====================

export async function initializeDashboard() {
    if (!countrySelect || !citySelect || !yearSelect || !exploreBtn) {
        console.error("Dashboard elements could not be found.");

        return;
    }

    resetDestinationDisplay();

    setupDashboardEvents();

    await loadCountries();
}
