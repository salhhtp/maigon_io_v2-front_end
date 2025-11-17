import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/contexts/SupabaseUserContext";
import AdminUserService from "@/services/adminUserService";
import AdminOrgService from "@/services/adminOrgService";
import AdminInviteLinksService from "@/services/adminInviteLinksService";
import type { PlanDefinition } from "@shared/plans";
import type {
  AdminOrganizationSummary,
  CreateInviteLinkRequest,
  CreateInviteLinkResponse,
  OrgInviteLinkSummary,
  InvitePlanOverrides,
  InviteOrganizationMode,
} from "@shared/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import {
  CalendarIcon,
  CheckCircle2,
  ClipboardCopy,
  Clock,
  Loader2,
  MailCheck,
  Wand2,
} from "lucide-react";

const steps = ["Prospect", "Plan", "Workspace", "Review"] as const;
type StepKey = (typeof steps)[number];

interface FormState {
  email: string;
  prospectName: string;
  prospectCompany: string;
  sendEmail: boolean;
  expiresInDays: number;
  planKey: string;
  planOverrides: InvitePlanOverrides;
  overridesEnabled: boolean;
  organizationMode: InviteOrganizationMode;
  organizationId: string;
  newOrgName: string;
  newOrgSlug: string;
  newOrgSeats?: number;
  newOrgDocuments?: number;
  makeOrgAdmin: boolean;
}

const initialForm: FormState = {
  email: "",
  prospectName: "",
  prospectCompany: "",
  sendEmail: true,
  expiresInDays: 14,
  planKey: "",
  planOverrides: {},
  overridesEnabled: false,
  organizationMode: "new",
  organizationId: "",
  newOrgName: "",
  newOrgSlug: "",
  newOrgSeats: undefined,
  newOrgDocuments: undefined,
  makeOrgAdmin: true,
};

const formatDate = (input: string | null) => {
  if (!input) return "--";
  const date = new Date(input);
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const statusVariant: Record<string, string> = {
  pending: "bg-amber-100 text-amber-900 border-amber-200",
  accepted: "bg-emerald-100 text-emerald-900 border-emerald-200",
  expired: "bg-gray-100 text-gray-700 border-gray-200",
  cancelled: "bg-rose-100 text-rose-900 border-rose-200",
};

const ProspectTrialLinkWizard: React.FC = () => {
  const { user } = useUser();
  const authUserId = user?.authUserId ?? null;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<FormState>(initialForm);
  const [result, setResult] = useState<CreateInviteLinkResponse | null>(null);
  const [clipboardState, setClipboardState] = useState<"idle" | "copied" | "error">("idle");

  const plansQuery = useQuery<PlanDefinition[]>({
    queryKey: ["admin-plan-catalog"],
    queryFn: () => AdminUserService.getPlanCatalog(authUserId!),
    enabled: Boolean(authUserId),
  });

  const organizationsQuery = useQuery<AdminOrganizationSummary[]>({
    queryKey: ["admin-orgs"],
    queryFn: () => AdminOrgService.listOrganizations(authUserId!),
    enabled: Boolean(authUserId),
  });

  const invitesQuery = useQuery<OrgInviteLinkSummary[]>({
    queryKey: ["admin-invite-links"],
    queryFn: () => AdminInviteLinksService.listInvites(authUserId!),
    enabled: Boolean(authUserId),
  });

  useEffect(() => {
    if (!form.planKey && (plansQuery.data ?? []).length > 0) {
      setForm((prev) => ({
        ...prev,
        planKey: prev.planKey || plansQuery.data![0].key,
      }));
    }
  }, [plansQuery.data, form.planKey]);

  const selectedPlan = useMemo(() => {
    return (plansQuery.data ?? []).find((plan) => plan.key === form.planKey) ?? null;
  }, [plansQuery.data, form.planKey]);

  const selectedOrganization = useMemo(() => {
    if (form.organizationMode !== "existing") return null;
    return (organizationsQuery.data ?? []).find((org) => org.id === form.organizationId) ?? null;
  }, [form.organizationMode, form.organizationId, organizationsQuery.data]);

  const createInviteMutation = useMutation({
    mutationFn: (payload: CreateInviteLinkRequest) =>
      AdminInviteLinksService.createInvite(authUserId!, payload),
    onSuccess: (response) => {
      setResult(response);
      setClipboardState("idle");
      toast({
        title: "Invite link generated",
        description: response.invite.email,
      });
      queryClient.invalidateQueries({ queryKey: ["admin-invite-links"] });
      if (response.organizationCreated) {
        queryClient.invalidateQueries({ queryKey: ["admin-orgs"] });
      }
      setStepIndex(steps.length - 1);
    },
    onError: (error: unknown) => {
      toast({
        title: "Failed to generate invite",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    },
  });

  const canAdvance = useMemo(() => {
    switch (stepIndex) {
      case 0:
        return Boolean(form.email.trim()) && form.email.includes("@");
      case 1:
        return Boolean(form.planKey);
      case 2:
        if (form.organizationMode === "existing") {
          return Boolean(form.organizationId);
        }
        if (form.organizationMode === "new") {
          return Boolean(form.newOrgName.trim());
        }
        return true;
      default:
        return true;
    }
  }, [stepIndex, form]);

  const goNext = () => setStepIndex((index) => Math.min(index + 1, steps.length - 1));
  const goBack = () => setStepIndex((index) => Math.max(index - 1, 0));

  const resetWizard = () => {
    setForm(initialForm);
    setResult(null);
    setClipboardState("idle");
    setStepIndex(0);
  };

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const applyPlanOverride = (key: keyof InvitePlanOverrides, value: number | undefined) => {
    setForm((prev) => ({
      ...prev,
      planOverrides: {
        ...prev.planOverrides,
        [key]: value,
      },
    }));
  };

  const submit = () => {
    if (!selectedPlan || !authUserId) return;

    const payload: CreateInviteLinkRequest = {
      email: form.email.trim().toLowerCase(),
      prospectName: form.prospectName.trim() || undefined,
      prospectCompany: form.prospectCompany.trim() || undefined,
      planKey: selectedPlan.key,
      planOverrides: form.overridesEnabled ? { ...form.planOverrides } : undefined,
      expiresInDays: Number.isFinite(form.expiresInDays)
        ? Math.max(1, Math.floor(form.expiresInDays))
        : undefined,
      organizationMode: form.organizationMode,
      makeOrgAdmin: form.makeOrgAdmin,
      sendEmail: form.sendEmail,
    };

    if (form.organizationMode === "existing") {
      payload.organizationId = form.organizationId;
    } else if (form.organizationMode === "new") {
      payload.newOrganization = {
        name: form.newOrgName.trim(),
        slug: form.newOrgSlug.trim() || undefined,
        billingPlan: selectedPlan.key,
        seatsLimit: form.newOrgSeats,
        documentsLimit: form.newOrgDocuments,
      };
    }

    createInviteMutation.mutate(payload);
  };

  const copyInviteUrl = async () => {
    if (!result?.invite.inviteUrl) return;
    try {
      await navigator.clipboard.writeText(result.invite.inviteUrl);
      setClipboardState("copied");
      setTimeout(() => setClipboardState("idle"), 2000);
    } catch (error) {
      console.error("Failed to copy invite url", error);
      setClipboardState("error");
      setTimeout(() => setClipboardState("idle"), 2000);
    }
  };

  const renderPlanCard = (plan: PlanDefinition) => {
    const isSelected = form.planKey === plan.key;
    return (
      <button
        key={plan.key}
        type="button"
        onClick={() => updateForm("planKey", plan.key)}
        className={`w-full rounded-xl border p-4 text-left transition ${
          isSelected
            ? "border-[#9A7C7C] bg-[#FDF9F8] shadow"
            : "border-[#E8DDDD] hover:border-[#CBB8B8]"
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold text-[#271D1D]">{plan.name}</p>
            <p className="text-xs text-[#6B7280]">{plan.description}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold text-[#271D1D]">
              {plan.price > 0 ? `$${plan.price}` : "Free"}
            </p>
            <p className="text-xs text-[#6B7280] capitalize">{plan.billingCycle}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {plan.features.map((feature) => (
            <Badge key={feature} variant={isSelected ? "default" : "outline"}>
              {feature}
            </Badge>
          ))}
        </div>
      </button>
    );
  };

  const renderProspectStep = () => (
    <div className="grid gap-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="prospect-name">Prospect name</Label>
          <Input
            id="prospect-name"
            placeholder="Jane Doe"
            value={form.prospectName}
            onChange={(event) => updateForm("prospectName", event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="prospect-company">Company</Label>
          <Input
            id="prospect-company"
            placeholder="Acme Corp"
            value={form.prospectCompany}
            onChange={(event) => updateForm("prospectCompany", event.target.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="prospect-email">Email</Label>
        <Input
          id="prospect-email"
          type="email"
          placeholder="prospect@example.com"
          value={form.email}
          onChange={(event) => updateForm("email", event.target.value)}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="expires-in">Expires in (days)</Label>
          <div className="relative">
            <Input
              id="expires-in"
              type="number"
              min={1}
              value={form.expiresInDays}
              onChange={(event) =>
                updateForm("expiresInDays", Number(event.target.value) || 1)
              }
              className="pr-10"
            />
            <CalendarIcon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9A7C7C]" />
          </div>
        </div>
        <div className="flex items-center justify-between rounded border border-[#E8DDDD] px-4 py-3">
          <div>
            <p className="text-sm font-medium text-[#271D1D]">Send via email</p>
            <p className="text-xs text-[#6B7280]">Dispatch invite with SendGrid template</p>
          </div>
          <Switch
            checked={form.sendEmail}
            onCheckedChange={(checked) => updateForm("sendEmail", Boolean(checked))}
          />
        </div>
      </div>
    </div>
  );

  const renderPlanStep = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {(plansQuery.data ?? []).map(renderPlanCard)}
        {plansQuery.isLoading && (
          <Skeleton className="h-32 w-full rounded-xl" />
        )}
      </div>
      <div className="rounded-lg border border-dashed border-[#E8DDDD] p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[#271D1D]">Customize plan quotas</p>
            <p className="text-xs text-[#6B7280]">
              Override default contract, document or seat limits
            </p>
          </div>
          <Switch
            checked={form.overridesEnabled}
            onCheckedChange={(checked) => updateForm("overridesEnabled", Boolean(checked))}
          />
        </div>
        {form.overridesEnabled && (
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="contracts-limit">Contracts</Label>
              <Input
                id="contracts-limit"
                type="number"
                min={1}
                value={form.planOverrides.contractsLimit ?? ""}
                onChange={(event) =>
                  applyPlanOverride(
                    "contractsLimit",
                    event.target.value ? Number(event.target.value) : undefined,
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="documents-limit">Documents</Label>
              <Input
                id="documents-limit"
                type="number"
                min={1}
                value={form.planOverrides.documentsLimit ?? ""}
                onChange={(event) =>
                  applyPlanOverride(
                    "documentsLimit",
                    event.target.value ? Number(event.target.value) : undefined,
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seats-limit">Seats</Label>
              <Input
                id="seats-limit"
                type="number"
                min={1}
                value={form.planOverrides.seatsLimit ?? ""}
                onChange={(event) =>
                  applyPlanOverride(
                    "seatsLimit",
                    event.target.value ? Number(event.target.value) : undefined,
                  )
                }
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderWorkspaceStep = () => (
    <div className="space-y-6">
      <RadioGroup
        value={form.organizationMode}
        onValueChange={(mode) => {
          updateForm("organizationMode", mode as InviteOrganizationMode);
          if (mode === "existing" && (organizationsQuery.data ?? []).length > 0) {
            updateForm("organizationId", organizationsQuery.data![0].id);
          }
        }}
        className="grid gap-3 md:grid-cols-3"
      >
        {[
          {
            key: "new",
            title: "Provision trial workspace",
            description: "Create a fresh org with sample data",
          },
          {
            key: "existing",
            title: "Attach to existing org",
            description: "Reuse an active organization",
          },
          {
            key: "none",
            title: "No workspace",
            description: "Let user create workspace later",
          },
        ].map((option) => (
          <Label
            key={option.key}
            htmlFor={`org-mode-${option.key}`}
            className={`flex cursor-pointer flex-col rounded-lg border p-4 transition ${
              form.organizationMode === option.key
                ? "border-[#9A7C7C] bg-[#FDF9F8]"
                : "border-[#E8DDDD] hover:border-[#CBB8B8]"
            }`}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="font-semibold text-[#271D1D]">{option.title}</span>
              <RadioGroupItem value={option.key} id={`org-mode-${option.key}`} />
            </div>
            <span className="text-xs text-[#6B7280]">{option.description}</span>
          </Label>
        ))}
      </RadioGroup>

      {form.organizationMode === "existing" && (
        <div className="space-y-2">
          <Label>Organization</Label>
          <Select
            value={form.organizationId}
            onValueChange={(value) => updateForm("organizationId", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select organization" />
            </SelectTrigger>
            <SelectContent>
              {(organizationsQuery.data ?? []).map((org) => (
                <SelectItem key={org.id} value={org.id}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {organizationsQuery.isLoading && <Skeleton className="h-10 w-full" />}
        </div>
      )}

      {form.organizationMode === "new" && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="new-org-name">Workspace name</Label>
            <Input
              id="new-org-name"
              placeholder="Acme Trial Workspace"
              value={form.newOrgName}
              onChange={(event) => updateForm("newOrgName", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-org-slug">Slug (optional)</Label>
            <Input
              id="new-org-slug"
              placeholder="acme-trial"
              value={form.newOrgSlug}
              onChange={(event) => updateForm("newOrgSlug", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-org-seats">Seat limit</Label>
            <Input
              id="new-org-seats"
              type="number"
              min={1}
              value={form.newOrgSeats ?? ""}
              onChange={(event) =>
                updateForm(
                  "newOrgSeats",
                  event.target.value ? Number(event.target.value) : undefined,
                )
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-org-docs">Document limit</Label>
            <Input
              id="new-org-docs"
              type="number"
              min={10}
              value={form.newOrgDocuments ?? ""}
              onChange={(event) =>
                updateForm(
                  "newOrgDocuments",
                  event.target.value ? Number(event.target.value) : undefined,
                )
              }
            />
          </div>
        </div>
      )}

      {(form.organizationMode === "existing" || form.organizationMode === "new") && (
        <div className="flex items-center justify-between rounded border border-[#E8DDDD] px-4 py-3">
          <div>
            <p className="text-sm font-medium text-[#271D1D]">Grant org admin seat</p>
            <p className="text-xs text-[#6B7280]">
              Promote the prospect to workspace admin after onboarding
            </p>
          </div>
          <Switch
            checked={form.makeOrgAdmin}
            onCheckedChange={(checked) => updateForm("makeOrgAdmin", Boolean(checked))}
          />
        </div>
      )}
    </div>
  );

  const renderReviewStep = () => (
    <div className="space-y-6">
      {result ? (
        <div className="rounded-lg border border-[#E8DDDD] bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#271D1D]">
                Invite ready for {result.invite.email}
              </p>
              <p className="text-xs text-[#6B7280]">
                {result.invite.organizationName || "Unassigned workspace"}
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded border border-[#E8DDDD] px-4 py-3">
              <p className="text-xs uppercase text-[#6B7280]">Plan</p>
              <p className="text-sm font-medium text-[#271D1D]">
                {result.invite.planName}
              </p>
            </div>
            <div className="rounded border border-[#E8DDDD] px-4 py-3">
              <p className="text-xs uppercase text-[#6B7280]">Expires</p>
              <p className="text-sm font-medium text-[#271D1D]">
                {formatDate(result.invite.expiresAt)}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" onClick={copyInviteUrl}>
              {clipboardState === "copied" ? (
                <span className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" /> Copied
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <ClipboardCopy className="h-4 w-4" /> Copy invite link
                </span>
              )}
            </Button>
            <Button type="button" variant="secondary" onClick={() => window.open(result.invite.inviteUrl, "_blank")}
              disabled={!result.invite.inviteUrl}
            >
              Open link
            </Button>
            <Button type="button" variant="ghost" onClick={resetWizard}>
              Create another
            </Button>
          </div>
          {(() => {
            const metadata = result.invite.metadata ?? {};
            const dispatch = (metadata as Record<string, any>).emailDispatch;
            if (!dispatch) return null;
            return (
              <div className="mt-4 flex items-center gap-2 text-xs text-[#6B7280]">
                <MailCheck className="h-4 w-4 text-[#9A7C7C]" />
                {dispatch.success
                  ? "Invite email dispatched via SendGrid"
                  : "Email dispatch not completed — share link manually"}
              </div>
            );
          })()}
          {result.bootstrap && !result.bootstrap.skipped && (
            <div className="mt-4 flex items-center gap-2 text-xs text-[#6B7280]">
              <Wand2 className="h-4 w-4 text-[#9A7C7C]" />
              Provisioned sample workspace with {result.bootstrap.seededContracts} contract(s)
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-[#E8DDDD] p-4 text-sm text-[#6B7280]">
          Review the prospect details and generate the invite link.
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-[#6B7280]">
          <Clock className="h-4 w-4" />
          {selectedPlan
            ? `${selectedPlan.name} · ${selectedPlan.billingCycle}`
            : "Select a plan to continue"}
        </div>
        <Button
          type="button"
          onClick={submit}
          disabled={createInviteMutation.isPending || !selectedPlan}
        >
          {createInviteMutation.isPending ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Generating
            </span>
          ) : (
            "Generate invite"
          )}
        </Button>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (steps[stepIndex]) {
      case "Prospect":
        return renderProspectStep();
      case "Plan":
        return renderPlanStep();
      case "Workspace":
        return renderWorkspaceStep();
      case "Review":
        return renderReviewStep();
      default:
        return null;
    }
  };

  const invites = invitesQuery.data ?? [];

  if (!authUserId) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Card className="border-[#E8DDDD]">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg font-semibold text-[#271D1D]">
            Prospect Trial Link Wizard
            <span className="text-xs font-normal text-[#6B7280]">
              Step {stepIndex + 1} of {steps.length}: {steps[stepIndex]}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {renderCurrentStep()}
          {steps[stepIndex] !== "Review" && (
            <div className="flex items-center justify-between">
              <Button type="button" variant="ghost" onClick={goBack} disabled={stepIndex === 0}>
                Back
              </Button>
              <Button type="button" onClick={goNext} disabled={!canAdvance}>
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-[#E8DDDD]">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-[#271D1D]">
            Recent Invite Links
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {invitesQuery.isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((item) => (
                <Skeleton key={item} className="h-12 w-full" />
              ))}
            </div>
          ) : invites.length === 0 ? (
            <div className="rounded border border-dashed border-[#E8DDDD] p-6 text-center text-sm text-[#6B7280]">
              No prospect invites generated yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((invite) => {
                  const metadata = invite.metadata ?? {};
                  const company = (metadata as Record<string, any>).prospectCompany;
                  return (
                    <TableRow key={invite.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-[#271D1D]">
                            {invite.email}
                          </span>
                          {company && (
                            <span className="text-xs text-[#6B7280]">{company}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-[#271D1D]">
                        {invite.planName}
                      </TableCell>
                      <TableCell className="text-sm text-[#271D1D]">
                        {invite.organizationName ?? "—"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium ${
                            statusVariant[invite.status] ?? "bg-gray-100 text-gray-700 border-gray-200"
                          }`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {invite.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-[#271D1D]">
                        {formatDate(invite.expiresAt)}
                      </TableCell>
                      <TableCell className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            if (!invite.inviteUrl) return;
                            try {
                              await navigator.clipboard.writeText(invite.inviteUrl);
                              toast({
                                title: "Invite link copied",
                                description: invite.email,
                              });
                            } catch (error) {
                              console.error("Failed to copy invite link", error);
                              toast({
                                title: "Copy failed",
                                description: "Select the row to copy manually",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          <ClipboardCopy className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => invite.inviteUrl && window.open(invite.inviteUrl, "_blank")}
                          disabled={!invite.inviteUrl}
                        >
                          Open
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProspectTrialLinkWizard;
