/**
 * Notification System (Toasts)
 */
export const toast = {
    show(message, type = 'primary') {
        const container = document.getElementById('toast-container') || this._createContainer();
        const toastEl = document.createElement('div');
        toastEl.className = `toast-premium ${type}`;
        toastEl.innerHTML = `
            <div class="toast-content">
                <i class="fas ${this._getIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;
        container.appendChild(toastEl);

        // Animate in
        gsap.fromTo(toastEl, { x: 50, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, ease: "back.out(1.7)" });

        // Remove after delay
        setTimeout(() => {
            gsap.to(toastEl, { x: 50, opacity: 0, duration: 0.3, onComplete: () => toastEl.remove() });
        }, 3000);
    },

    _createContainer() {
        const container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
        return container;
    },

    _getIcon(type) {
        switch(type) {
            case 'success': return 'fa-check-circle';
            case 'error': return 'fa-exclamation-circle';
            case 'warning': return 'fa-exclamation-triangle';
            default: return 'fa-info-circle';
        }
    }
};
