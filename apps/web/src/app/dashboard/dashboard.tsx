"use client";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import type { authClient } from "@/lib/auth-client";
import "@/lib/api";

export default function Dashboard(_props: {
  session: typeof authClient.$Infer.Session;
}) {
  const privateData = useQuery({
    queryKey: ["private-data"],
    queryFn: async () => {
      const res = await axios.get<unknown[]>("/todos", {
        withCredentials: true,
      });
      return {
        message: `Todos: ${Array.isArray(res.data) ? res.data.length : 0}`,
      };
    },
  });

  return <p>API: {privateData.data?.message}</p>;
}
