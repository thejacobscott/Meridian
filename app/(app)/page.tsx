"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, MapPin, Plus, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ReunionHero } from "@/components/home/reunion-hero";
import { DualClocks } from "@/components/home/dual-clocks";
import { OnThisDay } from "@/components/home/on-this-day";
import { cn } from "@/lib/cn";
import { fadeUp, staggerContainer } from "@/lib/motion";

function todayLabel() {
  try {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    }).format(new Date());
  } catch {
    return "";
  }
}

export default function HomePage() {
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-10"
    >
      {/* Greeting */}
      <motion.header variants={fadeUp} className="pt-2">
        <p className="eyebrow">{todayLabel()}</p>
        <h1
          className="mt-2 text-[2rem] leading-[1.08] tracking-[-0.02em] sm:text-[2.5rem]"
          style={{ fontVariationSettings: '"opsz" 90' }}
        >
          When do we
          <br />
          see each other next?
        </h1>
      </motion.header>

      {/* Reunion hero — live countdown to the next time you're together */}
      <motion.section variants={fadeUp}>
        <ReunionHero />
      </motion.section>

      {/* On this day — a past trip's memory, if today lines up with one. Self-
          hides otherwise, so it never leaves a hole. */}
      <OnThisDay />

      {/* Right now — the distance, with a face on it */}
      <motion.section variants={fadeUp} className="space-y-4">
        <SectionHeading eyebrow="Right now" title="Where you each are" />
        <DualClocks />
      </motion.section>

      {/* Someday peek */}
      <motion.section variants={fadeUp} className="space-y-4">
        <SectionHeading
          eyebrow="Someday"
          title="Places you both dream about"
          href="/wishlist"
        />
        <Card className="px-6 py-7">
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold/12 text-gold">
              <Sparkles size={20} strokeWidth={1.6} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-ink">Start your someday list</p>
              <p className="text-sm text-ink-soft text-balance">
                Drop in a city, a hotel, a little restaurant — vote together,
                then turn a favorite into a real trip.
              </p>
            </div>
            <Link
              href="/wishlist"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "shrink-0",
              )}
            >
              <Plus size={16} strokeWidth={1.75} />
              Add
            </Link>
          </div>
        </Card>
      </motion.section>

      {/* Memories peek */}
      <motion.section variants={fadeUp} className="space-y-4">
        <SectionHeading
          eyebrow="Memories"
          title="Every trip, kept forever"
          href="/trips"
        />
        <Card className="px-6 py-7">
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-clay/12 text-clay">
              <MapPin size={20} strokeWidth={1.6} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-ink">Your scrapbook is waiting</p>
              <p className="text-sm text-ink-soft text-balance">
                The trip you plan today becomes the album you reread next
                winter — same place, all the photos and notes.
              </p>
            </div>
          </div>
        </Card>
      </motion.section>

      <motion.p
        variants={fadeUp}
        className="pt-2 text-center text-xs text-ink-soft/80"
      >
        Made for the two of you.
      </motion.p>
    </motion.div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  href,
}: {
  eyebrow: string;
  title: string;
  href?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="mt-1 text-xl">{title}</h2>
      </div>
      {href && (
        <Link
          href={href}
          className="flex shrink-0 items-center gap-1 text-sm text-ink-soft transition-colors hover:text-ink"
        >
          All
          <ArrowRight size={15} strokeWidth={1.75} />
        </Link>
      )}
    </div>
  );
}
