import { Pressable, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellOff, CalendarClock, ClipboardCheck, CreditCard, Gift, Truck, type LucideIcon } from 'lucide-react-native';
import { Card, Screen, Text, TopBar } from '@/components/ui';
import { Page } from '@/components/bits';
import { IconTile } from '@/components/service';
import { notificationsApi, type AppNotification, type NotificationKind } from '@/api/notifications';
import { useTheme } from '@/theme/useTheme';
import { fonts } from '@/theme/tokens';

const ICON: Record<NotificationKind, LucideIcon> = {
  payment: CreditCard, renewal: CalendarClock, promotion: Gift, inspection: ClipboardCheck, service: Truck,
};

// "Today" and "Earlier", as the design groups them.
const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();
const when = (iso: string) => new Date(iso).toLocaleString('en-GB', isToday(iso)
  ? { hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'short' });

export default function NotificationsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { c } = useTheme();
  const q = useQuery({ queryKey: ['notifications'], queryFn: notificationsApi.list });
  const items = q.data?.items ?? [];
  const refresh = () => qc.invalidateQueries({ queryKey: ['notifications'] });
  const readAll = useMutation({ mutationFn: notificationsApi.readAll, onSuccess: refresh });

  const open = (n: AppNotification) => {
    if (!n.read) notificationsApi.read([n.id]).then(refresh).catch(() => {});
    if (n.data?.route) router.push((n.data.params ? { pathname: n.data.route, params: n.data.params } : n.data.route) as Href);
  };

  const groups: [string, AppNotification[]][] = [
    ['Today', items.filter((n) => isToday(n.createdAt))],
    ['Earlier', items.filter((n) => !isToday(n.createdAt))],
  ];

  return (
    <Screen>
      <TopBar title="Notifications" right={q.data?.unread ? (
        <Pressable onPress={() => readAll.mutate()} hitSlop={10} accessibilityRole="button" style={{ justifyContent: 'center', minHeight: 44 }}>
          <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: c.ink, textDecorationLine: 'underline' }}>Mark all read</Text>
        </Pressable>
      ) : null} />
      <Page loading={q.isLoading} error={q.error?.message} refreshing={q.isRefetching} onRefresh={() => q.refetch()}>
        {!items.length && !q.isLoading ? (
          <View style={{ alignItems: 'center', gap: 8, padding: 32 }}>
            <BellOff color={c.ink3} size={30} strokeWidth={1.4} />
            <Text variant="title">Nothing yet</Text>
            <Text variant="meta" style={{ textAlign: 'center' }}>Payment reminders, renewals, inspections and updates on your requests show up here.</Text>
          </View>
        ) : null}
        {groups.map(([title, list]) => list.length ? (
          <View key={title} style={{ gap: 8 }}>
            <Text variant="overline" color="ink2" style={{ marginLeft: 4 }}>{title}</Text>
            <Card style={{ paddingVertical: 4 }}>
              {list.map((n, i) => (
                <Pressable key={n.id} onPress={() => open(n)} accessibilityRole="button"
                  accessibilityLabel={`${n.read ? '' : 'Unread. '}${n.title}. ${n.body}`}
                  style={({ pressed }) => ({ flexDirection: 'row', gap: 12, paddingVertical: 12, opacity: pressed ? 0.7 : 1, borderTopWidth: i ? 1 : 0, borderTopColor: c.ln })}>
                  <IconTile icon={ICON[n.kind] ?? CreditCard} size={40} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                      <Text variant="title" style={{ fontSize: 15, flex: 1, fontFamily: n.read ? fonts.regular : fonts.medium }}>{n.title}</Text>
                      <Text variant="meta">{when(n.createdAt)}</Text>
                    </View>
                    <Text variant="meta" color="ink2">{n.body}</Text>
                  </View>
                  {!n.read ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.err, marginTop: 6 }} /> : null}
                </Pressable>
              ))}
            </Card>
          </View>
        ) : null)}
      </Page>
    </Screen>
  );
}
