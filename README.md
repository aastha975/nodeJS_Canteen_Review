# CampusBite Canteen Comparison System

CampusBite is a Node.js and Express web application for comparing college canteens, menus, dish ratings, student feedback, analytics, and TOPSIS-based rankings.

## Features

- Student, faculty, and canteen-admin login
- User registration and session-based authentication
- Canteen directory with menus and prices
- Canteen check-ins
- Five-criteria canteen ratings:
  - Price and value
  - Food quality
  - Cleanliness
  - Speed of service
  - Food hygiene
- Per-dish ratings for each canteen
- Dish comparison by highest rating or best value
- Student feedback and voting APIs
- TOPSIS multi-criteria ranking
- Analytics charts for crowd patterns, criteria, and menu prices
- PostgreSQL database integration

## Technology Stack

- Node.js
- Express
- PostgreSQL
- PostgreSQL `pg` driver
- `express-session`
- `bcryptjs`
- Chart.js
- Lucide icons
- HTML, CSS, and browser JavaScript

## Project Structure

```text
canteen-system-nodejs/
├── database/
│   ├── schema.sql
│   ├── seed-data.sql
│   ├── triggers.sql
│   ├── views.sql
│   └── balanced-demo-ratings.sql
├── public/
│   ├── css/style.css
│   ├── js/navbar.js
│   ├── index.html
│   ├── register.html
│   ├── dashboard.html
│   ├── canteens.html
│   ├── menu.html
│   ├── rate.html
│   ├── rate-dish.html
│   ├── dish-compare.html
│   ├── compare.html
│   └── analytics.html
├── db.js
├── server.js
├── topsis.js
├── package.json
└── package-lock.json
```

## Requirements

Install the following before running the project:

- Node.js
- PostgreSQL

The application expects PostgreSQL to run on:

```text
Host: localhost
Port: 5432
Database: canteen_comparison
User: postgres
```

Update the password in `db.js` to match the local PostgreSQL installation. Do not use the sample password in a production deployment.

## Database Setup

Create the database in SQL Shell or `psql`:

```sql
CREATE DATABASE canteen_comparison;
```

From the project folder, run the SQL files in this order:

```powershell
psql -U postgres -d canteen_comparison -f database\schema.sql
psql -U postgres -d canteen_comparison -f database\seed-data.sql
psql -U postgres -d canteen_comparison -f database\triggers.sql
psql -U postgres -d canteen_comparison -f database\views.sql
psql -U postgres -d canteen_comparison -f database\balanced-demo-ratings.sql
```

`balanced-demo-ratings.sql` replaces demo ratings with equally sized but intentionally different sample data:

- BAPPA is stronger on price/value.
- IMDR is stronger on speed.
- MEDIA is stronger on quality, cleanliness, and hygiene.

## Install and Run

Open PowerShell in the project folder:

```powershell
cd "C:\path\to\canteen-system-nodejs"
npm install
npm.cmd start
```

Open the application in a browser:

```text
http://127.0.0.1:3000/
```

Keep the terminal open while using the application. Press `Ctrl + C` to stop the server.

## Demo Accounts

All demo accounts use the password:

```text
password123
```

Student:

```text
aastha@college.edu
```

Faculty:

```text
mehta@college.edu
```

Canteen administrators:

```text
admin.bappa@college.edu
admin.imdr@college.edu
admin.media@college.edu
```

The current application gives administrators the same general frontend navigation as other logged-in users. A separate menu-management admin panel is not currently implemented.

## TOPSIS Ranking

The overall TOPSIS profile uses six criteria:

| Criterion | Weight |
|---|---:|
| Price and value | 15% |
| Food quality | 20% |
| Cleanliness | 15% |
| Speed of service | 15% |
| Food hygiene | 15% |
| Dish rating | 20% |

The application also provides:

- **Hangout:** cleanliness and hygiene focused
- **Quick Bite:** speed focused
- **Budget:** price focused

The ranking uses Bayesian-adjusted averages to reduce the effect of very small samples. The final TOPSIS score measures each canteen's closeness to the ideal best and distance from the ideal worst.

## Important URLs

```text
/                    Login
/register.html       Registration
/dashboard.html      Dashboard
/canteens.html       Canteen directory
/menu.html?cid=1     Canteen menu
/rate.html?cid=1     Canteen rating
/dish-compare.html   Dish comparison
/rate-dish.html?...  Individual dish rating
/compare.html        TOPSIS rankings
/analytics.html      Analytics
```

## Main API Groups

```text
/api/login
/api/register
/api/logout
/api/me
/api/canteens
/api/canteens/:id/menu
/api/canteens/:id/rate
/api/canteens/:id/checkin
/api/dishes
/api/dishes/compare
/api/dishes/:id/rate
/api/compare
/api/analytics
```

## Notes

- The SQL files contain demo data for development and academic demonstration.
- Replace demo credentials and the hard-coded database password before deployment.
- PostgreSQL must be running before starting the Node.js server.
- `dish-compare.html`, `menu.html`, `rate.html`, and `rate-dish.html` are frontend pages served by Express from the `public` directory.
