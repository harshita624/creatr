// lib/clerk-theme.js
// Custom light theme for Clerk components.
//
// IMPORTANT: `baseTheme` (passed to <ClerkProvider appearance={{ baseTheme }}>)
// must be built with Clerk's own `experimental_createTheme` helper — it
// expects a `{ variables, elements }` shape, the same as the main `appearance`
// prop. A hand-rolled `{ general: {...}, colors: {...} }` object (the old
// version of this file) doesn't match that shape, so Clerk silently ignores
// it entirely. That's why the popover menu text kept looking washed out no
// matter what was in here — this file was never actually being applied.

import { experimental_createTheme } from "@clerk/themes";

export const ClerkTheme = experimental_createTheme({
  variables: {
    colorPrimary: "#9333ea", // Purple-600
    colorBackground: "#ffffff",
    colorText: "#1f2937", // Gray-800
    colorTextSecondary: "#6b7280", // Gray-500
    colorInputBackground: "#ffffff",
    colorInputText: "#1f2937",
    colorDanger: "#ef4444", // Red-500
    colorSuccess: "#10b981", // Emerald-500
    colorWarning: "#f59e0b", // Amber-500
    borderRadius: "0.75rem",
    fontSize: "1rem",
  },
});