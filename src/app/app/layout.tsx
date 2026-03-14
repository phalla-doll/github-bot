import type { Metadata } from "next";
import Script from "next/script";
import "../globals.css";

export const metadata: Metadata = {
    title: "GitHub Issue Bot",
    description: "Create GitHub issues from Telegram",
};

export default function AppLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return (
        <>
            <Script
                src="https://telegram.org/js/telegram-web-app.js"
                strategy="beforeInteractive"
            />
            {children}
        </>
    );
}
