import { Home, Search, CalendarDays, Bell, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useNotificationListener } from "@/hooks/useNotificationListener";

// 5-tab layout: Home | Search | Bookings (centre CTA) | Alerts | Profile
const TABS = [
  { icon: Home,         label: "Home",     path: "/home"          },
  { icon: Search,       label: "Search",   path: "/search"        },
  { icon: CalendarDays, label: "Bookings", path: "/bookings"      },
  { icon: Bell,         label: "Alerts",   path: "/notifications" },
  { icon: User,         label: "Profile",  path: "/profile"       },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate  = useNavigate();
  const { unreadCount } = useNotificationListener();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: "hsl(var(--background))",
        boxShadow: "0 -4px 20px var(--neu-dark), 0 -1px 4px var(--neu-light)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="app-nav-width flex items-stretch justify-around h-[62px] px-1">
        {TABS.map((tab) => {
          const active      = location.pathname === tab.path ||
                              (tab.path === "/notifications" && location.pathname === "/notifications");
          const isBookings  = tab.label === "Bookings";
          const isAlerts    = tab.label === "Alerts";

          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 relative tap-scale select-none"
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              {isBookings ? (
                /* ── Centre floating CTA pill ── */
                <div className="relative flex flex-col items-center">
                  <div
                    className="w-14 h-11 rounded-[18px] flex items-center justify-center -mt-5 transition-all duration-200"
                    style={
                      active
                        ? {
                            background: "linear-gradient(145deg, hsl(199 100% 50%), hsl(199 100% 38%))",
                            boxShadow: "var(--shadow-sky), 0 6px 18px hsl(199 80% 40% / 0.45)",
                          }
                        : {
                            background: "linear-gradient(145deg, hsl(199 100% 48%), hsl(199 100% 36%))",
                            boxShadow: "var(--shadow-sky), 0 4px 14px hsl(199 80% 40% / 0.35)",
                          }
                    }
                  >
                    <tab.icon
                      style={{
                        width: 22,
                        height: 22,
                        color: "white",
                        strokeWidth: 2.2,
                      }}
                    />
                  </div>
                  {/* Persistent glow ring to draw attention */}
                  {!active && (
                    <span
                      className="absolute -top-5 w-14 h-11 rounded-[18px] pointer-events-none"
                      style={{
                        boxShadow: "0 0 0 2px hsl(199 100% 60% / 0.35)",
                        animation: "pulse 2.4s ease-in-out infinite",
                      }}
                    />
                  )}
                </div>
              ) : (
                /* ── Regular tab ── */
                <div
                  className="relative w-10 h-8 rounded-xl flex items-center justify-center transition-all duration-150"
                  style={
                    active
                      ? {
                          background: "hsl(var(--background))",
                          boxShadow:
                            "inset 3px 3px 7px var(--neu-dark), inset -2px -2px 5px var(--neu-light)",
                        }
                      : {}
                  }
                >
                  <tab.icon
                    style={{
                      width: 19,
                      height: 19,
                      color: active
                        ? "hsl(var(--primary))"
                        : "hsl(var(--muted-foreground))",
                      strokeWidth: active ? 2.4 : 1.8,
                    }}
                  />

                  {/* Unread badge on Alerts */}
                  {isAlerts && unreadCount > 0 && (
                    <span
                      className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 rounded-full px-1 flex items-center justify-center text-white font-extrabold"
                      style={{
                        background: "hsl(0 84% 50%)",
                        fontSize: "9px",
                        lineHeight: 1,
                        boxShadow: "0 1px 6px hsl(0 84% 40% / 0.5)",
                      }}
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </div>
              )}

              <span
                className="text-[9px] font-bold leading-none"
                style={{
                  color: isBookings
                    ? active
                      ? "hsl(var(--primary))"
                      : "hsl(199 100% 40%)"
                    : active
                    ? "hsl(var(--primary))"
                    : "hsl(var(--muted-foreground))",
                  marginTop: isBookings ? "3px" : undefined,
                }}
              >
                {tab.label}
              </span>

              {/* Active dot indicator for non-bookings tabs */}
              {active && !isBookings && (
                <span
                  className="absolute bottom-0.5 w-1 h-1 rounded-full"
                  style={{
                    background: "hsl(var(--primary))",
                    boxShadow: "0 0 4px hsl(var(--primary))",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Inline keyframe for the pulse ring — avoids needing a global CSS change */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50%       { opacity: 0.15; transform: scale(1.08); }
        }
      `}</style>
    </nav>
  );
};

export default BottomNav;
