export interface Scenario {
  name: string;
  goal: string;
  steps: string[];
}

export interface ScenarioResult {
  name: string;
  status: 'pass' | 'fail' | 'blocked';
  notes: string;
}

export interface Bug {
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  screenshotPath?: string;
}

export const scenarioRegistry: Scenario[] = [];
export const resultsRegistry: ScenarioResult[] = [];
export const bugsRegistry: Bug[] = [];

export function resetRegistries(): void {
  scenarioRegistry.length = 0;
  resultsRegistry.length = 0;
  bugsRegistry.length = 0;
}
