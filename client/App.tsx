import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Index from "./pages/Index";
import UserHome from "./pages/UserHome";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import Solutions from "./pages/Solutions";
import UserSolutions from "./pages/UserSolutions";
import Upload from "./pages/Upload";
import Loading from "./pages/Loading";
import TestLoading from "./pages/TestLoading";
import News from "./pages/News";
import Team from "./pages/Team";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const router = createBrowserRouter([
  {
    path: "/",
    element: <Index />,
  },
  {
    path: "/home",
    element: <UserHome />,
  },
  {
    path: "/signin",
    element: <SignIn />,
  },
  {
    path: "/signup",
    element: <SignUp />,
  },
  {
    path: "/solutions",
    element: <Solutions />,
  },
  {
    path: "/user-solutions",
    element: <UserSolutions />,
  },
  {
    path: "/upload",
    element: <Upload />,
  },
  {
    path: "/loading",
    element: <Loading />,
  },
  {
    path: "/news",
    element: <News />,
  },
  {
    path: "/team",
    element: <Team />,
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <RouterProvider router={router} />
    </TooltipProvider>
  </QueryClientProvider>
);

const container = document.getElementById("root")!;
let root = (container as any)._reactRoot;

if (!root) {
  root = createRoot(container);
  (container as any)._reactRoot = root;
}

root.render(<App />);
