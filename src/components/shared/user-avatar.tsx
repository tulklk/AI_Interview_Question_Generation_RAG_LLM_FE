interface UserAvatarProps {
  initials: string;
  name: string;
  plan?: string;
}

export function UserAvatar({ initials, name, plan }: UserAvatarProps) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-full bg-[#6c47ff] flex items-center justify-center shrink-0">
        <span className="text-white text-xs font-bold">{initials}</span>
      </div>
      <div className="hidden sm:block text-right">
        <p className="text-xs font-semibold text-gray-800 leading-tight">
          {name}
        </p>
        {plan && (
          <p className="text-[10px] text-gray-400 leading-tight">{plan}</p>
        )}
      </div>
    </div>
  );
}
