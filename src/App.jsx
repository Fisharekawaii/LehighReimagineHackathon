"use client";
import React, { useEffect, useState, useCallback } from "react";
import {
  LayoutDashboard,
  Wallet,
  Map,
  Compass,
  Users,
  Plus,
  ChevronDown,
  ArrowUpRight,
  ArrowRight,
  Sparkles,
  Menu,
  X,
  Check,
  RefreshCw,
  LogOut,
  Link,
  Sun,
  Briefcase,
  CalendarDays,
  Trash2,
} from "lucide-react";
import { tiltCard, resetTilt } from "./lib/motion";
import AuthForm from "./features/auth/AuthForm";
import { api } from "./lib/api";
import { money, dateRange, firstName } from "./lib/format";
import {
  Brand,
  Avatar,
  Button,
  Tag,
  Empty,
  ErrorMessage,
  Modal,
} from "./components/UI";
import { CreateTrip, JoinTrip, InviteTrip } from "./features/trips/TripForms";
import Overview from "./features/trips/Overview";
import { Budget, ItemForm } from "./features/budget/Budget";
import { Pool, ContributionForm } from "./features/pool/Pool";
import Itinerary from "./features/itinerary/Itinerary";
import Explore from "./features/explore/Explore";
import Assistant from "./features/assistant/Assistant";
import { themeImages } from "./config/assets";
const tabs = [
  ["overview", "Overview", LayoutDashboard],
  ["budget", "Plan & budget", Wallet],
  ["itinerary", "Itinerary & map", Map],
  ["explore", "Explore", Compass],
  ["pool", "Contributions", Users],
];
export default function App() {
  const [user, setUser] = useState(null),
    [profiles, setProfiles] = useState([]),
    [trips, setTrips] = useState([]),
    [tripId, setTripId] = useState(null),
    [tab, setTab] = useState("overview"),
    [modal, setModal] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [toast, setToast] = useState(null),
    [mobile, setMobile] = useState(false),
    [joinCode, setJoinCode] = useState(""),
    [syncError,setSyncError] = useState(false),
    [deleteError,setDeleteError] = useState("");
  const trip = trips.find((t) => t.id === tripId);
  const notify = useCallback(
    (text, isError = false) => setToast({ text, isError }),
    [],
  );
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5500);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  async function loadTrips() {
    const data = await api("/trips");
    setTrips(data);
    return data;
  }
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const p = await api("/demo-users");
        if (!active) return;
        setProfiles(p);
        const code =
          new URLSearchParams(window.location.search).get("join") || "";
        setJoinCode(code);
        try {
          const u = await api("/me");
          if (!active) return;
          setUser(u);
          await loadTrips();
          if (code) setModal({ type: "join" });
        } catch (e) {
          if (e.status !== 401) throw e;
        }
      } catch (e) {
        if (active) setError(e.message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  // Shared server state: poll while visible; refresh immediately on focus.
  useEffect(() => {
    if (!user) return;
    const refresh = () => {
      api("/trips")
        .then(data=>{setTrips(data);setSyncError(false);})
        .catch(() => setSyncError(true));
    };
    const timer = setInterval(() => {
      if (!document.hidden) refresh();
    }, 5000);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [user]);
  function update(next) {
    setTrips((prev) =>
      prev.some((t) => t.id === next.id)
        ? prev.map((t) => (t.id === next.id ? next : t))
        : [...prev, next],
    );
  }
  function savedTrip(next) {
    update(next);
    setTripId(next.id);
    setTab("overview");
    setModal(null);
    if (joinCode) {
      setJoinCode("");
      window.history.replaceState({}, "", window.location.pathname);
    }
    notify("Trip saved.");
  }
  function savedItem(next) {
    update(next);
    setModal(null);
    notify("Saved to your trip.");
  }
  async function login(id) {
    setBusy(true);
    setError("");
    try {
      const u = await api("/demo-login", "POST", { userId: id });
      setUser(u);
      setTripId(null);
      await loadTrips();
      setModal(joinCode ? { type: "join" } : null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    try {
      await api("/logout", "POST");
      setUser(null);
      setTripId(null);
      setTrips([]);
    } catch (e) {
      notify(e.message, true);
    }
  }
  const onAdd = (category = "Stays") =>
      trip?.canEdit
        ? setModal({ type: "item", category })
        : notify("Ask the organizer for edit access.", true),
    onEdit = (item) =>
      trip?.canEdit
        ? setModal({ type: "item", item })
        : notify("You have view access to this trip.");
  if (loading)
    return (
      <div className="loading-screen">
        <Brand />
        <RefreshCw className="spin" size={23} />
        <p>Loading your trips…</p>
      </div>
    );
  if (!user)
    return (
      <div className="login-layout">
        <div
          className="login-art"
          style={{ "--travel-photo": `url(${themeImages.coast})` }}
        >
          <Brand />
          <div className="login-story">
            <h1>
              Good trips.
              <br />
              Great people.
              <br />
              <em>All together.</em>
            </h1>
            <p>
              Plan your trip, share the budget, and keep everyone in sync.
            </p>
          </div>

        </div>
        <main className="login-panel">

          <h2>
            Welcome to DayTripper
          </h2>
          <AuthForm
            onSignedIn={async (u) => {
              setUser(u);
              await loadTrips();
              setModal(joinCode ? { type: "join" } : null);
            }}
          />
          {profiles.length > 0 && (
            <details>
              <summary>Demo profiles</summary>
              <div className="profile-list">
                {profiles.map((p) => (
                  <button key={p.id} onClick={() => login(p.id)}>
                    <Avatar user={p} />
                    {p.name}
                  </button>
                ))}
              </div>
            </details>
          )}
          <ErrorMessage error={error} />
        </main>
      </div>
    );
  return (
    <div className={"app-shell vibe-" + (trip?.theme || "coast")}>
      <aside className={"sidebar " + (mobile ? "open" : "")}>
        <Brand />
        <button
          className="mobile-close icon-btn"
          onClick={() => setMobile(false)}
          aria-label="Close menu"
        >
          <X />
        </button>
        <button
          className={"workspace-switch " + (!trip ? "selected" : "")}
          onClick={() => {
            setTripId(null);
            setMobile(false);
          }}
        >
          <span className="workspace-icon">
            <Briefcase size={19} />
          </span>
          <span>
            <strong>My getaways</strong>
            <small>
              {trips.length} {trips.length === 1 ? "trip" : "trips"}
            </small>
          </span>
          <ChevronDown size={16} />
        </button>

        <div className="sidebar-postcard">
          <div className="sidebar-postcard-photo" style={{backgroundImage: `url(${themeImages[trip?.theme || "coast"]})`}} />
          <div className="sidebar-postcard-label"><span title={trip?.title || "Your next getaway"}>{trip?.title || "Your next getaway"}</span><ArrowUpRight size={18} aria-hidden="true" /></div>
          <span className="sidebar-postcard-tape" aria-hidden="true" />
        </div>
        <nav key={trip?.id || "no-trip"} className={trip ? "trip-nav-ready" : ""} aria-label="Trip sections">
          {tabs.map(([id, label, Icon], index) => (
            <button
              key={id}
              style={{"--nav-order": index}}
              aria-current={trip && tab === id ? "page" : undefined}
              disabled={!trip}
              className={trip && tab === id ? "active" : ""}
              onClick={() => {
                setTab(id);
                setMobile(false);
              }}
            >
              <span className="nav-number" aria-hidden="true">0{index + 1}</span>
              <Icon size={19} />
              <span>
                {id === "pool" && trip?.mode === "planning"
                  ? "Your group"
                  : label}
              </span>
              {id === "pool" &&
                trip?.payments.some((p) => p.status === "pending") && (
                  <span className="nav-dot" />
                )}
            </button>
          ))}
        </nav>
        <button
          className="new-trip-nav"
          onClick={() => {
            setModal({ type: "create" });
            setMobile(false);
          }}
        >
          <Plus size={18} />
          New trip
        </button>
        <div className="sidebar-bottom">
          <div className="assistant-promo">
            <button
              disabled={!trip}
              onClick={() => {
                setModal({ type: "assistant" });
                setMobile(false);
              }}
            >
              Demo assistant <ArrowUpRight size={16} />
            </button>
          </div>
          <div className="user-profile">
            <Avatar user={user} />
            <div>
              <strong>{firstName(user)}</strong>
              <small>Traveler account</small>
            </div>
            <button
              className="icon-btn"
              title="Sign out"
              aria-label="Sign out"
              onClick={logout}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      {mobile && (
        <div className="mobile-backdrop" onClick={() => setMobile(false)} />
      )}
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="mobile-menu icon-btn"
              onClick={() => setMobile(true)}
              aria-label="Open menu"
            >
              <Menu />
            </button>
            <button onClick={() => setTripId(null)}>My getaways</button>
            {trip && (
              <>
                <span>/</span>
                <span>{trip.title}</span>
              </>
            )}
          </div>
          <div className="topbar-actions">
            <span className="saved-indicator">
              <span className="status-dot" />
              {syncError ? "Connection lost · retrying" : "Synced"}
            </span>
            <button
              className="icon-btn"
              aria-label="Refresh trips"
              onClick={async () => {
                try {
                  await loadTrips();
                  notify("Up to date.");
                } catch (e) {
                  notify(e.message, true);
                }
              }}
            >
              <RefreshCw size={16} />
            </button>
            {trip && (
              <Button
                variant="secondary small-btn"
                onClick={() => setModal({ type: "invite" })}
              >
                <Users size={16} />
                Invite friends
              </Button>
            )}
          </div>
        </header>
        <main className="main-content" key={`${trip?.id || "home"}-${tab}`}>
          {!trip ? (
            <>
              <div className="home-heading">
                <div>

                  <h1>My getaways</h1>
                  <p className="muted">
                    {trips.length} {trips.length === 1 ? "trip" : "trips"} · Welcome back, {firstName(user)}
                  </p>
                </div>
                <div className="home-actions">
                  <Button
                    variant="secondary"
                    onClick={() => setModal({ type: "join" })}
                  >
                    <Link size={16} />
                    Join a trip
                  </Button>
                  <Button onClick={() => setModal({ type: "create" })}>
                    <Plus size={17} />
                    Create a trip
                  </Button>
                </div>
              </div>
              {trips.length ? (
                <div className="trip-grid">
                  {trips.map((t) => (
                    <div className="trip-tile-wrap" key={t.id}>
                    <button
                      className={"trip-tile " + t.theme}
                      onPointerMove={tiltCard} onPointerLeave={resetTilt} onPointerCancel={resetTilt}
                      key={t.id}
                      onClick={() => {
                        setTripId(t.id);
                        setTab("overview");
                      }}
                    >
                      <div
                        className="trip-tile-image"
                        style={{
                          "--travel-photo": `url(${themeImages[t.theme]})`,
                        }}
                      >
                        <Tag>
                          {t.mode === "pool" ? "Shared pool" : "Planning only"}
                        </Tag>
                        <span>
                          <ArrowUpRight size={21} />
                        </span>
                      </div>
                      <div className="trip-tile-body">
                        <p className="eyebrow">{t.destination}</p>
                        <h2>{t.title}</h2>
                        <p>
                          <CalendarDays size={14} />
                          {dateRange(t)}
                        </p>
                        <div className="trip-tile-footer">
                          <div className="avatar-stack">
                            {t.members.map((m) => (
                              <Avatar key={m.id} user={m} small />
                            ))}
                          </div>
                          <span>
                            <strong>{money(t.totals.estimatedCents)}</strong>
                            <small>trip estimate</small>
                          </span>
                        </div>
                      </div>
                    </button>
                    {t.role === "organizer" && <button className="trip-delete-button" aria-label={"Delete trip " + t.title} title="Delete trip" onClick={() => {setDeleteError("");setModal({type:"delete-trip",trip:t});}}><Trash2 size={16}/><span>Delete</span></button>}
                    </div>
                  ))}
                  <button
                    className="new-trip-tile"
                    onClick={() => setModal({ type: "create" })}
                  >
                    <span>
                      <Plus size={25} />
                    </span>
                    <h3>Create a trip</h3>
                  </button>
                </div>
              ) : (
                <div
                  className="welcome-hero"
                  style={{ "--travel-photo": `url(${themeImages.coast})` }}
                >
                  <div>

                    <h2>
                      Your first getaway
                    </h2>
                    <p>
                      Choose a destination and invite your group.
                    </p>
                    <Button onClick={() => setModal({ type: "create" })}>
                      Plan your first getaway <ArrowUpRight size={18} />
                    </Button>
                  </div>

                </div>
              )}
            </>
          ) : tab === "overview" ? (
            <Overview
              trip={trip}
              user={user}
              onUpdate={update}
              notify={notify}
              onTab={setTab}
              onAdd={onAdd}
              onInvite={() => setModal({ type: "invite" })}
            />
          ) : tab === "budget" ? (
            <Budget
              trip={trip}
              onUpdate={update}
              onAdd={onAdd}
              onEdit={onEdit}
              notify={notify}
            />
          ) : tab === "pool" ? (
            <Pool
              trip={trip}
              user={user}
              onUpdate={update}
              onInvite={() => setModal({ type: "invite" })}
              onContribute={() => setModal({ type: "contribution" })}
              notify={notify}
            />
          ) : tab === "itinerary" ? (
            <Itinerary
              trip={trip}
              onAdd={onAdd}
              onEdit={onEdit}
              onUpdate={update}
              notify={notify}
            />
          ) : (
            <Explore key={trip.id} trip={trip} onAdd={onAdd} onDraft={draft => trip.canEdit && setModal({type: "item", draft})} />
          )}
        </main>
        <footer className="app-footer"><span>DayTripper</span></footer>
      </div>
      {trip && (
        <button
          className="assistant-fab"
          onClick={() => setModal({ type: "assistant" })}
        >
          <Sparkles size={19} />
          <span>Trip copilot</span>
          <Tag>Demo</Tag>
        </button>
      )}
      {toast && (
        <div
          className={"toast " + (toast.isError ? "error" : "")}
          role={toast.isError ? "alert" : "status"}
        >
          {!toast.isError && <span className="save-sparkles" aria-hidden="true">{Array.from({length:8}, (_,i)=><i key={i} style={{"--particle":i}}/>)}</span>}
          {toast.isError ? <X size={18} /> : <Check size={18} />}
          <span>{toast.text}</span>
          <button
            onClick={() => setToast(null)}
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      )}
      {modal?.type === "create" && (
        <CreateTrip onClose={() => setModal(null)} onSaved={savedTrip} />
      )}{" "}
      {modal?.type === "join" && (
        <JoinTrip
          initialCode={joinCode}
          onClose={() => setModal(null)}
          onSaved={savedTrip}
        />
      )}{" "}
      {trip && modal?.type === "invite" && (
        <InviteTrip
          trip={trip}
          onUpdate={update}
          onClose={() => setModal(null)}
        />
      )}{" "}
      {trip && modal?.type === "item" && (
        <ItemForm
          trip={trip}
          item={modal.item}
          initialDraft={modal.draft}
          category={modal.category}
          onClose={() => setModal(null)}
          onSaved={savedItem}
        />
      )}{" "}
      {trip && modal?.type === "contribution" && (
        <ContributionForm
          trip={trip}
          onClose={() => setModal(null)}
          onSaved={savedItem}
        />
      )}{" "}
      {modal?.type === "delete-trip" && (
        <Modal title="Delete this getaway?" subtitle={modal.trip.title} onClose={() => !busy && setModal(null)}>
          <div className="form-stack">
            <p>This permanently deletes the trip for everyone, including its plans, itinerary, invitations and contribution records. Payments made outside DayTripper are unaffected.</p>
            <ErrorMessage error={deleteError}/>
            <div className="delete-trip-actions">
              <Button variant="secondary" disabled={busy} onClick={() => setModal(null)}>Keep trip</Button>
              <Button className="danger-button" busy={busy} onClick={async () => {
                setBusy(true);setDeleteError("");
                try {
                  const id=modal.trip.id;
                  await api(`/trips/${id}`,"DELETE");
                  setTrips(prev => prev.filter(t => t.id !== id));
                  if(tripId === id)setTripId(null);
                  setModal(null);notify("Trip deleted.");
                  await loadTrips();
                } catch(e){setDeleteError(e.message);} finally {setBusy(false);}
              }}><Trash2 size={16}/>Delete trip</Button>
            </div>
          </div>
        </Modal>
      )}
      {trip && modal?.type === "assistant" && (
        <Assistant
          trip={trip}
          onClose={() => setModal(null)}
          onSaved={savedItem}
        />
      )}
    </div>
  );
}
