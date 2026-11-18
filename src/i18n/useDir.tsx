import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useI18n } from './index';

/** Icons that point somewhere must mirror in Arabic: "back" points right, "forward" points left. */
export function useDir() {
  const { isRTL } = useI18n();
  return {
    isRTL,
    Back: isRTL ? ArrowRight : ArrowLeft,
    Forward: isRTL ? ArrowLeft : ArrowRight,
    ChevronForward: isRTL ? ChevronLeft : ChevronRight,
    ChevronBack: isRTL ? ChevronRight : ChevronLeft,
    /** +1 in English, -1 in Arabic: multiply horizontal slide distances by it. */
    sign: isRTL ? -1 : 1,
  };
}
