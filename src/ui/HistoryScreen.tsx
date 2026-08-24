import { useCallback, useEffect, useState } from 'react';
import type { EntriesByDate, IsoDate } from '../core/types';
import { addDays, hoy as fechaDeHoy } from '../core/dates';
import { buildHeatmap, type HeatmapCell } from '../core/heatmap';
import { isComplete } from '../core/completion';
import { isScheduled } from '../core/schedule';
import { useHabits } from './useHabits';
import { Heatmap } from './Heatmap';
import { HabitDetail } from './HabitDetail';
import { mapaDeEntries, marcarHabito } from '../store/entries';

/** Ventana del heatmap: las últimas 26 semanas. */
const DIAS_VISIBLES = 182;

export function HistoryScreen() {
  const { habitos, cargando } = useHabits();
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [entradas, setEntradas] = useState<EntriesByDate>(new Map());
  const [celdas, setCeldas] = useState<HeatmapCell[]>([]);
  const [diaAbierto, setDiaAbierto] = useState<IsoDate | null>(null);

  const habit = habitos.find((h) => h.id === seleccionadoId) ?? habitos[0];

  useEffect(() => {
    if (!seleccionadoId && habitos.length > 0) setSeleccionadoId(habitos[0].id);
  }, [habitos, seleccionadoId]);

  const recargarEntradas = useCallback(async () => {
    if (!habit) return;
    const mapa = await mapaDeEntries(habit.id);
    const hasta = fechaDeHoy();
    const desde = addDays(hasta, -(DIAS_VISIBLES - 1));
    setEntradas(mapa);
    setCeldas(buildHeatmap(habit, mapa, desde, hasta));
  }, [habit]);

  // Efecto separado de recargarEntradas: al cambiar de hábito rápidamente, una
  // resolución de mapaDeEntries más lenta para el hábito anterior podría llegar
  // después de la del hábito nuevo y pisar entradas/celdas con datos obsoletos.
  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      if (!habit) return;
      const mapa = await mapaDeEntries(habit.id);
      if (cancelado) return;
      const hasta = fechaDeHoy();
      const desde = addDays(hasta, -(DIAS_VISIBLES - 1));
      setEntradas(mapa);
      setCeldas(buildHeatmap(habit, mapa, desde, hasta));
    }
    void cargar();
    return () => {
      cancelado = true;
    };
  }, [habit]);

  if (cargando) return <p className="vacio">Cargando…</p>;
  if (habitos.length === 0) {
    return (
      <>
        <h1>Historial</h1>
        <p className="vacio">No tienes hábitos todavía. Créalos desde Ajustes.</p>
      </>
    );
  }

  async function guardarDia(valor: boolean | number) {
    if (!habit || !diaAbierto) return;
    await marcarHabito(habit.id, diaAbierto, valor);
    await recargarEntradas();
    setDiaAbierto(null);
  }

  const entradaDelDia = diaAbierto ? entradas.get(diaAbierto) : undefined;
  const completoElDia = habit && entradaDelDia ? isComplete(habit, entradaDelDia) : false;

  return (
    <>
      <h1>Historial</h1>

      <label htmlFor="habito">Hábito</label>
      <select
        id="habito"
        value={habit?.id ?? ''}
        onChange={(e) => {
          setSeleccionadoId(e.target.value);
          setDiaAbierto(null);
        }}
      >
        {habitos.map((h) => (
          <option key={h.id} value={h.id}>{h.nombre}</option>
        ))}
      </select>

      <Heatmap celdas={celdas} onSeleccionar={setDiaAbierto} />

      {diaAbierto && habit && (
        <div className="card">
          <p>{diaAbierto}</p>
          {!isScheduled(habit, diaAbierto) && (
            <p className="vacio">Ese día no estaba programado, pero puedes anotarlo igualmente.</p>
          )}

          {habit.tipo === 'booleano' ? (
            <div className="acciones">
              <button onClick={() => void guardarDia(true)}>Marcar como hecho</button>
              <button onClick={() => void guardarDia(false)}>Marcar como no hecho</button>
            </div>
          ) : (
            <div className="acciones">
              <input
                type="number"
                min="0"
                aria-label="Cantidad"
                defaultValue={Number(entradaDelDia?.valor ?? 0)}
                onBlur={(e) => void guardarDia(Number(e.target.value))}
              />
            </div>
          )}

          <p className="vacio">{completoElDia ? 'Cumplido' : 'Sin cumplir'}</p>
          <button className="enlace" onClick={() => setDiaAbierto(null)}>Cerrar</button>
        </div>
      )}

      {habit && <HabitDetail habit={habit} entries={entradas} />}
    </>
  );
}
