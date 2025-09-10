export const FIELD_META: Record<string, { label: string; unit: string; kind: 'time' | 'scalar' | 'direction' | 'categorical'; defaultChart: 'line' | 'bar' | 'scatter' | 'rose' | 'area' | 'stacked-day'; thresholds?: number[] }> = {
    dt: { label: 'Time', unit: '', kind: 'time', defaultChart: 'line' },
    'TempOut(C)': { label: 'Temp Out', unit: '°C', kind: 'scalar', defaultChart: 'line' },
    'TempIn(C)': { label: 'Temp In', unit: '°C', kind: 'scalar', defaultChart: 'line' },
    HumOut: { label: 'Humidity Out', unit: '%', kind: 'scalar', defaultChart: 'line' },
    HumIn: { label: 'Humidity In', unit: '%', kind: 'scalar', defaultChart: 'line' },
    'RainRate(mm/hr)': { label: 'Rain Rate', unit: 'mm/hr', kind: 'scalar', defaultChart: 'bar' },
    'RainDay(mm)': { label: 'Rain (day cum.)', unit: 'mm', kind: 'scalar', defaultChart: 'line' },
    'Barometer(hPa)': { label: 'Barometer', unit: 'hPa', kind: 'scalar', defaultChart: 'line' },
    'WindSpeed(m/s)': { label: 'Wind Speed', unit: 'm/s', kind: 'scalar', defaultChart: 'line' },
    WindDir: { label: 'Wind Direction', unit: '°', kind: 'direction', defaultChart: 'rose' },
    SolarRad: { label: 'Solar Radiation', unit: 'W/m²', kind: 'scalar', defaultChart: 'area' },
    BatteryVolts: { label: 'Battery Volts', unit: 'V', kind: 'scalar', defaultChart: 'line', thresholds: [11.8] },
    BatteryStatus: { label: 'Battery Status', unit: '', kind: 'categorical', defaultChart: 'stacked-day' },
};

export const DEFAULT_X = 'dt';


