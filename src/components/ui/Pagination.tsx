type PaginationProps = {
  page: number;
  totalPages: number;
};

export function Pagination({ page, totalPages }: PaginationProps) {
  return (
    <div className="text-sm text-zinc-500">
      Pagina {page} de {totalPages}
    </div>
  );
}
