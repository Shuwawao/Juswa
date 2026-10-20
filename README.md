# JUSWA — Interactive Sketchbook Portfolio

A complete, responsive, interactive portfolio website for **JUSWA (Joshua Lagare)** — Computer Engineering Student, Digital Artist, and Creative Developer from the Philippines.

Inspired by the hand-drawn cartoon aesthetic of **OK KOY** and the environmental interactive storytelling of **Sumatran Cat 2024**.

---

## 🎨 Visual Identity & Brand Direction

- **Strict Monochrome Palette**: `#000000` (Pure Black), `#FFFFFF` (Pure White), `#111111`, `#F5F5F5`.
- **Aesthetic**: Sketchy cartoon line art, organic hand-drawn borders, crosshatching, scribble drop shadows, and ink density.
- **Zero Accent Colors**: No lavender `#B69AFF` or colored themes; variety is achieved through line weight and contrast.

---

## 🏠 The Interactive Room (Homepage)

The homepage presents a cohesive 2D illustrated workspace built on a responsive 3000×2000 layer coordinate system:

| Object | Hover Action / Character Reaction | Dialogue | Click Action |
| :--- | :--- | :--- | :--- |
| **Main Character** | Switches to looking at camera pose | `"wassup"` | Plays greeting sound & welcome message |
| **Personal Photograph** | Character looks up/speaks | `"learn more about me?"` | Navigates to [`about.html`](./about.html) |
| **Illustrated Portrait** | Character looks up/speaks | `"check out my artworks"` | Opens external Art Portfolio ([`juswa-draws.vercel.app`](https://juswa-draws.vercel.app/)) |
| **Portal Gun Prototype** | Character looks up/speaks | `"check out my projects"` | Navigates to [`projects.html`](./projects.html) |
| **Music Box** | Character looks up/speaks | `"Play the music?"` / `"Stop the music?"` | Toggles lo-fi ambient background music & floating notes |
| **Email Envelope** | Character looks up/speaks, reveals open envelope | `"Send an Email?"` | Opens `mailto:joshualagare24@gmail.com` |
| **Light Switch** | Character looks up/speaks | `"change theme?"` | Toggles Day/Night mode & switch graphic |
| **GitHub Icon** | Character looks up/speaks | `"Check out my github"` | Opens [`github.com/Shuwawao`](https://github.com/Shuwawao) |
| **Instagram Icon** | Character looks up/speaks | `"Follow me on Instagram"` | Opens [`instagram.com/juswa_draws`](https://instagram.com/juswa_draws) |
| **Facebook Icon** | Character looks up/speaks | `"Lets be friends"` | Opens Facebook profile ([`facebook.com/joshua.aquino25`](https://www.facebook.com/joshua.aquino25/)) |

---

## 🎵 Web Audio API Sound System

- **Zero-Latency Sound Effects**: Synthesized using Web Audio API (pencil taps, mechanical switch clicks, paper rustles, comic bubble pops).
- **Ambient Lo-Fi Music Box**: Chilled pentatonic chord progression (Cmaj9, Am9, Fmaj7#11, Gsus4) with analog detune and gentle chime melodies.
- **Global Mute Persistence**: Saves state to `localStorage.getItem('juswa-muted')`.

---

## 📄 Dedicated Pages

1. **[About Page (`about.html`)](./about.html)**:
   - Hand-drawn polaroid frame with real portrait and tape strip.
   - Dynamic animated role rotator.
   - Verified engineering background and creative philosophy.
   - Categorized technical and creative skill badges.

2. **[Projects Page (`projects.html`)](./projects.html)**:
   - Blueprint & notebook layout with category filters (*All*, *Web & Software*, *Hardware & IoT*, *Digital Art*).
   - **Synced N**: Church Music Ministry Schedule and Lineup Management System.
   - **Smart Assistive Cane for the Visually Impaired**: Ultrasonic obstacle detection & haptic feedback mobility device.
   - **Smart Medication System (MediSync)**: Automated carousel dispenser with companion Android application.
   - **Juswa Draws**: Digital illustration portfolio.

---

## 🚀 Development & Build

```bash
# Install dependencies
npm.cmd install

# Start local development server
npm.cmd run dev

# Build for production (outputs to dist/)
npm.cmd run build

# Preview production build locally
npm.cmd run preview
```

Static deployment is supported on **Vercel**, **Cloudflare Pages**, **GitHub Pages**, and **Netlify**.
