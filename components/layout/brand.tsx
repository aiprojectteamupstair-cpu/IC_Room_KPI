import Link from "next/link";
import Image from "next/image";
export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      aria-label="Innovation Centre home"
      className="flex min-w-0 items-center justify-center"
    >
      <Image
        src="/brand/innovation-centre.png"
        alt="Strategy First International College Innovation Centre"
        width={8010}
        height={1948}
        sizes="(max-width: 640px) 180px, 220px"
        loading="eager"
        className="h-auto max-h-12 w-[180px] max-w-full object-contain sm:w-[220px]"
      />
    </Link>
  );
}
