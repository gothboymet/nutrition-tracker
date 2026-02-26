type Props = {
  label: string;
  current: number;
  target: number;
};

export default function MacroCircle({
  label,
  current,
  target,
}: Props) {
  const radius = 40;
  const stroke = 8;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;

  const ratio = current / target;
  const progress = Math.min(ratio, 1);

  const strokeDashoffset =
    circumference - progress * circumference;

  const overflow = ratio > 1;

  const overflowRatio = overflow ? ratio - 1 : 0;
  const overflowProgress = Math.min(overflowRatio, 1);

  const overflowDashoffset =
    circumference - overflowProgress * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg height={radius * 2} width={radius * 2}>
        <circle
          stroke="#e5e5e5"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />

        <circle
          stroke="black"
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          transform={`rotate(-90 ${radius} ${radius})`}
        />

        {overflow && (
          <circle
            stroke="white"
            fill="transparent"
            strokeWidth={stroke * 0.6}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={overflowDashoffset}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            transform={`rotate(-90 ${radius} ${radius})`}
          />
        )}
      </svg>

      <div className="text-xs mt-2 text-center space-y-0.5">
        <div className="font-semibold">
          {current.toFixed(1)}
        </div>
        <div className="text-gray-500 text-[11px]">
          / {target.toFixed(0)}
        </div>
        <div className="text-gray-500">
          {label}
        </div>
      </div>
    </div>
  );
}