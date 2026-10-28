import { describe, expect, it, vi } from "vitest";
import {
  buildFitCompatibility,
  convertMeasurementValue,
  createDefaultProfile,
  normalizeProfile,
} from "../utils/bodyProfile.js";
import { mediaUrl } from "../utils/api.js";
import {
  loadProfile,
  saveProfile,
  upsertGarmentImage,
} from "../utils/wardrobeStorage.js";
import { resolveImageSource } from "../utils/imageCache.js";

describe("body profile utilities", () => {
  it("converts centimetres to inches correctly", () => {
    expect(convertMeasurementValue(10, "cm", "in")).toBeCloseTo(3.937, 3);
  });

  it("saves and loads a partial profile without inferencing measurements", () => {
    const profile = createDefaultProfile({
      height: 170,
      heightUnit: "cm",
      fitNotes: "Tall torso",
    });
    const saved = saveProfile(profile);
    const loaded = loadProfile();
    expect(saved.height).toBe(170);
    expect(loaded.height).toBe(170);
    expect(loaded.measurements).toEqual([]);
    expect(loaded.fitNotes).toBe("Tall torso");
  });

  it("normalizes legacy profile data where measurements is an object instead of an array", () => {
    const normalized = normalizeProfile({
      height: 170,
      heightUnit: "cm",
      measurements: { chest: 92, waist: 70 },
      fitPreferences: { tops: "regular" },
    });

    expect(Array.isArray(normalized.measurements)).toBe(true);
    expect(normalized.measurements).toEqual([]);
    expect(normalized.fitPreferences).toEqual({ tops: "regular" });
  });

  it("does not penalize missing measurements when scoring fit", () => {
    const profile = createDefaultProfile({
      fitPreferences: { tops: "regular", bottoms: "straight" },
    });
    const outfit = [
      {
        id: "t1",
        category: "top",
        fit_and_proportions: {
          apparent_fit: "regular",
          relative_length: "regular",
          relative_volume: "medium",
        },
        name: "Tee",
      },
      {
        id: "b1",
        category: "bottom",
        fit_and_proportions: {
          apparent_fit: "straight",
          relative_length: "regular",
          relative_volume: "medium",
        },
        name: "Pants",
      },
    ];

    const score = buildFitCompatibility(outfit, profile);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it("prefers a garment size that matches the profile over a clearly mismatched size", () => {
    const profile = createDefaultProfile({
      measurements: [
        { name: "waistCircumference", value: 72, unit: "cm" },
        { name: "chestCircumference", value: 96, unit: "cm" },
      ],
      fitPreferences: { tops: "regular", bottoms: "straight" },
    });

    const matchingOutfit = [
      {
        id: "m-top",
        category: "top",
        size: "M",
        fit: "regular",
        fit_and_proportions: {
          apparent_fit: "regular",
          relative_length: "regular",
          relative_volume: "medium",
        },
        measurements: [
          { name: "chestCircumference", value: 96, unit: "cm" },
          { name: "waistCircumference", value: 72, unit: "cm" },
        ],
      },
      {
        id: "m-bottom",
        category: "bottom",
        size: "32",
        fit: "straight",
        fit_and_proportions: {
          apparent_fit: "straight",
          relative_length: "regular",
          relative_volume: "medium",
        },
        measurements: [{ name: "waistCircumference", value: 74, unit: "cm" }],
      },
    ];

    const mismatchedOutfit = [
      {
        id: "xl-top",
        category: "top",
        size: "XXL",
        fit: "regular",
        fit_and_proportions: {
          apparent_fit: "regular",
          relative_length: "regular",
          relative_volume: "medium",
        },
        measurements: [
          { name: "chestCircumference", value: 96, unit: "cm" },
          { name: "waistCircumference", value: 72, unit: "cm" },
        ],
      },
      {
        id: "xl-bottom",
        category: "bottom",
        size: "42",
        fit: "straight",
        fit_and_proportions: {
          apparent_fit: "straight",
          relative_length: "regular",
          relative_volume: "medium",
        },
        measurements: [{ name: "waistCircumference", value: 74, unit: "cm" }],
      },
    ];

    expect(buildFitCompatibility(matchingOutfit, profile)).toBeGreaterThan(
      buildFitCompatibility(mismatchedOutfit, profile),
    );
  });

  it("leaves absolute image URLs alone and updates a garment's uploaded image metadata without dropping the rest of the record", () => {
    const cloudinaryUrl =
      "https://res.cloudinary.com/example/image/upload/v1/fitzii/garments/photo.jpg";
    expect(mediaUrl(cloudinaryUrl)).toBe(cloudinaryUrl);

    const clothes = [
      { id: "g-1", name: "Blue tee", category: "top", status: "available" },
      {
        id: "g-2",
        name: "Black jeans",
        category: "bottom",
        status: "available",
      },
    ];

    const next = upsertGarmentImage(clothes, "g-1", {
      image_path: "/media/generated-image.jpg",
      thumbnail_path: "/media/generated-image-thumb.jpg",
    });

    expect(next[0].image_path).toBe("/media/generated-image.jpg");
    expect(next[0].thumbnail_path).toBe("/media/generated-image-thumb.jpg");
    expect(next[1].image_path).toBeUndefined();
  });

  it("stores fetched image bytes as a persistent data URL instead of a temporary blob URL", async () => {
    const sourceUrl = "https://example.com/garment.jpg";
    const blob = new Blob(["persisted image"], { type: "image/jpeg" });
    const blobUrl = "blob:example/garment";
    const originalCreateObjectURL = URL.createObjectURL;
    const originalFetch = global.fetch;

    URL.createObjectURL = vi.fn(() => blobUrl);
    global.fetch = vi.fn(async () => ({
      ok: true,
      blob: async () => blob,
    }));

    try {
      const resolved = await resolveImageSource(sourceUrl, {
        isOffline: false,
        readCache: async () => null,
        fetchUrl: async () => blobUrl,
      });

      expect(resolved).toMatch(/^data:image\/jpeg;base64,/);
    } finally {
      URL.createObjectURL = originalCreateObjectURL;
      global.fetch = originalFetch;
    }
  });

  it("prefers a cached data URL when the browser is offline", async () => {
    const cachedUrl = "data:image/jpeg;base64,ZmFrZQ==";

    const resolved = await resolveImageSource(
      "https://example.com/garment.jpg",
      {
        isOffline: true,
        readCache: async () => cachedUrl,
      },
    );

    expect(resolved).toBe(cachedUrl);
  });
});
