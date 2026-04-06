export default function TeacherLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col p-6">
        <header className="mb-6 border-b border-black/10 pb-4">
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Area do professor
          </p>
        </header>
        {children}
      </div>
    </div>
  );
}
