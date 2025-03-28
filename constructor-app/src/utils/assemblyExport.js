/**
 * Utility functions for exporting assembly instructions
 */
import JSZip from "jszip";

/**
 * Export assembly instructions as a JSON file
 * @param {Object} assemblyInstructions - The assembly instructions object
 */
export const exportAsJson = (assemblyInstructions) => {
	// Convert to JSON string with nice formatting
	const jsonContent = JSON.stringify(assemblyInstructions, null, 2);

	// Create a blob with the JSON content
	const blob = new Blob([jsonContent], { type: "application/json" });

	// Download the file
	downloadFile(blob, "assembly-instructions.json");
};

/**
 * Create and download a ZIP package containing both the assembly instructions and model file
 * @param {Object} assemblyInstructions - The assembly instructions object
 * @param {File|Blob} modelFile - The 3D model file
 * @param {string} modelFileName - The name of the model file
 */
export const createPackage = async (
	assemblyInstructions,
	modelFile,
	modelFileName,
) => {
	try {
		// Create a new instance of JSZip
		const zip = new JSZip();

		// Convert the assembly instructions to JSON and add to the zip
		const jsonContent = JSON.stringify(assemblyInstructions, null, 2);
		zip.file("assembly-instructions.json", jsonContent);

		// Add the model file to the zip
		zip.file(modelFileName, modelFile);

		// Generate the zip file as a blob
		const zipBlob = await zip.generateAsync({
			type: "blob",
			compression: "DEFLATE",
			compressionOptions: { level: 6 }, // Medium compression level
		});

		// Download the zip file
		downloadFile(zipBlob, "assembly-package.zip");

		return true;
	} catch (error) {
		console.error("Error creating package:", error);
		return false;
	}
};

/**
 * Helper function to download a file from a blob
 * @param {Blob} blob - The file blob
 * @param {string} filename - The desired filename
 */
const downloadFile = (blob, filename) => {
	// Create a URL for the blob
	const url = URL.createObjectURL(blob);

	// Create a temporary anchor element to trigger the download
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;

	// Append to the body, click, and remove
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);

	// Release the URL object
	URL.revokeObjectURL(url);
};
