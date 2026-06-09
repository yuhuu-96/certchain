"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";

export interface Toast {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type?: Toast["type"]) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);

    // Automatically remove after 4 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  const value = useMemo(() => ({ toasts, showToast, removeToast }), [toasts, showToast, removeToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`} role="alert">
            <span className="toast-icon">
              {t.type === "success" && <i className="ti ti-circle-check" style={{ color: "var(--color-teal)", fontSize: "18px" }} />}
              {t.type === "error" && <i className="ti ti-circle-x" style={{ color: "var(--color-red)", fontSize: "18px" }} />}
              {t.type === "info" && <i className="ti ti-info-circle" style={{ color: "var(--color-primary)", fontSize: "18px" }} />}
            </span>
            <span className="toast-message" style={{ fontSize: "13px", fontWeight: 500 }}>{t.message}</span>
            <button className="toast-close" onClick={() => removeToast(t.id)} aria-label="Close">
              <i className="ti ti-x" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
