import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { FileImage, FileText, Plus, ShieldCheck } from 'lucide-react-native';
import { BiometricGate } from '@/components/BiometricGate';
import { Button, Card, Screen, Text, TopBar } from '@/components/ui';
import { Page, Row, RowIcon, StatusChip } from '@/components/bits';
import { FileItem, filesApi } from '@/api/profile';
import { shortDate } from '@/lib/format';
import { useTheme } from '@/theme/useTheme';

// The customer's own identity documents and anything the office has filed for them, from our Google Drive.
function MyFilesScreen() {
  const router = useRouter();
  const { c } = useTheme();
  const q = useQuery({ queryKey: ['files'], queryFn: filesApi.list });
  const docs = q.data?.documents ?? [];
  const ids = docs.filter((d) => d.type === 'emirates_id' || d.type === 'passport');
  const other = docs.filter((d) => d.type !== 'emirates_id' && d.type !== 'passport');

  const isImage = (d: FileItem) => (d.mime ?? '').startsWith('image/');
  const open = (d: FileItem) => router.push({ pathname: '/document', params: { href: d.href, title: d.name, mime: d.mime ?? '', ext: isImage(d) ? 'jpg' : 'pdf' } });
  const row = (d: FileItem) => (
    <Row key={d.id} leading={<RowIcon icon={isImage(d) ? FileImage : FileText} />} title={d.name}
      sub={`${d.source === 'you' ? 'Uploaded by you' : 'Filed by PurpleBox'} · ${shortDate(d.createdAt)}${d.contractNo ? ` · ${d.contractNo}` : ''}`}
      onPress={() => open(d)} right={d.source === 'you' ? <StatusChip label="On file" tone="ok" /> : undefined} />
  );

  return (
    <Screen>
      <TopBar title="My files" />
      <Page loading={q.isLoading} error={q.error?.message} refreshing={q.isRefetching} onRefresh={() => q.refetch()}>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <ShieldCheck color={c.ink3} size={18} strokeWidth={1.6} />
          <Text variant="meta" style={{ flex: 1 }}>What you upload is kept private in {q.data?.storedIn ?? 'our secure storage'}. It is shown only to you here, and to our team.</Text>
        </View>

        <Card style={{ paddingVertical: 8 }}>
          <Text variant="overline" color="ink3" style={{ marginTop: 10 }}>YOUR ID</Text>
          {ids.length === 0 && !q.isLoading ? <Text color="ink2" style={{ paddingVertical: 14 }}>No ID uploaded yet.</Text> : null}
          {ids.map(row)}
          <Button title={ids.length ? 'Replace or add' : 'Upload Emirates ID or passport'} variant={ids.length ? 'soft' : 'accent'} icon={Plus}
            style={{ marginVertical: 10, height: 46 }} onPress={() => router.push('/id-upload')} />
        </Card>
        {q.data && !q.data.complete && ids.length ? <Text variant="meta" style={{ color: c.warn }}>Your ID is incomplete: an Emirates ID needs both sides.</Text> : null}

        {other.length ? (
          <Card style={{ paddingVertical: 8 }}>
            <Text variant="overline" color="ink3" style={{ marginTop: 10 }}>OTHER DOCUMENTS</Text>
            {other.map(row)}
          </Card>
        ) : null}

        <Button title="Contracts, invoices and receipts" variant="ghost" onPress={() => router.navigate({ pathname: '/(tabs)/storage', params: { tab: 'documents' } })} />
        <Text variant="meta" style={{ textAlign: 'center' }}>Your ID is attached to your contract automatically, so you only upload it once.</Text>
      </Page>
    </Screen>
  );
}

export default function MyFiles() {
  return (
    <BiometricGate title="My files" reason="Unlock to see your ID and documents.">
      <MyFilesScreen />
    </BiometricGate>
  );
}
