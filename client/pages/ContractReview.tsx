import React, { useState, useEffect, useCallback } from "react";
import { ChevronDown, User, Download, ArrowLeft, Printer, AlertTriangle, CheckCircle, Clock, Sparkles, Bot, Send, X } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";
import MobileNavigation from "@/components/MobileNavigation";
import { useUser } from "@/contexts/SupabaseUserContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataService } from "@/services/dataService";
import { useToast } from "@/hooks/use-toast";

interface ContractData {
  id: string;
  title: string;
  file_name: string;
  file_size: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ReviewData {
  id: string;
  review_type: string;
  results: any;
  score: number;
  confidence_level: number;
  created_at: string;
}

type AgentMessage = {
  id: string;
  role: "agent" | "user";
  content: string;
  timestamp: string;
};

export default function ContractReview() {
  const { user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Get contract data from navigation state (from upload page)
  const { contract, review, selectedFile, perspective, solutionTitle } = location.state || {};

  const [contractData, setContractData] = useState<ContractData | null>(contract);
  const [reviewData, setReviewData] = useState<ReviewData | null>(review);
  const [isLoading, setIsLoading] = useState(!contract || !review);
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([]);
  const [agentInput, setAgentInput] = useState("");
  const [agentIsThinking, setAgentIsThinking] = useState(false);
  const [isAgentOpen, setIsAgentOpen] = useState(false);

  useEffect(() => {
    if (reviewData && agentMessages.length === 0) {
      setAgentMessages([
        {
          id: "agent-welcome",
          role: "agent",
          content: "Hi there! I'm Maigon's contract co-pilot. I can help transform these insights into updated clauses, negotiation-ready language, or summaries for stakeholders.",
          timestamp: new Date().toISOString(),
        },
        {
          id: "agent-prompt",
          role: "agent",
          content: "Try asking me to draft a revised indemnification clause or prepare a bullet summary for your legal team.",
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  }, [reviewData, agentMessages.length]);

  // If no data provided, redirect back
  useEffect(() => {
    if (!contractData && !reviewData && !isLoading) {
      toast({
        title: "No contract data",
        description: "Please upload a contract first.",
        variant: "destructive",
      });
      navigate("/user-solutions");
    }
  }, [contractData, reviewData, isLoading, navigate, toast]);

  // Format score for display
  const formatScore = (score: number): string => {
    return score ? score.toFixed(0) : "0";
  };

  // Get score color based on value
  const getScoreColor = (score: number): string => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  // Get score background color
  const getScoreBgColor = (score: number): string => {
    if (score >= 80) return "bg-green-50 border-green-200";
    if (score >= 60) return "bg-yellow-50 border-yellow-200";
    return "bg-red-50 border-red-200";
  };

  // Get review type display name
  const getReviewTypeDisplay = (type: string): string => {
    const types: { [key: string]: string } = {
      'risk_assessment': 'Risk Assessment',
      'compliance_score': 'Compliance Review',
      'perspective_review': 'Perspective Analysis',
      'full_summary': 'Full Summary',
      'ai_integration': 'AI Integration Review'
    };
    return types[type] || type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Get perspective display name
  const getPerspectiveDisplay = (perspectiveValue: string): string => {
    const perspectives: { [key: string]: string } = {
      'risk': 'Risk Analysis',
      'compliance': 'Compliance Focus',
      'perspective': 'Multi-Perspective',
      'summary': 'Summary Analysis',
      'ai': 'AI Integration',
      'data-subject': 'Data Subject',
      'organization': 'Organization'
    };
    return perspectives[perspectiveValue] || perspectiveValue;
  };

  // Export contract data
  const handleExport = async () => {
    if (!user || !contractData) return;

    try {
      const exportData = await DataService.exportUserData(user.id, 'json');
      
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contract-analysis-${contractData.id}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export successful",
        description: "Contract analysis data has been exported.",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: "There was an error exporting the data.",
        variant: "destructive",
      });
    }
  };

  const handleBackToSolutions = () => {
    navigate("/user-solutions");
  };

  const handleNewReview = () => {
    navigate("/perspective-selection");
  };

  const handlePrint = () => {
    window.print();
  };

  const enqueueAgentMessage = useCallback((message: AgentMessage) => {
    setAgentMessages(prev => [...prev, message]);
  }, []);

  const handleAgentSend = useCallback(() => {
    const trimmed = agentInput.trim();
    if (!trimmed) return;

    const now = new Date();
    const userMessage: AgentMessage = {
      id: `user-${now.getTime()}`,
      role: "user",
      content: trimmed,
      timestamp: now.toISOString(),
    };

    enqueueAgentMessage(userMessage);
    setAgentInput("");
    setAgentIsThinking(true);

    setTimeout(() => {
      const response: AgentMessage = {
        id: `agent-${Date.now()}`,
        role: "agent",
        content:
          "(Preview) I'll soon be able to draft contract edits and next steps for you. For now, imagine receiving a tailored clause update or summarized brief right here!",
        timestamp: new Date().toISOString(),
      };
      enqueueAgentMessage(response);
      setAgentIsThinking(false);
    }, 900);
  }, [agentInput, enqueueAgentMessage]);

  const handleAgentKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleAgentSend();
    }
  };

  const toggleAgent = () => setIsAgentOpen((prev) => !prev);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-12 h-12 text-[#9A7C7C] mx-auto mb-4 animate-spin" />
          <h2 className="text-xl font-lora text-[#271D1D] mb-2">Loading Contract Analysis</h2>
          <p className="text-[#271D1D]/70">Please wait while we prepare your results...</p>
        </div>
      </div>
    );
  }

  if (!contractData || !reviewData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-lora text-[#271D1D] mb-2">No Contract Data</h2>
          <p className="text-[#271D1D]/70 mb-4">Please upload a contract first.</p>
          <Button onClick={() => navigate("/user-solutions")}>
            Back to Solutions
          </Button>
        </div>
      </div>
    );
  }

  const score = reviewData.score || 0;
  const results = reviewData.results || {};

  return (
    <>
      <div className="min-h-screen bg-white">
      {/* Minimal Header Bar - Hidden when printed */}
      <div className="print:hidden bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBackToSolutions}
            className="flex items-center gap-2 text-[#9A7C7C] hover:text-[#725A5A] transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Solutions
          </button>
          <div className="text-gray-300">|</div>
          <Logo />
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleNewReview}
            variant="outline"
            size="sm"
            className="border-[#9A7C7C] text-[#9A7C7C] hover:bg-[#9A7C7C] hover:text-white"
          >
            New Review
          </Button>
          <Button
            onClick={handleExport}
            variant="outline"
            size="sm"
            className="border-[#9A7C7C] text-[#9A7C7C] hover:bg-[#9A7C7C] hover:text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
          <Button
            onClick={handlePrint}
            size="sm"
            className="bg-[#9A7C7C] hover:bg-[#725A5A] text-white"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print Report
          </Button>
        </div>
      </div>

      {/* Report Content */}
      <div className="max-w-5xl mx-auto px-6 py-8 print:px-8 print:py-6">
        {/* Report Header */}
        <div className="mb-8 pb-6 border-b border-gray-200 print:mb-6 print:pb-4">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-medium text-[#271D1D] font-lora mb-3 print:text-xl">
                Contract Analysis Report
              </h1>
              <div className="text-sm text-gray-600 space-y-1">
                <div>
                  <span className="font-medium">Document:</span>{" "}
                  {contractData.file_name}
                </div>                
                <div>
                  <span className="font-medium">Perspective:</span>{" "}
                  {getPerspectiveDisplay(perspective || 'general')}
                </div>
                <div>
                  <span className="font-medium">Generated:</span>{" "}
                  {new Date(reviewData.created_at).toLocaleDateString()} at{" "}
                  {new Date(reviewData.created_at).toLocaleTimeString()}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[#725A5A] font-lora text-xl font-medium mb-1">
                MAIGON
              </div>
              <div className="text-xs text-gray-500">
                AI-Powered Contract Analysis
              </div>
            </div>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="mb-8 print:mb-6">
          <h2 className="text-xl font-medium text-[#271D1D] mb-4 print:text-lg">
            Executive Summary
          </h2>

          {/* Overall Score - Prominent Display */}
          <div className={`bg-white rounded-lg border-2 p-6 mb-6 print:border print:p-4 ${getScoreBgColor(score)}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-[#271D1D]">
                Overall {getReviewTypeDisplay(reviewData.review_type)} Score
              </h3>
              <span className={`text-4xl font-bold print:text-3xl ${getScoreColor(score)}`}>
                {formatScore(score)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 mb-4 print:h-3">
              <div
                className={`h-4 rounded-full transition-all duration-1000 print:h-3 ${
                  score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${score}%` }}
              ></div>
            </div>
            <p className="text-gray-700">
              {score >= 80 && <strong>Excellent performance</strong>}
              {score >= 60 && score < 80 && <strong>Good performance</strong>}
              {score < 60 && <strong>Needs improvement</strong>}
              {" "}
              {results.summary || `Your contract has been analyzed with a ${reviewData.review_type.replace('_', ' ')} focus.`}
            </p>
          </div>

          {/* Key Metrics Grid */}
          {results.key_points && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 print:gap-3">
              {results.key_points.slice(0, 4).map((point: string, index: number) => (
                <div key={index} className="bg-blue-50 rounded-lg p-4 border border-blue-200 print:p-3">
                  <div className="text-sm text-blue-700 font-medium">
                    {point}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Processing Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 print:gap-3">
            <div className="bg-gray-50 rounded-lg p-4 text-center border border-gray-200 print:p-3">
              <div className="text-2xl font-bold text-gray-600 mb-1 print:text-xl">
                {results.pages || 1}
              </div>
              <div className="text-sm text-gray-700 font-medium">
                Pages Analyzed
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center border border-gray-200 print:p-3">
              <div className="text-2xl font-bold text-gray-600 mb-1 print:text-xl">
                {(results.processing_time || 0).toFixed(1)}s
              </div>
              <div className="text-sm text-gray-700 font-medium">
                Processing Time
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Analysis Results */}
        {reviewData.review_type === 'risk_assessment' && results.risks && (
          <div className="mb-8 print:mb-6">
            <h2 className="text-xl font-medium text-[#271D1D] mb-4 print:text-lg">
              Risk Analysis
            </h2>
            <div className="space-y-4">
              {results.risks.map((risk: any, index: number) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-[#271D1D] capitalize">
                      {risk.type} Risk
                    </h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      risk.level === 'high' ? 'bg-red-100 text-red-800' :
                      risk.level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {risk.level}
                    </span>
                  </div>
                  <p className="text-gray-700 text-sm">{risk.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {results.recommendations && (
          <div className="mb-8 print:mb-6">
            <h2 className="text-xl font-medium text-[#271D1D] mb-4 print:text-lg">
              Recommendations
            </h2>
            <div className="space-y-3">
              {results.recommendations.map((recommendation: string, index: number) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-gray-700 text-sm">{recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Items */}
        {results.action_items && (
          <div className="mb-8 print:mb-6">
            <h2 className="text-xl font-medium text-[#271D1D] mb-4 print:text-lg">
              Action Items
            </h2>
            <div className="space-y-3">
              {results.action_items.map((item: string, index: number) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <p className="text-gray-700 text-sm">{item}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-200 text-center text-xs text-gray-500 print:mt-8 print:pt-4">
          <p>
            This report was generated by Maigon AI-powered contract analysis on{" "}
            {new Date(reviewData.created_at).toLocaleDateString()}. 
            Analysis ID: {reviewData.id}
          </p>
        </div>
      </div>
    </div>

    {/* Floating Agent Chat Preview */}
    <div className="print:hidden">
      {isAgentOpen && (
        <div className="fixed bottom-28 right-6 z-50 w-[min(90vw,360px)] shadow-2xl rounded-2xl border border-[#E8DDDD] bg-white/95 backdrop-blur-sm">
          <div className="px-4 py-3 border-b border-[#E8DDDD] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[#9A7C7C]/15 text-[#9A7C7C] flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#271D1D]">Maigon Agent Preview</p>
                <p className="text-[11px] uppercase tracking-wide text-[#9A7C7C]">Demo experience</p>
              </div>
            </div>
            <button
              onClick={toggleAgent}
              className="h-8 w-8 inline-flex items-center justify-center rounded-full text-[#725A5A] hover:bg-[#F9F8F8]"
              aria-label="Close agent preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-3 pt-3 pb-2">
            <div className="bg-[#FDFBFB] border border-[#E8DDDD] rounded-xl h-80 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {agentMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                        message.role === "user"
                          ? "bg-[#9A7C7C] text-white rounded-br-sm"
                          : "bg-white text-[#271D1D] border border-[#E8DDDD] rounded-bl-sm"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1 text-[11px] uppercase tracking-wide">
                        {message.role === "user" ? (
                          <span className="opacity-70">You</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[#9A7C7C]">
                            <Bot className="w-3 h-3" /> Agent
                          </span>
                        )}
                        <span className="opacity-50">
                          {new Date(message.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p>{message.content}</p>
                    </div>
                  </div>
                ))}

                {agentIsThinking && (
                  <div className="flex items-center gap-2 text-xs text-[#725A5A]">
                    <Bot className="w-3 h-3 animate-pulse" /> Agent is drafting a suggestion…
                  </div>
                )}
              </div>

              <div className="border-t border-[#E8DDDD] bg-white px-3 py-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={agentInput}
                    onChange={(event) => setAgentInput(event.target.value)}
                    onKeyDown={handleAgentKeyDown}
                    placeholder="Ask for clause updates or summaries..."
                    className="flex-1 text-sm"
                  />
                  <Button
                    type="button"
                    onClick={handleAgentSend}
                    disabled={!agentInput.trim() && !agentIsThinking}
                    className="bg-[#9A7C7C] hover:bg-[#725A5A] text-white"
                    size="icon"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsAgentOpen(true)}
        className={`fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-lg border border-[#E8DDDD] bg-white text-[#9A7C7C] hover:bg-[#F9F8F8] transition-all print:hidden ${
          isAgentOpen ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
        aria-label="Open AI agent preview"
      >
        <Bot className="w-6 h-6 mx-auto" />
      </button>
    </div>
  </>
  );
}
