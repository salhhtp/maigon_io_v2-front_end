import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  User,
  Bell,
  Shield,
  CreditCard,
  Globe,
  Palette,
  Download,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import MobileNavigation from "@/components/MobileNavigation";
import { useUser } from "@/contexts/SupabaseUserContext";
import { DataService } from "@/services/dataService";
import { useToast } from "@/hooks/use-toast";

const SettingsSection = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="bg-white rounded-lg p-6 border border-[#271D1D]/10">
    <h3 className="font-lora text-lg font-medium text-[#271D1D] mb-6">
      {title}
    </h3>
    {children}
  </div>
);

const SettingItem = ({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) => (
  <div className="flex items-center justify-between py-4 border-b border-[#F3F3F3] last:border-b-0">
    <div className="flex-1">
      <p className="text-sm font-medium text-[#271D1D]">{label}</p>
      {description && (
        <p className="text-xs text-[#271D1D]/70 mt-1">{description}</p>
      )}
    </div>
    <div className="ml-4">{children}</div>
  </div>
);

const Toggle = ({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) => (
  <button
    onClick={() => onChange(!enabled)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
      enabled ? "bg-[#9A7C7C]" : "bg-[#D6CECE]"
    }`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
        enabled ? "translate-x-6" : "translate-x-1"
      }`}
    />
  </button>
);

export default function Settings() {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { user, isLoggedIn, updateUser } = useUser();

  // Redirect if not logged in
  if (!isLoggedIn || !user) {
    return (
      <div className="min-h-screen bg-[#F9F8F8] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-lora font-medium text-[#271D1D] mb-4">
            Access Denied
          </h1>
          <p className="text-[#271D1D]/70 mb-6">
            Please log in to view your settings.
          </p>
          <Link to="/signin">
            <Button className="bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white">
              Sign In
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Settings state from user context
  const [emailNotifications, setEmailNotifications] = useState(
    user.settings.email_notifications,
  );
  const [pushNotifications, setPushNotifications] = useState(
    user.settings.push_notifications,
  );
  const [marketingEmails, setMarketingEmails] = useState(
    user.settings.marketing_emails,
  );
  const [twoFactorAuth, setTwoFactorAuth] = useState(
    user.settings.two_factor_auth,
  );
  const [autoSave, setAutoSave] = useState(user.settings.auto_save);
  const [language, setLanguage] = useState(user.settings.language);
  const [timezone, setTimezone] = useState(user.settings.timezone);

  // Form data
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    company: user.company,
    phone: user.phone,
  });

  const handleSettingChange = (setting: string, value: boolean) => {
    const newSettings = { ...user.settings, [setting]: value };
    updateUser({ settings: newSettings });

    // Update local state
    switch (setting) {
      case "email_notifications":
        setEmailNotifications(value);
        break;
      case "push_notifications":
        setPushNotifications(value);
        break;
      case "marketing_emails":
        setMarketingEmails(value);
        break;
      case "two_factor_auth":
        setTwoFactorAuth(value);
        break;
      case "auto_save":
        setAutoSave(value);
        break;
    }
  };

  const handleFormSubmit = () => {
    updateUser({
      name: formData.name,
      email: formData.email,
      company: formData.company,
      phone: formData.phone,
    });
    // Show success message
    alert("Profile updated successfully!");
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    const newSettings = { ...user.settings, language: newLanguage };
    updateUser({ settings: newSettings });
  };

  const handleTimezoneChange = (newTimezone: string) => {
    setTimezone(newTimezone);
    const newSettings = { ...user.settings, timezone: newTimezone };
    updateUser({ settings: newSettings });
  };

  return (
    <div className="min-h-screen bg-[#F9F8F8]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 lg:px-16 py-6 bg-[#F9F8F8]">
        <Link to="/home">
          <Logo size="xl" />
        </Link>

        <div className="hidden md:flex items-center space-x-8">
          <Link
            to="/user-solutions"
            className="text-[#271D1D] hover:text-[#9A7C7C] transition-colors"
          >
            Solutions
          </Link>
          <Link
            to="/pricing"
            className="text-[#271D1D] hover:text-[#9A7C7C] transition-colors"
          >
            Pricing
          </Link>
          <Link
            to="/user-news"
            className="text-[#271D1D] hover:text-[#9A7C7C] transition-colors"
          >
            News
          </Link>
          <Link
            to="/user-team"
            className="text-[#271D1D] hover:text-[#9A7C7C] transition-colors"
          >
            Team
          </Link>

          {/* User Button */}
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center space-x-2 bg-[#D6CECE] hover:bg-[#D6CECE]/90 px-4 py-2 rounded-lg transition-colors"
            >
              <User className="w-4 h-4 text-[#271D1D]" />
              <span className="text-[#271D1D] font-medium">
                @{user.name.split(" ")[0]}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-[#271D1D] transition-transform ${userDropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-32 bg-white border border-[#271D1D]/15 rounded-lg shadow-lg py-2 z-10">
                <Link
                  to="/profile"
                  className="block px-4 py-2 text-sm text-[#271D1D] hover:bg-[#F9F8F8] transition-colors"
                >
                  Profile
                </Link>
                <Link
                  to="/settings"
                  className="block px-4 py-2 text-sm text-[#271D1D] hover:bg-[#F9F8F8] transition-colors"
                >
                  Settings
                </Link>
                <Link
                  to="/"
                  className="block px-4 py-2 text-sm text-[#271D1D] hover:bg-[#F9F8F8] transition-colors"
                >
                  Log Out
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <MobileNavigation
          isLoggedIn={true}
          userName={user.name.split(" ")[0]}
        />
      </nav>

      {/* Main Content */}
      <main className="pt-24 lg:pt-32 pb-20 px-8 lg:px-16">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl lg:text-4xl font-medium text-[#271D1D] font-lora">
                Settings
              </h1>
              <Link to="/profile">
                <Button
                  variant="outline"
                  className="text-[#271D1D] border-[#271D1D]/20"
                >
                  Back to Profile
                </Button>
              </Link>
            </div>
            <p className="text-lg text-[#271D1D]/70">
              Manage your account preferences and security settings.
            </p>
          </div>

          {/* Settings Grid */}
          <div className="space-y-8">
            {/* Account Information */}
            <SettingsSection title="Account Information">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#271D1D] mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-[#271D1D]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9A7C7C] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#271D1D] mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-[#271D1D]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9A7C7C] focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#271D1D] mb-2">
                      Company
                    </label>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) =>
                        setFormData({ ...formData, company: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-[#271D1D]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9A7C7C] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#271D1D] mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-[#271D1D]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9A7C7C] focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={handleFormSubmit}
                    className="bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white"
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            </SettingsSection>

            {/* Security Settings */}
            <SettingsSection title="Security">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-[#271D1D] mb-2">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter current password"
                      className="w-full px-3 py-2 pr-10 border border-[#271D1D]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9A7C7C] focus:border-transparent"
                    />
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4 text-[#271D1D]/50" />
                      ) : (
                        <Eye className="w-4 h-4 text-[#271D1D]/50" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#271D1D] mb-2">
                      New Password
                    </label>
                    <input
                      type="password"
                      placeholder="Enter new password"
                      className="w-full px-3 py-2 border border-[#271D1D]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9A7C7C] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#271D1D] mb-2">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      placeholder="Confirm new password"
                      className="w-full px-3 py-2 border border-[#271D1D]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9A7C7C] focus:border-transparent"
                    />
                  </div>
                </div>
                <SettingItem
                  label="Two-Factor Authentication"
                  description="Add an extra layer of security to your account"
                >
                  <div className="flex items-center gap-3">
                    <Toggle
                      enabled={twoFactorAuth}
                      onChange={(value) =>
                        handleSettingChange("two_factor_auth", value)
                      }
                    />
                    {twoFactorAuth && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[#271D1D] border-[#271D1D]/20"
                      >
                        Configure
                      </Button>
                    )}
                  </div>
                </SettingItem>
                <div className="flex justify-end">
                  <Button className="bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white">
                    Update Password
                  </Button>
                </div>
              </div>
            </SettingsSection>

            {/* Notification Settings */}
            <SettingsSection title="Notifications">
              <div className="space-y-1">
                <SettingItem
                  label="Email Notifications"
                  description="Receive contract review updates via email"
                >
                  <Toggle
                    enabled={emailNotifications}
                    onChange={(value) =>
                      handleSettingChange("email_notifications", value)
                    }
                  />
                </SettingItem>
                <SettingItem
                  label="Push Notifications"
                  description="Get instant notifications in your browser"
                >
                  <Toggle
                    enabled={pushNotifications}
                    onChange={(value) =>
                      handleSettingChange("push_notifications", value)
                    }
                  />
                </SettingItem>
                <SettingItem
                  label="Marketing Emails"
                  description="Receive updates about new features and offers"
                >
                  <Toggle
                    enabled={marketingEmails}
                    onChange={(value) =>
                      handleSettingChange("marketing_emails", value)
                    }
                  />
                </SettingItem>
              </div>
            </SettingsSection>

            {/* Preferences */}
            <SettingsSection title="Preferences">
              <div className="space-y-1">
                <SettingItem
                  label="Auto-Save Documents"
                  description="Automatically save uploaded documents"
                >
                  <Toggle
                    enabled={autoSave}
                    onChange={(value) =>
                      handleSettingChange("auto_save", value)
                    }
                  />
                </SettingItem>
                <SettingItem
                  label="Language"
                  description="Choose your preferred language"
                >
                  <select
                    value={language}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    className="px-3 py-2 border border-[#271D1D]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9A7C7C] focus:border-transparent"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                  </select>
                </SettingItem>
                <SettingItem
                  label="Time Zone"
                  description="Set your local time zone"
                >
                  <select
                    value={timezone}
                    onChange={(e) => handleTimezoneChange(e.target.value)}
                    className="px-3 py-2 border border-[#271D1D]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9A7C7C] focus:border-transparent"
                  >
                    <option value="UTC-8">Pacific Time (UTC-8)</option>
                    <option value="UTC-7">Mountain Time (UTC-7)</option>
                    <option value="UTC-6">Central Time (UTC-6)</option>
                    <option value="UTC-5">Eastern Time (UTC-5)</option>
                    <option value="UTC+0">GMT (UTC+0)</option>
                    <option value="UTC+1">Central European Time (UTC+1)</option>
                  </select>
                </SettingItem>
              </div>
            </SettingsSection>

            {/* Billing & Subscription */}
            <SettingsSection title="Billing & Subscription">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-[#F9F8F8] rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-[#271D1D]">
                      Current Plan
                    </p>
                    <p className="text-xs text-[#271D1D]/70">
                      {user.plan.name}
                      {user.plan.billing_cycle !== "trial" &&
                        ` - €${user.plan.price}${user.plan.billing_cycle === "monthly" ? "/month" : user.plan.billing_cycle === "per_contract" ? "/contract" : ""}`}
                    </p>
                  </div>
                  <Link to="/pricing">
                    <Button
                      variant="outline"
                      className="text-[#271D1D] border-[#271D1D]/20"
                    >
                      {user.plan.type === "free_trial"
                        ? "Upgrade Plan"
                        : "Change Plan"}
                    </Button>
                  </Link>
                </div>
                <div className="flex items-center justify-between p-4 bg-[#F9F8F8] rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-[#271D1D]">
                      Payment Method
                    </p>
                    <p className="text-xs text-[#271D1D]/70">
                      {user.billing.payment_method}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="text-[#271D1D] border-[#271D1D]/20"
                  >
                    {user.billing.payment_method === "No payment method"
                      ? "Add Payment"
                      : "Update"}
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    className="text-[#271D1D] border-[#271D1D]/20"
                    disabled={user.billing.billing_history.length === 0}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Invoice
                  </Button>
                  <Button
                    variant="outline"
                    className="text-[#271D1D] border-[#271D1D]/20"
                    disabled={user.billing.billing_history.length === 0}
                  >
                    View Billing History
                  </Button>
                </div>
              </div>
            </SettingsSection>

            {/* Data & Privacy */}
            <SettingsSection title="Data & Privacy">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#271D1D]">
                      Export Your Data
                    </p>
                    <p className="text-xs text-[#271D1D]/70">
                      Download a copy of all your data
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="text-[#271D1D] border-[#271D1D]/20"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#271D1D]">
                      Delete Account
                    </p>
                    <p className="text-xs text-[#271D1D]/70">
                      Permanently delete your account and all data
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </SettingsSection>

            {/* API Access */}
            <SettingsSection title="API Access">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#271D1D]">
                      API Keys
                    </p>
                    <p className="text-xs text-[#271D1D]/70">
                      Manage your API keys for integrations
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="text-[#271D1D] border-[#271D1D]/20"
                  >
                    Manage Keys
                  </Button>
                </div>
                <div className="p-4 bg-[#F9F8F8] rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#271D1D]">
                        Production Key
                      </p>
                      <p className="text-xs text-[#271D1D]/70 font-mono">
                        mk_live_••••••••••••••••••••••••••••
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[#271D1D] border-[#271D1D]/20"
                      >
                        Copy
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200"
                      >
                        Revoke
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </SettingsSection>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
