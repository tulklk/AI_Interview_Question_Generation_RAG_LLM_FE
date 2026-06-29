import type { Translations } from "@/core/i18n/en";

type AvatarUploadMessages = Pick<
  Translations["jobseekerProfilePage"],
  | "uploadPhotoFailed"
  | "invalidPhotoType"
  | "photoTooLarge"
>;

export function mapAvatarUploadError(
  code: string,
  messages: AvatarUploadMessages
): string {
  switch (code) {
    case "invalid_type":
      return messages.invalidPhotoType;
    case "too_large":
      return messages.photoTooLarge;
    default:
      return messages.uploadPhotoFailed;
  }
}
