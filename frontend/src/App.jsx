import AppRoutes from "./routes/AppRoutes";
import ErrorBoundary from "./components/common/ErrorBoundary";
import PermissionBootstrap from "./components/common/PermissionBootstrap";
import DeepLinkListener from "./components/common/DeepLinkListener";
import SplashIntro from "./components/common/SplashIntro";
import PushNotificationListener from "./components/common/PushNotificationListener";
import E2EEKeyInitializer from "./components/common/E2EEKeyInitializer";
import VersionUpdateBanner from "./components/common/VersionUpdateBanner";
import AppUpdateModal from "./components/common/AppUpdateModal";

function App() {
  return (
    <ErrorBoundary>
      {/* Renders on top of everything below for its brief lifetime, then
          unmounts — AppRoutes mounts immediately underneath it so the real
          app is already ready the moment the intro fades out. */}
      <SplashIntro />
      <VersionUpdateBanner />
      {/* Native-only counterpart to VersionUpdateBanner above — see
          AppUpdateModal.jsx / useNativeUpdateCheck.js. */}
      <AppUpdateModal />
      <PermissionBootstrap />
      <DeepLinkListener />
      <PushNotificationListener />
      <E2EEKeyInitializer />
      <AppRoutes />
    </ErrorBoundary>
  );
}

export default App;
