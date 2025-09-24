
// import React, { useState, useEffect } from "react";
// import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
// import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
// import { Home, BarChart2, PieChart as PieIcon } from "lucide-react";
// import "./FitnessJourney.css";

// const FitnessJourney = () => {
//   const [fitnessData, setFitnessData] = useState(null);
//   const [visibleWeeks, setVisibleWeeks] = useState(12); // Start with Week 1
//   const [selectedWeek, setSelectedWeek] = useState(null);
//   const [completedWeeks, setCompletedWeeks] = useState([]);
//   const [points, setPoints] = useState(0);
//   const [activePage, setActivePage] = useState("weekly");

//   useEffect(() => {
//     const fetchFitnessData = async () => {
//       try {
//         const res = await fetch("http://localhost:80/api/fitness-Journey");
//         const data = await res.json();
//         setFitnessData(Array.isArray(data) ? data[data.length - 1] : data);
//       } catch (error) {
//         console.error("Error fetching fitness data:", error);
//       }
//     };

//     fetchFitnessData();
//   }, []);

//   const generateWeeklyPlan = () => {
//     if (!fitnessData) return [];

//     const { weight, target_weight } = fitnessData;
//     const currentWeight = parseFloat(weight);
//     const goalWeight = parseFloat(target_weight);

//     if (isNaN(currentWeight) || isNaN(goalWeight)) return [];

//     const totalChange = goalWeight - currentWeight;
//     const weeks = 12;
//     const weightChangePerWeek = totalChange / weeks;

//     return Array.from({ length: weeks }, (_, i) => ({
//       week: i + 1,
//       goal: `Week ${i + 1}`,
//       targetWeight: currentWeight + (i + 1) * weightChangePerWeek,
//     }));
//   };

//   const weeklyPlan = generateWeeklyPlan().filter(
//     (week) => !completedWeeks.includes(week.week)
//   );

//   const handleWeekClick = (week) => {
//     setSelectedWeek(week);
//   };

//   const handleCompleteWeek = () => {
//     if (selectedWeek && !completedWeeks.includes(selectedWeek.week)) {
//       setCompletedWeeks([...completedWeeks, selectedWeek.week]);
//       setPoints(points + 10);
//       setSelectedWeek(null);
//     }
//   };

//   return (
//     <div className="fitness-journey">
//       <div className="score">
//         <p>Your Fitness Journey</p>
//         <div className="">⭐ {points} pts</div>
//       </div>
//       <div className="feature-picker">
//         <Home onClick={() => setActivePage("weekly")} />
//         <BarChart2 onClick={() => setActivePage("progress")} />
//         <PieIcon onClick={() => setActivePage("stats")} />
//       </div>
//       {!fitnessData ? (
//         <p>Loading fitness data...</p>
//       ) : (
//         <div className="weekly-plan">
//           {weeklyPlan.slice(0, visibleWeeks).map((week) => (
//             <div
//               key={week.week}
//               className={`week-plan ${selectedWeek?.week === week.week ? "selected" : ""}`}
//               onClick={() => handleWeekClick(week)}
//             >
//               <h3>{week.goal}</h3>
//               <p>Target Weight: {week.targetWeight.toFixed(2)} kg</p>
//             </div>
//           ))}
//         </div>
//       )}

//       {/* {selectedWeek && ( */}
//         <div className="progress">
//           {!selectedWeek ? (
//             <p>your fitness training would be shown here</p>
//           ):(
//           <div className="tips">
//             <h3>{selectedWeek.goal}</h3>
//             <p>Target: {selectedWeek.targetWeight.toFixed(2)} kg</p>
//             <p>Tip: Stay consistent with your workouts and diet this week!</p>
//             <button onClick={handleCompleteWeek}>Mark as Done ✅</button>
//           </div>         
//           )}
//         </div>
//     </div>
//   );
// };

// export default FitnessJourney;


// FitnessJourney.jsx
import React, { useState, useEffect, useCallback } from "react";
import { Home, BarChart2, PieChart as PieIcon } from "lucide-react";
import WeeklyPlanView from "./WeeklyPlanView.jsx"; // adjust path if needed
import StatsView from "./StatsView.jsx";
import "./FitnessJourney.css";

// Keep consistent with apiClient.js
const API_BASE =
  (window.__ENV__ && window.__ENV__.API_BASE) ||
  "https://nutrihelp-backend-deployment.onrender.com/api";

// Token key used in apiClient.js
const ACCESS_KEY = "nh_access";
const getAccess = () => localStorage.getItem(ACCESS_KEY);

const FitnessJourney = () => {
  const [fitnessData, setFitnessData] = useState(null);
  const [visibleWeeks, setVisibleWeeks] = useState(12);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [completedWeeks, setCompletedWeeks] = useState(() => {
    // Persist across reloads
    try {
      const saved = localStorage.getItem("nh_completed_weeks");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [points, setPoints] = useState(() => {
    try {
      const saved = localStorage.getItem("nh_points");
      return saved ? Number(saved) : 0;
    } catch {
      return 0;
    }
  });
  const [activePage, setActivePage] = useState("weekly");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const persistProgress = (weeks, pts) => {
    try {
      localStorage.setItem("nh_completed_weeks", JSON.stringify(weeks));
      localStorage.setItem("nh_points", String(pts));
    } catch {}
  };

  const fetchFitnessData = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const headers = {};
      const token = getAccess();
      if (token) headers["Authorization"] = `Bearer ${token}`;

      // Normalize to lowercase path
      const res = await fetch(`${API_BASE}/fitness-journey`, {
        method: "GET",
        headers,
        credentials: "include",
      });

      let data = null;
      try {
        data = await res.json();
      } catch {
        // no body
      }

      if (!res.ok) {
        const msg =
          (data && (data.error || data.message)) ||
          `Failed to load (status ${res.status})`;
        throw new Error(msg);
      }

      // If API returns an array, use the latest item; else use the object
      const latest = Array.isArray(data) ? data[data.length - 1] : data;
      setFitnessData(latest || null);
    } catch (e) {
      setErr(e?.message || "Unable to fetch fitness data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFitnessData();
  }, [fetchFitnessData]);

  const handleWeekClick = (week) => {
    setSelectedWeek(week);
  };

  const handleCompleteWeek = () => {
    if (selectedWeek && !completedWeeks.includes(selectedWeek.week)) {
      const updatedWeeks = [...completedWeeks, selectedWeek.week];
      const updatedPoints = points + 10;
      setCompletedWeeks(updatedWeeks);
      setPoints(updatedPoints);
      persistProgress(updatedWeeks, updatedPoints);
      setSelectedWeek(null);
    }
  };

  return (
    <div className="fitness-journey">
      <div className="score">
        <p>Your Fitness Journey</p>
        <div>⭐ {points} pts</div>
      </div>

      <div className="feature-picker">
        <div
          className={`feature-icon ${activePage === "weekly" ? "active" : ""}`}
          onClick={() => setActivePage("weekly")}
          title="Weekly Plan"
        >
          <Home />
        </div>
        <div
          className={`feature-icon ${activePage === "stats" ? "active" : ""}`}
          onClick={() => setActivePage("stats")}
          title="Stats"
        >
          <PieIcon />
        </div>
        <div
          className={`feature-icon ${activePage === "progress" ? "active" : ""}`}
          onClick={() => setActivePage("progress")}
          title="Progress (coming soon)"
        >
          <BarChart2 />
        </div>
      </div>

      {loading && <p className="hint">Loading your fitness journey...</p>}
      {!loading && err && (
        <div className="error">
          <p>{err}</p>
          <button className="retry-button" onClick={fetchFitnessData}>
            Retry
          </button>
        </div>
      )}

      {!loading && !err && activePage === "weekly" && (
        <WeeklyPlanView
          fitnessData={fitnessData}
          visibleWeeks={visibleWeeks}
          selectedWeek={selectedWeek}
          handleWeekClick={handleWeekClick}
          completedWeeks={completedWeeks}
          handleCompleteWeek={handleCompleteWeek}
          points={points}
        />
      )}

      {!loading && !err && activePage === "progress" && (
        <p>Progress feature coming soon...</p>
      )}

      {!loading && !err && activePage === "stats" && (
        <StatsView
          fitnessData={fitnessData}
          completedWeeksCount={completedWeeks.length}
        />
      )}
    </div>
  );
};

export default FitnessJourney;
