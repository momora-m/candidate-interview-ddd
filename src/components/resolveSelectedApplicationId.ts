export function resolveSelectedApplicationId(
  applications: readonly { id: string; isTerminal: boolean }[],
  currentId: string,
  preferredId?: string
): string {
  const selectableIds = new Set(
    applications.filter((application) => !application.isTerminal).map((application) => application.id)
  );
  if (currentId && selectableIds.has(currentId)) {
    return currentId;
  }
  if (preferredId && selectableIds.has(preferredId)) {
    return preferredId;
  }
  return applications.find((application) => !application.isTerminal)?.id ?? '';
}
