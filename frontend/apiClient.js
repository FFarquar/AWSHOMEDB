
//Helper code to mock local data
const USE_MOCK = window.APP_CONFIG?.USE_MOCK;

async function apiGet(endpoint, mockFile) {
    if (USE_MOCK) {
        const res = await fetch(`./mockdata/${mockFile}`);
        return await res.json();
    }

    const token = localStorage.getItem("authToken");

    const res = await fetch(`${window.APP_CONFIG.API_BASE_URL}${endpoint}`, {
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        }
    });

    return await res.json();
}

async function apiPost(endpoint, body) {
    if (USE_MOCK) {
        return { success: true };
    }

    const token = localStorage.getItem("authToken");

    const res = await fetch(`${window.APP_CONFIG.API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(body)
    });

    return await res.json();
}
