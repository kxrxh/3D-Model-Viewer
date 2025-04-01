import type { ChangeEvent } from "react";
import { IoCheckmarkCircle } from "react-icons/io5";
import { IoCloudUpload } from "react-icons/io5";

interface FileUploaderProps {
	id: string;
	label: string;
	accept: string;
	onChange: (event: ChangeEvent<HTMLInputElement>) => void;
	isUploaded: boolean;
	multiple?: boolean;
}

const FileUploader: React.FC<FileUploaderProps> = ({
	id,
	label,
	accept,
	onChange,
	isUploaded,
	multiple = false,
}) => {
	return (
		<div className="relative">
			<input
				type="file"
				id={id}
				onChange={onChange}
				multiple={multiple}
				accept={accept}
				className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
				title={`Нажмите для загрузки: ${label}`}
			/>
			<div
				className={`relative flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 backdrop-blur-md border ${
					isUploaded
						? "bg-red-700/20 border-red-700/30 shadow-lg shadow-red-700/20"
						: "bg-white/10 border-white/20 hover:bg-white/20"
				}`}
			>
				<div>
					<p className="font-medium text-white">
						{isUploaded ? `${label} загружен ✓` : label}
					</p>
					<p className="text-xs text-gray-300 mt-0.5">{accept}</p>
				</div>
				{isUploaded ? (
					<IoCheckmarkCircle
						className="w-6 h-6 text-red-700"
						aria-label="Файл загружен"
						title="Файл загружен"
					/>
				) : (
					<IoCloudUpload
						className="w-6 h-6 text-white"
						aria-label="Загрузить файл"
						title="Загрузить файл"
					/>
				)}
			</div>
		</div>
	);
};

export default FileUploader;
