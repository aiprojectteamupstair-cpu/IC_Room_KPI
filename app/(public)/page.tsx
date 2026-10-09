import { getRooms } from "@/lib/supabase/queries";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { AutoRefresh } from "@/components/layout/auto-refresh";
import {
  Building2,
  Users,
  Clock3,
  Mail,
  MessageCircle,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { displayTime } from "@/lib/booking/time";
export default async function Explore() {
  const rooms = (await getRooms()).filter((room) => room.is_active);
  return (
    <main className="mx-auto max-w-[1200px] px-5 pt-5 sm:px-8 sm:pt-8">
      <AutoRefresh />
      <section className="mb-7">
        <p className="mb-3 flex items-center gap-2 text-xs font-semibold text-primary">
          <Sparkles size={15} />
          Explore the space
        </p>
        <h1 className="max-w-lg text-[32px] font-semibold leading-[1.16] tracking-[-.04em] sm:text-4xl">
          Find a time. Make it happen.
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
          A welcoming space for your team meetings, workshops and big ideas. Get to know the room,
          then open Calendar to find your time.
        </p>
      </section>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <section aria-label="Our spaces" className="space-y-5">
          {rooms.length ? (
            rooms.map((room) => (
              <Card key={room.id} className="overflow-hidden">
                <div className="flex items-center gap-4 bg-[#fff0ed] p-5 sm:p-7">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-primary">
                    <Building2 size={27} strokeWidth={1.5} />
                  </span>
                  <div>
                    <p className="mb-1 text-xs text-primary">Space to connect</p>
                    <h2 className="text-xl font-semibold tracking-tight">{room.name}</h2>
                  </div>
                </div>
                <CardContent className="space-y-5">
                  <p className="text-sm leading-7 text-muted-foreground">{room.description}</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-2xl bg-muted p-4">
                      <Users size={18} className="mb-2 text-muted-foreground" />
                      <p className="text-sm font-semibold">Up to {room.capacity}</p>
                      <p className="mt-1 text-xs text-muted-foreground">People</p>
                    </div>
                    <div className="rounded-2xl bg-muted p-4">
                      <Clock3 size={18} className="mb-2 text-muted-foreground" />
                      <p className="text-sm font-semibold">
                        {displayTime(room.opening_time)}
                        <span className="block sm:inline"> – {displayTime(room.closing_time)}</span>
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">Daily hours</p>
                    </div>
                  </div>
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 size={15} className="text-emerald-600" />
                    No account needed to request a booking
                  </p>
                </CardContent>
              </Card>
            ))
          ) : (
            <EmptyState
              title="The room is currently unavailable"
              description="Please check back later or contact the centre."
            />
          )}
        </section>
        <Card>
          <CardContent className="p-5 sm:p-7">
            <h2 className="mb-5 text-lg font-semibold">Contact us</h2>
            <dl className="space-y-5">
              <div className="flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                  <Mail size={18} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <dt className="text-sm font-semibold">Email</dt>
                  <dd className="mt-1 text-sm leading-6 text-muted-foreground">
                    <a
                      href="mailto:innovation.centre4@gmail.com"
                      className="break-all underline-offset-4 hover:text-primary hover:underline"
                    >
                      innovation.centre4@gmail.com
                    </a>
                  </dd>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                  <MessageCircle size={18} aria-hidden="true" />
                </span>
                <div>
                  <dt className="text-sm font-semibold">Viber</dt>
                  <dd className="mt-1 text-sm leading-6 text-muted-foreground">09880768700</dd>
                </div>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
