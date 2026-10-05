import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { ChevronDown, ChevronUp, MapPin, MessageCircle, Phone } from 'lucide-react-native';
import { Button, Card, Heading, Icon, Screen, ScrollBody, SectionHead, Text, Tile } from '@/components';
import { useTheme } from '@/theme/useTheme';
import { fonts, space } from '@/theme/tokens';
import { OFFICE_PHONE, callOffice, openMaps, openWhatsApp } from '@/lib/contact';

const FAQ: [string, string][] = [
  ['How do I pay my rent?', 'Open Billing and tap Pay. You pay by card on Stripe\'s secure checkout page; a 3% card fee is added there.'],
  ['How often am I billed?', 'Rent is billed every 4 weeks (28 days), from your move-in date.'],
  ['Can I extend or leave early?', 'Yes. Go to My units, open your unit and tap Change or end rental. We confirm every request on WhatsApp.'],
  ['How do I get my advance back?', 'The refundable advance comes back after you move out, once we\'ve checked the unit is empty.'],
  ['What can\'t I store?', 'Anything flammable, perishable, illegal or alive. The full list is in your agreement.'],
];

function Faq() {
  const { c } = useTheme();
  const [open, setOpen] = useState(-1);
  return (
    <View style={{ borderRadius: 18, backgroundColor: c.surfaceCard, borderWidth: 1, borderColor: c.line, paddingHorizontal: space[4] }}>
      {FAQ.map(([q, a], i) => (
        <View key={q} style={i > 0 ? { borderTopWidth: 1, borderTopColor: c.line } : null}>
          <Pressable
            onPress={() => setOpen(open === i ? -1 : i)}
            accessibilityRole="button"
            accessibilityState={{ expanded: open === i }}
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space[3], minHeight: 58 }}
          >
            <Text style={{ flex: 1, fontFamily: fonts.semibold }}>{q}</Text>
            <Icon as={open === i ? ChevronUp : ChevronDown} size={20} color={c.inkMuted} />
          </Pressable>
          {open === i ? <Text tone="muted" style={{ fontSize: 15, lineHeight: 22, paddingBottom: space[4] }}>{a}</Text> : null}
        </View>
      ))}
    </View>
  );
}

/** WhatsApp is the biggest thing on the screen — that's where customers already are. */
export default function HelpTab() {
  return (
    <Screen>
      <ScrollBody contentStyle={{ paddingTop: 14 }}>
        <Heading title="How can we help?" lead="Real people at PurpleBox, on WhatsApp, by phone or in person." />
        <Button
          block
          variant="whatsapp"
          icon={MessageCircle}
          title="Chat on WhatsApp"
          subtitle="Message our team"
          onPress={() => openWhatsApp()}
        />
        <View style={{ flexDirection: 'row', gap: space[3], marginTop: space[3] }}>
          <Card onPress={callOffice} style={{ flex: 1, gap: space[2] }} accessibilityLabel={`Call us on ${OFFICE_PHONE}`}>
            <Tile icon={Phone} />
            <Text style={{ fontFamily: fonts.bold }}>Call us</Text>
            <Text variant="caption" tone="muted" style={{ direction: 'ltr' }}>{OFFICE_PHONE}</Text>
          </Card>
          <Card onPress={openMaps} style={{ flex: 1, gap: space[2] }} accessibilityLabel="Visit us in Al Quoz, opens maps">
            <Tile icon={MapPin} />
            <Text style={{ fontFamily: fonts.bold }}>Visit us</Text>
            <Text variant="caption" tone="muted">Al Quoz, Dubai</Text>
          </Card>
        </View>
        <SectionHead title="Common questions" />
        <Faq />
      </ScrollBody>
    </Screen>
  );
}
