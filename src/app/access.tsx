import { useState } from 'react';
import { Alert, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Phone, Trash2, User, Users } from 'lucide-react-native';
import { Avatar, Button, Card, IconButton, Input, Screen, Text, TopBar } from '@/components/ui';
import { Page, Row, Segmented } from '@/components/bits';
import { accessApi } from '@/api/profile';
import { storageApi } from '@/api/storage';
import { useI18n } from '@/i18n';
import { toE164 } from '@/lib/format';

// Who else may enter your unit. Added here, it is on your contract straight away, the same list our team checks at the gate.
export default function Access() {
  const qc = useQueryClient();
  const { t } = useI18n();
  const { contractId } = useLocalSearchParams<{ contractId?: string }>();
  const contracts = useQuery({ queryKey: ['contracts'], queryFn: storageApi.contracts });
  const live = (contracts.data ?? []).filter((k) => k.status === 'active' || k.status === 'pending_signature');
  const [picked, setPicked] = useState<string | undefined>(contractId);
  const contract = live.find((k) => k.id === picked) ?? live[0];

  const list = useQuery({ queryKey: ['access', contract?.id], queryFn: () => accessApi.list(contract!.id), enabled: !!contract });
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+971 ');
  const [relation, setRelation] = useState('');

  const add = useMutation({
    mutationFn: () => accessApi.add(contract!.id, { name: name.trim(), phone: toE164(phone), relation: relation.trim() }),
    onSuccess: (data) => { qc.setQueryData(['access', contract!.id], data); qc.invalidateQueries({ queryKey: ['profile'] }); setName(''); setPhone('+971 '); setRelation(''); },
    onError: (e: Error) => Alert.alert(t('Could not add'), e.message),
  });
  const remove = useMutation({
    mutationFn: (index: number) => accessApi.remove(contract!.id, index),
    onSuccess: (data) => { qc.setQueryData(['access', contract!.id], data); qc.invalidateQueries({ queryKey: ['profile'] }); },
    onError: (e: Error) => Alert.alert(t('Could not remove'), e.message),
  });
  const confirmRemove = (index: number, who: string) =>
    Alert.alert(t('Remove access?'), t('{who} will no longer be able to enter {units}.', { who, units: contract?.units.map((u) => u.unitNumber).join(', ') ?? '' }), [
      { text: t('Cancel'), style: 'cancel' }, { text: t('Remove'), style: 'destructive', onPress: () => remove.mutate(index) },
    ]);

  const people = list.data?.people ?? [];
  const full = people.length >= (list.data?.max ?? 6);
  const valid = name.trim().length >= 2 && toE164(phone).replace(/\D/g, '').length >= 11;

  return (
    <Screen>
      <TopBar title={t('Who can enter')} />
      <Page loading={contracts.isLoading} error={contracts.error?.message}>
        {!contract ? (
          <Card style={{ gap: 6 }}>
            <Text variant="h3">{t('No active unit yet')}</Text>
            <Text color="ink2">{t('Once you have a unit you can allow family, staff or a driver to access it.')}</Text>
          </Card>
        ) : (
          <>
            <Text color="ink2">{t('Add the people allowed to enter your unit. We check this list at the gate.')}</Text>
            {live.length > 1 ? (
              <Segmented value={contract.id} onChange={setPicked} options={live.map((k) => ({ value: k.id, label: k.units[0]?.unitNumber ?? k.contractNo }))} />
            ) : null}

            <Card style={{ paddingVertical: 8 }}>
              <Text variant="overline" color="ink3" style={{ marginTop: 10 }}>{t('ALLOWED · {n} of {max}', { n: people.length, max: list.data?.max ?? 6 })}</Text>
              {people.length === 0 && !list.isLoading ? <Text color="ink2" style={{ paddingVertical: 14 }}>{t('Only you, for now.')}</Text> : null}
              {people.map((p) => (
                <Row key={p.index} leading={<Avatar name={p.name} size={44} tone="light" />} title={p.name} sub={`${p.relation ? `${p.relation} · ` : ''}${p.phone}`}
                  right={<IconButton icon={Trash2} label={t('Remove {name}', { name: p.name })} size={40} onPress={() => confirmRemove(p.index, p.name)} />} />
              ))}
            </Card>

            <Card style={{ gap: 14 }}>
              <Text variant="h3">{t('Add a person')}</Text>
              <Input label={t('Full name')} icon={User} autoCapitalize="words" value={name} onChangeText={setName} />
              <Input label={t('Mobile number')} icon={Phone} keyboardType="phone-pad" value={phone} onChangeText={setPhone} style={{ textAlign: 'left', writingDirection: 'ltr' }} />
              <Input label={t('Relation (optional)')} icon={Users} placeholder={t('Driver, spouse, employee…')} autoCapitalize="sentences" value={relation} onChangeText={setRelation} />
              <Button title={full ? t('List is full') : t('Add person')} loading={add.isPending} disabled={!valid || full} onPress={() => add.mutate()} />
            </Card>
            <View style={{ height: 4 }} />
          </>
        )}
      </Page>
    </Screen>
  );
}
