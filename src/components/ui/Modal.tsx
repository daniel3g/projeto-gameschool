type ModalProps = {
  title: string;
  children?: React.ReactNode;
};

export function Modal({ title, children }: ModalProps) {
  return (
    <section
      aria-label={title}
      className="rounded-xl border border-black/10 bg-white p-4 shadow-sm"
    >
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
