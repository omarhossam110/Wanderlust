
 // ==================== WANDERLUST - WEATHER ====================

import { ApiService } from "../api/api.js";
import { escapeHTML } from "../utils/helpers.js";
import { showMessage, updateHeaderSelection } from "../utils/ui.js";

// ==================== CONFIGURATION ====================

const GEOCODING_API =
    "https://geocoding-api.open-meteo.com/v1/search";

const WEATHER_API =
    "https://api.open-meteo.com/v1/forecast";

// ==================== DOM ELEMENTS ====================

const countrySelect = document.getElementById("global-country");
const citySelect = document.getElementById("global-city");

const weatherContent = document.getElementById("weather-content");

const weatherSelection = document.querySelector(
    "#weather-view .view-header-selection"
);

// ==================== STATE ====================

let currentCountryCode = "";
let currentCountryName = "";
let currentCity = "";

let requestId = 0;

// ==================== WEATHER CONDITIONS ====================

function getWeatherCondition(code, isDay = true) {
    const conditions = {
        0: {
            name: "Clear sky",
            icon: isDay ? "fa-sun" : "fa-moon",
            theme: "weather-sunny"
        },

        1: {
            name: "Mainly clear",
            icon: isDay ? "fa-sun" : "fa-moon",
            theme: "weather-sunny"
        },

        2: {
            name: "Partly cloudy",
            icon: "fa-cloud-sun",
            theme: "weather-cloudy"
        },

        3: {
            name: "Overcast",
            icon: "fa-cloud",
            theme: "weather-cloudy"
        },

        45: {
            name: "Fog",
            icon: "fa-smog",
            theme: "weather-foggy"
        },

        48: {
            name: "Depositing rime fog",
            icon: "fa-smog",
            theme: "weather-foggy"
        },

        51: {
            name: "Light drizzle",
            icon: "fa-cloud-rain",
            theme: "weather-rainy"
        },

        53: {
            name: "Moderate drizzle",
            icon: "fa-cloud-rain",
            theme: "weather-rainy"
        },

        55: {
            name: "Dense drizzle",
            icon: "fa-cloud-showers-heavy",
            theme: "weather-rainy"
        },

        56: {
            name: "Freezing drizzle",
            icon: "fa-cloud-rain",
            theme: "weather-rainy"
        },

        57: {
            name: "Dense freezing drizzle",
            icon: "fa-cloud-showers-heavy",
            theme: "weather-rainy"
        },

        61: {
            name: "Slight rain",
            icon: "fa-cloud-rain",
            theme: "weather-rainy"
        },

        63: {
            name: "Moderate rain",
            icon: "fa-cloud-showers-heavy",
            theme: "weather-rainy"
        },

        65: {
            name: "Heavy rain",
            icon: "fa-cloud-showers-heavy",
            theme: "weather-rainy"
        },

        66: {
            name: "Freezing rain",
            icon: "fa-cloud-rain",
            theme: "weather-rainy"
        },

        67: {
            name: "Heavy freezing rain",
            icon: "fa-cloud-showers-heavy",
            theme: "weather-rainy"
        },

        71: {
            name: "Slight snowfall",
            icon: "fa-snowflake",
            theme: "weather-snowy"
        },

        73: {
            name: "Moderate snowfall",
            icon: "fa-snowflake",
            theme: "weather-snowy"
        },

        75: {
            name: "Heavy snowfall",
            icon: "fa-snowflake",
            theme: "weather-snowy"
        },

        77: {
            name: "Snow grains",
            icon: "fa-snowflake",
            theme: "weather-snowy"
        },

        80: {
            name: "Slight rain showers",
            icon: "fa-cloud-showers-heavy",
            theme: "weather-rainy"
        },

        81: {
            name: "Moderate rain showers",
            icon: "fa-cloud-showers-heavy",
            theme: "weather-rainy"
        },

        82: {
            name: "Violent rain showers",
            icon: "fa-cloud-showers-heavy",
            theme: "weather-rainy"
        },

        85: {
            name: "Slight snow showers",
            icon: "fa-snowflake",
            theme: "weather-snowy"
        },

        86: {
            name: "Heavy snow showers",
            icon: "fa-snowflake",
            theme: "weather-snowy"
        },

        95: {
            name: "Thunderstorm",
            icon: "fa-cloud-bolt",
            theme: "weather-stormy"
        },

        96: {
            name: "Thunderstorm with hail",
            icon: "fa-cloud-bolt",
            theme: "weather-stormy"
        },

        99: {
            name: "Thunderstorm with heavy hail",
            icon: "fa-cloud-bolt",
            theme: "weather-stormy"
        }
    };

    return conditions[code] || {
        name: "Unknown conditions",
        icon: "fa-cloud",
        theme: "weather-cloudy"
    };
}

// ==================== FORMATTING HELPERS ====================

function formatTemperature(value) {
    return Number.isFinite(value)
        ? Math.round(value)
        : "--";
}

function formatDate(dateString, options = {}) {
    const [year, month, day] = dateString.split("-").map(Number);

    const date = new Date(year, month - 1, day);

    return date.toLocaleDateString("en-US", options);
}

function formatTime(timeString) {
    if (!timeString) return "--";

    const time = timeString.split("T")[1];

    if (!time) return "--";

    const [hours, minutes] = time.split(":").map(Number);

    const date = new Date();

    date.setHours(hours, minutes, 0, 0);

    return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true
    });
}

function getCurrentHourIndex(hourlyTimes, currentTime) {
    if (!Array.isArray(hourlyTimes) || !hourlyTimes.length) {
        return 0;
    }

    const index = hourlyTimes.findIndex(time => {
        return time >= currentTime;
    });

    return index === -1 ? 0 : index;
}

// ==================== CITY GEOCODING ====================

async function getCityCoordinates(city, countryCode) {
    const params = new URLSearchParams({
        name: city,
        count: "10",
        language: "en",
        format: "json",
        countryCode
    });

    const response = await ApiService.get(
        `${GEOCODING_API}?${params}`
    );

    const results = response.results || [];

    const countryResults = results.filter(result => {
        return result.country_code?.toUpperCase() ===
            countryCode.toUpperCase();
    });

    if (!countryResults.length) {
        throw new Error(
            `Could not find ${city} in the selected country.`
        );
    }

    const exactMatch = countryResults.find(result => {
        return result.name.toLowerCase() === city.toLowerCase();
    });

    const selectedCity = exactMatch || countryResults[0];

    return {
        latitude: selectedCity.latitude,
        longitude: selectedCity.longitude,
        timezone: selectedCity.timezone || "auto"
    };
}


// ==================== UPDATE SELECTION ====================

function updateWeatherSelection() {
    const selection = updateHeaderSelection(
        weatherSelection,
        "Select a country and city from Dashboard"
    );

    currentCountryCode = selection.countryCode;
    currentCountryName = selection.countryName;
    currentCity = selection.city;

    // Weather requires both country and city.
    return selection.hasCity;
}
// ==================== LOADING AND ERROR STATES ====================

function showLoadingState() {
    weatherContent.innerHTML = `
        <div class="holidays-empty-state">
            <i class="fa-solid fa-spinner fa-spin"></i>

            <h3>Loading Weather...</h3>

            <p>
                Getting the latest weather forecast for
                ${escapeHTML(currentCity)}.
            </p>
        </div>
    `;
}

function showErrorState(message) {
    weatherContent.innerHTML = `
        <div class="holidays-empty-state">
            <i class="fa-solid fa-triangle-exclamation"></i>

            <h3>Unable to Load Weather</h3>

            <p>${escapeHTML(message)}</p>
        </div>
    `;
}

// ==================== CURRENT WEATHER ====================

function renderCurrentWeather(weather) {
    const current = weather.current;
    const today = weather.daily;

    const condition = getWeatherCondition(
        current.weather_code,
        current.is_day === 1
    );

    const currentDate = current.time.split("T")[0];

    const formattedDate = formatDate(currentDate, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric"
    });

    const temperature = formatTemperature(
        current.temperature_2m
    );

    const feelsLike = formatTemperature(
        current.apparent_temperature
    );

    const maxTemperature = formatTemperature(
        today.temperature_2m_max[0]
    );

    const minTemperature = formatTemperature(
        today.temperature_2m_min[0]
    );

    return `
        <div class="weather-hero-card ${condition.theme}">

            <div class="weather-location">
                <i class="fa-solid fa-location-dot"></i>

                <span>${escapeHTML(currentCity)}</span>

                <span class="weather-time">
                    ${formattedDate}
                </span>
            </div>

            <div class="weather-hero-main">

                <div class="weather-hero-left">

                    <div class="weather-hero-icon">
                        <i class="fa-solid ${condition.icon}"></i>
                    </div>

                    <div class="weather-hero-temp">
                        <span class="temp-value">${temperature}</span>
                        <span class="temp-unit">°C</span>
                    </div>

                </div>

                <div class="weather-hero-right">

                    <div class="weather-condition">
                        ${condition.name}
                    </div>

                    <div class="weather-feels">
                        Feels like ${feelsLike}°C
                    </div>

                    <div class="weather-high-low">

                        <span class="high">
                            <i class="fa-solid fa-arrow-up"></i>
                            ${maxTemperature}°
                        </span>

                        <span class="low">
                            <i class="fa-solid fa-arrow-down"></i>
                            ${minTemperature}°
                        </span>

                    </div>

                </div>

            </div>

        </div>
    `;
}

// ==================== WEATHER DETAILS ====================

function renderWeatherDetails(weather) {
    const current = weather.current;
    const daily = weather.daily;

    const humidity = Math.round(
        current.relative_humidity_2m ?? 0
    );

    const wind = Math.round(
        current.wind_speed_10m ?? 0
    );

    const uvIndex = Number(
        current.uv_index ?? 0
    ).toFixed(1);

    const precipitation = Math.round(
        daily.precipitation_probability_max?.[0] ?? 0
    );

    return `
        <div class="weather-details-grid">

            <div class="weather-detail-card">
                <div class="detail-icon humidity">
                    <i class="fa-solid fa-droplet"></i>
                </div>

                <div class="detail-info">
                    <span class="detail-label">Humidity</span>
                    <span class="detail-value">${humidity}%</span>
                </div>
            </div>

            <div class="weather-detail-card">
                <div class="detail-icon wind">
                    <i class="fa-solid fa-wind"></i>
                </div>

                <div class="detail-info">
                    <span class="detail-label">Wind</span>
                    <span class="detail-value">${wind} km/h</span>
                </div>
            </div>

            <div class="weather-detail-card">
                <div class="detail-icon uv">
                    <i class="fa-solid fa-sun"></i>
                </div>

                <div class="detail-info">
                    <span class="detail-label">UV Index</span>
                    <span class="detail-value">${uvIndex}</span>
                </div>
            </div>

            <div class="weather-detail-card">
                <div class="detail-icon precip">
                    <i class="fa-solid fa-cloud-rain"></i>
                </div>

                <div class="detail-info">
                    <span class="detail-label">Precipitation</span>
                    <span class="detail-value">${precipitation}%</span>
                </div>
            </div>

        </div>
    `;
}

// ==================== HOURLY FORECAST ====================

function renderHourlyForecast(weather) {
    const hourly = weather.hourly;
    const current = weather.current;

    const startIndex = getCurrentHourIndex(
        hourly.time,
        current.time
    );

    const hourlyItems = hourly.time.slice(
        startIndex,
        startIndex + 8
    );

    if (!hourlyItems.length) {
        return "";
    }

    return `
        <div class="weather-section">

            <h3 class="weather-section-title">
                <i class="fa-solid fa-clock"></i>
                Hourly Forecast
            </h3>

            <div class="hourly-scroll">

                ${hourlyItems.map((time, index) => {
                    const dataIndex = startIndex + index;

                    const condition = getWeatherCondition(
                        hourly.weather_code[dataIndex]
                    );

                    const temperature = formatTemperature(
                        hourly.temperature_2m[dataIndex]
                    );

                    const timeLabel = index === 0
                        ? "Now"
                        : formatTime(time);

                    return `
                        <div class="hourly-item ${index === 0 ? "now" : ""}">

                            <span class="hourly-time">
                                ${timeLabel}
                            </span>

                            <div class="hourly-icon">
                                <i class="fa-solid ${condition.icon}"></i>
                            </div>

                            <span class="hourly-temp">
                                ${temperature}°
                            </span>

                        </div>
                    `;
                }).join("")}

            </div>

        </div>
    `;
}

// ==================== 7-DAY FORECAST ====================

function renderDailyForecast(weather) {
    const daily = weather.daily;

    return `
        <div class="weather-section">

            <h3 class="weather-section-title">
                <i class="fa-solid fa-calendar-week"></i>
                7-Day Forecast
            </h3>

            <div class="forecast-list">

                ${daily.time.map((date, index) => {
                    const condition = getWeatherCondition(
                        daily.weather_code[index]
                    );

                    const dayLabel = index === 0
                        ? "Today"
                        : formatDate(date, {
                            weekday: "short"
                        });

                    const dayDate = formatDate(date, {
                        day: "numeric",
                        month: "short"
                    });

                    const maxTemperature = formatTemperature(
                        daily.temperature_2m_max[index]
                    );

                    const minTemperature = formatTemperature(
                        daily.temperature_2m_min[index]
                    );

                    const precipitation = Math.round(
                        daily.precipitation_probability_max[index] ?? 0
                    );

                    return `
                        <div class="forecast-day ${index === 0 ? "today" : ""}">

                            <div class="forecast-day-name">
                                <span class="day-label">
                                    ${dayLabel}
                                </span>

                                <span class="day-date">
                                    ${dayDate}
                                </span>
                            </div>

                            <div class="forecast-icon">
                                <i class="fa-solid ${condition.icon}"></i>
                            </div>

                            <div class="forecast-temps">
                                <span class="temp-max">
                                    ${maxTemperature}°
                                </span>

                                <span class="temp-min">
                                    ${minTemperature}°
                                </span>
                            </div>

                            <div class="forecast-precip">
                                ${
                                    precipitation > 0
                                        ? `
                                            <i class="fa-solid fa-droplet"></i>
                                            <span>${precipitation}%</span>
                                        `
                                        : ""
                                }
                            </div>

                        </div>
                    `;
                }).join("")}

            </div>

        </div>
    `;
}

// ==================== RENDER WEATHER ====================

function renderWeather(weather) {
    weatherContent.innerHTML = `
        ${renderCurrentWeather(weather)}

        ${renderWeatherDetails(weather)}

        ${renderHourlyForecast(weather)}

        ${renderDailyForecast(weather)}
    `;
}

// ==================== LOAD WEATHER ====================

async function loadWeather() {
    const selectedRequestId = ++requestId;

    if (!updateWeatherSelection()) {
        weatherContent.innerHTML = `
            <div class="holidays-empty-state">
                <i class="fa-solid fa-cloud-sun"></i>

                <h3>Explore Weather</h3>

                <p>
                    Select a country and city from Dashboard
                    to view the weather forecast.
                </p>
            </div>
        `;

        return;
    }

    const city = currentCity;
    const countryCode = currentCountryCode;

    showLoadingState();

    try {
        // Get city coordinates first.
        const coordinates = await getCityCoordinates(
            city,
            countryCode
        );

        if (selectedRequestId !== requestId) return;

        // Request current, hourly, and daily weather data.
        const params = new URLSearchParams({
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,

            current: [
                "temperature_2m",
                "relative_humidity_2m",
                "apparent_temperature",
                "is_day",
                "precipitation",
                "weather_code",
                "wind_speed_10m",
                "uv_index"
            ].join(","),

            hourly: [
                "temperature_2m",
                "weather_code",
                "precipitation_probability"
            ].join(","),

            daily: [
                "weather_code",
                "temperature_2m_max",
                "temperature_2m_min",
                "precipitation_probability_max"
            ].join(","),

            timezone: coordinates.timezone,
            forecast_days: "7",
            temperature_unit: "celsius",
            wind_speed_unit: "kmh"
        });

        const weather = await ApiService.get(
            `${WEATHER_API}?${params}`
        );

        if (selectedRequestId !== requestId) return;

        if (!weather.current || !weather.daily || !weather.hourly) {
            throw new Error("Weather data is incomplete.");
        }

        renderWeather(weather);

    } catch (error) {
        if (selectedRequestId !== requestId) return;

        console.error("Could not load weather:", error);

        showErrorState(
            error.message.includes("Could not find")
                ? error.message
                : "Could not fetch the weather forecast. Please check your connection and try again."
        );

        showMessage(
            "Could not load weather. Please try again."
        );
    }
}

// ==================== EVENT LISTENERS ====================

function setupWeatherEvents() {
    countrySelect.addEventListener("change", loadWeather);
    citySelect.addEventListener("change", loadWeather);
}

// ==================== INITIALIZE WEATHER ====================

export function initializeWeather() {
    if (
        !countrySelect ||
        !citySelect ||
        !weatherContent ||
        !weatherSelection
    ) {
        console.error("Weather elements could not be found.");
        return;
    }

    setupWeatherEvents();

    loadWeather();
}
