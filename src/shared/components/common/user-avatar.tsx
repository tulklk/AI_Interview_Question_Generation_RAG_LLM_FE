import { AvatarCircle } from "@/shared/components/common/avatar-circle";

interface UserAvatarProps {
  initials: string;
  name: string;
  plan?: string;
  avatarUrl?: string | null;
}

export function UserAvatar({ initials, name, plan, avatarUrl }: UserAvatarProps) {
  return (
    <div className="flex items-center gap-2.5">
      <AvatarCircle avatarUrl={avatarUrl} fullName={name || initials} size="sm" />
      <div className="hidden sm:block text-right">
        <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 leading-tight">
          {name}
        </p>
        {plan && (
          <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight">{plan}</p>
        )}
      </div>
    </div>
  );
}
