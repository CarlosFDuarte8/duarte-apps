import { describe, expect, it } from "vitest";
import { changeStatus, rebalance, type Meeting } from "./local-attendance";
const now = "2026-10-28T12:00:00";
function fixture(): Meeting {
  return { title: "Vôlei", deadline: "", guestsAfter: "", history: [], participants: Array.from({ length: 20 }, (_, i) => ({ id: String(i), nome: `Pessoa ${i}`, status: "pendente" })) };
}
function subscribe(m: Meeting, count = 20) {
  for (let i = 0; i < count; i++) m = changeStatus(m, String(i), "confirmado", now);
  return m;
}
describe("inscrições locais", () => {
  it("limita a 18 e promove o primeiro da espera ao cancelar", () => {
    let m = subscribe(fixture());
    expect(m.participants.filter(p => p.status === "confirmado")).toHaveLength(18);
    m = changeStatus(m, "0", "cancelado", now);
    expect(m.participants[18].status).toBe("confirmado");
    expect(m.participants[19].status).toBe("espera");
    m = changeStatus(m, "0", "confirmado", now);
    expect(m.participants[0].order).toBe(21);
    m = changeStatus(m, "1", "ausente", now);
    expect(m.participants[19].status).toBe("confirmado");
  });
  it("mantém convidados separados até a liberação e prioriza membros", () => {
    let m = fixture();
    m.participants.push({ id: "guest", nome: "Convidado", responsible: "0", status: "pendente" });
    m = changeStatus(m, "guest", "confirmado", now);
    expect(m.participants.at(-1)?.status).toBe("espera");
    m = subscribe(m, 18);
    m.guestsAfter = "2026-10-28T11:00";
    m = rebalance(m, now);
    expect(m.participants.at(-1)?.status).toBe("espera");
    m = changeStatus(m, "0", "cancelado", now);
    expect(m.participants.at(-1)?.status).toBe("confirmado");
  });
  it("não aceita segundo convidado ativo mesmo após cancelamento e retorno", () => {
    const m = fixture();
    m.participants.push({ id: "g1", nome: "A", responsible: "0", status: "cancelado" }, { id: "g2", nome: "B", responsible: "0", status: "espera" });
    expect(() => changeStatus(m, "g1", "confirmado", now)).toThrow("somente um");
  });
  it("preserva cancelamentos após o prazo sem promover e bloqueia inscrição", () => {
    let m = subscribe(fixture());
    m.deadline = "2026-10-28T11:00";
    expect(() => changeStatus(m, "19", "confirmado", now)).toThrow("prazo");
    m = changeStatus(m, "0", "cancelado", now);
    expect(m.participants[0].status).toBe("cancelado");
    expect(m.participants[18].status).toBe("espera");
  });
  it("não registra falta de quem fez check-in", () => {
    const m = subscribe(fixture(), 1);
    m.participants[0].checkedInAt = now;
    expect(() => changeStatus(m, "0", "ausente", now)).toThrow("sem check-in");
  });
});
