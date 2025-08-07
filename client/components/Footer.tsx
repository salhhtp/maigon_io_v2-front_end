import React from 'react';
import { Link } from 'react-router-dom';
import Logo from './Logo';

const Footer: React.FC = () => {
  return (
    <footer className="bg-[#F9F8F8] py-20">
      <div className="max-w-7xl mx-auto px-8 lg:px-16">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center">
          {/* Logo and Address */}
          <div className="mb-12 lg:mb-0">
            <div className="mb-6">
              <Logo size="md" align="start" />
            </div>
            <div className="text-sm text-[#271D1D] leading-relaxed">
              <p>Maigon AB</p>
              <p>c/o Synch Advokat AB</p>
              <p>Box 3631</p>
              <p>103 59 Stockholm, Sweden</p>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex flex-col lg:flex-row gap-16 lg:gap-20">
            {/* Overview */}
            <div>
              <h4 className="text-sm text-[#9A7C7C] font-lora mb-4">Overview</h4>
              <div className="space-y-3">
                <Link to="/solutions" className="block text-sm text-[#271D1D] hover:text-[#9A7C7C] transition-colors">Solutions</Link>
                <Link to="/news" className="block text-sm text-[#271D1D] hover:text-[#9A7C7C] transition-colors">News</Link>
                <Link to="/team" className="block text-sm text-[#271D1D] hover:text-[#9A7C7C] transition-colors">Team</Link>
              </div>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-sm text-[#9A7C7C] font-lora mb-4">Legal</h4>
              <div className="space-y-3">
                <a href="https://maigon.io/tos/" className="block text-sm text-[#271D1D] hover:text-[#9A7C7C] transition-colors">Terms of Use</a>
                <a href="https://maigon.io/privacy_policy/" className="block text-sm text-[#271D1D] hover:text-[#9A7C7C] transition-colors">Privacy Policy</a>
                <a href="https://maigon.io/cookie_policy/" className="block text-sm text-[#271D1D] hover:text-[#9A7C7C] transition-colors">Cookies Policy</a>
              </div>
            </div>

            {/* Socials */}
            <div>
              <h4 className="text-sm text-[#9A7C7C] font-lora mb-4">Socials</h4>
              <div className="space-y-3">
                <a href="https://www.linkedin.com/company/maigon-ab/" className="block text-sm text-[#271D1D] hover:text-[#9A7C7C] transition-colors">LinkedIn</a>
                <a href="https://www.google.com/maps/place/Maigon/@59.3340535,18.07529,15z/data=!4m6!3m5!1s0x2183b423d1e66543:0x45946865a3ea133!8m2!3d55.8413895!4d12.4515083!16s%2Fg%2F11p15m25js?entry=ttu&g_ep=EgoyMDI1MDgwNC4wIKXMDSoASAFQAw%3D%3D" className="block text-sm text-[#271D1D] hover:text-[#9A7C7C] transition-colors">Gmail</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
