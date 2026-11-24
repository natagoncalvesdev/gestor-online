import Image from "next/image";
import Link from "next/link";

export function Logo({
  size = 44,
  href = "/",
}: {
  size?: number;
  href?: string;
}) {
  return (
    <Link href={href} className="inline-flex shrink-0 items-center">
      <Image
        src="/logo-online.png"
        alt="CETADEB Online"
        width={size}
        height={size}
        priority
        className="rounded-full"
      />
    </Link>
  );
}
