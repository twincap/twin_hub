export function moveArrayItem<T>(items: T[], fromIndex: number, toIndex: number) {
  if (fromIndex < 0 || fromIndex >= items.length || toIndex < 0 || toIndex >= items.length) {
    return items;
  }

  const next = [...items];
  const [item] = next.splice(fromIndex, 1);

  next.splice(toIndex, 0, item);

  return next;
}

export function moveItemToTarget<T extends { id: string }>(items: T[], draggingId: string, targetId: string) {
  const fromIndex = items.findIndex((item) => item.id === draggingId);
  const toIndex = items.findIndex((item) => item.id === targetId);

  return moveArrayItem(items, fromIndex, toIndex);
}
