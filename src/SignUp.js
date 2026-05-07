import { useMemo, useState } from "react";
import "./signUp.css";
import { signUpUser, verifySignUpCode } from "./services/auth";
import { useNavigate } from "react-router-dom";

const initialForm = {
  username: "",
  email: "",
  phoneNumber: "",
  hotelName: "",
  city: "",
  password: "",
  confirmPassword: "",
  acceptTerms: false,
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\+?[0-9\s\-()]{7,20}$/;
// At least 8 chars, 1 uppercase, 1 lowercase, 1 special character
const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*[^A-Za-z0-9]).{8,}$/;

function SignUp() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [isOwnerSignUp, setIsOwnerSignUp] = useState(false);
  const [currentPage, setCurrentPage] = useState("signup");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [verificationNotice, setVerificationNotice] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationError, setVerificationError] = useState("");
  const [verificationSuccess, setVerificationSuccess] = useState("");
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [signUpRole, setSignUpRole] = useState("guest");

  const passwordRules = useMemo(
    () => ({
      minLength: form.password.length >= 8,
      hasUpper: /[A-Z]/.test(form.password),
      hasLower: /[a-z]/.test(form.password),
      hasSpecial: /[^A-Za-z0-9]/.test(form.password),
    }),
    [form.password]
  );

  const normalizePhone = (value) => value.trim().replace(/\s+/g, " ");
  const validate = (data) => {
    const nextErrors = {};

    if (!data.username.trim()) nextErrors.username = "Username is required.";
    if (!emailRegex.test(data.email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }
    if (!phoneRegex.test(data.phoneNumber.trim())) {
      nextErrors.phoneNumber = "Enter a valid phone number.";
    }
    if (isOwnerSignUp && !data.hotelName.trim()) {
      nextErrors.hotelName = "Hotel name is required.";
    }
    if (isOwnerSignUp && !data.city.trim()) {
      nextErrors.city = "City is required.";
    }
    if (!passwordRegex.test(data.password)) {
      nextErrors.password =
        "Password must be at least 8 characters with uppercase, lowercase, and special character.";
    }
    if (!data.confirmPassword) {
      nextErrors.confirmPassword = "Please confirm your password.";
    } else if (data.confirmPassword !== data.password) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }
    if (!data.acceptTerms) {
      nextErrors.acceptTerms = "You must accept the Terms and Privacy Policy.";
    }

    return nextErrors;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSubmitError("");
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSignUpModeToggle = () => {
    setIsOwnerSignUp((prev) => {
      const next = !prev;
      setSignUpRole(next ? "hotel_owner" : "guest");
      return next;
    });
    setForm(initialForm);
    setErrors({});
    setSubmitError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBackToSignUp = () => {
    setCurrentPage("signup");
    setForm(initialForm);
    setErrors({});
    setSubmitError("");
    setVerificationNotice("");
    setVerificationCode("");
    setVerificationError("");
    setVerificationSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    setSubmitError("");

    const payload = {
      username: form.username.trim(),
      email: form.email.trim().toLowerCase(),
      phoneNumber: normalizePhone(form.phoneNumber),
      role: isOwnerSignUp ? "hotel_owner" : "guest",
      password: form.password,
      acceptTerms: form.acceptTerms,
    };
    if (isOwnerSignUp) {
      payload.hotelName = form.hotelName.trim();
      payload.city = form.city.trim();
      payload.hotelId = form.hotelName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || payload.email.split('@')[0];
    }

    try {
      sessionStorage.setItem("pending_signup_role", payload.role);
      sessionStorage.setItem(
        "pending_signup_profile",
        JSON.stringify({
          username: payload.username,
          email: payload.email,
          role: payload.role,
          hotelId: payload.hotelId || null,
          hotelName: payload.hotelName || null,
        })
      );
    } catch (err) {}

    try {
      await signUpUser(payload);
      setSignUpRole(payload.role);
      setVerificationEmail(payload.email);
      setVerificationNotice("");
      setVerificationCode("");
      setVerificationError("");
      setVerificationSuccess("");
      setCurrentPage("verification");
      setForm(initialForm);
      setErrors({});
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setSubmitError(err.message || "Sign up failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationCodeChange = (e) => {
    setVerificationCode(e.target.value);
    setVerificationError("");
    setVerificationSuccess("");
  };

  const handleVerifyCodeSubmit = async (e) => {
    e.preventDefault();
    const normalizedCode = verificationCode.trim();
    if (!normalizedCode) {
      setVerificationError("Verification code is required.");
      return;
    }

    setVerifying(true);
    setVerificationError("");
    setVerificationSuccess("");

    try {
      await verifySignUpCode({ email: verificationEmail, code: normalizedCode });
      setVerificationSuccess("Code verified successfully.");
      const verifiedRole = (() => {
        try {
          return sessionStorage.getItem("pending_signup_role") || signUpRole || (isOwnerSignUp ? "hotel_owner" : "guest");
        } catch (err) {
          return signUpRole || (isOwnerSignUp ? "hotel_owner" : "guest");
        }
      })();

      try {
        localStorage.setItem("mock_auth_role", verifiedRole);
        const pendingProfileRaw = sessionStorage.getItem("pending_signup_profile");
        if (pendingProfileRaw) {
          const pendingProfile = JSON.parse(pendingProfileRaw);
          localStorage.setItem(
            "mock_auth_user",
            JSON.stringify({
              user: {
                username: pendingProfile.username || "Owner",
                email: pendingProfile.email || verificationEmail,
                role: pendingProfile.role || verifiedRole,
                hotelId: pendingProfile.hotelId || null,
                hotelName: pendingProfile.hotelName || null,
              },
            })
          );
        }
      } catch (e) {}

      if (verifiedRole === "hotel_owner") {
        navigate("/ownerhome", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } catch (err) {
      setVerificationError(err.message || "Unable to verify code.");
    } finally {
      setVerifying(false);
    }
  };

  if (currentPage === "verification") {
    return (
      <div className="page">
        <div className="overlay" />
        <main className="card">
          <h1>Verification</h1>
          <p className="subtitle">One more step to finish creating your account.</p>
          <p className="verification-copy">
            We sent a verification code to <strong>{verificationEmail || "your email"}</strong>.
            Enter it below to verify your account.
          </p>
          {verificationNotice && <p className="verification-note">{verificationNotice}</p>}
          <form onSubmit={handleVerifyCodeSubmit} noValidate>
            <label>
              Verification code
              <input
                name="verificationCode"
                type="text"
                value={verificationCode}
                onChange={handleVerificationCodeChange}
                placeholder="Enter verification code"
                autoComplete="one-time-code"
              />
            </label>
            <div className="verification-actions">
              <button type="submit" disabled={verifying}>
                {verifying ? "Verifying..." : "Verify code"}
              </button>
              <button type="button" onClick={handleBackToSignUp}>
                Back to sign up
              </button>
            </div>
            {verificationSuccess && <p className="success">{verificationSuccess}</p>}
            {verificationError && <p className="error submit-error">{verificationError}</p>}
          </form>
        </main>
      </div>
    );
  }

  return (
    <div className="page">
    
      <div className="overlay" />
      <main className="card">
        <h1>{isOwnerSignUp ? "Create hotel owner account" : "Create your account"}</h1>
        <p className="subtitle">
          {isOwnerSignUp ? "Sign up as a hotel owner" : "Sign up to continue"}
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <label>
            Username
            <input
              name="username"
              type="text"
              value={form.username}
              onChange={handleChange}
              placeholder="Enter username"
              autoComplete="username"
            />
            {errors.username && <span className="error">{errors.username}</span>}
          </label>

          <label>
            Email
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Enter email"
              autoComplete="email"
            />
            {errors.email && <span className="error">{errors.email}</span>}
          </label>

          <label>
            Phone number
            <input
              name="phoneNumber"
              type="tel"
              value={form.phoneNumber}
              onChange={handleChange}
              placeholder="+963 912345678"
              autoComplete="tel"
            />
            {errors.phoneNumber && (
              <span className="error">{errors.phoneNumber}</span>
            )}
          </label>

          {isOwnerSignUp && (
            <>
              <label>
                Hotel name
                <input
                  name="hotelName"
                  type="text"
                  value={form.hotelName}
                  onChange={handleChange}
                  placeholder="Enter hotel name"
                  autoComplete="organization"
                />
                {errors.hotelName && <span className="error">{errors.hotelName}</span>}
              </label>

              <label>
                City
                <input
                  name="city"
                  type="text"
                  value={form.city}
                  onChange={handleChange}
                  placeholder="Enter city"
                  autoComplete="address-level2"
                />
                {errors.city && <span className="error">{errors.city}</span>}
              </label>
            </>
          )}

          <label>
            Password
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Enter password"
              autoComplete="new-password"
            />
            {errors.password && <span className="error">{errors.password}</span>}
          </label>

          <ul className="password-hint">
            <li className={passwordRules.minLength ? "ok" : ""}>At least 8 characters</li>
            <li className={passwordRules.hasUpper ? "ok" : ""}>At least 1 uppercase letter</li>
            <li className={passwordRules.hasLower ? "ok" : ""}>At least 1 lowercase letter</li>
            <li className={passwordRules.hasSpecial ? "ok" : ""}>At least 1 special character</li>
          </ul>

          <label>
            Confirm password
            <input
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm password"
              autoComplete="new-password"
            />
            {errors.confirmPassword && (
              <span className="error">{errors.confirmPassword}</span>
            )}
          </label>

          <label className="checkbox-row">
            <input
              name="acceptTerms"
              type="checkbox"
              checked={form.acceptTerms}
              onChange={handleChange}
            />
            <span>
              I accept the <strong>Terms</strong> and <strong>Privacy Policy</strong>.
            </span>
          </label>
          {errors.acceptTerms && (
            <span className="error checkbox-error">{errors.acceptTerms}</span>
          )}

          <button type="submit" disabled={loading}>
            {loading ? "Signing up..." : "Sign Up"}
          </button>
          <button
            type="button"
            className="link-button"
            onClick={handleSignUpModeToggle}
          >
            {isOwnerSignUp ? "Back to regular sign up" : "Sign up as a hotel owner"}
          </button>

          {submitError && <p className="error submit-error">{submitError}</p>}
        </form>
      </main>
    </div>
  );
}

export default SignUp;
