import React from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface CallToActionSectionProps {
  title: string;
  description: string;
  primaryButton: {
    text: string;
    href: string;
    variant?: "default" | "outline";
  };
  secondaryButton?: {
    text: string;
    href: string;
    variant?: "default" | "outline";
  };
  className?: string;
}

const CallToActionSection: React.FC<CallToActionSectionProps> = ({
  title,
  description,
  primaryButton,
  secondaryButton,
  className = "mt-16",
}) => {
  return (
    <div className={`text-center ${className}`}>
      <div className="bg-white rounded-lg p-8 border border-[#271D1D]/10 shadow-sm">
        <h3 className="font-lora text-2xl font-medium text-[#271D1D] mb-4">
          {title}
        </h3>
        <p className="text-[#271D1D]/70 mb-6 max-w-2xl mx-auto">
          {description}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to={primaryButton.href}>
            <Button
              className={
                primaryButton.variant === "outline"
                  ? "text-[#271D1D] border-[#271D1D]/20 px-8 py-3"
                  : "bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white px-8 py-3"
              }
              variant={primaryButton.variant || "default"}
            >
              {primaryButton.text}
            </Button>
          </Link>
          {secondaryButton && (
            <Link to={secondaryButton.href}>
              <Button
                variant={secondaryButton.variant || "outline"}
                className={
                  secondaryButton.variant === "outline"
                    ? "text-[#271D1D] border-[#271D1D]/20 px-8 py-3"
                    : "bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white px-8 py-3"
                }
              >
                {secondaryButton.text}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallToActionSection;
