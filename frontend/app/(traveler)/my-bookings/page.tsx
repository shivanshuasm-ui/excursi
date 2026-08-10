import { Suspense } from "react";
import type { Metadata } from "next";
import { MyBookings } from "@/components/MyBookings";

export const metadata: Metadata = { title: "My bookings" };

export default function MyBookingsPage() {
  return (
    <Suspense>
      <MyBookings />
    </Suspense>
  );
}
