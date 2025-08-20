export default function Step1Mockup() {
  return (
    <div className="w-full h-full bg-[#F9F8F8] rounded-lg border border-[#271D1D]/15 overflow-hidden relative">
      <div className="flex items-center justify-center h-full p-3">
        <div className="flex items-center gap-6 w-full max-w-[620px]">
          {/* Left Section - Welcome Back */}
          <div className="flex flex-col items-start gap-8 w-[280px]">
            {/* Header */}
            <div className="flex justify-center items-center">
              <h1 className="text-[#313832] font-lora text-4xl font-medium leading-tight">
                Welcome Back!
              </h1>
            </div>

            {/* Body */}
            <div className="flex justify-center items-center">
              <p className="text-[#4B5563] font-roboto text-base font-normal leading-6 tracking-[0.16px]">
                To continue with Maigon, please log in with your credentials.
              </p>
            </div>
          </div>

          {/* Right Section - Form */}
          <div className="flex w-[350px] flex-col items-center gap-6">
            {/* MAIGON Logo */}
            <div className="w-full mb-4">
              <div className="text-[#725A5A] font-lora text-2xl font-medium text-center">
                MAIGON
              </div>
            </div>

            {/* Form */}
            <div className="flex w-full flex-col items-start gap-4">
              {/* Email and Address Fields */}
              <div className="flex gap-4 w-full">
                {/* Email Field */}
                <div className="flex w-[168px] flex-col items-start gap-1">
                  <label className="text-[#4B5563] font-roboto text-xs font-medium">
                    Email Address
                  </label>
                  <div className="h-[50px] w-full relative">
                    {/* Email Icon */}
                    <div className="absolute left-3 top-[15px] w-5 h-5">
                      <svg
                        width="20"
                        height="21"
                        viewBox="0 0 20 21"
                        fill="none"
                      >
                        <path
                          d="M16.668 3.83594H3.33464C2.41416 3.83594 1.66797 4.58213 1.66797 5.5026V15.5026C1.66797 16.4231 2.41416 17.1693 3.33464 17.1693H16.668C17.5884 17.1693 18.3346 16.4231 18.3346 15.5026V5.5026C18.3346 4.58213 17.5884 3.83594 16.668 3.83594Z"
                          stroke="#9CA3AF"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M18.3346 6.33594L10.8596 11.0859C10.6024 11.2471 10.3049 11.3326 10.0013 11.3326C9.6977 11.3326 9.40024 11.2471 9.14297 11.0859L1.66797 6.33594"
                          stroke="#9CA3AF"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <input
                      type="email"
                      placeholder="your@email.com"
                      className="w-full h-[50px] py-[13px] pr-[13px] pl-[41px] rounded-lg border border-[#D1D5DB] bg-white/80 text-base placeholder:text-[#CCC] font-roboto"
                    />
                  </div>
                </div>

                {/* Address Field */}
                <div className="flex w-[168px] flex-col items-start gap-1">
                  <label className="text-[#4B5563] font-roboto text-xs font-medium">
                    Address
                  </label>
                  <div className="h-[50px] w-full relative">
                    {/* Address Icon */}
                    <div className="absolute left-3 top-[15px] w-5 h-5">
                      <svg
                        width="20"
                        height="21"
                        viewBox="0 0 20 21"
                        fill="none"
                      >
                        <path
                          d="M10 11.5026C11.3807 11.5026 12.5 10.3833 12.5 9.0026C12.5 7.62187 11.3807 6.5026 10 6.5026C8.61929 6.5026 7.5 7.62187 7.5 9.0026C7.5 10.3833 8.61929 11.5026 10 11.5026Z"
                          stroke="#9CA3AF"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M17.5 9.0026C17.5 15.5026 10 19.5026 10 19.5026C10 19.5026 2.5 15.5026 2.5 9.0026C2.5 7.14492 3.23661 5.36371 4.55025 4.05007C5.86389 2.73642 7.6451 2.0026 9.5 2.0026C11.3549 2.0026 13.1361 2.73642 14.4497 4.05007C15.7634 5.36371 16.5 7.14492 16.5 9.0026Z"
                          stroke="#9CA3AF"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="@gmail.com"
                      className="w-full h-[50px] py-[13px] pr-[13px] pl-[41px] rounded-lg border border-[#D1D5DB] bg-white/80 text-base placeholder:text-[#CCC] font-roboto"
                    />
                  </div>
                </div>
              </div>

              {/* Password Field */}
              <div className="flex w-full flex-col items-start gap-1">
                <label className="text-[#4B5563] font-roboto text-xs font-medium">
                  Password
                </label>
                <div className="h-[50px] w-full relative">
                  {/* Password Icon */}
                  <div className="absolute left-3 top-[15px] w-5 h-5">
                    <svg width="20" height="21" viewBox="0 0 20 21" fill="none">
                      <rect
                        x="3"
                        y="11.5026"
                        width="14"
                        height="7"
                        rx="2"
                        ry="2"
                        stroke="#9CA3AF"
                        strokeWidth="2"
                      />
                      <path
                        d="M7 11.5026V7.5026C7 6.50695 7.39543 5.5522 8.10557 4.84206C8.81571 4.13192 9.77046 3.7365 10.7661 3.7365C11.7618 3.7365 12.7165 4.13192 13.4267 4.84206C14.1368 5.5522 14.5322 6.50695 14.5322 7.5026V11.5026"
                        stroke="#9CA3AF"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <input
                    type="password"
                    placeholder="Your Password"
                    className="w-full h-[50px] py-[13px] pr-[13px] pl-[41px] rounded-lg border border-[#D1D5DB] bg-white/80 text-base placeholder:text-[#CCC] font-roboto"
                  />
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center gap-2">
                <input type="checkbox" className="w-4 h-4" />
                <label className="text-[#4B5563] font-roboto text-sm">
                  Remember Me
                </label>
                <div className="ml-auto">
                  <a
                    href="#"
                    className="text-[#725A5A] font-roboto text-sm underline"
                  >
                    Forgot Password?
                  </a>
                </div>
              </div>

              {/* Login Button */}
              <button className="flex w-full h-[50px] justify-center items-center rounded-lg bg-[#725A5A] text-white font-roboto text-base font-medium hover:bg-[#725A5A]/90 transition-colors">
                Login Now
              </button>

              {/* Sign Up Link */}
              <div className="text-center w-full">
                <span className="text-[#4B5563] font-roboto text-sm">
                  Don't have an account?
                </span>
                <a
                  href="#"
                  className="text-[#725A5A] font-roboto text-sm underline ml-1"
                >
                  Create Account
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
