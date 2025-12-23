"use client";

import * as React from "react";
import { X, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ToastProps {
  id: string;
  title?: string;
  description: string;
  variant?: "default" | "success" | "error" | "warning";
  duration?: number;
  onClose?: () => void;
}

export function Toast({ id, title, description, variant = "default", duration = 5000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = React.useState(true);

  React.useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onClose?.(), 300); // Wait for animation
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  if (!isVisible) return null;

  const variantStyles = {
    default: "bg-background border-border text-foreground",
    success: "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100",
    error: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100",
    warning: "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800 text-yellow-900 dark:text-yellow-100",
  };

  return (
    <div
      className={cn(
        "relative flex w-full items-center gap-3 rounded-lg border p-4 shadow-lg transition-all",
        variantStyles[variant],
        isVisible ? "animate-in slide-in-from-top-5" : "animate-out slide-out-to-top-5"
      )}
      role="alert"
    >
      {variant === "success" && <CheckCircle2 className="h-5 w-5 flex-shrink-0" />}
      <div className="flex-1">
        {title && <div className="font-semibold">{title}</div>}
        <div className={cn("text-sm", title && "mt-1")}>{description}</div>
      </div>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(() => onClose?.(), 300);
        }}
        className="rounded-md p-1 hover:bg-black/10 dark:hover:bg-white/10"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export interface ToastContainerProps {
  toasts: ToastProps[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-md">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={() => onRemove(toast.id)} />
      ))}
    </div>
  );
}

let toastIdCounter = 0;
const toastListeners = new Set<(toasts: ToastProps[]) => void>();
let toasts: ToastProps[] = [];

function notifyListeners() {
  toastListeners.forEach((listener) => listener([...toasts]));
}

export function toast(props: Omit<ToastProps, "id">) {
  const id = `toast-${++toastIdCounter}`;
  const newToast: ToastProps = { ...props, id };
  
  toasts = [...toasts, newToast];
  notifyListeners();

  return id;
}

export function useToast() {
  const [toastList, setToastList] = React.useState<ToastProps[]>([]);

  React.useEffect(() => {
    const listener = (newToasts: ToastProps[]) => {
      setToastList(newToasts);
    };
    
    toastListeners.add(listener);
    setToastList([...toasts]);

    return () => {
      toastListeners.delete(listener);
    };
  }, []);

  const removeToast = React.useCallback((id: string) => {
    toasts = toasts.filter((t) => t.id !== id);
    notifyListeners();
  }, []);

  const showToast = React.useCallback((props: Omit<ToastProps, "id">) => {
    return toast(props);
  }, []);

  return {
    toasts: toastList,
    toast: showToast,
    removeToast,
  };
}

