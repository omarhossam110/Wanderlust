// ==================== WANDERLUST - LONG WEEKENDS ====================

import { ApiService } from "../api/api.js";
import { escapeHTML } from "../utils/helpers.js";
import { showMessage, updateHeaderSelection } from "../utils/ui.js";

// ==================== CONFIGURATION ====================

const NAGER_DATE_API = "https://date.nager.at/api/v3";
const STORAGE_KEY = "wanderlust-plans";

// ==================== DOM ELEMENTS ====================

const countrySelect = document.getElementById("global-country");
const yearSelect = document.getElementById("global-year");
const citySelect = document.getElementById("global-city");
const longWeekendsContent = document.getElementById("lw-content");
const longWeekendsSelection = document.querySelector(
    "#long-weekends-view .view-header-selection"
);

// ==================== STATE ====================

let currentCountryCode = "";
let currentCountryName = "";
let currentYear = "";
let longWeekendsRequestId = 0;
let currentLongWeekends = [];
let isInitialized = false;

// ==================== DATE HELPERS ====================

function parseLocalDate(dateString) {
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(year, month - 1, day);
}

function formatDate(dateString, options = {}) {
    return parseLocalDate(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        ...options
    });
}

function getDateRange(startDate, endDate) {
    return `${formatDate(startDate, { year: undefined })} - ${formatDate(endDate)}`;
}

function getDatesBetween(startDate, endDate) {
    const dates = [];
    const currentDate = parseLocalDate(startDate);
    const lastDate = parseLocalDate(endDate);

    while (currentDate <= lastDate) {
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, "0");
        const day = String(currentDate.getDate()).padStart(2, "0");

        dates.push(`${year}-${month}-${day}`);
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
}

function getDayName(dateString) {
    return parseLocalDate(dateString).toLocaleDateString("en-US", {
        weekday: "short"
    });
}

function getDayNumber(dateString) {
    return parseLocalDate(dateString).getDate();
}

// ==================== HEADER ====================

function updateLongWeekendsHeader() {
    const selection = updateHeaderSelection(
        longWeekendsSelection,
        "Select a country and year from Dashboard"
    );

    currentCountryCode = selection.countryCode;
    currentCountryName = selection.countryName;
    currentYear = yearSelect?.value || "";

    const badge = longWeekendsSelection?.querySelector(
        ".current-selection-badge"
    );

    if (badge && selection.hasCountry && currentYear) {
        const yearElement = document.createElement("span");
        yearElement.className = "selection-year";
        yearElement.textContent = currentYear;
        badge.appendChild(yearElement);
    }

    return selection.hasCountry && Boolean(currentYear);
}

// ==================== LOCAL STORAGE ====================

function getSavedPlans() {
    try {
        const savedPlans = JSON.parse(localStorage.getItem(STORAGE_KEY));
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
        showMessage("Could not save this plan. Please try again.");
        return false;
    }
}

function createPlanId(weekend) {
    return `long-weekend-${currentCountryCode}-${currentYear}-${weekend.startDate}`;
}

function isWeekendSaved(weekend) {
    const planId = createPlanId(weekend);
    return getSavedPlans().some(plan => plan.id === planId);
}

function toggleSavedWeekend(weekend) {
    const plans = getSavedPlans();
    const planId = createPlanId(weekend);
    const existingIndex = plans.findIndex(plan => plan.id === planId);

    if (existingIndex !== -1) {
        plans.splice(existingIndex, 1);

        if (savePlans(plans)) {
            showMessage("Long weekend removed from My Plans.", "success");
            renderLongWeekends(currentLongWeekends);
        }

        return;
    }

    const savedPlan = {
        id: planId,
        type: "long-weekend",
        title: `Long Weekend: ${formatDate(weekend.startDate)} - ${formatDate(weekend.endDate)}`,
        startDate: weekend.startDate,
        endDate: weekend.endDate,
        date: weekend.startDate,
        dayCount: weekend.dayCount,
        needBridgeDay: weekend.needBridgeDay,
        bridgeDays: weekend.bridgeDays || [],
        countryCode: currentCountryCode,
        countryName: currentCountryName,
        year: Number(currentYear),
        savedAt: new Date().toISOString()
    };

    plans.push(savedPlan);

    if (savePlans(plans)) {
        showMessage("Long weekend saved to My Plans!", "success");
        renderLongWeekends(currentLongWeekends);
    }
}

// ==================== RENDERING ====================

function renderLoadingState() {
    longWeekendsContent.innerHTML = `
        <div class="lw-empty-state">
            <i class="fa-solid fa-spinner fa-spin"></i>
            <h3>Finding Long Weekends...</h3>
            <p>Please wait while we check the holidays calendar.</p>
        </div>
    `;
}

function renderEmptyState(message) {
    longWeekendsContent.innerHTML = `
        <div class="lw-empty-state">
            <i class="fa-regular fa-calendar-xmark"></i>
            <h3>No Long Weekends Found</h3>
            <p>${escapeHTML(message)}</p>
        </div>
    `;
}

function renderDaysVisual(weekend) {
    const dates = getDatesBetween(weekend.startDate, weekend.endDate);

    return dates.map(date => `
        <div class="lw-day">
            <span class="name">${escapeHTML(getDayName(date))}</span>
            <span class="num">${getDayNumber(date)}</span>
        </div>
    `).join("");
}

function renderWeekendMessage(weekend) {
    const bridgeDays = Array.isArray(weekend.bridgeDays)
        ? weekend.bridgeDays
        : [];

    if (!weekend.needBridgeDay) {
        return `
            <div class="lw-info-box success">
                <i class="fa-solid fa-check-circle"></i>
                No extra days off needed!
            </div>
        `;
    }

    const bridgeDates = bridgeDays.length
        ? bridgeDays.map(date => formatDate(date)).join(", ")
        : "one bridge day";

    return `
        <div class="lw-info-box warning">
            <i class="fa-solid fa-info-circle"></i>
            Requires taking ${bridgeDates} off
        </div>
    `;
}

function renderWeekendCard(weekend, index) {
    const saved = isWeekendSaved(weekend);
    const heartIcon = saved ? "fa-solid fa-heart" : "fa-regular fa-heart";
    const actionLabel = saved ? "Remove from My Plans" : "Save to My Plans";

    return `
        <article class="lw-card">
            <div class="lw-card-header">
                <span class="lw-badge">
                    <i class="fa-solid fa-calendar-days"></i>
                    ${Number(weekend.dayCount)} Days
                </span>

                <button
                    class="holiday-action-btn ${saved ? "saved" : ""}"
                    type="button"
                    data-weekend-index="${index}"
                    aria-label="${actionLabel}"
                    title="${actionLabel}"
                >
                    <i class="${heartIcon}"></i>
                </button>
            </div>

            <h3>Long Weekend #${index + 1}</h3>

            <div class="lw-dates">
                <i class="fa-regular fa-calendar"></i>
                ${escapeHTML(getDateRange(weekend.startDate, weekend.endDate))}
            </div>

            ${renderWeekendMessage(weekend)}

            <div class="lw-days-visual">
                ${renderDaysVisual(weekend)}
            </div>
        </article>
    `;
}

function renderLongWeekends(weekends) {
    if (!Array.isArray(weekends) || weekends.length === 0) {
        renderEmptyState(
            `No long weekend opportunities were returned for ${currentCountryName} in ${currentYear}.`
        );
        return;
    }

    longWeekendsContent.innerHTML = weekends
        .map((weekend, index) => renderWeekendCard(weekend, index))
        .join("");
}

// ==================== API ====================

async function fetchLongWeekends() {
    if (!longWeekendsContent) return;

    const hasSelection = updateLongWeekendsHeader();

    if (!hasSelection) {
        renderEmptyState("Select a country and year from Dashboard to find long weekends.");
        return;
    }

    const requestId = ++longWeekendsRequestId;
    renderLoadingState();

    const endpoint = `${NAGER_DATE_API}/LongWeekend/${encodeURIComponent(currentYear)}/${encodeURIComponent(currentCountryCode)}`;

    try {
        const weekends = await ApiService.get(endpoint);

        if (requestId !== longWeekendsRequestId) return;

        if (!Array.isArray(weekends)) {
            throw new Error("The API returned an unexpected response.");
        }

        // Keep the latest response available to the save/remove handlers.
        currentLongWeekends = weekends;
        renderLongWeekends(weekends);
    } catch (error) {
        if (requestId !== longWeekendsRequestId) return;

        console.error("Long Weekends API error:", error);
        longWeekendsContent.innerHTML = `
            <div class="lw-empty-state">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <h3>Unable to Load Long Weekends</h3>
                <p>${escapeHTML(error.message || "Something went wrong. Please try again.")}</p>
                <button class="btn btn-primary" type="button" id="retry-long-weekends">
                    <i class="fa-solid fa-rotate-right"></i> Try Again
                </button>
            </div>
        `;
    }
}

// ==================== EVENTS ====================

function setupLongWeekendsEvents() {
    countrySelect?.addEventListener("change", fetchLongWeekends);
    yearSelect?.addEventListener("change", fetchLongWeekends);
    citySelect?.addEventListener("change", updateLongWeekendsHeader);

    longWeekendsContent?.addEventListener("click", event => {
        const saveButton = event.target.closest("[data-weekend-index]");
        if (!saveButton) return;

        const index = Number(saveButton.dataset.weekendIndex);
        const weekend = currentLongWeekends[index];

        if (weekend) {
            toggleSavedWeekend(weekend);
        }
    });

    longWeekendsContent?.addEventListener("click", event => {
        if (event.target.closest("#retry-long-weekends")) {
            fetchLongWeekends();
        }
    });
}

// ==================== INITIALIZATION ====================

export function initializeLongWeekends() {
    if (isInitialized) return;
    isInitialized = true;

    if (!countrySelect || !yearSelect || !longWeekendsContent) {
        console.error("Long Weekends: required HTML elements were not found.");
        return;
    }

    setupLongWeekendsEvents();
    updateLongWeekendsHeader();
    fetchLongWeekends();
}
