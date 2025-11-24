/**
 * shadcn/ui-inspired Dialog Utility
 * Replaces native browser confirm() with styled modal dialogs
 */

export class Dialog {
  /**
   * Show a confirmation dialog
   * @param {string} title - Dialog title
   * @param {string} message - Dialog message
   * @param {object} options - { confirmText, cancelText, variant }
   * @returns {Promise<boolean>} - true if confirmed, false if cancelled
   */
  static confirm(title, message, options = {}) {
    return new Promise((resolve) => {
      const {
        confirmText = 'Confirm',
        cancelText = 'Cancel',
        variant = 'default' // 'default' | 'destructive'
      } = options;

      // Create dialog overlay
      const overlay = document.createElement('div');
      overlay.className = 'dialog-overlay';
      overlay.innerHTML = `
        <div class="dialog-content" role="dialog" aria-modal="true">
          <div class="dialog-header">
            <h2 class="dialog-title">${this.escapeHtml(title)}</h2>
          </div>
          <div class="dialog-body">
            <p class="dialog-description">${this.formatMessage(message)}</p>
          </div>
          <div class="dialog-footer">
            <button class="btn-dialog-cancel" data-action="cancel">
              ${this.escapeHtml(cancelText)}
            </button>
            <button class="btn-dialog-confirm ${variant === 'destructive' ? 'destructive' : ''}" data-action="confirm">
              ${this.escapeHtml(confirmText)}
            </button>
          </div>
        </div>
      `;

      // Add event listeners
      const handleClick = (e) => {
        const action = e.target.dataset.action;
        if (action === 'confirm') {
          cleanup();
          resolve(true);
        } else if (action === 'cancel') {
          cleanup();
          resolve(false);
        }
      };

      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          cleanup();
          resolve(false);
        }
      };

      const cleanup = () => {
        overlay.removeEventListener('click', handleOverlayClick);
        document.removeEventListener('keydown', handleEscape);
        overlay.classList.add('closing');
        setTimeout(() => overlay.remove(), 200);
      };

      const handleOverlayClick = (e) => {
        if (e.target === overlay) {
          cleanup();
          resolve(false);
        }
      };

      overlay.addEventListener('click', handleClick);
      overlay.addEventListener('click', handleOverlayClick);
      document.addEventListener('keydown', handleEscape);

      // Append to body
      document.body.appendChild(overlay);

      // Focus confirm button
      setTimeout(() => {
        const confirmBtn = overlay.querySelector('[data-action="confirm"]');
        if (confirmBtn) confirmBtn.focus();
      }, 100);
    });
  }

  /**
   * Show an alert dialog (info only, no cancel)
   * @param {string} title - Dialog title
   * @param {string} message - Dialog message
   * @param {string} buttonText - Button text (default: "OK")
   * @returns {Promise<void>}
   */
  static alert(title, message, buttonText = 'OK') {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'dialog-overlay';
      overlay.innerHTML = `
        <div class="dialog-content" role="alertdialog" aria-modal="true">
          <div class="dialog-header">
            <h2 class="dialog-title">${this.escapeHtml(title)}</h2>
          </div>
          <div class="dialog-body">
            <p class="dialog-description">${this.formatMessage(message)}</p>
          </div>
          <div class="dialog-footer">
            <button class="btn-dialog-confirm" data-action="ok">
              ${this.escapeHtml(buttonText)}
            </button>
          </div>
        </div>
      `;

      const handleClick = (e) => {
        if (e.target.dataset.action === 'ok') {
          cleanup();
          resolve();
        }
      };

      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          cleanup();
          resolve();
        }
      };

      const cleanup = () => {
        overlay.removeEventListener('click', handleOverlayClick);
        document.removeEventListener('keydown', handleEscape);
        overlay.classList.add('closing');
        setTimeout(() => overlay.remove(), 200);
      };

      const handleOverlayClick = (e) => {
        if (e.target === overlay) {
          cleanup();
          resolve();
        }
      };

      overlay.addEventListener('click', handleClick);
      overlay.addEventListener('click', handleOverlayClick);
      document.addEventListener('keydown', handleEscape);

      document.body.appendChild(overlay);

      setTimeout(() => {
        const okBtn = overlay.querySelector('[data-action="ok"]');
        if (okBtn) okBtn.focus();
      }, 100);
    });
  }

  /**
   * Format message with line breaks
   */
  static formatMessage(text) {
    return this.escapeHtml(text).replace(/\n/g, '<br>');
  }

  /**
   * Escape HTML to prevent XSS
   */
  static escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Export for use in modules
export default Dialog;
