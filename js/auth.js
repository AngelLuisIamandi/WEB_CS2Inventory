/**
 * Simple Client-side Authentication
 * Password: admin (change this if needed)
 */

const ADMIN_PASSWORD = "admin"; // You can change this
const AUTH_KEY = "cs2_admin_auth";

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById('login-form');
    
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const password = document.getElementById('admin-password').value;
            const errorMsg = document.getElementById('login-error');

            if (password === ADMIN_PASSWORD) {
                // Set session storage to persist during the browser session
                sessionStorage.setItem(AUTH_KEY, "true");
                window.location.href = "admin.html";
            } else {
                errorMsg.classList.remove('d-none');
                // Shake animation for error
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
