/**
 * Component Loader for Static Frontend
 * This script injects HTML components into specific containers.
 */

document.addEventListener("DOMContentLoaded", () => {
    // Load components
    loadComponent("navbar", "components/navbar.html", () => {
        // Highlight active link after navbar is loaded
        setActiveNavLink();
    });
    loadComponent("footer", "components/footer.html");
});

/**
 * Fetches an HTML file and injects it into an element.
 * @param {string} elementId - ID of the container element.
 * @param {string} filePath - Path to the HTML component file.
 * @param {function} callback - Optional callback after successful load.
 */
async function loadComponent(elementId, filePath, callback) {
    const container = document.getElementById(elementId);
    if (!container) return;

    try {
        const response = await fetch(filePath);
        if (response.ok) {
            const html = await response.text();
            container.innerHTML = html;
            if (callback) callback();
        } else {
            console.error(`Error loading ${filePath}: ${response.statusText}`);
        }
    } catch (error) {
        console.error(`Network error loading ${filePath}:`, error);
    }
}

/**
 * Sets the 'active' class on the navbar link corresponding to the current page.
 */
function setActiveNavLink() {
    const currentPath = window.location.pathname.split("/").pop() || "index.html";
    const navLinks = document.querySelectorAll(".nav-link");
    
    navLinks.forEach(link => {
        const linkPath = link.getAttribute("href");
        if (linkPath === currentPath) {
            link.classList.add("active");
        } else {
            link.classList.remove("active");
        }
    });
}
