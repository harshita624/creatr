import { createTheme } from "@clerk/ui/themes/experimental";

export const ClerkTheme = createTheme({
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