import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";
import { Link } from "react-router-dom";

export default function Solutions() {
  return (
    <div className="min-h-screen bg-[#F9F8F8]">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 lg:px-16 py-6 bg-[#F9F8F8]">
        <Link to="/" className="text-4xl lg:text-5xl font-medium bg-gradient-to-r from-[#B6A5A5] to-transparent bg-clip-text text-transparent">
          <span className="font-lora">MAIGON</span>
        </Link>
        
        <div className="hidden md:flex items-center space-x-8">
          <Link to="/#solutions" className="text-[#271D1D] hover:text-[#9A7C7C] transition-colors">Solutions</Link>
          <Link to="/#news" className="text-[#271D1D] hover:text-[#9A7C7C] transition-colors">News</Link>
          <Link to="/#team" className="text-[#271D1D] hover:text-[#9A7C7C] transition-colors">Team</Link>
          <Button asChild className="bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white px-8 rounded-lg">
            <Link to="/signin">Sign In/Up</Link>
          </Button>
        </div>
      </nav>

      {/* Main Content Section */}
      <section className="flex flex-col lg:flex-row items-center justify-between px-8 lg:px-16 py-12 lg:py-20 max-w-7xl mx-auto min-h-[calc(100vh-120px)]">
        {/* Left Side - Content */}
        <div className="flex-1 lg:pr-12 mb-12 lg:mb-0 max-w-lg">
          <div className="space-y-8">
            <h1 className="text-4xl lg:text-5xl xl:text-6xl font-medium leading-tight text-[#171614] font-lora">
              Ready to experience the future of contract review?
            </h1>
            
            <p className="text-[#171614] text-lg leading-relaxed max-w-md">
              Our solutions include contract type-specific AI review modules. All of our products integrate the latest deep learning technology to ensure maximum accuracy and efficiency. We are regularly adding support of new contract types based on customer demand.
            </p>
            
            <Button className="bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-[#F9F8F8] px-10 py-6 text-xl rounded-lg">
              Try for free
            </Button>
          </div>
        </div>
        
        {/* Right Side - Video/Camera Placeholder */}
        <div className="flex-1 flex justify-center lg:justify-end">
          <div className="bg-white rounded-lg border border-[#271D1D]/15 p-16 lg:p-20 xl:p-24 flex items-center justify-center w-full max-w-2xl aspect-[4/5]">
            <div className="relative">
              {/* Camera SVG matching the Figma design */}
              <svg
                width="379"
                height="403"
                viewBox="0 0 379 403"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-64 h-72 lg:w-80 lg:h-96"
              >
                <path
                  d="M363.21 319.042C363.21 327.949 359.882 336.491 353.959 342.789C348.036 349.087 340.003 352.625 331.626 352.625H47.3763C38.9999 352.625 30.9665 349.087 25.0435 342.789C19.1205 336.491 15.793 327.949 15.793 319.042V134.333C15.793 125.426 19.1205 116.884 25.0435 110.586C30.9665 104.288 38.9999 100.75 47.3763 100.75H110.543L142.126 50.375H236.876L268.46 100.75H331.626C340.003 100.75 348.036 104.288 353.959 110.586C359.882 116.884 363.21 125.426 363.21 134.333V319.042Z"
                  stroke="#1E1E1E"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M189.501 285.458C224.387 285.458 252.668 255.387 252.668 218.292C252.668 181.197 224.387 151.125 189.501 151.125C154.615 151.125 126.335 181.197 126.335 218.292C126.335 255.387 154.615 285.458 189.501 285.458Z"
                  stroke="#1E1E1E"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
