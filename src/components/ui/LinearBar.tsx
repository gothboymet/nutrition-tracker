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
  const percentage = Math.min(
    (current / target) * 100,
    100
  );

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span>
          {current.toFixed(1)} / {target}
        </span>
      </div>

      <div className="w-full h-3 bg-gray-200">
        <div
          className={`h-3 ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}