import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

function cloudinaryCreds() {
  const cloudName = process.env["CLOUDINARY_CLOUD_NAME"];
  const apiKey = process.env["CLOUDINARY_API_KEY"];
  const apiSecret = process.env["CLOUDINARY_API_SECRET"];
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary is not configured on the server");
  }
  return { cloudName, apiKey, apiSecret };
}

async function sha1Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Returns a short-lived Cloudinary upload signature so the browser can upload directly. */
export const signCloudinaryUpload = createServerFn({ method: "POST" })
  .validator((data) =>
    z
      .object({
        folder: z.string().min(1).max(120),
        resourceType: z.enum(["image", "raw", "auto"]).default("auto"),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { cloudName, apiKey, apiSecret } = cloudinaryCreds();
    const timestamp = Math.floor(Date.now() / 1000);
    const params = `folder=${data.folder}&timestamp=${timestamp}`;
    const signature = await sha1Hex(params + apiSecret);
    return { cloudName, apiKey, timestamp, signature, folder: data.folder, resourceType: data.resourceType };
  });

/**
 * Imports a file into Cloudinary from a remote URL (admin file manager's
 * "upload by link"). Cloudinary fetches the URL itself, so the source server
 * only needs to be publicly reachable — no browser CORS issues.
 */
export const uploadFromUrl = createServerFn({ method: "POST" })
  .validator((data) =>
    z
      .object({
        url: z.string().url().max(2000),
        folder: z.string().min(1).max(120),
        resourceType: z.enum(["image", "raw", "video", "auto"]).default("auto"),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { cloudName, apiKey, apiSecret } = cloudinaryCreds();
    if (!/^https?:\/\//i.test(data.url)) throw new Error("Only http(s) links can be imported");
    const timestamp = Math.floor(Date.now() / 1000);
    const params = `folder=${data.folder}&timestamp=${timestamp}`;
    const signature = await sha1Hex(params + apiSecret);
    const form = new FormData();
    form.append("file", data.url);
    form.append("api_key", apiKey);
    form.append("timestamp", String(timestamp));
    form.append("signature", signature);
    form.append("folder", data.folder);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${data.resourceType}/upload`, {
      method: "POST",
      body: form,
    });
    const json = (await res.json().catch(() => ({}))) as {
      secure_url?: string;
      public_id?: string;
      bytes?: number;
      resource_type?: string;
      error?: { message?: string };
    };
    if (!res.ok || !json.secure_url) {
      throw new Error(json.error?.message ?? `Import failed (HTTP ${res.status})`);
    }
    return {
      url: json.secure_url,
      publicId: json.public_id ?? "",
      size: json.bytes ?? 0,
      kind: json.resource_type ?? data.resourceType,
    };
  });
