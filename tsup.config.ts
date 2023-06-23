import { defineConfig } from "tsup";

export default defineConfig({
  target: "es6",
  clean: true,
  sourcemap: true,
  splitting: true,
  dts: true,
  treeshake: true,
  entry: ["./src/index.ts"],
  format: ["cjs", "esm"],
  outDir: "dist",
  esbuildPlugins: [],
  esbuildOptions(_options, _context) {
    // the directory structure will be the same as the source
    // options.outbase = "./";
  },
});
