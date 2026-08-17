"use client";

import type { InvitePayload } from "@/features/hr/services/recommendation.service";

export interface InviteScheduleState {
  scheduledLocal: string;
  timeZoneId: string;
  meetingMode: "" | "ONLINE" | "ONSITE";
  meetingLink: string;
  location: string;
}

export function defaultInviteSchedule(): InviteScheduleState {
  return {
    scheduledLocal: "",
    timeZoneId: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    meetingMode: "",
    meetingLink: "",
    location: "",
  };
}

export function toInvitePayload(message: string, s: InviteScheduleState): InvitePayload {
  const scheduledAtUtc = s.scheduledLocal
    ? new Date(s.scheduledLocal).toISOString()
    : null;
  return {
    message,
    scheduledAtUtc,
    timeZoneId: scheduledAtUtc ? s.timeZoneId : null,
    meetingMode: s.meetingMode || null,
    meetingLink: s.meetingMode === "ONLINE" ? s.meetingLink.trim() || null : null,
    location: s.meetingMode === "ONSITE" ? s.location.trim() || null : null,
  };
}

export function InviteScheduleFields({
  value,
  onChange,
  labels,
}: {
  value: InviteScheduleState;
  onChange: (next: InviteScheduleState) => void;
  labels: {
    scheduleAt: string;
    timezone: string;
    meetingMode: string;
    modeNone: string;
    modeOnline: string;
    modeOnsite: string;
    meetingLink: string;
    location: string;
  };
}) {
  const inputCls =
    "w-full h-9 px-3 text-[13px] bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:border-primary text-gray-900 dark:text-gray-100";
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
      <label className="flex flex-col gap-1 text-[11px] font-medium text-gray-500">
        {labels.scheduleAt}
        <input
          type="datetime-local"
          value={value.scheduledLocal}
          onChange={(e) => onChange({ ...value, scheduledLocal: e.target.value })}
          className={inputCls}
        />
      </label>
      <label className="flex flex-col gap-1 text-[11px] font-medium text-gray-500">
        {labels.timezone}
        <input
          value={value.timeZoneId}
          onChange={(e) => onChange({ ...value, timeZoneId: e.target.value })}
          className={inputCls}
        />
      </label>
      <label className="flex flex-col gap-1 text-[11px] font-medium text-gray-500">
        {labels.meetingMode}
        <select
          value={value.meetingMode}
          onChange={(e) =>
            onChange({ ...value, meetingMode: e.target.value as InviteScheduleState["meetingMode"] })
          }
          className={inputCls}
        >
          <option value="">{labels.modeNone}</option>
          <option value="ONLINE">{labels.modeOnline}</option>
          <option value="ONSITE">{labels.modeOnsite}</option>
        </select>
      </label>
      {value.meetingMode === "ONLINE" ? (
        <label className="flex flex-col gap-1 text-[11px] font-medium text-gray-500">
          {labels.meetingLink}
          <input
            type="url"
            value={value.meetingLink}
            onChange={(e) => onChange({ ...value, meetingLink: e.target.value })}
            className={inputCls}
          />
        </label>
      ) : value.meetingMode === "ONSITE" ? (
        <label className="flex flex-col gap-1 text-[11px] font-medium text-gray-500">
          {labels.location}
          <input
            value={value.location}
            onChange={(e) => onChange({ ...value, location: e.target.value })}
            className={inputCls}
          />
        </label>
      ) : (
        <div />
      )}
    </div>
  );
}
