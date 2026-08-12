import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" garde des chemins relatifs afin que le build fonctionne
// une fois déployé sur GitHub Pages (https://<user>.github.io/<repo>/)
export default defineConfig({
  plugins: [react()],
  base: "./"
});
