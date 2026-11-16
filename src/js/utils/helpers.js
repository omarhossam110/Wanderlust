
// ==================== GENERAL HELPERS ====================

export function formatNumber(number) {
    return new Intl.NumberFormat("en-US").format(number);
}

export function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => {
        const characters = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return characters[character];
    });
}
