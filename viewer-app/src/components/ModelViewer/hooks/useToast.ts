import { useState, useCallback } from "react";
import type { ToastType } from "../../common";

export function useToast() {
	const [toasts, setToasts] = useState<
		{ id: number; message: string; type: ToastType }[]
	>([]);

	const showToast = useCallback((message: string, type: ToastType = "info") => {
		const id = Date.now();
		setToasts((prev) => [...prev, { id, message, type }]);
		return id;
	}, []);

	const hideToast = useCallback((id: number) => {
		setToasts((prev) => prev.filter((toast) => toast.id !== id));
	}, []);

	return { toasts, showToast, hideToast };
}
