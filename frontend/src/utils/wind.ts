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


