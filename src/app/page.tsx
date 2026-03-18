import { auth } from '@/auth';
import { redirect } from 'next/navigation';

const HomePage = async () => {
  const session = await auth();

  if (session) {
    redirect('/gallery');
  } else {
    redirect('/login');
  }
};

export default HomePage;
