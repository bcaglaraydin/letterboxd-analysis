"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// TODO: Replace this with your actual API Gateway URL after deployment
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://mpnd4bu9jg.execute-api.eu-west-1.amazonaws.com";

function ResultsContent() {
    const searchParams = useSearchParams()
    const username = searchParams.get("username")
    const [scrapeData, setScrapeData] = useState<any>(null)
    const [metricsData, setMetricsData] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState("")
    const [error, setError] = useState("")

    const fetchData = async () => {
        setLoading(true)
        setError("")
        setStatus("Scraping film list...")
        setScrapeData(null)
        setMetricsData(null)

        try {
            // 1. Scrape List
            const scrapeRes = await fetch(`${API_URL}/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username }),
            })
            if (!scrapeRes.ok) throw new Error("Failed to scrape films")
            const scrapeJson = await scrapeRes.json()
            setScrapeData(scrapeJson)

            if (!scrapeJson.films || scrapeJson.films.length === 0) {
                setStatus("No films found.")
                setLoading(false)
                return
            }

            setStatus(`Found ${scrapeJson.films.length} films. Computing metrics...`)

            // 2. Compute Metrics
            // We pass the films list to the metrics endpoint
            // The metrics endpoint will fetch metadata from DynamoDB for these films
            const metricsRes = await fetch(`${API_URL}/metrics`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    users: [{ username, films: scrapeJson.films }]
                }),
            })

            if (!metricsRes.ok) throw new Error("Failed to compute metrics")
            const metricsJson = await metricsRes.json()
            setMetricsData(metricsJson)
            setStatus("Analysis complete!")

        } catch (err: any) {
            console.error(err)
            setError(err.message || "An error occurred")
            setStatus("Failed.")
        } finally {
            setLoading(false)
        }
    }

    const userMetrics = metricsData?.metrics?.[0]

    return (
        <div className="w-full max-w-5xl flex flex-col gap-8">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Analysis for {username}</h1>
                <Link href="/">
                    <Button variant="outline">Back to Search</Button>
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <Button onClick={fetchData} disabled={loading}>
                        {loading ? "Analyzing..." : "Start Analysis"}
                    </Button>

                    {status && <p className="text-sm text-muted-foreground">{status}</p>}
                    {error && <p className="text-red-500">{error}</p>}
                </CardContent>
            </Card>

            {userMetrics && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Average Rating</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-bold">{userMetrics.averageRating} / 5</div>
                            <p className="text-sm text-muted-foreground mt-2">
                                Based on {userMetrics.totalFilms} films
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Top Genres</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-2">
                                {userMetrics.topGenres?.map((g: any) => (
                                    <li key={g.name} className="flex justify-between">
                                        <span>{g.name}</span>
                                        <span className="font-mono text-muted-foreground">{g.count}</span>
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
                                {userMetrics.topDirectors?.map((d: any) => (
                                    <li key={d.name} className="flex justify-between">
                                        <span className="truncate max-w-[150px]" title={d.name}>{d.name}</span>
                                        <span className="font-mono text-muted-foreground">{d.count}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            )}

            {scrapeData && (
                <Card>
                    <CardHeader>
                        <CardTitle>Raw Data (Debug)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-md overflow-auto max-h-48 text-xs">
                            <pre>{JSON.stringify(scrapeData, null, 2)}</pre>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

export default function ResultsPage() {
    return (
        <main className="flex min-h-screen flex-col items-center p-24 bg-slate-50 dark:bg-slate-950">
            <Suspense fallback={<div>Loading...</div>}>
                <ResultsContent />
            </Suspense>
        </main>
    )
}
