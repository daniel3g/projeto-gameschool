export default async function AdminStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <main>Placeholder: perfil administrativo do aluno {id}.</main>;
}
