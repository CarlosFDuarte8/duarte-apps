export function matchesName(name: string, search: string) {
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  const text = normalize(name);
  return normalize(search).trim().split(/\s+/).every(word => text.includes(word));
}

export const participantKinds = [
  { value: "all", label: "Membros e convidados" },
  { value: "members", label: "Somente membros" },
  { value: "guests", label: "Somente convidados" },
];
export function matchesKind(guest: boolean, kind: string) {
  return kind === "all" || (kind === "guests" ? guest : !guest);
}
