import AppRoutes from "./routes/AppRoutes";
import ErrorBoundary from "./components/common/ErrorBoundary";
import PermissionBootstrap from "./components/common/PermissionBootstrap";
import DeepLinkListener from "./components/common/DeepLinkListener";

function App() {
  return (
    <ErrorBoundary>
      <PermissionBootstrap />
      <DeepLinkListener />
      <AppRoutes />
    </ErrorBoundary>
  );
}

export default App;
