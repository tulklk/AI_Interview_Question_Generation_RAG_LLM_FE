"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, BellOff } from "lucide-react";

const NOTIF_READ_KEY = "hiregen-notifications-read";

function getReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(NOTIF_READ_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function persistReadIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(NOTIF_READ_KEY, JSON.stringify([...ids]));
  } catch { /* quota exceeded — ignore */ }
}

export interface NotificationItem {
  id: string;
  message: string;
  time: string;
  read: boolean;
  href?: string;
}

interface NotificationBellProps {
  items: NotificationItem[];
  emptyLabel: string;
  title?: string;
  markAllReadLabel?: string;
}

export function NotificationBell({ items, emptyLabel, title = "Notifications", markAllReadLabel = "Mark all read" }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [localItems, setLocalItems] = useState(items);
  const ref = useRef<HTMLDivElement>(null);

  // Merge incoming items with persisted read IDs so "mark all read" survives navigation.
  useEffect(() => {
    const readIds = getReadIds();
    setLocalItems(items.map((n) => ({ ...n, read: n.read || readIds.has(n.id) })));
  }, [items]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unread = localItems.filter((n) => !n.read).length;

  function markAllRead() {
    const readIds = getReadIds();
    localItems.forEach((n) => readIds.add(n.id));
    persistReadIds(readIds);
    setLocalItems((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
      >
        <Bell size={15} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-[#6c47ff] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-xl z-50">
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800">
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{title}</span>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-semibold text-[#6c47ff] hover:text-[#5535dd] transition-colors"
              >
                {markAllReadLabel}
              </button>
            )}
          </div>

          {localItems.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 px-4 text-center">
              <BellOff size={20} className="text-gray-300 dark:text-gray-600" />
              <p className="text-xs text-gray-400 dark:text-gray-500">{emptyLabel}</p>
            </div>
          ) : (
            <ul className="py-1 max-h-80 overflow-y-auto">
              {localItems.map((n) => (
                <li
                  key={n.id}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  <span
                    className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                      n.read ? "bg-gray-300 dark:bg-gray-600" : "bg-[#6c47ff]"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${n.read ? "text-gray-500 dark:text-gray-400" : "text-gray-800 dark:text-gray-100 font-medium"}`}>
                      {n.message}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{n.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
