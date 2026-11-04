// Isolated PostgREST fixture: the real Next pages render against this server.
// No production credentials or database writes are used.
import { createServer } from "node:http";

const id = "11111111-1111-4111-8111-111111111111";
const date = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
const member = {
  id: "22222222-2222-4222-8222-222222222222", name: "Participante com nome e sobrenome muito compridos para testar no celular",
  phone: "+5561999999999", is_active: true, blocked: false, is_core: true,
  membership_status: "approved", birth_date: "1995-01-01", photo_path: null,
  emergency_name: "Contato de emergência", emergency_phone: "+5561988888888", emergency_relationship: "Familiar",
};
const event = {
  id, date, title: "Vôlei da galera — encontro com título comprido para testar a responsividade",
  start_time: "20:00", location: "Ginásio com endereço e nome muito compridos para testar a quebra de linhas",
  notes: "Traga água e chegue com antecedência.", closed: false, max_teams: 3,
  registration_deadline: `${date}T23:59:00-03:00`, guests_open_at: null, presence_closed_at: null,
  volei_attendance: ["confirmado", "confirmado", "reservado", "espera"].map((status, i) => ({
    member_id: i === 0 ? member.id : `member-${i}`, status, registered_at: `${date}T10:0${i}:00Z`, queue_order: i,
    volei_members: { name: i === 0 ? member.name : `Participante ${i}`, is_core: i === 0 },
  })), volei_guests: [],
};
createServer((request, response) => {
  const url = new URL(request.url, "http://127.0.0.1:3101");
  let result;
  if (url.pathname.startsWith("/rest/v1/rpc/")) result = null;
  else if (url.pathname === "/rest/v1/volei_events") {
    const dates = url.searchParams.getAll("date");
    result = dates.some(filter => filter.startsWith("gte.") && date < filter.slice(4) || filter.startsWith("lte.") && date > filter.slice(4)) ? [] : [event];
  } else if (url.pathname === "/rest/v1/volei_members") result = [member];
  else if (url.pathname === "/rest/v1/volei_guests") result = [];
  else {
    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ message: `Unexpected fixture request: ${url.pathname}` }));
    return;
  }
  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(JSON.stringify(result));
}).listen(3101, "127.0.0.1");
