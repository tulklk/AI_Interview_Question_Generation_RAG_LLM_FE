const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

export class AvatarUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AvatarUploadError";
  }
}

export function validateAvatarFile(file: File): void {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new AvatarUploadError("invalid_type");
  }
  if (file.size > MAX_AVATAR_BYTES) {
    throw new AvatarUploadError("too_large");
  }
}

function getCloudinaryConfig(): { cloudName: string; uploadPreset: string } {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET?.trim();

  if (!cloudName || !uploadPreset) {
    throw new AvatarUploadError("missing_config");
  }

  return { cloudName, uploadPreset };
}

interface CloudinaryUploadResponse {
  secure_url?: string;
  error?: { message?: string };
}

/** Upload avatar to Cloudinary and return the secure URL string. */
export async function uploadAvatarToCloudinary(file: File): Promise<string> {
  validateAvatarFile(file);

  const { cloudName, uploadPreset } = getCloudinaryConfig();
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);
  formData.append("folder", "avatars");

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body: formData }
  );

  const data = (await res.json()) as CloudinaryUploadResponse;

  if (!res.ok) {
    throw new AvatarUploadError(data.error?.message || "upload_failed");
  }

  const url = data.secure_url?.trim();
  if (!url) {
    throw new AvatarUploadError("upload_failed");
  }

  return url;
}
