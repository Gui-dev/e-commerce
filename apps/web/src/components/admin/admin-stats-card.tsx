import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AdminStatsCardProps {
  title: string;
  value: string | number;
  description?: string;
}

export function AdminStatsCard({ title, value, description }: AdminStatsCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
}
