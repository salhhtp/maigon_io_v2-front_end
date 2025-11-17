import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/contexts/SupabaseUserContext";
import AdminUserService, {
  type CreateUserRequest,
} from "@/services/adminUserService";
import AdminOrgService from "@/services/adminOrgService";
import type { PlanDefinition } from "@shared/plans";
import type { AdminOrganizationSummary } from "@shared/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { CheckCircle2, UserPlus, Loader2 } from "lucide-react";

const steps = ["Account", "Plan", "Organization", "Review"];

interface FormState {
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  planKey: string;
  planOverrides: {
    contractsLimit?: number;
    seatsLimit?: number;
    documentsLimit?: number;
  };
  organizationMode: "none" | "existing" | "new";
  organizationId: string;
  makeOrgAdmin: boolean;
  newOrgName: string;
  newOrgSlug: string;
  newOrgSeats?: number;
  newOrgDocuments?: number;
}

const initialForm: FormState = {
  email: "",
  firstName: "",
  lastName: "",
  company: "",
  planKey: "",
  planOverrides: {},
  organizationMode: "none",
  organizationId: "",
  makeOrgAdmin: false,
  newOrgName: "",
  newOrgSlug: "",
  newOrgSeats: undefined,
  newOrgDocuments: undefined,
};

const CreateUserWizard: React.FC = () => {
  const { user } = useUser();
  const authUserId = user?.authUserId ?? null;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<FormState>(initialForm);
  const [result, setResult] = useState<
    | {
        email: string;
        temporaryPassword: string;
        organizationId: string | null;
        planName: string;
      }
    | null
  >(null);

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

  const createUserMutation = useMutation({
    mutationFn: (payload: CreateUserRequest) =>
      AdminUserService.createUser(authUserId!, payload),
    onSuccess: (response) => {
      toast({
        title: "User created",
        description: `${response.user.email} is ready to sign in.`,
      });
      setResult({
        email: response.user.email,
        temporaryPassword: response.temporaryPassword,
        organizationId: response.user.organizationId,
        planName: response.plan.name,
      });
      queryClient.invalidateQueries({ queryKey: ["admin-orgs"] });
    },
    onError: (error: unknown) => {
      toast({
        title: "Failed to create user",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    },
  });

  const plans = plansQuery.data ?? [];
  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.key === form.planKey),
    [plans, form.planKey],
  );

  const selectedOrg = useMemo(() => {
    if (form.organizationMode !== "existing") return null;
    return (organizationsQuery.data ?? []).find(
      (org) => org.id === form.organizationId,
    ) ?? null;
  }, [form.organizationMode, form.organizationId, organizationsQuery.data]);

  const canGoBack = stepIndex > 0;
  const canGoNext = useMemo(() => {
    switch (stepIndex) {
      case 0:
        return Boolean(form.email.trim());
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
    setStepIndex(0);
  };

  const renderPlanCard = (plan: PlanDefinition) => {
    const isSelected = form.planKey === plan.key;
    return (
      <button
        type="button"
        key={plan.key}
        onClick={() =>
          setForm((prev) => ({
            ...prev,
            planKey: plan.key,
            planOverrides: {},
          }))
        }
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

  const submit = () => {
    if (!selectedPlan) return;
    const payload: CreateUserRequest = {
      email: form.email.trim(),
      firstName: form.firstName.trim() || undefined,
      lastName: form.lastName.trim() || undefined,
      company: form.company.trim() || undefined,
      planKey: selectedPlan.key,
      planOverrides: {
        contractsLimit: form.planOverrides.contractsLimit,
        seatsLimit: form.planOverrides.seatsLimit,
        documentsLimit: form.planOverrides.documentsLimit,
      },
    };

    if (form.organizationMode === "existing") {
      payload.organization = {
        mode: "existing",
        organizationId: form.organizationId,
        makeOrgAdmin: form.makeOrgAdmin,
      };
    } else if (form.organizationMode === "new") {
      payload.organization = {
        mode: "new",
        name: form.newOrgName.trim(),
        slug: form.newOrgSlug.trim() || undefined,
        seatsLimit: form.newOrgSeats,
        documentsLimit: form.newOrgDocuments,
        makeOrgAdmin: form.makeOrgAdmin,
      };
    } else {
      payload.organization = { mode: "none" };
    }

    createUserMutation.mutate(payload);
  };

  if (!user?.isMaigonAdmin) {
    return null;
  }

  if (result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-[#271D1D] flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" /> User provisioned
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-[#E8DDDD] bg-white p-4">
            <p className="text-sm text-[#6B7280]">User email</p>
            <p className="text-lg font-semibold text-[#271D1D]">
              {result.email}
            </p>
          </div>
          <div className="rounded-lg border border-[#E8DDDD] bg-white p-4">
            <p className="text-sm text-[#6B7280]">Temporary password</p>
            <p className="font-mono text-lg text-[#271D1D]">
              {result.temporaryPassword}
            </p>
          </div>
          <div className="rounded-lg border border-[#E8DDDD] bg-white p-4 text-sm text-[#6B7280]">
            <p>
              Assigned plan: <span className="font-medium text-[#271D1D]">{result.planName}</span>
            </p>
            {result.organizationId ? (
              <p>
                Linked to organization: <span className="font-medium text-[#271D1D]">{result.organizationId}</span>
              </p>
            ) : (
              <p>Not linked to an organization.</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={resetWizard}>
              Create another user
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl text-[#271D1D] flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-[#9A7C7C]" /> Create User
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-[#6B7280]">
          {steps.map((label, index) => (
            <React.Fragment key={label}>
              <div
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  index === stepIndex
                    ? "bg-[#9A7C7C] text-white"
                    : index < stepIndex
                      ? "bg-[#E8DDDD] text-[#271D1D]"
                      : "bg-[#F3F3F3] text-[#6B7280]"
                }`}
              >
                {label}
              </div>
              {index < steps.length - 1 && <span>›</span>}
            </React.Fragment>
          ))}
        </div>

        {plansQuery.isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <div className="space-y-6">
            {stepIndex === 0 && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label className="text-xs text-[#6B7280]">Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, email: event.target.value }))
                    }
                    placeholder="client@example.com"
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs text-[#6B7280]">First name</Label>
                  <Input
                    value={form.firstName}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, firstName: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs text-[#6B7280]">Last name</Label>
                  <Input
                    value={form.lastName}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, lastName: event.target.value }))
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs text-[#6B7280]">Company</Label>
                  <Input
                    value={form.company}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, company: event.target.value }))
                    }
                  />
                </div>
              </div>
            )}

            {stepIndex === 1 && (
              <div className="space-y-4">
                <div className="grid gap-3 lg:grid-cols-2">
                  {plans.map(renderPlanCard)}
                </div>
                {selectedPlan && (
                  <div className="grid gap-2 md:grid-cols-3">
                    <div>
                      <Label className="text-xs text-[#6B7280]">Contracts limit</Label>
                      <Input
                        type="number"
                        min={selectedPlan.quotas.contractsLimit}
                        value={form.planOverrides.contractsLimit ?? selectedPlan.quotas.contractsLimit}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            planOverrides: {
                              ...prev.planOverrides,
                              contractsLimit: Number(event.target.value) || undefined,
                            },
                          }))
                        }
                      />
                    </div>
                    {selectedPlan.quotas.seatsLimit !== undefined && (
                      <div>
                        <Label className="text-xs text-[#6B7280]">Seats limit</Label>
                        <Input
                          type="number"
                          min={selectedPlan.quotas.seatsLimit}
                          value={form.planOverrides.seatsLimit ?? selectedPlan.quotas.seatsLimit}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              planOverrides: {
                                ...prev.planOverrides,
                                seatsLimit: Number(event.target.value) || undefined,
                              },
                            }))
                          }
                        />
                      </div>
                    )}
                    {selectedPlan.quotas.documentsLimit !== undefined && (
                      <div>
                        <Label className="text-xs text-[#6B7280]">Documents limit</Label>
                        <Input
                          type="number"
                          min={selectedPlan.quotas.documentsLimit}
                          value={
                            form.planOverrides.documentsLimit ??
                            selectedPlan.quotas.documentsLimit
                          }
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              planOverrides: {
                                ...prev.planOverrides,
                                documentsLimit: Number(event.target.value) || undefined,
                              },
                            }))
                          }
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {stepIndex === 2 && (
              <div className="space-y-4">
                <RadioGroup
                  value={form.organizationMode}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      organizationMode: value as FormState["organizationMode"],
                    }))
                  }
                  className="space-y-3"
                >
                  <div className="flex items-center gap-3 rounded-lg border border-[#E8DDDD] bg-white p-3">
                    <RadioGroupItem value="none" id="org-none" />
                    <Label htmlFor="org-none" className="cursor-pointer">
                      No organization
                    </Label>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border border-[#E8DDDD] bg-white p-3">
                    <RadioGroupItem value="existing" id="org-existing" />
                    <Label htmlFor="org-existing" className="cursor-pointer">
                      Assign to existing organization
                    </Label>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border border-[#E8DDDD] bg-white p-3">
                    <RadioGroupItem value="new" id="org-new" />
                    <Label htmlFor="org-new" className="cursor-pointer">
                      Create a new organization
                    </Label>
                  </div>
                </RadioGroup>

                {form.organizationMode === "existing" && (
                  <div className="space-y-3">
                    {organizationsQuery.isLoading ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <select
                        className="w-full rounded-md border border-[#E8DDDD] bg-white px-3 py-2 text-sm"
                        value={form.organizationId}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            organizationId: event.target.value,
                          }))
                        }
                      >
                        <option value="">Select organization…</option>
                        {(organizationsQuery.data ?? []).map((org) => (
                          <option key={org.id} value={org.id}>
                            {org.name}
                          </option>
                        ))}
                      </select>
                    )}
                    <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                      <input
                        id="make-org-admin"
                        type="checkbox"
                        className="h-4 w-4 rounded border border-[#9A7C7C]"
                        checked={form.makeOrgAdmin}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            makeOrgAdmin: event.target.checked,
                          }))
                        }
                      />
                      <label htmlFor="make-org-admin">
                        Grant organization admin permissions
                      </label>
                    </div>
                  </div>
                )}

                {form.organizationMode === "new" && (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-[#6B7280]">
                        Organization name
                      </Label>
                      <Input
                        value={form.newOrgName}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            newOrgName: event.target.value,
                          }))
                        }
                        placeholder="New client org"
                      />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <Label className="text-xs text-[#6B7280]">
                          Custom slug (optional)
                        </Label>
                        <Input
                          value={form.newOrgSlug}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              newOrgSlug: event.target.value,
                            }))
                          }
                          placeholder="client-co"
                        />
                      </div>
                      <div className="space-y-2 text-xs text-[#6B7280] flex items-center gap-2">
                        <input
                          id="new-org-admin"
                          type="checkbox"
                          className="h-4 w-4 rounded border border-[#9A7C7C]"
                          checked={form.makeOrgAdmin}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              makeOrgAdmin: event.target.checked,
                            }))
                          }
                        />
                        <label htmlFor="new-org-admin">
                          Make this user the organization admin
                        </label>
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <Label className="text-xs text-[#6B7280]">Seat limit</Label>
                        <Input
                          type="number"
                          value={form.newOrgSeats ?? ""}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              newOrgSeats: event.target.value
                                ? Number(event.target.value)
                                : undefined,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-[#6B7280]">
                          Documents limit
                        </Label>
                        <Input
                          type="number"
                          value={form.newOrgDocuments ?? ""}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              newOrgDocuments: event.target.value
                                ? Number(event.target.value)
                                : undefined,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {stepIndex === 3 && (
              <div className="space-y-4">
                <div className="rounded-lg border border-[#E8DDDD] bg-white p-4">
                  <h4 className="text-sm font-semibold text-[#271D1D] mb-2">
                    Account
                  </h4>
                  <p className="text-sm text-[#6B7280]">{form.email}</p>
                  <p className="text-sm text-[#6B7280]">
                    {form.firstName} {form.lastName}
                  </p>
                  {form.company && (
                    <p className="text-sm text-[#6B7280]">Company: {form.company}</p>
                  )}
                </div>
                <div className="rounded-lg border border-[#E8DDDD] bg-white p-4">
                  <h4 className="text-sm font-semibold text-[#271D1D] mb-2">
                    Plan
                  </h4>
                  {selectedPlan ? (
                    <div className="text-sm text-[#6B7280]">
                      <p>
                        {selectedPlan.name} ({selectedPlan.billingCycle}) —
                        {" "}
                        {selectedPlan.price > 0 ? `$${selectedPlan.price}` : "Free"}
                      </p>
                      <p>
                        Contracts limit: {form.planOverrides.contractsLimit ?? selectedPlan.quotas.contractsLimit}
                      </p>
                      {selectedPlan.quotas.seatsLimit !== undefined && (
                        <p>
                          Seats limit: {form.planOverrides.seatsLimit ?? selectedPlan.quotas.seatsLimit}
                        </p>
                      )}
                      {selectedPlan.quotas.documentsLimit !== undefined && (
                        <p>
                          Documents limit: {form.planOverrides.documentsLimit ?? selectedPlan.quotas.documentsLimit}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-[#6B7280]">
                      Select a plan to review details.
                    </p>
                  )}
                </div>
                <div className="rounded-lg border border-[#E8DDDD] bg-white p-4">
                  <h4 className="text-sm font-semibold text-[#271D1D] mb-2">
                    Organization
                  </h4>
                  <p className="text-sm text-[#6B7280]">
                    {form.organizationMode === "none" && "No organization assignment"}
                    {form.organizationMode === "existing" && selectedOrg
                      ? `Existing organization: ${selectedOrg.name}`
                      : null}
                    {form.organizationMode === "new" && form.newOrgName
                      ? `Create new organization: ${form.newOrgName}`
                      : null}
                  </p>
                  {(form.organizationMode === "existing" || form.organizationMode === "new") && (
                    <p className="text-xs text-[#6B7280]">
                      Role: {form.makeOrgAdmin ? "Org Admin" : "Member"}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-4">
          <Button variant="outline" onClick={goBack} disabled={!canGoBack}>
            Back
          </Button>
          {stepIndex < steps.length - 1 ? (
            <Button onClick={goNext} disabled={!canGoNext}>
              Next
            </Button>
          ) : (
            <Button
              onClick={submit}
              disabled={createUserMutation.isLoading}
              className="flex items-center gap-2"
            >
              {createUserMutation.isLoading && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Create user
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CreateUserWizard;
