// When to nudge someone about an unfinished booking: about 3 hours after they started (today), then the next day,
// then 3 days after that first day. Never at night: anything outside 09:00-21:00 waits for 10:00 the next morning.
export const REMINDER_COUNT = 3;

const QUIET_START = 21; // from 21:00
const QUIET_END = 9; // until 09:00

const atHour = (d: Date, hour: number, addDays = 0) => {
  const x = new Date(d);
  x.setDate(x.getDate() + addDays);
  x.setHours(hour, 0, 0, 0);
  return x;
};

export function planReminders(from: Date): Date[] {
  let first = new Date(from.getTime() + 3 * 3_600_000);
  if (first.getHours() >= QUIET_START) first = atHour(first, 10, 1);
  else if (first.getHours() < QUIET_END) first = atHour(first, 10);
  return [first, atHour(first, 11, 1), atHour(first, 11, 3)];
}

export type ReminderBooking = { bookingId: string; quoteNo: string; state: string; unitNumber?: string; sizeSqf?: number };

/** The wording changes with how far along the booking is and with which reminder this is. */
export function reminderCopy(b: ReminderBooking, n: number): { title: string; body: string } {
  const unit = b.unitNumber ? `Unit ${b.unitNumber}${b.sizeSqf ? ` (${b.sizeSqf} sq ft)` : ''}` : 'your storage unit';
  if (b.state === 'ready_to_sign') {
    return {
      title: n === 0 ? 'One last step: sign your contract' : n === 1 ? 'Your contract is waiting' : 'Final reminder: sign your contract',
      body: `Booking ${b.quoteNo}: payment received. Sign your contract to activate ${unit}.`,
    };
  }
  return {
    title: n === 0 ? 'Finish your booking' : n === 1 ? 'Still need storage?' : 'Last reminder for your booking',
    body: n === 2
      ? `Booking ${b.quoteNo} for ${unit} is still not complete. Tap to finish it or pick a new unit.`
      : `You started booking ${b.quoteNo} for ${unit} but haven't paid yet. Tap to finish it.`,
  };
}
