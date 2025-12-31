"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { CalendarEventCategory } from "@prisma/client";
import { ArrowLeft, Calendar, Clock, User, Ship } from "lucide-react";

interface CalendarEventDetailProps {
  event: {
    id: string;
    title: string;
    description: string | null;
    category: CalendarEventCategory;
    startDate: Date | string;
    endDate: Date | string;
    color: string | null;
    tripId: string | null;
    createdBy: {
      id: string;
      name: string | null;
      email: string;
    } | null;
    trip: {
      id: string;
      name: string;
      code: string | null;
      status: string;
      startDate: Date | string;
      endDate: Date | string | null;
      departurePort: string | null;
      arrivalPort: string | null;
    } | null;
    createdAt: Date | string;
    updatedAt: Date | string;
  };
  canEdit: boolean;
}

const categoryLabels: Record<CalendarEventCategory, string> = {
  VOYAGE: "Voyage",
  MARINA: "Marina",
  OVERSEAS: "Overseas",
  FUEL_SUPPLY: "Fuel Supply",
  OTHER: "Other",
};

export function CalendarEventDetail({ event, canEdit }: CalendarEventDetailProps) {
  const router = useRouter();

  const startDate = typeof event.startDate === "string" ? new Date(event.startDate) : event.startDate;
  const endDate = typeof event.endDate === "string" ? new Date(event.endDate) : event.endDate;
  const isAllDay = startDate.getHours() === 0 && startDate.getMinutes() === 0 && 
                   endDate.getHours() === 0 && endDate.getMinutes() === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/trips/calendar">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{event.title}</h1>
            {event.description && (
              <p className="text-muted-foreground">{event.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{categoryLabels[event.category]}</Badge>
          {canEdit && (
            <Button asChild>
              <Link href={`/dashboard/trips/calendar?eventId=${event.id}&edit=true`}>
                Edit
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Event Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-medium">Start Date & Time</div>
                <div className="text-sm text-muted-foreground">
                  {isAllDay 
                    ? format(startDate, "EEEE, MMMM d, yyyy")
                    : format(startDate, "EEEE, MMMM d, yyyy 'at' HH:mm")}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-medium">End Date & Time</div>
                <div className="text-sm text-muted-foreground">
                  {isAllDay 
                    ? format(endDate, "EEEE, MMMM d, yyyy")
                    : format(endDate, "EEEE, MMMM d, yyyy 'at' HH:mm")}
                </div>
              </div>
            </div>

            {event.color && (
              <div className="flex items-center gap-3">
                <div 
                  className="h-5 w-5 rounded-full border-2 border-border"
                  style={{ backgroundColor: event.color }}
                />
                <div className="flex-1">
                  <div className="text-sm font-medium">Color</div>
                  <div className="text-sm text-muted-foreground">{event.color}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {event.trip && (
              <div className="flex items-start gap-3">
                <Ship className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Linked Trip</div>
                  <Link 
                    href={`/dashboard/trips/${event.trip.id}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {event.trip.name}
                    {event.trip.code && ` (${event.trip.code})`}
                  </Link>
                </div>
              </div>
            )}

            {event.createdBy && (
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Created By</div>
                  <div className="text-sm text-muted-foreground">
                    {event.createdBy.name || event.createdBy.email}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-medium">Created At</div>
                <div className="text-sm text-muted-foreground">
                  {format(
                    typeof event.createdAt === "string" ? new Date(event.createdAt) : event.createdAt,
                    "MMMM d, yyyy 'at' HH:mm"
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

