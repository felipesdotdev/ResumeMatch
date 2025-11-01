"use client";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import "@/lib/api";

const HTTP_UNAUTHORIZED = 401;

const TITLE_TEXT = `
 ██████╗ ███████╗████████╗████████╗███████╗██████╗
 ██╔══██╗██╔════╝╚══██╔══╝╚══██╔══╝██╔════╝██╔══██╗
 ██████╔╝█████╗     ██║      ██║   █████╗  ██████╔╝
 ██╔══██╗██╔══╝     ██║      ██║   ██╔══╝  ██╔══██╗
 ██████╔╝███████╗   ██║      ██║   ███████╗██║  ██║
 ╚═════╝ ╚══════╝   ╚═╝      ╚═╝   ╚══════╝╚═╝  ╚═╝

 ████████╗    ███████╗████████╗ █████╗  ██████╗██╗  ██╗
 ╚══██╔══╝    ██╔════╝╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝
    ██║       ███████╗   ██║   ███████║██║     █████╔╝
    ██║       ╚════██║   ██║   ██╔══██║██║     ██╔═██╗
    ██║       ███████║   ██║   ██║  ██║╚██████╗██║  ██╗
    ╚═╝       ╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
 `;

export default function Home() {
  const healthCheck = useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      try {
        await axios.get("/health", { withCredentials: true });
        return true;
      } catch {
        return false;
      }
    },
  });
  const privateMsg = useQuery({
    queryKey: ["private"],
    queryFn: async () => {
      try {
        const res = await axios.get<{ message: string }>("/private", {
          withCredentials: true,
        });
        return res.data?.message || "";
      } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status === HTTP_UNAUTHORIZED) {
          return "Você não está autenticado.";
        }
        return "Erro ao verificar sessão.";
      }
    },
  });

  return (
    <div className="container mx-auto max-w-3xl px-4 py-2">
      <pre className="overflow-x-auto font-mono text-sm">{TITLE_TEXT}</pre>
      <div className="grid gap-6">
        <section className="rounded-lg border p-4">
          <h2 className="mb-2 font-medium">API Status</h2>
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${healthCheck.data ? "bg-green-500" : "bg-red-500"}`}
            />
            <span className="text-muted-foreground text-sm">
              {healthCheck.isLoading && "Checking..."}
              {!healthCheck.isLoading && healthCheck.data && "Connected"}
              {!(healthCheck.isLoading || healthCheck.data) && "Disconnected"}
            </span>
          </div>
        </section>
        <section className="rounded-lg border p-4">
          <h2 className="mb-2 font-medium">Área privada (teste)</h2>
          <p className="text-muted-foreground text-sm">
            {privateMsg.data ?? "Carregando..."}
          </p>
        </section>
      </div>
    </div>
  );
}
