import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
    title: "GitHub Issue Bot",
    description: "Create GitHub issues from Telegram",
};

export default function AppLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return children;
}
