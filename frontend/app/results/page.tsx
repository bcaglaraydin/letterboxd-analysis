"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// TODO: Replace this with your actual API Gateway URL after deployment
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://mpnd4bu9jg.execute-api.eu-west-1.amazonaws.com";

interface MetricData {
  username: string;
  averageRating: number;
  totalFilms: number;
  topGenres: Array<{ name: string; count: number }>;
  topDirectors: Array<{ name: string; count: number }>;
}

interface MetricsResponse {
  metrics: MetricData[];
}

function ResultsContent() {
  const searchParams = useSearchParams();
  const username1 = searchParams.get("username");
  const username2 = searchParams.get("username2");

  // We'll store metrics directly since that's what we display
  const [metricsData, setMetricsData] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    if (!username1) return;

    setLoading(true);
    setError("");
    setStatus("Scraping film lists...");
    setMetricsData(null);

    try {
      // 1. Scrape Lists (Parallel if 2 users)
      const usersToScrape = [username1];
      if (username2) usersToScrape.push(username2);

      const scrapeResults = await Promise.all(
        usersToScrape.map(async (u) => {
          const res = await fetch(`${API_URL}/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: u }),
          });
          if (!res.ok) throw new Error(`Failed to scrape films for ${u}`);
          return { username: u, data: await res.json() };
        }),
      );

      // Check if any found films
      const validUsers = scrapeResults.filter(
        (r) => r.data.films && r.data.films.length > 0,
      );

      if (validUsers.length === 0) {
        setStatus("No films found for any user.");
        setLoading(false);
        return;
      }

      setStatus(
        `Found films for ${validUsers.map((u) => u.username).join(", ")}. Computing metrics...`,
      );

      // 2. Compute Metrics
      const metricsPayload = {
        users: validUsers.map((u) => ({
          username: u.username,
          films: u.data.films,
        })),
      };

      const metricsRes = await fetch(`${API_URL}/metrics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(metricsPayload),
      });

      if (!metricsRes.ok) throw new Error("Failed to compute metrics");
      const metricsJson = await metricsRes.json();
      setMetricsData(metricsJson);
      setStatus("Analysis complete!");
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An error occurred");
      setStatus("Failed.");
    } finally {
      setLoading(false);
    }
  }, [username1, username2]);

  // Effect to trigger fetch on mount
  useEffect(() => {
    if (username1) {
      fetchData();
    }
  }, [fetchData, username1]);

  const usersMetrics = metricsData?.metrics || [];

  return (
    <div className="w-full max-w-7xl flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">
          Analysis for {username1} {username2 && `& ${username2}`}
        </h1>
        <Link href="/">
          <Button variant="outline">Back to Search</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <Button onClick={fetchData} disabled={loading}>
              {loading ? "Analyzing..." : "Retry Analysis"}
            </Button>
            {status && (
              <p className="text-sm text-muted-foreground">{status}</p>
            )}
          </div>
          {error && <p className="text-red-500">{error}</p>}
        </CardContent>
      </Card>

      {usersMetrics.length > 0 && (
        <div
          className={`grid gap-8 ${usersMetrics.length > 1 ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}
        >
          {usersMetrics.map((userMetric: MetricData) => (
            <div key={userMetric.username} className="flex flex-col gap-4">
              <h2 className="text-2xl font-semibold text-center border-b pb-2">
                {userMetric.username}
              </h2>

              <Card>
                <CardHeader>
                  <CardTitle>Average Rating</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold">
                    {userMetric.averageRating} / 5
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Based on {userMetric.totalFilms} films
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Genres</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {userMetric.topGenres?.map((g) => (
                      <li key={g.name} className="flex justify-between">
                        <span>{g.name}</span>
                        <span className="font-mono text-muted-foreground">
                          {g.count}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Directors</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {userMetric.topDirectors?.map((d) => (
                      <li key={d.name} className="flex justify-between">
                        <span className="truncate max-w-[200px]" title={d.name}>
                          {d.name}
                        </span>
                        <span className="font-mono text-muted-foreground">
                          {d.count}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ResultsPage() {
  return (
    <main className="flex min-h-screen flex-col items-center p-24 bg-slate-50 dark:bg-slate-950">
      <Suspense fallback={<div>Loading...</div>}>
        <ResultsContent />
      </Suspense>
    </main>
  );
}
