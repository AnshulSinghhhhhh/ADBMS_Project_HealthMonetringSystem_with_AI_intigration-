export const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric"
    });

export const formatDateTime = (dateStr) =>
    new Date(dateStr).toLocaleString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: true
    });

export const formatChartDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString("en-IN", {
        day: "2-digit", month: "short"
    });
