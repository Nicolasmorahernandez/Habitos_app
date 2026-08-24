import { useState } from 'react';
import type { HabitType, Weekday } from '../core/types';
import type { NuevoHabito } from '../store/habits';

const DIAS: { valor: Weekday; etiqueta: string }[] = [
  { valor: 1, etiqueta: 'Lunes' },
  { valor: 2, etiqueta: 'Martes' },
  { valor: 3, etiqueta: 'Miércoles' },
  { valor: 4, etiqueta: 'Jueves' },
  { valor: 5, etiqueta: 'Viernes' },
  { valor: 6, etiqueta: 'Sábado' },
  { valor: 0, etiqueta: 'Domingo' },
];

interface Props {
  inicial?: Partial<NuevoHabito>;
  onGuardar: (h: NuevoHabito) => void | Promise<void>;
  onCancelar: () => void;
}

export function HabitForm({ inicial, onGuardar, onCancelar }: Props) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const [tipo, setTipo] = useState<HabitType>(inicial?.tipo ?? 'booleano');
  const [objetivo, setObjetivo] = useState(String(inicial?.objetivo ?? 1));
  const [dias, setDias] = useState<Weekday[]>(inicial?.dias ?? []);
  const [aviso, setAviso] = useState<string | null>(null);

  function alternarDia(d: Weekday) {
    setDias((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();

    if (!nombre.trim()) {
      setAviso('Este campo es obligatorio.');
      return;
    }
    if (dias.length === 0) {
      setAviso('Marca al menos un día de la semana.');
      return;
    }
    const objetivoNum = Number(objetivo);
    if (tipo === 'cantidad' && (!Number.isFinite(objetivoNum) || objetivoNum <= 0)) {
      setAviso('El objetivo debe ser un número mayor que cero.');
      return;
    }

    setAviso(null);
    void onGuardar({
      nombre: nombre.trim(),
      tipo,
      objetivo: tipo === 'cantidad' ? objetivoNum : null,
      dias,
    });
  }

  return (
    <form className="card formulario" onSubmit={enviar}>
      <label htmlFor="nombre">Nombre</label>
      <input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />

      <label htmlFor="tipo">Tipo</label>
      <select id="tipo" value={tipo} onChange={(e) => setTipo(e.target.value as HabitType)}>
        <option value="booleano">Sí o no</option>
        <option value="cantidad">Cantidad</option>
      </select>

      {tipo === 'cantidad' && (
        <>
          <label htmlFor="objetivo">Objetivo</label>
          <input
            id="objetivo"
            type="number"
            min="1"
            value={objetivo}
            onChange={(e) => setObjetivo(e.target.value)}
          />
        </>
      )}

      <fieldset className="dias">
        <legend>Días</legend>
        {DIAS.map((d) => (
          <label key={d.valor}>
            <input
              type="checkbox"
              aria-label={d.etiqueta}
              checked={dias.includes(d.valor)}
              onChange={() => alternarDia(d.valor)}
            />
            {d.etiqueta.slice(0, 3)}
          </label>
        ))}
      </fieldset>

      {aviso && <p className="aviso">{aviso}</p>}

      <div className="acciones">
        <button type="submit">Guardar</button>
        <button type="button" onClick={onCancelar}>Cancelar</button>
      </div>
    </form>
  );
}
