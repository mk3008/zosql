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
  
  // Get icon based on type
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };
  
  const icon = icons[type] || icons.info;
  
  // Create toast content
  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <div class="toast-content">
      ${title ? `<div class="toast-title">${title}</div>` : ''}
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close" onclick="removeToast('${id}')">×</button>
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

export function showSuccessToast(message, title = 'Success') {
  return showToast(message, 'success', title);
}

export function showErrorToast(message, title = 'Error') {
  return showToast(message, 'error', title);
}

export function showWarningToast(message, title = 'Warning') {
  return showToast(message, 'warning', title);
}

export function showInfoToast(message, title = 'Info') {
  return showToast(message, 'info', title);
}

// Make functions globally available
window.showToast = showToast;
window.removeToast = removeToast;
window.showSuccessToast = showSuccessToast;
window.showErrorToast = showErrorToast;
window.showWarningToast = showWarningToast;
window.showInfoToast = showInfoToast;