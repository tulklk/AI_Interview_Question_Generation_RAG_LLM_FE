import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  adjustFontFallback: true,
  variable: "--font-be-vietnam-pro",
});

export const metadata: Metadata = {
  title: "HireGen AI – Interview Question Generator",
  description:
    "Generate tailored, role-specific interview questions from job descriptions using AI.",
  icons: {
    icon: "/images/logo.png",
  },
};

/** Cookie theme đã resolve (light|dark) — set bởi ThemeProvider, đọc ở SSR để khỏi FOUC / khỏi <script>. */
const THEME_RESOLVED_COOKIE = "hiregena-theme-resolved";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const resolved = cookieStore.get(THEME_RESOLVED_COOKIE)?.value;
  const isDark = resolved === "dark";

  return (
    <html
      lang="en"
      className={`${beVietnamPro.variable}${isDark ? " dark" : ""}`}
      style={{ colorScheme: isDark ? "dark" : "light" }}
      suppressHydrationWarning
    >
      <head>
        {/*
          Blocking script — runs SYNCHRONOUSLY before any CSS/JS/React.
          Reads localStorage and applies the correct class to <html> immediately,
          preventing any flash of incorrect theme (FOIT) on page load.
          Must stay inline (no src=) so the browser cannot defer it.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{
  var s=localStorage.getItem('hiregena-theme');
  var d=s==='dark'||(s==='system'&&window.matchMedia('(prefers-color-scheme:dark)').matches);
  document.documentElement.classList.toggle('dark',d);
  document.documentElement.style.colorScheme=d?'dark':'light';
}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
