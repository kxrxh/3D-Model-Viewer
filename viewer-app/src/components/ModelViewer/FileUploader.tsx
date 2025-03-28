import type { FC, ChangeEvent } from "react";
import { FiUploadCloud } from "react-icons/fi";

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
	<div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
		<h1 className="text-3xl font-bold mb-6">Плеер по сборке</h1>

		<div className="flex flex-col w-full max-w-xl">
			{/* Загрузка нескольких файлов */}
			<div className="bg-white p-5 rounded-lg shadow-md w-full">
				<h2 className="text-lg font-semibold mb-3">Загрузка файлов</h2>
				<label
					htmlFor="multi-upload"
					className="flex flex-col items-center justify-center gap-2 px-8 py-12 bg-red-700 text-white rounded-lg cursor-pointer hover:bg-red-800 transition-all duration-300 shadow-md hover:shadow-lg w-full"
				>
					<div className="mb-3">
						<FiUploadCloud size={48} title="Загрузить файлы" />
					</div>
					<span className="text-xl font-bold mb-1">
						{!hasModel && !hasInstructions
							? "Выберите файлы или перетащите их сюда"
							: hasModel && !hasInstructions
								? "Модель загружена. Добавьте инструкции или архив"
								: !hasModel && hasInstructions
									? "Инструкции загружены. Добавьте модель или архив"
									: "Все файлы загружены"}
					</span>
					<span className="text-sm opacity-80 mt-1">
						{!hasModel && !hasInstructions
							? "Выберите модель (.glb/.gltf), инструкции (.json) или архив (.zip) за один раз"
							: hasModel && !hasInstructions
								? "Выберите файл инструкций (.json) или архив с инструкциями (.zip)"
								: !hasModel && hasInstructions
									? "Выберите файл модели (.glb/.gltf) или архив с моделью (.zip)"
									: "Проверка совместимости..."}
					</span>
				</label>
				<input
					id="multi-upload"
					type="file"
					multiple
					accept=".glb,.gltf,.json,.zip"
					onChange={onMultiUpload}
					className="hidden"
				/>
				<div className="flex flex-wrap gap-2 mt-3 text-xs text-gray-500">
					<span className="px-2 py-1 bg-gray-100 rounded-full">.glb</span>
					<span className="px-2 py-1 bg-gray-100 rounded-full">.gltf</span>
					<span className="px-2 py-1 bg-gray-100 rounded-full">.json</span>
					<span className="px-2 py-1 bg-gray-100 rounded-full">.zip</span>
				</div>
			</div>

			{(hasModel || hasInstructions) && (
				<div className="mt-4 flex items-center gap-3">
					<div
						className={`flex-1 py-2 px-3 rounded-lg ${hasModel ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"} flex items-center`}
					>
						<span
							className={`inline-block w-3 h-3 rounded-full ${hasModel ? "bg-green-500" : "bg-yellow-500"} mr-2`}
						/>
						<span>3D Модель: {hasModel ? "Загружена ✓" : "Не загружена"}</span>
					</div>
					<div
						className={`flex-1 py-2 px-3 rounded-lg ${hasInstructions ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"} flex items-center`}
					>
						<span
							className={`inline-block w-3 h-3 rounded-full ${hasInstructions ? "bg-green-500" : "bg-yellow-500"} mr-2`}
						/>
						<span>
							Инструкции: {hasInstructions ? "Загружены ✓" : "Не загружены"}
						</span>
					</div>
				</div>
			)}
		</div>
	</div>
);

export default FileUploader;
