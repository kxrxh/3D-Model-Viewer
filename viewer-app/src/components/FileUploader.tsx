import type { ChangeEvent } from "react";

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
				className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
				title={label}
			/>
			<div
				className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors duration-300 ${
					isUploaded
						? "border-green-500 bg-green-50"
						: "border-gray-300 hover:border-red-500"
				}`}
			>
				<p className="text-sm font-medium text-gray-600 mb-1">
					{isUploaded ? `${label} Loaded ✓` : label}
				</p>
				<p className="text-xs text-gray-400">{accept}</p>
			</div>
		</div>
	);
};

export default FileUploader;
