import { useCallback, useEffect, useState } from 'react';
import type { Habit } from '../core/types';
import { listarHabitos } from '../store/habits';

export function useHabits() {
  const [habitos, setHabitos] = useState<Habit[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    try {
      setHabitos(await listarHabitos());
      setError(null);
    } catch {
      setError('No se pudo acceder al almacenamiento del navegador.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  return { habitos, cargando, error, recargar };
}
