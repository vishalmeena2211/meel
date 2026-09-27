import Link from "next/link";

import { IconMap } from "@/components/icons";
import { Empty } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 pt-6">
      <Empty title="There is no page at this address">
        <span className="text-sm">The link may be old, or mistyped. Nothing is wrong with your phone.</span>
        <Link className="btn btn-soft" href="/">
          <IconMap />
          See all routes
        </Link>
      </Empty>
    </div>
  );
}
