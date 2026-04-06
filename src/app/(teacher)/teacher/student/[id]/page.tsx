export default async function TeacherStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <main>Placeholder: detalhes do aluno {id}.</main>;
}
