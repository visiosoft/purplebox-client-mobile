import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Minus, Plus } from 'lucide-react-native';
import { Button, Card, Screen, Text, TopBar } from '@/components/ui';
import { Page } from '@/components/bits';
import { bookingApi } from '@/api/booking';
import { ITEMS, estimateSqft, pickSize } from '@/lib/estimator';
import { aed } from '@/lib/format';
import { WHATSAPP } from '@/lib/contact';
import { useTheme } from '@/theme/useTheme';
import { useI18n } from '@/i18n';

const GROUPS = ['Boxes', 'Bedroom', 'Living', 'Kitchen & other'] as const;

function Stepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const { c } = useTheme();
  const { t } = useI18n();
  const btn = (label: string, Icon: typeof Plus, next: number, off: boolean) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={off} onPress={() => onChange(next)} hitSlop={6}
      style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c.sf2, alignItems: 'center', justifyContent: 'center', opacity: off ? 0.35 : 1 }}>
      <Icon color={c.ink} size={16} strokeWidth={1.8} />
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      {btn(t('Remove one'), Minus, value - 1, value <= 0)}
      <Text variant="title" style={{ minWidth: 20, textAlign: 'center' }}>{value}</Text>
      {btn(t('Add one'), Plus, value + 1, value >= 99)}
    </View>
  );
}

export default function Estimator() {
  const router = useRouter();
  const { t } = useI18n();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const need = estimateSqft(counts);
  const sizes = useQuery({ queryKey: ['sizes-today'], queryFn: () => bookingApi.sizes(new Date().toISOString().slice(0, 10), 1) });
  const match = need > 0 && sizes.data ? pickSize(sizes.data, need) : null;
  const tooBig = need > 0 && sizes.data && sizes.data.length > 0 && !match;

  return (
    <Screen>
      <TopBar title={t('Space estimator')} />
      <Page>
        <Text color="ink2">{t('Add what you plan to store and we’ll suggest a unit size.')}</Text>
        {GROUPS.map((g) => (
          <Card key={g} style={{ gap: 14, paddingVertical: 16 }}>
            <Text variant="title">{t(g)}</Text>
            {ITEMS.filter((i) => i.group === g).map((i) => (
              <View key={i.key} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ flex: 1 }}>{t(i.label)}</Text>
                <Stepper value={counts[i.key] ?? 0} onChange={(n) => setCounts({ ...counts, [i.key]: n })} />
              </View>
            ))}
          </Card>
        ))}

        <Card variant="dark" style={{ gap: 10 }}>
          {need === 0 ? <Text color="onDk2">{t('Your estimate appears here as you add items.')}</Text> : (
            <>
              <Text variant="meta" color="onDk2">{t('You need about')}</Text>
              <Text variant="display" color="onDk">{t('{n} sq ft', { n: need })}</Text>
              {sizes.isLoading ? <Text color="onDk2">{t('Checking availability…')}</Text> : null}
              {match ? (
                <>
                  <Text color="onDk">{t('Best fit: {size} sq ft unit · {price}/month', { size: match.sizeSqf, price: aed(match.monthlyRate) })}</Text>
                  <Button title={t('Reserve {size} sq ft', { size: match.sizeSqf })} variant="accent" style={{ marginTop: 6 }}
                    onPress={() => router.push({ pathname: '/book', params: { size: String(match.sizeSqf) } })} />
                </>
              ) : null}
              {tooBig ? (
                <>
                  <Text color="onDk">{t('That’s more than our largest single unit — we can combine units for you.')}</Text>
                  <Button title={t('Talk to us')} variant="accent" onPress={() => Linking.openURL(WHATSAPP)} />
                </>
              ) : null}
              {sizes.isError || (sizes.data && sizes.data.length === 0) ? (
                <Button title={t('See available units')} variant="accent" onPress={() => router.push('/book')} />
              ) : null}
            </>
          )}
        </Card>
        <Text variant="meta" style={{ textAlign: 'center' }}>{t('An estimate only. Includes ~15% room to walk in.')}</Text>
      </Page>
    </Screen>
  );
}
