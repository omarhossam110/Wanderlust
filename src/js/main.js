
// ==================== WANDERLUST - MAIN ====================

import { initializeNavigation } from "./navigation.js";
import { initializeDashboard } from "./features/dashboard.js";
import { initializeHolidays } from "./features/holidays.js";
import { initializeEvents } from "./features/events.js";
import { initializeWeather } from "./features/weather.js";
import { initializeLongWeekends } from "./features/long-weekends.js";
import { initializeCurrency } from "./features/currency.js";
import { initializeSunTimes } from "./features/sun-times.js";
import { initializeMyPlans } from "./features/my-plans.js";

async function initializeApp() {
    initializeNavigation();

    await initializeDashboard();

    initializeHolidays();
    initializeEvents();
    initializeWeather();
    initializeSunTimes();
    initializeLongWeekends();

    await initializeCurrency();

    initializeMyPlans();
}

initializeApp();
