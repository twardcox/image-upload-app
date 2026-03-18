import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { UserMenu } from '@/components/user-menu';
import { H2 } from '@/components/ui/typography';

const AuthenticatedLayout = async ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <H2 className="text-2xl">
            <Link href="/gallery">Image Gallery</Link>
          </H2>
          <UserMenu user={session.user} />
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
};

export default AuthenticatedLayout;
