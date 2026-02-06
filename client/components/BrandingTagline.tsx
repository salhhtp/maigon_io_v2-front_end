import React from "react";
import { useBranding } from "@/contexts/BrandingContext";

interface BrandingTaglineProps {
  className?: string;
}

const BrandingTagline: React.FC<BrandingTaglineProps> = ({ className }) => {
  const { footerTagline } = useBranding();

  if (!footerTagline) {
    return null;
  }

  return (
    <div className={className ?? "text-xs text-[#6B4F4F]"}>
      {footerTagline}
    </div>
  );
};

export default BrandingTagline;

