// The theme is applied before the page renders by the inline script in
// app/layout.tsx (saved choice, otherwise the system setting), and toggled by
// the button in the Header. Nothing else is needed here.
export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
