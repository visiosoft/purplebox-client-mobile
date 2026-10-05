import { useState, type Ref } from 'react';
import { Platform, TextInput, View, type TextInputProps, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from './Text';
import { Icon, type IconType } from './Icon';
import { useTheme } from '@/theme/useTheme';
import { fonts, radius, space } from '@/theme/tokens';

const noWebOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null;

type Props = Omit<TextInputProps, 'style'> & {
  label: string;
  /** Helper below the field; replaced by `error` when there is one. */
  help?: string;
  error?: string | null;
  /** Fixed lead-in such as "+971". */
  prefix?: string;
  icon?: IconType;
  /** Keep the value left-to-right (phone numbers, unit numbers) even in RTL. */
  ltr?: boolean;
  inputStyle?: TextInputProps['style'];
  style?: StyleProp<ViewStyle>;
  ref?: Ref<TextInput>;
};

/** 56px field with a visible label above and help or error below; the border carries the state. */
export function Input({ label, help, error, prefix, icon, ltr, inputStyle, style, onFocus, onBlur, ref, ...p }: Props) {
  const { c } = useTheme();
  const [focused, setFocused] = useState(false);
  const border = error ? c.danger : focused ? c.brand500 : c.lineStrong;
  return (
    <View style={[{ gap: space[2] }, style]}>
      <Text style={{ fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20 }}>{label}</Text>
      <View style={[
        {
          minHeight: 56, borderRadius: radius.md, borderWidth: 1.5, borderColor: border, backgroundColor: c.surfaceCard,
          paddingHorizontal: space[4], flexDirection: 'row', alignItems: 'center', gap: space[2],
        },
        focused ? { boxShadow: `0px 0px 0px 3px ${c.brand200}` } : null,
        ltr ? { direction: 'ltr' } : null,
      ]}>
        {icon ? <Icon as={icon} size={20} color={c.inkMuted} /> : null}
        {prefix ? (
          <View style={{ paddingEnd: space[3], borderEndWidth: 1, borderEndColor: c.line }}>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 17, lineHeight: 24, color: c.inkMuted }}>{prefix}</Text>
          </View>
        ) : null}
        <TextInput
          ref={ref}
          placeholderTextColor={c.inkSubtle}
          selectionColor={c.brand500}
          accessibilityLabel={label}
          {...p}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          style={[
            { flex: 1, minWidth: 0, minHeight: 52, fontFamily: fonts.medium, fontSize: 17, color: c.ink, paddingVertical: 0 },
            ltr ? { textAlign: 'left', writingDirection: 'ltr' } : null,
            noWebOutline,
            inputStyle,
          ]}
        />
      </View>
      {error || help ? (
        <Text variant="caption" style={{ color: error ? c.danger : c.inkMuted, fontFamily: fonts.medium }}>{error || help}</Text>
      ) : null}
    </View>
  );
}
