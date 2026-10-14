"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import * as actions from "@/app/actions";
import { bd, firstName, uid } from "@/lib/format";
import { VAT_RATE } from "@/lib/pricing";
import type { Workspace } from "@/lib/data";
import type { Campaign, Creator, InsertionOrder, IoLine, Offer, OfferMessage, OutdoorBooking, OutdoorSite, Outlet, PrPackage } from "@/lib/types";

export type Catalogue = { creators: Creator[]; sites: OutdoorSite[]; outlets: Outlet[]; packages: PrPackage[] };
export type Application = { id: string; campaignId: string; creatorId: number; rateIndex: number; price: number; status: "new" | "hired" | "passed" };

type Store = Catalogue & {
  mode: Workspace["mode"];
  email?: string;
  campaigns: Campaign[];
  offers: Offer[];
  applications: Application[];
  bookings: OutdoorBooking[];
  orders: InsertionOrder[];
  ioLines: IoLine[];
  typing: Record<string, boolean>;
  toast: string | null;
  notify: (text: string) => void;
  addCampaign: (c: Omit<Campaign, "id">) => Promise<Campaign>;
  publishCampaign: (id: string) => void;
  simulateApplications: (campaignId: string) => void;
  decideApplication: (id: string, hire: boolean) => void;
  sendOffer: (o: { creatorId: number; campaignId: string; rateIndex: number; listPrice: number; amount: number; message: string; label: string }) => Promise<void>;
  acceptCounter: (offerId: string) => void;
  declineCounter: (offerId: string) => void;
  counterOffer: (offerId: string, amount: number) => void;
  toggleDeliverable: (offerId: string, index: number, done: boolean) => void;
  requestBooking: (siteId: number, weeks: number[]) => Promise<void>;
  addIoLine: (line: Omit<IoLine, "id">) => void;
  removeIoLine: (id: string) => void;
  sendIo: () => Promise<InsertionOrder | null>;
};

const Ctx = createContext<Store | null>(null);
export const useStore = () => {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used inside <StoreProvider>");
  return s;
};

export function StoreProvider({ catalogue, workspace, children }: { catalogue: Catalogue; workspace: Workspace; children: ReactNode }) {
  const demo = workspace.mode !== "live";
  const [campaigns, setCampaigns] = useState(workspace.campaigns);
  const [offers, setOffers] = useState(workspace.offers);
  const [applications, setApplications] = useState<Application[]>([]);
  const [bookings, setBookings] = useState(workspace.bookings);
  const [orders, setOrders] = useState(workspace.orders);
  const [sites, setSites] = useState(catalogue.sites);
  const [ioLines, setIoLines] = useState<IoLine[]>([]);
  const [typing, setTyping] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const notify = useCallback((text: string) => {
    setToast(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2600);
  }, []);
  const creatorName = useCallback((id: number) => catalogue.creators.find((c) => c.id === id)?.name ?? "Creator", [catalogue.creators]);
  const patchOffer = (id: string, fn: (o: Offer) => Offer) => setOffers((list) => list.map((o) => (o.id === id ? fn(o) : o)));

  /** Demo only: a creator answers an offer after a short pause. */
  const simulateReply = useCallback((offerId: string, amount: number, listPrice: number, creatorId: number) => {
    if (!demo) return;
    setTyping((t) => ({ ...t, [offerId]: true }));
    setTimeout(() => {
      setTyping((t) => ({ ...t, [offerId]: false }));
      const accept = amount >= listPrice * 0.9;
      const counter = Math.round((amount + listPrice) / 2 / 10) * 10;
      const msg: OfferMessage = accept
        ? { fromBrand: false, text: "Sounds good, accepted. I'll share a content plan tomorrow.", simulated: true }
        : { fromBrand: false, text: `Thanks for the offer. For this package I can do ${bd(counter)}.`, amount: counter, simulated: true };
      patchOffer(offerId, (o) => ({ ...o, status: accept ? "Accepted" : "Countered", messages: [...o.messages, msg] }));
      notify(`${firstName(creatorName(creatorId))} replied to your offer`);
    }, 2400);
  }, [demo, notify, creatorName]);

  const value: Store = {
    ...catalogue,
    sites,
    mode: workspace.mode,
    email: workspace.email,
    campaigns, offers, applications, bookings, orders, ioLines, typing, toast, notify,

    async addCampaign(c) {
      const res = await actions.createCampaign(c);
      const created: Campaign = { ...c, id: res.data?.id ?? uid("c") };
      setCampaigns((l) => [created, ...l]);
      if (res.error) notify(`Could not save: ${res.error}`);
      if (c.status === "Live") value.simulateApplications(created.id);
      return created;
    },
    publishCampaign(id) {
      setCampaigns((l) => l.map((c) => (c.id === id ? { ...c, status: "Live" } : c)));
      actions.updateCampaignStatus(id, "Live");
      notify("Campaign published");
      value.simulateApplications(id);
    },
    simulateApplications(campaignId) {
      if (!demo) return;
      setTimeout(() => {
        const camp = campaigns.find((c) => c.id === campaignId);
        const budget = camp?.budget ?? 100000;
        const pool = catalogue.creators
          .filter((c) => c.rates && Math.min(...c.rates.filter((v): v is number => v != null)) <= budget)
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);
        setApplications((a) => [
          ...a,
          ...pool.map((c) => {
            const prices = c.rates!.map((v) => v ?? Infinity);
            const price = Math.min(...prices);
            return { id: uid("a"), campaignId, creatorId: c.id, rateIndex: prices.indexOf(price), price, status: "new" as const };
          }),
        ]);
        notify(pool.length ? `${pool.length} creators applied` : "No creators fit this budget yet");
      }, 2000);
    },
    decideApplication(id, hire) {
      const app = applications.find((a) => a.id === id);
      if (!app) return;
      setApplications((l) => l.map((a) => (a.id === id ? { ...a, status: hire ? "hired" : "passed" } : a)));
      if (hire) {
        setOffers((l) => [{ id: uid("o"), creatorId: app.creatorId, campaignId: app.campaignId, rateIndex: app.rateIndex, listPrice: app.price, amount: app.price, status: "Accepted", done: {},
          messages: [{ fromBrand: false, text: "Applied to your campaign.", amount: app.price, simulated: true }, { fromBrand: true, text: "Accepted your application." }] }, ...l]);
        notify(`${firstName(creatorName(app.creatorId))} is booked`);
      }
    },

    async sendOffer({ creatorId, campaignId, rateIndex, listPrice, amount, message, label }) {
      const campName = campaigns.find((c) => c.id === campaignId)?.name ?? "your campaign";
      const messages: OfferMessage[] = [{ fromBrand: true, text: `Offer for ${campName}: ${label}`, amount }, { fromBrand: true, text: message }];
      const res = await actions.sendOffer({ creatorId, campaignId, rateIndex, listPrice, amount, messages });
      const id = res.data?.id ?? uid("o");
      setOffers((l) => [{ id, creatorId, campaignId, rateIndex, listPrice, amount, status: "Pending", messages, done: {} }, ...l]);
      notify(res.error ? `Could not save: ${res.error}` : `Offer sent to ${firstName(creatorName(creatorId))}`);
      simulateReply(id, amount, listPrice, creatorId);
    },
    acceptCounter(offerId) {
      const o = offers.find((x) => x.id === offerId);
      const counter = [...(o?.messages ?? [])].reverse().find((m) => !m.fromBrand && m.amount);
      if (!o || !counter?.amount) return;
      const message = { fromBrand: true, text: "Accepted. Looking forward to working together." };
      patchOffer(offerId, (x) => ({ ...x, amount: counter.amount!, status: "Accepted", messages: [...x.messages, message] }));
      actions.updateOffer(offerId, { status: "Accepted", amount: counter.amount, message });
      notify("Offer accepted");
    },
    declineCounter(offerId) {
      const message = { fromBrand: true, text: "Declined the counter offer." };
      patchOffer(offerId, (x) => ({ ...x, status: "Declined", messages: [...x.messages, message] }));
      actions.updateOffer(offerId, { status: "Declined", message });
      notify("Counter offer declined");
    },
    counterOffer(offerId, amount) {
      const o = offers.find((x) => x.id === offerId);
      if (!o) return;
      const message = { fromBrand: true, text: "New offer", amount };
      patchOffer(offerId, (x) => ({ ...x, amount, status: "Pending", messages: [...x.messages, message] }));
      actions.updateOffer(offerId, { status: "Pending", amount, message });
      simulateReply(offerId, amount, o.listPrice, o.creatorId);
    },
    toggleDeliverable(offerId, index, done) {
      const o = offers.find((x) => x.id === offerId);
      if (!o) return;
      const next = { ...o.done, [index]: done };
      patchOffer(offerId, (x) => ({ ...x, done: next }));
      actions.updateOffer(offerId, { done: next });
    },

    async requestBooking(siteId, weeks) {
      const site = sites.find((s) => s.id === siteId);
      if (!site) return;
      const total = site.weeklyPrice * weeks.length;
      const res = await actions.requestOutdoorBooking(siteId, weeks, total);
      const b: OutdoorBooking = { id: res.data?.id ?? uid("b"), siteId, weeks, total, status: "Requested" };
      setBookings((l) => [b, ...l]);
      notify(res.error ? `Could not save: ${res.error}` : "Booking requested");
      if (demo) setTimeout(() => {
        setBookings((l) => l.map((x) => (x.id === b.id ? { ...x, status: "Confirmed", simulated: true } : x)));
        setSites((l) => l.map((s) => (s.id === siteId ? { ...s, bookedWeeks: [...s.bookedWeeks, ...weeks] } : s)));
        notify(`${site.name} confirmed`);
      }, 2500);
    },

    addIoLine(line) {
      setIoLines((l) => [...l, { ...line, id: uid("l") }]);
      notify("Added to your insertion order");
    },
    removeIoLine(id) { setIoLines((l) => l.filter((x) => x.id !== id)); },
    async sendIo() {
      if (!ioLines.length) return null;
      const sub = ioLines.reduce((t, l) => t + l.total, 0);
      const res = await actions.sendInsertionOrder(ioLines);
      const order: InsertionOrder = { id: res.data?.id ?? uid("io"), number: res.data?.number ?? `RD-${1041 + orders.length}`, lines: ioLines, total: Math.round(sub * (1 + VAT_RATE)), status: "Requested" };
      setOrders((l) => [order, ...l]);
      setIoLines([]);
      notify(res.error ? `Could not save: ${res.error}` : `Insertion order ${order.number} sent`);
      if (demo) setTimeout(() => {
        setOrders((l) => l.map((x) => (x.id === order.id ? { ...x, status: "Confirmed", simulated: true } : x)));
        notify(`${order.number} confirmed`);
      }, 2600);
      return order;
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
