// Simple toast notification system as fallback for react-toastify
let toastContainer = null;

const createToastContainer = () => {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      pointer-events: none;
    `;
    document.body.appendChild(toastContainer);
  }
};

const showToast = (message, type = 'info', duration = 3000) => {
  createToastContainer();
  
  const toast = document.createElement('div');
  toast.style.cssText = `
    background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    margin-bottom: 10px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    pointer-events: auto;
    cursor: pointer;
    transition: all 0.3s ease;
    transform: translateX(100%);
    opacity: 0;
    max-width: 300px;
    word-wrap: break-word;
  `;
  
  toast.textContent = message;
  toastContainer.appendChild(toast);
  
  // Animate in
  setTimeout(() => {
    toast.style.transform = 'translateX(0)';
    toast.style.opacity = '1';
  }, 10);
  
  // Remove on click
  toast.addEventListener('click', () => {
    removeToast(toast);
  });
  
  // Auto remove
  setTimeout(() => {
    removeToast(toast);
  }, duration);
};

const removeToast = (toast) => {
  toast.style.transform = 'translateX(100%)';
  toast.style.opacity = '0';
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 300);
};

// Export toast functions with same API as react-toastify
export const toast = {
  error: (message, options = {}) => showToast(message, 'error', options.autoClose || 3000),
  success: (message, options = {}) => showToast(message, 'success', options.autoClose || 3000),
  info: (message, options = {}) => showToast(message, 'info', options.autoClose || 3000),
  warning: (message, options = {}) => showToast(message, 'warning', options.autoClose || 3000),
  default: (message, options = {}) => showToast(message, 'info', options.autoClose || 3000)
};

export const ToastContainer = () => null; // Empty component for compatibility
