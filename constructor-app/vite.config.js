import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import tailwindcssPlugin from "@tailwindcss/postcss";
import autoprefixer from "autoprefixer";

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react()],
	build: {
		watch: false,
		sourcemap: "hidden",
		minify: "esbuild",
		target: "esnext",
		outDir: "build",
		rollupOptions: {
			output: {
				manualChunks: {
					vendor: ["react", "react-dom"],
				},
				chunkFileNames: "assets/js/[name]-[hash].js",
				entryFileNames: "assets/js/[name]-[hash].js",
				assetFileNames: "assets/[ext]/[name]-[hash].[ext]",
			},
		},
	},
});