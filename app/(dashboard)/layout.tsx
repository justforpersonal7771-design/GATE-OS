import { ThemeProvider } from "@/components/theme-provider";
import { ClientLayout } from "@/components/layout/client-layout";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <ClientLayout>
        {children}
      </ClientLayout>
    </ThemeProvider>
  );
}
