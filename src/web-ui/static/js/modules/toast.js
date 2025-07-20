// toast.js - Toast notification system

let toastId = 0;

export function showToast(message, type = 'info', title = '', duration = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const id = `toast-${toastId++}`;
  
  // Create toast element
  const toast = document.createElement('div');
  toast.id = id;
  toast.className = `toast ${type}`;
  
  // Create toast content - simplified without icon and close button
  toast.innerHTML = `
    <div class="toast-content">
      <div class="toast-message">${message}</div>
    </div>
  `;
  
  // Add to container
  container.appendChild(toast);
  
  // Show toast with animation
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  // Auto-remove after duration
  if (duration > 0) {
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }
  
  return id;
}

export function removeToast(id) {
  const toast = document.getElementById(id);
  if (!toast) return;
  
  toast.classList.remove('show');
  
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 300);
}

export function showSuccessToast(message) {
  return showToast(message, 'success');
}

export function showErrorToast(message) {
  return showToast(message, 'error');
}

export function showWarningToast(message) {
  return showToast(message, 'warning');
}

export function showInfoToast(message) {
  return showToast(message, 'info');
}

// Make functions globally available
window.showToast = showToast;
window.removeToast = removeToast;
window.showSuccessToast = showSuccessToast;
window.showErrorToast = showErrorToast;
window.showWarningToast = showWarningToast;
window.showInfoToast = showInfoToast;