import {
  labels,
  roles,
  type Dependency,
  type Member,
} from "@/lib/escalas/domain";

function MemberSelect({
  label,
  value,
  members,
  onChange,
}: {
  label: string;
  value: string;
  members: Member[];
  onChange: (memberId: string) => void;
}) {
  return (
    <label>
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {members.map((m) => (
          <option value={m.id} key={m.id}>
            {m.name}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Um vínculo: "quando A estiver escalado em tais funções, B é exigido nesta função". */
export function DependencyCard({
  index,
  dependency: d,
  members,
  onChange,
  onRemove,
}: {
  index: number;
  dependency: Dependency;
  members: Member[];
  onChange: (patch: Partial<Dependency>) => void;
  onRemove: () => void;
}) {
  return (
    <fieldset className="sc-dep">
      <legend>Vínculo {index + 1}</legend>
      <MemberSelect
        label="Quando estiver escalado"
        value={d.trigger_member}
        members={members}
        onChange={(trigger_member) => onChange({ trigger_member })}
      />
      <fieldset>
        <legend>Em uma destas funções</legend>
        {roles.map((r) => (
          <label className="sc-check" key={r}>
            <input
              type="checkbox"
              checked={d.trigger_roles.includes(r)}
              onChange={(e) =>
                onChange({
                  trigger_roles: e.target.checked
                    ? [...d.trigger_roles, r]
                    : d.trigger_roles.filter((x) => x !== r),
                })
              }
            />
            {labels[r]}
          </label>
        ))}
      </fieldset>
      <MemberSelect
        label="Exigir este membro"
        value={d.required_member}
        members={members}
        onChange={(required_member) => onChange({ required_member })}
      />
      <label>
        Nesta função
        <select
          value={d.required_role}
          onChange={(e) =>
            onChange({ required_role: e.target.value as Dependency["required_role"] })
          }
        >
          {roles.map((r) => (
            <option value={r} key={r}>
              {labels[r]}
            </option>
          ))}
        </select>
      </label>
      <label className="sc-check">
        <input
          type="checkbox"
          checked={d.exclusive}
          onChange={(e) => onChange({ exclusive: e.target.checked })}
        />
        Também impedir o membro exigido de atuar nesta função sem o primeiro
        membro
      </label>
      <label className="sc-check">
        <input
          type="checkbox"
          checked={d.enabled}
          onChange={(e) => onChange({ enabled: e.target.checked })}
        />
        Vínculo ativo
      </label>
      <button type="button" className="sc-btn sc-btn-danger" onClick={onRemove}>
        Remover vínculo ao salvar
      </button>
    </fieldset>
  );
}
