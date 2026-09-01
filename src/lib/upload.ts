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
  onProgress?: (percent: number) => void,
): Promise<UploadedFile> {
  const sig = await signCloudinaryUpload({ data: { folder, resourceType } });
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sig.apiKey);
  form.append("timestamp", String(sig.timestamp));
  form.append("signature", sig.signature);
  form.append("folder", sig.folder);

  const url = `https://api.cloudinary.com/v1_1/${sig.cloudName}/${resourceType}/upload`;

  // XHR (not fetch) so we can report real upload progress to the UI.
  const json = await new Promise<{ secure_url?: string; public_id?: string; error?: { message?: string } }>(
    (resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);
      xhr.upload.onprogress = (e) => {
        if (onProgress && e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error("Cloudinary upload failed"));
        }
      };
      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.send(form);
    },
  );

  if (!json.secure_url) throw new Error(json.error?.message ?? "Cloudinary upload failed");
  onProgress?.(100);
  return { url: json.secure_url, publicId: json.public_id ?? "" };
}

