type Props = {
  label: string;
  current: number;
  target: number;
  color: string;
};

export default function LinearBar({
  label,
  current,
  target,
  color,
}: Props) {
  const percentage =
    target > 0
      ? Math.min((current / target) * 100, 100)
      : 0;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-zinc-500 dark:text-zinc-400">
          {current.toFixed(1)} / {target}
        </span>
      </div>

      <div className="w-full h-3 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-3 ${color} rounded-full transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}