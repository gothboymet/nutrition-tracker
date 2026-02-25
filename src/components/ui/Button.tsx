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
      "bg-black text-white hover:bg-gray-800",
    secondary:
      "border border-gray-300 hover:bg-gray-100",
    ghost:
      "hover:bg-gray-100",
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