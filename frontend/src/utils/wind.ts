export const COMPASS_16 = [
    'N', 'NNE', 'NE', 'ENE',
    'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW',
    'W', 'WNW', 'NW', 'NNW',
];

export function directionToBinIndex(angleDeg: number): number {
    // Normalize to [0, 360)
    const a = ((angleDeg % 360) + 360) % 360;
    const sectorSize = 360 / 16; // 22.5
    // Offset so that 0 is centered in N sector
    const shifted = (a + sectorSize / 2) % 360;
    return Math.floor(shifted / sectorSize);
}

export function binWindDirections(rows: Array<{ wind_dir_deg?: number | null; windspeed_ms?: number | null }>, weighted = false) {
    const bins = new Array(16).fill(0);
    for (const r of rows) {
        if (typeof r.wind_dir_deg !== 'number') continue;
        const idx = directionToBinIndex(r.wind_dir_deg);
        const w = weighted && typeof r.windspeed_ms === 'number' ? r.windspeed_ms : 1;
        bins[idx] += w;
    }
    return bins;
}

/**
 * Convert wind direction from degrees to radians
 */
export function degreesToRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
}

/**
 * Convert wind direction from radians to degrees
 */
export function radiansToDegrees(radians: number): number {
    return (radians * 180) / Math.PI;
}

/**
 * Convert wind direction to degrees
 * Handles:
 * - Numeric values (degrees): returns as-is
 * - Numeric strings: converts to number
 * - Compass directions (N, NE, etc.): converts to degrees
 * - Null/undefined/invalid: returns null
 */
export function normalizeWindDirectionToDegrees(value: any): number | null {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    // If it's already a number
    if (typeof value === 'number') {
        if (isNaN(value) || !isFinite(value)) {
            return null;
        }
        return value;
    }

    // If it's a string, try to parse
    if (typeof value === 'string') {
        const trimmed = value.trim().toUpperCase();

        // Try to parse as number first
        const numValue = parseFloat(trimmed);
        if (!isNaN(numValue) && isFinite(numValue)) {
            return numValue;
        }

        // Map compass directions to degrees
        const compassMap: Record<string, number> = {
            'N': 0,
            'NNE': 22.5,
            'NE': 45,
            'ENE': 67.5,
            'E': 90,
            'ESE': 112.5,
            'SE': 135,
            'SSE': 157.5,
            'S': 180,
            'SSW': 202.5,
            'SW': 225,
            'WSW': 247.5,
            'W': 270,
            'WNW': 292.5,
            'NW': 315,
            'NNW': 337.5,
        };

        if (compassMap.hasOwnProperty(trimmed)) {
            return compassMap[trimmed];
        }
    }

    return null;
}

/**
 * Calculate vector-based average wind direction
 * Converts wind directions to unit vectors, averages them, and converts back
 */
export function calculateVectorAverageWindDirection(
    windDirections: number[],
    windSpeeds?: number[]
): number | null {
    if (windDirections.length === 0) return null;

    // Filter out invalid directions
    const validDirections = windDirections.filter(dir =>
        typeof dir === 'number' && !isNaN(dir) && isFinite(dir)
    );

    if (validDirections.length === 0) return null;

    let xSum = 0;
    let ySum = 0;
    let totalWeight = 0;

    for (let i = 0; i < validDirections.length; i++) {
        const direction = validDirections[i];
        const weight = windSpeeds && windSpeeds[i] ? windSpeeds[i] : 1;

        // Convert to radians and then to unit vector components
        const radians = degreesToRadians(direction);
        const x = Math.sin(radians) * weight; // North is 0°, so we use sin for x
        const y = Math.cos(radians) * weight; // North is 0°, so we use cos for y

        xSum += x;
        ySum += y;
        totalWeight += weight;
    }

    if (totalWeight === 0) return null;

    // Calculate average vector components
    const avgX = xSum / totalWeight;
    const avgY = ySum / totalWeight;

    // Convert back to degrees
    let avgDirection = radiansToDegrees(Math.atan2(avgX, avgY));

    // Normalize to [0, 360)
    if (avgDirection < 0) {
        avgDirection += 360;
    }

    return avgDirection;
}

/**
 * Calculate vector-based average wind direction for a dataset
 */
export function calculateDatasetVectorAverageWindDirection(
    rows: Array<{ wind_dir_deg?: number | null; windspeed_ms?: number | null }>,
    weighted = false
): number | null {
    const directions: number[] = [];
    const speeds: number[] = [];

    for (const row of rows) {
        if (typeof row.wind_dir_deg === 'number' && !isNaN(row.wind_dir_deg) && isFinite(row.wind_dir_deg)) {
            directions.push(row.wind_dir_deg);
            if (weighted && typeof row.windspeed_ms === 'number' && !isNaN(row.windspeed_ms) && isFinite(row.windspeed_ms)) {
                speeds.push(row.windspeed_ms);
            }
        }
    }

    return calculateVectorAverageWindDirection(directions, weighted ? speeds : undefined);
}


