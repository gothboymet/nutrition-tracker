type Props = {
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  className?: string;
};

export default function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  className = "",
}: Props) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`
        bg-background
        text-foreground
        border border-zinc-300 dark:border-zinc-700
        rounded-lg
        px-3 py-1.5
        text-base sm:text-sm
        placeholder:text-zinc-400 dark:placeholder:text-zinc-500
        focus:outline-none
        focus:ring-2
        focus:ring-foreground/20
        transition-colors
        ${className}
      `}
    />
  );
}