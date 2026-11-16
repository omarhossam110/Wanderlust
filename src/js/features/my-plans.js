
// ==================== WANDERLUST - MY PLANS ====================

import { escapeHTML } from "../utils/helpers.js";
import { showMessage } from "../utils/ui.js";

const STORAGE_KEY = "wanderlust-plans";

let activeFilter = "all";
let isInitialized = false;

const filterTypes = {
    all: null,
    holiday: "holiday",
    event: "event",
    longweekend: "long-weekend"
};

// ==================== STORAGE ====================

function getSavedPlans() {
    try {
        const plans = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        return Array.isArray(plans) ? plans : [];
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
        showMessage("Could not update your saved plans.");
        return false;
    }
}

// ==================== HELPERS ====================

function formatDate(dateString) {
    if (!dateString) return "Date not specified";

    const date = new Date(`${dateString}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return escapeHTML(dateString);
    }

    return new Intl.DateTimeFormat("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric"
    }).format(date);
}

function getPlanType(plan) {
    if (plan.type === "longweekend" || plan.type === "long-weekend") {
        return "longweekend";
    }

    return plan.type || "other";
}

function getPlanDate(plan) {
    if (getPlanType(plan) === "longweekend") {
        if (plan.startDate && plan.endDate) {
            return `${formatDate(plan.startDate)} – ${formatDate(plan.endDate)}`;
        }
    }

    return formatDate(plan.date || plan.startDate);
}

function getPlanLocation(plan) {
    const parts = [plan.city, plan.countryName].filter(Boolean);

    return parts.length
        ? parts.join(", ")
        : "Location not specified";
}

function getPlanDescription(plan) {
    if (plan.type === "holiday") {
        const types = Array.isArray(plan.holidayTypes)
            ? plan.holidayTypes.join(", ")
            : "";

        return types ? `Holiday type: ${types}` : "Public holiday";
    }

    if (plan.type === "event") {
        return [plan.category, plan.venue]
            .filter(Boolean)
            .join(" · ") || "Saved event";
    }

    if (getPlanType(plan) === "longweekend") {
        const days = Number(plan.dayCount) || 0;

        return `${days} ${days === 1 ? "day" : "days"}${
            plan.needBridgeDay
                ? " · Requires a bridge day"
                : " · No bridge day needed"
        }`;
    }

    return "Saved travel plan";
}

function getSavedTimestamp(plan) {
    const timestamp = new Date(plan.savedAt || 0).getTime();

    return Number.isNaN(timestamp) ? 0 : timestamp;
}

// ==================== RENDER PLAN CARD ====================

function renderPlanCard(plan) {
    const type = getPlanType(plan);

    const typeLabel = {
        holiday: "Holiday",
        event: "Event",
        longweekend: "Long Weekend"
    }[type] || "Plan";

    const title = escapeHTML(plan.title || plan.name || "Untitled plan");

    const image = type === "event" && plan.image
        ? `
            <img
                class="plan-card-image"
                src="${escapeHTML(plan.image)}"
                alt="${title}"
                loading="lazy"
            >
        `
        : "";

    const eventLink = type === "event" && plan.url
        ? `
            <a
                class="plan-card-link"
                href="${escapeHTML(plan.url)}"
                target="_blank"
                rel="noopener noreferrer"
            >
                View Event
                <i class="fa-solid fa-arrow-up-right-from-square"></i>
            </a>
        `
        : "";

    return `
        <article class="plan-card" data-plan-id="${escapeHTML(plan.id)}">

            ${image}

            <div class="plan-card-content">

                <div class="plan-card-header">

                    <span class="plan-card-type ${type}">
                        ${typeLabel}
                    </span>

                </div>

                <h4>${title}</h4>

                <div class="plan-card-details">

                    <p>
                        <i class="fa-regular fa-calendar"></i>
                        ${getPlanDate(plan)}
                    </p>

                    <p>
                        <i class="fa-solid fa-location-dot"></i>
                        ${escapeHTML(getPlanLocation(plan))}
                    </p>

                </div>

                <p class="plan-card-description">
                    ${escapeHTML(getPlanDescription(plan))}
                </p>

                <div class="plan-card-actions">

                    ${eventLink}

                    <button
                        class="btn-plan-remove"
                        type="button"
                        data-action="remove"
                        data-id="${escapeHTML(plan.id)}"
                        aria-label="Remove ${title}"
                    >
                        <i class="fa-solid fa-trash"></i>
                        Remove
                    </button>

                </div>

            </div>

        </article>
    `;
}

// ==================== FILTER COUNTS ====================

function updateFilterCounts(plans) {
    const counts = {
        all: plans.length,
        holiday: plans.filter(
            plan => getPlanType(plan) === "holiday"
        ).length,
        event: plans.filter(
            plan => getPlanType(plan) === "event"
        ).length,
        longweekend: plans.filter(
            plan => getPlanType(plan) === "longweekend"
        ).length
    };

    const ids = {
        all: "filter-all-count",
        holiday: "filter-holiday-count",
        event: "filter-event-count",
        longweekend: "filter-lw-count"
    };

    Object.entries(ids).forEach(([key, id]) => {
        const element = document.getElementById(id);

        if (element) {
            element.textContent = counts[key];
        }
    });
}

// ==================== EMPTY STATE ====================

function renderEmptyState(hasAnyPlans) {
    const content = document.getElementById("plans-content");

    if (!content) return;

    content.innerHTML = `
        <div class="empty-state">

            <div class="empty-icon">
                <i class="fa-solid ${
                    hasAnyPlans
                        ? "fa-filter-circle-xmark"
                        : "fa-heart-crack"
                }"></i>
            </div>

            <h3>
                ${
                    hasAnyPlans
                        ? "No Plans in This Category"
                        : "No Saved Plans Yet"
                }
            </h3>

            <p>
                ${
                    hasAnyPlans
                        ? "Try another filter to see your saved plans."
                        : "Start exploring and save holidays, events, or long weekends you like!"
                }
            </p>

            <button
                class="btn-primary"
                id="start-exploring-btn"
                type="button"
            >
                <i class="fa-solid fa-compass"></i>
                Start Exploring
            </button>

        </div>
    `;
}

// ==================== RENDER PLANS ====================

function renderPlans() {
    const content = document.getElementById("plans-content");

    if (!content) return;

    const plans = getSavedPlans().sort(
        (a, b) => getSavedTimestamp(b) - getSavedTimestamp(a)
    );

    updateFilterCounts(plans);

    const selectedType = filterTypes[activeFilter];

    const filteredPlans = selectedType
        ? plans.filter(plan => getPlanType(plan) === activeFilter)
        : plans;

    if (!filteredPlans.length) {
        renderEmptyState(plans.length > 0);
        return;
    }

    content.innerHTML = filteredPlans
        .map(renderPlanCard)
        .join("");
}

// ==================== FILTERS ====================

function setActiveFilter(filter) {
    if (!Object.prototype.hasOwnProperty.call(filterTypes, filter)) {
        return;
    }

    activeFilter = filter;

    document.querySelectorAll(".plan-filter[data-filter]").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.filter === filter
        );
    });

    renderPlans();
}

// ==================== REMOVE PLAN ====================

function removePlan(id) {
    const plans = getSavedPlans();

    const updatedPlans = plans.filter(
        plan => String(plan.id) !== String(id)
    );

    if (updatedPlans.length === plans.length) return;

    if (!savePlans(updatedPlans)) return;

    showMessage("Plan removed successfully.", "success");
}

// ==================== CLEAR ALL ====================

function clearAllPlans() {
    const plans = getSavedPlans();

    if (!plans.length) {
        showMessage("There are no saved plans to clear.", "info");
        return;
    }

    if (!window.confirm("Are you sure you want to delete all saved plans?")) {
        return;
    }

    if (!savePlans([])) return;

    activeFilter = "all";

    document.querySelectorAll(".plan-filter[data-filter]").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.filter === "all"
        );
    });

    showMessage("All saved plans have been cleared.", "success");
}

// ==================== NAVIGATION ====================

function startExploring() {
    const dashboardLink = document.querySelector(
        '.nav-item[data-view="dashboard"]'
    );

    if (dashboardLink) {
        dashboardLink.click();
    } else {
        window.location.hash = "dashboard";
    }
}

// ==================== EVENT LISTENERS ====================

function setupEvents() {
    document.querySelectorAll(".plan-filter[data-filter]").forEach(button => {
        button.addEventListener("click", () => {
            setActiveFilter(button.dataset.filter);
        });
    });

    document.getElementById("clear-all-plans-btn")
        ?.addEventListener("click", clearAllPlans);

    document.getElementById("plans-content")
        ?.addEventListener("click", event => {

            const removeButton = event.target.closest(
                '[data-action="remove"]'
            );

            if (removeButton) {
                removePlan(removeButton.dataset.id);
                return;
            }

            if (event.target.closest("#start-exploring-btn")) {
                startExploring();
            }
        });

    // Updates My Plans when another feature saves or removes a plan.
    window.addEventListener("wanderlust:plans-updated", renderPlans);

    // Updates My Plans when LocalStorage changes in another browser tab.
    window.addEventListener("storage", event => {
        if (event.key === STORAGE_KEY) {
            renderPlans();
        }
    });
}

// ==================== INITIALIZATION ====================

export function initializeMyPlans() {
    if (isInitialized) return;

    if (!document.getElementById("plans-content")) {
        console.error("My Plans content element could not be found.");
        return;
    }

    isInitialized = true;

    setupEvents();
    renderPlans();
}
