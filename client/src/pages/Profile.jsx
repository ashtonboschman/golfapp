import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useMessage } from "../context/MessageContext";
import { AsyncPaginate } from "react-select-async-paginate";

export default function Profile() {
  const { auth, login, logout } = useContext(AuthContext);
  const { showMessage, clearMessage } = useMessage();

  const token = auth?.token;
  const navigate = useNavigate();
  const BASE_URL = "http://localhost:3000";

  // -----------------------------
  // State
  // -----------------------------
  const [profile, setProfile] = useState({
    username: auth?.user?.username || "",
    email: auth?.user?.email || "",
    first_name: "",
    last_name: "",
    avatar_url: "",
    bio: "",
    gender: "unspecified",
    default_tee: "blue",
    favorite_course_id: null,
    dashboard_visibility: "private",
  });

  const [originalProfile, setOriginalProfile] = useState(profile);

  const [favoriteCourseOption, setFavoriteCourseOption] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // -----------------------------
  // Redirect if not authenticated
  // -----------------------------
  useEffect(() => {
    if (!token) navigate("/login", { replace: true });
  }, [token, navigate]);

  // -----------------------------
  // Helper: Set favorite course state
  // -----------------------------
  const setFavoriteCourse = (course) => {
    if (!course) {
      setFavoriteCourseOption(null);
      setProfile(prev => ({ ...prev, favorite_course_id: null }));
      return;
    }

    setProfile(prev => ({ ...prev, favorite_course_id: course.id }));
    setFavoriteCourseOption({
      value: course.id,
      label: `${course.course_name}`,
    });
  };

  // -----------------------------
  // Fetch user profile
  // -----------------------------
  useEffect(() => {
    const fetchUser = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const res = await fetch(`${BASE_URL}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401 || res.status === 403) {
          logout();
          navigate("/login", { replace: true });
          return;
        }

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Error loading profile");

        setProfile((prev) => ({ ...prev, ...data.user }));
        setOriginalProfile((prev) => ({ ...prev, ...data.user }));

        if (data.user.favorite_course_id) {
          try {
            const courseRes = await fetch(
              `${BASE_URL}/api/courses/${data.user.favorite_course_id}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );

            if (courseRes.ok) {
              const courseData = await courseRes.json();
              setFavoriteCourse(courseData.course);
            }
          } catch (err) {
            console.error(err);
          }
        }
      } catch (err) {
        console.error(err);
        showMessage(err.message || "Error loading profile", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [token, navigate, logout]);

  // -----------------------------
  // Favorite Course Async Fetch
  // -----------------------------
  const loadCourseOptions = async (search, loadedOptions, { page }) => {
    try {
      const res = await fetch(
        `${BASE_URL}/api/courses?limit=20&page=${page || 1}${search ? `&search=${search}` : ""}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if ([401, 403].includes(res.status)) {
        logout();
        navigate("/login", { replace: true });
        return { options: [], hasMore: false, additional: { page: 1 } };
      }

      const data = await res.json();
      if (data.type === "error") throw new Error(data.message || "Error fetching courses");

      const options = Array.isArray(data.courses)
        ? data.courses.map((course) => ({
            value: course.id,
            label: `${course.course_name}`,
          }))
        : [];

      return {
        options,
        hasMore: options.length === 20,
        additional: { page: (page || 1) + 1 },
      };
    } catch (err) {
      console.error(err);
      showMessage(err.message || "Error fetching courses", "error");
      return { options: [], hasMore: false, additional: { page: 1 } };
    }
  };

  // -----------------------------
  // Handlers
  // -----------------------------
  const handleChange = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleCancel = () => {
    setEditing(false);
    setProfile(originalProfile);
    if (originalProfile.favorite_course_id) {
      setFavoriteCourse({
        id: originalProfile.favorite_course_id,
        course_name: favoriteCourseOption?.label || "",
      });
    } else {
      setFavoriteCourse(null);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    clearMessage();

    if (!profile.username.trim()) {
      showMessage("Username cannot be empty", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/users/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username: profile.username.trim(), email: profile.email }),
      });

      if (res.status === 401 || res.status === 403) {
        logout();
        navigate("/login", { replace: true });
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error updating profile");

      const profileRes = await fetch(`${BASE_URL}/api/users/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          first_name: profile.first_name,
          last_name: profile.last_name,
          avatar_url: profile.avatar_url,
          bio: profile.bio,
          gender: profile.gender,
          default_tee: profile.default_tee,
          favorite_course_id: profile.favorite_course_id,
          dashboard_visibility: profile.dashboard_visibility,
        }),
      });

      const profileData = await profileRes.json();
      if (!profileRes.ok) throw new Error(profileData.message || "Error updating profile details");

      showMessage(profileData.message || "Profile updated", profileData.type || "success");
      setEditing(false);
      login({ user: { ...auth.user, username: profile.username.trim() }, token });
      setOriginalProfile(profile);

      // Refresh favorite course label
      if (profile.favorite_course_id) {
        const courseRes = await fetch(`${BASE_URL}/api/courses/${profile.favorite_course_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (courseRes.ok) {
          const courseData = await courseRes.json();
          setFavoriteCourse(courseData.course);
        }
      }
    } catch (err) {
      console.error(err);
      showMessage(err.message || "Error updating profile", "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    clearMessage();

    const { currentPassword, newPassword, confirmPassword } = passwords;
    if (!currentPassword || !newPassword || !confirmPassword) {
      showMessage("All fields are required", "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      showMessage("New passwords do not match", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/users/change-password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (res.status === 401 || res.status === 403) {
        logout();
        navigate("/login", { replace: true });
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error changing password");

      showMessage(data.message || "Password updated successfully", data.type || "success");
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setShowPasswordForm(false);
    } catch (err) {
      console.error(err);
      showMessage(err.message || "Error changing password", "error");
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------
  // Render
  // -----------------------------
  return (
    <div className="page-stack">
      <form onSubmit={handleSave} className="card flex flex-column gap-12">
        {/* Avatar display */}
        <div className="avatar-wrapper mb-4">
          <img
            src={profile.avatar_url || "/avatars/default.png"}
            alt="User Avatar"
            className="avatar"
          />
        </div>

        <label className="form-label">Username:</label>
        <input
          type="text"
          value={profile.username}
          disabled={!editing || loading}
          onChange={(e) => handleChange("username", e.target.value)}
          className="form-input"
        />

        <label className="form-label">Email:</label>
        <input type="email" value={profile.email} disabled className="form-input disabled" />

        <label className="form-label">First Name:</label>
        <input
          type="text"
          value={profile.first_name}
          disabled={!editing || loading}
          onChange={(e) => handleChange("first_name", e.target.value)}
          className="form-input"
        />

        <label className="form-label">Last Name:</label>
        <input
          type="text"
          value={profile.last_name}
          disabled={!editing || loading}
          onChange={(e) => handleChange("last_name", e.target.value)}
          className="form-input"
        />

        <label className="form-label">Bio:</label>
        <textarea
          value={profile.bio}
          disabled={!editing || loading}
          onChange={(e) => handleChange("bio", e.target.value)}
          className="form-input"
        />

        <label className="form-label">Gender:</label>
        <select
          value={profile.gender}
          disabled={!editing || loading}
          onChange={(e) => handleChange("gender", e.target.value)}
          className="form-input"
        >
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="unspecified">Unspecified</option>
        </select>

        <label className="form-label">Default Tee:</label>
        <select
          value={profile.default_tee}
          disabled={!editing || loading}
          onChange={(e) => handleChange("default_tee", e.target.value)}
          className="form-input"
        >
          <option value="black">Black</option>
          <option value="blue">Blue</option>
          <option value="white">White</option>
          <option value="red">Red</option>
          <option value="gold">Gold</option>
        </select>

        {/* Favorite Course using AsyncPaginate */}
        <label className="form-label">Favorite Course:</label>
        <AsyncPaginate
          value={favoriteCourseOption}
          loadOptions={loadCourseOptions}
          onChange={(selected) => {
            setFavoriteCourse(selected?.value ? { id: selected.value, course_name: selected.label } : null);
          }}
          isDisabled={!editing || loading}
          isClearable={true}
          additional={{ page: 1 }}
          placeholder="Search or Select Course"
        />

        <label className="form-label">Dashboard Visibility:</label>
        <select
          value={profile.dashboard_visibility}
          disabled={!editing || loading}
          onChange={(e) => handleChange("dashboard_visibility", e.target.value)}
          className="form-input"
        >
          <option value="private">Private</option>
          <option value="friends">Friends</option>
          <option value="public">Public</option>
        </select>

        <div className="form-actions">
          {editing ? (
            <>
              <button
                type="button"
                className="btn btn-cancel"
                onClick={handleCancel}
                disabled={loading}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-save" disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-edit" onClick={() => setEditing(true)}>
              Edit Profile
            </button>
          )}
        </div>
      </form>

      {showPasswordForm ? (
        <form onSubmit={handlePasswordChange} className="card flex flex-column gap-12">
          <label className="form-label">Current Password:</label>
          <input
            type="password"
            value={passwords.currentPassword}
            onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
            className="form-input"
            required
            disabled={loading}
          />
          <label className="form-label">New Password:</label>
          <input
            type="password"
            value={passwords.newPassword}
            onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
            className="form-input"
            required
            disabled={loading}
          />
          <label className="form-label">Confirm New Password:</label>
          <input
            type="password"
            value={passwords.confirmPassword}
            onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
            className="form-input"
            required
            disabled={loading}
          />

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-cancel"
              onClick={() => setShowPasswordForm(false)}
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-save" disabled={loading}>
              {loading ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      ) : (
        <div className="card flex justify-center">
          <button
            type="button"
            className="btn btn-toggle"
            onClick={() => setShowPasswordForm(true)}
            disabled={loading}
          >
            Change Password
          </button>
        </div>
      )}

      <div className="card flex justify-center">
        <button
          type="button"
          className="btn btn-logout"
          onClick={() => {
            logout();
            navigate("/login", { replace: true });
          }}
          disabled={loading}
        >
          Logout
        </button>
      </div>
    </div>
  );
}