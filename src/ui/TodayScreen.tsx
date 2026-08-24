import { useCallback, useEffect, useState } from 'react';
import type { Entry, Habit } from '../core/types';
import { hoy as fechaDeHoy } from '../core/dates';
import { isScheduled } from '../core/schedule';
import { isComplete } from '../core/completion';
import { currentStreak } from '../core/streaks';
import { useHabits } from './useHabits';
import { entriesDeFecha, marcarHabito, mapaDeEntries } from '../store/entries';
import { HabitRow } from './HabitRow';

export function TodayScreen() {
  const { habitos, cargando, error, recargar } = useHabits();
  const [entradas, setEntradas] = useState<Map<string, Entry>>(new Map());
  const [rachas, setRachas] = useState<Map<string, number>>(new Map());
  const fecha = fechaDeHoy();

  const cargarDia = useCallback(async () => {
    const lista = await entriesDeFecha(fecha);
    setEntradas(new Map(lista.map((e) => [e.habit_id, e])));
  }, [fecha]);

  useEffect(() => {
    void cargarDia();
  }, [cargarDia]);

  useEffect(() => {
    async function calcular() {
      const nuevas = new Map<string, number>();
      for (const h of habitos) {
        nuevas.set(h.id, currentStreak(h, await mapaDeEntries(h.id), fecha));
      }
      setRachas(nuevas);
    }
    void calcular();
  }, [habitos, entradas, fecha]);

  async function alMarcar(habit: Habit, valor: boolean | number) {
    await marcarHabito(habit.id, fecha, valor);
    await cargarDia();
  }

  if (cargando) return <p className="vacio">Cargando…</p>;
  if (error) return <p className="vacio">{error}</p>;

  if (habitos.length === 0) {
    return (
      <>
        <h1>Hoy</h1>
        <p className="vacio">No tienes hábitos todavía. Créalos desde Ajustes.</p>
      </>
    );
  }

  const deHoy = habitos.filter((h) => isScheduled(h, fecha));
  const nuevos = deHoy.filter((h) => h.estado === 'nuevo');
  const consolidados = deHoy.filter((h) => h.estado === 'consolidado');
  const todoHecho = deHoy.length > 0 && deHoy.every((h) => isComplete(h, entradas.get(h.id)));

  return (
    <>
      <h1>Hoy</h1>

      {deHoy.length === 0 && <p className="vacio">Hoy no toca ningún hábito. Descansa.</p>}

      {nuevos.length > 0 && (
        <section>
          <h2>En formación</h2>
          {nuevos.map((h) => (
            <HabitRow
              key={h.id}
              habit={h}
              entry={entradas.get(h.id)}
              racha={rachas.get(h.id) ?? 0}
              onMarcar={(v) => void alMarcar(h, v)}
            />
          ))}
        </section>
      )}

      {consolidados.length > 0 && (
        <section className="compacta">
          <h2>Consolidados</h2>
          {consolidados.map((h) => (
            <HabitRow
              key={h.id}
              habit={h}
              entry={entradas.get(h.id)}
              racha={rachas.get(h.id) ?? 0}
              onMarcar={(v) => void alMarcar(h, v)}
            />
          ))}
        </section>
      )}

      {todoHecho && <p className="vacio">Día completo.</p>}

      <button className="enlace" onClick={() => void recargar()}>Actualizar</button>
    </>
  );
}
