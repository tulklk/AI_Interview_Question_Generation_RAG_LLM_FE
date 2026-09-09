import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Be_Vietnam_Pro } from "next/font/google";
import Script from "next/script";
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
      <body>
        {/*
          Next.js 16 / React 19: thẻ <script> thô trong body component gây console error
          và không chạy khi hydrate. Dùng next/script beforeInteractive — inject sớm từ HTML SSR.
        */}
        <Script id="hiregen-scroll-restore" strategy="beforeInteractive">
          {`(function(){try{history.scrollRestoration='manual';}catch(e){}try{window.scrollTo(0,0);}catch(e){}})();`}
        </Script>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
