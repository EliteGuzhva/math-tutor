# Math Tutor (Мастер Дробей)

Interactive React app for practicing algebra transformations in a game-like format.

## Features

- Animated module selection and exercise flow (Framer Motion)
- 2 learning modules:
  - `isolateVariable`: isolate a target variable in equations
  - `simplifyExpression`: simplify algebraic expressions
- Progressive difficulty with 30 generated exercises per module
- Normal/Hard modes for expression simplification
- Instant validation feedback, rule hints, progress tracking, and completion screen

## Tech Stack

- React 19
- Vite 7
- Framer Motion
- mathjs
- ESLint 9

## Getting Started

Requirements:

- Node.js 18+ (Node.js 20+ recommended)
- npm

Install dependencies:

```bash
npm install
```

Start local development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview production build locally:

```bash
npm run preview
```

Lint:

```bash
npm run lint
```

## Project Structure

```text
src/
  components/    UI screens and interaction components
  engine/        exercise generation, expression model, validation, rules
  utils/         UI strings, colors, animations
```

Entry points:

- `src/main.jsx`
- `src/App.jsx`

Core engine files:

- `src/engine/newExerciseGenerator.js`
- `src/engine/exerciseGenerator.js`
- `src/engine/validator.js`

## Notes

- Current UI copy is primarily in Russian.
- Legacy exercise modules still exist in the engine and can be re-enabled from the menu/config if needed.
