// Run the real TypeScript/React modules in Node without adding a test bundler.
import { readFile } from "node:fs/promises";
import { transpileModule, ModuleKind, ScriptTarget, JsxEmit } from "typescript";

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (error.code !== "ERR_MODULE_NOT_FOUND" || !specifier.startsWith(".")) throw error;
    for (const extension of [".ts", ".tsx"]) {
      try {
        return await nextResolve(specifier + extension, context);
      } catch (candidateError) {
        if (candidateError.code !== "ERR_MODULE_NOT_FOUND") throw candidateError;
      }
    }
    throw error;
  }
}

export async function load(url, context, nextLoad) {
  if (!/\.tsx?$/.test(url)) return nextLoad(url, context);
  const source = (await readFile(new URL(url), "utf8"))
    .replaceAll("import.meta.env", JSON.stringify({ VITE_API_BASE_URL: "/api", DEV: false }));
  const { outputText } = transpileModule(source, {
    fileName: new URL(url).pathname,
    compilerOptions: { module: ModuleKind.ESNext, target: ScriptTarget.ES2022, jsx: JsxEmit.ReactJSX },
  });
  return { format: "module", source: outputText, shortCircuit: true };
}
