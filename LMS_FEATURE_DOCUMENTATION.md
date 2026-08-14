# Lumen LMS — Full Feature & Data-Model Documentation

> Blueprint for building the platform on **Next.js + Prisma + PostgreSQL**, styled with the
> **Lumen** design system on top of **Tailwind CSS v4 + shadcn/ui**.
> It captures every feature, how features relate to each other, the data model, and the
> API surface the platform provides.

---

## 1. What this product is

A **Bangla-language online + offline training / course marketplace + LMS**. It combines:

- A **public marketing/course-marketplace site** (home, course catalog, mentors, blogs, seminars, agent offices, career).
- A **learning platform** (video courses, live (Zoom) classes, quizzes, assignments, certificates, forums).
- A **multi-role dashboard system** (Admin, Instructor, Agent, Student, Parent) each with its own sidebar and permissions.
- A **commerce layer** (cart, payment via aamarPay, wallet, commissions, promo codes, withdrawals).

### Tech stack
| Concern | Library |
|---|---|
| Framework | Next.js (App Router) |
| Language | TypeScript |
| ORM / DB | Prisma + PostgreSQL |
| Styling | Tailwind CSS v4 |
| UI components | **shadcn/ui** |
| Design system | **Lumen** (see §11) |
| Theming | `next-themes` (light/dark) |
| Forms | `react-hook-form` + `zod` |
| Rich text | rich-text editor (HTML fields) |
| Video | `react-player`, Vimeo/YouTube/Google Drive handling |
| Realtime | WebSocket / Pusher (chat & notifications) |
| Auth | Auth.js (NextAuth) — email/phone OTP + Google/Facebook/LinkedIn |
| Payment | aamarPay (redirect flow) |
| Live class | Zoom (meeting objects stored per unit) |

---

## 2. User roles

Five roles drive the whole system. Role is stored on the user record (`user.role`) and drives
dashboard routing and menu permissions.

| Role | Route prefix |
|---|---|
| **Admin** | `/admin` |
| **Instructor** | `/instructor` |
| **Agent** | `/agent` (shares most instructor pages) |
| **Student** | `/student` |
| **Parent** | `/parent` |

Registration lets a user pick a sector: **Student / Instructor / Agent**. Instructor & Agent
registrations are **pending approval by Admin** before activation. There is also a
**role + role-permission** system (`manage-role`, `manage-role-permission`) that lets Admin define
custom roles and toggle which menu items each role can see — i.e. RBAC on top of the fixed 5 roles.

### Auth model
- **Server-side sessions** (Auth.js) with httpOnly secure cookies; refresh tokens + CSRF protection.
- Authorization enforced **server-side** (Next.js middleware + per-route-handler role checks) — never trust `user_id`/`role` from the client.
- Supports admin **impersonation / role switching** (restricted to admins, audit-logged).

---

## 3. Authentication & onboarding flow

```
SignUp (email OR phone)
   └─ send OTP  ──►  OTPConfirmation (verify OTP)
                        └─ UserInformation (fullName, phone/email, password)
                              └─ register  ──►  Login
Login  ──►  role-based redirect
Reset password:  reset_send_otp ─► reset_verify_otp ─► reset_pass
Social login: Google / Facebook / LinkedIn
```

Relevant endpoints: `auth/login`, `auth/register`, `auth/send_otp`, `auth/verify_otp`,
`auth/reset_send_otp`, `auth/reset_verify_otp`, `auth/reset_pass`, `auth/switched_user`.
Apply rate limiting / abuse protection on `send_otp` and password reset.

---

## 4. Feature map (grouped by domain)

### 4.1 Public / Marketing site
Composed on the Home page in this order:
Banner + discount popup → Countdown → OurCourse → TopCourse → UpComingBatch → SuccessfulStudent →
AllMentors → WhyTrustUs → AgentOffice → CallNow → ContactForm → Blogs.

| Feature | Route | Notes / API |
|---|---|---|
| Home | `/` | Banner from `banner`, discount popup |
| Course catalog | `/course`, `/onlineBatch` | `courses/all`, `courses/complex_search` |
| Course details | `/courseDetails/:id` | `courses/get/:id`, enroll, reviews, ratings |
| Course curriculum (video) | `/courseCurriculum/:id` | course + units |
| Live course curriculum | `/liveCourseCurriculum/:id` | batch + units + Zoom |
| Cart | `/cart` | client-side cart |
| Payment (cart) | via `/student/paymentCart` | aamarPay / wallet |
| Mentors list | `/mentorsList` | `auth/get_all_instructor_for_home_page` |
| Mentor details | `/mentorDetails/:id` | `auth/get_instructor/:id`, reviews |
| Mentor booking | `/mentorBooking/:id` | slot booking |
| Blog list / details | `/blog`, `/blogDetails/:id`, `/blogList/:id` | `blog/*`, categories, reviews |
| Seminars | `/seminar` | `seminar/all`, participant registration |
| Forum (public Q&A) | `/forum` | `public_forum/*` |
| Agent offices | `/agentOffice`, `/agentOfficeDetails` | |
| Career | `/career`, `/careerDetails` | + application form |
| Institute pages | `/institutePage`, `/institutePageDetails` | |
| Certificate verification | `/certificate/:id` | `certificate/by_code/:code` |
| Static | `/aboutUs`, `/contactUs`, `/termAndCondition`, `/learnPage` | |
| Upcoming batches | `/upComingBatch` | `courses/upComingBatch` |
| All students / All activity | `/allStudents`, `/allActivity` | |
| Quiz (take) | `/quiz/:id` | random quiz, submit answers |
| Zoom meeting | `/zoom-meeting` | join live class |

### 4.2 Learning content domain (the LMS core)

This is the most important cluster to model correctly. The content hierarchy is:

```
Course
 └─ Course Category
 └─ Curriculum = ordered list of Sections
      Section
        ├─ Units (ordered)          ← video / live-class lesson
        │    └─ Zoom meeting info (for live)
        │    └─ attachment, duration, free_unit flag
        ├─ Quiz (optional, one per section)
        └─ Assignment (optional, one per section)
 └─ Batch (a scheduled run of a course: dates, seats, schedule days/times)
 └─ Enrollment (student ↔ course, with progress)
```

Model `Section`, `Unit`, `Quiz`, `Assignment` as real ordered relations (with an `order` column),
plus an ordering endpoint (mirrors `units_order`).

**Content entities & their admin/instructor management pages:**
- **Courses** — `manage-course`, `add-course`; types: online / offline / **video course**; bundle courses. Rich config (see §6 Course fields): drip feed, prerequisites, certificate settings, badges, retakes, forum linkage, pricing (regular/sell), free-course flag, first-section-free, auto-evaluation, unit completion lock, etc.
- **Course Categories** — `manage-course-course-category`.
- **Batches** — `manage-batch` (admin/agent) and instructor variant; schedule days, start/end date, seats, dummy participants, per-batch curriculum.
- **Units** — `manage-unit`; a lesson (video link / Zoom / Google Drive), duration, free flag, class status (pending/started/ended).
- **Sections** — `manage-section` (grouping within a course/batch).
- **Video courses** — `manage-video-course` (Vimeo/YouTube/Drive upload workflow).
- **Quizzes** — `manage-quiz`; plus **Questions** (`manage-question`), **Question Tags** (`question-tag`), and a **Random Quiz** builder (`/admin/random-quiz`) that assembles quizzes from tagged question banks.
- **Assignments** — `manage-assignment`; submission types (text area / file), time limit, max marks, auto-evaluation.
- **Certificates** — `manage-certificate`; templates, passing %, badge, generation per user, additional certificates. Public verification by code.
- **Seminars** — `manage-seminar`; participant list registration.
- **Forums** — `manage-forum` (course forums) + public forum.
- **Blogs** — `manage-blog`, `manage-blog-category`; reviews.
- **Banner** — `manage-banner` (home hero + discount popup config).
- **Promo codes** — `promocode` / `manage-promocode`.

### 4.3 Student experience (`/student`)
| Feature | Route | API |
|---|---|---|
| Dashboard (counts) | `/student` | `auth/allCountsForUser/:id` |
| My courses | `my-course` | enrolled courses |
| Course details / player | `my-course-details`, `my-course/:id` | progress update `course/enroll/progress/update` |
| My batch | `my-batch` | |
| Live class | `live-class` | Zoom join |
| My quiz / quiz details | `my-quiz`, `quiz-Details/:id` | `quiz_result/*`, `random_quiz_result/*` |
| Booking instructor | `booking-instructor` | `slot/booked_by_student` |
| Commission | `commission` | referral commissions |
| Wallet | `commission-wallet` | `pay/wallet-by-user`, recharge, withdraw |
| Payment history | `payment`, `paymentCart` | `pay/history-by-user` |
| Certificate | `certificate` | `certificate/by_user`, badges |
| Learning path | `learningPath` | |
| Create course | `add-course` | student-authored course (rare) |
| Profile | `userProfile` | |

### 4.4 Instructor experience (`/instructor`)
Manage courses, categories, batches (instructor-scoped), units, sections, quizzes, questions,
question-tags, assignments, certificates, seminars, blogs. Plus:
- **Live class** (`live-class`) — start/stop Zoom classes, update `class_status`.
- **Booking list** (`booking-list`) — student slot bookings; slot create/update/delete (`slot/*`).
- **Assignments grading** — `assignment`, `batch-assignments/:id`, `batch-assignments/assignment/:id`, `assignment_result/*`.
- **Additional mark** (`additional-mark`) — manual marks (`certificate/additional_add`).
- **Commission** & **Wallet** (`commission`, `commission-wallet`) + **recharge history**.
- **Payment / withdrawal** (`payment`) — `pay/update_withdrawal_status`.
- Dashboard counts: `auth/allCountsForInstructor/:id`.

### 4.5 Agent experience (`/agent`)
Nearly identical menu to Instructor (shares course/batch/unit/quiz/assignment management, live class,
booking list, commission, wallet, payment). Agents also appear on the public site as **Agent Offices**
(regional offices selling courses / earning commission).

### 4.6 Parent experience (`/parent`)
Link parent ↔ student and let a parent monitor a child's enrolled courses, progress, attendance,
quiz/assignment results, and payments.

### 4.7 Admin experience (`/admin`) — superset
Full sidebar groups:
- **Manage Course** (expandable): all courses, categories, batch, unit, quiz, question, question-tag, assignment.
- Additional mark, Bundle course, Manage Institute, Promo code, Manage Instructor, Manage Student, Banner, Manage Seminar.
- **Admin User** (expandable): Manage Role, Admin Users, Menu Permission (`manage-role-permission`).
- Manage Parent, Public QNA, Commission, Payment (`all-payment` → `pay` history), Certificate, Group, Chatting, Random Quiz.
- **Manage Blog** (expandable): Blog category, Manage blog.
- User approval: instructor applications (`auth/new_instructor`), user management (`auth/all_users`, `switched_user`, `update_user`).

---

## 5. Cross-feature relationships (how things connect)

```
                         ┌──────────────┐
                         │    User      │ (role: admin/instructor/agent/student/parent)
                         └──────┬───────┘
        ┌───────────────┬───────┼─────────────┬──────────────┐
        │ authors       │ enrolls             │ books         │ owns
        ▼               ▼                      ▼               ▼
     Course ◄─── Enrollment ───► Student    Slot/Booking    Wallet ── Transaction
        │  \                                    ▲              │         (recharge/
        │   \─ belongs to ─► CourseCategory     │ instructor   │          withdrawal/
        │                                       │              │          payment)
        │ has many                              │              ▼
        ▼                                    Instructor     Commission (referral / promo)
     Batch (scheduled run) ─ has ─► ScheduleDay/Time, seats
        │
        │ curriculum (ordered)
        ▼
     Section ──┬── has many ──► Unit ── has ──► ZoomMeeting / Attachment
               ├── has one ───► Quiz  ── has many ──► Question ── tagged ──► QuestionTag
               └── has one ───► Assignment ── has many ──► AssignmentSubmission/Result

  QuizResult (User × Quiz)     Certificate (User × Course, template + passing%)  ─► Badge
  RandomQuiz (built from QuestionTags) ─► RandomQuizResult

  Course ── may link ──► Forum (course forum)      PublicForum (site-wide Q&A: posts, comments, likes)
  Blog ── belongs to ──► BlogCategory,  has ──► BlogReview
  Seminar ── has many ──► SeminarParticipant
  Mentor(=Instructor) ── has ──► MentorReview, Slots, AgentOffice
  Promo/Promotion ── applied to ──► Payment
  Banner ── drives ──► Home hero + discount popup
```

**Enrollment → payment chain:** Course Details → `course/enroll/add` → Cart → Payment
(`pay/aamar_pay` redirect **or** `pay/buy_with_wallet`) → on success, enrollment activated →
progress tracked via `course/enroll/progress/update` → completion → Certificate generated → Badge.
Validate prices, discounts, and balances **server-side in a DB transaction**.

**Commission chain:** Student/Agent refers → referral recorded → commission credited to Wallet →
withdrawal request → admin approves (`update_withdrawal_status`).

---

## 6. Data model (for Prisma schema)

Treat rich-text/HTML fields as `Text`. Store money as `Int` (paisa) or `Decimal`. Use real `Boolean`
columns for all flags.

### User
`id, fullName, email (unique), phone_number (unique), password (hashed), role, pro_pic (json: {path,filename,originalname}), status (active/pending), bio, address, social links, createdAt, updatedAt`
Instructor-extra: education, achievements, "other" info, review aggregate, approval status.

### CourseCategory
`id, name, slug, icon, createdAt`

### Course
Core: `id, courseCategoryId, courseTitle, shortTitle, courseDescription(html), whatWillBeTaught (string[]), courseType (online/offline/video), courseLanguage, courseLevel, courseStarDate, courseDuration, courseDurationParameter (Second/Minute/Hours/Day/Week/Month/Year), maximumStudents, regularPrice, sellPrice, videoUpload (vimeoVideo/youtube/drive), videoLink, thumbLinePicPath (json), status`
Flags (real `Boolean`):
`freeCourse, firstSectionFree, autoEvaluation, showUnitContentCurriculum, unitCompletionLock, hideCourseButtonAfterSubscription, displayCourseProgressOnCourseHome, timeBasedCourseProgress, postCourseReviewsFromCourseHome, ForceBatchEnrollment, SectionDripFeed, dripFeed, completionCertificate, dripDurationUnitDuration, hideExpiredBatches`
Certificate/badge: `certificate, badge, badgePercentage, badgeTitle, excellenceBadge(json), certificatePassingPercentage, certificateTemplate, completionCertificate`
Advanced: `prerequisiteCourse (self relation), courseForum (Forum FK), courseRetakes, dripFeedDurationStatic, dripDurationParameter, courseGroup, courseSpecificInstructions(html), courseCompletionMessage(html), support, aboutCourse (FAQ json[]: {title, answer})`

### Batch
`id, course_id (FK), start_date, end_date, scheduleDay (string[]), scheduleTime, seats, dummy_participants, courseCurriculum (ordered → Sections/Units/Quiz/Assignment refs), user_id (creator), user_role, createdAt`

### Section
`id, title, courseId/batchId, order`

### Unit (lesson)
`id, title, description(html), author, type (video/live), code, free_unit (bool), unit_duration, unit_duration_parameter, link (public video), video_link (drive), instructor_link (zoom host), zoom_info (json — full Zoom meeting object), attachment (json), class_status (pending/started/ended), started_time, ended_time, start_date, start_time, tag, unit_forum, connect_assigment, createdAt`

### ZoomMeeting (1:1 with Unit — its own table)
`id, uuid, topic, host_id, host_email, duration, join_url, start_url, password, encrypted_password, timezone, status, settings (json)`
Never expose `start_url`/host tokens to students.

### Quiz
`id, title, quiz_subtitle, description(html), author, type, connected_course, quiz_duration, quiz_duration_parameter, show_result_after_submission, negative_marks_per_quiz, number_of_quiz_per_page, auto_evaluate_results, number_of_extra_quiz_retakes, number_of_questions, marks, randomize (bool), passing_marks, code, attachment, tags (QuestionTag[]), questions (Question[])`

### Question
`id, questionText(html), type (mcq/…), options[], correctAnswer(s), marks, tags (QuestionTag[]), author`

### QuestionTag
`id, tag (name), createdAt`

### RandomQuiz / RandomQuizResult
RandomQuiz: `id, title, tags[], number_of_questions, marks, duration, …` (assembled from tagged question bank).
Result: `id, user_id, random_quiz_id, answers(json), score, submittedAt`.

### Assignment
`id, title, subTitle, description(html), author, timelimit, durationParameter, attachmentType, attachmentSize, autoEvaluation (bool), includInCourse, maximumMarks, assignmentSubmissions (Text Area/File), attachment`

### AssignmentResult / Submission
`id, assignment_id, batch_id, user_id, submission (text/file), marks, feedback, evaluatedBy, createdAt`

### QuizResult
`id, quiz_id, user_id, answers(json), score, passed (bool), attempt, createdAt`

### Enrollment
`id, user_id (student), course_id, batch_id?, type (payment/free), progress (json/float), status, enrolledAt` — progress updated per unit.

### Certificate + Badge
Certificate: `id, user_id, course_id, template_id, code (unique, for public verify), passing_percentage, issuedAt`
Badge: `id, user_id, course_id, title, percentage, image`
CertificateTemplate: `id, name, layout/asset`

### Seminar + SeminarParticipant
Seminar: `id, title, description, date, time, location/link, banner, seats`
Participant: `id, seminar_id, name, phone, email, extra fields, createdAt`

### Forum (course) + PublicForum
Forum: `id, course_id, title, posts…`
PublicForum: `id, author (user), question, body, tags, createdAt` → `contributors`, `give_comment`, `give_like` (Comment: `id, post_id, user_id, body`; Like: `id, post_id, user_id`).

### Blog + BlogCategory + BlogReview
Blog: `id, title, slug, content(html), thumbnail, blog_category_id, author, status (draft/published), popular (bool), createdAt`
BlogReview: `id, blog_id, user_id, rating, comment, createdAt`

### Mentor (Instructor profile) — MentorReview, Slot, Booking
MentorReview: `id, instructor_id, user_id, rating, comment`
Slot: `id, instructor_id, date, start_time, end_time, booked (bool)`
Booking: `id, slot_id, student_id, status`

### Wallet + Transaction (payments, recharge, withdrawal, commission)
Wallet: `id, user_id, balance`
Transaction: `id, user_id, type (payment/recharge/withdrawal/commission), amount, status (pending/approved/rejected), gateway (aamarPay/wallet), reference, promo_id?, course_id?, createdAt`

### Promo / Promotion
`id, code (unique), discount_type (%/flat), value, usage_limit, valid_from, valid_to, applicable_courses[], status`

### Role + RolePermission
Role: `id, name`
RolePermission: `id, role_id, menu_key, allowed (bool)` — controls which sidebar items each role sees.

### Banner
`id, hero fields, discount popup config (title, discount %, countdown end time, image), active`

### AgentOffice
`id, name, location, contact, banner, commission_rate, courses[]`

### Career
`id, title, description, location, deadline, requirements` (+ application form submissions).

**Suggested model count:** ~30 models (User, Course, CourseCategory, Batch, Section, Unit, ZoomMeeting, Quiz, Question, QuestionTag, RandomQuiz, QuizResult, RandomQuizResult, Assignment, AssignmentResult, Enrollment, Certificate, CertificateTemplate, Badge, Seminar, SeminarParticipant, Forum, PublicForumPost, ForumComment, ForumLike, Blog, BlogCategory, BlogReview, MentorReview, Slot, Booking, Wallet, Transaction, Promo, Role, RolePermission, Banner, AgentOffice, Career).

---

## 7. API surface

Resource-based REST route handlers (or server actions). Standardize on one consistent surface.

**Auth/User:** `auth/login`, `auth/register`, `auth/send_otp`, `auth/verify_otp`, `auth/reset_send_otp`, `auth/reset_verify_otp`, `auth/reset_pass`, `auth/all_users`, `auth/get_user/:id`, `auth/update_user/:id`, `auth/switched_user`, `auth/search_non_student`, `auth/allCountsForUser/:id`, `auth/allCountsForInstructor/:id`, `auth/get_all_instructor_for_home_page`, `auth/get_instructor/:id`, `auth/new_instructor`, `auth/instructorSearch`, `auth/update_user_instructor`, `auth/review`, `auth/review/update`.

**Courses:** `courses/all`, `courses/get/:id`, `courses/add`, `courses/update/:id`, `courses/destroy/:id`, `courses/search`, `courses/complex_search`, `courses/status_update`, `courses/course_for_instructor`, `courses/upComingBatch`, `courses/units_order`, `courses/student_units_order`. Enroll: `course/enroll/add`, `course/enroll/delete`, `course/enroll/progress/update`.

**Course category:** `course-category/*` (add/all/update/delete).
**Batch:** `batch/all`, `batch/get/:id`, `batch/add`, `batch/update/:id`, `batch/delete/:id`, `batch/by_course`, `batch/assigns`, `batch/getBatchesForInstructor`.
**Unit:** `unit/all`, `unit/add`, `unit/update/:id`, `unit/delete`, `unit/search`, `unit/class_status_update`.
**Quiz/Question:** `quiz/*`, `quiz/search`, `question/*`, `question/tag/*` (+ `search`), `quiz_result/add`, `quiz_result/update`.
**Random quiz:** `random_quiz`, `random_quiz/all_with_tags`, `random_quiz/update`, `random_quiz/delete`, `random_quiz_result`, `random_quiz_result/foruser`, `random_quiz_result/submitAnswer`.
**Assignment:** `assignment/*`, `assignment/search`, `assignment_result/add`, `assignment_result/update`, `assignment_result/get_ass_results`.
**Certificate:** `certificate/all`, `certificate/by_user`, `certificate/by_code/:code`, `certificate/search`, `certificate/update`, `certificate/delete`, `certificate/additional_add`, `certificate/all_certi_gen`, `certificate/badge_by_user`.
**Seminar:** `seminar/all`, `seminar/update`, `seminar/delete`, `seminar/participant/add`, `seminar/get_participants`.
**Forum:** `forum/all`, `forum/update`, `forum/delete`, `public_forum/all`, `public_forum/add`, `public_forum/give_comment`, `public_forum/give_like`, `public_forum/contributors`.
**Blog:** `blog/all`, `blog/:id`, `blog/update`, `blog/delete`, `blog/update_status`, `blog/popular_blogs`, `blog/blogs_for_instructor`, `blog/addReview`, `blog/updateReview`, `blog/deleteReview`, `blog_category`.
**Slots/Booking:** `slot/booked_by_student`, `slot/update-slot`, `slot/delete-slots`.
**Payments/Wallet/Promo:** `pay/aamar_pay`, `pay/buy_with_wallet`, `pay/history-by-user`, `pay/history-by-user/recharge`, `pay/wallet-by-user`, `pay/update_withdrawal_status`, `pay/promo`, `pay/promo/all`, `pay/promo_check`, `promo`, `promotion/all`, `promotion/apply`, `promotion/update`.
**Role:** `role/update_role`, `role/delete_role`.
**Banner:** `banner`.
**Admin:** `admin/update`.
**Videos:** `videos` (stream), `unit/update` (drive upload callback).

---

## 8. Build recommendations

1. **Auth:** Auth.js/NextAuth with cookie sessions + refresh. Enforce RBAC in Next.js middleware + route handlers, not the UI. Keep OTP + social (Google/FB/LinkedIn) providers. Restrict impersonation to admins and audit-log it.
2. **Booleans & money:** Prisma `Boolean` for flags; money as `Int` (paisa) or `Decimal`.
3. **Curriculum modeling:** `Section`, `Unit`, `Quiz`, `Assignment` as real relations with an `order` column. Provide an ordering endpoint (mirrors `units_order`).
4. **Zoom/Vimeo:** Keep integration server-side; store `ZoomMeeting` as its own table linked to `Unit` (1:1). Never expose `start_url`/host tokens to students.
5. **Endpoint hygiene:** One consistent REST (or route handlers / server actions) surface. Standardize on resource-based routes.
6. **Payments:** aamarPay + wallet + commission + withdrawal approval as transactional flows (Prisma `$transaction`) to keep wallet balances consistent.
7. **File uploads:** Use proper object storage (S3/Cloudinary/UploadThing) and store full URLs.
8. **i18n:** UI is Bangla-first; externalize strings.
9. **Realtime:** Notifications (enrollment, class start, grading, payment) + optional chat via WebSocket/Pusher.
10. **Learning gates:** Enforce drip-feed, prerequisites, first-section-free, and unit-completion-lock **server-side** when serving units.
11. **Video progress:** Implement watch-progress tracking (`course/enroll/progress/update`) and resume-from-last-position.
12. **Quality:** SSR/ISR for marketing + course pages (SEO), pagination standard, structured logging, tests, accessibility, and soft deletes / audit trail.

---

## 9. Route inventory (quick reference)

**Public:** `/`, `/course`, `/onlineBatch`, `/courseDetails/:id`, `/courseCurriculum/:id`, `/liveCourseCurriculum/:id`, `/login`, `/signUp`, `/otpConfirmation`, `/userInformation`, `/resetPassword`, `/cart`, `/blog`, `/blogDetails/:id`, `/blogList/:id`, `/mentorsList`, `/mentorDetails/:id`, `/mentorBooking/:id`, `/contactUs`, `/termAndCondition`, `/career`, `/careerDetails`, `/seminar`, `/learnPage`, `/institutePage`, `/institutePageDetails`, `/aboutUs`, `/studentProfile`, `/parentProfile`, `/form`, `/allActivity`, `/upComingBatch`, `/agentOffice`, `/agentOfficeDetails`, `/allStudents`, `/quiz/:id`, `/forum`, `/certificate/:id`, `/zoom-meeting`, `/linkedin`.

**Admin** (`/admin/*`): `""`, `manage-course`, `all-payment`, `random-quiz`, `userProfile`, `manage-course-course-category`, `add-course`, `bundle-course`, `create-bundle-course`, `manage-batch`, `manage-video-course`, `manage-unit`, `manage-section`, `manage-certificate`, `manage-seminar`, `manage-quiz`, `manage-question`, `question-tag`, `manage-assignment`, `manage-role`, `manage-banner`, `promocode`, `manage-role-permission`, `manage-instructor`, `manage-student`, `manage-user`, `public-qna`, `manage-admin`, `manage-blog-category`, `manage-blog`, `manage-forum`, `additional-mark`.

**Student** (`/student/*`): `""`, `my-course`, `my-course-details`, `my-course/:id`, `userProfile`, `my-quiz`, `quiz-Details/:id`, `my-batch`, `live-class`, `booking-instructor`, `commission`, `commission-wallet`, `payment`, `paymentCart`, `certificate`, `add-course`, `learningPath`.

**Instructor** (`/instructor/*`): `""`, `manage-course`, `add-course`, `manage-course-course-category`, `manage-batch`, `manage-video-course`, `manage-unit`, `manage-section`, `manage-certificate`, `manage-seminar`, `manage-quiz`, `manage-question`, `question-tag`, `manage-assignment`, `course-list`, `userProfile`, `manage-blog`, `live-class`, `additional-mark`, `booking-list`, `commission`, `assignment`, `batch-assignments/:id`, `batch-assignments/assignment/:id`, `commission-wallet`, `payment`.

**Agent** (`/agent/*`): same set as Instructor (minus a few grading pages).

**Parent** (`/parent/*`): `""`.

---

## 10. Feature completeness targets

| Area | Target |
|---|---|
| Auth / OTP / social login | Server-side sessions, cookie-based, RBAC enforced |
| Course catalog / details / enroll | Full CRUD + enrollment |
| Cart / payment (aamarPay, wallet) | Transactional, server-validated |
| Video course player | Progress tracking + resume |
| Live class (Zoom) | Meeting objects + join |
| Quiz / Question / Random quiz | Full engine + auto-evaluation |
| Assignment submit/grade | Submit + grade + feedback |
| Certificates / badges | Issue → verify → badge pipeline |
| Batches / units / sections | Ordered relations + CRUD |
| Blogs + reviews | Full CRUD |
| Seminars | Registration + participants |
| Forums (public + course) | Posts, comments, likes |
| Mentors / booking / slots | Booking + slot management |
| Wallet / commission / withdrawal | Ledger + admin approval |
| Promo codes | Apply + validate |
| Admin management suite | Full RBAC-gated suite |
| Instructor / Agent dashboards | Real aggregates |
| Parent dashboard | Real parent↔student monitoring |
| Chat / notifications | Delivered via WebSocket/Pusher |
| Career / Institute / About / Agent-office | CMS/DB-backed |

---

## 11. Lumen — Design System & Style Guide

The visual identity of this LMS is a theme called **Lumen**: a *warm paper canvas*, *pine-green ink*, and a *gold highlighter accent*. It evokes the feeling of studying with a well-loved textbook — ruled paper, margin notes, and a marker swipe over the one phrase that matters.

- **Source of truth:** [`src/app/globals.css`](src/app/globals.css)
- **Color model:** OKLCH (perceptually uniform lightness — easy to tune contrast)
- **Framework:** Tailwind CSS v4 + shadcn/ui, with `next-themes` for light/dark switching
- **Radius base:** `--radius: 0.75rem`

### 11.1 Concept

> Warm paper canvas · pine-green ink · gold highlighter accent

| Role | Meaning |
|------|---------|
| **Canvas** | Warm off-white "paper" background — soft, easy on the eyes |
| **Ink** | Deep pine-green used for text and primary actions |
| **Highlighter** | Saturated gold, reserved for a single key phrase or emphasis |

The design leans on **restraint**: the gold accent is deliberately rare, mimicking how a student highlights only what matters.

### 11.2 Color Palette

Colors are defined as CSS custom properties in OKLCH. Approximate hex values are given for reference only.

#### Light theme (`:root`)

| Token | OKLCH | ~Hex | Use |
|-------|-------|------|-----|
| `--background` | `0.9834 0.0064 95` | `#fdfcf7` | Warm paper canvas |
| `--foreground` | `0.2600 0.0180 165` | `#1f2b26` | Pine-charcoal ink (text) |
| `--card` | `1 0 0` | `#ffffff` | Cards / surfaces |
| `--card-foreground` | `0.2600 0.0180 165` | `#1f2b26` | Text on cards |
| `--primary` | `0.4900 0.0950 162` | `#2f7a5e` | Pine green — buttons, links |
| `--primary-foreground` | `0.9880 0.0120 95` | `#fefdf6` | Text on primary |
| `--secondary` | `0.9350 0.0230 150` | `#e2f0e6` | Soft mint surface |
| `--secondary-foreground` | `0.3400 0.0420 162` | `#31473d` | Text on secondary |
| `--muted` | `0.9560 0.0110 120` | `#eef0e9` | Muted surfaces |
| `--muted-foreground` | `0.5000 0.0260 162` | `#5f7469` | Secondary text |
| `--accent` | `0.8550 0.1480 88` | `#e8c14a` | **Gold highlighter** |
| `--accent-foreground` | `0.3000 0.0500 80` | `#4a3b18` | Text on accent |
| `--destructive` | `0.5770 0.2050 27.3` | `#d33c2f` | Errors / delete |
| `--border` | `0.9000 0.0140 130` | `#dde2d8` | Borders |
| `--input` | `0.9000 0.0140 130` | `#dde2d8` | Input borders |
| `--ring` | `0.4900 0.0950 162` | `#2f7a5e` | Focus ring (pine) |

#### Dark theme (`.dark`)

Deep pine-charcoal base with luminous green + gold.

| Token | OKLCH | ~Hex | Use |
|-------|-------|------|-----|
| `--background` | `0.2050 0.0140 165` | `#182420` | Deep pine-charcoal |
| `--foreground` | `0.9350 0.0120 95` | `#eeeadf` | Warm paper text |
| `--card` | `0.2450 0.0160 165` | `#1e2c27` | Cards |
| `--primary` | `0.7150 0.1350 160` | `#4fbf90` | Luminous green |
| `--primary-foreground` | `0.2050 0.0180 165` | `#182420` | Text on primary |
| `--secondary` | `0.3000 0.0220 162` | `#2c3d36` | Secondary surface |
| `--muted` | `0.2750 0.0150 165` | `#26332e` | Muted surfaces |
| `--muted-foreground` | `0.7150 0.0200 130` | `#a6b3a6` | Secondary text |
| `--accent` | `0.8100 0.1450 88` | `#d9b544` | Gold (slightly dimmer) |
| `--destructive` | `0.6368 0.2078 25.3` | `#e5533f` | Errors |
| `--border` | `0.3050 0.0180 165` | `#2e3d37` | Borders |
| `--ring` | `0.7150 0.1350 160` | `#4fbf90` | Focus ring |

#### Chart colors

Sequential greens → gold → teal, for data visualization.

| Token | Light | Meaning |
|-------|-------|---------|
| `--chart-1` | `0.4900 0.0950 162` | Pine green |
| `--chart-2` | `0.6100 0.1200 158` | Mid green |
| `--chart-3` | `0.8550 0.1480 88` | Gold |
| `--chart-4` | `0.7000 0.1300 130` | Lime-green |
| `--chart-5` | `0.4200 0.0800 200` | Teal |

#### Sidebar

The sidebar has its own slightly-tinted surface tokens (`--sidebar`, `--sidebar-primary`, `--sidebar-accent`, etc.) that mirror the main palette but sit one shade cooler/greener than the canvas.

### 11.3 Typography

Three Google fonts, loaded via `next/font` in [`src/app/layout.tsx`](src/app/layout.tsx):

| Role | Font | CSS variable | Usage |
|------|------|--------------|-------|
| **Body / sans** | Plus Jakarta Sans | `--font-sans` | Default body text |
| **Headings** | Bricolage Grotesque | `--font-heading` | `h1–h4`, `.font-heading` |
| **Mono** | Geist Mono | `--font-mono` | Eyebrows, code, labels |
| Serif (fallback) | Lora | `--font-serif` | Reserved |

**Rules (`@layer base`):**
- `html` uses `--font-sans`.
- `h1, h2, h3, h4, .font-heading` use Bricolage Grotesque with tight tracking `letter-spacing: -0.02em`.
- Base letter spacing: `--tracking-normal: 0em` (with `tighter`/`tight`/`wide`/`wider`/`widest` scale steps of ±0.025em–0.1em).

### 11.4 Radius, Shadow & Spacing

#### Radius
Base `--radius: 0.75rem`, scaled into a full ramp:

| Token | Formula | Value |
|-------|---------|-------|
| `--radius-sm` | `× 0.6` | 0.45rem |
| `--radius-md` | `× 0.8` | 0.6rem |
| `--radius-lg` | `× 1.0` | 0.75rem |
| `--radius-xl` | `× 1.4` | 1.05rem |
| `--radius-2xl` | `× 1.8` | 1.35rem |
| `--radius-3xl` | `× 2.2` | 1.65rem |
| `--radius-4xl` | `× 2.6` | 1.95rem |

#### Shadows
Soft, tinted shadows — the shadow color is a **green-tinted** hue, not neutral black:
- Light: `--shadow-color: 160 25% 25%`, low opacity (`0.08`)
- Dark: `--shadow-color: 160 30% 4%`, higher opacity (`0.3`)
- Ramp: `--shadow-2xs` → `--shadow-2xl` (subtle, layered offsets, `blur 10px`, `spread -2px`, `offset-y 2px`)

#### Spacing
Base unit `--spacing: 0.25rem` (Tailwind default 4px scale).

### 11.5 Signature Utilities

Custom classes in `@layer utilities` that carry the "textbook" personality. **Use sparingly.**

| Class | Effect |
|-------|--------|
| `.marker` | A **gold highlighter swipe** drawn behind text via a slanted `linear-gradient`. Reserved for *one* key phrase per view. |
| `.eyebrow` | Mono, uppercase, wide-tracked (`0.18em`) kicker label above section headings. |
| `.margin-note` | Padded-left heading with a short accent rule to its left — like a note jotted in a margin. |
| `.paper-lines` | Faint repeating ruled-paper horizontal lines (1.75rem rhythm). Used once, behind the hero card. |
| `.reveal` | Page-load reveal: content rises 14px + fades in over `0.7s` with easing `cubic-bezier(0.22, 1, 0.36, 1)`. |

### 11.6 Motion & Accessibility

- **Reveal animation:** `reveal-rise` keyframe (translateY + opacity).
- **Reduced motion:** A `@media (prefers-reduced-motion: reduce)` block nearly disables all animation, transition, and smooth-scroll (`0.01ms`) — respecting user preferences.
- **Focus:** Every element gets `outline-ring/50` by default (`@apply border-border outline-ring/50`), so focus states use the pine-green ring at 50% opacity.

### 11.7 How to Use

```tsx
// Semantic tokens — never hardcode colors. Use Tailwind classes bound to tokens:
<div className="bg-background text-foreground">
  <span className="eyebrow">Module 01</span>
  <h2 className="font-heading">
    Learn with <span className="marker">focus</span>
  </h2>
  <button className="bg-primary text-primary-foreground rounded-lg">
    Start
  </button>
  <div className="bg-card border border-border rounded-xl shadow-md">…</div>
</div>
```

**Guidelines**
1. Always use semantic tokens (`bg-primary`, `text-muted-foreground`, `border-border`) — never raw hex.
2. Gold `accent` = emphasis only. If everything is highlighted, nothing is.
3. Headings → `font-heading`; labels/eyebrows → mono.
4. Both light and dark themes are fully defined; test in both.
5. Prefer the radius/shadow ramp over ad-hoc values.
6. Build UI from **shadcn/ui** primitives (Button, Card, Dialog, Table, Tabs, Form, etc.) — they already consume these semantic tokens, so the Lumen theme applies automatically.

---

*Theme: **Lumen** · OKLCH color space · Tailwind v4 + shadcn/ui · defined in `src/app/globals.css`.*
