"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Search, ShoppingBag, Menu, X, User, LogOut, ChevronDown } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/useAuth";
import { apiClient } from "@/lib/apiClient";
import { useNotificationsWS } from "@/lib/useNotificationsWS";
import { useUnreadNotifications } from "@/lib/unreadNotifications";
import { useCartCount } from "@/lib/cartCount";
import { useGuestCartCount } from "@/lib/guestCart";
import { useSearchIndex } from "@/lib/services/useSearchIndex";
import { searchEntries } from "@/lib/services/searchIndex";
import SearchSuggestions from "@/components/SearchSuggestions";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

// "/" only matches the home page exactly; every other nav link also
// matches its own sub-pages (e.g. /services/4/64/2425 keeps "Services"
// active) so the customer can always tell which section they're in.
function isNavLinkActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchIndex = useSearchIndex();
  // Debounced so a fast typist doesn't re-rank the whole index on every
  // keystroke - 150ms is imperceptible to type against but still cheap
  // since this is scoring an in-memory array, not a network round trip.
  // Shared by both the desktop and mobile search boxes, same as `query`
  // itself and handleSearchSubmit below.
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 150);
    return () => clearTimeout(t);
  }, [query]);
  const suggestions = useMemo(
    () => searchEntries(searchIndex, debouncedQuery),
    [searchIndex, debouncedQuery],
  );
  const unreadCount = useUnreadNotifications((s) => s.count);
  const setUnreadCount = useUnreadNotifications((s) => s.setCount);
  const refetchUnreadCount = useUnreadNotifications((s) => s.refetch);
  // Logged-in cart count (real server cart) vs guest cart count (local,
  // pre-login) - exactly one of these is ever relevant at a time, same
  // either/or as useAddToCart.ts's own user ? server : guest branch.
  const serverCartCount = useCartCount((s) => s.count);
  const refetchCartCount = useCartCount((s) => s.refetch);
  const guestCartCount = useGuestCartCount();
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { user, checked, fetchSession, logout } = useAuth();

  useEffect(() => {
    if (!checked) fetchSession();
  }, [checked, fetchSession]);

  // Re-validate on tab focus and periodically while the tab stays open -
  // fetchSession above only ever runs once per mount (gated on `checked`),
  // so a long-lived tab that outlives the 15-minute access-token cookie
  // never re-asked /api/auth/session again until the next full page
  // load/remount. /api/auth/session now transparently refreshes via the
  // refresh-token cookie when needed (see that route), so this just makes
  // sure the navbar actually asks again instead of showing a stale
  // logged-in/out state for the rest of the tab's lifetime.
  useEffect(() => {
    const revalidate = () => fetchSession();
    window.addEventListener("focus", revalidate);
    const interval = setInterval(revalidate, 10 * 60 * 1000);
    return () => {
      window.removeEventListener("focus", revalidate);
      clearInterval(interval);
    };
  }, [fetchSession]);

  // GET /notifications/unread-count -> { unread_count } - see
  // app/api/v1/endpoints/notifications.py:120-129 (bmd repo). Badge is only
  // meaningful for signed-in users. Re-fetched on mount and whenever a live
  // notification arrives (see useNotificationsWS below) - the fetch is the
  // source of truth (handles read-state changes from other tabs/devices
  // too), the WS event is just what triggers re-checking it promptly
  // instead of waiting for the next full page load.
  //
  // A transient failure (the customer's connection blips, a cold backend
  // instance, ...) previously silently reset the badge to 0 with no retry -
  // there's no natural place to put a manual "retry" affordance on a small
  // bell icon, so this self-heals instead: a few quick automatic retries
  // with backoff before giving up and showing 0 (which just hides the
  // badge, never shows a wrong/stale count).
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    let cancelled = false;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const delays = [1000, 3000, 6000];

    const fetchCount = () => {
      apiClient<{ unread_count: number }>("/notifications/unread-count")
        .then((res) => {
          if (!cancelled) setUnreadCount(res.unread_count ?? 0);
        })
        .catch(() => {
          if (cancelled) return;
          if (attempt < delays.length) {
            timer = setTimeout(fetchCount, delays[attempt]);
            attempt += 1;
          } else {
            setUnreadCount(0);
          }
        });
    };
    fetchCount();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [user]);

  useNotificationsWS(
    !!user,
    useCallback(() => {
      // Optimistic bump for instant feedback, then re-fetch the real count -
      // a notification's own read state (e.g. auto-marked-read notifications)
      // isn't always +1, so the fetch is what actually reconciles it.
      setUnreadCount(useUnreadNotifications.getState().count + 1);
      refetchUnreadCount();
    }, [refetchUnreadCount]),
  );

  // Establish the cart badge once per login - every mutation afterwards
  // (add/update/remove) updates useCartCount's store directly from its own
  // known delta, so this is only for "what's already in the cart" on a
  // fresh mount/login, not a polling loop.
  useEffect(() => {
    if (user) refetchCartCount();
  }, [user, refetchCartCount]);

  useEffect(() => {
    function onClickOutsideSearch(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    }
    document.addEventListener("mousedown", onClickOutsideSearch);
    return () => document.removeEventListener("mousedown", onClickOutsideSearch);
  }, []);

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    setSearchOpen(false);
    setOpen(false);
    router.push(trimmed ? `/services?q=${encodeURIComponent(trimmed)}` : "/services");
  };

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // mobile added to the fallback chain: a customer who signed up/logged in
  // via mobile OTP with no name or email set previously fell straight
  // through to the literal word "Account" in the header - not even their
  // own phone number, let alone a real identity. Every WebUser has at
  // least a mobile number (see lib/useAuth.ts), so this only reaches
  // "Account" if somehow none of first_name/full_name/email/mobile came
  // back from the session endpoint at all.
  const displayName = user?.first_name || user?.full_name || user?.email || user?.mobile || "Account";

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 lg:px-8">
        <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="BookMyDarzi"
            width={44}
            height={44}
            priority
            className="h-11 w-11 object-contain"
          />
          <span className="text-[19px] font-black tracking-[-.03em]"><span className="text-[#053448]">BookMy</span><span className="text-[#e85720]">Darzi</span></span>
        </Link>
        <nav className="hidden h-full items-center gap-8 text-sm font-semibold md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isNavLinkActive(pathname, link.href) ? "page" : undefined}
              className={
                isNavLinkActive(pathname, link.href)
                  ? "flex h-full items-center border-b-[3px] border-[#c99a3d] text-[#c99a3d]"
                  : "flex h-full items-center border-b-[3px] border-transparent text-ink hover:text-[#c99a3d]"
              }
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <div className="relative hidden sm:block" ref={searchRef}>
            <button
              aria-label="Search"
              onClick={() => setSearchOpen((v) => !v)}
              className="rounded-full p-2.5 hover:bg-gray-100"
            >
              <Search size={19} />
            </button>
            {searchOpen && (
              <div className="absolute right-0 top-full mt-2 w-80">
                <form
                  onSubmit={handleSearchSubmit}
                  className="flex items-center gap-2 rounded-2xl border border-black/10 bg-white p-2 shadow-xl"
                >
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search services..."
                    className="w-full rounded-xl bg-gray-50 px-3 py-2 text-sm outline-none"
                  />
                  <button
                    type="submit"
                    aria-label="Submit search"
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink text-white hover:bg-black"
                  >
                    <Search size={14} />
                  </button>
                </form>
                <div className="relative">
                  <SearchSuggestions
                    results={suggestions}
                    query={query}
                    onSelect={() => setSearchOpen(false)}
                  />
                </div>
              </div>
            )}
          </div>
          <Link href="/cart" aria-label="Cart" className="relative rounded-full p-2.5 hover:bg-gray-100">
            <ShoppingBag size={20} />
            {(() => {
              const cartCount = user ? serverCartCount : guestCartCount;
              return cartCount > 0 ? (
                <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-gold-deep px-1 text-[10px] font-black text-white">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              ) : null;
            })()}
          </Link>
          {user && (
            <Link href="/notifications" aria-label="Notifications" className="relative rounded-full p-2.5 hover:bg-gray-100">
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-gold-deep px-1 text-[10px] font-black text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          )}

          {!checked ? (
            <div className="hidden h-9 w-24 animate-pulse rounded-full bg-gray-100 md:block" />
          ) : user ? (
            <div className="relative hidden md:block" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 transition hover:bg-gray-100"
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-[#171717] to-[#3a3a3a] text-xs font-black text-white">
                  {/^\d/.test(displayName) ? <User size={14} /> : displayName.charAt(0).toUpperCase()}
                </span>
                <span className="max-w-[110px] truncate text-sm font-bold">{displayName}</span>
                <ChevronDown size={14} className={`text-gray-400 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-black/5 bg-white py-2 shadow-xl">
                  <div className="border-b border-black/5 px-4 py-3">
                    <p className="truncate text-sm font-bold">{displayName}</p>
                    {user.email && <p className="truncate text-xs text-gray-400">{user.email}</p>}
                  </div>
                  <Link onClick={() => setMenuOpen(false)} href="/profile" className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold hover:bg-gray-50">
                    <User size={15} /> My Account
                  </Link>
                  <Link onClick={() => setMenuOpen(false)} href="/orders" className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold hover:bg-gray-50">
                    <ShoppingBag size={15} /> My Orders
                  </Link>
                  <div className="my-1 border-t border-black/5" />
                  <button onClick={handleLogout} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50">
                    <LogOut size={15} /> Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="hidden rounded-full bg-[#171717] px-5 py-2.5 text-sm font-bold text-white hover:bg-black md:block"
            >
              Log in
            </Link>
          )}

          <button onClick={() => setOpen(!open)} className="rounded-full p-2.5 hover:bg-gray-100 md:hidden">{open ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
      </div>
      {open && (
        <nav className="border-t bg-white px-5 py-4 md:hidden">
          {/* The header search icon is desktop-only (hidden sm:block above) -
              mobile had no way to search from the header at all before this,
              only by first navigating to /services. Reuses the same
              handleSearchSubmit/query state the desktop search box uses. */}
          <div className="relative mb-4">
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 rounded-2xl border border-black/10 bg-gray-50 p-2">
              <Search size={16} className="ml-2 shrink-0 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search services..."
                className="w-full bg-transparent text-sm outline-none"
              />
              <button
                type="submit"
                aria-label="Submit search"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink text-white hover:bg-black"
              >
                <Search size={14} />
              </button>
            </form>
            <SearchSuggestions
              results={suggestions}
              query={query}
              onSelect={() => setOpen(false)}
            />
          </div>
          <div className="flex flex-col gap-4 text-sm font-semibold">
            {NAV_LINKS.map((link) => {
              const active = isNavLinkActive(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  onClick={() => setOpen(false)}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={active ? "flex items-center gap-2 text-[#c99a3d]" : undefined}
                >
                  {active && <span className="h-1.5 w-1.5 rounded-full bg-[#c99a3d]" />}
                  {link.label}
                </Link>
              );
            })}
            {user ? (
              <>
                <Link onClick={() => setOpen(false)} href="/profile">Profile</Link>
                <button onClick={() => { setOpen(false); handleLogout(); }} className="text-left text-red-600">Log out</button>
              </>
            ) : (
              <Link onClick={() => setOpen(false)} href="/login" className="text-[#c99a3d]">Log in</Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
