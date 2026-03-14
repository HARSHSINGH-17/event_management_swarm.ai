export interface EventTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  text: string;
}

export const EVENT_TEMPLATES: EventTemplate[] = [
  {
    id: "tech-conference",
    name: "Tech Conference",
    icon: "💻",
    description: "3-day developer conference with workshops & keynotes",
    text: `TechSummit 2024 – March 15-17 at San Francisco Convention Center.

Rooms:
- Grand Ballroom (capacity: 600)
- Workshop Hall A (capacity: 120)
- Workshop Hall B (capacity: 80)
- Innovation Lab (capacity: 50)
- Breakout Room 1 (capacity: 40)

Day 1 Schedule (March 15):
9:00 AM – Opening Keynote: "The Future of AI in Software Development" by Dr. Sarah Chen from Google (Grand Ballroom, 90 minutes)
11:00 AM – Workshop: Kubernetes & Container Orchestration by Mike Johnson from Red Hat (Workshop Hall A, 120 minutes)
2:00 PM – Panel: Open Source in 2024 with Alex Rivera (Meta), Jamie Lee (Netflix), and Sam Patel (Stripe) (Grand Ballroom, 60 minutes)
4:00 PM – Hands-on Lab: Building LLM Pipelines by Dr. Marcus Wei from Anthropic (Innovation Lab, 90 minutes)

Day 2 Schedule (March 16):
9:30 AM – Keynote: "Distributed Systems at Scale" by Emma Nakamura from AWS (Grand Ballroom, 60 minutes)
11:00 AM – Workshop: React 19 & Server Components by Carlos Diaz from Vercel (Workshop Hall B, 120 minutes)
1:30 PM – Deep Dive: Rust for Systems Programming by Olga Petrov (Independent, olga@rustdev.io) (Innovation Lab, 90 minutes)
3:30 PM – Lightning Talks: Community Showcase (Grand Ballroom, 60 minutes)

Day 3 Schedule (March 17):
10:00 AM – Workshop: AI-Powered Testing Strategies by Priya Sharma from Microsoft (Workshop Hall A, 120 minutes)
1:00 PM – Closing Keynote & Awards Ceremony (Grand Ballroom, 60 minutes)

Speakers:
- Dr. Sarah Chen: sarah.chen@google.com (Google, Principal AI Researcher)
- Mike Johnson: m.johnson@redhat.com (Red Hat, Cloud Architect)
- Dr. Marcus Wei: marcus.wei@anthropic.com (Anthropic, ML Engineer)
- Emma Nakamura: e.nakamura@aws.amazon.com (AWS, Distinguished Engineer)
- Carlos Diaz: carlos@vercel.com (Vercel, Developer Relations)
- Olga Petrov: olga@rustdev.io (Independent Consultant)
- Priya Sharma: priya.sharma@microsoft.com (Microsoft, Senior SDE)

CRISIS: Dr. Sarah Chen has been quarantined due to illness and cannot attend the opening keynote on March 15.`,
  },
  {
    id: "wedding",
    name: "Wedding Reception",
    icon: "💍",
    description: "Elegant wedding with ceremony, dinner & dancing",
    text: `The Wedding of Emily Hartwell & James Thornton – June 21 at Rosewood Manor, Napa Valley.

Rooms:
- Garden Ceremony Grounds (capacity: 200)
- Grand Reception Hall (capacity: 180)
- Cocktail Terrace (capacity: 100)
- Bridal Suite (capacity: 15)
- Groom's Lounge (capacity: 15)

Schedule:
3:00 PM – Guest Arrival & Cocktail Welcome (Cocktail Terrace)
4:00 PM – Wedding Ceremony officiated by Rev. Patricia Hollis (Garden Ceremony Grounds, 45 minutes)
5:00 PM – Cocktail Hour with Jazz Quartet (Cocktail Terrace, 60 minutes)
6:00 PM – Grand Reception: Dinner & Speeches (Grand Reception Hall)
  - Welcome Toast by Best Man, Daniel Hartwell (emily's brother)
  - Maid of Honor Speech by Sophia Kim
  - Father of the Bride: Robert Hartwell
6:45 PM – First Dance: Emily & James
7:00 PM – Dinner Service (4-course meal, Grand Reception Hall)
8:30 PM – Cake Cutting Ceremony
9:00 PM – Dancing & Entertainment by DJ Marcus (Grand Reception Hall)
11:30 PM – Late Night Snack Bar & Farewell

Vendors & Contacts:
- Catering: Chef Antoine Dubois (chef@rosewoodmanor.com)
- Florist: Bloom & Co. (contact@bloomco.com)
- Photographer: Lily Chen Photography (lily@lilychen.com)
- DJ Marcus: djmarcus@soundwave.com

Guest Count: 165 confirmed, 15 pending RSVP

CRISIS: The outdoor ceremony tent rental company just notified us of a cancellation – the tent for Garden Ceremony Grounds will not be available. Weather forecast also shows 70% chance of rain on June 21.`,
  },
  {
    id: "music-festival",
    name: "Music Festival",
    icon: "🎵",
    description: "2-day outdoor music festival with multiple stages",
    text: `SoundWave Festival 2024 – August 10-11 at Riverside Park Amphitheater, Austin TX.

Stages & Venues:
- Main Stage (capacity: 5000)
- East Stage (capacity: 2000)
- Acoustic Tent (capacity: 500)
- DJ Booth Area (capacity: 1500)
- VIP Pavilion (capacity: 200)

Day 1 Schedule (August 10):
12:00 PM – Gates Open
1:00 PM – The Velvet Horizons (Main Stage, 60 minutes) – Indie Rock
2:30 PM – DJ Solaris (DJ Booth Area, 90 minutes) – Electronic
3:00 PM – Luna Skye Acoustic Set (Acoustic Tent, 45 minutes) – Folk
4:30 PM – The Mountain Kings (East Stage, 75 minutes) – Alternative
6:00 PM – Prism (Main Stage, 90 minutes) – Pop Rock headliner
8:00 PM – NOVA (Main Stage, 120 minutes) – Headliner

Day 2 Schedule (August 11):
12:00 PM – Gates Open
1:30 PM – Desert Bloom (Main Stage, 60 minutes) – Country
3:00 PM – DJ Phoenix (DJ Booth Area, 90 minutes) – Electronic
4:00 PM – Riverside Collective (Acoustic Tent, 60 minutes) – Jazz
5:30 PM – Echo Chamber (East Stage, 75 minutes) – Metal
7:00 PM – The Silver Linings (Main Stage, 90 minutes) – Pop headliner
9:00 PM – APEX (Main Stage, 120 minutes) – Festival closer

Artists Contact:
- NOVA: management@novaband.com (Headliner Day 1)
- The Silver Linings: bookings@silverlinings.com (Headliner Day 2)
- Prism: prism@cosmicmanagement.com
- DJ Solaris: solaris@beatsagency.com
- Luna Skye: luna@skyemusic.com

Staff & Logistics:
- Festival Director: Maya Torres (maya@soundwavefest.com)
- Stage Manager: Kevin O'Brien (kevin@soundwavefest.com)
- Security Chief: Tony Martinez

Expected Attendance: 8,500 per day

CRISIS: NOVA's lead guitarist fractured their wrist and the band has withdrawn from the Day 1 headliner slot with 3 weeks notice. The Main Stage 8PM-10PM slot on August 10 is now empty.`,
  },
  {
    id: "corporate-summit",
    name: "Corporate Summit",
    icon: "🏢",
    description: "Executive leadership summit with strategic sessions",
    text: `Global Leadership Summit 2024 – October 7-8 at The Marriott Marquis, New York City.

Meeting Rooms:
- Marquis Ballroom (capacity: 400)
- Executive Boardroom A (capacity: 30)
- Executive Boardroom B (capacity: 30)
- Strategy Workshop Room (capacity: 60)
- Networking Lounge (capacity: 150)

Day 1 – Strategic Vision (October 7):
8:00 AM – Registration & Breakfast (Networking Lounge)
9:00 AM – Opening: "Navigating 2025: Strategic Imperatives" by CEO Rachel Morrison (Marquis Ballroom, 60 minutes)
10:30 AM – Keynote: "AI Transformation in Enterprise" by Chief AI Officer Dr. Daniel Okonkwo (Marquis Ballroom, 45 minutes)
11:30 AM – Panel Discussion: Global Market Expansion with Regional Directors (Marquis Ballroom, 60 minutes)
  - APAC Director: Wei Huang
  - EMEA Director: Isabelle Moreau
  - LATAM Director: Carlos Fuentes
1:00 PM – Lunch & Networking (Networking Lounge)
2:30 PM – Breakout Sessions:
  - Track A: Digital Transformation Roadmap (Executive Boardroom A)
  - Track B: Talent & Culture Strategy (Strategy Workshop Room)
  - Track C: ESG & Sustainability Goals (Executive Boardroom B)
5:00 PM – Executive Cocktail Reception (Networking Lounge)

Day 2 – Execution & Action (October 8):
8:30 AM – Breakfast Roundtables (Networking Lounge)
9:30 AM – Workshop: OKR Planning & Goal Alignment by Sandra Park (Strategy Workshop Room, 90 minutes)
11:00 AM – Presentation: Q4 Financial Outlook by CFO Thomas Brennan (Marquis Ballroom, 45 minutes)
1:00 PM – Working Lunches & Team Meetings (Boardrooms A & B)
2:30 PM – Innovation Showcase: Product Roadmap 2025 by CPO Anika Singh (Marquis Ballroom, 60 minutes)
4:00 PM – Closing Address & Strategic Commitments by CEO Rachel Morrison (Marquis Ballroom, 45 minutes)
5:00 PM – Farewell Reception

Speakers:
- Rachel Morrison: r.morrison@company.com (CEO)
- Dr. Daniel Okonkwo: d.okonkwo@company.com (Chief AI Officer)
- Thomas Brennan: t.brennan@company.com (CFO)
- Anika Singh: a.singh@company.com (CPO)
- Sandra Park: sandra.park@consultingfirm.com (External Consultant)
- Isabelle Moreau: i.moreau@company-emea.com (EMEA Director)

Registered Attendees: 310 executives

CRISIS: CFO Thomas Brennan has a last-minute board conflict and cannot present the Q4 Financial Outlook session. The 45-minute slot at 11AM on Day 2 is unassigned with no backup presenter identified.`,
  },
];
