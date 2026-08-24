import { useCallback, useEffect, useState } from 'react';
import type { EntriesByDate, Habit, IsoDate } from '../core/types';
import { addDays, hoy as fechaDeHoy } from '../core/dates';
import { buildHeatmap } from '../core/heatmap';
import { isComplete } from '../core/completion';
import { isScheduled } from '../core/schedule';
import { currentStreak } from '../core/streaks';
import { mapaDeEntries, marcarHabito } from '../store/entries';
import { Heatmap } from './Heatmap';
import { HabitDetail } from './HabitDetail';

/** Ventana del heatmap compacto: últimas 8 semanas. */
const DIAS_COMPACTO = 56;
/** Ventana del heatmap expandido: la misma de siempre, 26 semanas. */
const DIAS_COMPLETO = 182;

function rangoDe(dias: number): { desde: IsoDate; hasta: IsoDate } {
  const hasta = fechaDeHoy();
  return { desde: addDays(hasta, -(dias - 1)), hasta };
}

interface Props {
  habit: Habit;
  expandido: boolean;
  onToggleExpandir: () => void;
}

export function HabitHistoryRow({ habit, expandido, onToggleExpandir }: Props) {
  const [entradas, setEntradas] = useState<EntriesByDate>(new Map());
  const [cargando, setCargando] = useState(true);
  const [diaAbierto, setDiaAbierto] = useState<IsoDate | null>(null);

  const recargarEntradas = useCallback(async () => {
    setEntradas(await mapaDeEntries(habit.id));
  }, [habit.id]);

  // Guarda contra resultados obsoletos: si esta fila llegara a reutilizarse
  // para otro hábito (cambio de `habit.id`), una carga anterior más lenta no
  // debe pisar los datos del hábito actual. Mismo patrón ya usado en
  // TodayScreen y en la versión anterior de HistoryScreen.
  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    void (async () => {
      const mapa = await mapaDeEntries(habit.id);
      if (cancelado) return;
      setEntradas(mapa);
      setCargando(false);
    })();
    return () => {
      cancelado = true;
    };
  }, [habit.id]);

  // Al expandir o colapsar, no dejar abierta la tarjeta de un día que ya no
  // tiene sentido en el nuevo contexto visual.
  useEffect(() => {
    setDiaAbierto(null);
  }, [expandido]);

  async function guardarDia(valor: boolean | number) {
    if (!diaAbierto) return;
    const dia = diaAbierto;
    await marcarHabito(habit.id, dia, valor);
    await recargarEntradas();
    // Igual que en la versión anterior: solo cierra la tarjeta si sigue
    // mostrando el día que se acaba de guardar.
    setDiaAbierto((actual) => (actual === dia ? null : actual));
  }

  if (cargando) return <p className="vacio">Cargando…</p>;

  const racha = currentStreak(habit, entradas, fechaDeHoy());
  const rango = expandido ? rangoDe(DIAS_COMPLETO) : rangoDe(DIAS_COMPACTO);
  const celdas = buildHeatmap(habit, entradas, rango.desde, rango.hasta);

  const entradaDelDia = diaAbierto ? entradas.get(diaAbierto) : undefined;
  const completoElDia = diaAbierto && entradaDelDia ? isComplete(habit, entradaDelDia) : false;

  return (
    <div className="card fila-historial">
      <button className="enlace-habito" onClick={onToggleExpandir} aria-expanded={expandido}>
        <span className="fila-nombre">{habit.nombre}</span>
        {racha > 0 && <span className="racha">🔥 {racha}</span>}
      </button>

      <Heatmap celdas={celdas} etiquetaHabito={habit.nombre} onSeleccionar={setDiaAbierto} />

      {diaAbierto && (
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
                key={diaAbierto}
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

      {expandido && <HabitDetail habit={habit} entries={entradas} />}
    </div>
  );
}
