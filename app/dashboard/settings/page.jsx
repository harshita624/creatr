"use client";

import React, { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import Image from "next/image";
import Link from "next/link";
import {
  AlertCircle,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  Globe,
  Lock,
  Loader2,
  LogOut,
  Phone,
  Shield,
  User,
  UserX,
  X,
} from "lucide-react";
import { uploadToImageKit } from "@/lib/imagekit";
import { useClerk } from "@clerk/nextjs";

const GENDER_OPTIONS = [
  { value: "",         label: "Prefer not to say" },
  { value: "male",     label: "Male"              },
  { value: "female",   label: "Female"            },
  { value: "nonbinary",label: "Non-binary"        },
  { value: "other",    label: "Other"             },
];

const TABS = [
  { id: "edit",     label: "Edit profile",     icon: User   },
  { id: "privacy",  label: "Privacy",          icon: Lock   },
  { id: "account",  label: "Account",          icon: Shield },
];

export default function SettingsPage() {
  const currentUser   = useQuery(api.users.getCurrentUser);
  const updateProfile = useMutation(api.users.updateProfile);
  const updateUsername= useMutation(api.users.updateUsername);
  const { signOut }   = useClerk();

  const [activeTab, setActiveTab] = useState("edit");

  /* profile form state */
  const [name,      setName]      = useState("");
  const [username,  setUsername]  = useState("");
  const [bio,       setBio]       = useState("");
  const [website,   setWebsite]   = useState("");
  const [gender,    setGender]    = useState("");
  const [phone,     setPhone]     = useState("");
  const [isPrivate, setIsPrivate] = useState(false);

  /* ui state */
  const [saving,          setSaving]          = useState(false);
  const [uploadingPhoto,  setUploadingPhoto]  = useState(false);
  const [usernameState,   setUsernameState]   = useState("idle"); // idle | checking | ok | taken | invalid
  const [usernameMsg,     setUsernameMsg]     = useState("");
  const [hasChanges,      setHasChanges]      = useState(false);
  const photoInputRef = useRef(null);
  const usernameTimeout = useRef(null);

  /* seed form when user loads */
  useEffect(() => {
    if (!currentUser) return;
    setName(currentUser.name     || "");
    setUsername(currentUser.username || "");
    setBio(currentUser.bio       || "");
    setWebsite(currentUser.website  || "");
    setGender(currentUser.gender   || "");
    setPhone(currentUser.phone    || "");
    setIsPrivate(currentUser.isPrivate ?? false);
  }, [currentUser]);

  /* detect changes */
  useEffect(() => {
    if (!currentUser) return;
    const changed =
      name      !== (currentUser.name     || "") ||
      username  !== (currentUser.username || "") ||
      bio       !== (currentUser.bio      || "") ||
      website   !== (currentUser.website  || "") ||
      gender    !== (currentUser.gender   || "") ||
      phone     !== (currentUser.phone    || "") ||
      isPrivate !== (currentUser.isPrivate ?? false);
    setHasChanges(changed);
  }, [name, username, bio, website, gender, phone, isPrivate, currentUser]);

  /* username availability check */
  useEffect(() => {
    if (!currentUser) return;
    if (username === currentUser.username) { setUsernameState("idle"); setUsernameMsg(""); return; }
    if (!username || username.length < 3) { setUsernameState("invalid"); setUsernameMsg("Minimum 3 characters"); return; }
    if (username.length > 30)            { setUsernameState("invalid"); setUsernameMsg("Maximum 30 characters"); return; }
    if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
      setUsernameState("invalid");
      setUsernameMsg("Only letters, numbers, _ . and - allowed");
      return;
    }
    setUsernameState("checking");
    clearTimeout(usernameTimeout.current);
    usernameTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/check-username?username=${encodeURIComponent(username)}`);
        const data = await res.json();
        if (data.available) { setUsernameState("ok");    setUsernameMsg("Available"); }
        else                { setUsernameState("taken"); setUsernameMsg("Already taken"); }
      } catch {
        setUsernameState("idle");
      }
    }, 500);
  }, [username, currentUser]);

  /* photo upload */
  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const result = await uploadToImageKit(file, `avatar-${Date.now()}-${file.name}`, "creator-media");
      if (!result.success) throw new Error(result.error || "Upload failed");
      await updateProfile({ imageUrl: result.data.url });
      toast.success("Profile photo updated!");
    } catch (err) {
      toast.error(err.message || "Photo upload failed");
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  };

  /* save */
  const handleSave = async () => {
    if (!hasChanges) return;
    if (usernameState === "taken")   { toast.error("That username is already taken"); return; }
    if (usernameState === "invalid") { toast.error(usernameMsg);                     return; }
    if (usernameState === "checking"){ toast.error("Checking username, wait a moment"); return; }

    setSaving(true);
    try {
      /* update profile fields */
      await updateProfile({ name, bio, website, gender, phone, isPrivate });

      /* update username if changed */
      if (username !== currentUser?.username) {
        await updateUsername({ username });
      }

      toast.success("Profile saved!");
      setHasChanges(false);
    } catch (err) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  /* reset */
  const handleCancel = () => {
    if (!currentUser) return;
    setName(currentUser.name     || "");
    setUsername(currentUser.username || "");
    setBio(currentUser.bio       || "");
    setWebsite(currentUser.website  || "");
    setGender(currentUser.gender   || "");
    setPhone(currentUser.phone    || "");
    setIsPrivate(currentUser.isPrivate ?? false);
    setHasChanges(false);
  };

  if (!currentUser) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 lg:p-8">

      {/* ── Page header ─────────────────────────────────────────────── */}
      <section className="app-panel overflow-hidden p-6 md:p-8">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-300 via-rose-300 to-violet-300" />
        <p className="section-label">Account</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your profile, privacy and account preferences.
        </p>
      </section>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">

        {/* ── Left tab nav ────────────────────────────────────────────── */}
        <aside className="shrink-0 lg:w-56">
          <div className="app-panel overflow-hidden p-2">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition-all duration-200 ${
                  activeTab === id
                    ? "bg-gradient-to-r from-orange-300 via-rose-300 to-violet-300 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </button>
            ))}

            <div className="my-2 border-t border-slate-100" />

            <button
              type="button"
              onClick={() => signOut({ redirectUrl: "/" })}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-red-500 transition-colors hover:bg-red-50"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Log out
            </button>
          </div>
        </aside>

        {/* ── Main content ─────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">

          {/* ── EDIT PROFILE TAB ───────────────────────────────────────── */}
          {activeTab === "edit" && (
            <div className="app-panel overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-orange-300 via-rose-300 to-violet-300" />

              {/* Profile photo section */}
              <div className="flex items-center gap-5 border-b border-slate-100 px-6 py-6">
                <div className="relative shrink-0">
                  <div className="h-[86px] w-[86px] overflow-hidden rounded-full ring-2 ring-offset-2 ring-orange-200">
                    {uploadingPhoto ? (
                      <div className="flex h-full w-full items-center justify-center bg-slate-100">
                        <Loader2 className="h-6 w-6 animate-spin text-orange-400" />
                      </div>
                    ) : currentUser.imageUrl ? (
                      <Image
                        src={currentUser.imageUrl}
                        alt={currentUser.name}
                        width={86}
                        height={86}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-orange-300 via-rose-300 to-violet-400 text-3xl font-bold text-white">
                        {currentUser.name?.charAt(0)?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-violet-500 text-white shadow-lg ring-2 ring-white transition-transform hover:scale-110 disabled:opacity-60"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoChange}
                    disabled={uploadingPhoto}
                  />
                </div>

                <div>
                  <p className="text-lg font-bold text-slate-900">
                    {currentUser.username || currentUser.name}
                  </p>
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="mt-1 text-sm font-semibold text-orange-500 hover:text-orange-700 disabled:opacity-50"
                  >
                    {uploadingPhoto ? "Uploading..." : "Change profile photo"}
                  </button>
                  <p className="mt-0.5 text-xs text-slate-400">
                    JPG, PNG or GIF · Max 10 MB
                  </p>
                </div>
              </div>

              {/* Form fields */}
              <div className="divide-y divide-slate-50">

                <SettingField label="Name" hint="Help people find you with your real name or creator name.">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={60}
                    placeholder="Your display name"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-orange-300 focus:bg-white placeholder:text-slate-400"
                  />
                  <div className="mt-1 flex justify-end">
                    <span className={`text-[11px] font-medium ${name.length > 50 ? "text-orange-500" : "text-slate-400"}`}>
                      {name.length}/60
                    </span>
                  </div>
                </SettingField>

                <SettingField label="Username" hint="You can change your username once every 14 days.">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">@</span>
                    <input
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase())}
                      maxLength={30}
                      placeholder="username"
                      className={`w-full rounded-xl border px-4 py-3 pl-8 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 ${
                        usernameState === "ok"      ? "border-emerald-300 bg-emerald-50/40 focus:bg-white" :
                        usernameState === "taken"   ? "border-red-300 bg-red-50/40 focus:bg-white" :
                        usernameState === "invalid" ? "border-orange-300 bg-orange-50/40 focus:bg-white" :
                        "border-slate-200 bg-slate-50 focus:border-orange-300 focus:bg-white"
                      }`}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {usernameState === "checking" && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
                      {usernameState === "ok"       && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                      {usernameState === "taken"    && <X className="h-4 w-4 text-red-500" />}
                      {usernameState === "invalid"  && <AlertCircle className="h-4 w-4 text-orange-500" />}
                    </div>
                  </div>
                  {usernameMsg && (
                    <p className={`mt-1 text-[12px] font-medium ${
                      usernameState === "ok"    ? "text-emerald-600" :
                      usernameState === "taken" ? "text-red-600" : "text-orange-600"
                    }`}>
                      {usernameMsg}
                    </p>
                  )}
                </SettingField>

                <SettingField label="Bio" hint="Write a short bio about yourself.">
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={150}
                    rows={3}
                    placeholder="Tell the world a bit about yourself..."
                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-orange-300 focus:bg-white placeholder:text-slate-400"
                  />
                  <div className="mt-1 flex justify-between">
                    <span className="text-[11px] text-slate-400">Appears on your profile</span>
                    <span className={`text-[11px] font-medium ${bio.length > 130 ? "text-orange-500" : "text-slate-400"}`}>
                      {bio.length}/150
                    </span>
                  </div>
                </SettingField>

                <SettingField label="Website" hint="Add a link to your website, portfolio, or Linktree.">
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://yourwebsite.com"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-4 text-sm text-slate-900 outline-none transition-colors focus:border-orange-300 focus:bg-white placeholder:text-slate-400"
                    />
                  </div>
                </SettingField>

                <SettingField label="Gender" hint="This won't appear on your profile and is used for personalisation.">
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-orange-300 focus:bg-white"
                  >
                    {GENDER_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </SettingField>

                <SettingField label="Phone" hint="Used for two-factor authentication and account recovery.">
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      type="tel"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-4 text-sm text-slate-900 outline-none transition-colors focus:border-orange-300 focus:bg-white placeholder:text-slate-400"
                    />
                  </div>
                </SettingField>

                <SettingField label="Email" hint="Your email is managed by your sign-in provider and cannot be changed here.">
                  <input
                    value={currentUser.email || ""}
                    readOnly
                    className="w-full cursor-not-allowed rounded-xl border border-slate-100 bg-slate-100 px-4 py-3 text-sm text-slate-500"
                  />
                </SettingField>

              </div>

              {/* Save / Cancel footer */}
              <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-slate-100 bg-white/90 px-6 py-4 backdrop-blur">
                {hasChanges && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="quiet-button px-5 py-2.5 text-sm font-semibold"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !hasChanges || usernameState === "taken" || usernameState === "checking"}
                  className="soft-button flex items-center gap-2 px-6 py-2.5 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </div>
          )}

          {/* ── PRIVACY TAB ────────────────────────────────────────────── */}
          {activeTab === "privacy" && (
            <div className="app-panel overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-orange-300 via-rose-300 to-violet-300" />
              <div className="border-b border-slate-100 px-6 py-5">
                <p className="section-label">Privacy</p>
                <p className="mt-1 text-sm text-slate-500">Control who can see your content and interact with you.</p>
              </div>

              <div className="divide-y divide-slate-50">

                <PrivacyToggle
                  icon={<Lock className="h-5 w-5" />}
                  iconBg="bg-gradient-to-br from-orange-400 to-rose-500"
                  title="Private account"
                  subtitle="When your account is private, only people you approve can see your photos and videos."
                  value={isPrivate}
                  onChange={(val) => { setIsPrivate(val); setHasChanges(true); }}
                />

                <PrivacyLink
                  icon={<User className="h-5 w-5" />}
                  iconBg="bg-gradient-to-br from-violet-400 to-purple-500"
                  title="Blocked accounts"
                  subtitle="Manage the accounts you've blocked"
                  href="/dashboard/followers"
                />

                <PrivacyLink
                  icon={<UserX className="h-5 w-5" />}
                  iconBg="bg-gradient-to-br from-slate-400 to-slate-600"
                  title="Muted accounts"
                  subtitle="Accounts you've muted won't know they're muted"
                  href="/dashboard/followers"
                />

                <div className="px-6 py-4">
                  <div className="rounded-2xl bg-gradient-to-br from-orange-50 to-violet-50 p-4">
                    <p className="text-xs font-semibold text-slate-700">
                      💡 About account privacy
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Switching to a private account won't affect followers you already have. You'll need to manually remove any existing followers you don't want.
                    </p>
                  </div>
                </div>

              </div>

              {/* Save privacy */}
              {hasChanges && (
                <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
                  <button type="button" onClick={handleCancel} className="quiet-button px-5 py-2.5 text-sm font-semibold">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="soft-button flex items-center gap-2 px-6 py-2.5 text-sm font-bold"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Save
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── ACCOUNT TAB ────────────────────────────────────────────── */}
          {activeTab === "account" && (
            <div className="space-y-4">

              <div className="app-panel overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-orange-300 via-rose-300 to-violet-300" />
                <div className="border-b border-slate-100 px-6 py-5">
                  <p className="section-label">Account info</p>
                </div>
                <div className="divide-y divide-slate-50">

                  <InfoRow label="Username"  value={`@${currentUser.username || "—"}`} />
                  <InfoRow label="Email"     value={currentUser.email || "—"}           />
                  <InfoRow label="Member since" value={new Date(currentUser.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })} />
                  <InfoRow label="Account type" value={currentUser.isPrivate ? "Private" : "Public"} />

                </div>
              </div>

              <div className="app-panel overflow-hidden">
                <div className="border-b border-slate-100 px-6 py-5">
                  <p className="section-label">Linked accounts</p>
                  <p className="mt-1 text-sm text-slate-500">Authentication is managed by Clerk.</p>
                </div>
                <div className="px-6 py-4">
                  <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
                      <span className="text-lg">🔐</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Clerk Auth</p>
                      <p className="text-xs text-slate-500">{currentUser.email}</p>
                    </div>
                    <span className="ml-auto rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">
                      Connected
                    </span>
                  </div>
                </div>
              </div>

              {/* Danger zone */}
              <div className="app-panel overflow-hidden border border-red-100">
                <div className="border-b border-red-100 px-6 py-5">
                  <p className="text-xs font-bold uppercase tracking-widest text-red-500">Danger zone</p>
                </div>
                <div className="space-y-3 px-6 py-5">
                  <button
                    type="button"
                    onClick={() => signOut({ redirectUrl: "/" })}
                    className="flex w-full items-center justify-between rounded-2xl border border-red-100 bg-red-50 px-5 py-3.5 text-left transition-colors hover:bg-red-100"
                  >
                    <div>
                      <p className="text-sm font-semibold text-red-700">Log out</p>
                      <p className="text-xs text-red-400">Sign out of your account on this device</p>
                    </div>
                    <LogOut className="h-4 w-4 text-red-500" />
                  </button>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3.5">
                    <p className="text-sm font-semibold text-slate-600">Delete account</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      To delete your account, contact support at{" "}
                      <a href="mailto:support@createk.app" className="text-orange-500 hover:underline">
                        support@createk.app
                      </a>
                    </p>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Helper sub-components ────────────────────────────────────────── */

function SettingField({ label, hint, children }) {
  return (
    <div className="grid gap-4 px-6 py-5 sm:grid-cols-[180px_minmax(0,1fr)]">
      <div className="pt-1">
        <p className="text-sm font-bold text-slate-900">{label}</p>
        {hint && <p className="mt-1 text-[11px] leading-5 text-slate-400">{hint}</p>}
      </div>
      <div>{children}</div>
    </div>
  );
}

function PrivacyToggle({ icon, iconBg, title, subtitle, value, onChange }) {
  return (
    <div className="flex items-center gap-4 px-6 py-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white ${iconBg}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-slate-500">{subtitle}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${value ? "bg-gradient-to-r from-orange-400 to-violet-500" : "bg-slate-200"}`}
      >
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${value ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </div>
  );
}

function PrivacyLink({ icon, iconBg, title, subtitle, href }) {
  return (
    <Link href={href}
      className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-slate-50">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white ${iconBg}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
    </Link>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between px-6 py-3.5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}