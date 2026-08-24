import { useState } from 'react';
import { useHabits } from './useHabits';
import { HabitForm } from './HabitForm';
import { archivarHabito, actualizarHabito, crearHabito, type NuevoHabito } from '../store/habits';
import { exportarJSON, importarJSON } from '../store/backup';

export function SettingsScreen() {
  const { habitos, recargar } = useHabits();
  const [creando, setCreando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  async function guardar(nuevo: NuevoHabito) {
    try {
      await crearHabito(nuevo);
      setCreando(false);
      setMensaje(null);
      await recargar();
    } catch (e) {
      setMensaje(e instanceof Error ? e.message : 'No se pudo guardar el hábito');
    }
  }

  async function exportar() {
    const json = await exportarJSON();
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `habitos-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importar(archivo: File) {
    try {
      await importarJSON(await archivo.text());
      setMensaje('Copia restaurada.');
      await recargar();
    } catch (e) {
      setMensaje(e instanceof Error ? e.message : 'No se pudo importar el fichero');
    }
  }

  return (
    <>
      <h1>Ajustes</h1>

      <h2>Hábitos</h2>
      {habitos.map((h) => (
        <div className="card fila" key={h.id}>
          <span className="fila-nombre">{h.nombre}</span>
          <span className="acciones-fila">
            {h.estado === 'nuevo' && (
              <button
                aria-label={`Consolidar ${h.nombre}`}
                onClick={async () => {
                  await actualizarHabito(h.id, { estado: 'consolidado' });
                  await recargar();
                }}
              >
                Consolidar
              </button>
            )}
            <button
              aria-label={`Archivar ${h.nombre}`}
              onClick={async () => {
                await archivarHabito(h.id);
                await recargar();
              }}
            >
              Archivar
            </button>
          </span>
        </div>
      ))}

      {creando ? (
        <HabitForm onGuardar={guardar} onCancelar={() => setCreando(false)} />
      ) : (
        <button className="principal" onClick={() => setCreando(true)}>Nuevo hábito</button>
      )}

      <h2>Copia de seguridad</h2>
      <div className="acciones">
        <button onClick={() => void exportar()}>Exportar JSON</button>
        <label className="boton-archivo">
          Importar JSON
          <input
            type="file"
            accept="application/json"
            aria-label="Importar JSON"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importar(f);
            }}
          />
        </label>
      </div>

      {mensaje && <p className="aviso">{mensaje}</p>}
    </>
  );
}
