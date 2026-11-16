// ==================== WANDERLUST - SUN TIMES ====================

import { ApiService } from "../api/api.js";
import { escapeHTML } from "../utils/helpers.js";
import { showMessage, updateHeaderSelection } from "../utils/ui.js";

const GEOCODING_API = "https://geocoding-api.open-meteo.com/v1/search";
const SUN_TIMES_API = "https://api.sunrise-sunset.org/json";

const countrySelect = document.getElementById("global-country");
const citySelect = document.getElementById("global-city");
const sunTimesContent = document.getElementById("sun-times-content");
const sunTimesSelection = document.querySelector("#sun-times-view .view-header-selection");

let currentRequestId = 0;

const ICONS = {
    dawn: '<i class="fa-solid fa-moon"></i>',
    sunrise: '<i class="fa-solid fa-sun"></i>',
    noon: '<i class="fa-solid fa-sun"></i>',
    sunset: '<i class="fa-solid fa-sun"></i>',
    dusk: '<i class="fa-solid fa-moon"></i>',
    daylight: '<i class="fa-solid fa-hourglass-half"></i>'
};

function renderMessage(message, type = "info") {
    if (!sunTimesContent) return;

    const icon = type === "error" ? "fa-circle-exclamation" : "fa-circle-info";

    sunTimesContent.innerHTML = `
        <div class="sun-main-card">
            <div class="sun-info-message ${type}">
                <i class="fa-solid ${icon}"></i>
                <span>${escapeHTML(message)}</span>
            </div>
        </div>
    `;
}

function getDestinationDate(timeZone) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(new Date());

    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
}

function formatTime(isoDate, timeZone) {
    return new Intl.DateTimeFormat("en-US", {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    }).format(new Date(isoDate));
}

function formatDuration(totalSeconds) {
    const totalMinutes = Math.round(Number(totalSeconds) / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

function formatDestinationDate(date, timeZone) {
    return new Intl.DateTimeFormat("en-US", {
        timeZone: "UTC",
        month: "long",
        day: "numeric",
        year: "numeric"
    }).format(new Date(`${date}T12:00:00Z`));
}

function formatDestinationDay(date, timeZone) {
    return new Intl.DateTimeFormat("en-US", {
        timeZone: "UTC",
        weekday: "long"
    }).format(new Date(`${date}T12:00:00Z`));
}

async function fetchCityCoordinates(city, countryCode) {
    const params = new URLSearchParams({
        name: city,
        count: "10",
        language: "en",
        format: "json"
    });

    if (countryCode) params.set("countryCode", countryCode.toUpperCase());

    const data = await ApiService.get(`${GEOCODING_API}?${params}`);
    const results = data?.results || [];

    if (!results.length) {
        throw new Error(`Couldn't find coordinates for ${city}.`);
    }

    const normalizedCity = city.trim().toLowerCase();
    const match = results.find(item => item.name?.trim().toLowerCase() === normalizedCity) || results[0];

    if (typeof match.latitude !== "number" || typeof match.longitude !== "number") {
        throw new Error("The selected city doesn't have valid coordinates.");
    }

    return {
        latitude: match.latitude,
        longitude: match.longitude,
        timeZone: match.timezone || "UTC",
        locationName: match.name || city
    };
}

async function fetchSunTimes(latitude, longitude, date) {
    const params = new URLSearchParams({
        lat: String(latitude),
        lng: String(longitude),
        date,
        formatted: "0"
    });

    const data = await ApiService.get(`${SUN_TIMES_API}?${params}`);

    if (data?.status !== "OK" || !data.results) {
        throw new Error("Sunrise-Sunset service couldn't return data for this location.");
    }

    return data.results;
}

function renderSunTimes({ countryName, city, date, timeZone, sunData }) {
    const dawn = formatTime(sunData.civil_twilight_begin, timeZone);
    const sunrise = formatTime(sunData.sunrise, timeZone);
    const solarNoon = formatTime(sunData.solar_noon, timeZone);
    const sunset = formatTime(sunData.sunset, timeZone);
    const dusk = formatTime(sunData.civil_twilight_end, timeZone);
    const daylightSeconds = Number(sunData.day_length);
    const daylight = formatDuration(daylightSeconds);
    const darkness = formatDuration(Math.max(0, 86400 - daylightSeconds));
    const daylightPercentage = Math.min(100, Math.max(0, (daylightSeconds / 86400) * 100));
    const dateLabel = formatDestinationDate(date, timeZone);
    const dayLabel = formatDestinationDay(date, timeZone);

    const timeCards = [
        { key: "dawn", label: "Dawn", time: dawn, subLabel: "Civil Twilight", className: "dawn" },
        { key: "sunrise", label: "Sunrise", time: sunrise, subLabel: "Golden Hour Start", className: "sunrise" },
        { key: "noon", label: "Solar Noon", time: solarNoon, subLabel: "Sun at Highest", className: "noon" },
        { key: "sunset", label: "Sunset", time: sunset, subLabel: "Golden Hour End", className: "sunset" },
        { key: "dusk", label: "Dusk", time: dusk, subLabel: "Civil Twilight", className: "dusk" },
        { key: "daylight", label: "Day Length", time: daylight, subLabel: "Total Daylight", className: "daylight" }
    ];

    sunTimesContent.innerHTML = `
        <div class="sun-main-card">
            <div class="sun-main-header">
                <div class="sun-location">
                    <h2><i class="fa-solid fa-location-dot"></i> ${escapeHTML(city)}</h2>
                    <p>Sun times for your selected location</p>
                </div>
                <div class="sun-date-display">
                    <div class="date">${escapeHTML(dateLabel)}</div>
                    <div class="day">${escapeHTML(dayLabel)}</div>
                </div>
            </div>

            <div class="sun-times-grid">
                ${timeCards.map(card => `
                    <div class="sun-time-card ${card.className}">
                        <div class="icon">${ICONS[card.key]}</div>
                        <div class="label">${card.label}</div>
                        <div class="time">${escapeHTML(card.time)}</div>
                        <div class="sub-label">${card.subLabel}</div>
                    </div>
                `).join("")}
            </div>
        </div>

        <div class="day-length-card">
            <h3><i class="fa-solid fa-chart-pie"></i> Daylight Distribution</h3>
            <div class="day-progress">
                <div class="day-progress-bar">
                    <div class="day-progress-fill" style="width: ${daylightPercentage.toFixed(2)}%"></div>
                </div>
            </div>
            <div class="day-length-stats">
                <div class="day-stat">
                    <div class="value">${daylight}</div>
                    <div class="label">Daylight</div>
                </div>
                <div class="day-stat">
                    <div class="value">${daylightPercentage.toFixed(1)}%</div>
                    <div class="label">of 24 Hours</div>
                </div>
                <div class="day-stat">
                    <div class="value">${darkness}</div>
                    <div class="label">Darkness</div>
                </div>
            </div>
        </div>
    `;
}

async function loadSunTimes() {
    const selection = updateHeaderSelection(
        sunTimesSelection,
        "Select a country and city from Dashboard"
    );

    const requestId = ++currentRequestId;

    if (!selection.hasCity) {
        renderMessage("Select a country and city from Dashboard to view sunrise and sunset times.");
        return;
    }

    renderMessage("Loading sun times for your selected location...");

    try {
        const coordinates = await fetchCityCoordinates(selection.city, selection.countryCode);
        const date = getDestinationDate(coordinates.timeZone);
        const sunData = await fetchSunTimes(coordinates.latitude, coordinates.longitude, date);

        if (requestId !== currentRequestId) return;

        renderSunTimes({
            countryName: selection.countryName,
            city: coordinates.locationName,
            date,
            timeZone: coordinates.timeZone,
            sunData
        });
    } catch (error) {
        if (requestId !== currentRequestId) return;
        console.error("Sun Times Error:", error);
        renderMessage(error.message || "Unable to load sun times. Please try again.", "error");
        showMessage(error.message || "Unable to load sun times.", "error");
    }
}

export function initializeSunTimes() {
    if (!sunTimesContent || !countrySelect || !citySelect) {
        console.warn("Sun Times elements were not found in the page.");
        return;
    }

    countrySelect.addEventListener("change", loadSunTimes);
    citySelect.addEventListener("change", loadSunTimes);

    loadSunTimes();
}
