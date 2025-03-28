import type { FC, ChangeEvent } from "react";
import { FiUploadCloud, FiCheckCircle, FiAlertCircle } from "react-icons/fi";

interface FileUploaderProps {
	onFileUpload: (event: ChangeEvent<HTMLInputElement>) => void;
	onInstructionUpload: (event: ChangeEvent<HTMLInputElement>) => void;
	onMultiUpload: (event: ChangeEvent<HTMLInputElement>) => void;
	hasModel: boolean;
	hasInstructions: boolean;
}

const FileUploader: FC<FileUploaderProps> = ({
	onMultiUpload,
	hasModel,
	hasInstructions,
}) => (
	<div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-gradient-to-b from-gray-50 to-gray-100">
		<div className="max-w-3xl w-full">
			<h1 className="text-5xl font-bold mb-3 text-gray-800 tracking-tight">
				Плеер сборки
			</h1>
			<p className="text-xl text-gray-500 mb-10">
				Загружайте и просматривайте 3D модели с инструкциями
			</p>

			<div className="backdrop-blur-sm bg-white/80 p-8 rounded-2xl shadow-xl border border-gray-100 transition-all duration-300 hover:shadow-2xl">
				{/* Upload Card */}
				<label
					htmlFor="multi-upload"
					className={`group flex flex-col items-center justify-center gap-4 px-10 py-16 rounded-xl cursor-pointer transition-all duration-300 
						${
							hasModel && hasInstructions
								? "bg-green-50 border-3 border-dashed border-green-300 hover:border-green-400"
								: "bg-red-50 border-3 border-dashed border-red-300 hover:border-red-500"
						} 
						relative overflow-hidden`}
				>
					{/* Background Gradient Animation */}
					<div className="absolute inset-0 bg-gradient-to-br from-red-50 to-red-100 opacity-50" />

					{/* Icon Animation */}
					<div
						className={`transition-all duration-500 transform ${!hasModel || !hasInstructions ? "group-hover:scale-110" : ""}`}
					>
						{hasModel && hasInstructions ? (
							<FiCheckCircle size={72} className="text-green-500" />
						) : (
							<FiUploadCloud
								size={72}
								className={`${hasModel || hasInstructions ? "text-red-600" : "text-red-700"}`}
							/>
						)}
					</div>

					{/* Main Text */}
					<span className="text-2xl font-bold relative z-10 text-gray-800">
						{!hasModel && !hasInstructions
							? "Загрузите файлы модели и инструкций"
							: hasModel && !hasInstructions
								? "Модель загружена. Добавьте инструкции"
								: !hasModel && hasInstructions
									? "Инструкции загружены. Добавьте модель"
									: "Все файлы успешно загружены"}
					</span>

					{/* Subtitle */}
					<span className="text-base text-gray-500 max-w-lg relative z-10">
						{!hasModel && !hasInstructions
							? "Выберите модель (.glb/.gltf), инструкции (.json) или архив (.zip) за один раз"
							: hasModel && !hasInstructions
								? "Выберите файл инструкций (.json) или архив с инструкциями (.zip)"
								: !hasModel && hasInstructions
									? "Выберите файл модели (.glb/.gltf) или архив с моделью (.zip)"
									: "Нажмите для выбора других файлов или продолжите с текущими"}
					</span>

					{/* Action Button */}
					{!hasModel || !hasInstructions ? (
						<div className="mt-6 px-8 py-3 bg-red-700 text-white text-lg rounded-full font-medium shadow-md transition-all duration-300 group-hover:shadow-lg group-hover:bg-red-800 relative z-10">
							Выбрать файлы
						</div>
					) : (
						<div className="mt-6 px-8 py-3 bg-green-600 text-white text-lg rounded-full font-medium shadow-md transition-all group-hover:shadow-lg group-hover:bg-green-700 relative z-10">
							Готово к просмотру
						</div>
					)}
				</label>

				<input
					id="multi-upload"
					type="file"
					multiple
					accept=".glb,.gltf,.json,.zip"
					onChange={onMultiUpload}
					className="hidden"
				/>

				{/* File Types */}
				<div className="flex flex-wrap gap-3 mt-6 justify-center">
					<span className="px-4 py-2 bg-gray-100 text-gray-600 rounded-full text-sm font-medium border border-gray-200">
						.glb
					</span>
					<span className="px-4 py-2 bg-gray-100 text-gray-600 rounded-full text-sm font-medium border border-gray-200">
						.gltf
					</span>
					<span className="px-4 py-2 bg-gray-100 text-gray-600 rounded-full text-sm font-medium border border-gray-200">
						.json
					</span>
					<span className="px-4 py-2 bg-gray-100 text-gray-600 rounded-full text-sm font-medium border border-gray-200">
						.zip
					</span>
				</div>
			</div>

			{/* Status Cards */}
			{(hasModel || hasInstructions) && (
				<div className="mt-6 grid grid-cols-2 gap-5">
					<div
						className={`p-5 rounded-xl flex items-center ${hasModel ? "bg-green-50 border border-green-200" : "bg-yellow-50 border border-yellow-200"}`}
					>
						<div
							className={`mr-4 ${hasModel ? "text-green-500" : "text-yellow-500"}`}
						>
							{hasModel ? (
								<FiCheckCircle size={30} />
							) : (
								<FiAlertCircle size={30} />
							)}
						</div>
						<div className="flex flex-col items-start">
							<span className="font-semibold text-lg text-gray-700">
								3D Модель
							</span>
							<span
								className={`text-base ${hasModel ? "text-green-600" : "text-yellow-600"}`}
							>
								{hasModel ? "Загружена ✓" : "Не загружена"}
							</span>
						</div>
					</div>

					<div
						className={`p-5 rounded-xl flex items-center ${hasInstructions ? "bg-green-50 border border-green-200" : "bg-yellow-50 border border-yellow-200"}`}
					>
						<div
							className={`mr-4 ${hasInstructions ? "text-green-500" : "text-yellow-500"}`}
						>
							{hasInstructions ? (
								<FiCheckCircle size={30} />
							) : (
								<FiAlertCircle size={30} />
							)}
						</div>
						<div className="flex flex-col items-start">
							<span className="font-semibold text-lg text-gray-700">
								Инструкции
							</span>
							<span
								className={`text-base ${hasInstructions ? "text-green-600" : "text-yellow-600"}`}
							>
								{hasInstructions ? "Загружены ✓" : "Не загружены"}
							</span>
						</div>
					</div>
				</div>
			)}
		</div>
	</div>
);

export default FileUploader;
