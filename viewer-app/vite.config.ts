import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		react(),
		tailwindcss(),
	],
	server: {
		port: 3000,
		strictPort: false,
	},
	build: {
		sourcemap: "hidden",
		minify: "esbuild",
		target: "esnext",
		cssCodeSplit: true,
		reportCompressedSize: false,
		chunkSizeWarningLimit: 1000,
		emptyOutDir: true,
		outDir: "build",
		assetsInlineLimit: 4096,
		rollupOptions: {
			output: {
				manualChunks: (id) => {
					if (id.includes('node_modules')) {
						if (id.includes('react') || id.includes('react-dom')) {
							return 'react-vendor';
						}
						
						if (id.includes('@emotion') || id.includes('framer-motion')) {
							return 'animation-vendor';
						}
						
						return 'vendor';
					}
				},
				chunkFileNames: "assets/js/[name]-[hash].js",
				entryFileNames: "assets/js/[name]-[hash].js",
				assetFileNames: "assets/[ext]/[name]-[hash].[ext]",
			},
		},
	},
	optimizeDeps: {
		include: ['react', 'react-dom'],
		esbuildOptions: {
			target: 'esnext',
		},
	},
	esbuild: {
		logOverride: { 'this-is-undefined-in-esm': 'silent' },
		legalComments: 'none',
	},
});
