type Props = {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
};

export default function Button({
  children,
  onClick,
  variant = "secondary",
  className = "",
}: Props) {
  const base =
    "px-3 py-1.5 text-sm rounded-lg transition-colors duration-150";

  const variants = {
    primary:
      "bg-foreground text-background hover:opacity-90",

    secondary:
      `
      border border-zinc-300 dark:border-zinc-700
      bg-background
      hover:bg-zinc-100 dark:hover:bg-zinc-800
      `,

    ghost:
      `
      hover:bg-zinc-100
      dark:hover:bg-zinc-800
      `,
  };

  return (
    <button
      onClick={onClick}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}