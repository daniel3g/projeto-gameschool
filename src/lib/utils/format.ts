export function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}

export function formatCoins(value: number) {
  return `${value} coins`;
}

export function formatXp(value: number) {
  return `${value} XP`;
}
