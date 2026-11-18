/** Safe presentation data: no age, birth date, class time or priority tier. */
export type AdmissionWindow = {
  state: "open" | "scheduled" | "closed" | "review" | "identify";
  open: boolean;
  opensAt: string | null;
  closesAt: string;
  message: string;
};
