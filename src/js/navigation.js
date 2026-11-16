
// ==================== WANDERLUST - NAVIGATION ====================

// ==================== VIEW CONFIGURATION ====================

const views = {
    dashboard: {
        title: "Dashboard",
        subtitle: "Welcome back! Ready to plan your next adventure?"
    },
    holidays: {
        title: "Holidays",
        subtitle: "Explore public holidays around the world"
    },
    events: {
        title: "Events",
        subtitle: "Discover events and activities at your destination"
    },
    weather: {
        title: "Weather",
        subtitle: "Check the weather forecast for your destination"
    },
    "long-weekends": {
        title: "Long Weekends",
        subtitle: "Find opportunities to make the most of your holidays"
    },
    currency: {
        title: "Currency Converter",
        subtitle: "Convert currencies using live exchange rates"
    },
    "sun-times": {
        title: "Sun Times",
        subtitle: "Explore sunrise and sunset times around the world"
    },
    "my-plans": {
        title: "My Plans",
        subtitle: "Manage your saved holidays, events, and trips"
    }
};

// ==================== DOM ELEMENTS ====================

const navigationLinks = document.querySelectorAll(".nav-item[data-view]");
const pageTitle = document.getElementById("page-title");
const pageSubtitle = document.getElementById("page-subtitle");

// ==================== NAVIGATION ====================

function showView(viewName) {
    const viewConfig = views[viewName];

    const targetView = document.getElementById(
        `${viewName}-view`
    );

    if (!viewConfig || !targetView) {
        console.warn(`View "${viewName}" was not found.`);
        return;
    }

    // Hide all views and activate the selected one.
    document.querySelectorAll(".view").forEach(view => {
        view.classList.remove("active");
    });

    targetView.classList.add("active");

    // Update active sidebar link.
    navigationLinks.forEach(link => {
        const isActive = link.dataset.view === viewName;

        link.classList.toggle("active", isActive);

        if (isActive) {
            link.setAttribute("aria-current", "page");
        } else {
            link.removeAttribute("aria-current");
        }
    });

    // Update page header.
    if (pageTitle) {
        pageTitle.textContent = viewConfig.title;
    }

    if (pageSubtitle) {
        pageSubtitle.textContent = viewConfig.subtitle;
    }
}

// ==================== EVENT LISTENERS ====================

function setupNavigationEvents() {
    navigationLinks.forEach(link => {
        link.addEventListener("click", event => {
            event.preventDefault();

            const viewName = link.dataset.view;

            showView(viewName);

            // Update URL hash without reloading the page.
            if (window.location.hash !== `#${viewName}`) {
                window.location.hash = viewName;
            }
        });
    });

    // Support browser back and forward navigation.
    window.addEventListener("hashchange", () => {
        const viewName = window.location.hash.slice(1);

        showView(viewName || "dashboard");
    });
}

// ==================== INITIALIZE NAVIGATION ====================

export function initializeNavigation() {
    setupNavigationEvents();

    const initialView = window.location.hash.slice(1);

    showView(
        views[initialView] ? initialView : "dashboard"
    );
}
