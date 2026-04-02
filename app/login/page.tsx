"use client";

import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        const result = await signIn("credentials", {
            redirect: false,
            email,
            password,
        });

        console.log("Login Result:", result);

        // 🚨 1. REAL ERROR CHECK: Catch any error NextAuth throws back
        if (result?.error) {
            // Check if the error string contains the word "suspended" anywhere inside it
            if (result.error.toLowerCase().includes("suspended")) {
                setError("Your organization's account has been suspended. Please contact support.");
            }
            // NextAuth's default error when a throw new Error() happens
            else if (result.error === "CredentialsSignin" || result.error === "Configuration") {
                setError("Invalid credentials or account suspended. Please contact support.");
            }
            // Fallback for any other custom errors
            else {
                setError(result.error);
            }
            return; // Stop here so they don't get routed!
        }

        // ✅ 2. SUCCESS CHECK: The backend approved them
        if (result?.ok) {
            // Read the freshly set session to know which portal to land on
            const session = await getSession();
            const userType = (session?.user as any)?.userType;

            if (userType === "SUPER_ADMIN") {
                router.push("/organizations");
            } else {
                router.push("/home");
            }
        }
    };

    return (
        <div className="min-h-screen w-full flex bg-background text-foreground font-sans overflow-hidden">
            {/* Left Column: Branding / Marketing Images */}
            <div className="hidden lg:flex w-[55%] flex-col justify-between p-12 relative overflow-hidden bg-black">
                {/* Abstract wavy background image placeholder */}
                <div
                    className="absolute inset-0 z-0 opacity-80 mix-blend-screen"
                    style={{
                        backgroundImage: 'url("https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop")',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        filter: 'hue-rotate(180deg) brightness(0.6) contrast(1.2)'
                    }}
                />
                {/* Gradient overlay to smoothly blend edges if needed */}
                <div className="absolute inset-0 z-0 bg-gradient-to-r from-black/80 via-transparent to-background" />

                <div className="relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="flex items-center gap-2"
                    >
                        {/* Logo Icon */}
                        <div className="w-8 h-8 bg-cyan relative rotate-45 flex flex-shrink-0 items-center justify-center">
                            <div className="w-3 h-3 bg-black absolute -left-1 -bottom-1 rotate-45" />
                        </div>
                        <span className="text-xl font-bold tracking-wide text-white">FlowSpace</span>
                    </motion.div>
                </div>

                <div className="relative z-10 flex flex-col justify-center h-full pt-20">
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                    >
                        <h1 className="text-8xl font-black tracking-tighter leading-[0.85] text-white">
                            FLOW<br />
                            SPACE.
                        </h1>
                        <p className="mt-8 text-2xl text-white/70 font-light tracking-wide">
                            Your work, <span className="text-cyan font-normal">synchronized</span>.
                        </p>
                    </motion.div>
                </div>

                <div className="relative z-10 flex items-center gap-8 text-[10px] font-bold tracking-[0.2em] uppercase text-white/50">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                    >
                        <p>Latency</p>
                        <p className="text-cyan mt-1">12ms</p>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.7 }}
                    >
                        <p>Status</p>
                        <p className="text-cyan mt-1">Active</p>
                    </motion.div>
                </div>
            </div>

            {/* Right Column: Login Form */}
            <div className="w-full lg:w-[45%] flex items-center justify-center p-8 bg-background">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full max-w-[420px]"
                >
                    <div className="bg-surface border border-muted/10 px-10 py-12 rounded-[40px] shadow-2xl relative">
                        <h2 className="text-3xl font-bold mb-2 tracking-tight text-foreground">The Gateway</h2>
                        <p className="text-muted mb-10 text-sm font-light">Enter your credentials to access your workspace</p>

                        <form onSubmit={handleSubmit} className="space-y-8">
                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-2 relative group">
                                <label className="text-[10px] font-bold text-muted uppercase tracking-[0.15em]">Email Address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-transparent border-b border-muted/20 px-0 py-2 text-foreground placeholder:text-muted/50 focus:outline-none focus:border-cyan transition-colors"
                                    placeholder="name@company.com"
                                    required
                                />
                            </div>

                            <div className="space-y-2 relative group">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-bold text-muted uppercase tracking-[0.15em]">Password</label>
                                    <a href="#" className="text-[10px] text-cyan hover:text-cyan/80 transition-colors">Forgot?</a>
                                </div>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-transparent border-b border-muted/20 px-0 py-2 text-foreground placeholder:text-muted/50 focus:outline-none focus:border-cyan transition-colors"
                                        placeholder="••••••••"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-0 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
                                    </button>
                                </div>
                            </div>

                            <div className="pt-4">
                                <motion.div
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="relative rounded-full p-[2px] overflow-hidden group/btn cursor-pointer"
                                >
                                    {/* Dashed animated border effect */}
                                    <div className="absolute inset-0 border border-cyan/50 border-dashed rounded-full group-hover/btn:rotate-180 transition-all duration-1000 ease-linear" />
                                    <button
                                        type="submit"
                                        className="btn-brand relative w-full font-semibold rounded-full px-4 py-3.5"
                                    >
                                        Login to Workspace
                                    </button>
                                </motion.div>
                            </div>

                            <div className="text-center pt-6">
                                <p className="text-xs text-muted/70">
                                    Don't have an account? <a href="#" className="text-cyan font-medium hover:underline">Sign Up</a>
                                </p>
                            </div>
                        </form>

                        <div className="mt-16 flex justify-center gap-6 text-[9px] font-bold tracking-[0.2em] uppercase text-muted/50">
                            <a href="#" className="hover:text-muted transition-colors">Privacy</a>
                            <a href="#" className="hover:text-muted transition-colors">Terms</a>
                            <a href="#" className="hover:text-muted transition-colors">Support</a>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

