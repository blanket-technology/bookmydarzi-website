"use client";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Bell, Search, ShoppingBag, Menu, X, User, LogOut, ChevronDown } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/useAuth";
import { apiClient } from "@/lib/apiClient";
import { useNotificationsWS } from "@/lib/useNotificationsWS";

export default function Header() {
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { user, checked, fetchSession, logout } = useAuth();

  useEffect(() => {
    if (!checked) fetchSession();
  }, [checked, fetchSession]);

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
      setUnreadCount((n) => n + 1);
      apiClient<{ unread_count: number }>("/notifications/unread-count")
        .then((res) => setUnreadCount(res.unread_count ?? 0))
        .catch(() => {});
    }, []),
  );

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

  const displayName = user?.first_name || user?.full_name || user?.email || "Account";

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="BookMyDarzi"
            width={44}
            height={44}
            priority
            className="h-11 w-11 object-contain"
          />
          <span className="text-[19px] font-black tracking-[-.03em]">BookMy<span className="text-[#c99a3d]">Darzi</span></span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-semibold md:flex">
          <Link href="/" className="hover:text-[#c99a3d]">Home</Link>
          <Link href="/services" className="hover:text-[#c99a3d]">Services</Link>
          <Link href="/about" className="hover:text-[#c99a3d]">About</Link>
          <Link href="/contact" className="hover:text-[#c99a3d]">Contact</Link>
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
              <form
                onSubmit={handleSearchSubmit}
                className="absolute right-0 top-full mt-2 flex w-72 items-center gap-2 rounded-2xl border border-black/10 bg-white p-2 shadow-xl"
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
            )}
          </div>
          <Link href="/cart" aria-label="Cart" className="relative rounded-full p-2.5 hover:bg-gray-100"><ShoppingBag size={20} /></Link>
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
                className="flex items-center gap-2 rounded-full py-2 pl-2 pr-3 hover:bg-gray-100"
              >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-[#171717] text-xs font-black text-white">
                  {displayName.charAt(0).toUpperCase()}
                </span>
                <span className="max-w-[110px] truncate text-sm font-bold">{displayName}</span>
                <ChevronDown size={14} className="text-gray-400" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-2xl border border-black/5 bg-white py-1.5 shadow-xl">
                  <Link onClick={() => setMenuOpen(false)} href="/profile" className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold hover:bg-gray-50">
                    <User size={15} /> Profile
                  </Link>
                  <Link onClick={() => setMenuOpen(false)} href="/orders" className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold hover:bg-gray-50">
                    <ShoppingBag size={15} /> My Orders
                  </Link>
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
          <form onSubmit={handleSearchSubmit} className="mb-4 flex items-center gap-2 rounded-2xl border border-black/10 bg-gray-50 p-2">
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
          <div className="flex flex-col gap-4 text-sm font-semibold">
            <Link onClick={() => setOpen(false)} href="/">Home</Link>
            <Link onClick={() => setOpen(false)} href="/services">Services</Link>
            <Link onClick={() => setOpen(false)} href="/about">About</Link>
            <Link onClick={() => setOpen(false)} href="/contact">Contact</Link>
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
