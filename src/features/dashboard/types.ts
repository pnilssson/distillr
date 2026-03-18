export type DashboardLibraryItem = {
  id: string;
  name: string;
  createdAt: string;
  videoTotal: number;
  videoReady: number;
  videoPending: number;
  videoProcessing: number;
  videoFailed: number;
  chatSessionCount: number;
  lastActivityAt: string | null;
};

export type DashboardRecentSession = {
  id: string;
  title: string;
  libraryId: string;
  libraryName: string;
  lastMessageAt: string | null;
  createdAt: string;
  messageCount: number;
};

export type DashboardActivityDay = {
  date: string;
  label: string;
  videosAdded: number;
};

export type DashboardTotals = {
  libraries: number;
  videos: number;
  readyVideos: number;
  processingVideos: number;
  chatSessions: number;
};

export type DashboardSummary = {
  libraries: DashboardLibraryItem[];
  recentSessions: DashboardRecentSession[];
  activityByDay: DashboardActivityDay[];
  totals: DashboardTotals;
};
