export function showToast(message, type = 'info', duration = 4000) {
    // Find the container, or create it if it doesn't exist
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        document.body.appendChild(toastContainer);
    }

    // Create the toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    // Add it to the container
    toastContainer.appendChild(toast);

    // Set the animation duration via JavaScript
    toast.style.animationDuration = `${duration / 1000}s`;

    // Remove the toast from the DOM after the animation completes
    toast.addEventListener('animationend', () => {
        toast.remove();
    });
}