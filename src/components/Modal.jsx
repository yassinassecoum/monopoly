import { useEffect, useRef } from 'react';

export default function Modal({ children, onClose, label, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    ref.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} ref={ref}>
        {onClose && <button className="modal-close" onClick={onClose} aria-label="Fermer">×</button>}
        {children}
      </div>
    </div>
  );
}
