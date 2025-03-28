interface LoadingSpinnerProps {
	text?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
	text = "Loading...",
}) => {
	return (
		<div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
			<div className="relative w-16 h-16">
				<div className="absolute w-16 h-16 border-4 border-red-700 rounded-full animate-spin border-t-transparent" />
				<div className="absolute w-16 h-16 border-4 border-red-300 rounded-full opacity-20" />
			</div>
			<p className="absolute mt-24 text-white font-semibold">{text}</p>
		</div>
	);
};

export default LoadingSpinner;
