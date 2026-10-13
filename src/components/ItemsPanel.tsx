import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Search, Tags } from 'lucide-react-native';
import { Button, Card, Input, Text } from './ui';
import { Skeleton } from './bits';
import { Chip, ItemRow, categoryLabel } from './service';
import { servicesApi } from '@/api/services';
import { useTheme } from '@/theme/useTheme';

/**
 * Everything the customer has with us, by label. Items in storage can be
 * ticked; the selection lives in the parent so its sticky footer can sit
 * outside the scroll view.
 */
export function ItemsPanel({ selected, onToggle, onSelectAll }: {
  selected: Set<string>; onToggle: (id: string) => void; onSelectAll: (ids: string[]) => void;
}) {
  const router = useRouter();
  const { c } = useTheme();
  const q = useQuery({ queryKey: ['items'], queryFn: servicesApi.items });
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<string | null>(null);
  const all = q.data ?? [];
  const categories = [...new Set(all.map((i) => i.category))];
  const needle = query.trim().toLowerCase();
  const shown = all.filter((i) => (!cat || i.category === cat)
    && (!needle || i.name.toLowerCase().includes(needle) || i.label.toLowerCase().includes(needle) || (i.contents ?? '').toLowerCase().includes(needle)));
  const storedShown = shown.filter((i) => i.status === 'stored').map((i) => i.id);
  const allPicked = storedShown.length > 0 && storedShown.every((id) => selected.has(id));

  if (q.isLoading) return <Skeleton height={320} />;
  if (q.error) return <Text style={{ color: c.err }}>{q.error.message}</Text>;
  if (!all.length) {
    return (
      <Card style={{ gap: 12 }}>
        <Text variant="h3">No items yet</Text>
        <Text color="ink2">Order boxes and labels, pack, then book a pickup. Every labelled box or item shows up here once we’ve checked it in — and you can have any of them delivered back.</Text>
        <Button title="Order boxes & labels" icon={Tags} onPress={() => router.push({ pathname: '/service/new', params: { type: 'supplies' } })} />
        <Button title="Book a pickup" variant="soft" onPress={() => router.push({ pathname: '/service/new', params: { type: 'pickup' } })} />
      </Card>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      <Input icon={Search} placeholder="Search items or labels" value={query} onChangeText={setQuery} autoCorrect={false} returnKeyType="search" />
      {categories.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginHorizontal: -16 }}>
          <View style={{ width: 8 }} />
          {[null, ...categories].map((k) => (
            <Chip key={k ?? 'all'} label={k ? categoryLabel(k) : 'All'} on={cat === k} onPress={() => setCat(k)} />
          ))}
          <View style={{ width: 8 }} />
        </ScrollView>
      ) : null}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="meta">{shown.length} item{shown.length === 1 ? '' : 's'}</Text>
        {storedShown.length ? (
          <Text variant="meta" color="ink" style={{ textDecorationLine: 'underline' }}
            onPress={() => onSelectAll(allPicked ? [] : storedShown)}>{allPicked ? 'Clear selection' : 'Select all in storage'}</Text>
        ) : null}
      </View>
      {shown.length ? (
        <Card style={{ paddingVertical: 4 }}>
          {shown.map((i) => (
            <ItemRow key={i.id} item={i} selected={selected.has(i.id)} onToggle={() => onToggle(i.id)}
              onPress={() => router.push({ pathname: '/item/[id]', params: { id: i.id } })} />
          ))}
        </Card>
      ) : (
        <View style={{ alignItems: 'center', gap: 10, padding: 24 }}>
          <Text variant="title">No items match</Text>
          <Button title="Clear search" variant="soft" onPress={() => { setQuery(''); setCat(null); }} />
        </View>
      )}
      {/* room for the delivery footer, so it never covers the last item */}
      {selected.size ? <View style={{ height: 64 }} /> : null}
    </View>
  );
}
