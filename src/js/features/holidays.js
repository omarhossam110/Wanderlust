
// ==================== WANDERLUST - HOLIDAYS ====================

import { ApiService } from "../api/api.js";
import { escapeHTML } from "../utils/helpers.js";
import { showMessage } from "../utils/ui.js";

// ==================== CONFIGURATION ====================

const NAGER_API = "https://date.nager.at/api/v3";
const STORAGE_KEY = "wanderlust-plans";

// ==================== DOM ELEMENTS ====================

const countrySelect = document.getElementById("global-country");
const yearSelect = document.getElementById("global-year");

const holidaysSelection = document.getElementById("holidays-selection");
const holidaysContent = document.getElementById("holidays-content");

// ==================== STATE ====================

let currentHolidays = [];
let currentCountryCode = "";
let currentCountryName = "";
let currentYear = "";
let requestId = 0;

// ==================== STORAGE ====================

function getSavedPlans() {
    try {
        const savedPlans = JSON.parse(
            localStorage.getItem(STORAGE_KEY)
        );

        return Array.isArray(savedPlans) ? savedPlans : [];

    } catch (error) {
        console.error("Could not read saved plans:", error);
        return [];
    }
}

function savePlans(plans) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
        window.dispatchEvent(new CustomEvent("wanderlust:plans-updated"));
        return true;

    } catch (error) {
        console.error("Could not save plans:", error);
        showMessage("Could not save this holiday. Please try again.");

        return false;
    }
}

function createHolidayId(holiday, countryCode) {
    return `${countryCode}-${holiday.date}-${holiday.name}`
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-");
}

function isHolidaySaved(holidayId) {
    return getSavedPlans().some(plan => plan.id === holidayId);
}

function toggleSavedHoliday(holiday) {
    const plans = getSavedPlans();

    const holidayId = createHolidayId(
        holiday,
        currentCountryCode
    );

    const existingPlanIndex = plans.findIndex(
        plan => plan.id === holidayId
    );

    if (existingPlanIndex !== -1) {
        plans.splice(existingPlanIndex, 1);

        if (!savePlans(plans)) return;

        showMessage("Holiday removed from My Plans.", "success");

    } else {
        const savedHoliday = {
            id: holidayId,
            type: "holiday",
            title: holiday.localName || holiday.name,
            name: holiday.name,
            localName: holiday.localName,
            date: holiday.date,
            countryCode: currentCountryCode,
            countryName: currentCountryName,
            year: currentYear,
            holidayTypes: holiday.types || [],
            savedAt: new Date().toISOString()
        };

        plans.push(savedHoliday);

        if (!savePlans(plans)) return;

        showMessage("Holiday added to My Plans.", "success");
    }

    renderHolidays(currentHolidays);
}

// ==================== HOLIDAY SELECTION ====================

function updateHolidaySelection() {
    const countryCode = countrySelect.value;
    const countryName = countrySelect.selectedOptions[0]?.textContent;
    const year = yearSelect.value;

    if (!countryCode || !year) {
        holidaysSelection.innerHTML = `
            <div class="current-selection-badge">
                <span>Select a country and year from Dashboard</span>
            </div>
        `;

        return false;
    }

    const flag = `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;

    holidaysSelection.innerHTML = `
        <div class="current-selection-badge">
            <img
                src="${flag}"
                alt="${escapeHTML(countryName)}"
                class="selection-flag"
            >
            <span>${escapeHTML(countryName)}</span>
            <span class="selection-year">${escapeHTML(year)}</span>
        </div>
    `;

    currentCountryCode = countryCode;
    currentCountryName = countryName;
    currentYear = year;

    return true;
}

// ==================== HOLIDAY DATE FORMATTING ====================

function getHolidayDate(dateString) {
    const [year, month, day] = dateString.split("-").map(Number);

    const date = new Date(year, month - 1, day);

    return {
        day,
        month: date.toLocaleDateString("en-US", {
            month: "short"
        }),
        weekday: date.toLocaleDateString("en-US", {
            weekday: "long"
        })
    };
}

function getHolidayType(types) {
    if (!Array.isArray(types) || types.length === 0) {
        return "Public";
    }

    return types.includes("Public")
        ? "Public"
        : types.join(", ");
}

// ==================== RENDER HOLIDAYS ====================

function renderHolidays(holidays) {


    if (!holidaysContent) return;


    if (!holidays.length) {
        holidaysContent.innerHTML = `
            <div class="holidays-empty-state">
                <i class="fa-regular fa-calendar-xmark"></i>
                <h3>No Holidays Found</h3>
                <p>No public holidays are available for this selection.</p>
            </div>
        `;

        return;
    }

    const savedPlans = getSavedPlans();

    holidaysContent.innerHTML = holidays.map(holiday => {
        const date = getHolidayDate(holiday.date);

        const holidayId = createHolidayId(
            holiday,
            currentCountryCode
        );

        const isSaved = savedPlans.some(
            plan => plan.id === holidayId
        );

        const holidayName = holiday.localName || holiday.name;
        const holidayType = getHolidayType(holiday.types);

        return `
            <div class="holiday-card">
                <div class="holiday-card-header">
                    <div class="holiday-date-box">
                        <span class="day">${date.day}</span>
                        <span class="month">${date.month}</span>
                    </div>

                    <button
                        class="holiday-action-btn ${isSaved ? "is-saved" : ""}"
                        type="button"
                        data-holiday-id="${escapeHTML(holidayId)}"
                        aria-label="${isSaved ? "Remove from" : "Add to"} My Plans"
                        aria-pressed="${isSaved}"
                    >
                        <i class="${isSaved ? "fa-solid" : "fa-regular"} fa-heart"></i>
                    </button>
                </div>

                <h3>${escapeHTML(holidayName)}</h3>

                <p class="holiday-name">${escapeHTML(holiday.name)}</p>

                <div class="holiday-card-footer">
                    <span class="holiday-day-badge">
                        <i class="fa-regular fa-calendar"></i>
                        ${date.weekday}
                    </span>

                    <span class="holiday-type-badge">
                        ${escapeHTML(holidayType)}
                    </span>
                </div>
            </div>
        `;
    }).join("");

}

// ==================== LOAD HOLIDAYS ====================

async function loadHolidays() {

    const selectedRequestId = ++requestId;
    if (!updateHolidaySelection()) {
        holidaysContent.innerHTML = `
            <div class="holidays-empty-state">
                <i class="fa-regular fa-calendar"></i>
                <h3>Explore Public Holidays</h3>
                <p>Select a country and year from the Dashboard to view its public holidays.</p>
            </div>
        `;

        currentHolidays = [];

        return;
    }


    const countryCode = currentCountryCode;
    const year = currentYear;

    holidaysContent.innerHTML = `
        <div class="holidays-empty-state">
            <i class="fa-solid fa-spinner fa-spin"></i>
            <h3>Loading Holidays...</h3>
            <p>Fetching public holidays for ${escapeHTML(currentCountryName)}.</p>
        </div>
    `;

    try {
        const holidays = await ApiService.get(
            `${NAGER_API}/PublicHolidays/${year}/${countryCode}`
        );

        // Ignore outdated responses if the selection has changed.
        if (selectedRequestId !== requestId) return;

        currentHolidays = Array.isArray(holidays)
            ? holidays.sort((a, b) => a.date.localeCompare(b.date))
            : [];

        renderHolidays(currentHolidays);

    } catch (error) {
        if (selectedRequestId !== requestId) return;

        console.error("Could not load holidays:", error);

        currentHolidays = [];

        holidaysContent.innerHTML = `
            <div class="holidays-empty-state">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <h3>Unable to Load Holidays</h3>
                <p>Please check your connection and try again.</p>
            </div>
        `;

        showMessage("Could not load public holidays. Please try again.");
    }
}

// ==================== EVENT LISTENERS ====================

function setupHolidayEvents() {
    countrySelect.addEventListener("change", loadHolidays);
    yearSelect.addEventListener("change", loadHolidays);



    holidaysContent.addEventListener("click", event => {
        const saveButton = event.target.closest(".holiday-action-btn");

        if (!saveButton) return;

        const holiday = currentHolidays.find(item => {
            return createHolidayId(item, currentCountryCode) ===
                saveButton.dataset.holidayId;
        });

        if (!holiday) return;

        toggleSavedHoliday(holiday);
    });
}

// ==================== INITIALIZE HOLIDAYS ====================

export function initializeHolidays() {
    if (!countrySelect || !yearSelect || !holidaysContent || !holidaysSelection) {
        console.error("Holidays elements could not be found.");
        return;
    }

    setupHolidayEvents();

    loadHolidays();
}
