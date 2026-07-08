import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "../components/common/ProtectedRoute";
import { FeedSkeleton } from "../components/common/Skeletons";
import AnalyticsTracker from "../components/analytics/AnalyticsTracker";
import AdminRoutes from "../admin/AdminRoutes";

import Login from "../pages/auth/Login";
import Signup from "../pages/auth/Signup";
import Verify from "../pages/auth/Verify";

// Opportunities/Jobs and Projects are held back for this release — this
// flag back to true to re-enable without touching any route/page code.
const OPPORTUNITIES_PROJECTS_ENABLED = false;

const ProfileActivity = lazy(() => import("../pages/profile/ProfileActivity"));
const ProfileSetup = lazy(() => import("../pages/profile/ProfileSetup"));
const Profile = lazy(() => import("../pages/profile/Profile"));
const UserProfile = lazy(() => import("../pages/profile/UserProfile"));
const ProfilePeoplePage = lazy(() => import("../pages/profile/ProfilePeoplePage"));
const Analytics = lazy(() => import("../pages/activity/Analytics"));
const MyProjects = lazy(() => import("../pages/activity/MyProjects"));
const Home = lazy(() => import("../pages/home/Home"));
const DiscoverJourneys = lazy(() => import("../pages/discover/DiscoverJourneys"));
const CreatePost = lazy(() => import("../pages/create/CreatePost"));
const CreateLearning = lazy(() => import("../pages/create/CreateLearning"));
const CreateJourney = lazy(() => import("../pages/create/CreateJourney"));
const CreateOpportunity = lazy(() => import("../pages/create/CreateOpportunity"));
const CreateProject = lazy(() => import("../pages/create/CreateProject"));
const CreateJob = lazy(() => import("../pages/create/CreateJob"));
const CreateCircle = lazy(() => import("../pages/create/CreateCircle"));
const CreateCofounder = lazy(() => import("../pages/create/CreateCofounder"));
const JourneyProfile = lazy(() => import("../pages/journey/JourneyProfile"));
const UpdateJourney = lazy(() => import("../pages/journey/UpdateJourney"));
const JobDetails = lazy(() => import("../pages/opportunities/JobDetails"));
const Apply = lazy(() => import("../pages/opportunities/Apply"));
const Network = lazy(() => import("../pages/network/Network"));
const Requests = lazy(() => import("../pages/network/Requests"));
const CircleCommunity = lazy(() => import("../pages/network/CircleCommunity"));
const BrowseCircles = lazy(() => import("../pages/network/BrowseCircles"));
const Learning = lazy(() => import("../pages/learning/Learning"));
const LearningView = lazy(() => import("../pages/learning/LearningView"));
const LearningViewMeType = lazy(() => import("../pages/learning/LearningViewMeType"));
const Inbox = lazy(() => import("../pages/messages/Inbox"));
const Chat = lazy(() => import("../pages/messages/Chat"));
const Search = lazy(() => import("../pages/search/Search"));
const Notifications = lazy(() => import("../pages/notifications/Notifications"));
const Saved = lazy(() => import("../pages/saved/Saved"));
const Verification = lazy(() => import("../pages/verification/Verification"));
const Settings = lazy(() => import("../pages/settings/Settings"));
const HelpSupport = lazy(() => import("../pages/help/HelpSupport"));
const Faq = lazy(() => import("../pages/settings/Faq"));
const BlockedAccounts = lazy(() => import("../pages/settings/BlockedAccounts"));
const PrivacyPolicy = lazy(() => import("../pages/settings/PrivacyPolicy"));
const Terms = lazy(() => import("../pages/settings/Terms"));
const About = lazy(() => import("../pages/settings/About"));
const AccountDetails = lazy(() => import("../pages/settings/AccountDetails"));
const CommunityGuidelines = lazy(() => import("../pages/settings/CommunityGuidelines"));
const AccountDeletion = lazy(() => import("../pages/settings/AccountDeletion"));

function Private({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

function RouteFallback() {
  return (
    <div className="flex min-h-screen justify-center bg-[var(--imc-bg)] px-4 py-6">
      <div className="w-full max-w-[430px]">
        <FeedSkeleton count={3} />
      </div>
    </div>
  );
}

export default function AppRoutes() {
  useEffect(() => {
    const preload = () => {
      Promise.allSettled([
        import("../pages/home/Home"),
        import("../pages/profile/Profile"),
        import("../pages/network/Network"),
        import("../pages/search/Search"),
        import("../pages/notifications/Notifications"),
        import("../pages/messages/Inbox"),
      ]);
    };

    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(preload, { timeout: 2500 });
      return () => window.cancelIdleCallback?.(id);
    }

    const id = window.setTimeout(preload, 1200);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <Suspense fallback={<RouteFallback />}>
      <AnalyticsTracker />
      <Routes>
      <Route path="/admin/*" element={<AdminRoutes />} />
      <Route path="/" element={<Navigate to="/home" replace />} />

      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/verify" element={<Verify />} />

      <Route
        path="/home"
        element={
          <Private>
            <Home />
          </Private>
        }
      />

      <Route
        path="/discover"
        element={
          <Private>
            <DiscoverJourneys />
          </Private>
        }
      />

      <Route
        path="/profile-setup"
        element={
          <Private>
            <ProfileSetup />
          </Private>
        }
      />

      <Route
        path="/profile"
        element={
          <Private>
            <Profile />
          </Private>
        }
      />

      <Route
        path="/profile/people/:type"
        element={
          <Private>
            <ProfilePeoplePage />
          </Private>
        }
      />

      <Route
        path="/profile/user/:userId/people/:type"
        element={
          <Private>
            <ProfilePeoplePage />
          </Private>
        }
      />

      <Route
        path="/profile/activity"
        element={
          <Private>
            <ProfileActivity />
          </Private>
        }
      />

      <Route
        path="/analytics"
        element={
          <Private>
            <Analytics />
          </Private>
        }
      />

      <Route
        path="/profile/user/:userId"
        element={
          <Private>
            <UserProfile />
          </Private>
        }
      />

      <Route
        path="/profile/:username"
        element={
          <Private>
            <UserProfile />
          </Private>
        }
      />

      <Route
        path="/learning"
        element={
          <Private>
            <Learning />
          </Private>
        }
      />

      {/* Learning View */}
      <Route
        path="/learning-view/:id"
        element={
          <Private>
            <LearningView />
          </Private>
        }
      />

      <Route
        path="/learning-view/:id/activity"
        element={
          <Private>
            <LearningViewMeType />
          </Private>
        }
      />

      <Route
        path="/learning/:id"
        element={
          <Private>
            <LearningView />
          </Private>
        }
      />

      <Route
        path="/job-details"
        element={
          <Private>
            {OPPORTUNITIES_PROJECTS_ENABLED ? <JobDetails /> : <Navigate to="/home" replace />}
          </Private>
        }
      />

      <Route
        path="/job-details/:id"
        element={
          <Private>
            {OPPORTUNITIES_PROJECTS_ENABLED ? <JobDetails /> : <Navigate to="/home" replace />}
          </Private>
        }
      />

      <Route
        path="/apply"
        element={
          <Private>
            {OPPORTUNITIES_PROJECTS_ENABLED ? <Apply /> : <Navigate to="/home" replace />}
          </Private>
        }
      />

      <Route
        path="/apply/:id"
        element={
          <Private>
            {OPPORTUNITIES_PROJECTS_ENABLED ? <Apply /> : <Navigate to="/home" replace />}
          </Private>
        }
      />

      <Route
        path="/my-projects"
        element={
          <Private>
            {OPPORTUNITIES_PROJECTS_ENABLED ? <MyProjects /> : <Navigate to="/home" replace />}
          </Private>
        }
      />

      <Route
        path="/network"
        element={
          <Private>
            <Network />
          </Private>
        }
      />

      <Route
        path="/requests"
        element={
          <Private>
            <Requests />
          </Private>
        }
      />

      <Route
        path="/circles/browse"
        element={
          <Private>
            <BrowseCircles />
          </Private>
        }
      />

      <Route
        path="/circles/:circleId"
        element={
          <Private>
            <CircleCommunity />
          </Private>
        }
      />

      <Route
        path="/messages"
        element={
          <Private>
            <Inbox />
          </Private>
        }
      />

      <Route
        path="/search"
        element={
          <Private>
            <Search />
          </Private>
        }
      />

      <Route
        path="/notifications"
        element={
          <Private>
            <Notifications />
          </Private>
        }
      />

      <Route
        path="/chat/:conversationId"
        element={
          <Private>
            <Chat />
          </Private>
        }
      />

      <Route
        path="/saved"
        element={
          <Private>
            <Saved />
          </Private>
        }
      />

      <Route
        path="/verification"
        element={
          <Private>
            <Verification />
          </Private>
        }
      />

      <Route
        path="/settings"
        element={
          <Private>
            <Settings />
          </Private>
        }
      />

      <Route
        path="/help"
        element={
          <Private>
            <HelpSupport />
          </Private>
        }
      />

      <Route
        path="/faq"
        element={
          <Private>
            <Faq />
          </Private>
        }
      />

      <Route path="/privacy-policy" element={<PrivacyPolicy />} />

      {/* Google Play requires a public account-deletion page reachable
          without login — keep this route unauthenticated. */}
      <Route path="/delete-account" element={<AccountDeletion />} />

      <Route
        path="/blocked-accounts"
        element={
          <Private>
            <BlockedAccounts />
          </Private>
        }
      />

      <Route
        path="/terms"
        element={
          <Terms />
        }
      />

      <Route path="/community-guidelines" element={<CommunityGuidelines />} />

      <Route
        path="/about"
        element={
          <Private>
            <About />
          </Private>
        }
      />

      <Route
        path="/account"
        element={
          <Private>
            <AccountDetails />
          </Private>
        }
      />

      <Route
        path="/create-post"
        element={
          <Private>
            <CreatePost />
          </Private>
        }
      />

      <Route
        path="/create-learning"
        element={
          <Private>
            <CreateLearning />
          </Private>
        }
      />

      <Route
        path="/create-journey"
        element={
          <Private>
            <CreateJourney />
          </Private>
        }
      />

      <Route
        path="/create-opportunity"
        element={
          <Private>
            {OPPORTUNITIES_PROJECTS_ENABLED ? <CreateOpportunity /> : <Navigate to="/home" replace />}
          </Private>
        }
      />

      <Route
        path="/create-project"
        element={
          <Private>
            {OPPORTUNITIES_PROJECTS_ENABLED ? <CreateProject /> : <Navigate to="/home" replace />}
          </Private>
        }
      />

      <Route
        path="/create-job"
        element={
          <Private>
            <CreateJob />
          </Private>
        }
      />

      <Route
        path="/create-circle"
        element={
          <Private>
            <CreateCircle />
          </Private>
        }
      />

      <Route
        path="/create-cofounder"
        element={
          <Private>
            <CreateCofounder />
          </Private>
        }
      />

      <Route
        path="/journey/:journeyId"
        element={
          <Private>
            <JourneyProfile />
          </Private>
        }
      />

      <Route
        path="/journey/:journeyId/update"
        element={
          <Private>
            <UpdateJourney />
          </Private>
        }
      />

      <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </Suspense>
  );
}
