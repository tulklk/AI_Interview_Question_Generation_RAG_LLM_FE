import { type NextRequest } from "next/server";
import { proxyToRag } from "../../_proxy";

export async function POST(req: NextRequest) {
  const body = await req.json();
  return proxyToRag("/api/v1/interview-plans/messages", body);
}
