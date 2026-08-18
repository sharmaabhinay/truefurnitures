import { signCloudinaryUpload } from "@/lib/upload.functions";

export type UploadedFile = { url: string; publicId: string };

/**
 * Uploads a file straight to Cloudinary using a server-signed payload.
 * Images and 3D models both go here — Firebase Storage is not used.
 */
export async function uploadToCloudinary(
  file: File,
  folder: string,
  resourceType: "image" | "raw" | "auto" = "auto",
): Promise<UploadedFile> {
  const sig = await signCloudinaryUpload({ data: { folder, resourceType } });
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sig.apiKey);
  form.append("timestamp", String(sig.timestamp));
  form.append("signature", sig.signature);
  form.append("folder", sig.folder);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/${resourceType}/upload`, {
    method: "POST",
    body: form,
  });
  const json = (await res.json()) as { secure_url?: string; public_id?: string; error?: { message?: string } };
  if (!res.ok || !json.secure_url) {
    throw new Error(json.error?.message ?? "Cloudinary upload failed");
  }
  return { url: json.secure_url, publicId: json.public_id ?? "" };
}
