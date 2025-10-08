import fs from "fs/promises";
import path from "path";

const [outputPath, ...inputFiles] = process.argv.slice(2);

let output = `import { TileType } from ${JSON.stringify(
  path
    .relative(
      path.dirname(outputPath),
      path.resolve(import.meta.dirname, "../src/game/world")
    )
    .replace(path.sep, "/")
)};\n\n`;
for (const fileName of inputFiles) {
  const layout = await fs.readFile(fileName, "utf8");
  const varName = path
    .basename(fileName, ".txt")
    .replace(/[^0-9A-Za-z]+/g, "_")
    .replace(/^([0-9])/, "_$1");
  output += `export const ${varName}: StaticArray<StaticArray<u8>> = `;
  output +=
    "[\n" +
    layout
      .trim()
      .split("\n")
      .map(
        (row, i) =>
          "  [" +
          row
            .trim()
            .split("")
            .map((tile, j) =>
              tile === "."
                ? "TileType.AIR"
                : tile === "*"
                ? "TileType.SPAWN_POINT"
                : tile === "#"
                ? "TileType.BLOCK"
                : tile === "&"
                ? "TileType.EGGABLE_BLOCK"
                : tile === "-"
                ? "TileType.PLATFORM"
                : tile === "%"
                ? "TileType.GATE"
                : tile === "$"
                ? "TileType.SHADOW_GATE"
                : tile === "@"
                ? "TileType.DOOR"
                : (() => {
                    throw new Error(
                      `Invalid tile type at ${path.resolve(
                        fileName
                      )}:${i}:${j}: '${tile}'`
                    );
                  })()
            )
            .join(", ") +
          "],\n"
      )
      .join("") +
    "]";
  output += ";\n";
}
fs.writeFile(outputPath, output, "utf8");
