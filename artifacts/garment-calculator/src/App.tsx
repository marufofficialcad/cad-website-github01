import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CalculatorApp } from "@/components/calculator-app";

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <TooltipProvider>
        <CalculatorApp />
        <Toaster />
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;
