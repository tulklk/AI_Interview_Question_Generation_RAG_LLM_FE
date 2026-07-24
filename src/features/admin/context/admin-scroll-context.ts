import { createContext, type RefObject } from "react";

export const AdminScrollContext = createContext<RefObject<HTMLElement | null>>({ current: null });
