/* ============================================================
   Roll ’n Connect — Core App Config
   Architect: Clayvonte
   Purpose: Centralized namespace for marketplace, settings,
            branding, and dynamic content wiring.
   ============================================================ */

const RC = {
    appName: "Roll ’n Connect",
    version: "1.0.0",

    /* -----------------------------------------
       BRAND + UI CONFIG
    ----------------------------------------- */
    brand: {
        primaryColor: "#00eaff",
        accentColor: "#ff00c8",
        glowIntensity: 0.6,
        logo: "assets/rc_logo.png",
        theme: "neon-cosmic"
    },

    /* -----------------------------------------
       MARKETPLACE DATA
       (This is what renderMarketplace() expects)
    ----------------------------------------- */
    getMarketplaceItems() {
        return [
            {
                id: "rc-001",
                name: "Roll ’n Connect Pro",
                price: 49,
                description: "Unlock full access to the Roll ’n Connect ecosystem.",
                image: "assets/items/pro.png",
                category: "software"
            },
            {
                id: "rc-002",
                name: "Brand Kit",
                price: 29,
                description: "Logos, color palettes, and UI assets for your brand.",
                image: "assets/items/brandkit.png",
                category: "assets"
            },
            {
                id: "rc-003",
                name: "Animation Pack",
                price: 19,
                description: "Cinematic transitions and cursor effects.",
                image: "assets/items/animations.png",
                category: "effects"
            }
        ];
    },

    /* -----------------------------------------
       USER SETTINGS / LOCALSTORAGE
    ----------------------------------------- */
    saveSetting(key, value) {
        localStorage.setItem(`rc_${key}`, JSON.stringify(value));
    },

    loadSetting(key, fallback = null) {
        const data = localStorage.getItem(`rc_${key}`);
        return data ? JSON.parse(data) : fallback;
    },

    /* -----------------------------------------
       PAYWALL + ACCESS CONTROL
    ----------------------------------------- */
    hasAccess() {
        return localStorage.getItem("rc_access") === "true";
    },

    grantAccess() {
        localStorage.setItem("rc_access", "true");
    },

    revokeAccess() {
        localStorage.removeItem("rc_access");
    }
};

/* Expose globally */
window.RC = RC;
