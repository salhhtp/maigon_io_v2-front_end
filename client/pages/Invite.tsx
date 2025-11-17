import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import PublicInviteService from "@/services/publicInviteService";
import type {
  InviteAcceptanceRequest,
  InviteAcceptanceResponse,
  InviteTokenSummary,
} from "@shared/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { AlertTriangle, CheckCircle2, Lock, ShieldCheck } from "lucide-react";

type FormState = {
  firstName: string;
  lastName: string;
  company: string;
  password: string;
  confirmPassword: string;
  optInUpdates: boolean;
};

const initialForm: FormState = {
  firstName: "",
  lastName: "",
  company: "",
  password: "",
  confirmPassword: "",
  optInUpdates: true,
};

const InvitePage: React.FC = () => {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [form, setForm] = useState<FormState>(initialForm);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState<InviteAcceptanceResponse | null>(null);

  const inviteQuery = useQuery<InviteTokenSummary>({
    queryKey: ["public-invite", token],
    queryFn: () => PublicInviteService.getInviteDetails(token),
    enabled: Boolean(token),
    staleTime: 60 * 1000,
  });

  const acceptMutation = useMutation({
    mutationFn: (payload: InviteAcceptanceRequest) =>
      PublicInviteService.acceptInvite(token, payload),
    onSuccess: (response) => {
      setAccepted(response);
      toast({
        title: "Welcome to Maigon",
        description: "Your workspace access is ready.",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Failed to activate invite",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    },
  });

  const invite = inviteQuery.data;
  const isPendingInvite = invite?.status === "pending";

  const planQuota = useMemo(() => {
    if (!invite?.planQuota) return null;
    const quota = invite.planQuota as Record<string, unknown>;
    return {
      contractsLimit:
        typeof quota.contractsLimit === "number" ? quota.contractsLimit : null,
      documentsLimit:
        typeof quota.documentsLimit === "number" ? quota.documentsLimit : null,
      seatsLimit:
        typeof quota.seatsLimit === "number" ? quota.seatsLimit : null,
    };
  }, [invite?.planQuota]);

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const validate = () => {
    if (form.password !== form.confirmPassword) {
      setPasswordError("Passwords do not match");
      return false;
    }
    if (form.password.length < 10) {
      setPasswordError("Use at least 10 characters for security");
      return false;
    }
    setPasswordError(null);
    return true;
  };

  const submit = () => {
    if (!validate()) return;

    const payload: InviteAcceptanceRequest = {
      password: form.password,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      company:
        form.company.trim() ||
        (invite?.inviteType === "org_member"
          ? invite.organizationName ?? undefined
          : invite?.prospectCompany ?? undefined),
      optInUpdates: form.optInUpdates,
    };

    acceptMutation.mutate(payload);
  };

  const renderQuotaBadge = (
    label: string,
    value: number | null,
    fallback: string,
  ) => (
    <Badge variant="outline" className="text-xs font-normal text-[#6B7280]">
      {label}: <span className="ml-1 font-medium text-[#271D1D]">{value ?? fallback}</span>
    </Badge>
  );

  const renderInviteSummary = () => {
    if (!invite) return null;

    if (invite.inviteType === "org_member") {
      return (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-[#271D1D]">
              Join {invite.organizationName ?? "the Maigon workspace"}
            </h2>
            <p className="text-sm text-[#6B7280]">
              This invite grants{" "}
              {invite.organizationRole === "org_admin"
                ? "administrator"
                : "member"}{" "}
              access to the organization.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs text-[#6B7280]">
              Role:
              <span className="ml-1 font-medium text-[#271D1D]">
                {invite.organizationRole === "org_admin" ? "Org Admin" : "Member"}
              </span>
            </Badge>
            {planQuota?.seatsLimit != null &&
              renderQuotaBadge("Seats", planQuota.seatsLimit, "Workspace default")}
            {planQuota?.documentsLimit != null &&
              renderQuotaBadge(
                "Documents",
                planQuota.documentsLimit,
                "Workspace default",
              )}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-[#271D1D]">
            {invite.planName ?? "Maigon Trial"}
          </h2>
          <p className="text-sm text-[#6B7280]">
            {invite.organizationName
              ? `You are joining ${invite.organizationName}`
              : "Access a personal Maigon workspace"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {renderQuotaBadge("Contracts", planQuota?.contractsLimit ?? null, "Trial quota")}
          {renderQuotaBadge("Documents", planQuota?.documentsLimit ?? null, "Unlimited")}
          {renderQuotaBadge("Seats", planQuota?.seatsLimit ?? null, "Starter")}
        </div>
      </div>
    );
  };

  const renderStatusCard = (title: string, description: string, variant: "info" | "error") => (
    <Card className="border-[#E8DDDD]">
      <CardHeader className="flex flex-row items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full ${
            variant === "info"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-rose-100 text-rose-700"
          }`}
        >
          {variant === "info" ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <AlertTriangle className="h-5 w-5" />
          )}
        </div>
        <div>
          <CardTitle className="text-lg text-[#271D1D]">{title}</CardTitle>
          <CardDescription className="text-sm text-[#6B7280]">
            {description}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Button variant="secondary" onClick={() => navigate("/signin")}>Go to sign in</Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-[#F7F4F4] py-12">
      <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4">
        <div className="text-center">
          <h1 className="text-3xl font-semibold text-[#271D1D]">Activate Your Maigon Invite</h1>
          <p className="mt-2 text-sm text-[#6B7280]">
            Set your account details to enter the AI contract review workspace.
          </p>
        </div>

        {inviteQuery.isLoading ? (
          <Skeleton className="h-60 w-full rounded-xl" />
        ) : inviteQuery.isError ? (
          renderStatusCard(
            "Invite not found",
            "The invite link is invalid or has been revoked. Please request a new link from your Maigon contact.",
            "error",
          )
        ) : !invite ? (
          renderStatusCard(
            "Invite unavailable",
            "The invite link is invalid. Reach out to the Maigon team for assistance.",
            "error",
          )
        ) : accepted ? (
          renderStatusCard(
            "You're all set",
            "Your account is active. Sign in to start reviewing contracts with Maigon.",
            "info",
          )
        ) : invite.status !== "pending" ? (
          renderStatusCard(
            invite.status === "accepted" ? "Invite already used" : "Invite expired",
            invite.status === "accepted"
              ? "This invite link has already been accepted. Visit the sign in page to continue."
              : "This invite link is no longer active. Request a new invite from your Maigon contact.",
            invite.status === "accepted" ? "info" : "error",
          )
        ) : (
          <div className="grid gap-6 md:grid-cols-[1.1fr,1fr]">
            <Card className="border-[#E8DDDD]">
              <CardHeader>
                <CardTitle className="text-lg text-[#271D1D]">Confirm workspace details</CardTitle>
              </CardHeader>
              <CardContent>{renderInviteSummary()}</CardContent>
            </Card>

            <Card className="border-[#E8DDDD]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-[#271D1D]">
                  <Lock className="h-4 w-4 text-[#9A7C7C]" />
                  Create your login
                </CardTitle>
                <CardDescription className="text-sm text-[#6B7280]">
                  Set a strong password to protect your account.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="first-name">First name</Label>
                    <Input
                      id="first-name"
                      value={form.firstName}
                      onChange={(event) => updateForm("firstName", event.target.value)}
                      placeholder="Jane"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last-name">Last name</Label>
                    <Input
                      id="last-name"
                      value={form.lastName}
                      onChange={(event) => updateForm("lastName", event.target.value)}
                      placeholder="Doe"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={form.company}
                    onChange={(event) => updateForm("company", event.target.value)}
                    placeholder={invite.prospectCompany ?? "Company name"}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={form.password}
                      onChange={(event) => updateForm("password", event.target.value)}
                      placeholder="••••••••••"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={form.confirmPassword}
                      onChange={(event) => updateForm("confirmPassword", event.target.value)}
                      placeholder="••••••••••"
                    />
                  </div>
                </div>
                {passwordError && (
                  <div className="rounded border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">
                    {passwordError}
                  </div>
                )}
                <div className="flex items-center justify-between rounded border border-[#E8DDDD] px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-[#271D1D]">Product updates</p>
                    <p className="text-xs text-[#6B7280]">
                      Receive onboarding tips and feature announcements.
                    </p>
                  </div>
                  <Switch
                    checked={form.optInUpdates}
                    onCheckedChange={(checked) => updateForm("optInUpdates", Boolean(checked))}
                  />
                </div>
                <Button
                  type="button"
                  className="w-full"
                  onClick={submit}
                  disabled={acceptMutation.isPending}
                >
                  {acceptMutation.isPending ? "Activating invite..." : "Activate invite"}
                </Button>
                <p className="flex items-center gap-2 text-xs text-[#6B7280]">
                  <ShieldCheck className="h-4 w-4 text-[#9A7C7C]" />
                  Your credentials are stored securely with Supabase Auth.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvitePage;
