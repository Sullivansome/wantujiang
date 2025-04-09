export interface ApiKey {
  id: string;
  order_id: string;
  key: string;
  credits: number;
  status: "active" | "revoked";
  created_at: string;
  last_used: string | null;
  total_used: number;
}
