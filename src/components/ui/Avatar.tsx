type AvatarProps = {
  alt: string;
  src?: string | null;
};

export function Avatar({ alt, src }: AvatarProps) {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-200 text-xs text-zinc-600">
      {src ? alt.slice(0, 1).toUpperCase() : "?"}
    </div>
  );
}
