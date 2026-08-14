import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserStatusActions } from "@/components/admin/user-actions";

export interface AdminUserRow {
  id: string;
  fullName: string;
  email: string | null;
  phoneNumber: string | null;
  role: string;
  status: string;
}

const statusVariant: Record<string, "default" | "secondary" | "destructive"> = {
  ACTIVE: "default",
  PENDING: "secondary",
  SUSPENDED: "destructive",
};

export function UsersTable({ users, actions = true }: { users: AdminUserRow[]; actions?: boolean }) {
  if (users.length === 0) {
    return <p className="text-sm text-muted-foreground">No users found.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            {actions && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="font-medium">{u.fullName}</TableCell>
              <TableCell className="text-muted-foreground">{u.email ?? u.phoneNumber ?? "—"}</TableCell>
              <TableCell>{u.role}</TableCell>
              <TableCell>
                <Badge variant={statusVariant[u.status] ?? "secondary"}>{u.status}</Badge>
              </TableCell>
              {actions && (
                <TableCell className="text-right">
                  <div className="flex justify-end">
                    <UserStatusActions userId={u.id} status={u.status} />
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
