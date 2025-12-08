"use client";

import { useFormStore } from "../store/useFormStore";
import { Toast } from "./toast";

export function ToastContainer() {
  const { toasts, removeToast } = useFormStore();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast
            title={toast.title}
            description={toast.description}
            variant={toast.variant}
            duration={toast.duration}
            showCloseButton={toast.showCloseButton}
            icon={toast.icon}
            className={toast.className}
            onClose={() => removeToast(toast.id)}
          />
        </div>
      ))}
    </div>
  );
}
