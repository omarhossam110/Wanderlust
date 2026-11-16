
 // ==================== WANDERLUST - EVENTS ====================

import { ApiService } from "../api/api.js";
import { escapeHTML } from "../utils/helpers.js";
import { showMessage, updateHeaderSelection } from "../utils/ui.js";

// ==================== CONFIGURATION ====================

const TICKETMASTER_API = "https://app.ticketmaster.com/discovery/v2";
const TICKETMASTER_API_KEY = "YOUR_TICKETMASTER_API_KEY";

const STORAGE_KEY = "wanderlust-plans";
const EVENTS_LIMIT = 30;

// ==================== DOM ELEMENTS ====================

const countrySelect = document.getElementById("global-country");
const citySelect = document.getElementById("global-city");
const yearSelect = document.getElementById("global-year");

const eventsContent = document.getElementById("events-content");
const eventsSelection = document.querySelector(
    "#events-view .view-header-selection"
);

// ==================== STATE ====================

let currentEvents = [];
let currentCountryCode = "";
let currentCountryName = "";
let currentCity = "";
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
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(plans)
        );
        window.dispatchEvent(new CustomEvent("wanderlust:plans-updated"));

        return true;

    } catch (error) {
        console.error("Could not save plans:", error);

        showMessage(
            "Could not save this event. Please try again."
        );

        return false;
    }
}

// ==================== EVENT HELPERS ====================

function createEventId(event) {
    return `event-${event.id}`;
}

function isEventSaved(eventId) {
    return getSavedPlans().some(
        plan => plan.id === eventId
    );
}

function getEventImage(event) {
    const images = event.images || [];

    const preferredImage = images.find(image => {
        return image.ratio === "16_9" &&
            image.width >= 300 &&
            !image.fallback;
    });

    return preferredImage?.url || images[0]?.url || "";
}

function getEventCategory(event) {
    const classification = event.classifications?.[0];

    return (
        classification?.segment?.name ||
        classification?.genre?.name ||
        "Event"
    );
}

function getEventVenue(event) {
    const venue = event._embedded?.venues?.[0];

    const venueName = venue?.name || "Venue not specified";
    const cityName = venue?.city?.name || currentCity;

    return `${venueName}, ${cityName}`;
}

function getEventDate(event) {
    const date = event.dates?.start?.localDate;
    const time = event.dates?.start?.localTime;

    if (!date) {
        return "Date to be announced";
    }

    const eventDate = new Date(`${date}T00:00:00`);

    const formattedDate = eventDate.toLocaleDateString(
        "en-US",
        {
            month: "short",
            day: "numeric",
            year: "numeric"
        }
    );

    if (!time) {
        return formattedDate;
    }

    const [hours, minutes] = time.split(":").map(Number);

    const formattedTime = new Date();

    formattedTime.setHours(hours, minutes, 0, 0);

    const timeText = formattedTime.toLocaleTimeString(
        "en-US",
        {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        }
    );

    return `${formattedDate} at ${timeText}`;
}

// ==================== EVENT SELECTION ====================

function updateEventSelection() {
    const selection = updateHeaderSelection(
        eventsSelection,
        "Select a country, city, and year from Dashboard"
    );

    currentCountryCode = selection.countryCode;
    currentCountryName = selection.countryName;
    currentCity = selection.city;
    currentYear = yearSelect.value;

    // Events require a country, city, and year.
    return selection.hasCity && Boolean(currentYear);
}

// ==================== SAVE / REMOVE EVENTS ====================

function toggleSavedEvent(event) {
    const plans = getSavedPlans();

    const eventId = createEventId(event);

    const existingPlanIndex = plans.findIndex(
        plan => plan.id === eventId
    );

    if (existingPlanIndex !== -1) {
        plans.splice(existingPlanIndex, 1);

        if (!savePlans(plans)) return;

        showMessage(
            "Event removed from My Plans.",
            "success"
        );

    } else {
        const savedEvent = {
            id: eventId,
            type: "event",

            title: event.name,
            name: event.name,

            date: event.dates?.start?.localDate || "",
            time: event.dates?.start?.localTime || "",

            countryCode: currentCountryCode,
            countryName: currentCountryName,

            city: currentCity,
            year: currentYear,

            category: getEventCategory(event),
            venue: getEventVenue(event),

            image: getEventImage(event),
            url: event.url || "",

            savedAt: new Date().toISOString()
        };

        plans.push(savedEvent);

        if (!savePlans(plans)) return;

        showMessage(
            "Event added to My Plans.",
            "success"
        );
    }

    renderEvents(currentEvents);
}

// ==================== RENDER EVENTS ====================

function renderEvents(events) {
    if (!eventsContent) return;

    if (!events.length) {
        eventsContent.innerHTML = `
            <div class="holidays-empty-state">
                <i class="fa-regular fa-calendar-xmark"></i>

                <h3>No Events Found</h3>

                <p>
                    No events were found for this city and year.
                    Try selecting another destination or year.
                </p>
            </div>
        `;

        return;
    }

    const savedPlans = getSavedPlans();

    eventsContent.innerHTML = events.map(event => {
        const eventId = createEventId(event);

        const isSaved = savedPlans.some(
            plan => plan.id === eventId
        );

        const image = getEventImage(event);

        const category = getEventCategory(event);
        const eventDate = getEventDate(event);
        const venue = getEventVenue(event);

        const eventName = event.name || "Untitled Event";

        const ticketButton = event.url
            ? `
                <a
                    href="${escapeHTML(event.url)}"
                    class="btn-buy-ticket"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <i class="fa-solid fa-ticket"></i>
                    Buy Tickets
                </a>
            `
            : `
                <span class="btn-buy-ticket">
                    Tickets Unavailable
                </span>
            `;

        const imageContent = image
            ? `
                <img
                    src="${escapeHTML(image)}"
                    alt="${escapeHTML(eventName)}"
                    loading="lazy"
                >
            `
            : `
                <div class="event-image-placeholder">
                    <i class="fa-solid fa-ticket"></i>
                </div>
            `;

        return `
            <div class="event-card">

                <div class="event-card-image">
                    ${imageContent}

                    <span class="event-card-category">
                        ${escapeHTML(category)}
                    </span>

                    <button
                        class="event-card-save ${isSaved ? "is-saved" : ""}"
                        type="button"
                        data-event-id="${escapeHTML(eventId)}"
                        aria-label="${isSaved ? "Remove from" : "Add to"} My Plans"
                        aria-pressed="${isSaved}"
                    >
                        <i class="${isSaved ? "fa-solid" : "fa-regular"} fa-heart"></i>
                    </button>
                </div>

                <div class="event-card-body">

                    <h3>${escapeHTML(eventName)}</h3>

                    <div class="event-card-info">

                        <div>
                            <i class="fa-regular fa-calendar"></i>
                            ${escapeHTML(eventDate)}
                        </div>

                        <div>
                            <i class="fa-solid fa-location-dot"></i>
                            ${escapeHTML(venue)}
                        </div>

                    </div>

                    <div class="event-card-footer">

                        <button
                            class="btn-event ${isSaved ? "is-saved" : ""}"
                            type="button"
                            data-event-id="${escapeHTML(eventId)}"
                        >
                            <i class="${isSaved ? "fa-solid" : "fa-regular"} fa-heart"></i>

                            ${isSaved ? "Saved" : "Save"}
                        </button>

                        ${ticketButton}

                    </div>

                </div>

            </div>
        `;
    }).join("");
}

// ==================== LOADING STATE ====================

function showLoadingState() {
    eventsContent.innerHTML = `
        <div class="holidays-empty-state">
            <i class="fa-solid fa-spinner fa-spin"></i>

            <h3>Loading Events...</h3>

            <p>
                Fetching events in ${escapeHTML(currentCity)}.
                Please wait.
            </p>
        </div>
    `;
}

function showErrorState(message) {
    eventsContent.innerHTML = `
        <div class="holidays-empty-state">
            <i class="fa-solid fa-triangle-exclamation"></i>

            <h3>Unable to Load Events</h3>

            <p>${escapeHTML(message)}</p>
        </div>
    `;
}

// ==================== LOAD EVENTS FROM API ====================

async function loadEvents() {
    const selectedRequestId = ++requestId;

    if (!updateEventSelection()) {
        currentEvents = [];

        eventsContent.innerHTML = `
            <div class="holidays-empty-state">
                <i class="fa-solid fa-ticket"></i>

                <h3>Explore Events</h3>

                <p>
                    Select a country, city, and year from Dashboard
                    to discover upcoming events.
                </p>
            </div>
        `;

        return;
    }

    if (
        !TICKETMASTER_API_KEY ||
        TICKETMASTER_API_KEY === "YOUR_TICKETMASTER_API_KEY"
    ) {
        showErrorState(
            "Please add your Ticketmaster API key inside events.js."
        );

        return;
    }

    const countryCode = currentCountryCode;
    const city = currentCity;
    const year = currentYear;

    showLoadingState();

    const startDateTime = `${year}-01-01T00:00:00Z`;
    const endDateTime = `${year}-12-31T23:59:59Z`;

    const params = new URLSearchParams({
        apikey: TICKETMASTER_API_KEY,
        city,
        countryCode,
        startDateTime,
        endDateTime,
        size: String(EVENTS_LIMIT),
        sort: "date,asc",
        locale: "*"
    });

    const url = `${TICKETMASTER_API}/events.json?${params}`;

    try {
        const response = await ApiService.get(url);

        if (selectedRequestId !== requestId) return;

        currentEvents = response._embedded?.events || [];

        renderEvents(currentEvents);

        if (!currentEvents.length) {
            showMessage(
                "No events were found for this selection.",
                "info"
            );
        }

    } catch (error) {
        if (selectedRequestId !== requestId) return;

        console.error("Could not load events:", error);

        currentEvents = [];

        const errorMessage = error.message || "";

        if (
            errorMessage.includes("401") ||
            errorMessage.toLowerCase().includes("apikey")
        ) {
            showErrorState(
                "The Ticketmaster API key is invalid. Please check your key."
            );

        } else {
            showErrorState(
                "Could not fetch events. Please check your connection and try again."
            );
        }

        showMessage(
            "Could not load events. Please try again."
        );
    }
}

// ==================== EVENT LISTENERS ====================

function setupEventListeners() {
    countrySelect.addEventListener("change", loadEvents);
    citySelect.addEventListener("change", loadEvents);
    yearSelect.addEventListener("change", loadEvents);

    eventsContent.addEventListener("click", event => {
        const saveButton = event.target.closest(
            "[data-event-id]"
        );

        if (!saveButton) return;

        const eventId = saveButton.dataset.eventId;

        const selectedEvent = currentEvents.find(
            item => createEventId(item) === eventId
        );

        if (!selectedEvent) return;

        toggleSavedEvent(selectedEvent);
    });
}

// ==================== INITIALIZE EVENTS ====================

export function initializeEvents() {
    if (
        !countrySelect ||
        !citySelect ||
        !yearSelect ||
        !eventsContent ||
        !eventsSelection
    ) {
        console.error(
            "Events elements could not be found."
        );

        return;
    }

    setupEventListeners();

    loadEvents();
}
