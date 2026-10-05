import { useEffect, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard } from 'lucide-react-native';
import { BottomSheet } from './BottomSheet';
import { Text } from './Text';
import { Button } from './Button';
import { Banner, BannerText } from './Banner';
import { Tile } from './ListRow';
import { SuccessCheck } from './SuccessCheck';
import { Skel } from './Skeleton';
import { useTheme } from '@/theme/useTheme';
import { fonts, radius, space } from '@/theme/tokens';
import { aed2, round2 } from '@/lib/format';
import { storageApi } from '@/api/storage';

type Phase = 'choose' | 'paying' | 'checking' | 'done' | 'unconfirmed' | 'error';
export type PayResult = 'paid' | 'pending';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Re-read something every `every` ms until `done` says so, up to `tries` times. */
export async function pollUntil<T>(read: () => Promise<T>, done: (v: T) => boolean, tries = 10, every = 2000): Promise<T | null> {
  for (let i = 0; i < tries; i++) {
    try { const v = await read(); if (done(v)) return v; } catch { /* keep trying */ }
    if (i < tries - 1) await wait(every);
  }
  return null;
}

/** The single payment method we offer: Stripe's hosted card checkout. */
function MethodRow() {
  const { c } = useTheme();
  return (
    <View accessibilityRole="radio" accessibilityState={{ checked: true }} style={{
      flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: 14, paddingHorizontal: space[4],
      borderRadius: 18, borderWidth: 2, borderColor: c.brand500, backgroundColor: c.brand100, minHeight: 60,
    }}>
      <Tile icon={CreditCard} size={40} bg={c.surfaceCard} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22 }}>Card</Text>
        <Text variant="caption" tone="muted" style={{ fontFamily: fonts.regular }}>Secure checkout by Stripe</Text>
      </View>
      <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 7, borderColor: c.brand500 }} />
    </View>
  );
}

/**
 * Pay sheet: what it's for → the amount → the method → one button carrying the amount.
 * The button opens Stripe Checkout; when the browser closes we re-read the server until
 * it confirms (Stripe tells the server, never the app). Locked while paying.
 */
export function PaySheet({ visible, onClose, caption, amount, loadingAmount, feeNote, notice, start, confirm, onDone, doneLabel, describeError }: {
  visible: boolean; onClose: () => void; caption: string; amount: number; loadingAmount?: boolean;
  feeNote?: string; notice?: ReactNode;
  start: () => Promise<string>; confirm: () => Promise<PayResult>;
  onDone: () => void; doneLabel: string;
  describeError?: (e: unknown) => string | null;
}) {
  const { c } = useTheme();
  const [phase, setPhase] = useState<Phase>('choose');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (visible) { setPhase('choose'); setError(null); } }, [visible]);

  const check = async () => {
    setPhase('checking');
    setPhase((await confirm()) === 'paid' ? 'done' : 'unconfirmed');
  };

  const pay = async () => {
    setPhase('paying');
    setError(null);
    let url: string;
    try {
      url = await start();
    } catch (e) {
      setError(describeError?.(e) ?? `${e instanceof Error ? e.message : 'Something went wrong'}. No money was taken.`);
      setPhase('error');
      return;
    }
    try { await WebBrowser.openBrowserAsync(url); } catch { /* the page may still have opened */ }
    await check();
  };

  const locked = phase === 'paying' || phase === 'checking';

  return (
    <BottomSheet visible={visible} onClose={phase === 'done' ? onDone : onClose} locked={locked}>
      {phase === 'done' ? (
        <View style={{ alignItems: 'center', gap: space[2], paddingTop: 6 }}>
          <SuccessCheck />
          <Text variant="title2" style={{ fontFamily: fonts.extrabold, marginTop: 6 }}>Payment received</Text>
          <Text style={{ fontFamily: fonts.extrabold, fontSize: 30, lineHeight: 36 }}>{aed2(amount)}</Text>
          <Text tone="muted" style={{ textAlign: 'center', marginBottom: space[3] }}>Your receipt is in Billing whenever you need it.</Text>
          <Button block title={doneLabel} onPress={onDone} />
        </View>
      ) : (
        <View>
          <Text variant="caption" tone="muted" style={{ fontFamily: fonts.semibold }}>{caption}</Text>
          {loadingAmount ? <Skel w="60%" h={44} style={{ marginTop: 4, marginBottom: space[4] }} /> : (
            <Text variant="amount" style={{ marginTop: 4, marginBottom: feeNote ? 2 : space[4] }}>{aed2(amount)}</Text>
          )}
          {feeNote && !loadingAmount ? <Text variant="caption" tone="muted" style={{ marginBottom: space[4] }}>{feeNote}</Text> : null}
          {notice ? <View style={{ marginBottom: space[3] }}>{notice}</View> : null}
          {phase === 'error' && error ? (
            <Banner tone="error" style={{ marginBottom: space[3] }}><BannerText>{error}</BannerText></Banner>
          ) : null}
          {phase === 'unconfirmed' ? (
            <Banner tone="warn" style={{ marginBottom: space[3] }}>
              <BannerText bold="We haven't received your payment yet.">
                If you closed the payment page, no money was taken. If you paid, it shows here within a minute — you won't be charged twice.
              </BannerText>
            </Banner>
          ) : null}
          <MethodRow />
          <View style={{ gap: space[2], marginTop: space[4] }}>
            {phase === 'unconfirmed' ? (
              <>
                <Button block title="Check again" onPress={check} />
                <Button block variant="ghost" title={`Pay ${aed2(amount)}`} onPress={pay} />
              </>
            ) : (
              <Button
                block
                title={phase === 'error' ? 'Try again' : `Pay ${aed2(amount)}`}
                loading={locked}
                loadingTitle={phase === 'checking' ? 'Checking your payment…' : 'Paying…'}
                disabled={loadingAmount}
                onPress={pay}
              />
            )}
          </View>
          <Text variant="caption" tone="muted" style={{ textAlign: 'center', marginTop: space[3] }}>
            Encrypted · we never see your full card number
          </Text>
        </View>
      )}
    </BottomSheet>
  );
}

/** Pay one storage invoice by card. Re-reads the invoice until the server marks it paid. */
export function InvoicePaySheet({ invoiceId, visible, onClose, onPaid }: {
  invoiceId: string | null; visible: boolean; onClose: () => void; onPaid?: () => void;
}) {
  const qc = useQueryClient();
  // Keep showing the last invoice while the sheet slides away after the parent clears it.
  const [kept, setKept] = useState(invoiceId);
  if (invoiceId && invoiceId !== kept) setKept(invoiceId);
  const id = invoiceId ?? kept;
  const q = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => storageApi.invoice(id!),
    enabled: !!id && visible,
  });
  const inv = q.data;
  const balance = inv?.balanceDue ?? 0;
  const pct = inv?.cardFeePct ?? 0;
  const fee = pct > 0 ? round2(Math.round(balance * pct) / 100) : 0;

  const refresh = () => Promise.all(
    [['home'], ['invoices'], ['payments'], ['documents'], ['invoice', id]].map((queryKey) => qc.invalidateQueries({ queryKey })),
  );

  return (
    <PaySheet
      visible={visible}
      onClose={onClose}
      caption={inv ? `${inv.subject || `Invoice ${inv.invoiceNo}`} · ${inv.invoiceNo}` : 'Your invoice'}
      amount={round2(balance + fee)}
      loadingAmount={!inv}
      feeNote={fee ? `Includes a ${pct}% card fee (${aed2(fee)})` : undefined}
      start={async () => (await storageApi.pay(id!)).url}
      confirm={async () => {
        const v = await pollUntil(() => storageApi.invoice(id!), (i) => i.balanceDue <= 0, 8);
        await refresh();
        return v ? 'paid' : 'pending';
      }}
      doneLabel="Done"
      onDone={() => { onClose(); onPaid?.(); }}
    />
  );
}
