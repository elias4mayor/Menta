# MENTA FULL WEBSITE AUDIT

Work ONLY on the current MENTA repository at ~/Downloads/Menta and the current website. Do NOT use, restore, copy from, or reference the old MENTA website.

MENTA should become one unified Athlete Operating System combining training, recovery, academics, recruiting, film, performance, communication, safety, and AI into one premium experience.

Audit the entire current codebase before changing anything.

Check and improve:

1. Authentication
- Sign up
- Login
- Logout
- Password reset
- Email verification
- Protected routes
- User profiles
- Role permissions

2. Athlete System
- Athlete profiles
- Sports
- Positions
- Teams
- Schools
- Graduation year
- Goals
- Achievements
- Statistics
- Performance history
- Development timeline

3. Training
- Workouts
- Training plans
- Exercise library
- Sets/reps
- Workout tracking
- Training calendar
- Coach assignments
- Progress tracking
- Sport-specific training

4. Performance
- Speed
- Strength
- Agility
- Endurance
- Jump metrics
- Personal records
- Performance trends
- Coach-entered data
- Athlete-entered data
- AI performance insights

5. Recovery
- Sleep
- Hydration
- Recovery check-ins
- Mobility
- Rest
- Fatigue tracking
- Recovery trends
- Wearable integrations if supported

6. Mental Performance
- Mindset check-ins
- Confidence
- Stress check-ins
- Goals
- Journaling
- Breathing exercises
- Pre-game preparation
- Post-game reflection
- Mental performance AI

7. AI Assistant
- Persistent AI chat bubble
- Chat history
- Athlete context
- Training help
- Academic help
- Recruiting help
- Film help
- Recovery guidance
- Scheduling
- Goal planning
- MENTA navigation
- Safe escalation behavior

8. Academics
- GPA
- Classes
- Assignments
- Deadlines
- Study planner
- Academic goals
- Grade tracking
- Eligibility awareness
- AI tutoring
- Calendar

9. Recruiting
- Recruiting profile
- College discovery
- School database
- Division filters
- Position filters
- Location filters
- Academic fit
- Athletic fit
- Target schools
- Coaches
- Recruiting timeline
- Outreach tracking
- Follow-ups
- Visits
- Offers
- Highlight videos
- Recruiting resume
- AI recruiting assistant

Never fabricate schools, coaches, offers, statistics, or contact information.

10. Film
- Video uploads
- Film library
- Highlights
- Clips
- Tags
- Game organization
- Practice organization
- Shareable film
- Coach feedback
- Film notes
- AI film analysis only if actual analysis exists

11. Coaches
- Rosters
- Athlete profiles
- Training plans
- Assignments
- Performance metrics
- Attendance
- Notes
- Feedback
- Film review
- Team announcements
- Communication

12. Parents / Guardians
- Guardian linking
- Permissions
- Appropriate athlete visibility
- Progress overview
- Academic overview
- Recruiting overview
- Notifications
- Safety information

13. Teams
- Team dashboard
- Roster
- Schedule
- Events
- Announcements
- Team communication
- Training
- Attendance
- Performance

14. Nutrition
- Hydration
- General nutrition education
- Pre-training nutrition
- Post-training nutrition
- Meal planning
- Food tracking if supported

Do not create dangerous restrictive dieting or extreme weight-loss functionality.

15. MENTA SAFETY
- Emergency preparedness
- Emergency action planning
- Heat awareness
- Hydration awareness
- Environmental conditions
- Emergency contacts
- Team emergency information
- Safety checklist
- Athlete check-ins
- Coach safety resources

MENTA SAFETY must focus on preparedness, not prediction. Do not pretend to diagnose or predict medical emergencies.

16. Calendar
Combine:
- Training
- Games
- Practices
- Classes
- Assignments
- Recruiting events
- Visits
- Recovery
- Reminders

17. Notifications
- Training reminders
- Academic reminders
- Recruiting reminders
- Coach messages
- Team announcements
- Safety notifications
- Goal reminders

18. Admin
Create secure role-based architecture for:
- Founder/admin
- Developers
- Coaches
- Staff
- Support
- Athletes
- Parents/guardians

Check admin permissions and prevent normal users from accessing admin functions.

19. Email
Verify:
- Signup emails
- Verification
- Password reset
- Notifications
- Support/contact emails

MENTA email:
hqmenta@gmail.com

Never expose credentials or API keys in frontend code.

20. Images and Media
Use ONLY assets belonging to the current repository/current website.

Check:
- Gallery
- Founder photos
- Logo
- Image loading
- Mobile images
- Broken images
- Alt text
- Image optimization
- Upload handling

Do NOT use the old website.

21. Homepage
Audit:
- Boot animation
- Navigation
- Hero
- Gallery
- Founder story
- Platform explanation
- Features
- Athlete benefits
- Coach benefits
- Recruiting
- AI
- MENTA SAFETY
- CTA
- Footer

Every button should perform a real action or navigate somewhere meaningful.

22. UI/UX
Keep the current premium MENTA identity:
- Matte black
- Modern white
- Athletic
- Premium
- Minimal
- Smooth
- Professional
- Responsive

Do not unnecessarily redesign working sections.

23. Mobile
Test mobile layouts and fix:
- Overflow
- Navigation
- Buttons
- Images
- Modals
- AI chat
- Forms
- Text sizing

24. Accessibility
Check:
- Keyboard navigation
- Focus states
- Alt text
- Labels
- Semantic HTML
- Contrast
- Screen readers
- Reduced motion

25. Security
Check:
- API keys
- Secrets
- Authentication
- Authorization
- API routes
- User input
- File uploads
- Database access
- Data exposure
- Role permissions

26. Performance
Check:
- Image optimization
- Bundle size
- Loading speed
- API performance
- Unnecessary renders
- Mobile performance
- Animations

CRITICAL RULES:

Do not simply create fake buttons or placeholder features.

Do not remove existing working features.

Do not replace the current website with an old version.

Do not invent data.

If an external API, database, email provider, AI provider, storage provider, OAuth provider, or environment variable is required but unavailable, clearly identify the dependency instead of pretending the feature works.

First inspect the repository.

Then make safe, high-value improvements.

Finally run:
- npm run lint
- typecheck if available
- npm run build

Then give me a final report containing:

CURRENT FUNCTIONAL FEATURES

BROKEN FEATURES

MISSING FEATURES

SECURITY ISSUES

AI STATUS

EMAIL STATUS

AUTH STATUS

DATABASE STATUS

IMAGE STATUS

RECRUITING STATUS

COACH/TEAM STATUS

PARENT/GUARDIAN STATUS

MENTA SAFETY STATUS

MOBILE STATUS

PERFORMANCE STATUS

P0 CRITICAL
P1 HIGH
P2 IMPORTANT
P3 FUTURE

Do not push to GitHub.
