import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../backendservice/hooks";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash, faLock } from "@fortawesome/free-solid-svg-icons";
import "./AdminLogin.css";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);

  const navigate = useNavigate();
  const { login, error, isAuthenticated } = useAdminAuth();
  const isNavigatingRef = useRef(false);

  useEffect(() => {
    if (isAuthenticated && !isNavigatingRef.current) {
      isNavigatingRef.current = true;
      navigate("/admin-panel", { replace: true });
    } else if (!isAuthenticated) {
      isNavigatingRef.current = false;
    }
  }, [isAuthenticated]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    await login({ username, password });
    setLoading(false);
  };

  const openForgotPasswordModal = () => setShowForgotPasswordModal(true);
  const closeForgotPasswordModal = () => setShowForgotPasswordModal(false);

  return (
    <section className="admin">
      <div className="admin__hero">Admin Login</div>

      <div className="admin__card">
        <h2>Admin Login</h2>
        <form onSubmit={handleLogin} className="admin__form">
          <label>
            Username
            <input
              type="text"
              value={username}
              placeholder="Enter username"
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </label>

          <label>
            Password
            <div className="password-wrap">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                placeholder="Enter password"
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="eye-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="toggle password"
              >
                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
              </button>
            </div>
          </label>

          {error && <p className="error">{error}</p>}

          <button type="submit" className="signin-btn" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
          <button type="button" className="forgot-btn" onClick={openForgotPasswordModal}>
            Forgot password?
          </button>
        </form>
      </div>

      {showForgotPasswordModal && (
        <div className="forgot-password-overlay" onClick={closeForgotPasswordModal}>
          <div className="forgot-password-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <FontAwesomeIcon icon={faLock} style={{ marginRight: "8px" }} />
                Reset Password
              </h3>
              <button className="modal-close" onClick={closeForgotPasswordModal}>×</button>
            </div>
            <div className="modal-form">
              <p className="modal-description">
                Password resets must be performed by your system administrator.
                Please contact them to have your password reset.
              </p>
              <div className="modal-actions">
                <button type="button" className="btn-primary" onClick={closeForgotPasswordModal}>
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
