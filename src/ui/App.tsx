import { useState } from 'react';
import { TabBar, type Pestana } from './TabBar';
import { TodayScreen } from './TodayScreen';
import { HistoryScreen } from './HistoryScreen';
import { SettingsScreen } from './SettingsScreen';

export function App() {
  const [pestana, setPestana] = useState<Pestana>('hoy');

  return (
    <>
      <main className="app">
        {pestana === 'hoy' && <TodayScreen />}
        {pestana === 'historial' && <HistoryScreen />}
        {pestana === 'ajustes' && <SettingsScreen />}
      </main>
      <TabBar activa={pestana} onCambiar={setPestana} />
    </>
  );
}
