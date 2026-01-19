import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  FileKey,
  FileText,
  Package,
  Scale,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { SolutionKey } from "@shared/solutions";

const DEFAULT_ICON_CLASS_NAME = "w-5 h-5 text-[#9A7C7C]";

const SOLUTION_ICON_COMPONENTS: Record<SolutionKey, LucideIcon> = {
  dpa: ShieldCheck,
  nda: FileText,
  eula: FileKey,
  ppc: Users,
  psa: Package,
  ca: Briefcase,
  rda: Scale,
};

export function getSolutionIcon(
  key: SolutionKey,
  className: string = DEFAULT_ICON_CLASS_NAME,
): ReactNode {
  const Icon = SOLUTION_ICON_COMPONENTS[key];
  return <Icon className={className} />;
}
