import FileUploader from "./FileUploader";

interface StartPageProps {
	onModelUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
	onInstructionUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
	onMultiUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
	hasModel: boolean;
	hasInstructions: boolean;
	error: string | null;
}

const StartPage: React.FC<StartPageProps> = ({
	onModelUpload,
	onInstructionUpload,
	onMultiUpload,
	hasModel,
	hasInstructions,
	error,
}) => {
	return (
		<div className="flex flex-col items-center justify-center w-full h-full p-4">
			<div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
				<div className="text-center">
					<h1 className="text-3xl font-bold text-gray-900 mb-2">
						3D Model Viewer
					</h1>
					<p className="text-gray-600 mb-4">
						Upload your 3D model and instructions to begin
					</p>
				</div>

				{error && (
					<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
						{error}
					</div>
				)}

				<div className="space-y-6">
					<FileUploader
						id="model-upload"
						label="Upload 3D Model"
						accept=".glb,.gltf"
						onChange={onModelUpload}
						isUploaded={hasModel}
					/>

					<FileUploader
						id="instruction-upload"
						label="Upload Instructions"
						accept=".json"
						onChange={onInstructionUpload}
						isUploaded={hasInstructions}
					/>

					<div className="relative">
						<div className="absolute inset-0 flex items-center">
							<div className="w-full border-t border-gray-300" />
						</div>
						<div className="relative flex justify-center text-sm">
							<span className="px-2 bg-white text-gray-500">Or</span>
						</div>
					</div>

					<FileUploader
						id="multi-upload"
						label="Upload Both Files"
						accept=".glb,.gltf,.json,.zip"
						onChange={onMultiUpload}
						multiple={true}
						isUploaded={hasModel && hasInstructions}
					/>
				</div>
			</div>
		</div>
	);
};

export default StartPage;
