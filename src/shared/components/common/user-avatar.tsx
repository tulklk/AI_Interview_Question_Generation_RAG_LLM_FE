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
      <div className="hidden sm:flex sm:flex-col sm:items-end gap-0.5">
        <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 leading-tight">
          {name}
        </p>
        {plan && (
          <span className="inline-block text-[10px] font-bold px-1.5 py-px rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 leading-none">
            {plan}
          </span>
        )}
      </div>
    </div>
  );
}
