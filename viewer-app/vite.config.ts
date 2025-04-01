import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import tailwindcssPlugin from "@tailwindcss/vite";
// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react(), tailwindcssPlugin()],
	build: {
		sourcemap: "hidden",
		minify: "esbuild",
		target: "esnext",
		outDir: "dist",
		chunkSizeWarningLimit: 1000,
		rollupOptions: {
			output: {
				manualChunks: {
					vendor: ["react", "react-dom"],
					three: ["three", "three-stdlib"],
				},
			},
		},
	},
});
