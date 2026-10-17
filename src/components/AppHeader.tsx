import { NavLink } from "react-router-dom";
import { useStudio } from "../context/StudioContext";

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
          Music Studio
        </NavLink>
        <NavLink to="/tracks">My Tracks</NavLink>
        <NavLink to="/tools">Audio Tools</NavLink>
        <NavLink to="/settings">Settings</NavLink>
      </nav>
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
