import { redirect } from 'next/navigation';

export default async function Home() {
  // Always redirect to todos (no authentication needed)
  redirect('/todos');
}
