# Atelier St-Elme Website Redesign
## Design Brief for Web Designer

---

## 1. Project Overview

### Client
**Atelier St-Elme** is a non-profit arts organization located in Beauport (Quebec City), Quebec, Canada. Operating for over 40 years, it is a cherished community space where members and students explore traditional craft arts.

### Services Offered
- **Ceramics**: Throwing (tournage), shaping (façonnage), modeling (modelage), and basketry-ceramics fusion (vannerie)
- **Stained Glass**: Tiffany copper foil technique (vitrail)
- **Firing Services**: Kiln access for members working at home

### Target Audience
- Adults seeking creative hobbies or artistic development
- Teenagers (14+) exploring pottery and glass arts
- Children (with parent) for introductory workshops
- Local residents of the Quebec City/Beauport region
- French-speaking audience (site must be in French)

### Project Goal
Redesign the website to be **modern, warm, and inviting** while making course discovery and registration the primary focus. The new design should reflect the handcrafted, artisanal nature of the workshop while feeling contemporary and accessible.

---

## 2. Current Website Analysis

### Existing Pages
| Page | Content | Notes |
|------|---------|-------|
| Accueil (Home) | Hero intro, ceramics/vitrail sections, team preview, firing services, partners | Main landing page |
| Cours (Courses) | Full course catalog with schedules, prices, session dates, registration form | Very long page (~2000 lines) |
| Notre équipe | 6 teacher profiles with photos and bios | Currently embedded in homepage |
| Galerie de photos | Student and workshop photography | Separate page |
| Espace des membres | Password-protected member area with Google Calendar embed | For registered members |
| Contact | Phone, email, address, social links | Currently in footer |

### Current Pain Points to Address
1. **Dense course listings**: The courses page is overwhelming with repetitive layouts
2. **Generic Elementor styling**: The current design lacks distinctive personality
3. **Poor visual hierarchy**: Hard to scan for key information (dates, prices, availability)
4. **Inconsistent spacing**: Elementor containers create visual clutter
5. **No course filtering**: Users must scroll through everything to find relevant courses
6. **Typography lacks warmth**: Current fonts (Oswald, Roboto) feel corporate rather than artisanal

### Content to Preserve
- All teacher bios and photos (6 instructors)
- Complete course catalog with descriptions, prices, schedules
- Session announcement format (dates, registration deadlines)
- Partner logos (Culture Beauport, Ville de Quebec, etc.)
- Contact information and social media links
- Google Calendar integration for members

---

## 3. Design Direction: Warm and Organic

### Aesthetic Vision
The design should evoke the sensory experience of working with clay and glass:
- **Tactile**: Textures that suggest natural materials (paper grain, clay, fabric)
- **Warm**: Colors drawn from earth, fire, and craft materials
- **Handmade**: Subtle imperfections that feel human, not machine-generated
- **Inviting**: A space that feels welcoming to beginners and experts alike

### Color Palette

#### Primary Colors
| Name | Hex | Usage |
|------|-----|-------|
| Terracotta | `#C2714F` | Primary accent, CTAs, highlights |
| Clay Cream | `#F5F0E8` | Page backgrounds, cards |
| Kiln Charcoal | `#2D2A26` | Primary text, headings |

#### Secondary Colors
| Name | Hex | Usage |
|------|-----|-------|
| Sage Green | `#8B9A7D` | Secondary accents, vitrail section |
| Amber Glow | `#D4A853` | Highlights, session announcements |
| Stained Glass Blue | `#4A7C8C` | Links, interactive elements |

#### Neutral Tones
| Name | Hex | Usage |
|------|-----|-------|
| Warm White | `#FDFCFA` | Alternate backgrounds |
| Stone Gray | `#9C9589` | Secondary text, borders |
| Deep Brown | `#4A3F35` | Footer, dark sections |

### Typography

#### Recommended Font Pairings

**Option A - Classic Artisan**
- Display: **Fraunces** (variable, optical sizing) - warm, quirky serifs
- Body: **Source Serif Pro** - highly readable, warm character

**Option B - Contemporary Craft**
- Display: **Playfair Display** - elegant, editorial feel
- Body: **Lora** - literary, inviting for longer text

**Option C - Friendly Workshop**
- Display: **Syne** - geometric but warm, modern
- Body: **Atkinson Hyperlegible** - excellent accessibility

#### Type Scale (1.25 ratio)
```
--text-xs:   0.75rem   (12px)
--text-sm:   0.875rem  (14px)
--text-base: 1rem      (16px)
--text-lg:   1.25rem   (20px)
--text-xl:   1.5rem    (24px)
--text-2xl:  1.875rem  (30px)
--text-3xl:  2.25rem   (36px)
--text-4xl:  3rem      (48px)
--text-5xl:  3.75rem   (60px)
```

### Texture and Imagery

#### Background Textures
- Subtle paper grain or canvas texture on light backgrounds
- Avoid heavy patterns that compete with content
- Consider using actual clay/glass macro photography as section dividers

#### Photography Style
- Warm, natural lighting (golden hour feel)
- Emphasis on hands at work, process shots
- Show finished pieces in natural settings
- Candid workshop moments over posed portraits
- Avoid: cold studio lighting, stark white backgrounds

#### Illustrations (Optional)
- Simple line drawings of tools, pottery shapes, glass patterns
- Can be used as decorative elements or icons
- Style: hand-drawn, single-weight lines

### What to Avoid
- Generic stock photos of clay or glass
- Purple-to-blue gradients (overused AI aesthetic)
- Pure white backgrounds (#FFFFFF)
- Geometric sans-serif everywhere
- Drop shadows on everything
- Carousel sliders for important content
- Floating mockup devices

---

## 4. Primary Goal: Course Discovery and Registration

### User Journey Priority
1. **Discover**: User finds a course that matches their interest and schedule
2. **Understand**: User quickly grasps key details (price, dates, level, what they'll make)
3. **Register**: User sends email registration with minimal friction

### Course Categorization System

#### By Discipline
- Ceramics (Céramique)
- Stained Glass (Vitrail)

#### By Format
- Regular Session (8 weeks)
- Intensive Workshop (1 day or weekend)
- Children's Courses

#### By Audience
- Adults (Adultes)
- Teens 14+ (Ados)
- Children 5-12 (Enfants)
- All ages (Tous)

### Course Card Design Requirements

Each course card should display at a glance:
1. **Course name** - Clear, descriptive title
2. **Category badges** - Discipline + format
3. **Schedule** - Day of week, time
4. **Duration** - Number of sessions or hours
5. **Price** - With taxes note
6. **Audience** - Who can register
7. **Availability indicator** - Open, filling, full
8. **CTA** - "S'inscrire" (Register)

### Session Announcements
- Prominent banner for current/upcoming session dates
- Registration opening dates with countdown or urgency
- Clear visual distinction from regular content (use accent color)

### Registration Flow
Current system uses email registration. The design should:
- Provide a clear, visible registration form or mailto link
- Pre-fill course name when clicking from a course card
- Include all required fields: Name, Email, Phone, Course selection
- Confirm what happens after submission

---

## 5. Page-by-Page Requirements

### 5.1 Homepage (Accueil)

#### Hero Section
- Warm, welcoming headline (not just the org name)
- Subheadline emphasizing 40+ years of community creativity
- Background: Atmospheric workshop photo or texture
- Primary CTA: "Voir les cours" (See courses)
- Secondary CTA: "Découvrir l'atelier" (Discover the workshop)

#### Introduction Section
- Brief paragraph about the organization's mission
- Key statistics or highlights:
  - 40+ ans d'existence
  - 6 professeurs passionnés
  - Céramique et vitrail
- Accompanying image: Workshop interior or hands at work

#### Course Highlights
- 3-4 featured courses or upcoming intensives
- Use course cards (defined above)
- Link to full course catalog

#### Team Teaser
- "Notre équipe" heading
- Grid of teacher photos (circle crops)
- Names and specialties
- Link to full team page or section

#### Session Announcement
- Current session info banner
- Registration dates
- Session start date

#### Footer Preview
- Quick links to key pages
- Contact information
- Social proof (partner logos)

### 5.2 Courses Page (Cours)

#### Page Header
- Title: "Nos cours"
- Brief intro paragraph
- Session announcement banner (sticky or prominent)

#### Filter/Navigation Bar
- Filter by discipline: Tous | Céramique | Vitrail
- Filter by format: Tous | Régulier | Intensif | Enfants
- Optional: Quick jump links to sections

#### Course Sections
Organize courses into clear sections:

**Céramique - Sessions régulières**
- Tournage adultes
- Façonnage adultes
- Tournage ados
- Modelage enfants

**Céramique - Intensifs**
- Potier d'un jour
- Magie de l'argile rouge
- Folie du tournage

**Vitrail - Sessions régulières**
- Vitrail débutant
- Vitrail intermédiaire/avancé

**Vitrail - Intensifs**
- Vitrail collectif
- Motif floral
- Other specialty workshops

#### Individual Course Cards
Each card expands or links to full details:
- Full description
- What students will create
- Materials included/required
- Instructor name
- Exact dates for session

#### Registration Section
- Anchor link target from nav
- Clear instructions for email registration
- Form fields or mailto link with pre-filled subject
- Contact for questions

### 5.3 Team Page (Notre équipe)

Can be a standalone page or section on homepage.

#### Teacher Profiles
For each of the 6 instructors:
- Professional photo (consistent style across all)
- Name
- Specialty (Vitrail, Céramique, Coordination, etc.)
- Bio paragraph (2-3 sentences)
- Optional: Featured student work by this instructor

#### Current Team Members
1. **Odette Fortier** - Vitrail (20+ years teaching)
2. **Sylvie Simard** - Vitrail (since 2004)
3. **Nathalie Gagné** - Céramique (modeling, shaping)
4. **Danielle Fortin** - Vannerie & Céramique
5. **Denis Pradet** - Céramique (throwing, professional background)
6. **Josie-Anne Laliberté** - Coordination & Firing Technician

#### Board of Directors
Simple list or grid:
- Présidente: Marilyn Boucher
- Vice-présidente: Caroline Gilbert
- Trésorier: Karl Frenette
- Vice-Trésorière: Marie Fortier
- Secrétaire: Karine Lacroix-Pelletier
- Conseiller: Guy Frève
- Conseillère: Sylvie Simard

### 5.4 Members Area (Espace des membres)

#### Access Control
- Password protection (can be simple JS-based or server-side)
- Clean login interface matching site design

#### Member Dashboard
- Welcome message / announcements section
- Embedded Google Calendar (firing schedule)
- Important reminders (firing process, piece placement)
- Quick links to resources

#### Current Announcements Content
- Firing schedule and process explanation
- Piece placement instructions (where to put dry vs. glazed pieces)
- Payment reminders
- General workshop etiquette

### 5.5 Photo Gallery (Galerie)

#### Gallery Layout
- Masonry or grid layout for variety
- Lightbox for full-size viewing
- Categories or filters:
  - Céramique
  - Vitrail
  - L'atelier
  - Événements

#### Photo Captions
- Student name (if permitted)
- Technique or course
- Year/session

### 5.6 Footer (All Pages)

#### Column 1: Navigation
- Quick links to all main pages
- Current session link

#### Column 2: Contact
- Phone: 418-666-6177
- Email: atelierstelme@gmail.com
- Address: 23 rue Hugues-Pommier, Beauport, Québec, QC, G1E 4T8

#### Column 3: Social & Partners
- Facebook icon/link
- Instagram icon/link
- Partner logos:
  - Culture Beauport
  - Ville de Québec - Arrondissement Beauport
  - Other sponsors

#### Bottom Bar
- Copyright: © 2024 Atelier St-Elme
- Credit (optional): "Design by [Designer Name]"

---

## 6. Technical Requirements

### Platform
**Vanilla HTML, CSS, and JavaScript only**
- No frameworks (React, Vue, etc.)
- No CSS frameworks (Tailwind, Bootstrap)
- No build tools required
- Files should work when opened directly in browser

### File Structure
```
/
├── index.html          (Homepage)
├── cours.html          (Courses)
├── equipe.html         (Team - optional, can be section)
├── galerie.html        (Gallery)
├── membres.html        (Members area)
├── css/
│   ├── reset.css       (Normalize/reset)
│   ├── variables.css   (Custom properties)
│   ├── base.css        (Typography, global styles)
│   ├── components.css  (Buttons, cards, forms)
│   └── pages.css       (Page-specific styles)
├── js/
│   ├── navigation.js   (Mobile menu, smooth scroll)
│   ├── filters.js      (Course filtering)
│   └── gallery.js      (Lightbox, lazy loading)
├── images/
│   ├── logo/
│   ├── team/
│   ├── courses/
│   └── gallery/
└── fonts/              (If self-hosting)
```

### Responsive Design
- **Mobile-first approach**
- Breakpoints:
  - Mobile: 320px - 767px
  - Tablet: 768px - 1023px
  - Desktop: 1024px+
  - Wide: 1440px+ (optional max-width container)

### Accessibility (WCAG 2.1 AA)
- Semantic HTML5 elements (header, nav, main, section, footer)
- Skip link to main content
- Proper heading hierarchy (h1 → h2 → h3)
- Alt text for all images
- Focus states for all interactive elements
- Color contrast ratio 4.5:1 minimum for text
- Touch targets minimum 44x44px
- `prefers-reduced-motion` support

### Performance
- Optimize images (WebP with fallbacks)
- Lazy load images below the fold
- Minimize CSS/JS (or keep files small)
- Use system font stack for body if custom fonts are slow
- Target: Lighthouse performance score 90+

### Browser Support
- Chrome, Firefox, Safari, Edge (latest 2 versions)
- iOS Safari 14+
- Android Chrome 90+

---

## 7. Brand Assets

### Logo
- Primary logo: `Asset-1.png` (horizontal format)
- Provide in multiple formats: PNG, SVG preferred
- Icon version for favicon: `icon_logo_atelier.png`

### Colors (Current)
For reference, current brand uses:
- Orange: `#f58720`
- Teal: `#17a9b1`

Designer may propose updated palette while respecting brand recognition.

### Social Media
- Facebook: https://www.facebook.com/atelierstelmeceramiqueetvitrail
- Instagram: https://www.instagram.com/atelierstelme/

### Partner Logos
Must include in footer:
- Culture Beauport (orange logo)
- Ville de Québec / Arrondissement Beauport
- Other current sponsors

---

## 8. Inspiration and References

### Websites to Study
Look at these types of sites for inspiration:
- Local pottery/ceramic studios with class offerings
- Art schools and community workshops
- Artisan marketplaces (Etsy seller pages)
- Craft brewery/winery sites (warm, authentic branding)

### Aesthetic References
- Studio pottery photography on Pinterest
- Japanese ceramics websites (wabi-sabi aesthetic)
- Scandinavian craft school sites
- Museum gift shop aesthetics

### What to Avoid
- **Elementor/Divi template look**: Generic layouts with obvious widget boundaries
- **AI slop**: Purple gradients, floating 3D shapes, generic illustrations
- **Corporate SaaS**: Cold blues, sharp angles, stock business photos
- **Overly trendy**: Neobrutalism, dark mode forced, glassmorphism
- **Cluttered**: Too many competing elements, no breathing room

---

## 9. Deliverables Checklist

### Required
- [ ] Homepage with all sections
- [ ] Courses page with filtering
- [ ] Team page/section
- [ ] Gallery page with lightbox
- [ ] Members area (password-protected)
- [ ] Responsive navigation (mobile hamburger menu)
- [ ] Footer with all required information
- [ ] All pages responsive (320px - 1440px+)
- [ ] Accessibility compliance (skip link, focus states, alt text)
- [ ] Form or mailto link for registration

### Recommended
- [ ] Smooth scroll for anchor links
- [ ] Course card hover/focus states
- [ ] Loading states for images
- [ ] Print stylesheet for course schedules
- [ ] 404 error page
- [ ] Dark mode support (optional, `prefers-color-scheme`)

### Documentation
- [ ] Brief README with setup instructions
- [ ] CSS custom properties documented
- [ ] Image optimization notes

---

## 10. Timeline and Process

### Design Phase
1. **Mood board / Style tiles**: Present 2-3 visual directions
2. **Wireframes**: Low-fidelity layouts for homepage and courses
3. **High-fidelity mockups**: Desktop and mobile for key pages
4. **Feedback round**: Client review and revisions

### Development Phase
1. **Setup**: File structure, CSS foundation, custom properties
2. **Components**: Build reusable elements (buttons, cards, navigation)
3. **Pages**: Implement each page with real content
4. **Responsive**: Test and adjust across breakpoints
5. **Polish**: Animations, interactions, accessibility audit

### Handoff
- All source files (HTML, CSS, JS, images)
- Documentation for content updates
- Image optimization workflow if not automated

---

## Contact for Questions

**Atelier St-Elme**
- Email: atelierstelme@gmail.com
- Phone: 418-666-6177
- Address: 23 rue Hugues-Pommier, Beauport, Québec, QC, G1E 4T8

---

*This design brief was prepared to guide the redesign of atelierstelme.ca with a focus on creating a warm, welcoming, and user-friendly experience that prioritizes course discovery and registration while honoring 40+ years of community craft education.*
