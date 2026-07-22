import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import Header from "@/components/header";
import { ClerkProvider } from "@clerk/nextjs";
import { ClerkTheme } from "@/lib/clerk-theme";
import { ConvexClientProvider } from "@/components/convex-client-provider";
import CreatorCopilot from "@/components/creator-copilot";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "CreateK",
  description: "Create, manage, and share your content with smart creator tools",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* <link rel="icon" href="/logo-text.png" sizes="any" /> */}
      </head>
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <ClerkProvider
            publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
            appearance={{
              baseTheme: ClerkTheme,
              variables: {
                colorPrimary: "#9333ea", // Purple-600
                colorBackground: "#ffffff",
                colorText: "#1f2937", // Gray-800
                colorTextSecondary: "#6b7280", // Gray-500
                colorDanger: "#ef4444", // Red-500
                colorSuccess: "#10b981", // Emerald-500
                colorNeutral: "#f3f4f6", // Gray-100
                colorInputBackground: "#ffffff",
                colorInputText: "#1f2937",
                fontSize: "1rem",
                fontFamily: inter.style.fontFamily,
                borderRadius: "0.75rem",
              },
              elements: {
                formButtonPrimary: {
                  background: "linear-gradient(135deg, #9333ea 0%, #ec4899 100%)",
                  "&:hover": {
                    background: "linear-gradient(135deg, #7c3aed 0%, #db2777 100%)",
                  },
                },
                card: {
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                  border: "1px solid #e5e7eb",
                },
                headerTitle: {
                  color: "#1f2937",
                },
                headerSubtitle: {
                  color: "#6b7280",
                },
                socialButtonsBlockButton: {
                  border: "1px solid #e5e7eb",
                  "&:hover": {
                    backgroundColor: "#f9fafb",
                  },
                },
                formFieldInput: {
                  border: "1px solid #d1d5db",
                  "&:focus": {
                    borderColor: "#9333ea",
                    boxShadow: "0 0 0 3px rgba(147, 51, 234, 0.1)",
                  },
                },
                footerActionLink: {
                  color: "#9333ea",
                  "&:hover": {
                    color: "#7c3aed",
                  },
                },

                // ── UserButton popover menu — explicitly set text/icon
                // colors here since Clerk's default popover action-button
                // text is a very light gray by default, and nothing was
                // overriding it before (see note in lib/clerk-theme.js).
                userButtonPopoverCard: {
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                  border: "1px solid #e5e7eb",
                },
                userButtonPopoverMain: {
                  backgroundColor: "#ffffff",
                },
                userButtonPopoverActionButton: {
                  color: "#1f2937",
                  "&:hover": {
                    backgroundColor: "#f9fafb",
                  },
                },
                userButtonPopoverActionButtonText: {
                  color: "#1f2937",
                  fontWeight: 500,
                },
                userButtonPopoverActionButtonIcon: {
                  color: "#6b7280",
                },
                userButtonPopoverIdentifier: {
                  color: "#6b7280",
                },
                userButtonPopoverFooter: {
                  color: "#6b7280",
                },
              },
            }}
          >
            <ConvexClientProvider>
              <div className="fixed inset-0 -z-10 bg-[linear-gradient(135deg,#fff7ed_0%,#fbf7ff_48%,#eef9ff_100%)]" />
              
              <Header />
              
              <main className="min-h-screen text-gray-900 overflow-x-hidden">
                <Toaster 
                  richColors 
                  position="top-right"
                  toastOptions={{
                    style: {
                      background: 'white',
                      color: '#1f2937',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                    },
                    className: 'rounded-xl',
                  }}
                />
                {children}
                <CreatorCopilot />
              </main>
            </ConvexClientProvider>
          </ClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}