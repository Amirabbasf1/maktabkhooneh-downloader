export interface UserProfile {
  auth?: {
    details?: {
      email?: string;
      user_id?: number | string;
      student_id?: number | string;
      is_authenticated?: boolean;
    };
    conditions?: {
      has_subscription?: boolean;
      has_course_purchase?: boolean;
    };
    csrf?: string;
  };
  profile?: {
    details?: {
      email?: string;
      first_name?: string;
      last_name?: string;
    };
  };
}

export interface StoredUser {
  email: string;
  updated: string;
  isActive: boolean;
}

export interface AuthStatus {
  activeUser: string | null;
  users: StoredUser[];
  hasCookie: boolean;
  cookiePreview: string | null;
  isAuthenticated: boolean;
  coreData: UserProfile | null;
  authError: string | null;
}

export interface CourseUnit {
  id: string | number;
  title: string;
  slug: string;
  order: number;
  type: string | number;
  isVideo: boolean;
  isLocked: boolean;
  viewAccess?: number;
  duration?: string | number | null;
  hasCaption?: boolean;
  description?: string;
}

export interface CourseChapter {
  id: string | number;
  title: string;
  slug: string;
  order: number;
  unitsCount: number;
  lecturesCount: number;
  units: CourseUnit[];
}

export interface CourseOutline {
  courseSlug: string;
  courseId: number | null;
  displayName: string;
  courseUrl: string;
  isNewFormat: boolean;
  usedApi: string;
  totalChapters: number;
  totalLectures: number;
  totalOtherUnits: number;
  chapters: CourseChapter[];
}

export interface VideoQuality {
  resolution: number;
  download_url: string;
  label?: string;
}

export interface UnitAttachment {
  name: string;
  download_url: string;
  size?: number;
}

export interface UnitDetails {
  unitId: string | number;
  qualities: VideoQuality[];
  bestDownloadUrl: string | null;
  captionFile: string | null;
  attachments: UnitAttachment[];
}

export interface DownloadTaskStatus {
  id: string;
  courseTitle: string;
  courseSlug: string;
  status: 'idle' | 'running' | 'completed' | 'cancelled' | 'error';
  totalUnits: number;
  completedUnits: number;
  skippedUnits: number;
  failedUnits: number;
  currentUnitTitle: string;
  currentSpeed: string;
  currentPercentage: number;
  currentDownloadedBytes: number;
  currentTotalBytes: number;
  logs: string[];
  outputDir: string;
  startTime?: number;
  endTime?: number;
}

export interface LibraryFile {
  name: string;
  relativePath: string;
  size: number;
  isDirectory: boolean;
  modifiedAt: string;
}

export interface MyCourseItem {
  id?: number | string;
  title: string;
  slug: string;
  url: string;
  banner?: string;
}

export type ExportFormatType = 'idm_txt' | 'idm_ef2' | 'aria2' | 'curl_sh' | 'wget_sh' | 'm3u8';

export interface CourseHistoryItem {
  slug: string;
  title: string;
  url: string;
  viewedAt: number;
  isBookmarked?: boolean;
}

