"""Extração reproduzível dos PDFs de 2026. Requer Python e PyMuPDF.
Os telefones extraídos ficam exclusivamente em supabase/private/ (gitignored).
O PDF CALENDARIO PORTEIRAS 2026 é excluído: seu conteúdo refere-se a 2025.
"""
import json
import re
import uuid
from pathlib import Path
import pymupdf

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'supabase' / 'imports'
OUT.mkdir(parents=True, exist_ok=True)
groups = {'porteiro': ['Fidel', 'Hélio', 'Nelson', 'Nazário', 'Gilberto'], 'porteira': ['Analdir', 'Patrícia', 'Shirley', 'Eliene', 'Míria'], 'organista': ['Glenia', 'Cecília', 'Pabline', 'Marlene', 'Concelita', 'Iracema', 'Joina']}
names = [n for g in groups.values() for n in g]
def stable(value):
    return str(uuid.uuid5(uuid.NAMESPACE_URL, 'ccb-incra08/' + value))
def normalize(value):
    # PDFs usam U+FFFD em alguns glifos. Apenas nomes conhecidos, sem aproximação livre.
    for name in names:
        pattern = ''.join('.' if c in 'éÉíÍáÁ' else re.escape(c) for c in name.upper())
        if re.fullmatch(pattern, value.strip().upper()):
            return name
    raise ValueError('Nome não reconhecido: ' + repr(value))

members = []
for category, entries in groups.items():
    official = {'porteiro': ['primeiro', 'segundo'], 'porteira': ['porteira'], 'organista': ['meia_hora', 'culto']}[category]
    for name in entries:
        members.append(dict(id=stable(name), name=name, phone='', category=category, is_active=True, joined_on=None, notes='', unavailable_weekdays=[5] if name == 'Hélio' else [], unavailable_dates=[], allowed_roles=official + ['jovens_' + category, 'ensaio_' + category]))
dependencies = [dict(id=stable('nelson-miria'), trigger_member=stable('Nelson'), trigger_roles=['primeiro', 'segundo'], required_member=stable('Míria'), required_role='porteira', exclusive=True, enabled=True), dict(id=stable('pabline-cecilia'), trigger_member=stable('Pabline'), trigger_roles=['culto'], required_member=stable('Cecília'), required_role='meia_hora', exclusive=False, enabled=True)]
(OUT / 'members.json').write_text(json.dumps(members, ensure_ascii=False, indent=2), encoding='utf-8')
(OUT / 'dependencies.json').write_text(json.dumps(dependencies, ensure_ascii=False, indent=2), encoding='utf-8')
periods = {month: dict(id=stable(f'2026-{month:02}'), month=f'2026-{month:02}', status='draft', categories=list(groups), events=[]) for month in [10, 11, 12]}
def assign(month, day, kind, role, name):
    date = f'2026-{month:02}-{day:02}'
    events = periods[month]['events']
    event = next((e for e in events if e['date'] == date and e['kind'] == kind), None)
    if event is None:
        event = dict(id=stable(date + '/' + kind), date=date, kind=kind, notes='', assignments=[])
        events.append(event)
    event['assignments'].append(dict(role=role, member_id=stable(normalize(name))))

private_phones = []
sources = []
for category, tag in [('porteiro', 'PORTEIROS'), ('porteira', 'PORTEIRAS'), ('organista', 'ORGANISTAS')]:
    path = ROOT / 'docs' / 'escalas-2026' / f'ESCALA_{tag}_OUTUBRO_NOVEMBRO_DEZEMBRO_2026.pdf'
    sources.append(path.name)
    with pymupdf.open(path) as doc:
        lines = [line.strip() for page in doc for line in page.get_text().splitlines() if line.strip()]
    # Meses aparecem duas vezes: culto oficial e reunião de jovens.
    for month, title in [(10, 'OUTUBRO'), (11, 'NOVEMBRO'), (12, 'DEZEMBRO')]:
        positions = [i for i, line in enumerate(lines) if line == title]
        for occurrence, pos in enumerate(positions[:2]):
            cursor = pos + 1
            if lines[cursor] == 'DIA': cursor += 1
            dates = []
            while re.fullmatch(r'(SEX|DOM)\s*-\s*\d{2}', lines[cursor]):
                dates.append(int(lines[cursor].split('-')[1])); cursor += 1
            if not dates: raise ValueError(f'Datas não extraídas: {path.name} {title}')
            if occurrence == 1:
                for day, name in zip(dates, lines[cursor:cursor+len(dates)], strict=True): assign(month, day, 'jovens', 'jovens_' + category, name)
            else:
                official_roles = {'porteiro': ['primeiro', 'segundo'], 'porteira': ['porteira'], 'organista': ['meia_hora', 'culto']}[category]
                for role in official_roles:
                    while True:
                        try: normalize(lines[cursor]); break
                        except ValueError: cursor += 1
                    for day, name in zip(dates, lines[cursor:cursor+len(dates)], strict=True): assign(month, day, 'culto', role, name)
                    cursor += len(dates)
    if category == 'porteiro':
        start = lines.index('ENSAIO LOCAL')
        tail = lines[start+1:]
        dates = [int(line.split('-')[1]) for line in tail if re.fullmatch(r'TER.A\s*-\s*\d{2}', line)]
        rehearsal_names = tail[-3:]
        for month, day, name in zip([10, 11, 12], dates, rehearsal_names, strict=True): assign(month, day, 'ensaio', 'ensaio_porteiro', name)
    for line in lines:
        if ':' not in line: continue
        raw_name, phone = line.split(':', 1)
        try: name = normalize(raw_name)
        except ValueError: continue
        private_phones.append(dict(member_id=stable(name), name=name, phone=phone.strip()))
for month, period in periods.items():
    period['events'].sort(key=lambda e: (e['date'], e['kind']))
    (OUT / f'2026-{month:02}.json').write_text(json.dumps(period, ensure_ascii=False, indent=2), encoding='utf-8')
private = ROOT / 'supabase' / 'private'
private.mkdir(exist_ok=True)
(private / 'phones.json').write_text(json.dumps(private_phones, ensure_ascii=False, indent=2), encoding='utf-8')
(OUT / 'sources.json').write_text(json.dumps({'sources': sources, 'excluded': {'CALENDARIO PORTEIRAS 2026.pdf': 'Cabeçalho e dias da semana referem-se a 2025; não importar como 2026.'}, 'joined_on': 'Não informada; mantida nula.', 'phones': 'Extraídos somente para supabase/private/phones.json; não versionar.'}, ensure_ascii=False, indent=2), encoding='utf-8')

def sql_string(value): return "'" + value.replace("'", "''") + "'"
def sql_array(items): return 'array[' + ','.join(sql_string(x) for x in items) + ']::text[]'
sql = ['-- Membros e regras conhecidos; sem telefones. Idempotente, sem sobrescrever edições.', 'begin;']
for m in members:
    sql.append('insert into public.members(id,name,category,allowed_roles,unavailable_weekdays) values (' + ','.join([sql_string(m['id']), sql_string(m['name']), sql_string(m['category']), sql_array(m['allowed_roles']), "'{5}'" if m['name'] == 'Hélio' else "'{}'"]) + ') on conflict(id) do nothing;')
for d in dependencies:
    sql.append('insert into public.member_dependencies(id,trigger_member,trigger_roles,required_member,required_role,exclusive,enabled) values (' + ','.join([sql_string(d['id']), sql_string(d['trigger_member']), sql_array(d['trigger_roles']), sql_string(d['required_member']), sql_string(d['required_role']), str(d['exclusive']).lower(), 'true']) + ') on conflict(id) do nothing;')
sql.append('commit;')
(ROOT / 'supabase' / 'seed.sql').write_text('\n'.join(sql) + '\n', encoding='utf-8')
phone_sql = ['-- Privado: execute opcionalmente no SQL Editor, após seed.sql.', 'begin;', 'update public.schedule_rules set revision=revision+1 where id=true;']
for contact in private_phones:
    phone_sql.append('update public.members set phone=' + sql_string(contact['phone']) + ', updated_at=now() where id=' + sql_string(contact['member_id']) + ';')
phone_sql.append("insert into public.generation_logs(action,details) values('private-phone-seed','{\"source\":\"PDFs de 2026\"}');")
phone_sql.append('commit;')
(private / 'phones.sql').write_text('\n'.join(phone_sql) + '\n', encoding='utf-8')
print('Extraídos 3 meses. Telefones separados em diretório privado. Seed criado.')
