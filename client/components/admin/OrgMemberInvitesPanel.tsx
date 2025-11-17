import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/contexts/SupabaseUserContext";
import OrgAdminService, {
  type CreateMemberInviteRequest,
} from "@/services/orgAdminService";
import type { OrgMemberInviteSummary } from "@shared/api";
import { Copy, RefreshCw, Slash } from "lucide-react";

const statusVariant: Record<
  OrgMemberInviteSummary["status"],
  { label: string; className: string }
> = {
  pending: {
    label: "Pending",
    className: "bg-amber-100 text-amber-900 border-amber-200",
  },
  accepted: {
    label: "Accepted",
    className: "bg-emerald-100 text-emerald-900 border-emerald-200",
  },
  expired: {
    label: "Expired",
    className: "bg-gray-100 text-gray-700 border-gray-200",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-rose-100 text-rose-900 border-rose-200",
  },
};

const InviteRoleOptions: Array<{
  key: "member" | "org_admin";
  label: string;
  description: string;
}> = [
  {
    key: "member",
    label: "Team Member",
    description: "Standard seat with workspace access",
  },
  {
    key: "org_admin",
    label: "Org Admin",
    description: "Manage users and alert preferences",
  },
];

const defaultForm: CreateMemberInviteRequest = {
  email: "",
  role: "member",
  sendEmail: true,
  expiresInDays: 14,
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return value;
  }
}

function buildInviteDescription(invite: OrgMemberInviteSummary): string {
  const base = invite.organizationRole === "org_admin" ? "Org admin" : "Member";
  if (invite.status === "accepted") {
    return `${base} · accepted`;
  }
  if (invite.status === "pending") {
    return `${base} · awaiting response`;
  }
  if (invite.status === "expired") {
    return `${base} · expired`;
  }
  return `${base} · cancelled`;
}

const OrgMemberInvitesPanel: React.FC = () => {
  const { user } = useUser();
  const organizationId = user?.organization?.id ?? null;
  const authUserId = user?.authUserId ?? null;
  const canInvite = Boolean(
    organizationId &&
    authUserId &&
    (user?.isMaigonAdmin || user?.isOrgAdmin),
  );
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [form, setForm] = useState<CreateMemberInviteRequest>(defaultForm);
  const [isCopying, setCopying] = useState<string | null>(null);

  const invitesQuery = useQuery<OrgMemberInviteSummary[]>({
    queryKey: ["org-member-invites", organizationId],
    queryFn: () =>
      OrgAdminService.listMemberInvites(organizationId!, authUserId!),
    enabled: canInvite,
  });

  const createInviteMutation = useMutation({
    mutationFn: (payload: CreateMemberInviteRequest) =>
      OrgAdminService.createMemberInvite(
        organizationId!,
        authUserId!,
        payload,
      ),
    onSuccess: (invite) => {
      toast({
        title: "Invite sent",
        description: `${invite.email} can now join your workspace.`,
      });
      queryClient.invalidateQueries({
        queryKey: ["org-member-invites", organizationId],
      });
      setForm(defaultForm);
    },
    onError: (error: unknown) => {
      toast({
        title: "Failed to send invite",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    },
  });

  const resendInviteMutation = useMutation({
    mutationFn: (inviteId: string) =>
      OrgAdminService.resendMemberInvite(
        organizationId!,
        authUserId!,
        inviteId,
      ),
    onSuccess: (invite) => {
      toast({
        title: "Invite resent",
        description: `${invite.email} has been notified again.`,
      });
      queryClient.invalidateQueries({
        queryKey: ["org-member-invites", organizationId],
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Failed to resend invite",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    },
  });

  const cancelInviteMutation = useMutation({
    mutationFn: (inviteId: string) =>
      OrgAdminService.cancelMemberInvite(
        organizationId!,
        authUserId!,
        inviteId,
      ),
    onSuccess: (invite) => {
      toast({
        title: "Invite cancelled",
        description: `${invite.email} can no longer use the invite link.`,
      });
      queryClient.invalidateQueries({
        queryKey: ["org-member-invites", organizationId],
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Failed to cancel invite",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    },
  });

  const invites = invitesQuery.data ?? [];

  const pendingInvites = useMemo(() => {
    return invites.filter((invite) => invite.status === "pending");
  }, [invites]);

  if (!canInvite) {
    return null;
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.email.trim()) {
      toast({
        title: "Email required",
        description: "Enter an email address to send an invite.",
        variant: "destructive",
      });
      return;
    }
    createInviteMutation.mutate({
      ...form,
      email: form.email.trim(),
    });
  };

  const handleCopy = async (invite: OrgMemberInviteSummary) => {
    if (!invite.inviteUrl) {
      toast({
        title: "Invite link unavailable",
        description: "Resend the invite to generate a fresh link.",
      });
      return;
    }
    try {
      setCopying(invite.id);
      await navigator.clipboard.writeText(invite.inviteUrl);
      toast({
        title: "Invite link copied",
        description: invite.email,
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description:
          error instanceof Error ? error.message : "Unable to copy invite URL.",
        variant: "destructive",
      });
    } finally {
      setCopying(null);
    }
  };

  return (
    <Card className="border-[#E8DDDD]">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-[#271D1D]">
          Invite Teammates
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form className="grid gap-4 md:grid-cols-[2fr,1fr]" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#271D1D]" htmlFor="invite-email">
              Email address
            </label>
            <Input
              id="invite-email"
              placeholder="teammate@example.com"
              value={form.email}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, email: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#271D1D]">
              Invite role
            </label>
            <div className="flex gap-2">
              {InviteRoleOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({ ...prev, role: option.key }))
                  }
                  className={`flex-1 rounded-lg border px-3 py-2 text-left transition ${
                    form.role === option.key
                      ? "border-[#9A7C7C] bg-[#FDF9F8] text-[#271D1D]"
                      : "border-[#E8DDDD] text-[#6B7280]"
                  }`}
                >
                  <p className="text-sm font-medium">{option.label}</p>
                  <p className="text-xs">{option.description}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="col-span-full flex flex-wrap items-center gap-4 rounded border border-[#E8DDDD] px-4 py-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-[#271D1D]">
                Send invite via email
              </p>
              <p className="text-xs text-[#6B7280]">
                Use the configured SendGrid template to deliver the invite.
              </p>
            </div>
            <Switch
              checked={form.sendEmail ?? true}
              onCheckedChange={(checked) =>
                setForm((prev) => ({ ...prev, sendEmail: Boolean(checked) }))
              }
            />
          </div>
          <div className="col-span-full flex items-center gap-4">
            <label className="text-sm font-medium text-[#271D1D]" htmlFor="invite-expiry">
              Expires in (days)
            </label>
            <Input
              id="invite-expiry"
              type="number"
              min={1}
              className="max-w-[120px]"
              value={form.expiresInDays ?? 14}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  expiresInDays: Number(event.target.value) || 14,
                }))
              }
            />
            <Button
              type="submit"
              disabled={createInviteMutation.isPending}
              className="ml-auto"
            >
              {createInviteMutation.isPending ? "Sending..." : "Send invite"}
            </Button>
          </div>
          {pendingInvites.length > 0 && (
            <p className="col-span-full text-xs text-[#6B7280]">
              {pendingInvites.length} pending invite
              {pendingInvites.length === 1 ? "" : "s"} awaiting acceptance.
            </p>
          )}
        </form>

        {invitesQuery.isError && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Failed to load invites. Please refresh and try again.
          </div>
        )}

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-[#271D1D]">
            Recent invites
          </h3>
          {invitesQuery.isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((item) => (
                <Skeleton key={item} className="h-12 w-full rounded" />
              ))}
            </div>
          ) : invites.length === 0 ? (
            <div className="rounded border border-dashed border-[#E8DDDD] p-6 text-center text-sm text-[#6B7280]">
              No invites yet. Add teammates to share the workspace.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((invite) => {
                  const variant = statusVariant[invite.status];
                  const isProcessing =
                    resendInviteMutation.isPending &&
                    resendInviteMutation.variables === invite.id;
                  const isCancelling =
                    cancelInviteMutation.isPending &&
                    cancelInviteMutation.variables === invite.id;
                  return (
                    <TableRow key={invite.id}>
                      <TableCell className="text-sm text-[#271D1D]">
                        <div className="font-medium">{invite.email}</div>
                        <div className="text-xs text-[#6B7280]">
                          {formatDate(invite.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-[#6B7280]">
                        {buildInviteDescription(invite)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`capitalize ${variant.className}`}
                        >
                          {variant.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-[#271D1D]">
                        {formatDate(invite.expiresAt)}
                      </TableCell>
                      <TableCell className="flex justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopy(invite)}
                          disabled={!invite.inviteUrl || isCopying === invite.id}
                        >
                          <Copy className="mr-1 h-4 w-4" />
                          Copy
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => resendInviteMutation.mutate(invite.id)}
                          disabled={
                            invite.status === "accepted" ||
                            invite.status === "cancelled" ||
                            isProcessing
                          }
                        >
                          <RefreshCw className="mr-1 h-4 w-4" />
                          Resend
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => cancelInviteMutation.mutate(invite.id)}
                          disabled={
                            invite.status !== "pending" || isCancelling
                          }
                        >
                          <Slash className="mr-1 h-4 w-4" />
                          Cancel
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default OrgMemberInvitesPanel;
