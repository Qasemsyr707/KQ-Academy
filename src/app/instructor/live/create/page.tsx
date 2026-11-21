import { redirect } from 'next/navigation';

/** Kept for old links: live sessions are created from the unified live manager. */
export default function CreateLivePage() {
  redirect('/instructor/live?mode=now');
}
