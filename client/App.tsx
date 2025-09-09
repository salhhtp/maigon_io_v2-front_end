import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, Outlet } from "react-router-dom";
import { UserProvider } from "@/contexts/SupabaseUserContext";
import ScrollToTop from "@/components/ScrollToTop";
import Index from "./pages/Index";
import RootRedirect from "@/components/RootRedirect";
import UserHome from "./pages/UserHome";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import Solutions from "./pages/Solutions";
import UserSolutions from "./pages/UserSolutions";
import PerspectiveSelection from "./pages/PerspectiveSelection";
import Upload from "./pages/Upload";
import ContractReview from "./pages/ContractReview";
import Loading from "./pages/Loading";
import News from "./pages/News";
import UserNews from "./pages/UserNews";
import Team from "./pages/Team";
import UserTeam from "./pages/UserTeam";
import Profile from "./pages/Profile";
import Dashboard from "./pages/Dashboard";
import UserDashboard from "./pages/UserDashboard";
import Settings from "./pages/Settings";
import Pricing from "./pages/Pricing";
import PublicPricing from "./pages/PublicPricing";
import DemoLogin from "./pages/DemoLogin";
import PublicSmarterLegalSolutions from "./pages/public-articles/SmarterLegalSolutions";
import PublicCodeToClause from "./pages/public-articles/CodeToClause";
import PublicLLMsAndLawyers from "./pages/public-articles/LLMsAndLawyers";
import PublicFindingContractSolution from "./pages/public-articles/FindingContractSolution";
import SmarterLegalSolutions from "./pages/articles/SmarterLegalSolutions";
import CodeToClause from "./pages/articles/CodeToClause";
import LLMsAndLawyers from "./pages/articles/LLMsAndLawyers";
import FindingContractSolution from "./pages/articles/FindingContractSolution";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ChangePassword from "./pages/ChangePassword";
import EmailVerification from "./pages/EmailVerification";
import AdminAnalytics from "./pages/AdminAnalytics";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const Layout = () => (
  <>
    <ScrollToTop />
    <Outlet />
  </>
);

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <RootRedirect />,
      },
      {
        path: "home",
        element: <UserHome />,
      },
      {
        path: "signin",
        element: <SignIn />,
      },
      {
        path: "signup",
        element: <SignUp />,
      },
      {
        path: "forgot-password",
        element: <ForgotPassword />,
      },
      {
        path: "reset-password",
        element: <ResetPassword />,
      },
      {
        path: "change-password",
        element: <ChangePassword />,
      },
      {
        path: "email-verification",
        element: <EmailVerification />,
      },
      {
        path: "solutions",
        element: <Solutions />,
      },
      {
        path: "user-solutions",
        element: <UserSolutions />,
      },
      {
        path: "perspective-selection",
        element: <PerspectiveSelection />,
      },
      {
        path: "upload",
        element: <Upload />,
      },
      {
        path: "loading",
        element: <Loading />,
      },
      {
        path: "contract-review",
        element: <ContractReview />,
      },
      {
        path: "news",
        element: <News />,
      },
      {
        path: "user-news",
        element: <UserNews />,
      },
      {
        path: "team",
        element: <Team />,
      },
      {
        path: "user-team",
        element: <UserTeam />,
      },
      {
        path: "profile",
        element: <Profile />,
      },
      {
        path: "dashboard",
        element: <Dashboard />,
      },
      {
        path: "user-dashboard",
        element: <UserDashboard />,
      },
      {
        path: "admin-analytics",
        element: <AdminAnalytics />,
      },
      {
        path: "settings",
        element: <Settings />,
      },
      {
        path: "pricing",
        element: <Pricing />,
      },
      {
        path: "public-pricing",
        element: <PublicPricing />,
      },
      {
        path: "demo-login",
        element: <DemoLogin />,
      },
      {
        path: "articles/smarter-legal-solutions",
        element: <SmarterLegalSolutions />,
      },
      {
        path: "articles/code-to-clause",
        element: <CodeToClause />,
      },
      {
        path: "articles/llms-and-lawyers",
        element: <LLMsAndLawyers />,
      },
      {
        path: "articles/finding-contract-solution",
        element: <FindingContractSolution />,
      },
      {
        path: "public-articles/smarter-legal-solutions",
        element: <PublicSmarterLegalSolutions />,
      },
      {
        path: "public-articles/code-to-clause",
        element: <PublicCodeToClause />,
      },
      {
        path: "public-articles/llms-and-lawyers",
        element: <PublicLLMsAndLawyers />,
      },
      {
        path: "public-articles/finding-contract-solution",
        element: <PublicFindingContractSolution />,
      },
      {
        path: "*",
        element: <NotFound />,
      },
    ],
  },
]);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <UserProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <RouterProvider router={router} />
      </TooltipProvider>
    </UserProvider>
  </QueryClientProvider>
);

const container = document.getElementById("root")!;
let root = (container as any)._reactRoot;

if (!root) {
  root = createRoot(container);
  (container as any)._reactRoot = root;
}

root.render(<App />);
