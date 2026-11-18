// Isolated PostgREST fixture: the real Next pages render against this server.
// No production credentials or database writes are used.
import { createServer } from "node:http";
import { createHash } from "node:crypto";

const id = "11111111-1111-4111-8111-111111111111";
const date = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
const member = {
  id: "22222222-2222-4222-8222-222222222222", name: "Participante com nome e sobrenome muito compridos para testar no celular",
  phone: "+5561999999999", is_active: true, blocked: false, is_core: true,
  membership_status: "approved", birth_date: "1995-01-01", photo_path: null,
  emergency_name: "Contato de emergência", emergency_phone: "+5561988888888", emergency_relationship: "Familiar",
  token: "a".repeat(64), points: 0, skill_level: 3, created_at: `${date}T10:00:00Z`,
  student_weekdays: [], preferred_weekdays: [], preferred_dates: [], unavailable_dates: [],
};
const event = {
  id, date, title: "Vôlei da galera — encontro com título comprido para testar a responsividade",
  start_time: "20:00", location: "Ginásio com endereço e nome muito compridos para testar a quebra de linhas",
  notes: "Traga água e chegue com antecedência.", closed: false, max_teams: 3,
  calendar_enabled: false, directions_enabled: false, directions_url: null,
  registration_deadline: `${date}T23:59:00-03:00`, guests_open_at: null, presence_closed_at: null,
  volei_attendance: ["confirmado", "confirmado", "reservado", "espera"].map((status, i) => ({
    member_id: i === 0 ? member.id : `member-${i}`, status, registered_at: `${date}T10:0${i}:00Z`, queue_order: i,
    volei_members: { name: i === 0 ? member.name : `Participante ${i}`, is_core: i === 0 },
  })), volei_guests: [],
};
const guest = {
  id: "33333333-3333-4333-8333-333333333333", event_id: id, member_id: member.id,
  name: "Convidado de teste com nome comprido", status: "espera", profile_token: "b".repeat(64),
  registered_at: `${date}T10:05:00Z`, queue_order: 1, phone: "+5561988888888", birth_date: "1998-01-01",
  photo_path: null, skill_level: 3, emergency_name: "Contato", emergency_phone: "+5561977777777", emergency_relationship: "Familiar",
  volei_members: { id: member.id, name: member.name }, volei_events: { id, date, title: event.title, closed: false, presence_closed_at: null },
};
const groupSettings = { id: true, whatsapp_invite_url: null };
const originalMember = structuredClone(member);
const originalEvent = structuredClone(event);
let birthScenario = false;
let usabilityScenario = false;
let deviceBinding = null;
function readBody(request, done) {
  let body = "";
  request.on("data", chunk => { body += chunk; });
  request.on("end", () => done(JSON.parse(body || "{}")));
}
const complaint = {
  id: "55555555-5555-4555-8555-555555555555", reporter_id: member.id, reporter_name: member.name,
  target_type: "guest", target_member_id: null, target_guest_id: guest.id, target_name: guest.name,
  sponsor_name: member.name, event_id: id, event_date: date, title: "Relato de teste para validar o layout",
  description: "Descrição fictícia para validar a apresentação do atendimento privado.", status: "open",
  read_at: `${date}T10:00:00Z`, admin_note: "", resolved_at: null, created_at: `${date}T10:00:00Z`, updated_at: `${date}T10:00:00Z`,
};
createServer((request, response) => {
  const url = new URL(request.url, "http://127.0.0.1:3101");
  // Test controls exist only in this standalone loopback fixture.
  if (url.pathname === "/__test__/usability" && request.method === "POST") {
    readBody(request, input => {
      Object.assign(member, structuredClone(originalMember));
      Object.assign(event, structuredClone(originalEvent));
      usabilityScenario = !input.reset;
      birthScenario = false;
      deviceBinding = input.bound === false ? null : createHash("sha256").update("a".repeat(64)).digest("hex");
      if (input.status) event.volei_attendance[0].status = input.status;
      if (input.closed) event.closed = true;
      event.calendar_enabled = input.calendarEnabled ?? false;
      event.directions_enabled = input.directionsEnabled ?? false;
      event.directions_url = input.directionsURL ?? null;
      if (input.membershipStatus) member.membership_status = input.membershipStatus;
      if (input.status === "espera") { event.volei_guests = [structuredClone(guest)]; }
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end("{}");
    });
    return;
  }
  if (usabilityScenario && url.pathname === "/rest/v1/rpc/volei_phone_identify") {
    readBody(request, input => {
      let result = null;
      let error = false;
      if (input.p_phone === member.phone) {
        if (deviceBinding && deviceBinding !== input.p_secret_hash) error = true;
        else { deviceBinding = input.p_secret_hash; result = member.id; }
      }
      response.writeHead(error ? 400 : 200, { "Content-Type": "application/json" });
      response.end(JSON.stringify(error ? { code: "P0001", message: "Este cadastro está vinculado a outro aparelho. Peça a liberação ao responsável." } : result));
    });
    return;
  }
  if (usabilityScenario && url.pathname === "/rest/v1/rpc/volei_admin_register_player") {
    readBody(request, input => {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ id: member.id, name: input.p_name, status: "confirmado" }));
    });
    return;
  }
  if (url.pathname === "/__test__/birth-date" && request.method === "POST") {
    readBody(request, input => {
      Object.assign(member, originalMember);
      birthScenario = !input.reset;
      if (birthScenario) {
        member.birth_date = input.birthDate ?? null;
        member.is_core = false;
        if (input.legacy) member.phone = null;
      }
      deviceBinding = input.isNew ? null : createHash("sha256").update("a".repeat(64)).digest("hex");
      event.volei_attendance[0].status = input.participating || input.reset ? "confirmado" : "nao_vai";
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end("{}");
    });
    return;
  }
  if (birthScenario && ["volei_register_member_profile", "volei_phone_manage_profile", "volei_respond_profile"].some(name => url.pathname === `/rest/v1/rpc/${name}`)) {
    readBody(request, input => {
      if (input.p_birth_date) member.birth_date = input.p_birth_date;
      if (url.pathname.endsWith("volei_register_member_profile")) {
        Object.assign(member, { name: input.p_name, phone: input.p_phone, membership_status: "pending" });
        deviceBinding = input.p_secret_hash;
      } else {
        event.volei_attendance[0].status = input.p_action === "cancel" || ["nao_vai", "limpar"].includes(input.p_status) ? "nao_vai" : "confirmado";
      }
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify(url.pathname.endsWith("volei_register_member_profile") ? member.id : null));
    });
    return;
  }
  if (url.pathname === "/rest/v1/volei_group_settings" && request.method === "PATCH") {
    if (!request.headers.authorization?.startsWith("Bearer ey")) {
      response.writeHead(403, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ code: "42501", message: "Fixture admin session required" }));
      return;
    }
    let body = "";
    request.on("data", chunk => { body += chunk; });
    request.on("end", () => {
      const input = JSON.parse(body);
      groupSettings.whatsapp_invite_url = input.whatsapp_invite_url;
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify([groupSettings]));
    });
    return;
  }
  if (url.pathname === "/rest/v1/volei_events" && request.method === "PATCH") {
    if (!request.headers.authorization?.startsWith("Bearer ey")) {
      response.writeHead(403, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ code: "42501", message: "Fixture admin session required" }));
    } else readBody(request, input => {
      Object.assign(event, input);
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify([event]));
    });
    return;
  }
  let result;
  if (url.pathname === "/auth/v1/user") result = {
    id: "44444444-4444-4444-8444-444444444444", email: "admin@example.test",
    aud: "authenticated", role: "authenticated", created_at: `${date}T00:00:00Z`, app_metadata: {}, user_metadata: {},
  };
  else if (url.pathname === "/rest/v1/users") result = [{ id: "44444444-4444-4444-8444-444444444444", role: "admin" }];
  else if (url.pathname === "/rest/v1/rpc/is_volei_admin") result = true;
  else if (url.pathname === "/rest/v1/volei_group_settings") result = [groupSettings];
  else if (url.pathname.startsWith("/rest/v1/rpc/")) result = null;
  else if (url.pathname === "/rest/v1/volei_events") {
    const dates = url.searchParams.getAll("date");
    result = dates.some(filter => filter.startsWith("gte.") && date < filter.slice(4) || filter.startsWith("lte.") && date > filter.slice(4)) ? [] : [event];
  } else if (url.pathname === "/rest/v1/volei_members") {
    const binding = url.searchParams.get("device_secret_hash");
    result = url.searchParams.get("membership_status") === "eq.pending" || (birthScenario || usabilityScenario) && binding && binding !== `eq.${deviceBinding}` ? [] : [member];
  }
  else if (url.pathname === "/rest/v1/volei_attendance") result = event.volei_attendance;
  else if (url.pathname === "/rest/v1/volei_complaints") result = [complaint];
  else if (["volei_court_sessions", "volei_guest_blocks", "volei_point_log", "volei_point_logs", "volei_complaint_updates"].some(table => url.pathname === `/rest/v1/${table}`)) result = [];
  else if (url.pathname === "/rest/v1/volei_guests") result = [guest];
  else {
    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ message: `Unexpected fixture request: ${url.pathname}` }));
    return;
  }
  response.writeHead(200, { "Content-Type": "application/json", "Content-Range": Array.isArray(result) ? `0-${Math.max(0, result.length - 1)}/${result.length}` : "*/*" });
  response.end(JSON.stringify(result));
}).listen(3101, "127.0.0.1");
