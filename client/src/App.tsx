import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Redirect, Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { CartProvider } from "./contexts/CartContext";
import Home from "./pages/Home";
import ProductDetail from "./pages/ProductDetail";
import Downloads from "./pages/Downloads";
import Admin from "./pages/Admin";
import AdminNewsletter from "./pages/AdminNewsletter";
import NewsletterUnsubscribe from "./pages/NewsletterUnsubscribe";
import Account from "./pages/Account";
import Contact from "./pages/Contact";
import AdminCommunity from "./pages/AdminCommunity";
import { MobileBottomNav } from "./components/MobileBottomNav";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/products/:handle"} component={ProductDetail} />
      <Route path={"/owner/orders"}><Redirect to="/admin" /></Route>
      <Route path={"/owner"}><Redirect to="/admin" /></Route>
      <Route path={"/admin"} component={Admin} />
      <Route path={"/admin/newsletter"} component={AdminNewsletter} />
      <Route path={"/admin/community"} component={AdminCommunity} />
      <Route path={"/account"} component={Account} />
      <Route path={"/contact"} component={Contact} />
      <Route path={"/newsletter/unsubscribe/:token"} component={NewsletterUnsubscribe} />
      <Route path={"/downloads/:receiptToken"} component={Downloads} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <CartProvider>
            <Toaster />
            <Router />
            <MobileBottomNav />
          </CartProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
