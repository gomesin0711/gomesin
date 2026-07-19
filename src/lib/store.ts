"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type View =
  | "home"
  | "listings"
  | "detail"
  | "post"
  | "edit"
  | "favorites"
  | "profile"
  | "seller"
  | "login"
  | "dashboard"
  | "upgrade"
  | "admin"
  | "admin-sellers"
  | "admin-categories"
  | "admin-listings"
  | "admin-new-listings"
  | "admin-expired-listings"
  | "admin-rejected-listings"
  | "admin-transactions"
  | "admin-reports"
  | "admin-users"
  | "admin-paket"
  | "admin-merek"
  | "admin-lokasi"
  | "admin-banner"
  | "admin-audit";

export type ListingFilters = {
  q?: string;
  category?: string;
  condition?: string;
  minPrice?: string;
  maxPrice?: string;
  province?: string;
  sort?: string;
};

export type AppUser = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  city?: string | null;
  role?: string;
  createdAt?: string;
};

type NavState = {
  view: View;
  slug?: string; // for detail view
  sellerId?: string;
  filters: ListingFilters;
  profilePanel?: "pesan" | "pesanan" | "saldo" | "notifikasi" | "keamanan" | "pengaturan" | "bantuan" | null;
  // navigation history for back button
  history: { view: View; slug?: string; filters: ListingFilters }[];

  // favorites & recents
  favorites: string[]; // listing ids
  favoritesSeenCount: number; // how many favorites the user has acknowledged (for badge)
  recents: string[]; // listing slugs (most recent first)

  // saved scroll position of Produk Populer carousel (so back returns to same card)
  featuredScrollLeft: number;
  // saved clicked listing id so back returns to that exact card
  featuredClickedId: string | null;
  // flag: restore carousel to clicked card on next home mount
  featuredRestorePending: boolean;

  // auth
  user: AppUser | null;

  // actions
  goHome: () => void;
  goToListings: (filters?: ListingFilters) => void;
  goToDetail: (slug: string) => void;
  goToPost: () => void;
  goToEdit: (slug: string) => void;
  goToFavorites: () => void;
  goToProfile: () => void;
  goToProfilePanel: (panel: "pesan" | "pesanan" | "saldo" | "notifikasi" | "keamanan" | "pengaturan" | "bantuan") => void;
  clearProfilePanel: () => void;
  goToLogin: () => void;
  goToDashboard: () => void;
  goToUpgrade: (slug: string) => void;
  goToSeller: (userId: string) => void;
  goToAdmin: () => void;
  goToAdminSub: (sub: "admin-sellers" | "admin-categories" | "admin-listings" | "admin-new-listings" | "admin-expired-listings" | "admin-rejected-listings" | "admin-transactions" | "admin-reports" | "admin-users" | "admin-paket" | "admin-merek" | "admin-lokasi" | "admin-banner" | "admin-audit") => void;
  goBack: () => void;
  setFilters: (f: ListingFilters) => void;
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  addRecent: (slug: string) => void;
  setFeaturedScrollLeft: (v: number) => void;
  setFeaturedClickedId: (id: string | null) => void;
  setFeaturedRestorePending: (v: boolean) => void;
  setUser: (u: AppUser | null) => void;
  logout: () => void;
};

export const useStore = create<NavState>()(
  persist(
    (set, get) => ({
      view: "home",
      slug: undefined,
      sellerId: undefined,
      filters: {},
      history: [],
      favorites: [],
      favoritesSeenCount: 0,
      recents: [],
      featuredScrollLeft: 0,
      featuredClickedId: null,
      featuredRestorePending: false,
      user: null,

      goHome: () =>
        set((s) => ({
          view: "home",
          slug: undefined,
          filters: {},
          history: [...s.history, { view: s.view, slug: s.slug, filters: s.filters }].slice(-20),
        })),

      goToListings: (filters = {}) =>
        set((s) => ({
          view: "listings",
          slug: undefined,
          filters,
          history: [...s.history, { view: s.view, slug: s.slug, filters: s.filters }].slice(-20),
        })),

      goToDetail: (slug) =>
        set((s) => ({
          view: "detail",
          slug,
          history: [...s.history, { view: s.view, slug: s.slug, filters: s.filters }].slice(-20),
          recents: [slug, ...s.recents.filter((r) => r !== slug)].slice(0, 12),
        })),

      goToPost: () =>
        set((s) => ({
          view: "post",
          slug: undefined,
          history: [...s.history, { view: s.view, slug: s.slug, filters: s.filters }].slice(-20),
        })),

      goToEdit: (slug) =>
        set((s) => ({
          view: "edit",
          slug,
          history: [...s.history, { view: s.view, slug: s.slug, filters: s.filters }].slice(-20),
        })),

      goToFavorites: () =>
        set((s) => ({
          view: "favorites",
          slug: undefined,
          favoritesSeenCount: s.favorites.length, // acknowledge all current favorites
          history: [...s.history, { view: s.view, slug: s.slug, filters: s.filters }].slice(-20),
        })),

      goToProfile: () =>
        set((s) => ({
          view: "profile",
          slug: undefined,
          profilePanel: null,
          history: [...s.history, { view: s.view, slug: s.slug, filters: s.filters }].slice(-20),
        })),

      goToProfilePanel: (panel: "pesan" | "pesanan" | "saldo" | "notifikasi" | "keamanan" | "pengaturan" | "bantuan") =>
        set((s) => ({
          view: "profile",
          slug: undefined,
          profilePanel: panel,
          history: [...s.history, { view: s.view, slug: s.slug, filters: s.filters }].slice(-20),
        })),

      clearProfilePanel: () => set({ profilePanel: null }),

      goToLogin: () =>
        set((s) => ({
          view: "login",
          slug: undefined,
          history: [...s.history, { view: s.view, slug: s.slug, filters: s.filters }].slice(-20),
        })),

      goToDashboard: () =>
        set((s) => ({
          view: "dashboard",
          slug: undefined,
          history: [...s.history, { view: s.view, slug: s.slug, filters: s.filters }].slice(-20),
        })),

      goToUpgrade: (slug) =>
        set((s) => ({
          view: "upgrade",
          slug,
          history: [...s.history, { view: s.view, slug: s.slug, filters: s.filters }].slice(-20),
        })),

      goToSeller: (userId) =>
        set((s) => ({
          view: "seller",
          slug: undefined,
          sellerId: userId,
          history: [...s.history, { view: s.view, slug: s.slug, filters: s.filters }].slice(-20),
        })),

      goToAdmin: () =>
        set((s) => ({
          view: "admin",
          slug: undefined,
          history: [...s.history, { view: s.view, slug: s.slug, filters: s.filters }].slice(-20),
        })),

      goToAdminSub: (sub: "admin-sellers" | "admin-categories" | "admin-listings" | "admin-new-listings" | "admin-expired-listings" | "admin-rejected-listings" | "admin-transactions" | "admin-reports" | "admin-monthly-report" | "admin-users" | "admin-paket" | "admin-merek" | "admin-lokasi" | "admin-banner" | "admin-audit") =>
        set((s) => ({
          view: sub,
          slug: undefined,
          history: [...s.history, { view: s.view, slug: s.slug, filters: s.filters }].slice(-20),
        })),

      goBack: () => {
        const s = get();
        if (s.history.length === 0) {
          set({ view: "home", slug: undefined, filters: {} });
          return;
        }
        const last = s.history[s.history.length - 1];
        set({
          view: last.view,
          slug: last.slug,
          filters: last.filters,
          history: s.history.slice(0, -1),
        });
      },

      setFilters: (f) => set({ filters: f }),

      toggleFavorite: (id) =>
        set((s) => ({
          favorites: s.favorites.includes(id)
            ? s.favorites.filter((f) => f !== id)
            : [...s.favorites, id],
        })),

      isFavorite: (id) => get().favorites.includes(id),

      addRecent: (slug) =>
        set((s) => ({
          recents: [slug, ...s.recents.filter((r) => r !== slug)].slice(0, 12),
        })),

      setFeaturedScrollLeft: (v) => set({ featuredScrollLeft: v }),
      setFeaturedClickedId: (id) => set({ featuredClickedId: id }),
      setFeaturedRestorePending: (v) => set({ featuredRestorePending: v }),

      setUser: (u) => {
        const current = get().user;
        // If user changes (different id), clear their personal data
        if (current && u && current.id !== u.id) {
          set({ user: u, favorites: [], favoritesSeenCount: 0, recents: [], profilePanel: null });
        } else if (!u) {
          // Logout: clear personal data
          set({ user: null, favorites: [], favoritesSeenCount: 0, recents: [], profilePanel: null });
        } else {
          set({ user: u });
        }
      },

      logout: () => set({ user: null, favorites: [], favoritesSeenCount: 0, recents: [], profilePanel: null, view: "home", slug: undefined, filters: {} }),
    }),
    {
      name: "gomesin-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        favorites: s.favorites,
        favoritesSeenCount: s.favoritesSeenCount,
        recents: s.recents,
        user: s.user,
      }),
    }
  )
);
