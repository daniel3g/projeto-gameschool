type XpBarProps = {
  value?: number;
};

export function XpBar({ value = 0 }: XpBarProps) {
  return <div className="text-sm text-zinc-600">XP atual: {value}</div>;
}
