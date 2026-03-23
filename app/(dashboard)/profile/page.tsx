"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Camera, Loader2, Save, User as UserIcon } from "lucide-react";
import ErrorModal from "@/components/ErrorModal";

export default function ProfilePage() {
  const { data: session, update, status } = useSession();
  
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  const [saving, setSaving] = useState(false);
  const [errorInfo, setErrorInfo] = useState<{title: string; message: string} | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (session?.user) {
      if (!name) setName(session.user.name || "");
      if (!avatarPreview && session.user.image) setAvatarPreview(session.user.image);
    }
  }, [session, name, avatarPreview]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatar(file);
      setAvatarPreview(URL.createObjectURL(file));
      setSuccessMsg(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorInfo({ title: "Validation Error", message: "Display name cannot be empty." });
      return;
    }

    setSaving(true);
    setSuccessMsg(null);
    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      if (avatar) {
        formData.append("avatar", avatar);
      }

      const res = await fetch("/api/profile", {
        method: "PATCH",
        body: formData,
      });

      const json = await res.json();
      if (!json.success) {
        setErrorInfo({ title: "Update Failed", message: json.message });
        return;
      }

      // Update the NextAuth session so all TopBars / Sidebars instantly reflect changes natively
      await update({
        name: json.data.name,
        image: json.data.avatar || session?.user?.image,
      });
      
      setSuccessMsg("Profile successfully updated!");
      setAvatar(null); // Reset pending avatar
    } catch (err: any) {
      setErrorInfo({ title: "Network Error", message: "Failed to update profile." });
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading") {
    return <div className="p-8 flex justify-center h-full items-center"><Loader2 className="animate-spin text-cyan" /></div>;
  }

  return (
    <>
      <ErrorModal
        open={!!errorInfo}
        title={errorInfo?.title || ""}
        message={errorInfo?.message || ""}
        onClose={() => setErrorInfo(null)}
      />

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto p-6 md:p-10 space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Personal Profile</h1>
          <p className="text-muted text-sm mt-1">Manage your public display presence and identity.</p>
        </div>

        {successMsg && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl text-sm font-semibold flex items-center gap-2">
            <Save size={16} /> {successMsg}
          </motion.div>
        )}

        <div className="bg-surface border border-muted/10 rounded-3xl overflow-hidden shadow-2xl relative">
          {/* Cover Header */}
          <div className="h-40 bg-gradient-to-tr from-cyan/20 via-background to-violet/20 border-b border-muted/10" />

          <form onSubmit={handleSubmit} className="p-6 md:p-10 pt-0 relative">
            
            {/* Avatar Section */}
            <div className="flex flex-col md:flex-row gap-8 items-start relative -mt-16 mb-10">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="relative group cursor-pointer"
              >
                <div className="w-32 h-32 rounded-3xl overflow-hidden bg-background border-4 border-surface shadow-2xl flex items-center justify-center relative">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar Preview" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon size={56} className="text-muted/50" />
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                    <Camera className="text-white" size={32} />
                  </div>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
              </div>

              <div className="pt-20 hidden md:block">
                <h3 className="text-base font-bold text-foreground hover:text-cyan transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>Update Profile Picture</h3>
                <p className="text-sm text-muted max-w-sm mt-1">Recommended image resolution is 256x256px.</p>
              </div>
            </div>

            {/* General Info */}
            <div className="space-y-6">
              <div className="flex flex-col gap-1.5 max-w-md">
                <label className="text-[11px] font-semibold tracking-widest uppercase text-muted/80">Display Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-background border border-muted/10 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-cyan/40 transition-all placeholder:text-muted/40 shadow-inner"
                  placeholder="Your Name"
                />
              </div>

              <div className="flex flex-col gap-1.5 max-w-md">
                <label className="text-[11px] font-semibold tracking-widest uppercase text-muted/80">Email Address (Read-only)</label>
                <input
                  type="email"
                  value={session?.user?.email || ""}
                  disabled
                  className="w-full bg-background border border-muted/10 rounded-xl px-4 py-3 text-sm text-muted opacity-60 cursor-not-allowed shadow-inner"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="mt-10 pt-8 border-t border-muted/10 flex gap-4 w-full md:w-auto md:justify-end">
              <button
                type="submit"
                disabled={saving}
                className="w-full md:w-auto px-8 py-3 rounded-xl text-sm font-bold bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} /> Save Identity</>}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </>
  );
}
