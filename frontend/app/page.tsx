"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  const [username, setUsername] = useState("");
  const [username2, setUsername2] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      let url = `/results?username=${encodeURIComponent(username.trim())}`;
      if (username2.trim()) {
        url += `&username2=${encodeURIComponent(username2.trim())}`;
      }
      router.push(url);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-slate-50 dark:bg-slate-950">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Letterboxd Analysis
          </CardTitle>
          <CardDescription className="text-center">
            Enter a Letterboxd username (or two!) to analyze their movie taste.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              placeholder="Username 1 (e.g. bcaglaraydin)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <Input
              placeholder="Username 2 (Optional)"
              value={username2}
              onChange={(e) => setUsername2(e.target.value)}
            />
            <Button type="submit" className="w-full">
              Analyze
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
