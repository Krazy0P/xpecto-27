import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function ConfirmationPopup({
  title = 'Confirm action',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  danger = false,
}) {
  const confirmButton = useRef(null);

  useEffect(() => {
    confirmButton.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return createPortal(
    <div
      className="modal-overlay"
      onMouseDown={(event) => event.target === event.currentTarget && onCancel()}
    >
      <div
        className="manga-panel modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-popup-title"
        aria-describedby="confirmation-popup-message"
      >
        <h2 id="confirmation-popup-title">{title}</h2>
        <p id="confirmation-popup-message">{message}</p>
        <div className="row">
          <button className="link-btn" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            ref={confirmButton}
            className={`btn-slash${danger ? ' danger' : ''}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
