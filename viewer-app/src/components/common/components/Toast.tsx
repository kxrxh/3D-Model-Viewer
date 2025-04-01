import { useEffect } from "react";
import { createPortal } from "react-dom";

export type ToastType = "success" | "error" | "warning" | "info";

interface ToastProps {
	message: string;
	type?: ToastType;
	duration?: number;
	onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({
	message,
	type = "info",
	duration = 3000,
	onClose,
}) => {
	useEffect(() => {
		const timer = setTimeout(() => {
			onClose();
		}, duration);
		return () => clearTimeout(timer);
	}, [duration, onClose]);

	const getToastStyles = () => {
		switch (type) {
			case "success":
				return "bg-green-100 text-green-800 border-green-300";
			case "error":
				return "bg-red-100 text-red-800 border-red-300";
			case "warning":
				return "bg-yellow-100 text-yellow-800 border-yellow-300";
			case "info":
				return "bg-blue-100 text-blue-700 border-blue-300";
			default:
				return "bg-blue-100 text-blue-700 border-blue-300";
		}
	};

	return (
		<div
			className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-3 rounded-md shadow-lg border ${getToastStyles()} max-w-md w-full z-50 animate-fade-in-up`}
		>
			<div className="flex justify-between items-center">
				<p className="text-sm">{message}</p>
				<button
					type="button"
					onClick={onClose}
					className="ml-4 text-gray-600 hover:text-gray-800"
				>
					×
				</button>
			</div>
		</div>
	);
};

interface ToastContainerProps {
	children?: React.ReactNode;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ children }) => {
	return createPortal(
		<div className="toast-container">{children}</div>,
		document.body,
	);
};

export default Toast;
