import { View } from 'react-native';
import { CircleAlert, MessageCircle, RefreshCw, WifiOff } from 'lucide-react-native';
import { Text } from './Text';
import { Button } from './Button';
import { Icon, type IconType } from './Icon';
import { useTheme } from '@/theme/useTheme';
import { fonts, space } from '@/theme/tokens';
import { openWhatsApp } from '@/lib/contact';
import { ApiError } from '@/api/client';

type Action = { label: string; onPress: () => void; icon?: IconType };

/**
 * Friendly placeholder that always leads somewhere: art tile, title, one sentence, the
 * next action (and at most one ghost). `tone="error"` uses the danger tint.
 */
export function EmptyState({ icon, title, body, primary, secondary, tone = 'brand' }: {
  icon: IconType; title: string; body: string; primary?: Action; secondary?: Action; tone?: 'brand' | 'error';
}) {
  const { c } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: space[3], paddingVertical: space[8], paddingHorizontal: space[5] }}>
      <View style={{
        width: 120, height: 120, borderRadius: 40, marginBottom: space[2], alignItems: 'center', justifyContent: 'center',
        backgroundColor: tone === 'error' ? c.dangerTint : c.brand100,
      }}>
        <Icon as={icon} size={52} color={tone === 'error' ? c.danger : c.brand500} />
      </View>
      <Text accessibilityRole="header" style={{ fontFamily: fonts.extrabold, fontSize: 22, lineHeight: 28, textAlign: 'center' }}>{title}</Text>
      <Text tone="muted" style={{ textAlign: 'center', maxWidth: 290 }}>{body}</Text>
      {primary || secondary ? (
        <View style={{ alignSelf: 'stretch', gap: space[2], marginTop: space[3] }}>
          {primary ? <Button block title={primary.label} icon={primary.icon} onPress={primary.onPress} /> : null}
          {secondary ? <Button block variant="ghost" title={secondary.label} icon={secondary.icon} onPress={secondary.onPress} /> : null}
        </View>
      ) : null}
    </View>
  );
}

const isOffline = (e: unknown) => e instanceof ApiError ? e.status === 0 : e instanceof TypeError;

/** Error view: says what happened, offers Try again and Chat on WhatsApp. */
export function ErrorState({ title, body, onRetry, error }: { title: string; body: string; onRetry: () => void; error?: unknown }) {
  const offline = isOffline(error);
  return (
    <EmptyState
      tone="error"
      icon={offline ? WifiOff : CircleAlert}
      title={offline ? "You're offline" : title}
      body={offline ? 'Check your connection and try again. Your details are safe.' : body}
      primary={{ label: 'Try again', icon: RefreshCw, onPress: onRetry }}
      secondary={{ label: 'Chat on WhatsApp', icon: MessageCircle, onPress: () => openWhatsApp() }}
    />
  );
}
