import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { FileText, LogOut, User } from 'lucide-react-native';
import { BottomSheet, Button, ListRow, RowCard, Screen, ScrollBody, Text, TopBar, toast, useProfileForm } from '@/components';
import { useTheme } from '@/theme/useTheme';
import { fonts, space } from '@/theme/tokens';
import { useAuth } from '@/store/auth';
import { hasRealName, initial } from '@/lib/format';

function EditSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const form = useProfileForm({ onSaved: () => { onClose(); toast('Details saved'); } });
  return (
    <BottomSheet visible={visible} onClose={onClose} locked={form.busy} title="Personal details">
      <Text tone="muted" style={{ marginTop: 6, marginBottom: space[4] }}>Your name goes on your agreement and invoices.</Text>
      {form.fields}
      <Button block title="Save" loading={form.busy} loadingTitle="Saving" onPress={form.submit} style={{ marginTop: space[5] }} />
    </BottomSheet>
  );
}

/** Profile, documents and log out (confirmed in a sheet). */
export default function Account() {
  const router = useRouter();
  const qc = useQueryClient();
  const { c } = useTheme();
  const { customer, logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const named = hasRealName(customer?.fullName);

  return (
    <Screen>
      <TopBar title="Account" />
      <ScrollBody>
        <View style={{ alignItems: 'center', gap: 6, marginTop: 6, marginBottom: 18 }}>
          <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: c.brand500, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: fonts.extrabold, fontSize: 32, lineHeight: 38, color: c.onBrand }}>{initial(customer?.fullName)}</Text>
          </View>
          <Text style={{ fontFamily: fonts.extrabold, fontSize: 22, lineHeight: 28 }}>{named ? customer!.fullName : 'Add your name'}</Text>
          <Text tone="muted" style={{ direction: 'ltr' }}>{customer?.phone}</Text>
        </View>
        <RowCard>
          <ListRow
            icon={User}
            title="Personal details"
            sub={[named ? 'Name' : 'Add your name', customer?.email || 'add an email'].join(' · ')}
            chevron
            onPress={() => setEditing(true)}
          />
          <ListRow icon={FileText} title="Documents" sub="Agreements, invoices and receipts" chevron onPress={() => router.push('/documents')} />
        </RowCard>
        <Button block variant="ghost" icon={LogOut} color={c.danger} title="Log out" onPress={() => setLeaving(true)} style={{ marginTop: 18 }} />
        <Text variant="caption" tone="muted" style={{ textAlign: 'center', marginTop: space[2] }}>Version 1.0</Text>
      </ScrollBody>

      <EditSheet visible={editing} onClose={() => setEditing(false)} />
      <BottomSheet visible={leaving} onClose={() => setLeaving(false)} title="Log out?">
        <Text tone="muted" style={{ marginTop: 6, marginBottom: space[4] }}>You'll need a code to your phone to sign back in.</Text>
        <View style={{ gap: space[2] }}>
          <Button block title="Log out" onPress={async () => { setLeaving(false); qc.clear(); await logout(); }} />
          <Button block variant="ghost" title="Stay signed in" onPress={() => setLeaving(false)} />
        </View>
      </BottomSheet>
    </Screen>
  );
}
