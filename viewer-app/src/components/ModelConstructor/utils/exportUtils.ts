import type { InstructionStep } from "../../common/types";
import JSZip from "jszip";

export interface ExportData {
	version: string;
	createdAt: string;
	assemblyStages: InstructionStep[];
}

export const exportInstructions = async (
	instructions: InstructionStep[],
	modelUrl: string | null,
	onSuccess?: () => void,
): Promise<void> => {
	const zip = new JSZip();

	// Add instructions JSON
	const exportData: ExportData = {
		version: "1.0",
		createdAt: new Date().toISOString(),
		assemblyStages: instructions,
	};

	const jsonBlob = new Blob([JSON.stringify(exportData, null, 2)], {
		type: "application/json",
	});
	zip.file("assembly-instructions.json", jsonBlob);

	// Add model file if available
	if (modelUrl) {
		try {
			const response = await fetch(modelUrl);
			const modelBlob = await response.blob();
			const modelFileName = modelUrl.split("/").pop() || "model.glb";
			zip.file(modelFileName, modelBlob);
		} catch (error) {
			console.error("Error adding model to zip:", error);
		}
	}

	// Generate and download zip
	const zipBlob = await zip.generateAsync({ type: "blob" });
	const url = URL.createObjectURL(zipBlob);
	const a = document.createElement("a");
	a.href = url;
	a.download = "assembly-package.zip";
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
	onSuccess?.();
};
