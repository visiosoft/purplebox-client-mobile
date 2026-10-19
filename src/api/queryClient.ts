import { QueryClient } from '@tanstack/react-query';

/** The app's one query cache. Its keys aren't per customer, so it is cleared whenever the signed-in customer goes away. */
export const queryClient = new QueryClient();
