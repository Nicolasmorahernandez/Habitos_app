import { useEffect, useState } from 'react';
import { TabBar, type Pestana } from './TabBar';
import { TodayScreen } from './TodayScreen';
import { HistoryScreen } from './HistoryScreen';
import { SettingsScreen } from './SettingsScreen';
import { isStorageAvailable } from '../store/db';

export function App() {
  const [pestana, setPestana] = useState<Pestana>('hoy');
  const [almacenamientoOk, setAlmacenamientoOk] = useState(true);

  useEffect(() => {
    void isStorageAvailable().then(setAlmacenamientoOk);
  }, []);

  return (
    <>
      <main className="app">
        {!almacenamientoOk && (
          <p className="banner">
            Este navegador no permite guardar datos (¿ventana privada?). Puedes usar la app, pero
            tus marcas no se guardarán al cerrarla.
          </p>
        )}
        {pestana === 'hoy' && <TodayScreen />}
        {pestana === 'historial' && <HistoryScreen />}
        {pestana === 'ajustes' && <SettingsScreen />}
      </main>
      <TabBar activa={pestana} onCambiar={setPestana} />
    </>
  );
}
