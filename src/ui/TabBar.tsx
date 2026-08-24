export type Pestana = 'hoy' | 'historial' | 'ajustes';

interface Props {
  activa: Pestana;
  onCambiar: (p: Pestana) => void;
}

const PESTANAS: { id: Pestana; etiqueta: string }[] = [
  { id: 'hoy', etiqueta: 'Hoy' },
  { id: 'historial', etiqueta: 'Historial' },
  { id: 'ajustes', etiqueta: 'Ajustes' },
];

export function TabBar({ activa, onCambiar }: Props) {
  return (
    <nav className="tabbar">
      {PESTANAS.map((p) => (
        <button
          key={p.id}
          onClick={() => onCambiar(p.id)}
          aria-current={activa === p.id ? 'page' : undefined}
        >
          {p.etiqueta}
        </button>
      ))}
    </nav>
  );
}
