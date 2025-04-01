import JSZip from "jszip";
import type { InstructionStep } from "../components/common/types";

const MAX_MODEL_SIZE = 100 * 1024 * 1024; // 100MB limit

// Validate model file type and size
export const validateModelFile = (file: File): string | null => {
	const validTypes = [".glb", ".gltf"];

	const extension = file.name
		.toLowerCase()
		.substring(file.name.lastIndexOf("."));
	if (!validTypes.includes(extension)) {
		return "Invalid file type. Please upload a .glb or .gltf file.";
	}

	if (file.size > MAX_MODEL_SIZE) {
		return "File size too large. Maximum size is 100MB.";
	}

	return null;
};

// Validate instruction file type and basic structure
export const validateInstructionFile = (file: File): string | null => {
	if (!file.name.toLowerCase().endsWith(".json")) {
		return "Invalid file type. Please upload a .json file.";
	}

	return null;
};

// Process instruction file and return parsed instructions
export const processInstructionFile = async (
	file: File,
): Promise<{ instructions: InstructionStep[]; error: string | null }> => {
	try {
		const text = await file.text();
		const jsonData = JSON.parse(text);

		if (!jsonData.assemblyStages || !Array.isArray(jsonData.assemblyStages)) {
			return {
				instructions: [],
				error:
					"Invalid instruction format. File must contain assemblyStages array.",
			};
		}

		return {
			instructions: jsonData.assemblyStages,
			error: null,
		};
	} catch (error) {
		return {
			instructions: [],
			error: `Error parsing instruction file: ${error instanceof Error ? error.message : "Unknown error"}`,
		};
	}
};

// Process multiple files (model, instructions, or zip)
export const processFiles = async (
	files: FileList,
): Promise<{ modelFile: File | null; instructionFile: File | null }> => {
	let modelFile: File | null = null;
	let instructionFile: File | null = null;
	let zipFile: File | null = null;

	// First look for files by type
	for (let i = 0; i < files.length; i++) {
		const file = files[i];
		const fileName = file.name.toLowerCase();

		if (fileName.endsWith(".glb") || fileName.endsWith(".gltf")) {
			modelFile = file;
		} else if (fileName.endsWith(".json")) {
			instructionFile = file;
		} else if (fileName.endsWith(".zip")) {
			zipFile = file;
		}
	}

	// Process ZIP file if found
	if (zipFile) {
		try {
			const zip = new JSZip();
			const zipContent = await zip.loadAsync(zipFile);

			// Look for models and instructions in archive
			for (const [fileName, fileData] of Object.entries(zipContent.files)) {
				if (fileData.dir) continue;

				const lowerFileName = fileName.toLowerCase();

				// Found model in archive
				if (lowerFileName.endsWith(".glb") || lowerFileName.endsWith(".gltf")) {
					if (!modelFile) {
						const blob = await fileData.async("blob");
						modelFile = new File([blob], fileName, {
							type: lowerFileName.endsWith(".glb")
								? "model/gltf-binary"
								: "model/gltf+json",
						});
					}
				}
				// Found instructions in archive
				else if (lowerFileName.endsWith(".json")) {
					if (!instructionFile) {
						const blob = await fileData.async("blob");
						instructionFile = new File([blob], fileName, {
							type: "application/json",
						});
					}
				}
			}
		} catch (error) {
			throw new Error(
				`Error extracting ZIP file: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	return { modelFile, instructionFile };
};

// Create a URL for the model file with cache busting
export const createModelUrl = (file: File): string => {
	const url = URL.createObjectURL(file);
	// Add timestamp to prevent caching issues
	return `${url}#t=${Date.now()}`;
};
