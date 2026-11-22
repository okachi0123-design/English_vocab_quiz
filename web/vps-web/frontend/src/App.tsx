import { Navigate, Route, Routes } from "react-router-dom";
import { DataPage } from "./pages/DataPage";
import { HomePage } from "./pages/HomePage";
import { QuizPage } from "./pages/QuizPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/quiz" element={<QuizPage />} />
      <Route path="/data" element={<DataPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
