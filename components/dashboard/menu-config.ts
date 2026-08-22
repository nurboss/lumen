import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  BookOpen,
  Layers,
  Users,
  GraduationCap,
  FileQuestion,
  ClipboardList,
  Award,
  Presentation,
  Wallet,
  CreditCard,
  CalendarClock,
  MessageSquare,
  Newspaper,
  Shield,
  Video,
  UserCog,
  Tag,
  Building2,
} from "lucide-react";

export type Role = "ADMIN" | "INSTRUCTOR" | "AGENT" | "STUDENT" | "PARENT";

export interface MenuItem {
  /** Stable key used for RBAC permission lookup (matches doc menu keys). */
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface MenuGroup {
  heading?: string;
  items: MenuItem[];
}

/** Menu definitions per role. `key` doubles as the RBAC `menuKey`. */
export const menuByRole: Record<Role, MenuGroup[]> = {
  ADMIN: [
    {
      items: [{ key: "dashboard", label: "Dashboard", href: "/admin", icon: LayoutDashboard }],
    },
    {
      heading: "Manage Course",
      items: [
        { key: "manage-course", label: "Courses", href: "/admin/manage-course", icon: BookOpen },
        { key: "manage-course-course-category", label: "Categories", href: "/admin/manage-course-course-category", icon: Layers },
        { key: "manage-batch", label: "Batches", href: "/admin/manage-batch", icon: CalendarClock },
        { key: "manage-unit", label: "Units", href: "/admin/manage-unit", icon: Video },
        { key: "manage-section", label: "Sections", href: "/admin/manage-section", icon: Layers },
        { key: "manage-quiz", label: "Quizzes", href: "/admin/manage-quiz", icon: FileQuestion },
        { key: "manage-question", label: "Questions", href: "/admin/manage-question", icon: FileQuestion },
        { key: "manage-assignment", label: "Assignments", href: "/admin/manage-assignment", icon: ClipboardList },
      ],
    },
    {
      heading: "Manage People",
      items: [
        { key: "manage-instructor", label: "Instructors", href: "/admin/manage-instructor", icon: GraduationCap },
        { key: "manage-student", label: "Students", href: "/admin/manage-student", icon: Users },
        { key: "manage-parent", label: "Parents", href: "/admin/manage-parent", icon: Users },
        { key: "manage-user", label: "All Users", href: "/admin/manage-user", icon: UserCog },
      ],
    },
    {
      heading: "Admin User",
      items: [
        { key: "manage-role", label: "Roles", href: "/admin/manage-role", icon: Shield },
        { key: "manage-role-permission", label: "Menu Permission", href: "/admin/manage-role-permission", icon: Shield },
        { key: "manage-admin", label: "Admin Users", href: "/admin/manage-admin", icon: UserCog },
      ],
    },
    {
      heading: "Content",
      items: [
        { key: "manage-banner", label: "Banner", href: "/admin/manage-banner", icon: Newspaper },
        { key: "manage-seminar", label: "Seminars", href: "/admin/manage-seminar", icon: Presentation },
        { key: "manage-certificate", label: "Certificates", href: "/admin/manage-certificate", icon: Award },
        { key: "manage-blog", label: "Blog", href: "/admin/manage-blog", icon: Newspaper },
        { key: "manage-blog-category", label: "Blog Categories", href: "/admin/manage-blog-category", icon: Layers },
        { key: "public-qna", label: "Public Q&A", href: "/admin/public-qna", icon: MessageSquare },
        { key: "promocode", label: "Promo Codes", href: "/admin/promocode", icon: Tag },
        { key: "manage-institute", label: "Institutes", href: "/admin/manage-institute", icon: Building2 },
      ],
    },
    {
      heading: "Finance",
      items: [
        { key: "all-payment", label: "Payments", href: "/admin/all-payment", icon: CreditCard },
        { key: "commission", label: "Commission", href: "/admin/commission", icon: Wallet },
      ],
    },
    {
      heading: "Community",
      items: [
        { key: "chatting", label: "Group Chat", href: "/admin/chatting", icon: MessageSquare },
      ],
    },
  ],
  INSTRUCTOR: [
    { items: [{ key: "dashboard", label: "Dashboard", href: "/instructor", icon: LayoutDashboard }] },
    {
      heading: "Teaching",
      items: [
        { key: "manage-course", label: "Courses", href: "/instructor/manage-course", icon: BookOpen },
        { key: "manage-batch", label: "Batches", href: "/instructor/manage-batch", icon: CalendarClock },
        { key: "manage-unit", label: "Units", href: "/instructor/manage-unit", icon: Video },
        { key: "manage-quiz", label: "Quizzes", href: "/instructor/manage-quiz", icon: FileQuestion },
        { key: "manage-assignment", label: "Assignments", href: "/instructor/manage-assignment", icon: ClipboardList },
        { key: "live-class", label: "Live Class", href: "/instructor/live-class", icon: Video },
        { key: "booking-list", label: "Bookings", href: "/instructor/booking-list", icon: CalendarClock },
      ],
    },
    {
      heading: "Finance",
      items: [
        { key: "commission", label: "Commission", href: "/instructor/commission", icon: Wallet },
        { key: "payment", label: "Payments", href: "/instructor/payment", icon: CreditCard },
      ],
    },
  ],
  AGENT: [
    { items: [{ key: "dashboard", label: "Dashboard", href: "/agent", icon: LayoutDashboard }] },
    {
      heading: "Sales",
      items: [
        { key: "manage-course", label: "Courses", href: "/agent/manage-course", icon: BookOpen },
        { key: "manage-batch", label: "Batches", href: "/agent/manage-batch", icon: CalendarClock },
        { key: "live-class", label: "Live Class", href: "/agent/live-class", icon: Video },
        { key: "commission", label: "Commission", href: "/agent/commission", icon: Wallet },
      ],
    },
  ],
  STUDENT: [
    { items: [{ key: "dashboard", label: "Dashboard", href: "/student", icon: LayoutDashboard }] },
    {
      heading: "Learning",
      items: [
        { key: "my-course", label: "My Courses", href: "/student/my-course", icon: BookOpen },
        { key: "my-batch", label: "My Batch", href: "/student/my-batch", icon: CalendarClock },
        { key: "live-class", label: "Live Class", href: "/student/live-class", icon: Video },
        { key: "my-quiz", label: "My Quizzes", href: "/student/my-quiz", icon: FileQuestion },
        { key: "certificate", label: "Certificates", href: "/student/certificate", icon: Award },
        { key: "learningPath", label: "Learning Path", href: "/student/learningPath", icon: Layers },
      ],
    },
    {
      heading: "Account",
      items: [
        { key: "booking-instructor", label: "Book a Mentor", href: "/student/booking-instructor", icon: CalendarClock },
        { key: "commission-wallet", label: "Wallet", href: "/student/commission-wallet", icon: Wallet },
        { key: "payment", label: "Payments", href: "/student/payment", icon: CreditCard },
      ],
    },
  ],
  PARENT: [
    { items: [{ key: "dashboard", label: "Dashboard", href: "/parent", icon: LayoutDashboard }] },
  ],
};

export const rolePrefix: Record<Role, string> = {
  ADMIN: "/admin",
  INSTRUCTOR: "/instructor",
  AGENT: "/agent",
  STUDENT: "/student",
  PARENT: "/parent",
};
