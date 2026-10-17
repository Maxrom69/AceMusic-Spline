import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppHeader } from "./components/AppHeader";
import { AudioTools } from "./components/AudioTools";
import { MusicStudio } from "./components/MusicStudio";
import { MyTracks } from "./components/MyTracks";
import { RobotStage } from "./components/RobotStage";
import { SettingsPanel } from "./components/SettingsPanel";
import { COMMUNITY_ROBOT } from "./config/defaults";

function SideLayout({ children }: { children: ReactNode }) {
  return (
    <div className="studio-layout">
      <div>{children}</div>
      <RobotStage />
    </div>
  );
}

export default function App() {
  return (
    <div className="app-shell">
      <div className="ambient" aria-hidden="true" />
      <AppHeader />
      <main>
        <Routes>
          <Route path="/" element={<MusicStudio />} />
          <Route
            path="/tracks"
            element={
              <SideLayout>
                <MyTracks />
              </SideLayout>
            }
          />
          <Route
            path="/tools"
            element={
              <SideLayout>
                <AudioTools />
              </SideLayout>
            }
          />
          <Route
            path="/settings"
            element={
              <SideLayout>
                <SettingsPanel />
              </SideLayout>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="app-footer">
        <span>
          Robot character inspired by{" "}
          <a href={COMMUNITY_ROBOT.page} target="_blank" rel="noreferrer">
            {COMMUNITY_ROBOT.title}
          </a>{" "}
          by{" "}
          <a href={COMMUNITY_ROBOT.creatorProfile} target="_blank" rel="noreferrer">
            {COMMUNITY_ROBOT.creatorHandle}
          </a>
          , licensed{" "}
          <a href={COMMUNITY_ROBOT.licenseUrl} target="_blank" rel="noreferrer">
            {COMMUNITY_ROBOT.license}
          </a>
          .
        </span>
        <span>Standalone AceMusic AI studio — not a WordPress embed.</span>
      </footer>
    </div>
  );
}
