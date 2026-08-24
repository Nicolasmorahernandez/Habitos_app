import { useState } from 'react';
import { useHabits } from './useHabits';
import { HabitHistoryRow } from './HabitHistoryRow';

export function HistoryScreen() {
  const { habitos, cargando } = useHabits();
  const [expandidoId, setExpandidoId] = useState<string | null>(null);

  if (cargando) return <p className="vacio">Cargando…</p>;
  if (habitos.length === 0) {
    return (
      <>
        <h1>Historial</h1>
        <p className="vacio">No tienes hábitos todavía. Créalos desde Ajustes.</p>
      </>
    );
  }

  return (
    <>
      <h1>Historial</h1>
      {habitos.map((h) => (
        <HabitHistoryRow
          key={h.id}
          habit={h}
          expandido={expandidoId === h.id}
          onToggleExpandir={() => setExpandidoId((actual) => (actual === h.id ? null : h.id))}
        />
      ))}
    </>
  );
}
