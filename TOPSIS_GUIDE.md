# TOPSIS Ranking Guide

## 1. What is TOPSIS?

TOPSIS means **Technique for Order Preference by Similarity to Ideal Solution**.

It is a multi-criteria decision-making method used to rank alternatives when several factors must be considered at the same time.

In CampusBite:

- The alternatives are the campus canteens.
- The criteria are price, quality, cleanliness, service speed, hygiene, and dish ratings.
- The result is an ordered list of canteens from best to worst for a selected preference profile.

TOPSIS does not simply add the ratings. It identifies:

- An **ideal-best canteen**, with the highest value for every criterion.
- An **ideal-worst canteen**, with the lowest value for every criterion.

The best real canteen is the one closest to the ideal-best and farthest from the ideal-worst.

## 2. Why use TOPSIS?

Choosing a canteen based on only one factor can be misleading.

For example:

- A canteen may be cheap but slow.
- A canteen may be hygienic but expensive.
- A canteen may serve highly rated dishes but have poor seating.

TOPSIS combines all important factors and allows different users to prioritize different needs.

## 3. Ranking criteria

All criteria use ratings from **1 to 5 stars**.

| Code | Criterion | Meaning |
|---|---|---|
| `avg_price_rating` | Price and value | Affordability and portion value |
| `avg_quality_rating` | Food quality | Taste, freshness, and preparation |
| `avg_cleanliness_rating` | Cleanliness | Tables, seating, and surroundings |
| `avg_speed_rating` | Speed of service | Waiting and preparation time |
| `avg_hygiene_rating` | Food hygiene | Food handling and utensil safety |
| `avg_dish_rating` | Dish rating | Average ratings of dishes sold by the canteen |

The first five criteria are stored in `criteria_ratings`.

Dish ratings are stored in `dish_ratings` and averaged per canteen from the ratings of its available menu items.

## 4. Overall profile weights

The default profile uses these weights:

| Criterion | Weight |
|---|---:|
| Price and value | 15% |
| Food quality | 20% |
| Cleanliness | 15% |
| Speed of service | 15% |
| Food hygiene | 15% |
| Dish rating | 20% |

The weights add up to 100%.

A higher weight means that the criterion has more influence on the final ranking.

## 5. Other decision profiles

### Overall

Balanced ranking for general use.

### Hangout

Prioritizes cleanliness and hygiene for users who want a comfortable dining experience.

### Quick Bite

Gives the largest weight to service speed for users between classes.

### Budget

Gives the largest weight to price and value.

The profiles are defined in [topsis.js](C:/Users/PC/Desktop/codes/Field_Project_sem_4/canteen-system-nodejs/topsis.js).

## 6. How the ranking is calculated

### Step 1: Collect averages

The system calculates one value per canteen for every criterion.

Example:

```text
MEDIA:
Price = 4.56
Quality = 3.67
Cleanliness = 4.22
Speed = 4.56
Hygiene = 4.67
Dish rating = 4.10
```

### Step 2: Apply Bayesian adjustment

Averages based on very few ratings should not be treated as completely reliable.

CampusBite uses this formula:

```text
Adjusted rating =
    (v / (v + m)) × canteen average
  + (m / (v + m)) × global average
```

Where:

- `v` is the number of ratings for that canteen.
- `m` is the minimum-rating threshold, currently `5`.
- `global average` is the average rating across all canteens.

This pulls small samples toward the overall average. As more ratings are collected, the canteen's own average has more influence.

The Bayesian function is defined in [views.sql](C:/Users/PC/Desktop/codes/Field_Project_sem_4/canteen-system-nodejs/database/views.sql).

### Step 3: Normalize the criteria

Criteria can have different scales or distributions. TOPSIS normalizes each column using vector normalization:

```text
normalized value =
    value / square root of the sum of squared column values
```

This makes the criteria comparable.

### Step 4: Apply weights

Each normalized value is multiplied by the selected profile's weight:

```text
weighted value = normalized value × criterion weight
```

### Step 5: Find ideal solutions

For every criterion, TOPSIS finds:

- The highest weighted value: ideal best.
- The lowest weighted value: ideal worst.

All criteria in this project are benefit criteria: higher ratings are better.

### Step 6: Calculate distances

For each canteen, the system calculates Euclidean distance from:

- The ideal-best point: `distanceBest`
- The ideal-worst point: `distanceWorst`

### Step 7: Calculate the TOPSIS score

```text
TOPSIS score =
    distanceWorst / (distanceBest + distanceWorst)
```

The score is normally between `0` and `1`.

- A score closer to `1` is better.
- A score closer to `0` is worse.

### Step 8: Rank the canteens

The canteens are sorted by score in descending order:

```text
highest score → Rank 1
lowest score  → last rank
```

## 7. Why rankings change by profile

Each profile changes the weights, not the underlying ratings.

For example:

- If `avg_speed_rating` receives the largest weight, a fast canteen is likely to rank higher.
- If `avg_price_rating` receives the largest weight, a budget-friendly canteen is likely to rank higher.
- If cleanliness, hygiene, and dish rating receive more weight, a canteen with better food and sanitation ratings is likely to rank higher.

Therefore, different profiles can produce different winners from the same database.

## 8. Current demo-data design

The balanced demo data intentionally gives each canteen a different strength:

- **BAPPA:** stronger price/value ratings.
- **IMDR:** stronger service-speed ratings.
- **MEDIA:** stronger quality, cleanliness, and hygiene ratings.

Each canteen has the same number of sample criteria ratings and dish ratings. This prevents unequal sample sizes from deciding the ranking by themselves.

The reusable sample-data script is:

[balanced-demo-ratings.sql](C:/Users/PC/Desktop/codes/Field_Project_sem_4/canteen-system-nodejs/database/balanced-demo-ratings.sql)

## 9. Where the implementation is located

- Algorithm and weights: [topsis.js](C:/Users/PC/Desktop/codes/Field_Project_sem_4/canteen-system-nodejs/topsis.js)
- Ranking API: [server.js](C:/Users/PC/Desktop/codes/Field_Project_sem_4/canteen-system-nodejs/server.js)
- Database averages and Bayesian function: [views.sql](C:/Users/PC/Desktop/codes/Field_Project_sem_4/canteen-system-nodejs/database/views.sql)
- Ranking interface: [compare.html](C:/Users/PC/Desktop/codes/Field_Project_sem_4/canteen-system-nodejs/public/compare.html)

The API endpoint is:

```text
GET /api/compare?profile=overall
```

Other supported profiles are:

```text
GET /api/compare?profile=hangout
GET /api/compare?profile=quick_bite
GET /api/compare?profile=budget
```

## 10. Important limitations

- The current ratings are sample/demo data, not a real survey.
- Dish ratings influence TOPSIS but do not replace the five general canteen criteria.
- A ranking is only as reliable as the ratings and sample sizes behind it.
- Changing weights can change the winner without changing the underlying ratings.
- TOPSIS shows relative preference among the available canteens; it does not declare an objectively perfect canteen.
