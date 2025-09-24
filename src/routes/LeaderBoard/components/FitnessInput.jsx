// import React, { useState } from "react";
// import "./FitnessInput.css"; // Assuming you've kept the existing styles in this file

// const FitnessInput = ({ onProfileSaved }) => {
//   const [currentFitness, setCurrentFitness] = useState({
//     weight: "",
//     height: "",
//     bodyType: "",
//   });
//   const [targetFitness, setTargetFitness] = useState({
//     targetWeight: "",
//     endGoal: "",
//   });
//   const [currentStep, setCurrentStep] = useState(1); // Step control (1 = current, 2 = target)

//   // Handle current fitness input change
//   const handleCurrentInputChange = (e) => {
//     const { name, value } = e.target;
//     setCurrentFitness({
//       ...currentFitness,
//       [name]: value,
//     });
//   };

//   // Handle target fitness input change
//   const handleTargetInputChange = (e) => {
//     const { name, value } = e.target;
//     setTargetFitness({
//       ...targetFitness,
//       [name]: value,
//     });
//   };

//   // Handle form submission
//   const handleSubmit = (e) => {
//     e.preventDefault();
//     if (currentStep === 1) {
//       setCurrentStep(2); // Move to target goal input
//     } else {
//       alert("Form submitted!");
//       // Process the data here (send to backend or store in state)
//       onProfileSaved();
//     }
//   };

//   return (
//     <div className="fitness-form-container">

//       <form onSubmit={handleSubmit}>
        
//         {/* Step 1: Current Fitness */}
//         {currentStep === 1 && (
          
//           <div className="current-fitness-form">
//             <h2>Personalize Your Health Tracker</h2>
//             <div className="form-group">
//               <label>Current Weight (kg):</label>
//               <input
//                 type="number"
//                 name="weight"
//                 value={currentFitness.weight}
//                 onChange={handleCurrentInputChange}
//                 className="form-input"
//               />
//             </div>
//             <div className="form-group">
//               <label>Current Height (cm):</label>
//               <input
//                 type="number"
//                 name="height"
//                 value={currentFitness.height}
//                 onChange={handleCurrentInputChange}
//                 className="form-input"
//               />
//             </div>
//             <div className="form-group">
//               <label>Body Type:</label>
//               <select
//                 name="bodyType"
//                 value={currentFitness.bodyType}
//                 onChange={handleCurrentInputChange}
//                 className="form-input"
//               >
//                 <option value="">Select Body Type</option>
//                 <option value="Ectomorph">Ectomorph (Lean)</option>
//                 <option value="Mesomorph">Mesomorph (Muscular)</option>
//                 <option value="Endomorph">Endomorph (Rounder)</option>
//               </select>
//             </div>
//             <button type="submit" className="next-button">Next: Set Target Goal</button>
//           </div>
//         )}

//         {/* Step 2: Target Goal */}
//         {currentStep === 2 && (
//           <div className="target-goal-form">
//             <h3>What is your target goal?</h3>

//             {/* Question 1: Target Weight */}
//             <div className="form-group">
//               <label>Target Weight (kg):</label>
//               <input
//                 type="number"
//                 name="targetWeight"
//                 value={targetFitness.targetWeight}
//                 onChange={handleTargetInputChange}
//                 className="form-input"
//               />
//             </div>

//             {/* Question 2: End Goal */}
//             <div className="form-group">
//               <label>End Goal:</label>
//               <select
//                 name="endGoal"
//                 value={targetFitness.endGoal}
//                 onChange={handleTargetInputChange}
//                 className="form-input"
//               >
//                 <option value="">Select End Goal</option>
//                 <option value="Gain Muscle">Gain Muscle</option>
//                 <option value="Gain Weight">Gain Weight</option>
//                 <option value="Lose Weight">Lose Weight</option>
//                 <option value="Maintain">Maintain Weight</option>
//                 <option value="Healthy Schedule">Just a Healthy Schedule</option>
//               </select>
//             </div>

//             <button type="submit" className="submit-button">Submit</button>
//           </div>
//         )}
//       </form>
//     </div>
//   );
// };

// export default FitnessInput;


// FitnessInput.jsx
import React, { useState } from "react";
import "./FitnessInput.css";

// Keep API base consistent with apiClient.js defaults
const API_BASE =
  (window.__ENV__ && window.__ENV__.API_BASE) ||
  "https://nutrihelp-backend-deployment.onrender.com/api";

// Same token keys used in apiClient.js
const TOKENS = {
  access: "nh_access",
};

const getAccess = () => localStorage.getItem(TOKENS.access);

const FitnessInput = ({ onProfileSaved }) => {
  const [currentFitness, setCurrentFitness] = useState({
    weight: "",
    height: "",
    bodyType: "",
  });
  const [targetFitness, setTargetFitness] = useState({
    targetWeight: "",
    endGoal: "",
  });
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleCurrentInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentFitness((prev) => ({ ...prev, [name]: value }));
  };

  const handleTargetInputChange = (e) => {
    const { name, value } = e.target;
    setTargetFitness((prev) => ({ ...prev, [name]: value }));
  };

  // Simple validators
  const validateStep1 = () => {
    const w = Number(currentFitness.weight);
    const h = Number(currentFitness.height);
    if (!w || w <= 0) return "Please enter a valid current weight.";
    if (!h || h <= 0) return "Please enter a valid current height.";
    if (!currentFitness.bodyType) return "Please select your body type.";
    return "";
  };

  const validateStep2 = () => {
    const tw = Number(targetFitness.targetWeight);
    if (!tw || tw <= 0) return "Please enter a valid target weight.";
    if (!targetFitness.endGoal) return "Please select an end goal.";
    return "";
  };

  // Optional: derived BMI (not submitted, just for UX if you want to display it)
  const heightMeters =
    currentFitness.height ? Number(currentFitness.height) / 100 : null;
  const bmi =
    heightMeters && Number(currentFitness.weight)
      ? (Number(currentFitness.weight) / (heightMeters * heightMeters)).toFixed(1)
      : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (currentStep === 1) {
      const err = validateStep1();
      if (err) {
        setErrorMsg(err);
        return;
      }
      setCurrentStep(2);
      return;
    }

    const err = validateStep2();
    if (err) {
      setErrorMsg(err);
      return;
    }

    // Prepare payload
    const payload = {
      weight: Number(currentFitness.weight),
      height: Number(currentFitness.height),
      bodyType: currentFitness.bodyType,
      targetWeight: Number(targetFitness.targetWeight),
      endGoal: targetFitness.endGoal,
    };

    setSubmitting(true);
    try {
      const headers = { "Content-Type": "application/json" };
      const token = getAccess();
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/fitness-journey`, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify(payload),
      });

      let data = null;
      try {
        data = await res.json();
      } catch {
        // ignore if no body
      }

      if (!res.ok) {
        const msg =
          (data && (data.error || data.message)) ||
          `Failed to save (status ${res.status})`;
        throw new Error(msg);
      }

      alert("Fitness journey saved successfully!");
      if (typeof onProfileSaved === "function") onProfileSaved();
    } catch (err2) {
      setErrorMsg(err2?.message || "Something went wrong while saving.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fitness-form-container">
      <form onSubmit={handleSubmit}>
        {currentStep === 1 && (
          <div className="current-fitness-form">
            <h2>Personalize Your Health Tracker</h2>

            <div className="form-group">
              <label>Current Weight (kg):</label>
              <input
                type="number"
                name="weight"
                value={currentFitness.weight}
                onChange={handleCurrentInputChange}
                className="form-input"
                min="1"
                step="0.1"
                required
              />
            </div>

            <div className="form-group">
              <label>Current Height (cm):</label>
              <input
                type="number"
                name="height"
                value={currentFitness.height}
                onChange={handleCurrentInputChange}
                className="form-input"
                min="1"
                step="0.1"
                required
              />
            </div>

            <div className="form-group">
              <label>Body Type:</label>
              <select
                name="bodyType"
                value={currentFitness.bodyType}
                onChange={handleCurrentInputChange}
                className="form-input"
                required
              >
                <option value="">Select Body Type</option>
                <option value="Ectomorph">Ectomorph (Lean)</option>
                <option value="Mesomorph">Mesomorph (Muscular)</option>
                <option value="Endomorph">Endomorph (Rounder)</option>
              </select>
            </div>

            {bmi && (
              <p className="hint">
                Estimated BMI: <strong>{bmi}</strong>
              </p>
            )}

            {errorMsg && <p className="error">{errorMsg}</p>}

            <button type="submit" className="next-button" disabled={submitting}>
              {submitting ? "Please wait..." : "Next: Set Target Goal"}
            </button>
          </div>
        )}

        {currentStep === 2 && (
          <div className="target-goal-form">
            <h3>What is your target goal?</h3>

            <div className="form-group">
              <label>Target Weight (kg):</label>
              <input
                type="number"
                name="targetWeight"
                value={targetFitness.targetWeight}
                onChange={handleTargetInputChange}
                className="form-input"
                min="1"
                step="0.1"
                required
              />
            </div>

            <div className="form-group">
              <label>End Goal:</label>
              <select
                name="endGoal"
                value={targetFitness.endGoal}
                onChange={handleTargetInputChange}
                className="form-input"
                required
              >
                <option value="">Select End Goal</option>
                <option value="Gain Muscle">Gain Muscle</option>
                <option value="Gain Weight">Gain Weight</option>
                <option value="Lose Weight">Lose Weight</option>
                <option value="Maintain">Maintain Weight</option>
                <option value="Healthy Schedule">Just a Healthy Schedule</option>
              </select>
            </div>

            {errorMsg && <p className="error">{errorMsg}</p>}

            <div className="actions">
              <button
                type="button"
                className="back-button"
                onClick={() => setCurrentStep(1)}
                disabled={submitting}
              >
                Back
              </button>
              <button type="submit" className="submit-button" disabled={submitting}>
                {submitting ? "Saving..." : "Submit"}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default FitnessInput;
