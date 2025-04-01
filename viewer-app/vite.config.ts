import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import tailwindcssPlugin from "@tailwindcss/vite";
// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react(), tailwindcssPlugin()],
	preview: {
		host: true,
		allowedHosts: ["www.assembly3d.ru", "assembly3d.ru"],
	},
	server: {
		host: true,
		allowedHosts: ["www.assembly3d.ru", "assembly3d.ru"],
	},
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
					reactThreeFiber: ["@react-three/fiber"],
					reactThreeDrei: ["@react-three/drei"],
					reactIcons: ["react-icons"],
					framerMotion: ["framer-motion"],
					jszip: ["jszip"],
				},
			},
		},
	},
});
