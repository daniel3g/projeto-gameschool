export default async function TeacherClassPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <main>Placeholder: detalhes da turma {id}.</main>;
}
