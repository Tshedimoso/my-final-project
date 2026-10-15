
import { defineConfig } from "vite";

export default defineConfig({
    base: "/my-final-project/",
    build: {
        outDir: "docs",
        emptyOutDir: true,
    },
});
