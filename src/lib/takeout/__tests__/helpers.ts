import { readFileSync } from "node:fs";
import { join } from "node:path";
import JSZip from "jszip";

export const fixture = (name: string) => readFileSync(join(__dirname, "fixtures", name), "utf8");

export async function makeZip(files: Record<string, string>): Promise<Uint8Array> {
  const zip = new JSZip();
  for (const [path, content] of Object.entries(files)) zip.file(path, content);
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
