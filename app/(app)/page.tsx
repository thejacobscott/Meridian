"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Heart, MapPin, Plus, Sparkles } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  const reduce = useReducedMotion();

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

      {/* Reunion hero */}
      <motion.section variants={fadeUp}>
        <Card className="overflow-hidden">
          <div className="px-6 pt-7 pb-8 sm:px-8">
            <p className="text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-accent-deep">
              Next reunion
            </p>

            {/* two-of-us, separated-by-distance motif */}
            <div className="mt-7 mb-7 flex items-center justify-center">
              <Avatar size={56} className="bg-clay/15 ring-clay/20" />
              <div className="relative mx-2 h-px w-[110px]">
                <div className="absolute inset-0 border-t border-dashed border-line" />
                <motion.span
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-surface p-1.5 ring-1 ring-line"
                  animate={reduce ? undefined : { y: [0, -3, 0] }}
                  transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Heart size={14} strokeWidth={1.75} className="text-clay" />
                </motion.span>
              </div>
              <Avatar size={56} className="bg-sage/20 ring-sage/30" />
            </div>

            <h2 className="text-center text-[1.65rem] leading-tight">
              No dates on the calendar yet
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-center text-ink-soft text-balance">
              Plan your first trip together and the countdown to being in the
              same place lands right here.
            </p>

            <div className="mt-7 flex justify-center">
              <Link
                href="/trips"
                className={buttonVariants({ variant: "primary", size: "lg" })}
              >
                Plan your first trip
                <ArrowRight size={18} strokeWidth={1.75} />
              </Link>
            </div>
          </div>
        </Card>
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
