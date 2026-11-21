import { redirect } from 'next/navigation';

/** Kept for old links: scheduling happens in the unified live manager. */
export default function ScheduleLivePage() {
  redirect('/instructor/live?mode=schedule');
}
