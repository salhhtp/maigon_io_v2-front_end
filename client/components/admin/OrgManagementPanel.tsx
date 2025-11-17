import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/contexts/SupabaseUserContext";
import AdminOrgService, {
  type CreateOrganizationPayload,
  type UpdateOrganizationPayload,
} from "@/services/adminOrgService";
import type { AdminOrganizationSummary } from "@shared/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { RefreshCw, AlertTriangle, Building2, UserPlus, Settings } from "lucide-react";

const emptyOrgForm: CreateOrganizationPayload = {
  name: "",
  billingPlan: "standard",
  seatsLimit: 10,
  documentsLimit: 1000,
};

const OrgManagementPanel: React.FC = () => {
  const { user } = useUser();
  const authUserId = user?.authUserId ?? null;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [orgForm, setOrgForm] = useState<CreateOrganizationPayload>(
    emptyOrgForm,
  );
  const [updateSelection, setUpdateSelection] = useState<string>("");
  const [updateForm, setUpdateForm] = useState<UpdateOrganizationPayload>({});
  const [assignOrgId, setAssignOrgId] = useState<string>("");
  const [assignEmail, setAssignEmail] = useState("");
  const [assignFirstName, setAssignFirstName] = useState("");
  const [assignLastName, setAssignLastName] = useState("");
  const [createIfMissing, setCreateIfMissing] = useState(true);

  const organizationsQuery = useQuery<AdminOrganizationSummary[]>({
    queryKey: ["admin-orgs"],
    queryFn: () => AdminOrgService.listOrganizations(authUserId!),
    enabled: Boolean(authUserId && user?.isMaigonAdmin),
  });

  const createOrgMutation = useMutation({
    mutationFn: (payload: CreateOrganizationPayload) =>
      AdminOrgService.createOrganization(authUserId!, payload),
    onSuccess: (organization) => {
      toast({
        title: "Organization created",
        description: `${organization.name} is now available for assignment.`,
      });
      setOrgForm(emptyOrgForm);
      queryClient.invalidateQueries({ queryKey: ["admin-orgs"] });
    },
    onError: (error: unknown) => {
      toast({
        title: "Failed to create organization",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    },
  });

  const updateOrgMutation = useMutation({
    mutationFn: (payload: { id: string; updates: UpdateOrganizationPayload }) =>
      AdminOrgService.updateOrganization(authUserId!, payload.id, payload.updates),
    onSuccess: (organization) => {
      toast({
        title: "Organization updated",
        description: `${organization.name} quotas saved.`,
      });
      setUpdateForm({});
      queryClient.invalidateQueries({ queryKey: ["admin-orgs"] });
    },
    onError: (error: unknown) => {
      toast({
        title: "Failed to update organization",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    },
  });

  const assignAdminMutation = useMutation({
    mutationFn: () =>
      AdminOrgService.assignOrganizationAdmin(authUserId!, assignOrgId, {
        email: assignEmail,
        firstName: assignFirstName || undefined,
        lastName: assignLastName || undefined,
        createIfMissing,
      }),
    onSuccess: (result) => {
      const description = result.created
        ? `Invite created for ${result.user.email}. Temporary password: ${result.temporaryPassword}`
        : `${result.user.email} is now an organization admin.`;
      toast({ title: "Admin assigned", description });
      setAssignEmail("");
      setAssignFirstName("");
      setAssignLastName("");
      queryClient.invalidateQueries({ queryKey: ["admin-orgs"] });
    },
    onError: (error: unknown) => {
      toast({
        title: "Failed to assign admin",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    },
  });

  const organizations = organizationsQuery.data ?? [];
  const selectedOrg = useMemo(
    () => organizations.find((org) => org.id === updateSelection) ?? null,
    [organizations, updateSelection],
  );
  const hasUpdates = Object.keys(updateForm).length > 0;

  const orgOptions = useMemo(
    () =>
      organizations.map((org) => ({ value: org.id, label: org.name })),
    [organizations],
  );

  if (!user?.isMaigonAdmin) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-xl text-[#271D1D]">
              Organizations
            </CardTitle>
            <p className="text-sm text-[#6B7280]">
              Manage quotas, alert settings, and existing org administrators.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => organizationsQuery.refetch()}
            disabled={organizationsQuery.isFetching}
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {organizationsQuery.isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : organizations.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>No organizations found</AlertTitle>
              <AlertDescription>
                Create a new organization with the form below to get started.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {organizations.map((org) => (
                <div
                  key={org.id}
                  className="rounded-lg border border-[#E8DDDD] bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-[#271D1D]">
                        {org.name}
                      </h3>
                      <p className="text-xs text-[#6B7280]">
                        Plan: {org.billingPlan} • Slug: {org.slug ?? "—"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">
                        Seats {org.seatsUsed}/{org.seatsLimit}
                      </Badge>
                      <Badge variant="outline">
                        Docs {org.documentsUsed}/{org.documentsLimit}
                      </Badge>
                      {org.alertPreferences ? (
                        <Badge variant="outline">
                          Alerts: {org.alertPreferences.notifyHighRisk ? "high risk" : "muted"}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  {org.admins.length ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#6B7280]">
                      <span className="font-medium text-[#271D1D]">Admins:</span>
                      {org.admins.map((admin) => (
                        <Badge key={admin.id} variant="secondary">
                          {admin.name || admin.email}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-[#6B7280]">
                      No org admins assigned yet.
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#271D1D]">
              <Building2 className="h-5 w-5 text-[#9A7C7C]" />
              Create Organization
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <label className="text-xs text-[#6B7280]">Organization Name</label>
              <Input
                value={orgForm.name}
                onChange={(event) =>
                  setOrgForm((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="Acme Corp"
              />
            </div>
            <div className="grid gap-3">
              <label className="text-xs text-[#6B7280]">Billing Plan</label>
              <Input
                value={orgForm.billingPlan ?? ""}
                onChange={(event) =>
                  setOrgForm((prev) => ({
                    ...prev,
                    billingPlan: event.target.value,
                  }))
                }
                placeholder="standard / enterprise"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs text-[#6B7280]">Seat Limit</label>
                <Input
                  type="number"
                  min={1}
                  value={orgForm.seatsLimit ?? 10}
                  onChange={(event) =>
                    setOrgForm((prev) => ({
                      ...prev,
                      seatsLimit: Number(event.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-[#6B7280]">Documents Limit</label>
                <Input
                  type="number"
                  min={10}
                  value={orgForm.documentsLimit ?? 1000}
                  onChange={(event) =>
                    setOrgForm((prev) => ({
                      ...prev,
                      documentsLimit: Number(event.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>
            <Button
              onClick={() => createOrgMutation.mutate(orgForm)}
              disabled={createOrgMutation.isLoading || !orgForm.name.trim()}
            >
              Create Organization
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#271D1D]">
              <Settings className="h-5 w-5 text-[#9A7C7C]" />
              Update Quotas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <label className="text-xs text-[#6B7280]">Select Organization</label>
              <Select
                value={updateSelection}
                onValueChange={(value) => {
                  setUpdateSelection(value);
                  setUpdateForm({});
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose organization" />
                </SelectTrigger>
                <SelectContent>
                  {orgOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedOrg ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-xs text-[#6B7280]">Seat Limit</label>
                <Input
                  type="number"
                  min={selectedOrg.seatsUsed}
                  value={updateForm.seatsLimit ?? selectedOrg.seatsLimit}
                  onChange={(event) =>
                    setUpdateForm((prev) => {
                      const next = { ...prev };
                      if (!selectedOrg) return next;
                      const parsed = Number(event.target.value);
                      if (!Number.isFinite(parsed) || parsed === selectedOrg.seatsLimit) {
                        delete next.seatsLimit;
                      } else {
                        next.seatsLimit = parsed;
                      }
                      return next;
                    })
                  }
                />
                    <p className="text-[11px] text-[#6B7280]">
                      {selectedOrg.seatsUsed} seats currently in use
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-[#6B7280]">
                      Documents Limit
                    </label>
                <Input
                  type="number"
                  min={selectedOrg.documentsUsed}
                  value={
                    updateForm.documentsLimit ?? selectedOrg.documentsLimit
                  }
                  onChange={(event) =>
                    setUpdateForm((prev) => {
                      const next = { ...prev };
                      if (!selectedOrg) return next;
                      const parsed = Number(event.target.value);
                      if (!Number.isFinite(parsed) || parsed === selectedOrg.documentsLimit) {
                        delete next.documentsLimit;
                      } else {
                        next.documentsLimit = parsed;
                      }
                      return next;
                    })
                  }
                />
                    <p className="text-[11px] text-[#6B7280]">
                      {selectedOrg.documentsUsed} documents processed
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() =>
                    updateOrgMutation.mutate({
                      id: selectedOrg.id,
                      updates: updateForm,
                    })
                  }
                  disabled={updateOrgMutation.isLoading || !hasUpdates}
                >
                  Save changes
                </Button>
              </div>
            ) : (
              <p className="text-sm text-[#6B7280]">
                Select an organization to adjust limits and quotas.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#271D1D]">
            <UserPlus className="h-5 w-5 text-[#9A7C7C]" /> Invite or Assign Org Admin
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs text-[#6B7280]">Organization</label>
              <Select value={assignOrgId} onValueChange={setAssignOrgId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {orgOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-[#6B7280]">Email</label>
              <Input
                type="email"
                value={assignEmail}
                onChange={(event) => setAssignEmail(event.target.value)}
                placeholder="org-admin@example.com"
              />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs text-[#6B7280]">First name</label>
              <Input
                value={assignFirstName}
                onChange={(event) => setAssignFirstName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-[#6B7280]">Last name</label>
              <Input
                value={assignLastName}
                onChange={(event) => setAssignLastName(event.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#6B7280]">
            <input
              id="create-if-missing"
              type="checkbox"
              className="h-4 w-4 rounded border border-[#9A7C7C]"
              checked={createIfMissing}
              onChange={(event) => setCreateIfMissing(event.target.checked)}
            />
            <label htmlFor="create-if-missing">
              Create a new account if the email is not registered (a temporary password will be generated).
            </label>
          </div>
          <Button
            onClick={() => assignAdminMutation.mutate()}
            disabled={
              assignAdminMutation.isLoading ||
              !assignOrgId ||
              !assignEmail.trim()
            }
          >
            Assign Admin
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrgManagementPanel;
