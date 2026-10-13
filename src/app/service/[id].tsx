import { Alert, Linking, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleX, MessageCircle, Phone } from 'lucide-react-native';
import { Avatar, Button, Card, IconButton, Screen, Text, TopBar } from '@/components/ui';
import { Page } from '@/components/bits';
import { Code, IconTile, ItemRow, RequestStatus, SERVICE_ICON } from '@/components/service';
import { SERVICE_LABEL, STATUS_LABEL, servicesApi, whenLabel, type ServiceStatus } from '@/api/services';
import { aed } from '@/lib/format';
import { WHATSAPP } from '@/lib/contact';
import { useTheme } from '@/theme/useTheme';

const FLOW: ServiceStatus[] = ['requested', 'confirmed', 'scheduled', 'in_progress', 'completed'];
const stamp = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function TrackRequest() {
  const router = useRouter();
  const qc = useQueryClient();
  const { c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  // While a job is moving, keep the status fresh without the customer pulling.
  const q = useQuery({
    queryKey: ['service', id], queryFn: () => servicesApi.get(id),
    refetchInterval: (query) => (query.state.data?.status === 'in_progress' ? 30_000 : false),
  });
  const r = q.data;

  const cancel = useMutation({
    mutationFn: () => servicesApi.cancel(id),
    onSuccess: ({ request }) => {
      qc.setQueryData(['service', id], request);
      ['services', 'items'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
    onError: (e: Error) => Alert.alert('Could not cancel', e.message),
  });
  const confirmCancel = () => Alert.alert('Cancel this request?', 'There’s no charge if you cancel more than 12 hours before the booked time.', [
    { text: 'Keep it', style: 'cancel' },
    { text: 'Cancel request', style: 'destructive', onPress: () => cancel.mutate() },
  ]);

  const at = (s: ServiceStatus) => r?.statusLog.find((l) => l.status === s)?.at;
  const reached = r ? FLOW.indexOf(r.status) : -1;
  const cancellable = r && ['requested', 'confirmed', 'scheduled'].includes(r.status);

  return (
    <Screen>
      <TopBar title={r ? SERVICE_LABEL[r.type] : 'Request'} />
      <Page loading={q.isLoading} error={q.error?.message} refreshing={q.isRefetching} onRefresh={() => q.refetch()}>
        {r ? (
          <>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <IconTile icon={SERVICE_ICON[r.type]} />
              <View style={{ flex: 1, gap: 3 }}>
                <Code>{r.ref}</Code>
                <Text variant="title" style={{ fontSize: 15 }}>{whenLabel(r)}</Text>
              </View>
              <RequestStatus status={r.status} />
            </Card>

            {r.status === 'cancelled' ? (
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: c.errBg, borderRadius: 18, padding: 14 }}>
                <CircleX color={c.err} size={20} strokeWidth={1.8} />
                <Text style={{ color: c.err, flex: 1 }}>This request was cancelled{at('cancelled') ? ` on ${stamp(at('cancelled')!)}` : ''}.</Text>
              </View>
            ) : null}

            {r.driver && r.status === 'in_progress' ? (
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Avatar name={r.driver.name} size={44} />
                <View style={{ flex: 1 }}>
                  <Text variant="title" style={{ fontSize: 15 }}>{r.driver.name}</Text>
                  <Text variant="meta">On the way</Text>
                </View>
                {r.driver.phone ? (
                  <>
                    <IconButton icon={MessageCircle} label="Message driver" onPress={() => Linking.openURL(`https://wa.me/${r.driver!.phone!.replace(/\D/g, '')}`)} />
                    <IconButton icon={Phone} label="Call driver" tone="accent" onPress={() => Linking.openURL(`tel:${r.driver!.phone}`)} />
                  </>
                ) : null}
              </Card>
            ) : null}

            {r.status !== 'cancelled' ? (
              <Card style={{ gap: 0 }}>
                {FLOW.map((s, i) => {
                  const done = i < reached || r.status === 'completed';
                  const current = i === reached && r.status !== 'completed';
                  return (
                    <View key={s} style={{ flexDirection: 'row', gap: 14 }}>
                      <View style={{ alignItems: 'center', width: 22 }}>
                        <View style={{
                          width: 14, height: 14, borderRadius: 7, marginTop: 4,
                          backgroundColor: current ? c.warn : done ? c.ok : 'transparent',
                          borderWidth: done || current ? 0 : 1.5, borderColor: c.ln2,
                          ...(current ? { shadowColor: c.warn, shadowOpacity: 0.5, shadowRadius: 5, elevation: 3 } : {}),
                        }} />
                        {i < FLOW.length - 1 ? <View style={{ width: 2, flex: 1, minHeight: 26, backgroundColor: done ? c.ok : c.ln }} /> : null}
                      </View>
                      <View style={{ flex: 1, paddingBottom: 16, gap: 2 }}>
                        <Text variant="title" style={{ fontSize: 15, opacity: done || current ? 1 : 0.5 }}>{STATUS_LABEL[s]}</Text>
                        {at(s) ? <Text variant="meta">{stamp(at(s)!)}</Text> : null}
                      </View>
                    </View>
                  );
                })}
              </Card>
            ) : null}

            <Card style={{ gap: 12 }}>
              <Detail k={r.type === 'worker' ? 'Where' : 'Address'} v={`${r.address.label} · ${r.address.line}`} />
              {r.supplies ? <Detail k="Boxes & labels" v={`${r.supplies.boxes} boxes${r.supplies.extraLabels ? `, ${r.supplies.extraLabels} extra labels` : ''}`} /> : null}
              {r.pickup ? <Detail k="Collecting" v={`${r.pickup.boxes} boxes, ${r.pickup.bulky} bulky${r.pickup.description ? ` · ${r.pickup.description}` : ''}`} /> : null}
              {r.job ? <Detail k="Job" v={r.job} /> : null}
              {r.notes ? <Detail k="Instructions" v={r.notes} /> : null}
              <Detail k={r.charged != null ? 'Charged' : 'Estimate'} v={aed(r.charged ?? r.estimate.total)} />
            </Card>

            {r.items.length ? (
              <Card style={{ paddingVertical: 8 }}>
                <Text variant="title" style={{ paddingTop: 6 }}>Items ({r.items.length})</Text>
                {r.items.map((i) => (
                  <ItemRow key={i.id} selectable={false} onPress={() => router.push({ pathname: '/item/[id]', params: { id: i.id } })}
                    item={{ id: i.id, label: i.label, name: i.name, category: '', status: i.status ?? 'scheduled', hasPhoto: false, dims: null }} />
                ))}
              </Card>
            ) : null}

            {cancellable ? <Button title="Cancel request" variant="soft" loading={cancel.isPending} onPress={confirmCancel} /> : null}
            <Button title="Contact support" variant="ghost" icon={MessageCircle}
              onPress={() => Linking.openURL(`${WHATSAPP}?text=${encodeURIComponent(`Hi PurpleBox, about my request ${r.ref}: `)}`)} />
          </>
        ) : null}
      </Page>
    </Screen>
  );
}

function Detail({ k, v }: { k: string; v: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text variant="meta">{k}</Text>
      <Text>{v}</Text>
    </View>
  );
}
