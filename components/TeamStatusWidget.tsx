"use client";

import { useEffect, useState, useRef } from "react";
import { Loader2, RefreshCw, ChevronDown } from "lucide-react";
import ErrorModal from "@/components/ErrorModal";

interface TeamMember {
  id: string;
  name: string;
  avatar?: string;
  status: "ONLINE" | "OFFLINE" | "COMPLETED";
}

interface Pagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

const LIMIT = 24;

export default function TeamStatusWidget() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [errorInfo, setErrorInfo] = useState<{ title: string; message: string } | null>(null);

  const fetchPage = async (page: number, append: boolean) => {
    if (page === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const res = await fetch(`/api/attendance/team?page=${page}&limit=${LIMIT}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      // Sort so online users appear first within each page
      const sorted = (json.data as TeamMember[]).sort((a, b) => {
        const priority = { ONLINE: 1, COMPLETED: 2, OFFLINE: 3 };
        return priority[a.status] - priority[b.status];
      });

      setTeam(prev => append ? [...prev, ...sorted] : sorted);
      setPagination(json.pagination);
    } catch (err: any) {
      setErrorInfo({ title: "Failed to load team status", message: err.message || "Network Error" });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Track how many pages we've loaded so auto-refresh can re-fetch all of them
  const loadedPagesRef = useRef(1);

  const refresh = async () => {
    setLoading(true);
    setTeam([]);
    loadedPagesRef.current = 1;
    await fetchPage(1, false);
  };

  const loadMore = async () => {
    if (!pagination || pagination.page >= pagination.totalPages) return;
    const nextPage = pagination.page + 1;
    loadedPagesRef.current = nextPage;
    await fetchPage(nextPage, true);
  };

  useEffect(() => {
    fetchPage(1, false);
    const interval = setInterval(() => {
      // Quietly re-fetch all loaded pages and merge
      setLoading(false);
      fetchPage(1, false);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const hasMore = pagination && pagination.page < pagination.totalPages;

  return (
    <>
      <ErrorModal
        open={!!errorInfo}
        title={errorInfo?.title || ""}
        message={errorInfo?.message || ""}
        onClose={() => setErrorInfo(null)}
      />

      <div className="bg-surface border border-muted/10 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        {/* Slight ambient gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-cyan/5 via-transparent to-transparent pointer-events-none" />

        <div className="flex justify-between items-center mb-6 relative z-10">
          <div>
            <h2 className="font-bold text-foreground text-base">Live Team Pulse</h2>
            <p className="text-[10px] text-muted tracking-[0.2em] uppercase mt-0.5">
              Who&apos;s at the command center
              {pagination && (
                <span className="ml-2 text-muted/60">
                  · {team.length} of {pagination.totalCount}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className="text-muted hover:text-cyan transition-colors disabled:opacity-50"
            title="Refresh Pulse"
          >
            <RefreshCw size={14} className={loading && team.length > 0 ? "animate-spin text-cyan" : ""} />
          </button>
        </div>

        {loading && team.length === 0 ? (
          <div className="flex justify-center items-center py-20 relative z-10">
            <Loader2 className="animate-spin text-cyan" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-y-8 gap-x-4 relative z-10">
              {team.map((user) => {
                const isOnline = user.status === "ONLINE";
                const isCompleted = user.status === "COMPLETED";

                let borderColor = "border-muted/10";
                let dotColor = "bg-muted";
                if (isOnline) {
                  borderColor = "border-cyan/40 shadow-[0_0_15px_rgba(45,212,191,0.2)]";
                  dotColor = "bg-cyan shadow-[0_0_8px_rgba(45,212,191,0.8)] animate-pulse";
                } else if (isCompleted) {
                  borderColor = "border-emerald-500/30";
                  dotColor = "bg-emerald-500";
                }

                const initials = user.name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);
                const firstName = user.name.split(" ")[0];

                return (
                  <div key={String(user.id)} className="flex flex-col items-center gap-3 group">
                    <div className="relative">
                      <div className={`relative w-16 h-16 rounded-full flex items-center justify-center bg-background border-2 ${borderColor} transition-all duration-300`}>
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.name} className="w-full h-full object-cover rounded-full" />
                        ) : (
                          <span className="text-sm font-bold text-muted-foreground">{initials}</span>
                        )}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-surface border-[3px] border-surface flex items-center justify-center">
                        <div className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
                      </div>
                    </div>
                    <div className="text-center w-full">
                      <p className="text-[12px] font-semibold text-foreground truncate w-full group-hover:text-cyan transition-colors" title={user.name}>
                        {firstName}
                      </p>
                      <p className="text-[10px] text-muted tracking-wide uppercase mt-0.5">
                        {isOnline ? "Active" : isCompleted ? "Done" : "Away"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center mt-8 relative z-10">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-muted border border-muted/15 hover:border-cyan/30 hover:text-cyan disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loadingMore ? (
                    <><Loader2 size={12} className="animate-spin" /> Loading…</>
                  ) : (
                    <><ChevronDown size={12} /> Load more ({pagination!.totalCount - team.length} remaining)</>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
