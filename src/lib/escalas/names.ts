import type { Category } from "./domain";

// Nomes exibidos na interface: fonte única para o site público e a administração.

export const CATEGORY_NAMES: Record<Category, string> = {
  porteiro: "Porteiro",
  porteira: "Porteira",
  organista: "Organista",
};

export const CATEGORY_PLURAL_NAMES: Record<Category, string> = {
  porteiro: "Porteiros",
  porteira: "Porteiras",
  organista: "Organistas",
};

export const KIND_NAMES: Record<string, string> = {
  culto: "Culto oficial",
  jovens: "Jovens e menores",
  ensaio: "Ensaio local",
};

export const WEEKDAY_NAMES = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

export const WEEKDAY_SHORT_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export const WEEKDAY_BASE_NAMES = WEEKDAY_NAMES.map((name) =>
  name.replace("-feira", ""),
);
