import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vite.dev/config/
export default defineConfig({
	plugins: [react()],
	preview: {
		host: true,
		allowedHosts: ["www.assembly3d.ru", "assembly3d.ru"],
	},
	server: {
		host: true,
		allowedHosts: ["www.assembly3d.ru", "assembly3d.ru"],
	},
});
