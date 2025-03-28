import type { ChangeEvent } from "react";
import { motion } from "framer-motion";
import { FiAlertCircle } from "react-icons/fi";
import FileUploader from "./FileUploader";

interface StartPageProps {
  onModelUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onInstructionUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onMultiUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  hasModel: boolean;
  hasInstructions: boolean;
}

const StartPage: React.FC<StartPageProps> = ({
  onModelUpload,
  onInstructionUpload,
  onMultiUpload,
  hasModel,
  hasInstructions,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative w-full h-full overflow-hidden"
    >
      <FileUploader
        onFileUpload={onModelUpload}
        onInstructionUpload={onInstructionUpload}
        onMultiUpload={onMultiUpload}
        hasModel={hasModel}
        hasInstructions={hasInstructions}
      />
      
      {hasModel && !hasInstructions && (
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-8 left-0 right-0 flex justify-center z-20"
        >
          <div className="flex items-center gap-3 px-6 py-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl shadow-lg max-w-2xl">
            <FiAlertCircle className="text-amber-500 flex-shrink-0" size={24} />
            <p className="text-base">
              <span className="font-semibold">Модель загружена.</span> Пожалуйста, загрузите файл инструкций (.json)
            </p>
          </div>
        </motion.div>
      )}
      
      {!hasModel && hasInstructions && (
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-8 left-0 right-0 flex justify-center z-20"
        >
          <div className="flex items-center gap-3 px-6 py-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl shadow-lg max-w-2xl">
            <FiAlertCircle className="text-amber-500 flex-shrink-0" size={24} />
            <p className="text-base">
              <span className="font-semibold">Инструкции загружены.</span> Пожалуйста, загрузите файл модели (.glb, .gltf)
            </p>
          </div>
        </motion.div>
      )}
      
      {/* Background Elements */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -right-32 -top-32 w-[500px] h-[500px] rounded-full bg-red-100 opacity-20 blur-3xl" />
        <div className="absolute -left-32 -bottom-32 w-[500px] h-[500px] rounded-full bg-red-200 opacity-20 blur-3xl" />
      </div>
    </motion.div>
  );
};

export default StartPage; 