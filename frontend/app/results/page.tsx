"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// TODO: Replace this with your actual API Gateway URL after deployment
const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

function ResultsContent() {
    const searchParams = useSearchParams()
    const username = searchParams.get("username")
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const fetchData = async () => {
        setLoading(true)
        setError("")
        try {
            // Note: This will fail locally unless you have the API deployed and URL updated
            const res = await fetch(`${API_URL}/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username }),
            })
            const json = await res.json()
            setData(json)
        } catch (err) {
            console.error(err)
            setError("Failed to fetch data. Make sure the API is deployed and URL is updated.")
        } finally {
            setLoading(false)
        }
    }

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
                    <CardTitle>Backend Connection Test</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <Button onClick={fetchData} disabled={loading}>
                        {loading ? "Fetching..." : "Test Backend Connection"}
                    </Button>

                    {error && <p className="text-red-500">{error}</p>}

                    {data && (
                        <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-md overflow-auto max-h-96">
                            <pre>{JSON.stringify(data, null, 2)}</pre>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Placeholders for charts */}
                <div className="h-64 bg-white dark:bg-slate-900 rounded-lg shadow border p-4 flex items-center justify-center">
                    Top Genres (Coming Soon)
                </div>
                <div className="h-64 bg-white dark:bg-slate-900 rounded-lg shadow border p-4 flex items-center justify-center">
                    Ratings Distribution (Coming Soon)
                </div>
                <div className="h-64 bg-white dark:bg-slate-900 rounded-lg shadow border p-4 flex items-center justify-center">
                    Activity Over Time (Coming Soon)
                </div>
            </div>
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
