# User Guide

---

## Getting Started

1. Navigate to the platform URL (e.g. `http://localhost:3000` or the production URL)
2. Click **Login** and enter your FH Technikum Wien credentials
3. Authentication is handled via FH LDAP — use your standard university username and password

## Home Page

The landing page shows:
- **Feature highlights** — Shield (challenges), Target (practice), Trophy (scoreboard), Users (community)
- **Category links** — quick navigation to challenge categories
- **Login/Logout** button depending on auth state

## Challenges

### Browsing Challenges

Navigate to `/challenges` to see all available challenges. You can filter by:

- **Category** — Web Exploitation, Cryptography, Binary Exploitation, Reverse Engineering, Forensics
- **Difficulty** — Easy, Medium, Hard
- **Text search** — matches challenge titles and descriptions

Each challenge card shows: title, category, difficulty, points, and whether you've already solved it.

### Solving a Challenge

1. Click a challenge card to open the detail view
2. Read the challenge description
3. **Download attachments** if available (ZIP files, etc.)
4. Solve the challenge using your skills
5. Enter the flag and click **Submit**

### Static vs Dynamic Challenges

**Static challenges**: have a fixed flag stored in the database. All users submit the same flag. File downloads only — no container.

**Dynamic (Instance) challenges**: spawn a per-user Docker container with a unique flag. You must start the environment first.

## Terminal (Instance Challenges)

For dynamic challenges that require a container:

1. Click **Start Environment** on the challenge detail page
2. Wait for the Docker container to build and start (~10-30 seconds)
3. Click **Open Terminal** to connect via WebSocket
4. You'll see an SSH terminal inside the challenge container
5. Look for the flag in the container filesystem (typically at `/flag.txt`)
6. Copy the flag and submit it

**Terminal keyboard shortcuts:**
- `Ctrl+Shift+C` — Copy selected text
- `Ctrl+Shift+V` — Paste

The environment auto-expires after **1 hour**. You can manually stop it.

## Hints

Each challenge may have hints available:

1. Click **Reveal Hint** on the challenge detail page
2. Hints are revealed sequentially — there's a **60-second cooldown** between hints
3. Using hints reduces the points you earn:
   - Hint 0: -10% penalty
   - Hint 1: -20% penalty
   - Hint 2: -25% penalty

## Scoreboard

Visit `/scoreboard` to see:
- **Top solvers** — ranked by number of challenges solved
- **Recent solves** — activity feed of latest completions
- **Most solved challenges** — which challenges are most popular

## Courses

Courses are available to signed-in users only. If you open `/courses` without a session, you are redirected to the login page.

Visit `/courses` to browse educational course content. Courses are structured as:

**Course → Modules → Lessons**

Each lesson contains:
- Theory content
- Vulnerable (BAD) and secure (GOOD) code examples
- Real-world security incident references
- Related challenges to practice

## Profile

Visit `/profile` to see your:
- Username, email, display name
- Solved challenges
- Statistics and progress

## Category Pages

Each category (`/cryptography`, `/forensics`, `/web-exploitation`, etc.) shows:
- Category description and theory content
- Links to relevant challenges in that category

## Help

Visit `/help` for:
- Community forum links
- Documentation references
- Contact information
