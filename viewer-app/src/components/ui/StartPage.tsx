import FileUploader from "./FileUploader";
import { ApplicationMode } from "../types";

interface StartPageProps {
	onModelUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
	onInstructionUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
	onMultiUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
	hasModel: boolean;
	hasInstructions: boolean;
	error: string | null;
	mode: ApplicationMode;
	onModeChange: (mode: ApplicationMode) => void;
	onContinue: () => void;
	userConfirmed: boolean;
}

const StartPage: React.FC<StartPageProps> = ({
	onModelUpload,
	onInstructionUpload,
	onMultiUpload,
	hasModel,
	hasInstructions,
	error,
	mode,
	onModeChange,
	onContinue,
	userConfirmed,
}) => {
	const canContinue =
		mode === ApplicationMode.CONSTRUCTOR
			? hasModel
			: hasModel && hasInstructions;

	return (
		<div className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden bg-gradient-to-br from-gray-900 via-black to-red-950">
			{/* Animated background */}
			<div className="absolute inset-0 w-full h-full">
				<div className="absolute top-[5%] left-[15%] w-96 h-96 bg-red-700 rounded-full mix-blend-soft-light filter blur-3xl opacity-20 animate-blob" />
				<div className="absolute top-[25%] right-[15%] w-96 h-96 bg-red-700 rounded-full mix-blend-soft-light filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
				<div className="absolute bottom-[15%] left-[35%] w-96 h-96 bg-red-700 rounded-full mix-blend-soft-light filter blur-3xl opacity-20 animate-blob animation-delay-4000" />

				{/* Additional subtle background elements */}
				<div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(200,0,0,0.1),transparent_50%)]" />
				<div className="absolute inset-0 backdrop-blur-[100px]" />
			</div>

			{/* Main content */}
			<div className="relative w-full max-w-2xl p-8 mx-4">
				<div className="backdrop-blur-xl bg-white/5 rounded-2xl p-8 shadow-xl border border-white/10">
					<h1 className="text-4xl font-bold text-white mb-8 text-center">
						{mode === ApplicationMode.VIEWER ? "Просмотр" : "Конструктор"} 3D моделей
					</h1>

					{error && (
						<div className="mb-6 bg-red-700/20 backdrop-blur-md border border-red-700/30 text-white px-4 py-3 rounded-xl">
							{error}
						</div>
					)}

					<div className="space-y-8">
						<div className="space-y-4">
							<h2 className="text-lg font-semibold text-white">Режим работы</h2>
							<div className="grid grid-cols-2 gap-4">
								<button
									type="button"
									onClick={() => onModeChange(ApplicationMode.VIEWER)}
									className={`px-6 py-3 rounded-xl text-center font-medium transition-all duration-300 backdrop-blur-md ${
										mode === ApplicationMode.VIEWER
											? "bg-red-700 text-white shadow-lg shadow-red-700/30 scale-[1.02]"
											: "bg-white/5 text-white hover:bg-white/10 hover:scale-[1.02]"
									}`}
								>
									Просмотр
								</button>
								<button
									type="button"
									onClick={() => onModeChange(ApplicationMode.CONSTRUCTOR)}
									className={`px-6 py-3 rounded-xl text-center font-medium transition-all duration-300 backdrop-blur-md ${
										mode === ApplicationMode.CONSTRUCTOR
											? "bg-red-700 text-white shadow-lg shadow-red-700/30 scale-[1.02]"
											: "bg-white/5 text-white hover:bg-white/10 hover:scale-[1.02]"
									}`}
								>
									Конструктор
								</button>
							</div>
						</div>

						<div className="space-y-4">
							<h2 className="text-lg font-semibold text-white">
								Загрузка файлов
							</h2>
							<div className="space-y-4">
								<FileUploader
									id="model-upload"
									label="3D Модель"
									accept=".glb,.gltf"
									onChange={onModelUpload}
									isUploaded={hasModel}
								/>

								{(mode === ApplicationMode.VIEWER ||
									mode === ApplicationMode.CONSTRUCTOR) && (
									<FileUploader
										id="instruction-upload"
										label={
											mode === ApplicationMode.VIEWER
												? "Инструкция (обязательно)"
												: "Инструкция (опционально)"
										}
										accept=".json"
										onChange={onInstructionUpload}
										isUploaded={hasInstructions}
									/>
								)}

								<div className="relative my-6">
									<div className="absolute inset-0 flex items-center">
										<div className="w-full border-t border-white/10" />
									</div>
									<div className="relative flex justify-center text-sm">
										<span className="px-2 backdrop-blur-md bg-black/30 text-white">
											или
										</span>
									</div>
								</div>

								<FileUploader
									id="multi-upload"
									label="Загрузить всё"
									accept=".glb,.gltf,.json,.zip"
									onChange={onMultiUpload}
									multiple={true}
									isUploaded={hasModel && hasInstructions}
								/>

								{canContinue && !userConfirmed && (
									<button
										type="button"
										onClick={onContinue}
										className="w-full mt-4 px-6 py-3 rounded-xl text-center font-medium transition-all duration-300 backdrop-blur-md bg-red-700 text-white hover:bg-red-600 shadow-lg shadow-red-700/30"
									>
										Продолжить
									</button>
								)}
							</div>
						</div>
					</div>

					<div className="text-center text-sm text-gray-300 mt-6">
						{mode === ApplicationMode.VIEWER ? (
							<p>Требуется загрузить модель и инструкцию</p>
						) : (
							<p>Требуется загрузить модель, инструкция опциональна</p>
						)}
					</div>
				</div>
			</div>

			<style>{`
				@keyframes blob {
					0% { transform: translate(0, 0) scale(1); }
					33% { transform: translate(50px, -50px) scale(1.2); }
					66% { transform: translate(-20px, 20px) scale(0.8); }
					100% { transform: translate(0, 0) scale(1); }
				}
				.animate-blob {
					animation: blob 15s infinite cubic-bezier(0.4, 0, 0.2, 1);
				}
				.animation-delay-2000 {
					animation-delay: 2s;
				}
				.animation-delay-4000 {
					animation-delay: 4s;
				}
			`}</style>
		</div>
	);
};

export default StartPage;
