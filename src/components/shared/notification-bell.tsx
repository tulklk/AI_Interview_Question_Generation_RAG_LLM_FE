"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";

interface Notification {
  id: number;
  message: string;
  time: string;
  read: boolean;
}

const notifications: Notification[] = [
  {
    id: 1,
    message: "15 questions generated for Senior Frontend Developer",
    time: "2 min ago",
    read: false,
  },
  {
    id: 2,
    message: "Weekly report is ready to view",
    time: "1 hour ago",
    read: false,
  },
  {
    id: 3,
    message: "New feature: Export to DOCX now available",
    time: "1 day ago",
    read: true,
  },
];

interface NotificationBellProps {
  count?: number;
}

export function NotificationBell({ count = 0 }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(notifications);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unread = items.filter((n) => !n.read).length;

  function markAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors"
      >
        <Bell size={15} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-[#6c47ff] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-white rounded-xl border border-gray-100 shadow-xl z-50">
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
            <span className="text-sm font-bold text-gray-900">Notifications</span>
            <button
              onClick={markAllRead}
              className="text-xs font-semibold text-[#6c47ff] hover:text-[#5535dd] transition-colors"
            >
              Mark all read
            </button>
          </div>

          <ul className="py-1">
            {items.map((n) => (
              <li
                key={n.id}
                className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <span
                  className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                    n.read ? "bg-gray-300" : "bg-[#6c47ff]"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug ${n.read ? "text-gray-500" : "text-gray-800 font-medium"}`}>
                    {n.message}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{n.time}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="px-4 py-3 border-t border-gray-100">
            <button className="w-full text-xs font-semibold text-[#6c47ff] hover:text-[#5535dd] transition-colors text-center">
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
