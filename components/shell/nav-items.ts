import { Home, Map, Sparkles, User, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
}

export const navItems: NavItem[] = [
  { href: "/", label: "Together", icon: Home, match: (p) => p === "/" },
  {
    href: "/trips",
    label: "Trips",
    icon: Map,
    match: (p) => p.startsWith("/trips"),
  },
  {
    href: "/wishlist",
    label: "Someday",
    icon: Sparkles,
    match: (p) => p.startsWith("/wishlist"),
  },
  {
    href: "/profile",
    label: "You",
    icon: User,
    match: (p) => p.startsWith("/profile"),
  },
];
