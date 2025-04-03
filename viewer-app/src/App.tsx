import { useState, useCallback } from "react";
import ModelViewer from "./components/ModelViewer";
import StartPage from "./components/ui/StartPage";
import type { InstructionStep } from "./components/common/types";
import {
	validateModelFile,
	validateInstructionFile,
	processInstructionFile,
	processFiles,
	createModelUrl,
} from "./utils/fileUtils";
import { ApplicationMode } from "./components/types";
import ModelConstructor from "./components/ModelConstructor";
import { ModelConstructorProvider } from "./components/ModelConstructor/context/ModelConstructorContext";

function App() {
	const [modelUrl, setModelUrl] = useState<string | null>(null);
	const [modelFileName, setModelFileName] = useState<string | null>(null);
	const [hasModel, setHasModel] = useState<boolean>(false);
	const [hasInstructions, setHasInstructions] = useState<boolean>(false);
	const [instructions, setInstructions] = useState<InstructionStep[]>([]);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [mode, setMode] = useState<ApplicationMode>(ApplicationMode.VIEWER);
	const [userConfirmed, setUserConfirmed] = useState<boolean>(false);

	const handleModelUpload = useCallback(
		async (event: React.ChangeEvent<HTMLInputElement>) => {
			const file = event.target.files?.[0];
			if (file) {
				try {
					const validationError = validateModelFile(file);
					if (validationError) {
						setError(validationError);
						return;
					}

					// Clean up previous object URL if exists
					if (modelUrl) URL.revokeObjectURL(modelUrl);

					const urlWithTimestamp = createModelUrl(file);
					setModelUrl(urlWithTimestamp);
					setModelFileName(file.name);
					setIsLoading(true);
					setHasModel(true);
					setError(null);

					console.log(
						`Model loaded: ${file.name}, size: ${(file.size / 1024 / 1024).toFixed(2)} MB`,
					);
				} catch (err) {
					setError(
						`Error loading model: ${err instanceof Error ? err.message : "Unknown error"}`,
					);
					setHasModel(false);
					setModelUrl(null);
					setModelFileName(null);
				}
			}
		},
		[modelUrl],
	);

	const handleInstructionUpload = useCallback(
		async (event: React.ChangeEvent<HTMLInputElement>) => {
			const file = event.target.files?.[0];
			if (file) {
				try {
					const validationError = validateInstructionFile(file);
					if (validationError) {
						setError(validationError);
						return;
					}

					const { instructions: parsedInstructions, error: parseError } =
						await processInstructionFile(file);
					if (parseError) {
						setError(parseError);
						setInstructions([]);
						setHasInstructions(false);
						return;
					}

					setInstructions(parsedInstructions);
					setHasInstructions(true);
					setError(null);
				} catch (err) {
					setError(
						`Error loading instructions: ${err instanceof Error ? err.message : "Unknown error"}`,
					);
					setInstructions([]);
					setHasInstructions(false);
				}
			}
		},
		[],
	);

	const handleMultiUpload = useCallback(
		async (event: React.ChangeEvent<HTMLInputElement>) => {
			const files = event.target.files;
			if (!files || files.length === 0) return;

			try {
				const { modelFile, instructionFile } = await processFiles(files);

				// Handle model file
				if (modelFile) {
					if (modelUrl) URL.revokeObjectURL(modelUrl);
					const urlWithTimestamp = createModelUrl(modelFile);
					setModelUrl(urlWithTimestamp);
					setModelFileName(modelFile.name);
					setIsLoading(true);
					setHasModel(true);
					setError(null);
					console.log(
						`Model loaded: ${modelFile.name}, size: ${(modelFile.size / 1024 / 1024).toFixed(2)} MB`,
					);
				} else {
					if (modelUrl) URL.revokeObjectURL(modelUrl);
					setModelUrl(null);
					setModelFileName(null);
					setHasModel(false);
				}

				// Handle instruction file
				if (instructionFile) {
					const { instructions: parsedInstructions, error: parseError } =
						await processInstructionFile(instructionFile);
					if (parseError) {
						setError(parseError);
						setInstructions([]);
						setHasInstructions(false);
						return;
					}

					setInstructions(parsedInstructions);
					setHasInstructions(true);
					if (!error?.includes("model")) setError(null);
				} else {
					setInstructions([]);
					setHasInstructions(false);
				}

				// Set error only if neither valid model nor valid instruction file was found
				if (!modelFile && !instructionFile) {
					setError(
						"No valid files found. Please upload a model (.glb/.gltf) and/or instructions (.json)",
					);
				} else if (!modelFile && instructionFile && !error) {
					setError(null);
				}
			} catch (err) {
				setError(
					`Error processing files: ${err instanceof Error ? err.message : "Unknown error"}`,
				);
				if (modelUrl) URL.revokeObjectURL(modelUrl);
				setModelUrl(null);
				setModelFileName(null);
				setHasModel(false);
				setInstructions([]);
				setHasInstructions(false);
			}
		},
		[modelUrl, error],
	);

	const resetState = useCallback(() => {
		if (modelUrl) URL.revokeObjectURL(modelUrl);
		setModelUrl(null);
		setModelFileName(null);
		setInstructions([]);
		setHasInstructions(false);
		setHasModel(false);
		setIsLoading(false);
		setError(null);
		setUserConfirmed(false);
	}, [modelUrl]);

	const handleContinue = useCallback(() => {
		setError(null);
		setUserConfirmed(true);
	}, []);

	// Determine if we should show the viewer or uploader
	const showViewer =
		userConfirmed &&
		modelUrl &&
		(mode === ApplicationMode.CONSTRUCTOR
			? hasModel
			: hasModel && hasInstructions);

	return (
		<div className="w-full h-screen relative bg-gradient-to-br from-slate-100 to-slate-200">
			{!showViewer ? (
				<StartPage
					mode={mode}
					onModeChange={setMode}
					onModelUpload={handleModelUpload}
					onInstructionUpload={handleInstructionUpload}
					onMultiUpload={handleMultiUpload}
					hasModel={hasModel}
					hasInstructions={hasInstructions}
					error={error}
					onContinue={handleContinue}
					userConfirmed={userConfirmed}
					onReset={resetState}
				/>
			) : mode === ApplicationMode.CONSTRUCTOR ? (
				<ModelConstructorProvider
					modelUrl={modelUrl}
					modelFileName={modelFileName}
					instructions={instructions}
					isLoading={isLoading}
					setIsLoading={setIsLoading}
					onReset={resetState}
					onInstructionsChange={setInstructions}
				>
					<ModelConstructor />
				</ModelConstructorProvider>
			) : (
				<ModelViewer
					modelUrl={modelUrl}
					instructions={instructions}
					isLoading={isLoading}
					setIsLoading={setIsLoading}
					onReset={resetState}
				/>
			)}
		</div>
	);
}

export default App;
