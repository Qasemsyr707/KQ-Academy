import { redirect } from 'next/navigation';

/** The real live sessions are listed at /live (database records, authorised LiveKit tokens). */
export default function LegacyLivePage() {
  redirect('/live');
}
