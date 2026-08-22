import type { Store } from '../types';
import { MapPin } from 'lucide-react';

interface Props {
  stores: Store[];
  selectedStore: Store;
  onSelect: (store: Store) => void;
}

export function StoreSelector({ stores, selectedStore, onSelect }: Props) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex items-center gap-3">
      <MapPin className="text-yellow-500" size={20} />
      <label className="text-gray-400 text-sm font-medium uppercase tracking-wider">Unidade:</label>
      <select
        value={selectedStore.id}
        onChange={e => {
          const store = stores.find(s => s.id === e.target.value);
          if (store) onSelect(store);
        }}
        className="bg-black border border-yellow-700 text-yellow-400 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-yellow-500"
      >
        {stores.map(store => (
          <option key={store.id} value={store.id}>{store.displayName}</option>
        ))}
      </select>
      <span className="ml-auto text-xs text-gray-600">
        {stores.length === 1 ? 'Mais unidades em breve' : `${stores.length} unidades`}
      </span>
    </div>
  );
}
