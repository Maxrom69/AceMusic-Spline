import { NavLink } from "react-router-dom";
import { useStudio } from "../context/StudioContext";
import { ThemeSwitcher } from "./ThemeSwitcher";

export function AppHeader() {
  const { settings, connection, connectionDetail } = useStudio();
  return (
    <header className="app-header">
      <div className="brand">
        <img src={settings.branding.logoUrl || "/brand-mark.png"} alt="" width={42} height={42} />
        <div>
          <strong>{settings.branding.appName}</strong>
          <span>{settings.branding.tagline}</span>
        </div>
      </div>
      <nav className="main-nav" aria-label="Studio">
        <NavLink to="/" end>
          <span className="nav-full">Music Studio</span>
          <span className="nav-short">Studio</span>
        </NavLink>
        <NavLink to="/tracks">
          <span className="nav-full">My Tracks</span>
          <span className="nav-short">Tracks</span>
        </NavLink>
        <NavLink to="/tools">
          <span className="nav-full">Audio Tools</span>
          <span className="nav-short">Tools</span>
        </NavLink>
        <NavLink to="/settings">Settings</NavLink>
      </nav>
      <ThemeSwitcher compact />
      <div className={`api-chip is-${connection}`} title={connectionDetail}>
        <i />
        <span>
          {connection === "connected"
            ? "API connected"
            : connection === "checking"
              ? "Checking API"
              : connection === "error"
                ? "API error"
                : connection === "unconfigured"
                  ? "API unconfigured"
                  : "API idle"}
        </span>
      </div>
    </header>
  );
}
