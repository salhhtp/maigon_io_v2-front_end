import React, { useState, useEffect } from 'react';

interface Quote {
  text: string;
  author: string;
  fontSize?: string;
}

const AnimatedQuotes: React.FC = () => {
  const [currentQuote, setCurrentQuote] = useState(0);

  const quotes: Quote[] = [
    {
      text: "\" DPA AI makes review of data processing agreements much faster. \"",
      author: "Sara Edlund, General Counsel at Dustin Group",
      fontSize: "text-2xl md:text-3xl lg:text-5xl"
    },
    {
      text: "\" At Nordic Semiconductor, we use Maigon to review all NDAs in accordance with our custom playbook. This has dramatically reduced the time we spend going through each NDA, allowing our small legal team to prioritize our resources on other more demanding and interesting legal work. Where we previously would read each NDA word for word, we now only focus on the deviations that Maigon points out for us and trust that other aspects are covered. A must have for any legal team with a high volume of contracts! \"",
      author: "Christian Skovly, Senior Legal Counsel at Nordic Semiconductor",
      fontSize: "text-sm md:text-lg lg:text-2xl"
    }
  ];

  // Auto-rotate quotes every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuote((prev) => (prev + 1) % quotes.length);
    }, 10000);

    return () => clearInterval(interval);
  }, [quotes.length]);

  return (
    <section className="px-8 lg:px-16 py-16 lg:py-24 bg-[#F9F8F8]">
      <div className="max-w-7xl mx-auto">
        <div className="relative h-[379px] flex items-center justify-center overflow-hidden">
          {quotes.map((quote, index) => (
            <div
              key={index}
              className={`absolute inset-0 flex flex-col items-center justify-center text-center px-4 transition-all duration-1000 ${
                index === currentQuote 
                  ? 'opacity-100 translate-x-0' 
                  : index < currentQuote 
                    ? 'opacity-0 -translate-x-full' 
                    : 'opacity-0 translate-x-full'
              }`}
            >
              <blockquote 
                className={`${quote.fontSize} font-lora text-black mb-8 leading-[47px] max-w-[982px]`}
              >
                {quote.text}
              </blockquote>
              <cite className="text-black text-base font-normal leading-[47px] tracking-[0.16px] not-italic">
                {quote.author}
              </cite>
            </div>
          ))}
        </div>
        
        {/* Quote indicators */}
        <div className="flex justify-center mt-8 gap-2">
          {quotes.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentQuote(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentQuote ? 'bg-[#271D1D]' : 'bg-[#D6CECE]'
              }`}
              aria-label={`Go to quote ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default AnimatedQuotes;
