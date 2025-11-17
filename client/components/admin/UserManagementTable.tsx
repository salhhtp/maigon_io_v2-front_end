import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/contexts/SupabaseUserContext";
import AdminUserService, {
  type UpdateUserRequest,
} from "@/services/adminUserService";
import type { AdminUserSummary } from "@shared/api";
import type { PlanDefinition } from "@shared/plans";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Download, RefreshCw } from "lucide-react";

const UserManagementTable: React.FC = () => {
  const { user } = useUser();
  const authUserId = user?.authUserId ?? null;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");

  const plansQuery = useQuery<PlanDefinition[]>({
    queryKey: ["admin-plan-catalog"],
    queryFn: () => AdminUserService.getPlanCatalog(authUserId!),
    enabled: Boolean(authUserId && user?.isMaigonAdmin),
  });

  const usersQuery = useQuery<AdminUserSummary[]>({
    queryKey: ["admin-users"],
    queryFn: () => AdminUserService.listUsers(authUserId!),
    enabled: Boolean(authUserId && user?.isMaigonAdmin),
  });

  const updateMutation = useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: UpdateUserRequest }) =>
      AdminUserService.updateUser(authUserId!, userId, payload),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData<AdminUserSummary[]>(
        ["admin-users"],
        (existing) =>
          existing?.map((candidate) =>
            candidate.id === updatedUser.id ? updatedUser : candidate,
          ) ?? [],
      );
      toast({ title: "User updated" });
    },
    onError: (error: unknown) => {
      toast({
        title: "Failed to update user",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    },
  });

  const resetMutation = useMutation({
    mutationFn: (userId: string) => AdminUserService.resetPassword(authUserId!, userId),
    onSuccess: (temporaryPassword) => {
      toast({
        title: "Password reset",
        description: `Temporary password: ${temporaryPassword}`,
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Failed to reset password",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    },
  });

  const plans = plansQuery.data ?? [];
  const users = usersQuery.data ?? [];

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const value = search.trim().toLowerCase();
    return users.filter((candidate) => {
      const haystack = [
        candidate.email,
        candidate.firstName ?? "",
        candidate.lastName ?? "",
        candidate.organization?.name ?? "",
        candidate.plan?.name ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(value);
    });
  }, [search, users]);

  if (!user?.isMaigonAdmin) {
    return null;
  }

  const isLoading = usersQuery.isLoading || plansQuery.isLoading;

  const handlePlanChange = (userId: string, planKey: string) => {
    updateMutation.mutate({
      userId,
      payload: {
        planKey,
      },
    });
  };

  const handleToggleActive = (userId: string, next: boolean) => {
    updateMutation.mutate({
      userId,
      payload: { isActive: next },
    });
  };

  const handleResetPassword = (userId: string) => {
    resetMutation.mutate(userId);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#271D1D]">
            Users
          </h2>
          <p className="text-sm text-[#6B7280]">
            Manage users, plans, and access across all organizations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by email, name, org..."
            className="w-full md:w-64"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => usersQuery.refetch()}
            disabled={usersQuery.isFetching}
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-[#E8DDDD] bg-white">
        <Table>
          <TableHeader className="bg-[#FBF9F8]">
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-10 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-[#6B7280]">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((candidate) => {
                const currentPlan = candidate.plan?.key ?? "";
                return (
                  <TableRow key={candidate.id}>
                    <TableCell className="font-medium text-[#271D1D]">
                      <div className="flex flex-col">
                        <span>{candidate.email}</span>
                        <span className="text-xs text-[#6B7280]">
                          Created {candidate.createdAt?.slice(0, 10) ?? "—"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm text-[#271D1D]">
                        <span>
                          {[candidate.firstName, candidate.lastName]
                            .filter(Boolean)
                            .join(" ") || "—"}
                        </span>
                        {candidate.company && (
                          <span className="text-xs text-[#6B7280]">
                            {candidate.company}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={currentPlan}
                        onValueChange={(value) => handlePlanChange(candidate.id, value)}
                      >
                        <SelectTrigger className="w-[160px]">
                          <SelectValue placeholder="Choose plan" />
                        </SelectTrigger>
                        <SelectContent>
                          {plans.map((plan) => (
                            <SelectItem key={plan.key} value={plan.key}>
                              {plan.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {candidate.plan && (
                        <p className="mt-1 text-xs text-[#6B7280]">
                          {candidate.plan.quotas.contractsLimit} contracts
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      {candidate.organization ? (
                        <div className="flex flex-col text-sm text-[#271D1D]">
                          <span>{candidate.organization.name || candidate.organization.id}</span>
                          <span className="text-xs text-[#6B7280] capitalize">
                            Role: {candidate.organization.role ?? "member"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-[#6B7280]">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {candidate.usage ? (
                        <div className="text-xs text-[#6B7280] space-y-1">
                          <div>
                            Contracts: {candidate.usage.contractsReviewed}
                          </div>
                          <div>
                            Compliance: {candidate.usage.complianceChecksCompleted}
                          </div>
                          <div>
                            Last: {candidate.usage.lastActivity?.slice(0, 10) ?? "—"}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-[#6B7280]">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={candidate.isActive}
                          onCheckedChange={(next) =>
                            handleToggleActive(candidate.id, next)
                          }
                        />
                        <Badge variant="outline" className="capitalize">
                          {candidate.role}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResetPassword(candidate.id)}
                          disabled={resetMutation.isLoading}
                        >
                          <Download className="mr-2 h-4 w-4" /> Reset password
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default UserManagementTable;
