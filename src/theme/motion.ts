import { Easing } from 'react-native-reanimated';
import { easing } from './tokens';

/** ease-spring: press release and success pop */
export const easeSpring = Easing.bezier(...easing.spring);
/** ease-out: sheets and screen transitions */
export const easeOut = Easing.bezier(...easing.out);
