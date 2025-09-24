// src/routes/SignUp/SignUp.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../App.css";
import Input from "../../components/general_components/Input/Input";
import { useDarkMode } from "../DarkModeToggle/DarkModeContext";
import NutrihelpLogo from "./Nutrihelp_Logo.PNG";
import "./SignUp.css";
import FramerClient from "../../components/framer-client";
import { UserIcon } from "lucide-react";

// ✅ Single source of truth for API calls
import api, { auth as apiAuth } from "../../apiClient"; // adjust path if needed

const SignUp = () => {
  const [contact, setContact] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const { darkMode } = useDarkMode();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    const { firstName, lastName, email, password, confirmPassword } = contact;

    if (!firstName.trim() || !lastName.trim()) {
      setErrorMsg("Please enter your first and last name.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    const payload = {
      name: `${firstName} ${lastName}`.trim(),
      email: email.trim().toLowerCase(),
      password,
      contact_number: "0412345678",
      address: "Placeholder address 123",
    };

    try {
      setLoading(true);

      // Uses API_BASE from apiClient.js (Render by default).
      // Tries /auth/register, then falls back to /signup.
      await apiAuth.register(payload);

      // ✅ After successful signup, go to /home
      navigate("/home");
    } catch (err) {
      const msg = err?.message || "Sign up failed. Please try again.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setContact((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <FramerClient>
      <div className={`h-screen w-screen ${darkMode && "bg-[#555555]"}`}>
        <div className="h-auto w-[70%] flex flex-col md:flex-row justify-center items-center mt-24 ml-auto mr-auto shadow-2xl border-none rounded-2xl overflow-hidden p-[20px] pb-14">
          <div className="w-[100%]">
            <img
              src={NutrihelpLogo}
              alt="Nutrihelp Logo"
              className="rounded-xl w-[500px] mx-auto"
            />

            <form onSubmit={handleSubmit}>
              <div className="user">
                <div className="first">
                  <Input
                    label="First Name*"
                    name="firstName"
                    type="text"
                    placeholder="First Name"
                    onChange={handleChange}
                    value={contact.firstName}
                    darkMode={darkMode}
                    required
                  />
                </div>
                <div className="last">
                  <Input
                    label="Last Name*"
                    name="lastName"
                    type="text"
                    placeholder="Last Name"
                    onChange={handleChange}
                    value={contact.lastName}
                    darkMode={darkMode}
                    required
                  />
                </div>
              </div>

              <div className="user">
                <div className="first">
                  <Input
                    label="Email*"
                    name="email"
                    type="email"
                    placeholder="Email"
                    onChange={handleChange}
                    value={contact.email}
                    darkMode={darkMode}
                    required
                  />
                </div>
                <div className="last">
                  <Input
                    label="Password*"
                    name="password"
                    type="password"
                    placeholder="Password"
                    onChange={handleChange}
                    value={contact.password}
                    darkMode={darkMode}
                    required
                  />
                </div>
              </div>

              <Input
                label="Confirm Password*"
                name="confirmPassword"
                type="password"
                placeholder="Confirm Password"
                onChange={handleChange}
                value={contact.confirmPassword}
                darkMode={darkMode}
                required
              />

              {errorMsg && (
                <p className="mt-2 text-red-600 font-medium">{errorMsg}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full rounded-md mt-4 text-2xl font-bold flex justify-center gap-3 items-center ${
                  darkMode
                    ? "bg-purple-700 hover:bg-purple-500"
                    : "bg-purple-400 text-gray-800 hover:bg-purple-700 hover:text-white"
                }`}
              >
                <UserIcon size={24} />
                {loading ? "Signing up..." : "Sign Up"}
              </button>
            </form>

            <p className="text-2xl font-semibold text-center mt-4 mb-4">Or</p>
            <button
              type="button"
              className={`w-full rounded-md mb-6 text-2xl font-bold flex justify-center gap-3 items-center ${
                darkMode
                  ? "bg-green-700 hover:bg-green-500"
                  : "bg-green-500 text-gray-800 hover:bg-green-700 hover:text-white"
              }`}
            >
              <img
                src="https://static.vecteezy.com/system/resources/previews/022/613/027/non_2x/google-icon-logo-symbol-free-png.png"
                className="w-[25px]"
                alt="Google"
              />
              Sign In With Google
            </button>

            <div className="text-sm text-center text-gray-500">
              Already have an account?
              <span>
                <Link
                  to="/login"
                  className={`ml-3 ${
                    darkMode ? "text-purple-300" : "text-purple-800"
                  }`}
                >
                  Login
                </Link>
              </span>
            </div>
          </div>

          <div className="flex flex-col justify-center items-center m-auto">
            <img
              src="https://cdni.iconscout.com/illustration/premium/thumb/woman-watching-food-menu-while-checkout-order-using-application-illustration-download-in-svg-png-gif-file-formats--online-service-mobile-app-pack-e-commerce-shopping-illustrations-10107922.png"
              alt="Nutrihelp Illustration"
            />
          </div>
        </div>
      </div>
    </FramerClient>
  );
};

export default SignUp;
