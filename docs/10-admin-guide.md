# Admin Guide

Access the admin dashboard at `/admin`. Requires admin role.

---

## Admin Dashboard

The dashboard (`/admin`) shows:
- **Total users** — registered user count
- **Challenges** — total challenge count
- **Flags submitted** — total solve count
- **Trends** — recent activity
- **Courses** — published course count

## Challenge Management

### Creating a Challenge

Navigate to `/admin` and use the **Add Challenge** form:

| Field | Required | Description |
|-------|----------|-------------|
| Title | Yes | Challenge name |
| Description | Yes | Problem statement (markdown) |
| Category | Yes | One of: web-exploitation, crypto, binary-exploitation, reverse-engineering, forensics |
| Difficulty | Yes | easy, medium, or hard |
| Points | Yes | Score value |
| Flag | No | Static flag (leave blank for instance-based) |
| Download File | No | Any attachment; the download is named after the challenge title |
| Requires Instance | No | Check for dynamic container challenges |
| Docker Files | No | Upload Dockerfile + entrypoint.sh for instance challenges |
| Hints | No | Array of hint strings (revealed sequentially) |

### Editing a Challenge

Use the **Edit** button on any challenge in the admin list. Same fields as creation.

### Deleting a Challenge

Use the **Delete** button — removes the challenge and associated files.

## User Management

Navigate to `/admin/users`:

- **View all users** — table with username, email, admin status, active status
- **Toggle admin** — promote/demote users to/from admin
- **Search/filter** — find users by username

## Course Management

Navigate to `/admin/courses` for full CRUD on courses, modules, and lessons.

### Courses

| Field | Required | Description |
|-------|----------|-------------|
| Title | Yes | Course name |
| Description | No | Course overview |
| Slug | No | URL-friendly identifier (auto-generated from title) |
| Difficulty | No | beginner, intermediate, advanced |
| Estimated Minutes | No | Duration hint |
| Order Index | No | Display ordering |
| Published | No | Toggle visibility to users |

### Modules

Each course contains ordered modules. Create, edit, reorder, and delete modules.

| Field | Required | Description |
|-------|----------|-------------|
| Title | Yes | Module name |
| Content | No | Module overview text |
| Order Index | No | Display ordering within course |

### Lessons

Each module contains ordered lessons. The **TipTap rich text editor** is used for lesson content.

| Field | Required | Description |
|-------|----------|-------------|
| Title | Yes | Lesson name |
| Content | No | Lesson body (rich text) |
| Detailed Explanation | No | In-depth analysis section |
| Video URL | No | Optional video link |
| Order Index | No | Display ordering within module |
| Challenge IDs | No | Links to related practice challenges |

See the [Course Editor Guide](12-course-editor-guide.md) for detailed writing standards.

## Default Admin Accounts

The first-ever admin accounts are seeded automatically:
- `if24b120`
- `if24b234`

Additional admins can be added via the admin user management interface.
