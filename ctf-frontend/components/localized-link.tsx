"use client";

import NextLink, { type LinkProps } from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { useLocalePath } from "@/lib/i18n/use-locale";

type Props = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
    children?: ReactNode;
  };

/**
 * Drop-in replacement for next/link that keeps the active locale prefix on
 * internal links. External URLs, hashes and mailto/tel links pass through.
 */
export default function Link({ href, ...props }: Props) {
  const withLocale = useLocalePath();
  const localisedHref =
    typeof href === "string" ? withLocale(href) : href;

  return <NextLink href={localisedHref} {...props} />;
}
