import { useState } from 'react';
import { Alert, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Camera, Check, ImageIcon, ShieldCheck } from 'lucide-react-native';
import { Button, Card, Screen, Text, TopBar } from '@/components/ui';
import { Page, Segmented, StatusChip } from '@/components/bits';
import { IdType, SLOTS, Slot, identityApi, isComplete, slotKey } from '@/api/identity';
import { useTheme } from '@/theme/useTheme';
import { radius } from '@/theme/tokens';

// Your agreement needs a copy of your ID. Take a photo or pick one from the library; each photo uploads as soon as it is chosen.
export default function IdUpload() {
  const router = useRouter();
  const { c } = useTheme();
  const [type, setType] = useState<IdType>('emirates_id');
  const [local, setLocal] = useState<Record<string, string>>({}); // slot -> preview uri
  const [busy, setBusy] = useState<string | null>(null);
  const status = useQuery({ queryKey: ['identity'], queryFn: identityApi.status, retry: false });

  const onFile = new Set([...(status.data?.documents ?? []).map(slotKey), ...Object.keys(local)]);
  const slots = SLOTS[type];
  const ready = slots.every((s) => onFile.has(slotKey(s)));

  const pick = async (slot: Slot, source: 'camera' | 'library') => {
    try {
      const perm = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return Alert.alert('Permission needed', `Allow ${source === 'camera' ? 'camera' : 'photo'} access in Settings to continue.`);
      const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7, allowsEditing: false };
      const r = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      if (r.canceled || !r.assets[0]) return;
      const key = slotKey(slot);
      setBusy(key);
      await identityApi.send(slot, r.assets[0]);
      setLocal((l) => ({ ...l, [key]: r.assets[0].uri }));
      status.refetch();
    } catch (e: any) {
      Alert.alert('Could not upload', e.message);
    } finally { setBusy(null); }
  };

  return (
    <Screen>
      <TopBar title="Verify your ID" />
      <Page>
        <Text color="ink2">We need a clear photo of your ID for your storage agreement. Use good light and keep all four corners in view.</Text>
        <Segmented value={type} onChange={setType} options={[{ value: 'emirates_id', label: 'Emirates ID' }, { value: 'passport', label: 'Passport' }]} />

        {slots.map((slot) => {
          const key = slotKey(slot);
          const done = onFile.has(key);
          return (
            <Card key={key} style={{ gap: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text variant="title">{slot.label}</Text>
                {done ? <StatusChip tone="ok" icon={Check} label="Uploaded" /> : null}
              </View>
              {local[key] ? <Image source={local[key]} style={{ height: 150, borderRadius: radius.tile }} contentFit="cover" /> : null}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button title={done ? 'Retake' : 'Take photo'} icon={Camera} style={{ flex: 1, height: 48 }} loading={busy === key} disabled={!!busy} onPress={() => pick(slot, 'camera')} />
                <Button title="Upload" variant="soft" icon={ImageIcon} style={{ flex: 1, height: 48 }} disabled={!!busy} onPress={() => pick(slot, 'library')} />
              </View>
            </Card>
          );
        })}

        <Button title={isComplete(onFile) || ready ? 'Done' : 'Add all photos to continue'} variant="accent" disabled={!ready}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} />
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <ShieldCheck color={c.ink3} size={16} strokeWidth={1.6} />
          <Text variant="meta" style={{ flex: 1 }}>Sent securely and used only for your agreement.</Text>
        </View>
      </Page>
    </Screen>
  );
}
