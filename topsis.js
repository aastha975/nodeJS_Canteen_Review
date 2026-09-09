// ============================================================
// topsis.js - TOPSIS MCDM Algorithm in JavaScript
// ============================================================
const db = require('./db');

const TOPSIS_CRITERIA = [
    'avg_price_rating',
    'avg_quality_rating',
    'avg_cleanliness_rating',
    'avg_speed_rating',
    'avg_hygiene_rating',
    'avg_dish_rating',
];

const WEIGHT_PROFILES = {
    overall: {
        avg_price_rating: 0.15,
        avg_quality_rating: 0.20,
        avg_cleanliness_rating: 0.15,
        avg_speed_rating: 0.15,
        avg_hygiene_rating: 0.15,
        avg_dish_rating: 0.20,
    },
    hangout: {
        avg_price_rating: 0.08,
        avg_quality_rating: 0.17,
        avg_cleanliness_rating: 0.30,
        avg_speed_rating: 0.08,
        avg_hygiene_rating: 0.22,
        avg_dish_rating: 0.15,
    },
    quick_bite: {
        avg_price_rating: 0.12,
        avg_quality_rating: 0.12,
        avg_cleanliness_rating: 0.08,
        avg_speed_rating: 0.42,
        avg_hygiene_rating: 0.08,
        avg_dish_rating: 0.18,
    },
    budget: {
        avg_price_rating: 0.45,
        avg_quality_rating: 0.12,
        avg_cleanliness_rating: 0.08,
        avg_speed_rating: 0.08,
        avg_hygiene_rating: 0.07,
        avg_dish_rating: 0.20,
    },
};

const PROFILE_LABELS = {
    overall: 'Overall best (balanced)',
    hangout: 'Hangout (cleanliness & hygiene matter most)',
    quick_bite: 'Quick bite between classes (speed matters most)',
    budget: 'Budget-conscious (price matters most)',
    custom: 'Custom weights',
};

function normalizeCustomWeights(rawWeights) {
    const weights = {};
    let sum = 0.0;
    for (const c of TOPSIS_CRITERIA) {
        const val = parseFloat(rawWeights[c]) || 0;
        weights[c] = val > 0 ? val : 0.0;
        sum += weights[c];
    }
    if (sum <= 0) return WEIGHT_PROFILES.overall;
    for (const c of TOPSIS_CRITERIA) {
        weights[c] = weights[c] / sum;
    }
    return weights;
}

function calculateTopsis(rows, weights) {
    if (!rows || rows.length === 0) return [];

    const criteria = Object.keys(weights);

    // 1. Vector normalization: sum of squares
    const sumSquares = {};
    criteria.forEach(c => sumSquares[c] = 0);

    rows.forEach(r => {
        criteria.forEach(c => {
            const val = parseFloat(r[c]) || 0;
            sumSquares[c] += val * val;
        });
    });

    // 2. Weighted normalization
    const weighted = {};
    rows.forEach(r => {
        weighted[r.cid] = {};
        criteria.forEach(c => {
            const val = parseFloat(r[c]) || 0;
            const denom = Math.sqrt(sumSquares[c]);
            const norm = denom > 0 ? val / denom : 0;
            weighted[r.cid][c] = norm * weights[c];
        });
    });

    // 3. Find Ideal-best and Ideal-worst
    const idealBest = {};
    const idealWorst = {};
    criteria.forEach(c => {
        const col = rows.map(r => weighted[r.cid][c]);
        idealBest[c] = Math.max(...col);
        idealWorst[c] = Math.min(...col);
    });

    // 4. Euclidean distance & Closeness coefficient (Ci)
    const scored = rows.map(r => {
        const vals = weighted[r.cid];
        let distBest = 0;
        let distWorst = 0;
        criteria.forEach(c => {
            distBest += Math.pow(vals[c] - idealBest[c], 2);
            distWorst += Math.pow(vals[c] - idealWorst[c], 2);
        });
        distBest = Math.sqrt(distBest);
        distWorst = Math.sqrt(distWorst);

        const denom = distBest + distWorst;
        const score = denom > 0 ? distWorst / denom : 0;

        return {
            cid: r.cid,
            cname: r.cname,
            score: score,
        };
    });

    // 5. Rank best first
    scored.sort((a, b) => b.score - a.score);
    scored.forEach((item, index) => {
        item.rank = index + 1;
    });

    return scored;
}

async function getTopsisRanking(weights, minRatings = 5) {
    const res = await db.query(
        'SELECT cid, cname, bayes_price AS avg_price_rating, bayes_quality AS avg_quality_rating, ' +
        'bayes_cleanliness AS avg_cleanliness_rating, bayes_speed AS avg_speed_rating, ' +
        'bayes_hygiene AS avg_hygiene_rating, bayes_dish_rating AS avg_dish_rating, ' +
        'total_ratings FROM canteen_criteria_bayesian($1)',
        [minRatings]
    );
    return calculateTopsis(res.rows, weights);
}

module.exports = {
    TOPSIS_CRITERIA,
    WEIGHT_PROFILES,
    PROFILE_LABELS,
    normalizeCustomWeights,
    calculateTopsis,
    getTopsisRanking,
};