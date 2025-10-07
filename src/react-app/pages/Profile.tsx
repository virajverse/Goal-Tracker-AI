import React, { useState } from "react";
import { useAuth } from "@/react-app/hooks/useCustomAuth";
import {
  User,
  Mail,
  Phone,
  Calendar,
  Edit2,
  Check,
  X,
  Upload,
  Shield,
} from "lucide-react";

interface ProfileForm {
  name: string;
  email: string;
  phone: string;
}

export default function Profile(): React.ReactElement | null {
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [formData, setFormData] = useState<ProfileForm>({
    name: user?.name ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
  });

  if (!user) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSave = async (): Promise<void> => {
    setLoading(true);
    try {
      await updateProfile(formData);
      setIsEditing(false);
    } catch (error) {
      console.error("Profile update failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = (): void => {
    setFormData({
      name: user.name ?? "",
      email: user.email ?? "",
      phone: user.phone ?? "",
    });
    setIsEditing(false);
  };

  const getJoinedDate = (): string => {
    // Since we don't have created_at from user, we'll use a placeholder
    return new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Profile Settings</h1>
        <p className="text-lg text-purple-200">Update your information</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-8">
        <div className="flex items-start gap-6">
          {/* Profile Picture */}
          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {user.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            <button className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all">
              <Upload className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* Profile Info */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">
                  {user.name}
                </h2>
                <p className="text-purple-200">
                  {user.email?.trim() ? user.email : user.phone}
                </p>
              </div>

              {!isEditing ? (
                <button
                  onClick={() => {
                    setIsEditing(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    {loading ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* Profile Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  <User className="w-4 h-4 inline mr-2" />
                  Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Your name"
                  />
                ) : (
                  <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white">
                    {user.name.trim() ? user.name : "Name not provided"}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  <Mail className="w-4 h-4 inline mr-2" />
                  Email
                  {user.is_email_verified && (
                    <span className="ml-2 text-xs bg-green-600 text-white px-2 py-1 rounded-full">
                      Verified
                    </span>
                  )}
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Your email"
                  />
                ) : (
                  <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white">
                    {user.email?.trim() ? user.email : "Email not provided"}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  <Phone className="w-4 h-4 inline mr-2" />
                  Phone number
                  {user.is_phone_verified && (
                    <span className="ml-2 text-xs bg-green-600 text-white px-2 py-1 rounded-full">
                      Verified
                    </span>
                  )}
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="+91 9876543210"
                  />
                ) : (
                  <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white">
                    {user.phone?.trim() ? user.phone : "Phone number not provided"}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Joined
                </label>
                <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white">
                  {getJoinedDate()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Account Settings */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
        <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Account Settings
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
              <div>
                <h4 className="font-medium text-white">Email Verification</h4>
                <p className="text-sm text-white/60">Verify your email</p>
              </div>
              {user.is_email_verified ? (
                <span className="px-3 py-1 bg-green-600 text-white text-sm rounded-full">
                  Verified ✓
                </span>
              ) : (
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors">
                  Verify
                </button>
              )}
            </div>

            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
              <div>
                <h4 className="font-medium text-white">Phone Verification</h4>
                <p className="text-sm text-white/60">
                  Verify your phone number
                </p>
              </div>
              {user.is_phone_verified ? (
                <span className="px-3 py-1 bg-green-600 text-white text-sm rounded-full">
                  Verified ✓
                </span>
              ) : (
                <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors">
                  Send OTP
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-white/5 rounded-lg">
              <h4 className="font-medium text-white mb-2">Change Password</h4>
              <p className="text-sm text-white/60 mb-3">Update your password</p>
              <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors">
                Change Password
              </button>
            </div>

            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <h4 className="font-medium text-red-400 mb-2">Delete Account</h4>
              <p className="text-sm text-red-300/80 mb-3">
                This action cannot be undone
              </p>
              <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors">
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 backdrop-blur-lg rounded-xl border border-white/20 p-6">
        <h3 className="text-xl font-semibold text-white mb-6">
          Your Achievements
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">15</div>
            <div className="text-sm text-white/60">Total Goals</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">12</div>
            <div className="text-sm text-white/60">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">7</div>
            <div className="text-sm text-white/60">Streak Days</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">80%</div>
            <div className="text-sm text-white/60">Success Rate</div>
          </div>
        </div>
      </div>
    </div>
  );
}
