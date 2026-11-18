import { create } from 'zustand';

// `open` is what the user asked for; `mounted` stays true until the closing animation has finished.
export const useDrawer = create<{ open: boolean; mounted: boolean; setOpen: (v: boolean) => void }>((set) => ({
  open: false,
  mounted: false,
  setOpen: (open) => set(open ? { open, mounted: true } : { open }),
}));
