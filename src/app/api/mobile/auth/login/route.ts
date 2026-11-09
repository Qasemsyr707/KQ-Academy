import { POST as login } from '../../login/route';

export async function POST(req: Request) {
  return login(req);
}
