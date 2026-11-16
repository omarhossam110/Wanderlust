
// ==================== API SERVICE ====================

export class ApiService {
    static async get(url, options = {}) {
        const response = await fetch(url, options);

        let data;

        try {
            data = await response.json();
        } catch {
            data = null;
        }

        if (!response.ok) {
            const errorMessage = data?.errors?.[0]?.message;

            throw new Error(
                errorMessage || `Request failed: ${response.status}`
            );
        }

        return data;
    }
}
