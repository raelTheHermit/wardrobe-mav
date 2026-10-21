import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const repoRoot = resolve(process.cwd(), "..");
const scriptPath = resolve(repoRoot, "backend/recommendations.mjs");

describe("recommendation script", () => {
  it("executes and produces outfits from the shared engine", () => {
    const payload = {
      garments: [
        {
          id: "top-1",
          name: "Tee",
          category: "top",
          status: "available",
          style: "minimal",
          material: "cotton",
          color: "ivory",
          fit: "relaxed",
          silhouette: "straight",
        },
        {
          id: "bottom-1",
          name: "Trousers",
          category: "bottom",
          status: "available",
          style: "minimal",
          material: "wool",
          color: "stone",
          fit: "relaxed",
          silhouette: "straight",
        },
        {
          id: "shoe-1",
          name: "Sneakers",
          category: "shoe",
          status: "available",
          style: "sporty",
          material: "canvas",
          color: "white",
          fit: "standard",
          silhouette: "casual",
        },
      ],
      context: "casual",
      preferences: {
        aesthetic: "clean",
        styles: ["minimal"],
        colors: ["ivory"],
      },
      history: [],
      limit: 3,
      profile: null,
    };

    const result = spawnSync(process.execPath, [scriptPath], {
      cwd: repoRoot,
      input: JSON.stringify(payload),
      encoding: "utf-8",
    });

    if (result.error) throw result.error;
    expect(result.status).toBe(0);
    const output = JSON.parse(result.stdout);
    expect(Array.isArray(output)).toBe(true);
    expect(output.length).toBeGreaterThan(0);
  });
});
