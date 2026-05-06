/**
 * Simple Client-side Authentication with Serverless Fallback
 */

const AUTH_KEY = "cs2_admin_auth";

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById('login-form');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const password = document.getElementById('admin-password').value;
            const errorMsg = document.getElementById('login-error');

            let isAuthenticated = false;

            // DETECCIÓN DE ENTORNO LOCAL (Live Server en puerto 5500)
            const isLocal = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost";
            const isLiveServer = window.location.port === "5500";

            if (isLocal && isLiveServer) {
                console.log("Entorno detectado: Local Live Server. Usando validación simple.");
                // En local puedes usar 'admin' o lo que tengas en tu .env local (manualmente)
                if (password === "admin") isAuthenticated = true;
            } else {
                // ENTORNO DE PRODUCCIÓN (Vercel)
                try {
                    const response = await fetch('/api/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ password })
                    });
                    const data = await response.json();
                    if (data.success) isAuthenticated = true;
                } catch (error) {
                    console.error("Error conectando con la API de Vercel:", error);
                }
            }

            if (isAuthenticated) {
                sessionStorage.setItem(AUTH_KEY, "true");
                window.location.href = "admin.html";
            } else {
                errorMsg.classList.remove('d-none');
                gsap.to(".glass-card", { x: 10, repeat: 5, yoyo: true, duration: 0.05, onComplete: () => {
                    gsap.set(".glass-card", { x: 0 });
                }});
            }
        });
    }
});

/**
 * Global check function to be used in admin.html
 */
function checkAuth() {
    if (sessionStorage.getItem(AUTH_KEY) !== "true") {
        window.location.href = "login.html";
    }
}

/**
 * Logout function
 */
function logout() {
    sessionStorage.removeItem(AUTH_KEY);
    window.location.href = "index.html";
}
