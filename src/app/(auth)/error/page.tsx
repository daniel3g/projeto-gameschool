export default function AuthErrorPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center p-6">
      <section className="w-full rounded-2xl border border-red-200 bg-red-50 p-8">
        <h1 className="text-2xl font-semibold text-red-900">
          Erro de autenticacao
        </h1>
        <p className="mt-2 text-sm text-red-800">
          Placeholder para exibir erros vindos do fluxo de autenticacao.
        </p>
      </section>
    </main>
  );
}
