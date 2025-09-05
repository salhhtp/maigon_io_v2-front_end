import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { X, Menu, User, ChevronDown } from "lucide-react";
import { useUser } from "@/contexts/UserContext";

interface MobileNavigationProps {
  isLoggedIn?: boolean;
  userName?: string;
}

export default function MobileNavigation({
  isLoggedIn = false,
  userName,
}: MobileNavigationProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const { logout } = useUser();
  const navigate = useNavigate();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    if (isMenuOpen) {
      setUserDropdownOpen(false); // Close user dropdown when closing menu
    }
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
    setUserDropdownOpen(false);
  };

  // Navigation links based on authentication state
  const navLinks = isLoggedIn
    ? [
        { label: "Dashboard", href: "/dashboard" },
        { label: "Solutions", href: "/user-solutions" },
        { label: "News", href: "/user-news" },
        { label: "Team", href: "/user-team" },
      ]
    : [
        { label: "Home", href: "/" },
        { label: "Solutions", href: "/solutions" },
        { label: "News", href: "/news" },
        { label: "Team", href: "/team" },
      ];

  return (
    <>
      {/* Mobile Menu Button - visible on md and below */}
      <button
        onClick={toggleMenu}
        className="md:hidden flex flex-col items-center justify-center w-[17px] h-[17px] gap-[3px] relative"
        aria-label="Toggle navigation menu"
      >
        {!isMenuOpen ? (
          // Hamburger Menu Icon
          <>
            <div className="h-[3px] w-full rounded-[10px] bg-[#271D1D]"></div>
            <div className="h-[3px] w-full rounded-[10px] bg-[#271D1D]"></div>
            <div className="h-[3px] w-full rounded-[10px] bg-[#271D1D]"></div>
          </>
        ) : (
          // Close X Icon
          <div className="w-[14px] h-[14px] relative">
            <div
              className="w-[17px] h-[3px] rounded-[10px] bg-[#271D1D] absolute left-0 top-0"
              style={{ transform: "rotate(-45deg)", transformOrigin: "center" }}
            ></div>
            <div
              className="w-[17px] h-[3px] rounded-[10px] bg-[#271D1D] absolute left-0 top-0"
              style={{ transform: "rotate(45deg)", transformOrigin: "center" }}
            ></div>
          </div>
        )}
      </button>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Background overlay */}
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={closeMenu}
          ></div>

          {/* Menu Content */}
          <div className="absolute top-0 left-0 right-0 bg-[#F9F8F8] shadow-lg">
            {/* Close button */}
            <div className="flex justify-end p-6">
              <button
                onClick={closeMenu}
                className="flex items-center justify-center w-8 h-8"
                aria-label="Close menu"
              >
                <div className="w-[14px] h-[14px] relative">
                  <div
                    className="w-[17px] h-[3px] rounded-[10px] bg-[#271D1D] absolute left-0 top-0"
                    style={{
                      transform: "rotate(-45deg)",
                      transformOrigin: "center",
                    }}
                  ></div>
                  <div
                    className="w-[17px] h-[3px] rounded-[10px] bg-[#271D1D] absolute left-0 top-0"
                    style={{
                      transform: "rotate(45deg)",
                      transformOrigin: "center",
                    }}
                  ></div>
                </div>
              </button>
            </div>

            <div className="flex flex-col px-7 pb-28 gap-7">
              {/* Navigation Links */}
              <div className="flex flex-col items-start gap-7">
                {navLinks.map((link, index) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={closeMenu}
                    className="flex px-2.5 py-2.5 justify-center items-center gap-2.5"
                  >
                    <span
                      className={`text-black font-lora text-[32px] leading-[72px] ${
                        index === 0 ? "font-semibold" : "font-medium"
                      }`}
                    >
                      {link.label}
                    </span>
                  </Link>
                ))}
              </div>

              {/* User Authentication Section */}
              {isLoggedIn && userName ? (
                <div className="mt-4 pt-4 border-t border-[#271D1D]/15">
                  <div className="relative">
                    <button
                      onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                      className="flex items-center space-x-3 bg-[#D6CECE] hover:bg-[#D6CECE]/90 px-4 py-3 rounded-lg transition-colors w-full"
                    >
                      <User className="w-5 h-5 text-[#271D1D]" />
                      <span className="text-[#271D1D] font-medium text-lg">
                        @{userName}
                      </span>
                      <ChevronDown
                        className={`w-5 h-5 text-[#271D1D] transition-transform ml-auto ${userDropdownOpen ? "rotate-180" : ""}`}
                      />
                    </button>

                    {userDropdownOpen && (
                      <div className="mt-2 w-full bg-white border border-[#271D1D]/15 rounded-lg shadow-lg py-2">
                        <a
                          href="#"
                          className="block px-4 py-3 text-base text-[#271D1D] hover:bg-[#F9F8F8] transition-colors"
                        >
                          Profile
                        </a>
                        <a
                          href="#"
                          className="block px-4 py-3 text-base text-[#271D1D] hover:bg-[#F9F8F8] transition-colors"
                        >
                          Settings
                        </a>
                        <button
                          onClick={() => {
                            logout();
                            navigate("/");
                            closeMenu();
                          }}
                          className="block w-full text-left px-4 py-3 text-base text-[#271D1D] hover:bg-[#F9F8F8] transition-colors"
                        >
                          Log Out
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-4 pt-4 border-t border-[#271D1D]/15">
                  <Link
                    to="/signin"
                    onClick={closeMenu}
                    className="inline-flex items-center justify-center px-8 py-3 bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white rounded-lg transition-colors text-lg font-medium"
                  >
                    Sign In/Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
