"use client";

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

const config = {
  sessions: { label: "Sesje", color: "var(--color-accent)" },
  outboundSessions: { label: "Sesje z wyjściem", color: "var(--color-foreground)" },
} satisfies ChartConfig;

export function AnalyticsChart({ data }: { data: Array<{ date: string; sessions: number; outboundSessions: number }> }) {
  return (
    <>
      <ChartContainer config={config} className="h-[260px] w-full min-w-0 aspect-auto" aria-label="Sesje i sesje z co najmniej jednym kliknięciem wychodzącym w czasie">
        <BarChart accessibilityLayer data={data} margin={{ left: 4, right: 4, top: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={28} tickFormatter={(value) => String(value).slice(5)} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey="sessions" fill="var(--color-sessions)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="outboundSessions" fill="var(--color-outboundSessions)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartContainer>
      <table className="sr-only">
        <caption>Tekstowa alternatywa wykresu sesji</caption>
        <thead><tr><th>Data</th><th>Sesje</th><th>Sesje z wyjściem</th></tr></thead>
        <tbody>{data.map((row) => <tr key={row.date}><th>{row.date}</th><td>{row.sessions}</td><td>{row.outboundSessions}</td></tr>)}</tbody>
      </table>
    </>
  );
}
