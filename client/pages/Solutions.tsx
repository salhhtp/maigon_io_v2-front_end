import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import AnimatedQuotes from "@/components/AnimatedQuotes";
import AnimatedSolutionsMockup from "@/components/AnimatedSolutionsMockup";
import MobileNavigation from "@/components/MobileNavigation";

const SolutionCard = ({
  title,
  description,
  imageSrc,
}: {
  title: string;
  description: string;
  imageSrc: string;
}) => (
  <div className="bg-[#F3F3F3] rounded-lg overflow-hidden">
    <div className="p-4">
      <img
        src={imageSrc}
        alt={title}
        className="w-full h-57 object-cover rounded-lg mb-4"
      />
      <h3 className="text-xl font-medium text-[#271D1D] font-lora mb-2 leading-tight">
        {title}
      </h3>
      <p className="text-sm text-[#271D1D] leading-relaxed">{description}</p>
    </div>
  </div>
);

const SolutionsCarousel = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const solutions = [
    {
      title: "Non-Disclosure Agreements",
      description:
        "Review non-disclosure agreements for compliance with established standards and best practices. Get instant report with compliance insights and extracted clauses.",
      imageSrc:
        "https://api.builder.io/api/v1/image/assets/TEMP/bf723346ff37e3006a994d9bde29f03ca52957bd?width=456",
    },
    {
      title: "Data Processing Agreements",
      description:
        "Review data processing agreements for compliance with the GDPR and latest EDPB guidelines. Get instant compliance report with extracted clauses, concepts, terms, highlighted risks, and compliance recommendations.",
      imageSrc:
        "https://api.builder.io/api/v1/image/assets/TEMP/d2502c8f65fc6fb3cfd64fcf2e883767c28d87b3?width=456",
    },
    {
      title: "Privacy Policy Documents",
      description:
        "Review privacy statements for compliance with the GDPR criteria. Get instant compliance report with extracted clauses and recommendations.",
      imageSrc:
        "https://api.builder.io/api/v1/image/assets/TEMP/ac64a1c280fd3ae21e76e02f5df24162a5b11a53?width=456",
    },
    {
      title: "Consultancy Agreements",
      description:
        "Review consultancy agreements (and other professional services agreements) for compliance with established standards and best practices. Get instant report with insights and extracted clauses.",
      imageSrc:
        "https://api.builder.io/api/v1/image/assets/TEMP/ace056ab1571ec964a3c7a17e383b264d6766921?width=456",
    },
    {
      title: "R&D Agreements",
      description:
        "Conduct compliance review of R&D agreements to ensure adherence to industry standards. Obtain a report on potential compliance risks and recommendations for risk mitigation.",
      imageSrc:
        "https://api.builder.io/api/v1/image/assets/TEMP/55ab6d6eecccdbe325f9af592bd502bb13e77ea6?width=456",
    },
    {
      title: "End User License Agreements",
      description:
        "Review end user license agreements for compliance with established standards and best practices. Get instant report with insights and extracted clauses. Used most often for reviewing software license agreements.",
      imageSrc:
        "https://api.builder.io/api/v1/image/assets/TEMP/028255c210716e79f6cc8592e835ed9bcd809aa3?width=456",
    },
    {
      title: "Product Supply Agreements",
      description:
        "Review product supply agreements for compliance with established standards and best practices. Get instant report with insights and extracted clauses.",
      imageSrc:
        "https://api.builder.io/api/v1/image/assets/TEMP/79eb9ad36f91db898294f4ebc9584deb77f82e31?width=456",
    },
  ];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % solutions.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + solutions.length) % solutions.length);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  // Touch/swipe support
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      nextSlide();
    } else if (isRightSwipe) {
      prevSlide();
    }
  };

  return (
    <div className="py-5 relative w-full max-w-sm mx-auto">
      {/* Navigation Buttons */}
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={prevSlide}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-white border border-[#271D1D]/20 hover:bg-[#F3F3F3] transition-colors shadow-sm"
          aria-label="Previous solution"
        >
          <ChevronLeft className="w-4 h-4 text-[#271D1D]" />
        </button>

        <div className="text-center">
          <span className="text-sm text-[#271D1D]/70">
            {currentSlide + 1} of {solutions.length}
          </span>
        </div>

        <button
          onClick={nextSlide}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-white border border-[#271D1D]/20 hover:bg-[#F3F3F3] transition-colors shadow-sm"
          aria-label="Next solution"
        >
          <ChevronRight className="w-4 h-4 text-[#271D1D]" />
        </button>
      </div>

      {/* Carousel Container */}
      <div
        ref={carouselRef}
        className="relative overflow-hidden rounded-lg"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="flex transition-transform duration-300 ease-in-out"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {solutions.map((solution, index) => (
            <div key={index} className="w-full flex-shrink-0">
              <Link to="/signin" className="block">
                <div className="bg-[#F3F3F3] rounded-lg overflow-hidden hover:bg-[#ECECEC] transition-colors duration-200 p-3 h-[380px] md:h-[420px]">
                  <div className="flex flex-col items-center text-center h-full">
                    <img
                      src={solution.imageSrc}
                      alt={solution.title}
                      className="w-28 h-28 md:w-36 md:h-36 object-cover rounded-lg mb-2 flex-shrink-0"
                    />
                    <div className="flex flex-col justify-between flex-1">
                      <h3 className="text-sm md:text-base font-medium text-[#271D1D] font-lora mb-2 leading-tight">
                        {solution.title}
                      </h3>
                      <p className="text-xs md:text-sm text-[#271D1D] leading-relaxed">
                        {solution.description}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Dot Indicators */}
      <div className="flex justify-center mt-4 space-x-2">
        {solutions.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-2 h-2 rounded-full transition-colors duration-200 ${
              index === currentSlide ? "bg-[#271D1D]" : "bg-[#271D1D]/30"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

const FeatureCard = ({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) => (
  <div className="flex flex-col items-center text-center p-6 lg:p-8 transition-colors duration-300 hover:bg-[#D6CECE] group">
    <div className="mb-4">{icon}</div>
    <h3 className="text-base font-medium text-[#271D1D] font-lora mb-3 leading-[30px] tracking-[0.16px] self-stretch">
      {title}
    </h3>
    <p className="text-xs font-normal text-[#271D1D] leading-[21.6px] tracking-[0.12px] font-roboto self-stretch">
      {description}
    </p>
  </div>
);

const StepItem = ({
  number,
  title,
  description,
  isActive = false,
}: {
  number: string;
  title: string;
  description: string;
  isActive?: boolean;
}) => (
  <div className="relative">
    {/* Progress bar */}
    <div className="absolute top-0 left-0 w-full h-px bg-[#D6CECE] rounded-full">
      {isActive && (
        <div
          className="h-full bg-[#271D1D] rounded-full"
          style={{ width: "100%" }}
        />
      )}
    </div>

    {/* Step content */}
    <div className="pt-8 pb-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-2xl font-medium text-black font-lora">{title}</h3>
        <span className="text-2xl font-medium text-black font-lora">
          {number}
        </span>
      </div>
      <p className="text-sm text-black leading-relaxed max-w-md">
        {description}
      </p>
    </div>
  </div>
);

const FAQItem = ({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-[#725A5A]/15 bg-[#725A5A]/3 rounded-lg">
      <button
        className="w-full flex justify-between items-center p-6 text-left"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-xl lg:text-2xl font-semibold text-[#725A5A]">
          {question}
        </span>
        <ChevronDown
          className={`w-6 h-6 text-[#725A5A] transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <div className="px-6 pb-6">
          <p className="text-xl lg:text-2xl text-[#725A5A] leading-relaxed">
            {answer}
          </p>
        </div>
      )}
    </div>
  );
};

const AnimatedStepsComponent = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);

  const steps = [
    {
      number: "01",
      title: "Create or log into your account",
      description:
        "Create or log into your existing Maigon account in order to experience the power that comes with Maigon.",
      image:
        "https://api.builder.io/api/v1/image/assets/TEMP/ab810becba68b895d17259b055eb02fa4e423ca7?width=1376",
    },
    {
      number: "02",
      title: "Choose your weapon",
      description:
        "Select your desired solution based on your contract's type.",
      image:
        "https://api.builder.io/api/v1/image/assets/TEMP/2a3aa41e3700ecfe17563a788c06e994ecf557f2?width=1376",
    },
    {
      number: "03",
      title: "Select your perspective",
      description:
        'Select between "Data Processer" and "Organization" in order to obtain tailored review results of your contracts.',
      image:
        "https://api.builder.io/api/v1/image/assets/TEMP/5618bd7501c5a1c4b2d28e4e25a6db6f8660e172?width=1376",
    },
    {
      number: "04",
      title: "Upload your contract",
      description: "Upload your contract to let the magic happens.",
      image:
        "https://api.builder.io/api/v1/image/assets/TEMP/15cc33264f77c3058e8f3b3572a0dc0618db8461?width=1376",
    },
    {
      number: "05",
      title: "Sit back and relax",
      description: "Sit back and relax! This will only take a moment.",
      image:
        "https://api.builder.io/api/v1/image/assets/TEMP/b2ac06bf0d475ae09b33f0c014469cf778bf87a8?width=1376",
    },
    {
      number: "06",
      title: "Voilà!",
      description: "Get your review and enjoy all the insights.",
      image:
        "https://api.builder.io/api/v1/image/assets/TEMP/b9df8a89a44e419b87b2f12be6bcc732bd80a24c?width=1376",
    },
  ];

  useEffect(() => {
    let stepTimeout: NodeJS.Timeout;
    let progressInterval: NodeJS.Timeout;

    const resetAnimation = () => {
      setLoadingProgress(0);

      // Clear any existing intervals
      if (progressInterval) clearInterval(progressInterval);

      // Start progress animation - 100% over exactly 10 seconds
      const startTime = Date.now();
      progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min((elapsed / 10000) * 100, 100);
        setLoadingProgress(progress);

        // Clear interval when we reach 100%
        if (progress >= 100) {
          clearInterval(progressInterval);
        }
      }, 50); // Update every 50ms for smoother animation

      // Schedule next step change
      stepTimeout = setTimeout(() => {
        setCurrentStep((prev) => (prev + 1) % steps.length);
        resetAnimation();
      }, 10000);
    };

    // Start the first animation
    resetAnimation();

    return () => {
      if (stepTimeout) clearTimeout(stepTimeout);
      if (progressInterval) clearInterval(progressInterval);
    };
  }, [steps.length]);

  return (
    <div className="flex flex-col gap-1 md:gap-2.5 w-full p-1 md:p-2.5 overflow-hidden">
      <div className="h-[400px] md:h-[500px] lg:h-[660px] w-full relative max-w-[1210px] mx-auto">
        {/* Steps Section */}
        <div className="flex flex-col justify-end items-start gap-px absolute left-0 top-1 h-[385px] md:h-[485px] lg:h-[641px] w-full lg:w-[458px]">
          {steps.map((step, index) => (
            <div key={index} className="flex flex-col w-full lg:w-[458px]">
              {/* Loading Bar - only show on active step */}
              {index === currentStep && (
                <div className="flex w-full h-px justify-center items-center mb-px">
                  <div className="w-full h-px relative">
                    <div className="w-full h-px rounded-lg bg-[#D6CECE] absolute left-0 top-0"></div>
                    <div
                      className="h-px rounded-lg bg-[#271D1D] absolute left-0 top-0 transition-all duration-100 ease-linear"
                      style={{ width: `${loadingProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Step Content */}
              <div
                className={`w-full transition-all duration-500 ${
                  index === currentStep
                    ? "h-[120px] md:h-[150px] lg:h-[175px]"
                    : "h-[60px] md:h-[75px] lg:h-[93px]"
                }`}
              >
                {/* Divider line for non-active steps */}
                {index !== currentStep && (
                  <div className="w-full h-px rounded-lg bg-[#D9D9D9] mb-px"></div>
                )}

                <div className="w-full h-[120px] md:h-[150px] lg:h-[175px] relative">
                  <div className="flex w-full lg:w-[354px] h-5 flex-col justify-center text-black font-lora text-sm md:text-lg lg:text-2xl font-medium leading-[60px] md:leading-[75px] lg:leading-[90px] absolute left-2 md:left-3 lg:left-4 top-6 md:top-7 lg:top-9">
                    {step.title}
                  </div>
                  <div className="flex w-5 md:w-6 lg:w-7 h-5 flex-col justify-center text-black font-lora text-sm md:text-lg lg:text-2xl font-medium leading-[50px] md:leading-[60px] lg:leading-[70px] absolute right-2 md:right-3 lg:right-9 top-6 md:top-7 lg:top-9">
                    {step.number}
                  </div>
                  {index === currentStep && (
                    <div className="w-full lg:w-[370px] h-[40px] md:h-[45px] lg:h-[52px] text-black font-roboto text-xs font-normal leading-[20px] md:leading-[24px] lg:leading-[26px] absolute left-2 md:left-3 lg:left-4 top-[70px] md:top-[80px] lg:top-[92px]">
                      {step.description}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Image Section */}
        <img
          src={steps[currentStep].image}
          alt={`Step ${steps[currentStep].number} demonstration`}
          className="hidden lg:block w-[688px] h-[660px] rounded-lg border border-[#271D1D]/15 absolute right-0 left-[522px] top-0 object-cover"
        />
      </div>
    </div>
  );
};

export default function Solutions() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[#F9F8F8]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 lg:px-16 py-6 bg-[#F9F8F8]">
        <Link to="/">
          <Logo size="xl" />
        </Link>

        <div className="hidden md:flex items-center space-x-8">
          <Link
            to="/solutions"
            className={`transition-colors ${
              location.pathname === "/solutions"
                ? "text-[#9A7C7C] font-medium"
                : "text-[#271D1D] hover:text-[#9A7C7C]"
            }`}
          >
            Solutions
          </Link>
          <Link
            to="/pricing"
            className={`transition-colors ${
              location.pathname === "/pricing"
                ? "text-[#9A7C7C] font-medium"
                : "text-[#271D1D] hover:text-[#9A7C7C]"
            }`}
          >
            Pricing
          </Link>
          <Link
            to="/news"
            className={`transition-colors ${
              location.pathname === "/news"
                ? "text-[#9A7C7C] font-medium"
                : "text-[#271D1D] hover:text-[#9A7C7C]"
            }`}
          >
            News
          </Link>
          <Link
            to="/team"
            className={`transition-colors ${
              location.pathname === "/team"
                ? "text-[#9A7C7C] font-medium"
                : "text-[#271D1D] hover:text-[#9A7C7C]"
            }`}
          >
            Team
          </Link>
          <Button
            asChild
            className="bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white px-8 rounded-lg"
          >
            <Link to="/signin">Sign In/Up</Link>
          </Button>
        </div>

        {/* Mobile Navigation */}
        <MobileNavigation isLoggedIn={false} />
      </nav>

      {/* Hero Section */}
      <section className="flex flex-col lg:flex-row justify-center items-center gap-8 lg:gap-44 px-8 lg:px-16 py-12 lg:py-20 max-w-7xl mx-auto pt-24 lg:pt-32">
        <div className="flex flex-col items-start gap-6 lg:gap-20 w-full lg:w-[461px] mb-8 lg:mb-0">
          <div className="flex flex-col items-start gap-8 lg:gap-28 w-full">
            <div className="flex justify-center items-center gap-2.5 w-full">
              <h1 className="w-full text-[#171614] font-lora text-3xl lg:text-5xl font-medium leading-tight lg:leading-[72px]">
                Ready to experience the future of contract review?
              </h1>
            </div>
            <div className="flex justify-center items-center gap-2.5 w-full">
              <p className="w-full text-[#171614] font-roboto text-sm lg:text-base font-normal leading-relaxed lg:leading-[30px] tracking-[0.16px]">
                Our solutions include contract type-specific AI review modules.
                All of our products integrate the latest deep learning
                technology to ensure maximum accuracy and efficiency. We are
                regularly adding support of new contract types based on customer
                demand.
              </p>
            </div>
          </div>
          <Button
            asChild
            className="flex py-3 px-10 justify-center items-center gap-2.5 rounded-xl bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-[#F9F8F8] text-center font-roboto text-lg lg:text-xl font-normal leading-6 tracking-[0.2px]"
          >
            <Link to="/signin">Try for free</Link>
          </Button>
        </div>

        <div className="w-full lg:w-auto lg:min-w-[623px] lg:h-[831px]">
          <AnimatedSolutionsMockup />
        </div>
      </section>

      {/* Content Section with Steps */}
      <section className="py-20 max-w-7xl mx-auto px-8 lg:px-16">
        {/* Header */}
        <div className="flex justify-center items-center gap-2.5 mb-20">
          <h2 className="w-full lg:w-[597px] text-[#271D1D] text-center font-lora text-3xl lg:text-5xl font-medium leading-tight lg:leading-[90px]">
            Let's take your reviewing process to the next level
          </h2>
        </div>

        {/* Animated Steps */}
        <div className="flex flex-col gap-2.5 w-full">
          <AnimatedStepsComponent />
        </div>
      </section>

      {/* Solutions Grid Section */}
      <section className="py-20 max-w-7xl mx-auto px-8 lg:px-16">
        <div className="flex items-center gap-1">
          {/* Solutions Cards Container */}
          <div className="flex w-full lg:w-[801px] flex-col items-start gap-7">
            {/* Solutions Header */}
            <div className="flex justify-center items-center gap-2.5">
              <h3 className="text-black text-center font-lora text-base font-medium leading-[18px] tracking-[0.16px]">
                Solutions
              </h3>
            </div>

            {/* Desktop Grid */}
            <div className="grid w-full lg:w-[801px] h-auto lg:h-[1368px] py-5 lg:py-[21px] gap-y-px gap-x-1 grid-rows-3 grid-cols-1 lg:grid-cols-3 relative">
              {/* NDA Card */}
              <Link
                to="/signin"
                className="w-full lg:w-[265px] h-[439px] flex pt-[15px] flex-col justify-end items-center bg-[#F3F3F3] relative lg:col-start-1 lg:row-start-1 cursor-pointer hover:bg-[#ECECEC] transition-colors duration-200"
              >
                <div className="w-[265px] h-[424px] absolute left-0 top-[15px]">
                  <img
                    src="https://api.builder.io/api/v1/image/assets/TEMP/bf723346ff37e3006a994d9bde29f03ca52957bd?width=456"
                    alt=""
                    className="w-[228px] h-[228px] flex-shrink-0 rounded-lg absolute left-[19px] top-0"
                  />
                  <div className="flex w-[157px] h-[27px] flex-col justify-center flex-shrink-0 text-[#271D1D] font-lora text-xl font-medium leading-[22px] absolute left-[30px] top-[246px]">
                    Non-Disclosure Agreements
                  </div>
                  <div className="flex w-[217px] h-[89px] flex-col justify-center flex-shrink-0 text-[#271D1D] font-roboto text-xs font-normal leading-[18px] tracking-[0.12px] absolute left-[30px] top-[291px]">
                    Review non-disclosure agreements for compliance with
                    established standards and best practices. Get instant report
                    with compliance insights and extracted clauses.
                  </div>
                </div>
              </Link>

              {/* DPA Card */}
              <Link
                to="/signin"
                className="flex pt-[15px] flex-col justify-end items-center flex-1 self-stretch bg-[#F3F3F3] relative lg:col-start-2 lg:row-start-1 cursor-pointer hover:bg-[#ECECEC] transition-colors duration-200"
              >
                <div className="w-[265px] h-[424px] absolute left-0 top-[15px]">
                  <img
                    src="https://api.builder.io/api/v1/image/assets/TEMP/d2502c8f65fc6fb3cfd64fcf2e883767c28d87b3?width=456"
                    alt=""
                    className="w-[228px] h-[228px] flex-shrink-0 rounded-lg absolute left-[19px] top-0"
                  />
                  <div className="flex w-[157px] h-[27px] flex-col justify-center flex-shrink-0 text-[#271D1D] font-lora text-xl font-medium leading-[22px] absolute left-[30px] top-[246px]">
                    Data Processing Agreements
                  </div>
                  <div className="flex w-[217px] h-[118px] flex-col justify-center flex-shrink-0 text-[#271D1D] font-roboto text-xs font-normal leading-[17px] tracking-[0.12px] absolute left-[30px] top-[293px]">
                    Review data processing agreements for compliance with the
                    GDPR and latest EDPB guidelines. Get instant compliance
                    report with extracted clauses, concepts, terms, highlighted
                    risks, and compliance recommendations.
                  </div>
                </div>
              </Link>

              {/* Privacy Policy Card */}
              <Link
                to="/signin"
                className="flex pt-[15px] flex-col justify-end items-center flex-1 self-stretch bg-[#F3F3F3] relative lg:col-start-3 lg:row-start-1 cursor-pointer hover:bg-[#ECECEC] transition-colors duration-200"
              >
                <div className="w-[265px] h-[424px] absolute left-0 top-[15px]">
                  <img
                    src="https://api.builder.io/api/v1/image/assets/TEMP/ac64a1c280fd3ae21e76e02f5df24162a5b11a53?width=456"
                    alt=""
                    className="w-[228px] h-[228px] flex-shrink-0 rounded-lg absolute left-[19px] top-0"
                  />
                  <div className="flex w-[157px] h-[27px] flex-col justify-center flex-shrink-0 text-[#271D1D] font-lora text-xl font-medium leading-[22px] absolute left-[30px] top-[246px]">
                    Privacy Policy Documents
                  </div>
                  <div className="flex w-[217px] h-[90px] flex-col justify-center flex-shrink-0 text-[#271D1D] font-roboto text-xs font-normal leading-[18px] tracking-[0.12px] absolute left-[30px] top-[291px]">
                    Review privacy statements for compliance with the GDPR
                    criteria. Get instant compliance report with extracted
                    clauses and recommendations.
                  </div>
                </div>
              </Link>

              {/* Consultancy Card */}
              <Link
                to="/signin"
                className="flex pt-[15px] flex-col justify-end items-center flex-1 self-stretch bg-[#F3F3F3] relative lg:col-start-1 lg:row-start-2 cursor-pointer hover:bg-[#ECECEC] transition-colors duration-200"
              >
                <div className="w-[265px] h-[424px] absolute left-0 top-[15px]">
                  <img
                    src="https://api.builder.io/api/v1/image/assets/TEMP/ace056ab1571ec964a3c7a17e383b264d6766921?width=456"
                    alt=""
                    className="w-[228px] h-[228px] flex-shrink-0 rounded-lg absolute left-[19px] top-0"
                  />
                  <div className="flex w-[157px] h-[27px] flex-col justify-center flex-shrink-0 text-[#271D1D] font-lora text-xl font-medium leading-[22px] absolute left-[30px] top-[246px]">
                    Consultancy Agreements
                  </div>
                  <div className="flex w-[217px] h-[108px] flex-col justify-center flex-shrink-0 text-[#271D1D] font-roboto text-xs font-normal leading-[18px] tracking-[0.12px] absolute left-[30px] top-[291px]">
                    Review consultancy agreements (and other professional
                    services agreements) for compliance with established
                    standards and best practices. Get instant report with
                    insights and extracted clauses.
                  </div>
                </div>
              </Link>

              {/* R&D Card */}
              <Link
                to="/signin"
                className="flex pt-[15px] flex-col justify-end items-center flex-1 self-stretch bg-[#F3F3F3] relative lg:col-start-2 lg:row-start-2 cursor-pointer hover:bg-[#ECECEC] transition-colors duration-200"
              >
                <div className="w-[265px] h-[424px] absolute left-0 top-[15px]">
                  <img
                    src="https://api.builder.io/api/v1/image/assets/TEMP/55ab6d6eecccdbe325f9af592bd502bb13e77ea6?width=456"
                    alt=""
                    className="w-[228px] h-[228px] flex-shrink-0 rounded-lg absolute left-[19px] top-0"
                  />
                  <div className="flex w-[157px] h-[27px] flex-col justify-center flex-shrink-0 text-[#271D1D] font-lora text-xl font-medium leading-[22px] absolute left-[30px] top-[246px]">
                    R&D Agreements
                  </div>
                  <div className="flex w-[217px] h-[90px] flex-col justify-center flex-shrink-0 text-[#271D1D] font-roboto text-xs font-normal leading-[18px] tracking-[0.12px] absolute left-[30px] top-[291px]">
                    Conduct compliance review of R&D agreements to ensure
                    adherence to industry standards. Obtain a report on
                    potential compliance risks and recommendations for risk
                    mitigation.
                  </div>
                </div>
              </Link>

              {/* EULA Card */}
              <Link
                to="/signin"
                className="flex pt-[15px] flex-col justify-end items-center flex-1 self-stretch bg-[#F3F3F3] relative lg:col-start-3 lg:row-start-2 cursor-pointer hover:bg-[#ECECEC] transition-colors duration-200"
              >
                <div className="w-[265px] h-[424px] absolute left-0 top-[15px]">
                  <img
                    src="https://api.builder.io/api/v1/image/assets/TEMP/028255c210716e79f6cc8592e835ed9bcd809aa3?width=456"
                    alt=""
                    className="w-[228px] h-[228px] flex-shrink-0 rounded-lg absolute left-[19px] top-0"
                  />
                  <div className="flex w-[174px] h-[27px] flex-col justify-center flex-shrink-0 text-[#271D1D] font-lora text-xl font-medium leading-[22px] absolute left-[30px] top-[246px]">
                    End User License Agreements
                  </div>
                  <div className="flex w-[217px] h-[108px] flex-col justify-center flex-shrink-0 text-[#271D1D] font-roboto text-xs font-normal leading-[18px] tracking-[0.12px] absolute left-[27px] top-[291px]">
                    Review end user license agreements for compliance with
                    established standards and best practices. Get instant report
                    with insights and extracted clauses. Used most often for
                    reviewing software license agreements
                  </div>
                </div>
              </Link>

              {/* PSA Card */}
              <Link
                to="/signin"
                className="flex pt-[15px] flex-col justify-end items-center flex-1 self-stretch bg-[#F3F3F3] relative lg:col-start-2 lg:row-start-3 cursor-pointer hover:bg-[#ECECEC] transition-colors duration-200"
              >
                <div className="w-[265px] h-[424px] absolute left-0 top-[15px]">
                  <img
                    src="https://api.builder.io/api/v1/image/assets/TEMP/79eb9ad36f91db898294f4ebc9584deb77f82e31?width=456"
                    alt=""
                    className="w-[228px] h-[228px] flex-shrink-0 rounded-lg absolute left-[19px] top-0"
                  />
                  <div className="flex w-[157px] h-[27px] flex-col justify-center flex-shrink-0 text-[#271D1D] font-lora text-xl font-medium leading-[22px] absolute left-[30px] top-[246px]">
                    Product Supply Agreements
                  </div>
                  <div className="flex w-[217px] h-[72px] flex-col justify-center flex-shrink-0 text-[#271D1D] font-roboto text-xs font-normal leading-[18px] tracking-[0.12px] absolute left-[30px] top-[291px]">
                    Review product supply agreements for compliance with
                    established standards and best practices. Get instant report
                    with insights and extracted clauses.
                  </div>
                </div>
              </Link>
            </div>

            {/* Mobile/Tablet Carousel */}
            <div className="block lg:hidden max-w-md mx-auto">
              <SolutionsCarousel />
            </div>
          </div>

          {/* Solutions Content - Sticky */}
          <div className="hidden lg:flex flex-col items-start justify-start pb-[560px] relative">
            <div className="sticky top-[380px] flex h-[688px] p-2.5 justify-center items-end gap-2.5 absolute left-[-2px] top-0 w-[410px]">
              <div className="w-[411px] text-[#271D1D] text-center font-lora text-base font-medium leading-[30px] relative">
                <span className="text-3xl font-medium leading-[60px] block mb-4">
                  Revolutionizing contract review in the age of AI
                </span>
                <span className="text-xs font-extralight leading-[30px] block">
                  Choose the solution of your desire to start reviewing your
                  contracts with the power of Maigon.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 max-w-7xl mx-auto px-8 lg:px-16">
        <div className="mb-12">
          <h3 className="text-lg font-medium text-black font-lora">Features</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <FeatureCard
            icon={
              <svg
                width="97"
                height="96"
                viewBox="0 0 97 96"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-24 h-24"
              >
                <g clipPath="url(#clip0_629_2588)">
                  <path
                    d="M0 30C0 31.6567 1.35724 33 3.03125 33H12.125V27H3.03125C1.35724 27 0 28.35 0 30ZM0 48C0 49.6567 1.35724 51 3.03125 51H12.125V45H3.03125C1.35724 45 0 46.35 0 48ZM33.3438 3C33.3438 1.34325 31.9797 0 30.3125 0C28.6453 0 27.2812 1.34325 27.2812 3V12H33.3438V3ZM0 66C0 67.6568 1.35724 69 3.03125 69H12.125V63H3.03125C1.35724 63 0 64.35 0 66ZM51.5312 3C51.5312 1.34325 50.1672 0 48.5 0C46.8328 0 45.4688 1.34325 45.4688 3V12H51.5312V3ZM97 30C97 28.3433 95.6431 27 93.9688 27H84.875V33H93.9688C95.6359 33 97 31.65 97 30ZM93.9688 63H84.875V69H93.9688C95.6431 69 97 67.6568 97 66C97 64.3432 95.6359 63 93.9688 63ZM66.6875 0C65.0135 0 63.6562 1.34325 63.6562 3V12H69.7188V3C69.7188 1.34325 68.3547 0 66.6875 0ZM93.9688 45H84.875V51H93.9688C95.6359 51 97 49.65 97 48C97 46.35 95.6359 45 93.9688 45ZM27.2812 93C27.2812 94.65 28.6453 96 30.3125 96C31.9869 96 33.3438 94.6568 33.3438 93V84H27.2812V93ZM63.6562 93C63.6562 94.6568 65.0135 96 66.6875 96C68.3619 96 69.7188 94.6568 69.7188 93V84H63.6562V93ZM45.4688 93C45.4688 94.6568 46.826 96 48.5 96C50.1744 96 51.5312 94.6568 51.5312 93V84H45.4688V93ZM30.3125 66H66.6875V30H30.3125V66Z"
                    fill="#271D1D"
                  />
                  <path
                    d="M72.75 12H24.25C17.5528 12 12.125 17.3737 12.125 24V72C12.125 78.6263 17.5528 84 24.25 84H72.75C79.4472 84 84.875 78.6263 84.875 72V24C84.875 17.3737 79.4377 12 72.75 12ZM72.75 69C72.75 70.6567 71.3931 72 69.7188 72H27.2812C25.6141 72 24.25 70.65 24.25 69V27C24.25 25.35 25.6141 24 27.2812 24H69.7188C71.3859 24 72.75 25.35 72.75 27V69Z"
                    fill="#B6A5A5"
                  />
                </g>
                <defs>
                  <clipPath id="clip0_629_2588">
                    <rect width="97" height="96" fill="white" />
                  </clipPath>
                </defs>
              </svg>
            }
            title="State-of-the-art"
            description="We make use of the latest research, deep learning and NLP technology available."
          />

          <FeatureCard
            icon={
              <svg
                width="98"
                height="96"
                viewBox="0 0 98 96"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-24 h-24"
              >
                <g clipPath="url(#clip0_629_5344)">
                  <path
                    d="M91.4375 54H6.5625C3.22434 54 0.5 56.6963 0.5 60V84C0.5 87.3037 3.22434 90 6.5625 90H91.4375C94.7757 90 97.5 87.3037 97.5 84V60C97.5 56.7 94.7719 54 91.4375 54ZM67.1875 76.5C64.6772 76.5 62.6406 74.4844 62.6406 72C62.6406 69.5156 64.6772 67.5 67.1875 67.5C69.6978 67.5 71.7344 69.5156 71.7344 72C71.7344 74.4844 69.7072 76.5 67.1875 76.5ZM79.3125 76.5C76.8022 76.5 74.7656 74.4844 74.7656 72C74.7656 69.5156 76.8022 67.5 79.3125 67.5C81.8228 67.5 83.8594 69.5156 83.8594 72C83.8594 74.4844 81.8322 76.5 79.3125 76.5ZM79.3125 28.5C81.8228 28.5 83.8594 26.4844 83.8594 24C83.8594 21.5156 81.8322 19.5 79.3125 19.5C76.7928 19.5 74.7656 21.525 74.7656 24C74.7656 26.475 76.8117 28.5 79.3125 28.5Z"
                    fill="#271D1D"
                  />
                  <path
                    d="M91.4375 6H6.5625C3.22434 6 0.5 8.69625 0.5 12V36C0.5 39.3037 3.22434 42 6.5625 42H91.4375C94.7757 42 97.5 39.3037 97.5 36V12C97.5 8.69625 94.7719 6 91.4375 6ZM67.1875 28.5C64.6772 28.5 62.6406 26.4844 62.6406 24C62.6406 21.5156 64.6867 19.5 67.1875 19.5C69.6883 19.5 71.7344 21.525 71.7344 24C71.7344 26.475 69.7072 28.5 67.1875 28.5ZM79.3125 28.5C76.8022 28.5 74.7656 26.4844 74.7656 24C74.7656 21.5156 76.8117 19.5 79.3125 19.5C81.8133 19.5 83.8594 21.525 83.8594 24C83.8594 26.475 81.8322 28.5 79.3125 28.5ZM79.3125 67.5C76.8022 67.5 74.7656 69.5156 74.7656 72C74.7656 74.4844 76.8022 76.5 79.3125 76.5C81.8246 76.5 83.8594 74.4844 83.8594 72C83.8594 69.5156 81.8322 67.5 79.3125 67.5Z"
                    fill="#B6A5A5"
                  />
                </g>
                <defs>
                  <clipPath id="clip0_629_5344">
                    <rect
                      width="97"
                      height="96"
                      fill="white"
                      transform="translate(0.5)"
                    />
                  </clipPath>
                </defs>
              </svg>
            }
            title="On-premise availability"
            description="On-premise option is available to meet the strictest security standards."
          />

          <FeatureCard
            icon={
              <svg
                width="97"
                height="96"
                viewBox="0 0 97 96"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-24 h-24"
              >
                <path
                  d="M87.6031 61.8375C82.109 78.6937 66.3844 90 48.3295 90C34.9731 90 22.7154 83.5312 15.1563 73.1062V87C15.1563 90.3169 12.4414 93 9.09375 93C5.74611 93 3.03125 90.3169 3.03125 87V60C3.03125 56.6831 5.74611 54 9.09375 54H33.3438C36.6914 54 39.4063 56.6831 39.4063 60C39.4063 63.3169 36.6914 66 33.3438 66H24.932C30.2557 73.4062 38.9326 78 48.5 78C61.1138 78 72.2006 70.0256 76.0654 58.1625C77.0927 55.0163 80.4949 53.2819 83.7004 54.3019C86.8832 55.1437 88.6451 58.6875 87.6031 61.8375Z"
                  fill="#271D1D"
                />
                <path
                  d="M93.969 9V36C93.969 39.3169 91.2541 42 87.9065 42H63.6565C60.3088 42 57.594 39.3169 57.594 36C57.594 32.6831 60.3088 30 63.6565 30H72.0644C66.7445 22.5938 58.0676 18 48.5002 18C35.8826 18 24.7996 25.9688 20.9348 37.8375C19.9117 40.9875 16.4978 42.7312 13.2979 41.7C10.1132 40.6864 8.36267 37.2994 9.3933 34.1475C14.8893 17.3137 30.5969 6 48.5002 6C62.0196 6 74.2848 12.4725 81.844 22.8919V9C81.844 5.68313 84.5588 3 87.9065 3C91.2541 3 93.969 5.68313 93.969 9Z"
                  fill="#B6A5A5"
                />
              </svg>
            }
            title="Always up-to-date"
            description="Our solutions are always aligned with the latest legislative changes."
          />

          <FeatureCard
            icon={
              <svg
                width="121"
                height="96"
                viewBox="0 0 121 96"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-30 h-24"
              >
                <path
                  d="M30.25 43.725L33.8422 51.75H26.4877L30.25 43.725ZM0 24C0 17.3719 5.41664 12 12.1 12H60.5V84H12.1C5.41664 84 0 78.6188 0 72V24ZM26.7902 32.9812L14.6939 59.9812C13.8469 61.7062 14.7053 64.0875 16.6148 64.9312C18.5225 65.775 20.7591 64.9125 21.6098 63.0188L23.2925 59.0813H37.2075L38.8902 63.0188C39.7409 64.9125 41.9719 65.775 43.8814 64.9312C45.7909 64.0875 46.6606 61.7062 45.8098 59.9812L33.7098 32.9812C33.1048 31.6312 31.7436 30.75 30.25 30.75C28.7564 30.75 27.3952 31.6312 26.7902 32.9812Z"
                  fill="#271D1D"
                />
                <path
                  d="M121 72C121 78.6188 115.573 84 108.9 84H60.4996V12H108.9C115.573 12 121 17.3719 121 24V72ZM94.5308 34.5C94.5308 32.2687 92.8293 30.75 90.7496 30.75C88.4997 30.75 86.9683 32.2687 86.9683 34.5V35.25H77.1371C74.8872 35.25 73.3558 36.7687 73.3558 39C73.3558 41.0625 74.8872 42.75 77.1371 42.75H97.3857C96.0055 45.8812 94.096 48.7313 91.7516 51.0188L91.6382 51.075L88.8779 48.3562C87.4032 46.875 85.021 46.875 83.5463 48.3562C82.0527 49.8187 82.0527 52.1813 83.5463 53.6438L85.8339 55.9312C84.7185 56.4562 83.5463 57.225 82.3363 57.7688L81.6557 58.0688C79.7461 58.9125 78.8764 61.125 79.7272 63.0188C80.578 64.9125 82.8089 65.775 84.7185 64.9312L85.418 64.6313C87.6868 63.6188 89.8421 62.4 91.8272 60.9937C92.47 61.5562 93.4721 62.0812 94.3039 62.5875L97.8772 64.7063C99.6733 65.775 101.999 65.2125 103.076 63.4312C104.135 61.65 103.568 59.3437 101.772 58.2937L98.1986 56.1562C98.0285 55.8937 97.8583 55.95 97.6882 55.8562C100.94 52.3312 103.511 48.0187 105.194 43.5938L105.496 42.75H105.875C107.954 42.75 109.656 41.0625 109.656 39C109.656 36.7687 107.954 35.25 105.875 35.25H94.5308V34.5ZM30.2496 30.75C31.7432 30.75 33.1044 31.6312 33.7094 32.9812L45.8094 59.9812C46.6602 61.7062 45.7905 64.0875 43.881 64.9312C41.9714 65.775 39.7405 64.9125 38.8897 63.0188L37.2071 59.0813H23.2921L21.6094 63.0188C20.7586 64.9125 18.522 65.775 16.6144 64.9312C14.7049 64.0875 13.8465 61.7062 14.6935 59.9812L26.7897 32.9812C27.3947 31.6312 28.756 30.75 30.2496 30.75ZM26.4872 51.75H33.8418L30.2496 43.725L26.4872 51.75Z"
                  fill="#B6A5A5"
                />
              </svg>
            }
            title="In your language"
            description="Our solutions support more than 50 languages. Bilingual contracts are also supported."
          />

          <FeatureCard
            icon={
              <svg
                width="86"
                height="96"
                viewBox="0 0 86 96"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-21 h-24"
              >
                <g clipPath="url(#clip0_629_3122)">
                  <path
                    d="M12.6406 78C12.6406 74.6812 15.3538 72 18.7121 72H79.4263V84H18.7121C15.3538 84 12.6406 81.3188 12.6406 78Z"
                    fill="#B6A5A5"
                  />
                  <path
                    d="M0.5 18C0.5 8.0625 8.65848 0 18.7143 0H73.3571H79.4286C82.7868 0 85.5 2.68125 85.5 6V66C85.5 69.3187 82.7868 72 79.4286 72H67.2857H49.0714H18.7143C15.356 72 12.6429 74.6813 12.6429 78C12.6429 81.3187 15.356 84 18.7143 84H49.0714H67.2857H79.4286C82.7868 84 85.5 86.6813 85.5 90C85.5 93.3187 82.7868 96 79.4286 96H73.3571H18.7143C8.65848 96 0.5 87.9375 0.5 78V18ZM50.5893 37.5L43.2277 40.6125C41.9944 41.1375 41.9944 42.8438 43.2277 43.3688L50.5893 46.5L53.7388 53.775C54.2701 54.9937 55.9967 54.9937 56.5279 53.775L59.6964 46.5L67.058 43.3875C68.2913 42.8625 68.2913 41.1562 67.058 40.6312L59.6964 37.5L56.5469 30.225C56.0156 29.0062 54.2891 29.0062 53.7578 30.225L50.5893 37.5ZM32.5268 14.6813L30.8571 18L27.4989 19.65C26.3795 20.1938 26.3795 21.7875 27.4989 22.3312L30.8571 24L32.5268 27.3187C33.077 28.425 34.6897 28.425 35.24 27.3187L36.9286 24L40.2868 22.35C41.4062 21.8062 41.4062 20.2125 40.2868 19.6688L36.9286 18L35.2589 14.6813C34.7087 13.575 33.096 13.575 32.5458 14.6813H32.5268Z"
                    fill="#271D1D"
                  />
                </g>
                <defs>
                  <clipPath id="clip0_629_3122">
                    <rect
                      width="85"
                      height="96"
                      fill="white"
                      transform="translate(0.5)"
                    />
                  </clipPath>
                </defs>
              </svg>
            }
            title="Custom playbook"
            description="We help you add your own rules into our standard solutions to address your organization's review guidelines and practices."
          />

          <FeatureCard
            icon={
              <svg
                width="86"
                height="96"
                viewBox="0 0 86 96"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-21 h-24"
              >
                <g clipPath="url(#clip0_629_9)">
                  <path
                    d="M85.5 15V24C85.5 32.2875 66.4699 39 43 39C19.5301 39 0.5 32.2875 0.5 24V15C0.5 6.71625 19.5301 0 43 0C66.4699 0 85.5 6.71625 85.5 15ZM75.1027 40.2562C78.8784 38.8687 82.673 37.0875 85.5 34.8938V54C85.5 62.2875 66.4699 69 43 69C19.5301 69 0.5 62.2875 0.5 54V34.8938C3.3327 37.0875 6.95469 38.8687 10.9068 40.2562C19.4087 43.2562 30.7623 45 43 45C55.2377 45 66.5837 43.2562 75.1027 40.2562ZM10.9068 70.2563C19.4087 73.2563 30.7623 75 43 75C55.2377 75 66.5837 73.2563 75.1027 70.2563C78.8784 68.8688 82.673 67.0875 85.5 64.8938V81C85.5 89.2875 66.4699 96 43 96C19.5301 96 0.5 89.2875 0.5 81V64.8938C3.3327 67.0875 6.95469 68.8688 10.9068 70.2563Z"
                    fill="#271D1D"
                  />
                  <path
                    d="M0.5 34.8938V24C0.5 32.2875 19.5301 39 43 39C66.4699 39 85.5 32.2875 85.5 24V34.8938C82.673 37.0875 78.8784 38.8687 75.1027 40.2562C66.5837 43.2562 55.2377 45 43 45C30.7623 45 19.4087 43.2562 10.9068 40.2562C6.95469 38.8687 3.3327 37.0875 0.5 34.8938ZM0.5 64.8938V54C0.5 62.2875 19.5301 69 43 69C66.4699 69 85.5 62.2875 85.5 54V64.8938C82.673 67.0875 78.8784 68.8688 75.1027 70.2563C66.5837 73.2563 55.2377 75 43 75C30.7623 75 19.4087 73.2563 10.9068 70.2563C6.95469 68.8688 3.3327 67.0875 0.5 64.8938Z"
                    fill="#B6A5A5"
                  />
                </g>
                <defs>
                  <clipPath id="clip0_629_9">
                    <rect
                      width="85"
                      height="96"
                      fill="white"
                      transform="translate(0.5)"
                    />
                  </clipPath>
                </defs>
              </svg>
            }
            title="Our own data"
            description="We do not require our clients to supply any data to train our AI. Instead, we manually collect and label the datasets ourselves."
          />

          <FeatureCard
            icon={
              <svg
                width="98"
                height="96"
                viewBox="0 0 98 96"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-24 h-24"
              >
                <g clipPath="url(#clip0_629_6368)">
                  <path
                    d="M49 0C75.7887 0 97.5 21.4875 97.5 48C97.5 74.5125 75.7887 96 49 96C22.2113 96 0.5 74.5125 0.5 48C0.5 21.4875 22.2113 0 49 0ZM42.9375 18C42.9375 21.3188 45.6467 24 49 24C52.3533 24 55.0625 21.3188 55.0625 18C55.0625 14.6869 52.3533 12 49 12C45.6467 12 42.9375 14.6869 42.9375 18ZM61.125 66C61.125 65.3063 61.0682 64.6313 60.9545 63.975L83.2152 50.325C85.3561 49.0125 86.0191 46.2375 84.693 44.1375C83.3668 42.0187 80.5629 41.3625 78.441 42.675L56.1613 56.325C54.1531 54.8625 51.6713 54 49 54C42.3123 54 36.875 59.3812 36.875 66C36.875 72.6188 42.3123 78 49 78C55.6877 78 61.125 72.6188 61.125 66ZM64.1562 27C64.1562 30.3188 66.8654 33 70.2188 33C73.5721 33 76.2812 30.3188 76.2812 27C76.2812 23.6812 73.5721 21 70.2188 21C66.8654 21 64.1562 23.6812 64.1562 27ZM24.75 48C24.75 44.6813 22.0408 42 18.6875 42C15.3399 42 12.625 44.6813 12.625 48C12.625 51.3187 15.3399 54 18.6875 54C22.0408 54 24.75 51.3187 24.75 48ZM21.7188 27C21.7188 30.3188 24.4279 33 27.7812 33C31.1346 33 33.8438 30.3188 33.8438 27C33.8438 23.6812 31.1346 21 27.7812 21C24.4279 21 21.7188 23.6812 21.7188 27Z"
                    fill="#271D1D"
                  />
                  <path
                    d="M78.441 42.6763C80.5629 41.3638 83.3668 42.0201 84.693 44.1388C86.0191 46.2388 85.3561 49.0138 83.2152 50.3263L60.9545 63.9763C61.0682 64.6326 61.125 65.3076 61.125 66.0013C61.125 72.6201 55.6877 78.0013 49 78.0013C42.3123 78.0013 36.875 72.6201 36.875 66.0013C36.875 59.3826 42.3123 54.0013 49 54.0013C51.6713 54.0013 54.1531 54.8638 56.1613 56.3263L78.441 42.6763Z"
                    fill="#B6A5A5"
                  />
                </g>
                <defs>
                  <clipPath id="clip0_629_6368">
                    <rect
                      width="97"
                      height="96"
                      fill="white"
                      transform="translate(0.5)"
                    />
                  </clipPath>
                </defs>
              </svg>
            }
            title="Unmatched speed"
            description="We provide review quality on par with top lawyers in a matter of minutes."
          />

          <FeatureCard
            icon={
              <svg
                width="121"
                height="96"
                viewBox="0 0 121 96"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-30 h-24"
              >
                <path
                  d="M3.25847 23.5263L11.1424 7.89255C11.7152 6.7563 12.9498 6.10005 14.2222 6.25755L60.499 11.8263L44.7312 37.8888C43.3322 40.3826 40.5151 41.4701 37.8872 40.7388L7.00758 31.9826C3.36623 30.9513 1.56504 26.8825 3.25847 23.5263ZM113.985 31.9826L83.1109 40.7388C80.4829 41.4701 77.6659 40.3826 76.2668 37.8888L60.499 11.8263L106.782 6.25755C108.048 6.10005 109.277 6.7563 109.863 7.89255L117.747 23.5263C119.43 26.8825 117.634 30.9513 113.985 31.9826Z"
                  fill="#271D1D"
                />
                <path
                  d="M76.2694 37.8938C77.6684 40.3875 80.4855 41.475 83.1134 40.7438L108.902 33.4313V70.9688C108.902 75.0938 106.066 78.6938 102.02 79.7063L63.432 89.2688C61.5036 89.7563 59.4995 89.7563 57.5711 89.2688L18.9834 79.7063C14.9356 78.6938 12.1016 75.0938 12.1016 70.9688V33.4313L37.8897 40.7438C40.5177 41.475 43.3347 40.3875 44.7338 37.8938L60.3314 12L76.2694 37.8938Z"
                  fill="#B6A5A5"
                  fillOpacity="0.611765"
                />
              </svg>
            }
            title="Quick start"
            description="Our solutions are available out-of-the-box, with no pre-training required. Review your first contract in 1 minute after first login."
          />
        </div>
      </section>

      <AnimatedQuotes />

      {/* FAQ Section */}
      <section className="py-20 max-w-4xl mx-auto px-8 lg:px-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-medium text-[#271D1D] font-lora">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-4">
          <FAQItem
            question="How do I get started?"
            answer="Getting started is easy! Our solutions are available out-of-the-box. If you are looking for a one-time contract review, simply upload your contract and receive a comprehensive compliance report in just a few clicks. If you have larger volumes of contracts, contact us to create a corporate account and start using our AI review modules right away, streamlining your contract review process with ease."
          />
          <FAQItem
            question="Can I use Maigon without Playbook ?"
            answer="Yes! Our standard solution is available for use right away, even without Playbook. While Playbook allows for more customization of contract review, adjusted to your specific review guidelines, the standard solution is designed to check for the most important compliance aspects and adherence to best practices. Whether you choose to use Playbook or the standard solution, Maigon provides you with valuable insights every time."
          />
          <FAQItem
            question="Will you use my data for training ?"
            answer="No, we won't use your data for any other purpose than the intended contract review. We do not use your contract data for AI training or any other service improvements, unless you need us to look into your contract for troubleshooting. You can trust that your data is kept confidential and secure with us."
          />
          <FAQItem
            question="Is API available ?"
            answer="Yes! We offer an API that can be used by contract platform vendors and companies with internal contract review tools. Our API is tailored to specific contract types and is designed to be both simple to use and comprehensive, providing advanced AI insights into submitted agreements for compliance. To get started with our API, please contact our team."
          />
        </div>
      </section>

      <Footer />
    </div>
  );
}
