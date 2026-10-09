import Link from "next/link";
export default function NotFound() {
  return (
    <main className="p-16 text-center">
      <p className="eyebrow">404</p>
      <h1 className="my-4 text-3xl font-bold">This space doesn&apos;t exist</h1>
      <Link className="text-primary" href="/">
        Return to the Innovation Centre
      </Link>
    </main>
  );
}
