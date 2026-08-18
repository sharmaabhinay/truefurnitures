import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Returns a short-lived Cloudinary upload signature so the browser can upload directly. */
export const signCloudinaryUpload = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        folder: z.string().min(1).max(120),
        resourceType: z.enum(["image", "raw", "auto"]).default("auto"),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const cloudName = process.env["CLOUDINARY_CLOUD_NAME"];
    const apiKey = process.env["CLOUDINARY_API_KEY"];
    const apiSecret = process.env["CLOUDINARY_API_SECRET"];
    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error("Cloudinary is not configured on the server");
    }
    const timestamp = Math.floor(Date.now() / 1000);
    const params = `folder=${data.folder}&timestamp=${timestamp}`;
    const bytes = new TextEncoder().encode(params + apiSecret);
    const digest = await crypto.subtle.digest("SHA-1", bytes);
    const signature = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return { cloudName, apiKey, timestamp, signature, folder: data.folder, resourceType: data.resourceType };
  });
