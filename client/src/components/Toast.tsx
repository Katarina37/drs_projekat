import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => {
        const Icon = icons[toast.type];
        
        return (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <div className="toast-icon">
              <Icon size={20} />
            </div>
            <div className="toast-content">
              <p className="toast-title">{toast.title}</p>
              {toast.message && <p className="toast-message">{toast.message}</p>}
            </div>
            <button
              className="toast-close"
              onClick={() => removeToast(toast.id)}
              aria-label="Zatvori"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
