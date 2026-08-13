import { useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./components/Dashboard";
import { Produtos } from "./components/Produtos";
import { Estoque } from "./components/Estoque";
import { AnaliseIA } from "./components/AnaliseIA";

export default function App() {
  const [currentView, setCurrentView] = useState("dashboard");

  const renderView = () => {
    switch (currentView) {
      case "dashboard":
        return <Dashboard />;
      case "produtos":
        return <Produtos />;
      case "estoque":
        return <Estoque />;
      case "analise":
        return <AnaliseIA />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="size-full flex bg-gray-50">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      {renderView()}
    </div>
  );
}