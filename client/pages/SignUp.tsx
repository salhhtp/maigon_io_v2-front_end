import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import Logo from "@/components/Logo";

export default function SignUp() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    businessEmail: "",
    companySize: "",
    countryRegion: "",
    industry: "",
    phoneNumber: "",
    hearAboutUs: ""
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle sign up logic here
    console.log("Sign up attempt:", formData);
  };

  return (
    <div className="min-h-screen bg-[#F9F8F8] flex">
      {/* Left side - Description */}
      <div className="hidden lg:flex flex-1 flex-col justify-center items-start px-12 lg:px-16">
        <div className="max-w-2xl">
          <h1 className="text-5xl lg:text-6xl font-medium text-[#313832] font-lora leading-tight mb-8">
            State-Of-The-Art AI<br />
            for Legal Review
          </h1>

          <p className="text-[#4B5563] text-lg leading-relaxed">
            Complete the form to receive your credentials from our team.
          </p>
        </div>
      </div>

      {/* Right side - Sign up form */}
      <div className="flex-1 lg:flex-1 flex flex-col items-center justify-center px-8 py-12">
        <div className="w-full max-w-md mb-8">
          <Logo size="xl" />
        </div>

        <Card className="w-full max-w-md border-none shadow-none bg-transparent">
          <CardContent className="p-0">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-[#4B5563] text-sm font-medium">
                    First Name
                  </Label>
                  <Input
                    id="firstName"
                    placeholder="First Name"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange("firstName", e.target.value)}
                    className="h-12 border-[#D1D5DB] bg-white/80 text-base placeholder:text-[#CCC]"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-[#4B5563] text-sm font-medium">
                    Last Name
                  </Label>
                  <Input
                    id="lastName"
                    placeholder="Last Name"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange("lastName", e.target.value)}
                    className="h-12 border-[#D1D5DB] bg-white/80 text-base placeholder:text-[#CCC]"
                    required
                  />
                </div>
              </div>

              {/* Business Email */}
              <div className="space-y-2">
                <Label htmlFor="businessEmail" className="text-[#4B5563] text-sm font-medium">
                  Business Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#032B32]" />
                  <Input
                    id="businessEmail"
                    type="email"
                    placeholder="your@email.com"
                    value={formData.businessEmail}
                    onChange={(e) => handleInputChange("businessEmail", e.target.value)}
                    className="pl-10 h-12 border-[#D1D5DB] bg-white/80 text-base placeholder:text-[#CCC]"
                    required
                  />
                </div>
              </div>

              {/* Company Size and Country */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companySize" className="text-[#4B5563] text-sm font-medium">
                    Company Size
                  </Label>
                  <Select value={formData.companySize} onValueChange={(value) => handleInputChange("companySize", value)}>
                    <SelectTrigger className="h-12 border-[#D1D5DB] bg-white/80 text-base">
                      <SelectValue placeholder="Company Size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-10">1-10 employees</SelectItem>
                      <SelectItem value="11-50">11-50 employees</SelectItem>
                      <SelectItem value="51-200">51-200 employees</SelectItem>
                      <SelectItem value="201-1000">201-1000 employees</SelectItem>
                      <SelectItem value="1000+">1000+ employees</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="countryRegion" className="text-[#4B5563] text-sm font-medium">
                    Country/Region
                  </Label>
                  <Select value={formData.countryRegion} onValueChange={(value) => handleInputChange("countryRegion", value)}>
                    <SelectTrigger className="h-12 border-[#D1D5DB] bg-white/80 text-base">
                      <SelectValue placeholder="Country/Region" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="us">United States</SelectItem>
                      <SelectItem value="uk">United Kingdom</SelectItem>
                      <SelectItem value="ca">Canada</SelectItem>
                      <SelectItem value="au">Australia</SelectItem>
                      <SelectItem value="de">Germany</SelectItem>
                      <SelectItem value="fr">France</SelectItem>
                      <SelectItem value="se">Sweden</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Industry and Phone */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="industry" className="text-[#4B5563] text-sm font-medium">
                    Industry
                  </Label>
                  <Select value={formData.industry} onValueChange={(value) => handleInputChange("industry", value)}>
                    <SelectTrigger className="h-12 border-[#D1D5DB] bg-white/80 text-base">
                      <SelectValue placeholder="Industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="legal">Legal Services</SelectItem>
                      <SelectItem value="finance">Financial Services</SelectItem>
                      <SelectItem value="healthcare">Healthcare</SelectItem>
                      <SelectItem value="technology">Technology</SelectItem>
                      <SelectItem value="consulting">Consulting</SelectItem>
                      <SelectItem value="real-estate">Real Estate</SelectItem>
                      <SelectItem value="manufacturing">Manufacturing</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber" className="text-[#4B5563] text-sm font-medium">
                    Phone Number
                  </Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="Phone Number"
                    value={formData.phoneNumber}
                    onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                    className="h-12 border-[#D1D5DB] bg-white/80 text-base placeholder:text-[#CCC]"
                  />
                </div>
              </div>

              {/* How did you hear about us */}
              <div className="space-y-2">
                <Label htmlFor="hearAboutUs" className="text-[#4B5563] text-sm font-medium">
                  How did you hear about us?
                </Label>
                <Textarea
                  id="hearAboutUs"
                  placeholder=""
                  value={formData.hearAboutUs}
                  onChange={(e) => handleInputChange("hearAboutUs", e.target.value)}
                  className="min-h-[50px] border-[#D1D5DB] bg-white/80 text-base placeholder:text-[#CCC] resize-none"
                  rows={3}
                />
              </div>

              {/* Disclaimer */}
              <p className="text-[#4F452B] text-xs leading-relaxed">
                By sharing your details, you agree to be contacted about content, events, or services we think 
                you'll enjoy. You can unsubscribe at any time.
              </p>

              {/* Submit button */}
              <Button
                type="submit"
                className="w-full h-12 bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white text-sm rounded-lg"
              >
                Submit
              </Button>

              {/* Sign in link */}
              <div className="text-center">
                <span className="text-[#4B5563] text-sm">Already have an account? </span>
                <Link to="/signin" className="text-[#9A7C7C] text-sm font-medium hover:underline">
                  Log in
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
