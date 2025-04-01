import type { InstructionStep } from "../../common/types";

export interface ExportData {
  version: string;
  createdAt: string;
  assemblyStages: InstructionStep[];
  availableParts: string[];
}

export const exportInstructions = (
  instructions: InstructionStep[],
  availableParts: string[],
  onSuccess?: () => void
): void => {
  const exportData: ExportData = {
    version: "1.0",
    createdAt: new Date().toISOString(),
    assemblyStages: instructions,
    availableParts: availableParts,
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "assembly-instructions.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  onSuccess?.();
}; 